import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function load() {
      const [
        { count: totalPosts },
        { count: fertigPakete },
        { count: totalPakete },
        { data: personen },
        { data: settings },
      ] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('packages').select('*', { count: 'exact', head: true }).eq('status', 'fertig'),
        supabase.from('packages').select('*', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('id, name, posts(count)')
          .eq('role', 'bewerter'),
        supabase.from('survey_settings').select('*').single(),
      ])

      setStats({ totalPosts, fertigPakete, totalPakete, personen, settings })
    }
    load()
  }, [])

  function dayLabel(date) {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted">Willkommen, {profile?.name ?? '—'}!</p>
        </div>
        {profile?.role === 'bewerter' && (
          <Link to="/erfassen" className="btn btn-primary">+ Beitrag erfassen</Link>
        )}
      </div>

      {/* Erhebungszeitraum */}
      {stats?.settings && (
        <div className="card mb-24">
          <div className="card-title">Erhebungszeitraum</div>
          <div className="flex gap-24" style={{ flexWrap: 'wrap' }}>
            {['day1', 'day2', 'day3'].map((d, i) => (
              <div key={d}>
                <span className="text-muted text-sm">Tag {i + 1}:&nbsp;</span>
                <strong>{dayLabel(stats.settings[d])}</strong>
              </div>
            ))}
          </div>
          {!stats.settings.day1 && (
            <p className="text-muted text-sm" style={{ marginTop: 8 }}>
              Die Erhebungstage wurden noch nicht festgelegt.{' '}
              {(profile?.role === 'admin' || profile?.role === 'bewerter') && (
                <Link to="/einstellungen">Jetzt festlegen →</Link>
              )}
            </p>
          )}
        </div>
      )}

      {/* Statistiken */}
      {stats && (
        <div className="grid-4 mb-24">
          <div className="card">
            <div className="card-title">Erfasste Beiträge</div>
            <div className="stat-value">{stats.totalPosts ?? 0}</div>
            <div className="stat-sub">von max. 315</div>
          </div>

          <div className="card">
            <div className="card-title">Fertige Pakete</div>
            <div className="stat-value">
              {stats.fertigPakete ?? 0}
              <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                /{stats.totalPakete ?? 21}
              </span>
            </div>
            <div className="stat-sub">von 21 Paketen</div>
          </div>

          <div className="card">
            <div className="card-title">Fortschritt</div>
            <div className="stat-value">
              {stats.totalPakete
                ? Math.round((stats.fertigPakete / stats.totalPakete) * 100)
                : 0}%
            </div>
            <div className="progress-bar mt-16">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${stats.totalPakete
                    ? Math.round((stats.fertigPakete / stats.totalPakete) * 100)
                    : 0}%`
                }}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-title">Ø pro Paket</div>
            <div className="stat-value">
              {stats.fertigPakete
                ? (stats.totalPosts / stats.fertigPakete).toFixed(1)
                : '—'}
            </div>
            <div className="stat-sub">Beiträge (Ziel: bis 15)</div>
          </div>
        </div>
      )}

      {/* Fortschritt pro Person */}
      {stats?.personen && stats.personen.length > 0 && (
        <div className="card mb-24">
          <div className="card-title" style={{ marginBottom: 16 }}>Fortschritt pro Person</div>
          <div className="flex-col gap-12">
            {stats.personen.map(p => {
              const anzahl = p.posts?.[0]?.count ?? 0
              const pct = Math.min(Math.round((anzahl / 75) * 100), 100)
              return (
                <div key={p.id}>
                  <div className="flex items-center gap-12 mb-16" style={{ justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500 }}>{p.name}</span>
                    <span className="text-muted text-sm">{anzahl} Beiträge</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Schnellzugriff */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>Schnellzugriff</div>
        <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
          <Link to="/pakete" className="btn btn-secondary">Pakete verwalten</Link>
          {profile?.role === 'bewerter' && (
            <Link to="/erfassen" className="btn btn-secondary">Beitrag erfassen</Link>
          )}
          <Link to="/auswertung" className="btn btn-secondary">Auswertung</Link>
          <Link to="/kalibrierung" className="btn btn-secondary">Kalibrierung</Link>
        </div>
      </div>
    </div>
  )
}
