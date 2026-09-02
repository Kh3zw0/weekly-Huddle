export default function L1FeedbackSection({ rows, onChange, onAdd, onRemove }) {
  return (
    <section className="card">
      <h2>L1 Feedback</h2>
      {rows.map((row, i) => (
        <div className="grid grid-inline" key={i}>
          <input
            placeholder="Area (e.g. Sales, Operations)"
            value={row.area}
            onChange={(e) => onChange(i, 'area', e.target.value)}
          />
          <input
            placeholder="Notes"
            value={row.notes}
            onChange={(e) => onChange(i, 'notes', e.target.value)}
          />
          <button type="button" className="btn-ghost" onClick={() => onRemove(i)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={onAdd}>
        + Add area
      </button>
    </section>
  )
}
