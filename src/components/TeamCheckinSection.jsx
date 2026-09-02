import { MENTAL_HEALTH_OPTIONS, OVERALL_CHECKIN_OPTIONS } from '../lib/constants'

export default function TeamCheckinSection({ members, value, onChange }) {
  return (
    <section className="card">
      <h2>Wellness - Team Check-in</h2>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Team Member</th>
              <th>Overall Check-in</th>
              <th>Mental Health Check-in</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>
                  <select
                    value={value[m.id]?.overall || ''}
                    onChange={(e) => onChange(m.id, 'overall', e.target.value)}
                  >
                    {OVERALL_CHECKIN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt || '—'}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={value[m.id]?.mental || ''}
                    onChange={(e) => onChange(m.id, 'mental', e.target.value)}
                  >
                    {MENTAL_HEALTH_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt || '—'}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
