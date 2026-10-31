import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const PLATFORM = { instagram: 'Instagram', tiktok: 'TikTok', beide: 'Beide' }
const FORMAT   = { video: 'Video', bild: 'Bild', karussell: 'Karussell' }

function Th({ col, label, sortKey, sortDir, onSort }) {
  return (
    <th onClick={() => onSort(col)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      {label}
      <span style={{ marginLeft: 4, color: col === sortKey ? 'inherit' : 'var(--text-muted)', fontSize: '.8em' }}>
        {col === sortKey ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
      </span>
    </th>
  )
}

export default function Data() {
  const { profile } = useAuth()
  const isAdmin  = profile?.role === 'admin'
  const canEdit  = profile?.role === 'admin' || profile?.role === 'bewerter'
  const fileRef  = useRef(null)

  const [posts,        setPosts]        = useState([])
  const [providers,    setProviders]    = useState([])
  const [profilesList, setProfilesList] = useState([])
  const [settings,     setSettings]     = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [deleteId,     setDeleteId]     = useState(null)
  const [importRows,   setImportRows]   = useState(null)
  const [importing,    setImporting]    = useState(false)
  const [message,      setMessage]      = useState('')

  const [filterProvider, setFilterProvider] = useState('')
  const [filterDay,      setFilterDay]      = useState('')
  const [filterBewerter, setFilterBewerter] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [sortKey,        setSortKey]        = useState('created_at')
  const [sortDir,        setSortDir]        = useState('desc')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [
      { data: postsData },
      { data: provsData },
      { data: profsData },
      { data: settData },
    ] = await Promise.all([
      supabase.from('posts').select(`
        *,
        packages(id, day, providers(id, name, type)),
        profiles!evaluated_by(id, name)
      `).order('created_at', { ascending: false }),
      supabase.from('providers').select('*').order('name'),
      supabase.from('profiles').select('id, name'),
      supabase.from('survey_settings').select('*').single(),
    ])
    setPosts(postsData ?? [])
    setProviders(provsData ?? [])
    setProfilesList(profsData ?? [])
    setSettings(settData)
    setLoading(false)
  }

  function dayLabel(day) {
    const dateStr = settings?.[`day${day}`]
    if (!dateStr) return `Tag ${day}`
    return `Tag ${day} · ${new Date(dateStr).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })}`
  }

  const filtered = posts.filter(p => {
    if (filterProvider && p.packages?.providers?.id !== filterProvider) return false
    if (filterDay     && p.packages?.day !== Number(filterDay))         return false
    if (filterBewerter && p.evaluated_by !== filterBewerter)            return false
    if (filterPlatform && p.platform !== filterPlatform)                return false
    return true
  })

  function getSortValue(p) {
    switch (sortKey) {
      case 'provider':    return p.packages?.providers?.name ?? ''
      case 'day':         return p.packages?.day ?? 0
      case 'bewerter':    return p.profiles?.name ?? ''
      case 'platform':    return p.platform ?? ''
      case 'format':      return p.format ?? ''
      case 'c4':          return p.c4 ?? 0
      case 'd4':          return p.d4 ?? 0
      case 'e4':          return p.e4 ?? 0
      case 'f_score':     return p.f_score ?? 0
      case 'posted_at':   return p.posted_at ?? ''
      case 'created_at':  return p.created_at ?? ''
      default:            return ''
    }
  }

  const sorted = [...filtered].sort((a, b) => {
    const va = getSortValue(a), vb = getSortValue(b)
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'de')
    return sortDir === 'asc' ? cmp : -cmp
  })

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  async function handleDelete() {
    if (!deleteId) return
    const { error } = await supabase.from('posts').delete().eq('id', deleteId)
    if (error) { showMsg('Fehler beim Löschen: ' + error.message); setDeleteId(null); return }
    setPosts(prev => prev.filter(p => p.id !== deleteId))
    setDeleteId(null)
    showMsg('Beitrag gelöscht.')
  }

  function showMsg(text) {
    setMessage(text)
    setTimeout(() => setMessage(''), 4000)
  }

  // ── CSV Export ──────────────────────────────────────────────
  function handleExport() {
    const BOM = '﻿'
    const S = ';'
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const b = v => v === true ? 'ja' : v === false ? 'nein' : ''

    const headers = [
      'ID','Anbieter','Anbieter-Typ','Tag','Erfasst von','Plattform','Erschienen am','Format',
      'Thema-Kategorie','Thema',
      'C1','C2','C3','C4',
      'D1','D2','D3','D4',
      'E1','E2','E3','E4',
      'F-Wer','F-Was','F-Wann','F-Wo','F-Wie','F-Warum','F-Score',
      'Beleg','Erstellt am',
    ]
    const rows = sorted.map(p => [
      p.id,
      p.packages?.providers?.name ?? '',
      p.packages?.providers?.type ?? '',
      p.packages?.day ?? '',
      p.profiles?.name ?? '',
      p.platform ?? '',
      p.posted_at ? new Date(p.posted_at).toISOString() : '',
      p.format ?? '',
      p.topic_category ?? '',
      p.topic ?? '',
      b(p.c1), b(p.c2), b(p.c3), p.c4 ?? '',
      b(p.d1), b(p.d2), p.d3 ?? '', p.d4 ?? '',
      b(p.e1), b(p.e2), b(p.e3), p.e4 ?? '',
      b(p.f_wer), b(p.f_was), b(p.f_wann), b(p.f_wo), b(p.f_wie), b(p.f_warum), p.f_score ?? 0,
      p.g_beleg ?? '',
      p.created_at ? new Date(p.created_at).toLocaleDateString('de-CH') : '',
    ])
    const csv = BOM + [headers, ...rows].map(r => r.map(q).join(S)).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `medienanalyse_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── CSV Import ──────────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      let text = ev.target.result
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      if (lines.length < 2) { showMsg('CSV-Datei leer oder ungültig.'); return }

      const sep = lines[0].includes(';') ? ';' : ','
      function parseLine(line) {
        const res = []; let cur = '', inQ = false
        for (const ch of line) {
          if (ch === '"') inQ = !inQ
          else if (ch === sep && !inQ) { res.push(cur); cur = '' }
          else cur += ch
        }
        return [...res, cur]
      }

      const headers = parseLine(lines[0])
      const rows = lines.slice(1).map(l => {
        const vals = parseLine(l)
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
      })
      setImportRows(rows)
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  async function handleImport() {
    if (!importRows || !profile) return
    setImporting(true)

    // Build lookup maps
    const pkgMap  = {}
    for (const p of posts) {
      const key = `${p.packages?.providers?.name}|${p.packages?.day}`
      if (key !== '|' && !pkgMap[key]) pkgMap[key] = p.packages?.id
    }
    // Also load packages directly in case no posts exist yet
    const { data: allPkgs } = await supabase.from('packages').select('id, day, providers(name)')
    for (const pkg of allPkgs ?? []) {
      const key = `${pkg.providers?.name}|${pkg.day}`
      if (!pkgMap[key]) pkgMap[key] = pkg.id
    }
    const profMap = {}
    for (const pr of profilesList) profMap[pr.name] = pr.id

    const parseBool  = v => v === 'ja' ? true : v === 'nein' ? false : null
    const parseScale = v => v && !isNaN(v) ? parseInt(v) : null

    let processed = 0, skipped = 0
    for (const row of importRows) {
      const packageId = pkgMap[`${row['Anbieter']}|${row['Tag']}`]
      if (!packageId) { skipped++; continue }
      const evaluatedBy = profMap[row['Erfasst von']] ?? profile.id

      const obj = {
        package_id:     packageId,
        platform:       row['Plattform']        || null,
        posted_at:      row['Erschienen am']    || null,
        format:         row['Format']           || null,
        evaluated_by:   evaluatedBy,
        topic_category: row['Thema-Kategorie']  || null,
        topic:          row['Thema']            || null,
        c1: parseBool(row['C1']), c2: parseBool(row['C2']), c3: parseBool(row['C3']),
        c4: parseScale(row['C4']),
        d1: parseBool(row['D1']), d2: parseBool(row['D2']),
        d3: row['D3'] || null,
        d4: parseScale(row['D4']),
        e1: parseBool(row['E1']), e2: parseBool(row['E2']), e3: parseBool(row['E3']),
        e4: parseScale(row['E4']),
        f_wer:   row['F-Wer']   === 'ja',
        f_was:   row['F-Was']   === 'ja',
        f_wann:  row['F-Wann']  === 'ja',
        f_wo:    row['F-Wo']    === 'ja',
        f_wie:   row['F-Wie']   === 'ja',
        f_warum: row['F-Warum'] === 'ja',
        g_beleg: row['Beleg']   || null,
      }

      const existingId = row['ID']
      if (existingId && existingId.length > 10) {
        await supabase.from('posts').update(obj).eq('id', existingId)
      } else {
        await supabase.from('posts').insert(obj)
      }
      processed++
    }

    setImporting(false)
    setImportRows(null)
    showMsg(`Import fertig: ${processed} verarbeitet, ${skipped} übersprungen (Anbieter/Tag nicht gefunden).`)
    loadAll()
  }

  // ── Render ──────────────────────────────────────────────────
  if (loading) return <div className="page-content"><p className="text-muted">Wird geladen…</p></div>

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Daten</h1>
          <p className="text-muted">{sorted.length} von {posts.length} Beiträgen</p>
        </div>
        <div className="flex gap-8">
          {canEdit && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
                CSV importieren
              </button>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />
            </>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleExport} disabled={posts.length === 0}>
            CSV exportieren
          </button>
        </div>
      </div>

      {message && <div className="alert alert-success" style={{ marginBottom: 16 }}>{message}</div>}

      {/* Import-Vorschau */}
      {importRows && (
        <div className="card" style={{ marginBottom: 20, padding: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Import-Vorschau – {importRows.length} Zeilen</h3>
          <div className="table-wrapper" style={{ maxHeight: 200, overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {Object.keys(importRows[0] ?? {}).slice(0, 8).map(h => <th key={h}>{h}</th>)}
                  {Object.keys(importRows[0] ?? {}).length > 8 && <th>…</th>}
                </tr>
              </thead>
              <tbody>
                {importRows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).slice(0, 8).map((v, j) => <td key={j}>{v || '—'}</td>)}
                    {Object.values(row).length > 8 && <td>…</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-8" style={{ marginTop: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={handleImport} disabled={importing}>
              {importing ? 'Wird importiert…' : `${importRows.length} Zeilen importieren`}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setImportRows(null)}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Lösch-Bestätigung */}
      {deleteId && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          Beitrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          <div className="flex gap-8" style={{ marginTop: 10 }}>
            <button className="btn btn-primary btn-sm" onClick={handleDelete}>Ja, löschen</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setDeleteId(null)}>Abbrechen</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-12 mb-16" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="form-select" style={{ width: 'auto', minWidth: 160, padding: '4px 8px', fontSize: '.85rem' }}
          value={filterProvider} onChange={e => setFilterProvider(e.target.value)}>
          <option value="">Alle Anbieter</option>
          {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select className="form-select" style={{ width: 'auto', minWidth: 100, padding: '4px 8px', fontSize: '.85rem' }}
          value={filterDay} onChange={e => setFilterDay(e.target.value)}>
          <option value="">Alle Tage</option>
          {[1, 2, 3].map(d => <option key={d} value={d}>{dayLabel(d)}</option>)}
        </select>

        <select className="form-select" style={{ width: 'auto', minWidth: 150, padding: '4px 8px', fontSize: '.85rem' }}
          value={filterBewerter} onChange={e => setFilterBewerter(e.target.value)}>
          <option value="">Alle Bewerter</option>
          {profilesList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select className="form-select" style={{ width: 'auto', minWidth: 130, padding: '4px 8px', fontSize: '.85rem' }}
          value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
          <option value="">Alle Plattformen</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="beide">Beide</option>
        </select>

        {(filterProvider || filterDay || filterBewerter || filterPlatform) && (
          <button className="btn btn-ghost btn-sm" onClick={() => {
            setFilterProvider(''); setFilterDay(''); setFilterBewerter(''); setFilterPlatform('')
          }}>
            Filter zurücksetzen
          </button>
        )}
      </div>

      {posts.length === 0 && (
        <div className="alert alert-info">Es wurden noch keine Beiträge erfasst.</div>
      )}
      {posts.length > 0 && sorted.length === 0 && (
        <div className="alert alert-info">Keine Beiträge entsprechen den Filtern.</div>
      )}

      {/* Tabelle */}
      {sorted.length > 0 && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <Th col="provider"   label="Anbieter"  sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <Th col="day"        label="Tag"        sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <Th col="bewerter"   label="Bewerter"  sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <Th col="platform"   label="Plattform" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <Th col="format"     label="Format"    sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th>Thema</th>
                <Th col="c4"         label="C4"        sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <Th col="d4"         label="D4"        sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <Th col="e4"         label="E4"        sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <Th col="f_score"    label="F"         sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <Th col="posted_at"   label="Erschienen" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <Th col="created_at" label="Erfasst"   sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                {canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => {
                const ownPost  = p.evaluated_by === profile?.id
                const canDel   = isAdmin || ownPost
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.packages?.providers?.name ?? '—'}</td>
                    <td className="text-muted">{dayLabel(p.packages?.day)}</td>
                    <td>{p.profiles?.name ?? '—'}</td>
                    <td>{PLATFORM[p.platform] ?? p.platform ?? '—'}</td>
                    <td>{FORMAT[p.format] ?? p.format ?? '—'}</td>
                    <td style={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.topic ?? '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>{p.c4 ?? '—'}</td>
                    <td style={{ textAlign: 'center' }}>{p.d4 ?? '—'}</td>
                    <td style={{ textAlign: 'center' }}>{p.e4 ?? '—'}</td>
                    <td style={{ textAlign: 'center' }}>{p.f_score ?? 0}</td>
                    <td className="text-muted" style={{ fontSize: '.8rem', whiteSpace: 'nowrap' }}>
                      {p.posted_at
                        ? new Date(p.posted_at).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td className="text-muted" style={{ fontSize: '.8rem', whiteSpace: 'nowrap' }}>
                      {p.created_at
                        ? new Date(p.created_at).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })
                        : '—'}
                    </td>
                    {canEdit && (
                      <td>
                        <div className="flex gap-8">
                          {(isAdmin || ownPost) && (
                            <Link to={`/erfassen?edit=${p.id}`} className="btn btn-secondary btn-sm">
                              Bearbeiten
                            </Link>
                          )}
                          {canDel && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--error, #e53e3e)' }}
                              onClick={() => setDeleteId(p.id)}
                            >
                              Löschen
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
