import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { SAFETY_STATUS_OPTIONS } from '../lib/constants'

function pad(n) {
  return String(n).padStart(2, '0')
}

function monthRange(date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = []
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(`${year}-${pad(month + 1)}-${pad(d)}`)
  }
  return days
}

export default function SafetyCrossSection() {
  const today = useMemo(() => new Date(), [])
  const days = useMemo(() => monthRange(today), [today])

  const [statuses, setStatuses] = useState({})
  const [improvements, setImprovements] = useState([])
  const [newImprovement, setNewImprovement] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const monthStart = days[0]
  const monthEnd = days[days.length - 1]

  async function load() {
    setLoading(true)
    const [dayRows, improvementRows] = await Promise.all([
      supabase.from('safety_cross_days').select('day, status, notes').gte('day', monthStart).lte('day', monthEnd),
      supabase.from('safety_improvements').select('id, day, description').gte('day', monthStart).lte('day', monthEnd),
    ])
    const map = {}
    for (const row of dayRows.data || []) map[row.day] = row.status
    setStatuses(map)
    setImprovements(improvementRows.data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function setDayStatus(day, status) {
    setStatuses((s) => ({ ...s, [day]: status }))
  }

  async function saveStatuses() {
    setSaving(true)
    setError(null)
    try {
      const rows = days
        .filter((d) => statuses[d])
        .map((d) => ({ day: d, status: statuses[d] }))
      if (rows.length > 0) {
        const { error: upsertError } = await supabase.from('safety_cross_days').upsert(rows, { onConflict: 'day' })
        if (upsertError) throw upsertError
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function addImprovement() {
    if (!newImprovement.trim()) return
    const { data, error: insertError } = await supabase
      .from('safety_improvements')
      .insert({ day: `${monthStart.slice(0, 7)}-01`, description: newImprovement.trim() })
      .select()
      .single()
    if (!insertError && data) {
      setImprovements((rows) => [...rows, data])
      setNewImprovement('')
    }
  }

  const totals = useMemo(() => {
    const values = Object.values(statuses)
    return {
      near_miss: values.filter((v) => v === 'near_miss').length,
      accident: values.filter((v) => v === 'accident').length,
      observation: values.filter((v) => v === 'observation').length,
      improvements: improvements.length,
    }
  }, [statuses, improvements])

  if (loading) return <section className="card"><h2>Safety Cross</h2><p>Loading…</p></section>

  return (
    <section className="card">
      <h2>People - Safety (Safety Cross)</h2>
      {error && <div className="banner banner-error">{error}</div>}
      <p className="muted">Target: 0 accidents, 0 near misses, 2 improvements per month.</p>

      <div className="safety-grid">
        {days.map((day) => (
          <label key={day} className="safety-day">
            <span>{Number(day.slice(-2))}</span>
            <select value={statuses[day] || ''} onChange={(e) => setDayStatus(day, e.target.value)}>
              {SAFETY_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="stat-row" style={{ marginTop: 16 }}>
        <div className="stat-pill">
          <span className="stat-value">{totals.near_miss}</span>
          <span className="stat-label">Near Misses</span>
        </div>
        <div className="stat-pill">
          <span className="stat-value">{totals.accident}</span>
          <span className="stat-label">Accidents</span>
        </div>
        <div className="stat-pill">
          <span className="stat-value">{totals.improvements}</span>
          <span className="stat-label">Improvements</span>
        </div>
      </div>

      <h3 style={{ marginTop: 20 }}>Improvements Logged This Month</h3>
      <ul>
        {improvements.map((imp) => (
          <li key={imp.id}>{imp.description}</li>
        ))}
      </ul>
      <div className="grid grid-inline" style={{ gridTemplateColumns: '3fr auto' }}>
        <input
          placeholder="Describe an improvement"
          value={newImprovement}
          onChange={(e) => setNewImprovement(e.target.value)}
        />
        <button type="button" className="btn-secondary" onClick={addImprovement}>
          + Add improvement
        </button>
      </div>

      <button type="button" className="btn-primary" style={{ marginTop: 16 }} onClick={saveStatuses} disabled={saving}>
        {saving ? 'Saving…' : 'Save Safety Cross'}
      </button>
    </section>
  )
}
