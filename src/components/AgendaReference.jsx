import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AGENDA_ITEMS } from '../lib/constants'

function monthLabel(d) {
  return d.toLocaleDateString('en-ZA', { month: 'long' })
}

export default function AgendaReference() {
  const [birthdays, setBirthdays] = useState([])

  useEffect(() => {
    const month = new Date().getMonth() + 1
    supabase
      .from('team_birthdays')
      .select('name, birthday, company')
      .then(({ data, error }) => {
        if (error || !data) return
        const inMonth = data
          .filter((b) => new Date(b.birthday).getMonth() + 1 === month)
          .sort((a, b) => new Date(a.birthday).getDate() - new Date(b.birthday).getDate())
        setBirthdays(inMonth)
      })
  }, [])

  return (
    <section className="card reference-card">
      <h2>Meeting Agenda</h2>
      <ol className="agenda-list">
        {AGENDA_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>

      <h3>Birthdays this month ({monthLabel(new Date())})</h3>
      {birthdays.length === 0 ? (
        <p className="muted">No birthdays recorded for this month.</p>
      ) : (
        <ul>
          {birthdays.map((b) => (
            <li key={b.name}>
              {b.name} &mdash; {new Date(b.birthday).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })}
              {b.company ? ` (${b.company})` : ''}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
