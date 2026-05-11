import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from './components/Icon.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Daily from './pages/Daily.jsx'
import Photos from './pages/Photos.jsx'
import Schedule from './pages/Schedule.jsx'
import Drawings from './pages/Drawings.jsx'
import Reports from './pages/Reports.jsx'
import NewEntry from './pages/NewEntry.jsx'

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const isModal = location.pathname.startsWith('/new')

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">RC</div>
          <div className="brand-text">
            <span className="brand-title">RC Zone Samobor</span>
            <span className="brand-sub">Dilatacija 2 · LDC</span>
          </div>
        </div>
        <div className="pill accent mono">LIVE</div>
      </header>

      <main className="app-body">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/daily" element={<Daily />} />
          <Route path="/photos" element={<Photos />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/drawings" element={<Drawings />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/new" element={<NewEntry />} />
        </Routes>
      </main>

      {!isModal && (
        <button className="fab" onClick={() => navigate('/new')} aria-label="Novi unos">
          <Icon name="plus" size={26} strokeWidth={2.4} />
        </button>
      )}

      <nav className="app-tabbar">
        <TabLink to="/" icon="home" label="Pregled" end />
        <TabLink to="/daily" icon="clipboard" label="Radovi" />
        <TabLink to="/photos" icon="camera" label="Foto" />
        <TabLink to="/schedule" icon="chart" label="Gantt" />
        <TabLink to="/drawings" icon="layers" label="Nacrti" />
      </nav>
    </div>
  )
}

function TabLink({ to, icon, label, end }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => 'tab-btn' + (isActive ? ' active' : '')}>
      <Icon name={icon} size={22} />
      <span>{label}</span>
    </NavLink>
  )
}
