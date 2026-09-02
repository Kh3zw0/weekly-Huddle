import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { CYBER_SAFE_CATEGORIES, SERVICE_DESK_FIELDS } from '../lib/constants'

const emptyServiceDesk = Object.fromEntries(SERVICE_DESK_FIELDS.map((f) => [f.key, '']))

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function NewReportForm({ onSaved }) {
  const [sites, setSites] = useState([])
  const [reportDate, setReportDate] = useState(todayISO())
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [notes, setNotes] = useState('')

  const [serviceDesk, setServiceDesk] = useState(emptyServiceDesk)
  const [breaches, setBreaches] = useState([{ technician: '', breach_count: '' }])
  const [network, setNetwork] = useState({})
  const [phishing, setPhishing] = useState({
    campaign_name: '',
    link_clicked: '',
    credentials_entered: '',
    not_compromised: '',
    phish_prone_pct: '',
  })
  const [cyberSafe, setCyberSafe] = useState(
    Object.fromEntries(CYBER_SAFE_CATEGORIES.map((c) => [c, { score: '', notes: '' }]))
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    supabase
      .from('network_sites')
      .select('id, name')
      .order('name')
      .then(({ data, error }) => {
        if (!error && data) setSites(data)
      })
  }, [])

  function updateBreach(index, field, value) {
    setBreaches((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  function addBreachRow() {
    setBreaches((rows) => [...rows, { technician: '', breach_count: '' }])
  }

  function removeBreachRow(index) {
    setBreaches((rows) => rows.filter((_, i) => i !== index))
  }

  function updateNetwork(siteId, field, value) {
    setNetwork((n) => ({ ...n, [siteId]: { ...n[siteId], [field]: value } }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!periodStart || !periodEnd) {
      setError('Reporting period start and end dates are required.')
      return
    }

    setSaving(true)
    try {
      const { data: report, error: reportError } = await supabase
        .from('huddle_reports')
        .insert({
          report_date: reportDate,
          period_start: periodStart,
          period_end: periodEnd,
          notes: notes || null,
        })
        .select()
        .single()

      if (reportError) throw reportError
      const reportId = report.id

      const sdRow = { report_id: reportId }
      let sdHasValue = false
      for (const f of SERVICE_DESK_FIELDS) {
        const v = serviceDesk[f.key]
        sdRow[f.key] = v === '' ? null : Number(v)
        if (v !== '') sdHasValue = true
      }
      if (sdHasValue) {
        const { error: sdError } = await supabase.from('service_desk_stats').insert(sdRow)
        if (sdError) throw sdError
      }

      const breachRows = breaches
        .filter((b) => b.technician.trim() !== '')
        .map((b) => ({
          report_id: reportId,
          technician: b.technician.trim(),
          breach_count: b.breach_count === '' ? 0 : Number(b.breach_count),
        }))
      if (breachRows.length > 0) {
        const { error: breachError } = await supabase.from('sla_breaches').insert(breachRows)
        if (breachError) throw breachError
      }

      const networkRows = Object.entries(network)
        .filter(([, v]) => v && (v.inter_site !== '' || v.internet !== ''))
        .map(([siteId, v]) => ({
          report_id: reportId,
          site_id: siteId,
          inter_site_connectivity_pct: v.inter_site === '' || v.inter_site == null ? null : Number(v.inter_site),
          direct_internet_access_pct: v.internet === '' || v.internet == null ? null : Number(v.internet),
        }))
      if (networkRows.length > 0) {
        const { error: netError } = await supabase.from('network_availability').insert(networkRows)
        if (netError) throw netError
      }

      const phishingHasValue = Object.values(phishing).some((v) => v !== '')
      if (phishingHasValue) {
        const { error: phishError } = await supabase.from('phishing_simulations').insert({
          report_id: reportId,
          campaign_name: phishing.campaign_name || null,
          link_clicked: phishing.link_clicked === '' ? null : Number(phishing.link_clicked),
          credentials_entered: phishing.credentials_entered === '' ? null : Number(phishing.credentials_entered),
          not_compromised: phishing.not_compromised === '' ? null : Number(phishing.not_compromised),
          phish_prone_pct: phishing.phish_prone_pct === '' ? null : Number(phishing.phish_prone_pct),
        })
        if (phishError) throw phishError
      }

      const cyberRows = CYBER_SAFE_CATEGORIES.filter(
        (c) => cyberSafe[c].score !== '' || cyberSafe[c].notes !== ''
      ).map((c) => ({
        report_id: reportId,
        category: c,
        score: cyberSafe[c].score === '' ? null : Number(cyberSafe[c].score),
        notes: cyberSafe[c].notes || null,
      }))
      if (cyberRows.length > 0) {
        const { error: cyberError } = await supabase.from('cyber_safe_scores').insert(cyberRows)
        if (cyberError) throw cyberError
      }

      setSuccess(true)
      setReportDate(todayISO())
      setPeriodStart('')
      setPeriodEnd('')
      setNotes('')
      setServiceDesk(emptyServiceDesk)
      setBreaches([{ technician: '', breach_count: '' }])
      setNetwork({})
      setPhishing({
        campaign_name: '',
        link_clicked: '',
        credentials_entered: '',
        not_compromised: '',
        phish_prone_pct: '',
      })
      setCyberSafe(Object.fromEntries(CYBER_SAFE_CATEGORIES.map((c) => [c, { score: '', notes: '' }])))
      onSaved?.()
    } catch (err) {
      setError(err.message || 'Something went wrong while saving.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="huddle-form" onSubmit={handleSubmit}>
      {error && <div className="banner banner-error">{error}</div>}
      {success && <div className="banner banner-success">Huddle report saved.</div>}

      <section className="card">
        <h2>Report Details</h2>
        <div className="grid grid-3">
          <label>
            Huddle Date
            <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} required />
          </label>
          <label>
            Reporting Period Start
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
          </label>
          <label>
            Reporting Period End
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
          </label>
        </div>
        <label>
          General Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </label>
      </section>

      <section className="card">
        <h2>Service Desk Update</h2>
        <div className="grid grid-5">
          {SERVICE_DESK_FIELDS.map((f) => (
            <label key={f.key}>
              {f.label}
              <input
                type="number"
                min="0"
                value={serviceDesk[f.key]}
                onChange={(e) => setServiceDesk((s) => ({ ...s, [f.key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Breached SLA by Technician</h2>
        {breaches.map((row, i) => (
          <div className="grid grid-inline" key={i}>
            <input
              placeholder="Technician name"
              value={row.technician}
              onChange={(e) => updateBreach(i, 'technician', e.target.value)}
            />
            <input
              type="number"
              min="0"
              placeholder="Breaches"
              value={row.breach_count}
              onChange={(e) => updateBreach(i, 'breach_count', e.target.value)}
            />
            <button type="button" className="btn-ghost" onClick={() => removeBreachRow(i)}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={addBreachRow}>
          + Add technician
        </button>
      </section>

      <section className="card">
        <h2>Network Availability</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Site</th>
              <th>Inter-Site Connectivity %</th>
              <th>Direct Internet Access %</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => (
              <tr key={site.id}>
                <td>{site.name}</td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={network[site.id]?.inter_site ?? ''}
                    onChange={(e) => updateNetwork(site.id, 'inter_site', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={network[site.id]?.internet ?? ''}
                    onChange={(e) => updateNetwork(site.id, 'internet', e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>IT Security Update &mdash; Phishing Simulation</h2>
        <div className="grid grid-3">
          <label>
            Campaign Name
            <input
              value={phishing.campaign_name}
              onChange={(e) => setPhishing((p) => ({ ...p, campaign_name: e.target.value }))}
            />
          </label>
          <label>
            Link Clicked
            <input
              type="number"
              min="0"
              value={phishing.link_clicked}
              onChange={(e) => setPhishing((p) => ({ ...p, link_clicked: e.target.value }))}
            />
          </label>
          <label>
            Credentials Entered
            <input
              type="number"
              min="0"
              value={phishing.credentials_entered}
              onChange={(e) => setPhishing((p) => ({ ...p, credentials_entered: e.target.value }))}
            />
          </label>
          <label>
            Not Compromised
            <input
              type="number"
              min="0"
              value={phishing.not_compromised}
              onChange={(e) => setPhishing((p) => ({ ...p, not_compromised: e.target.value }))}
            />
          </label>
          <label>
            Phish Prone %
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={phishing.phish_prone_pct}
              onChange={(e) => setPhishing((p) => ({ ...p, phish_prone_pct: e.target.value }))}
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Cyber Safe Campaign</h2>
        {CYBER_SAFE_CATEGORIES.map((c) => (
          <div className="grid grid-inline" key={c}>
            <span className="cyber-label">{c}</span>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="Score %"
              value={cyberSafe[c].score}
              onChange={(e) =>
                setCyberSafe((s) => ({ ...s, [c]: { ...s[c], score: e.target.value } }))
              }
            />
            <input
              placeholder="Notes"
              value={cyberSafe[c].notes}
              onChange={(e) =>
                setCyberSafe((s) => ({ ...s, [c]: { ...s[c], notes: e.target.value } }))
              }
            />
          </div>
        ))}
      </section>

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save Huddle Report'}
      </button>
    </form>
  )
}
