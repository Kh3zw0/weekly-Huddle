import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { SERVICE_DESK_FIELDS } from '../lib/constants'

export default function ReportHistory({ refreshKey }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('huddle_reports')
      .select('id, report_date, period_start, period_end, notes')
      .order('report_date', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setReports(data)
        setLoading(false)
      })
  }, [refreshKey])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    setDetailLoading(true)
    Promise.all([
      supabase.from('service_desk_stats').select('*').eq('report_id', selectedId).maybeSingle(),
      supabase.from('sla_breaches').select('*').eq('report_id', selectedId),
      supabase.from('network_availability').select('*, network_sites(name)').eq('report_id', selectedId),
      supabase.from('phishing_simulations').select('*').eq('report_id', selectedId).maybeSingle(),
      supabase.from('cyber_safe_scores').select('*').eq('report_id', selectedId),
      supabase.from('wellness_checkins').select('*, team_members(name)').eq('report_id', selectedId),
      supabase.from('l1_feedback').select('*').eq('report_id', selectedId),
    ]).then(([sd, breaches, network, phishing, cyber, wellness, l1]) => {
      setDetail({
        serviceDesk: sd.data,
        breaches: breaches.data || [],
        network: network.data || [],
        phishing: phishing.data,
        cyber: cyber.data || [],
        wellness: wellness.data || [],
        l1: l1.data || [],
      })
      setDetailLoading(false)
    })
  }, [selectedId])

  if (loading) return <p>Loading history…</p>
  if (error) return <div className="banner banner-error">{error}</div>
  if (reports.length === 0) return <p>No huddle reports yet. Create one from the "New Report" tab.</p>

  return (
    <div className="history">
      <table className="table">
        <thead>
          <tr>
            <th>Huddle Date</th>
            <th>Reporting Period</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id}>
              <td>{r.report_date}</td>
              <td>
                {r.period_start} &ndash; {r.period_end}
              </td>
              <td>{r.notes || '—'}</td>
              <td>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}
                >
                  {selectedId === r.id ? 'Hide' : 'View'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedId && (
        <div className="card detail-card">
          {detailLoading && <p>Loading details…</p>}
          {detail && (
            <>
              {detail.serviceDesk && (
                <div className="detail-section">
                  <h3>Service Desk</h3>
                  <div className="stat-row">
                    {SERVICE_DESK_FIELDS.map((f) => (
                      <div className="stat-pill" key={f.key}>
                        <span className="stat-value">{detail.serviceDesk[f.key] ?? '—'}</span>
                        <span className="stat-label">{f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.breaches.length > 0 && (
                <div className="detail-section">
                  <h3>Breached SLA by Technician</h3>
                  <ul>
                    {detail.breaches.map((b) => (
                      <li key={b.id}>
                        {b.technician}: {b.breach_count}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.network.length > 0 && (
                <div className="detail-section">
                  <h3>Network Availability</h3>
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
                </div>
              )}

              {detail.phishing && (
                <div className="detail-section">
                  <h3>Phishing Simulation {detail.phishing.campaign_name ? `— ${detail.phishing.campaign_name}` : ''}</h3>
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
                </div>
              )}

              {detail.cyber.length > 0 && (
                <div className="detail-section">
                  <h3>Cyber Safe Campaign</h3>
                  <ul>
                    {detail.cyber.map((c) => (
                      <li key={c.id}>
                        {c.category}: {c.score ?? '—'}% {c.notes ? `— ${c.notes}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.wellness.length > 0 && (
                <div className="detail-section">
                  <h3>Wellness - Team Check-in</h3>
                  <ul>
                    {detail.wellness.map((w) => (
                      <li key={w.id}>
                        {w.team_members?.name}: {w.overall_checkin || '—'} / {w.mental_health_checkin || '—'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.l1.length > 0 && (
                <div className="detail-section">
                  <h3>L1 Feedback</h3>
                  <ul>
                    {detail.l1.map((f) => (
                      <li key={f.id}>
                        <strong>{f.area}:</strong> {f.notes}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
