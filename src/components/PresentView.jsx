import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { screenshotPublicUrl } from '../lib/screenshots'
import { SERVICE_DESK_FIELDS } from '../lib/constants'
import ingrainLogo from '../assets/ingrain-logo.png'
import '../App.css'

function PresentGallery({ shots }) {
  if (!shots || shots.length === 0) return null
  return (
    <div className="present-gallery">
      {shots.map((s) => (
        <figure key={s.id} className="present-figure">
          <img src={screenshotPublicUrl(s.storage_path)} alt={s.caption || 'Screenshot'} />
          {s.caption && <figcaption>{s.caption}</figcaption>}
        </figure>
      ))}
    </div>
  )
}

export default function PresentView() {
  const [reports, setReports] = useState([])
  const [reportId, setReportId] = useState('')
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('huddle_reports')
      .select('id, report_date, period_start, period_end')
      .order('report_date', { ascending: false })
      .limit(12)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setReports(data)
          setReportId(data[0].id)
        } else {
          setLoading(false)
        }
      })
  }, [])

  useEffect(() => {
    if (!reportId) return
    setLoading(true)
    Promise.all([
      supabase.from('huddle_reports').select('*').eq('id', reportId).single(),
      supabase.from('service_desk_stats').select('*').eq('report_id', reportId).maybeSingle(),
      supabase.from('sla_breaches').select('*').eq('report_id', reportId),
      supabase.from('network_availability').select('*, network_sites(name)').eq('report_id', reportId),
      supabase.from('phishing_simulations').select('*').eq('report_id', reportId).maybeSingle(),
      supabase.from('cyber_safe_scores').select('*').eq('report_id', reportId),
      supabase.from('section_screenshots').select('*').eq('report_id', reportId),
    ]).then(([report, sd, breaches, network, phishing, cyber, screenshots]) => {
      const shots = { service_desk: [], sla: [], network: [], phishing: [], cyber_safe: [] }
      for (const s of screenshots.data || []) {
        if (shots[s.section]) shots[s.section].push(s)
      }
      setDetail({
        report: report.data,
        serviceDesk: sd.data,
        breaches: breaches.data || [],
        network: network.data || [],
        phishing: phishing.data,
        cyber: cyber.data || [],
        shots,
      })
      setLoading(false)
    })
  }, [reportId])

  return (
    <div className="present-shell">
      <header className="present-header">
        <div>
          <h1>Weekly IT Meeting</h1>
          {detail?.report && (
            <p className="subtitle">
              {detail.report.report_date} &middot; {detail.report.period_start} – {detail.report.period_end}
            </p>
          )}
        </div>
        <img src={ingrainLogo} alt="Ingrain" className="app-logo" />
        {reports.length > 1 && (
          <select className="present-selector" value={reportId} onChange={(e) => setReportId(e.target.value)}>
            {reports.map((r) => (
              <option key={r.id} value={r.id}>
                {r.report_date} ({r.period_start} – {r.period_end})
              </option>
            ))}
          </select>
        )}
      </header>

      {loading && <p>Loading…</p>}

      {!loading && !detail && <p>No huddle reports yet.</p>}

      {!loading && detail && (
        <main className="present-main">
          {(detail.serviceDesk || detail.shots.service_desk.length > 0) && (
            <section className="present-section">
              <h2>Service Desk</h2>
              {detail.serviceDesk && (
                <div className="stat-row">
                  {SERVICE_DESK_FIELDS.map((f) => (
                    <div className="stat-pill" key={f.key}>
                      <span className="stat-value">{detail.serviceDesk[f.key] ?? '—'}</span>
                      <span className="stat-label">{f.label}</span>
                    </div>
                  ))}
                </div>
              )}
              <PresentGallery shots={detail.shots.service_desk} />
            </section>
          )}

          {(detail.breaches.length > 0 || detail.shots.sla.length > 0) && (
            <section className="present-section">
              <h2>Breached SLA by Technician</h2>
              {detail.breaches.length > 0 && (
                <ul>
                  {detail.breaches.map((b) => (
                    <li key={b.id}>
                      {b.technician}: {b.breach_count}
                    </li>
                  ))}
                </ul>
              )}
              <PresentGallery shots={detail.shots.sla} />
            </section>
          )}

          {(detail.network.length > 0 || detail.shots.network.length > 0) && (
            <section className="present-section">
              <h2>Network Availability</h2>
              {detail.network.length > 0 && (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Site</th>
                      <th>Inter-Site Connectivity %</th>
                      <th>Direct Internet Access %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.network.map((n) => (
                      <tr key={n.id}>
                        <td>{n.network_sites?.name}</td>
                        <td>{n.inter_site_connectivity_pct ?? '—'}</td>
                        <td>{n.direct_internet_access_pct ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <PresentGallery shots={detail.shots.network} />
            </section>
          )}

          {(detail.phishing || detail.shots.phishing.length > 0) && (
            <section className="present-section">
              <h2>
                Phishing Simulation {detail.phishing?.campaign_name ? `— ${detail.phishing.campaign_name}` : ''}
              </h2>
              {detail.phishing && (
                <div className="stat-row">
                  <div className="stat-pill">
                    <span className="stat-value">{detail.phishing.link_clicked ?? '—'}</span>
                    <span className="stat-label">Link Clicked</span>
                  </div>
                  <div className="stat-pill">
                    <span className="stat-value">{detail.phishing.credentials_entered ?? '—'}</span>
                    <span className="stat-label">Credentials Entered</span>
                  </div>
                  <div className="stat-pill">
                    <span className="stat-value">{detail.phishing.not_compromised ?? '—'}</span>
                    <span className="stat-label">Not Compromised</span>
                  </div>
                  <div className="stat-pill">
                    <span className="stat-value">{detail.phishing.phish_prone_pct ?? '—'}%</span>
                    <span className="stat-label">Phish Prone</span>
                  </div>
                </div>
              )}
              <PresentGallery shots={detail.shots.phishing} />
            </section>
          )}

          {(detail.cyber.length > 0 || detail.shots.cyber_safe.length > 0) && (
            <section className="present-section">
              <h2>Cyber Safe Campaign</h2>
              {detail.cyber.length > 0 && (
                <ul>
                  {detail.cyber.map((c) => (
                    <li key={c.id}>
                      {c.category}: {c.score ?? '—'}% {c.notes ? `— ${c.notes}` : ''}
                    </li>
                  ))}
                </ul>
              )}
              <PresentGallery shots={detail.shots.cyber_safe} />
            </section>
          )}
        </main>
      )}
    </div>
  )
}
