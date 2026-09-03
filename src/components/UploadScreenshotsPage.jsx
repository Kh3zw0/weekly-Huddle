import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { uploadSectionScreenshots, screenshotPublicUrl } from '../lib/screenshots'
import { DEPARTMENTS, getDepartmentInfo, getDepartmentSession, loginDepartment, logoutDepartment } from '../lib/deptAuth'
import { nextHuddleDateISO, defaultReportingPeriod } from '../lib/dates'
import ScreenshotUploader from './ScreenshotUploader'

const SECTION_LABELS = {
  service_desk: 'Service Desk',
  sla: 'Breached SLA by Technician',
  network: 'Network Availability',
  phishing: 'Phishing Simulation',
  cyber_safe: 'Cyber Safe Campaign',
}

function defaultNewReport() {
  const huddleDate = nextHuddleDateISO()
  const { start, end } = defaultReportingPeriod(huddleDate)
  return { report_date: huddleDate, period_start: start, period_end: end }
}

function LoginForm({ onLoggedIn }) {
  const [department, setDepartment] = useState(DEPARTMENTS[0].value)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const ok = await loginDepartment(department, password)
      if (!ok) {
        setError('Incorrect password.')
      } else {
        onLoggedIn()
      }
    } catch (err) {
      setError(err.message || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="card" style={{ maxWidth: 420 }} onSubmit={handleSubmit}>
      <h2>Department Login</h2>
      <p className="muted">Log in to upload screenshots for your team ahead of the huddle.</p>
      {error && <div className="banner banner-error">{error}</div>}
      <label>
        Department
        <select value={department} onChange={(e) => setDepartment(e.target.value)}>
          {DEPARTMENTS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 12 }}>
        {loading ? 'Checking…' : 'Log In'}
      </button>
    </form>
  )
}

export default function UploadScreenshotsPage() {
  const [session, setSession] = useState(getDepartmentSession())
  const [reports, setReports] = useState([])
  const [selectedReportId, setSelectedReportId] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)
  const [newReport, setNewReport] = useState(defaultNewReport)
  const [pending, setPending] = useState({})
  const [existing, setExisting] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const dept = session ? getDepartmentInfo(session.department) : null

  useEffect(() => {
    if (!session) return
    supabase
      .from('huddle_reports')
      .select('id, report_date, period_start, period_end')
      .order('report_date', { ascending: false })
      .limit(8)
      .then(({ data, error }) => {
        if (!error && data) setReports(data)
      })
  }, [session])

  useEffect(() => {
    if (!selectedReportId || !dept) {
      setExisting({})
      return
    }
    supabase
      .from('section_screenshots')
      .select('*')
      .eq('report_id', selectedReportId)
      .in('section', dept.sections)
      .then(({ data, error }) => {
        if (error || !data) return
        const grouped = {}
        for (const s of dept.sections) grouped[s] = []
        for (const row of data) grouped[row.section].push(row)
        setExisting(grouped)
      })
  }, [selectedReportId, dept])

  if (!session) {
    return <LoginForm onLoggedIn={() => setSession(getDepartmentSession())} />
  }

  function handleLogout() {
    logoutDepartment()
    setSession(null)
    setSelectedReportId('')
  }

  async function handleCreateReport(e) {
    e.preventDefault()
    setError(null)
    if (!newReport.period_start || !newReport.period_end) {
      setError('Reporting period start and end are required.')
      return
    }
    try {
      const { data, error: insertError } = await supabase
        .from('huddle_reports')
        .insert({
          report_date: newReport.report_date,
          period_start: newReport.period_start,
          period_end: newReport.period_end,
        })
        .select()
        .single()
      if (insertError) throw insertError
      setReports((rows) => [data, ...rows])
      setSelectedReportId(data.id)
      setCreatingNew(false)
    } catch (err) {
      setError(err.message || 'Could not create huddle report.')
    }
  }

  async function handleSave() {
    setError(null)
    setSuccess(false)
    setSaving(true)
    try {
      for (const section of dept.sections) {
        const items = pending[section] || []
        if (items.length > 0) {
          await uploadSectionScreenshots(selectedReportId, section, items)
        }
      }
      setPending({})
      setSuccess(true)
      const { data } = await supabase
        .from('section_screenshots')
        .select('*')
        .eq('report_id', selectedReportId)
        .in('section', dept.sections)
      const grouped = {}
      for (const s of dept.sections) grouped[s] = []
      for (const row of data || []) grouped[row.section].push(row)
      setExisting(grouped)
    } catch (err) {
      setError(err.message || 'Upload failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteExisting(row) {
    await supabase.storage.from('huddle-screenshots').remove([row.storage_path])
    await supabase.from('section_screenshots').delete().eq('id', row.id)
    setExisting((prev) => ({
      ...prev,
      [row.section]: prev[row.section].filter((r) => r.id !== row.id),
    }))
  }

  return (
    <div>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          Logged in as <strong>{dept.label}</strong>
        </span>
        <button type="button" className="btn-ghost" onClick={handleLogout}>
          Log Out
        </button>
      </div>

      <section className="card">
        <h2>Choose Huddle</h2>
        {!creatingNew ? (
          <>
            <label>
              Huddle
              <select value={selectedReportId} onChange={(e) => setSelectedReportId(e.target.value)}>
                <option value="">Select a huddle report…</option>
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.report_date} ({r.period_start} – {r.period_end})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: 12 }}
              onClick={() => {
                setNewReport(defaultNewReport())
                setCreatingNew(true)
              }}
            >
              + Create new huddle
            </button>
          </>
        ) : (
          <form onSubmit={handleCreateReport}>
            {error && <div className="banner banner-error">{error}</div>}
            <div className="grid grid-3">
              <label>
                Huddle Date
                <input
                  type="date"
                  value={newReport.report_date}
                  onChange={(e) => {
                    const report_date = e.target.value
                    const { start, end } = defaultReportingPeriod(report_date)
                    setNewReport((r) => ({ ...r, report_date, period_start: start, period_end: end }))
                  }}
                  required
                />
              </label>
              <label>
                Period Start
                <input
                  type="date"
                  value={newReport.period_start}
                  onChange={(e) => setNewReport((r) => ({ ...r, period_start: e.target.value }))}
                  required
                />
              </label>
              <label>
                Period End
                <input
                  type="date"
                  value={newReport.period_end}
                  onChange={(e) => setNewReport((r) => ({ ...r, period_end: e.target.value }))}
                  required
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn-primary">
                Create &amp; Select
              </button>
              <button type="button" className="btn-ghost" onClick={() => setCreatingNew(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {selectedReportId && (
        <>
          {error && <div className="banner banner-error">{error}</div>}
          {success && <div className="banner banner-success">Screenshots saved.</div>}

          {dept.sections.map((section) => (
            <section className="card" key={section}>
              <h2>{SECTION_LABELS[section]}</h2>

              {existing[section]?.length > 0 && (
                <div className="screenshot-grid">
                  {existing[section].map((row) => (
                    <div className="screenshot-item" key={row.id}>
                      <img src={screenshotPublicUrl(row.storage_path)} alt={row.caption || SECTION_LABELS[section]} />
                      {row.caption && <p className="screenshot-caption">{row.caption}</p>}
                      <button type="button" className="btn-ghost" onClick={() => handleDeleteExisting(row)}>
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <ScreenshotUploader
                label={`Add ${SECTION_LABELS[section]} screenshots`}
                items={pending[section] || []}
                onChange={(items) => setPending((p) => ({ ...p, [section]: items }))}
              />
            </section>
          ))}

          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Screenshots'}
          </button>
        </>
      )}
    </div>
  )
}
