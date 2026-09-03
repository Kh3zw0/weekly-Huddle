export default function ScreenshotPlaceholder({ department }) {
  return (
    <div className="screenshot-placeholder">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="2.5" y="4.5" width="19" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8" cy="10" r="1.75" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 17l5-5 3.5 3.5L16 12l4 5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <p>
        This section is populated from a screenshot uploaded by the <strong>{department}</strong> team via{' '}
        <strong>Upload Screenshots</strong>, ahead of the huddle.
      </p>
    </div>
  )
}
