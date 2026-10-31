import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { distributePackages, hasExistingAssignments } from '../utils/distributionUtils'

const TYPE_LABEL = { boulevard: 'Boulevard', oeffentlich: 'Öffentl.-rechtl.', qualitaet: 'Qualitätszeitung' }
const TYPE_ORDER = { boulevard: 0, oeffentlich: 1, qualitaet: 2 }

export default function Packages() {
  const { profile } = useAuth()
  const isAdmin    = profile?.role === 'admin'
  const isBewerter = profile?.role === 'bewerter'
  const canCapture = isAdmin || isBewerter
  const canEditPkg = (p) => isAdmin || (isBewerter && p.assigned_to === profile?.id)

  const [pakete,    setPakete]    = useState([])
  const [profiles,  setProfiles]  = useState([])
  const [providers, setProviders] = useState([])
  const [postCounts, setPostCounts] = useState({})
  const [settings,  setSettings]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [showWarn,  setShowWarn]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [message,   setMessage]   = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [
      { data: pkgs,   error: e1 },
      { data: profs,  error: e2 },
      { data: provs,  error: e3 },
      { data: posts,  error: e4 },
      { data: sett,   error: e5 },
    ] = await Promise.all([
      supabase.from('packages').select('*'),
      supabase.from('profiles').select('id, name').in('role', ['admin', 'bewerter']),
      supabase.from('providers').select('*'),
      supabase.from('posts').select('id, package_id'),
      supabase.from('survey_settings').select('*').single(),
    ])
    if (e1) console.error('packages:', e1)
    if (e2) console.error('profiles:', e2)
    if (e3) console.error('providers:', e3)
    if (e4) console.error('posts:', e4)
    if (e5) console.error('survey_settings:', e5)
    const dbError = e1 || e2 || e3
    if (dbError) { setMessage('Datenbankfehler: ' + dbError.message); setLoading(false); return }

    // Post-Zähler pro Paket
    const counts = {}
    for (const p of (posts ?? [])) {
      counts[p.package_id] = (counts[p.package_id] ?? 0) + 1
    }

    setPakete(pkgs ?? [])
    setProfiles(profs ?? [])
    setProviders(provs ?? [])
    setPostCounts(counts)
    setSettings(sett)
    setLoading(false)
  }

  // Pakete angereichert und sortiert
  const enriched = pakete
    .map(p => ({
      ...p,
      provider:  providers.find(pr => pr.id === p.provider_id),
      assignedPerson: profiles.find(pr => pr.id === p.assigned_to),
      postCount: postCounts[p.id] ?? 0,
    }))
    .sort((a, b) => {
      const typeA = TYPE_ORDER[a.provider?.type] ?? 99
      const typeB = TYPE_ORDER[b.provider?.type] ?? 99
      if (typeA !== typeB) return typeA - typeB
      if (a.provider?.name !== b.provider?.name) return a.provider?.name.localeCompare(b.provider?.name)
      return a.day - b.day
    })

  function dayLabel(day) {
    const dateStr = settings?.[`day${day}`]
    if (!dateStr) return `Tag ${day}`
    const d = new Date(dateStr)
    return `Tag ${day} · ${d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })}`
  }

  async function handleAssignChange(packageId, profileId) {
    await supabase.from('packages').update({ assigned_to: profileId || null }).eq('id', packageId)
    setPakete(prev => prev.map(p => p.id === packageId ? { ...p, assigned_to: profileId || null } : p))
  }

  async function handleStatusChange(packageId, status) {
    await supabase.from('packages').update({ status }).eq('id', packageId)
    setPakete(prev => prev.map(p => p.id === packageId ? { ...p, status } : p))
  }

  async function handleDistribute() {
    // Die packages für den Algorithmus brauchen provider-Info
    const pkgsWithProvider = pakete.map(p => ({
      ...p,
      providers: providers.find(pr => pr.id === p.provider_id),
    }))

    const assignments = distributePackages(pkgsWithProvider, profiles)

    setSaving(true)
    // Alle Zuteilungen in einem Batch speichern
    const updates = Object.entries(assignments).map(([pkgId, profileId]) =>
      supabase.from('packages').update({ assigned_to: profileId }).eq('id', pkgId)
    )
    await Promise.all(updates)

    setMessage('Verteilplan erstellt.')
    setTimeout(() => setMessage(''), 3000)
    setShowWarn(false)
    setSaving(false)
    loadAll()
  }

  function onDistributeClick() {
    if (hasExistingAssignments(pakete)) {
      setShowWarn(true)
    } else {
      handleDistribute()
    }
  }

  if (loading) return <div className="page-content"><p className="text-muted">Wird geladen…</p></div>

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Pakete</h1>
          <p className="text-muted">21 Pakete · {enriched.filter(p => p.status === 'fertig').length} fertig</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={onDistributeClick} disabled={saving}>
            Verteilplan erstellen
          </button>
        )}
      </div>

      {/* Warnung bei bestehendem Verteilplan */}
      {showWarn && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          <strong>Achtung:</strong> Es gibt bereits eine Zuteilung. Wenn du neu verteilst, werden alle manuellen Änderungen überschrieben.
          <div className="flex gap-8" style={{ marginTop: 10 }}>
            <button className="btn btn-primary btn-sm" onClick={handleDistribute} disabled={saving}>
              {saving ? 'Wird verteilt…' : 'Trotzdem neu verteilen'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowWarn(false)}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {message && <div className="alert alert-success">{message}</div>}

      {/* Legende */}
      <div className="flex gap-12 mb-16" style={{ flexWrap: 'wrap' }}>
        <span className="badge badge-boulevard">Boulevard</span>
        <span className="badge badge-oeffentlich">Öffentlich-rechtlich</span>
        <span className="badge badge-qualitaet">Qualitätszeitung</span>
        <span className="badge badge-offen">Offen</span>
        <span className="badge badge-in_arbeit">In Arbeit</span>
        <span className="badge badge-fertig">Fertig</span>
      </div>

      {/* Tabelle */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Anbieter</th>
              <th>Typ</th>
              <th>Tag</th>
              <th>Zugewiesen an</th>
              <th>Status</th>
              <th>Beiträge</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {enriched.map(p => (
              <tr key={p.id} className={`type-row-${p.provider?.type}`}>
                <td style={{ fontWeight: 500 }}>{p.provider?.name ?? '—'}</td>
                <td>
                  <span className={`badge badge-${p.provider?.type}`}>
                    {TYPE_LABEL[p.provider?.type] ?? p.provider?.type}
                  </span>
                </td>
                <td className="text-muted">{dayLabel(p.day)}</td>

                {/* Zuteilung */}
                <td>
                  {isAdmin ? (
                    <select
                      className="form-select"
                      style={{ padding: '4px 8px', fontSize: '.8rem' }}
                      value={p.assigned_to ?? ''}
                      onChange={e => handleAssignChange(p.id, e.target.value)}
                    >
                      <option value="">— nicht zugeteilt —</option>
                      {profiles.map(pr => (
                        <option key={pr.id} value={pr.id}>{pr.name}</option>
                      ))}
                    </select>
                  ) : (
                    p.assignedPerson?.name ?? <span className="text-muted">—</span>
                  )}
                </td>

                {/* Status */}
                <td>
                  {canEditPkg(p) ? (
                    <select
                      className="form-select"
                      style={{ padding: '4px 8px', fontSize: '.8rem' }}
                      value={p.status}
                      onChange={e => handleStatusChange(p.id, e.target.value)}
                    >
                      <option value="offen">Offen</option>
                      <option value="in_arbeit">In Arbeit</option>
                      <option value="fertig">Fertig</option>
                    </select>
                  ) : (
                    <span className={`badge badge-${p.status}`}>
                      {p.status === 'in_arbeit' ? 'In Arbeit' : p.status === 'fertig' ? 'Fertig' : 'Offen'}
                    </span>
                  )}
                </td>

                {/* Beitrags-Zähler */}
                <td>
                  <span className={`counter-badge ${p.postCount >= 15 ? 'warn' : ''}`}>
                    {p.postCount} / 15
                  </span>
                </td>

                <td>
                  {canCapture && (
                    <Link to={`/erfassen/${p.id}`} className="btn btn-secondary btn-sm">
                      Erfassen
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {profiles.length === 0 && (
        <div className="alert alert-info" style={{ marginTop: 16 }}>
          Es wurden noch keine Bewerter-Profile geladen.
          {' '}(Auth-Profil: {profile ? `${profile.name} [${profile.role}]` : 'nicht geladen'})
          {' – '}Bitte Seite neu laden oder Supabase-Verbindung prüfen.
        </div>
      )}
    </div>
  )
}
