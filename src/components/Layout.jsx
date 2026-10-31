import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import ThemeToggle from './ThemeToggle'

const NAV_ITEMS = [
  { to: '/dashboard',     label: 'Dashboard' },
  { to: '/pakete',        label: 'Pakete' },
  { to: '/erfassen',      label: 'Erfassen' },
  { to: '/daten',         label: 'Daten' },
  { to: '/auswertung',    label: 'Auswertung' },
  { to: '/kalibrierung',  label: 'Kalibrierung' },
  { to: '/praesentation', label: 'Präsentation' },
]

const SETTINGS_ITEMS = [
  { to: '/einstellungen', label: 'Einstellungen', roles: ['admin', 'bewerter'] },
]

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.name
    ? profile.name.slice(0, 2).toUpperCase()
    : '?'

  const ROLE_LABELS = { admin: 'Admin', bewerter: 'Bewerter/in', beobachter: 'Beobachter/in', lehrperson: 'Lehrperson' }
  const roleLabel = ROLE_LABELS[profile?.role] ?? 'Unbekannt'

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>Medien-<br />analyse</h1>
          <span>Deutschunterricht</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              {label}
            </NavLink>
          ))}

          <div className="nav-section-title">Verwaltung</div>

          {SETTINGS_ITEMS
            .filter(item => !item.roles || item.roles.includes(profile?.role))
            .map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
              >
                {label}
              </NavLink>
            ))
          }
        </nav>

        {/* Benutzerinfo */}
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{profile?.name ?? '—'}</div>
            <div className="sidebar-user-role">{roleLabel}</div>
          </div>
        </div>
      </aside>

      {/* Hauptbereich */}
      <div className="main-area">
        <header className="header">
          <span className="header-title">Medienanalyse Schulprojekt</span>
          <div className="header-actions">
            <ThemeToggle />
            <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>
              Abmelden
            </button>
          </div>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
