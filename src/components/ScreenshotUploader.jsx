export default function ScreenshotUploader({ label, items, onChange }) {
  function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const newItems = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      caption: '',
    }))
    onChange([...items, ...newItems])
    e.target.value = ''
  }

  function updateCaption(id, caption) {
    onChange(items.map((it) => (it.id === id ? { ...it, caption } : it)))
  }

  function removeItem(id) {
    onChange(items.filter((it) => it.id !== id))
  }

  return (
    <div className="screenshot-uploader">
      <label className="screenshot-label">{label}</label>
      <input type="file" accept="image/*" multiple onChange={handleFiles} />

      {items.length > 0 && (
        <div className="screenshot-grid">
          {items.map((it) => (
            <div className="screenshot-item" key={it.id}>
              <img src={it.previewUrl} alt={it.caption || label} />
              <input
                type="text"
                placeholder="Caption (optional)"
                value={it.caption}
                onChange={(e) => updateCaption(it.id, e.target.value)}
              />
              <button type="button" className="btn-ghost" onClick={() => removeItem(it.id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
