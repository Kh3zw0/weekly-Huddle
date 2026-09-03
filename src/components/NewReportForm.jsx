import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { L1_FEEDBACK_AREAS } from '../lib/constants'
import { nextHuddleDateISO, defaultReportingPeriod } from '../lib/dates'
import SafetyCrossSection from './SafetyCrossSection'
import TeamCheckinSection from './TeamCheckinSection'
import L1FeedbackSection from './L1FeedbackSection'
import AgendaReference from './AgendaReference'
import ScreenshotPlaceholder from './ScreenshotPlaceholder'

const defaultL1Feedback = L1_FEEDBACK_AREAS.map((area) => ({ area, notes: '' }))

const STEPS = [
  { id: 'details', label: 'Report Details' },
  { id: 'safety', label: 'Safety Check' },
  { id: 'checkin', label: 'Team Check-in' },
  { id: 'servicedesk', label: 'Service Desk' },
  { id: 'network', label: 'SLA & Network' },
  { id: 'security', label: 'IT Security' },
  { id: 'agenda', label: 'Agenda & Birthdays' },
  { id: 'l1', label: 'L1 Feedback' },
]

const defaultHuddleDate = nextHuddleDateISO()
const defaultPeriod = defaultReportingPeriod(defaultHuddleDate)

export default function NewReportForm({ onSaved }) {
  const [step, setStep] = useState(0)
  const [teamMembers, setTeamMembers] = useState([])
  const [reportDate, setReportDate] = useState(defaultHuddleDate)
  const [periodStart, setPeriodStart] = useState(defaultPeriod.start)
  const [periodEnd, setPeriodEnd] = useState(defaultPeriod.end)
  const [notes, setNotes] = useState('')

  const [wellness, setWellness] = useState({})
  const [l1Feedback, setL1Feedback] = useState(defaultL1Feedback)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    supabase
      .from('team_members')
      .select('id, name')
      .eq('active', true)
      .order('name')
      .then(({ data, error }) => {
        if (!error && data) setTeamMembers(data)
      })
  }, [])

  function updateWellness(memberId, field, value) {
    setWellness((w) => ({ ...w, [memberId]: { ...w[memberId], [field]: value } }))
  }

  function updateL1(index, field, value) {
    setL1Feedback((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  function addL1Row() {
    setL1Feedback((rows) => [...rows, { area: '', notes: '' }])
  }

  function removeL1Row(index) {
    setL1Feedback((rows) => rows.filter((_, i) => i !== index))
  }

  function goToStep(index) {
    setStep(index)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goNext() {
    goToStep(Math.min(step + 1, STEPS.length - 1))
  }

  function goBack() {
    goToStep(Math.max(step - 1, 0))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!periodStart || !periodEnd) {
      setError('Reporting period start and end dates are required.')
      goToStep(0)
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

      const wellnessRows = Object.entries(wellness)
        .filter(([, v]) => v && (v.overall || v.mental))
        .map(([memberId, v]) => ({
          report_id: reportId,
          team_member_id: memberId,
          overall_checkin: v.overall || null,
          mental_health_checkin: v.mental || null,
        }))
      if (wellnessRows.length > 0) {
        const { error: wellnessError } = await supabase.from('wellness_checkins').insert(wellnessRows)
        if (wellnessError) throw wellnessError
      }

      const l1Rows = l1Feedback
        .filter((r) => r.area.trim() !== '' && r.notes.trim() !== '')
        .map((r) => ({ report_id: reportId, area: r.area.trim(), notes: r.notes.trim() }))
      if (l1Rows.length > 0) {
        const { error: l1Error } = await supabase.from('l1_feedback').insert(l1Rows)
        if (l1Error) throw l1Error
      }

      setSuccess(true)
      setStep(0)
      const nextDefaultDate = nextHuddleDateISO()
      const nextDefaultPeriod = defaultReportingPeriod(nextDefaultDate)
      setReportDate(nextDefaultDate)
      setPeriodStart(nextDefaultPeriod.start)
      setPeriodEnd(nextDefaultPeriod.end)
      setNotes('')
      setWellness({})
      setL1Feedback(defaultL1Feedback)
      onSaved?.()
    } catch (err) {
      setError(err.message || 'Something went wrong while saving.')
    } finally {
      setSaving(false)
    }
  }

  const isFirst = step === 0
  const isLast = step === STEPS.length - 1
  const currentId = STEPS[step].id

  return (
    <form className="huddle-form" onSubmit={handleSubmit}>
      {error && <div className="banner banner-error">{error}</div>}
      {success && <div className="banner banner-success">Huddle report saved.</div>}

      <ol className="step-nav">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              className={i === step ? 'step-pill active' : i < step ? 'step-pill done' : 'step-pill'}
              onClick={() => goToStep(i)}
            >
              <span className="step-index">{i + 1}</span>
              {s.label}
            </button>
          </li>
        ))}
      </ol>

      {currentId === 'details' && (
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
      )}

      {currentId === 'safety' && <SafetyCrossSection />}

      {currentId === 'checkin' && (
        <TeamCheckinSection members={teamMembers} value={wellness} onChange={updateWellness} />
      )}

      {currentId === 'servicedesk' && (
        <section className="card">
          <h2>Service Desk Update</h2>
          <ScreenshotPlaceholder department="Service Desk" />
        </section>
      )}

      {currentId === 'network' && (
        <>
          <section className="card">
            <h2>Breached SLA by Technician</h2>
            <ScreenshotPlaceholder department="Service Desk" />
          </section>

          <section className="card">
            <h2>Network Availability</h2>
            <ScreenshotPlaceholder department="Network" />
          </section>
        </>
      )}

      {currentId === 'security' && (
        <>
          <section className="card">
            <h2>IT Security Update &mdash; Phishing Simulation</h2>
            <ScreenshotPlaceholder department="IT Security" />
          </section>

          <section className="card">
            <h2>Cyber Safe Campaign</h2>
            <ScreenshotPlaceholder department="IT Security" />
          </section>
        </>
      )}

      {currentId === 'agenda' && <AgendaReference />}

      {currentId === 'l1' && (
        <L1FeedbackSection rows={l1Feedback} onChange={updateL1} onAdd={addL1Row} onRemove={removeL1Row} />
      )}

      <div className="step-controls">
        <button type="button" className="btn-secondary" onClick={goBack} disabled={isFirst}>
          &larr; Back
        </button>
        {!isLast && (
          <button type="button" className="btn-primary" onClick={goNext}>
            Next &rarr;
          </button>
        )}
        {isLast && (
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Huddle Report'}
          </button>
        )}
      </div>
    </form>
  )
}
