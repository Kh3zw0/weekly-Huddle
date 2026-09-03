import { useState } from 'react'
import NewReportForm from './components/NewReportForm'
import ReportHistory from './components/ReportHistory'
import UploadScreenshotsPage from './components/UploadScreenshotsPage'
import ingrainLogo from './assets/ingrain-logo.png'
import './App.css'

function App() {
  const [tab, setTab] = useState('new')
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Weekly IT Meeting</h1>
          <p className="subtitle">Weekly service desk, network and security huddle tracker</p>
        </div>
        <img src={ingrainLogo} alt="Ingrain" className="app-logo" />
      </header>

      <nav className="tabs">
        <button
          type="button"
          className={tab === 'new' ? 'tab active' : 'tab'}
          onClick={() => setTab('new')}
        >
          New Report
        </button>
        <button
          type="button"
          className={tab === 'history' ? 'tab active' : 'tab'}
          onClick={() => setTab('history')}
        >
          History
        </button>
        <button
          type="button"
          className={tab === 'upload' ? 'tab active' : 'tab'}
          onClick={() => setTab('upload')}
        >
          Upload Screenshots
        </button>
      </nav>

      <main>
        {tab === 'new' && (
          <NewReportForm
            onSaved={() => {
              setRefreshKey((k) => k + 1)
              setTab('history')
            }}
          />
        )}
        {tab === 'history' && <ReportHistory refreshKey={refreshKey} />}
        {tab === 'upload' && <UploadScreenshotsPage />}
      </main>
    </div>
  )
}

export default App
