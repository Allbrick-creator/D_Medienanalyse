import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// ── Skalenbeschreibungen (identisch zu Capture) ──────────────
const C4_DESC = [
  'Sachlich-informativer Titel',
  'Leicht zugespitzt, Inhalt hält das Versprechen',
  'Deutlich reisserisch, Inhalt hält knapp',
  'Reisserisch, Titel verspricht mehr als der Inhalt',
]
const D4_DESC = [
  'Einseitig und wertend',
  'Erkennbare Tendenz',
  'Überwiegend neutral, einzelne Wertungen',
  'Neutral, ausgewogen, belegt',
]
const E4_DESC = [
  'Nüchtern',
  'Einzelne emotionale Elemente',
  'Deutlich emotional, Fakten noch im Zentrum',
  'Beitrag lebt von Gefühl statt Fakten',
]

const EMPTY_RATING = {
  topic_category: '', topic: '',
  c1: '', c2: '', c3: '', c4: '',
  d1: '', d2: '', d3: '', d4: '',
  e1: '', e2: '', e3: '', e4: '',
  f_wer: false, f_was: false, f_wann: false, f_wo: false, f_wie: false, f_warum: false,
  g_beleg: '',
}

const HARD_NEWS = ['Politik', 'Wirtschaft', 'Gesellschaft', 'Wissenschaft/Umwelt/Gesundheit']
const SOFT_NEWS = ['Kriminalität/Unglück', 'Unterhaltung/Promis', 'Human Interest/Kurioses', 'Sport']

// ── Hilfskomponenten ─────────────────────────────────────────
function YesNo({ name, value, onChange }) {
  return (
    <div className="radio-group horizontal">
      {['ja', 'nein'].map(v => (
        <label key={v} className="radio-option">
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} />
          <span className="radio-label">{v === 'ja' ? 'Ja' : 'Nein'}</span>
        </label>
      ))}
    </div>
  )
}

function YesNoNa({ name, value, onChange }) {
  return (
    <div className="radio-group horizontal">
      {[['ja','Ja'], ['nein','Nein'], ['nicht_relevant','Nicht relevant']].map(([v, l]) => (
        <label key={v} className="radio-option">
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} />
          <span className="radio-label">{l}</span>
        </label>
      ))}
    </div>
  )
}

function ScaleInput({ name, value, onChange, descriptions }) {
  return (
    <div className="scale-group">
      {descriptions.map((desc, i) => {
        const val = String(i + 1)
        return (
          <div key={val} className="scale-option">
            <input type="radio" id={`cal_${name}_${val}`} name={`cal_${name}`} value={val}
              checked={value === val} onChange={() => onChange(val)} />
            <label htmlFor={`cal_${name}_${val}`}>
              <span className="scale-num">{val}</span>
              <span className="scale-desc">{desc}</span>
            </label>
          </div>
        )
      })}
    </div>
  )
}

// ── Übereinstimmungsberechnung ────────────────────────────────
function calcAgreement(ratings) {
  if (ratings.length < 2) return null
  const fields = ['c1','c2','c3','c4','d1','d2','d3','d4','e2','e3','e4','f_wer','f_was','f_wann','f_wo','f_wie','f_warum']
  let total = 0, matching = 0
  for (const field of fields) {
    const vals = ratings.map(r => r[field]).filter(v => v !== null && v !== undefined)
    if (vals.length < 2) continue
    const mode = vals.reduce((acc, v) => {
      acc[String(v)] = (acc[String(v)] ?? 0) + 1; return acc
    }, {})
    const maxCount = Math.max(...Object.values(mode))
    matching += (maxCount / vals.length) * 100
    total++
  }
  return total > 0 ? Math.round(matching / total) : null
}

// ── Hauptkomponente ───────────────────────────────────────────
export default function Calibration() {
  const { profile } = useAuth()
  const isAdmin    = profile?.role === 'admin'
  const canRate    = profile?.role === 'admin' || profile?.role === 'bewerter'

  const [tab,         setTab]         = useState('beitraege')
  const [items,       setItems]       = useState([])
  const [ratings,     setRatings]     = useState([])
  const [profiles,    setProfiles]    = useState([])
  const [providers,   setProviders]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [ratingItem,  setRatingItem]  = useState(null)
  const [ratingForm,  setRatingForm]  = useState(EMPTY_RATING)
  const [savingRating, setSavingRating] = useState(false)
  const [savedMsg,    setSavedMsg]    = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem,     setNewItem]     = useState({ label: '', posted_at: '', platform: 'instagram', format: 'video', provider_id: '' })
  const [addingItem,  setAddingItem]  = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [
      { data: itemsData },
      { data: ratingsData },
      { data: profsData },
      { data: provsData },
    ] = await Promise.all([
      supabase.from('calibration_items').select('*, providers(name)').order('label'),
      supabase.from('calibration_posts').select('*, profiles!evaluated_by(id, name)'),
      supabase.from('profiles').select('id, name'),
      supabase.from('providers').select('id, name').order('name'),
    ])
    setItems(itemsData ?? [])
    setRatings(ratingsData ?? [])
    setProfiles(profsData ?? [])
    setProviders(provsData ?? [])
    setLoading(false)
  }

  function ratingsFor(itemId) {
    return ratings.filter(r => r.calibration_item_id === itemId)
  }

  function myRating(itemId) {
    return ratings.find(r => r.calibration_item_id === itemId && r.evaluated_by === profile?.id)
  }

  function openRating(item) {
    const existing = myRating(item.id)
    if (existing) {
      const b = v => v === true ? 'ja' : v === false ? 'nein' : ''
      setRatingForm({
        topic_category: existing.topic_category ?? '',
        topic:          existing.topic ?? '',
        c1: b(existing.c1), c2: b(existing.c2), c3: b(existing.c3), c4: existing.c4 ? String(existing.c4) : '',
        d1: b(existing.d1), d2: b(existing.d2), d3: existing.d3 ?? '', d4: existing.d4 ? String(existing.d4) : '',
        e1: b(existing.e1), e2: b(existing.e2), e3: b(existing.e3), e4: existing.e4 ? String(existing.e4) : '',
        f_wer: existing.f_wer ?? false, f_was: existing.f_was ?? false, f_wann: existing.f_wann ?? false,
        f_wo:  existing.f_wo  ?? false, f_wie: existing.f_wie ?? false, f_warum: existing.f_warum ?? false,
        g_beleg: existing.g_beleg ?? '',
      })
    } else {
      setRatingForm(EMPTY_RATING)
    }
    setRatingItem(item)
  }

  async function handleSaveRating() {
    if (!profile || !ratingItem) return
    setSavingRating(true)
    const f = ratingForm
    const b = v => v === 'ja' ? true : v === 'nein' ? false : null
    const payload = {
      calibration_item_id: ratingItem.id,
      evaluated_by: profile.id,
      topic_category: f.topic_category || null,
      topic:          f.topic || null,
      c1: b(f.c1), c2: b(f.c2), c3: b(f.c3), c4: f.c4 ? parseInt(f.c4) : null,
      d1: b(f.d1), d2: b(f.d2), d3: f.d3 || null, d4: f.d4 ? parseInt(f.d4) : null,
      e1: b(f.e1), e2: b(f.e2), e3: b(f.e3), e4: f.e4 ? parseInt(f.e4) : null,
      f_wer: f.f_wer, f_was: f.f_was, f_wann: f.f_wann,
      f_wo:  f.f_wo,  f_wie: f.f_wie, f_warum: f.f_warum,
      g_beleg: f.g_beleg || null,
    }

    const existing = myRating(ratingItem.id)
    if (existing) {
      await supabase.from('calibration_posts').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('calibration_posts').insert(payload)
    }
    setSavingRating(false)
    setSavedMsg('Bewertung gespeichert!')
    setTimeout(() => setSavedMsg(''), 3000)
    setRatingItem(null)
    loadAll()
  }

  async function handleAddItem() {
    if (!newItem.label || !newItem.platform || !newItem.format) return
    setAddingItem(true)
    await supabase.from('calibration_items').insert({
      label:       newItem.label,
      posted_at:   newItem.posted_at || null,
      platform:    newItem.platform,
      format:      newItem.format,
      provider_id: newItem.provider_id || null,
    })
    setAddingItem(false)
    setShowAddForm(false)
    setNewItem({ label: '', posted_at: '', platform: 'instagram', format: 'video', provider_id: '' })
    loadAll()
  }

  async function handleDeleteItem(id) {
    await supabase.from('calibration_items').delete().eq('id', id)
    loadAll()
  }

  const f = ratingForm
  const setF = key => val => setRatingForm(prev => ({ ...prev, [key]: val }))

  if (loading) return <div className="page-content"><p className="text-muted">Wird geladen…</p></div>

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Kalibrierung</h1>
      </div>

      {savedMsg && <div className="alert alert-success" style={{ marginBottom: 16 }}>{savedMsg}</div>}

      {/* Tab-Navigation */}
      <div className="flex gap-8 mb-16">
        {[['beitraege', 'Beiträge'], ['uebereinstimmung', 'Übereinstimmung']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`btn btn-sm ${tab === key ? 'btn-primary' : 'btn-secondary'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: Beiträge ─────────────────────────────────────── */}
      {tab === 'beitraege' && (
        <div>
          {isAdmin && (
            <div style={{ marginBottom: 16 }}>
              {!showAddForm ? (
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(true)}>
                  + Kalibrierungs-Beitrag hinzufügen
                </button>
              ) : (
                <div className="card" style={{ padding: 20, marginBottom: 16, maxWidth: 520 }}>
                  <h3 style={{ marginBottom: 16 }}>Neuer Kalibrierungs-Beitrag</h3>
                  <div className="form-group">
                    <label className="form-label">Bezeichnung (z.B. «Beitrag 1»)</label>
                    <input type="text" className="form-input" value={newItem.label}
                      onChange={e => setNewItem(p => ({ ...p, label: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Erschienen am (optional)</label>
                    <input type="datetime-local" className="form-input" value={newItem.posted_at}
                      onChange={e => setNewItem(p => ({ ...p, posted_at: e.target.value }))} />
                  </div>
                  <div className="flex gap-12">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Plattform</label>
                      <select className="form-select" value={newItem.platform}
                        onChange={e => setNewItem(p => ({ ...p, platform: e.target.value }))}>
                        <option value="instagram">Instagram</option>
                        <option value="tiktok">TikTok</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Format</label>
                      <select className="form-select" value={newItem.format}
                        onChange={e => setNewItem(p => ({ ...p, format: e.target.value }))}>
                        <option value="video">Video</option>
                        <option value="bild">Bild</option>
                        <option value="karussell">Karussell</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Anbieter (optional)</label>
                    <select className="form-select" value={newItem.provider_id}
                      onChange={e => setNewItem(p => ({ ...p, provider_id: e.target.value }))}>
                      <option value="">— keiner —</option>
                      {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-8">
                    <button className="btn btn-primary btn-sm" onClick={handleAddItem} disabled={addingItem}>
                      {addingItem ? 'Wird gespeichert…' : 'Hinzufügen'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(false)}>
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {items.length === 0 && (
            <div className="alert alert-info">
              Noch keine Kalibrierungs-Beiträge vorhanden.
              {isAdmin ? ' Füge oben einen Beitrag hinzu.' : ' Die Lehrperson oder ein Admin muss zuerst Beiträge hinzufügen.'}
            </div>
          )}

          {items.map(item => {
            const itemRatings = ratingsFor(item.id)
            const hasMyRating = !!myRating(item.id)
            const raterNames  = profiles.filter(pr => itemRatings.some(r => r.evaluated_by === pr.id))
            const agreement   = calcAgreement(itemRatings)

            return (
              <div key={item.id} className="card" style={{ marginBottom: 16, padding: 20 }}>
                <div className="flex gap-12" style={{ alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <strong style={{ fontSize: '1.05rem' }}>{item.label}</strong>
                      {item.providers?.name && <span className="text-muted" style={{ fontSize: '.85rem' }}>{item.providers.name}</span>}
                      <span className="badge badge-offen" style={{ fontSize: '.75rem' }}>{item.platform}</span>
                      <span className="badge badge-offen" style={{ fontSize: '.75rem' }}>{item.format}</span>
                    </div>
                    {item.posted_at && (
                      <span style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: 12, display: 'block' }}>
                        Erschienen: {new Date(item.posted_at).toLocaleString('de-CH')}
                      </span>
                    )}

                    {/* Wer hat bewertet */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      {profiles.map(pr => {
                        const rated = itemRatings.some(r => r.evaluated_by === pr.id)
                        return (
                          <span key={pr.id} style={{
                            padding: '2px 10px', borderRadius: 20, fontSize: '.8rem',
                            background: rated ? 'var(--success-bg, #d1fae5)' : 'var(--surface-2)',
                            color: rated ? 'var(--success, #065f46)' : 'var(--text-muted)',
                          }}>
                            {rated ? '✓' : '○'} {pr.name}
                          </span>
                        )
                      })}
                    </div>

                    {agreement !== null && (
                      <span style={{ fontSize: '.8rem', color: agreement >= 75 ? 'var(--success, #065f46)' : agreement >= 50 ? 'var(--warning, #92400e)' : 'var(--error, #991b1b)' }}>
                        Übereinstimmung: {agreement}%
                      </span>
                    )}
                  </div>

                  <div className="flex gap-8" style={{ flexShrink: 0 }}>
                    {canRate && (
                      <button className={`btn btn-sm ${hasMyRating ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => openRating(item)}>
                        {hasMyRating ? 'Meine Bewertung bearbeiten' : 'Bewerten'}
                      </button>
                    )}
                    {isAdmin && (
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error, #e53e3e)' }}
                        onClick={() => handleDeleteItem(item.id)}>
                        Löschen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── TAB: Übereinstimmung ──────────────────────────────── */}
      {tab === 'uebereinstimmung' && (
        <div>
          {items.length === 0 && <div className="alert alert-info">Noch keine Kalibrierungs-Beiträge vorhanden.</div>}
          {items.length > 0 && ratings.length < 2 && (
            <div className="alert alert-info">Noch zu wenig Bewertungen vorhanden. Es braucht mindestens 2 Personen pro Beitrag.</div>
          )}
          {items.length > 0 && (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Beitrag</th>
                    <th>Bewertet von</th>
                    <th style={{ textAlign: 'center' }}>Anz. Bewert.</th>
                    <th style={{ textAlign: 'center' }}>Übereinstimmung</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const itemRatings = ratingsFor(item.id)
                    const agreement   = calcAgreement(itemRatings)
                    const raters      = profiles.filter(pr => itemRatings.some(r => r.evaluated_by === pr.id))
                    const agColor = agreement === null ? 'var(--text-muted)'
                      : agreement >= 75 ? 'var(--success, #065f46)'
                      : agreement >= 50 ? 'var(--warning, #92400e)'
                      : 'var(--error, #991b1b)'

                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 500 }}>{item.label}</td>
                        <td>{raters.map(r => r.name).join(', ') || '—'}</td>
                        <td style={{ textAlign: 'center' }}>{itemRatings.length}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: agColor }}>
                          {agreement !== null ? `${agreement}%` : '—'}
                        </td>
                        <td>
                          {agreement !== null && (
                            <details>
                              <summary style={{ cursor: 'pointer', fontSize: '.85rem', color: 'var(--accent)' }}>
                                Details anzeigen
                              </summary>
                              <div style={{ marginTop: 8 }}>
                                <AgreementDetail ratings={itemRatings} profiles={profiles} />
                              </div>
                            </details>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Bewertungs-Formular (Modal-Ersatz) ───────────────── */}
      {ratingItem && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          overflowY: 'auto', padding: '40px 16px',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 680, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2>{ratingItem.label} bewerten</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setRatingItem(null)}>✕</button>
            </div>

            {savedMsg && <div className="alert alert-success" style={{ marginBottom: 16 }}>{savedMsg}</div>}

            {/* B: Thema */}
            <div className="form-section">
              <div className="form-section-header">
                <span className="section-letter">B</span>
                <span className="section-title">Thema</span>
              </div>
              <div className="form-group">
                <label className="form-label">Nachrichtenkategorie</label>
                <div className="radio-group horizontal">
                  {[['hard_news','Hard News'],['soft_news','Soft News']].map(([v,l]) => (
                    <label key={v} className="radio-option">
                      <input type="radio" name="cal_topic_cat" value={v}
                        checked={f.topic_category === v} onChange={() => setF('topic_category')(v)} />
                      <span className="radio-label">{l}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Themenbereich</label>
                <select className="form-select" value={f.topic} onChange={e => setF('topic')(e.target.value)}>
                  <option value="">— auswählen —</option>
                  <optgroup label="Hard News">{HARD_NEWS.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>
                  <optgroup label="Soft News">{SOFT_NEWS.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>
                </select>
              </div>
            </div>

            {/* C: Clickbait */}
            <div className="form-section">
              <div className="form-section-header"><span className="section-letter">C</span><span className="section-title">Clickbait</span></div>
              <div className="form-group"><label className="form-label">C1 – Der Titel enthält Übertreibung oder Dramatisierung</label><YesNo name="cal_c1" value={f.c1} onChange={setF('c1')} /></div>
              <div className="form-group"><label className="form-label">C2 – Neugier wird geweckt, ohne Antwort zu geben</label><YesNo name="cal_c2" value={f.c2} onChange={setF('c2')} /></div>
              <div className="form-group"><label className="form-label">C3 – Inhalt hält Versprechen des Titels nicht</label><YesNo name="cal_c3" value={f.c3} onChange={setF('c3')} /></div>
              <div className="form-group"><label className="form-label">C4 – Clickbait-Gesamteindruck</label><ScaleInput name="cal_c4" value={f.c4} onChange={setF('c4')} descriptions={C4_DESC} /></div>
            </div>

            {/* D: Sachlichkeit */}
            <div className="form-section">
              <div className="form-section-header"><span className="section-letter">D</span><span className="section-title">Sachlichkeit</span></div>
              <div className="form-group"><label className="form-label">D1 – Eigene Meinung des Erstellers erkennbar</label><YesNo name="cal_d1" value={f.d1} onChange={setF('d1')} /></div>
              <div className="form-group"><label className="form-label">D2 – Einseitige Darstellung</label><YesNo name="cal_d2" value={f.d2} onChange={setF('d2')} /></div>
              <div className="form-group"><label className="form-label">D3 – Quellen angegeben</label><YesNoNa name="cal_d3" value={f.d3} onChange={setF('d3')} /></div>
              <div className="form-group"><label className="form-label">D4 – Sachlichkeits-Gesamteindruck</label><ScaleInput name="cal_d4" value={f.d4} onChange={setF('d4')} descriptions={D4_DESC} /></div>
            </div>

            {/* E: Emotionalisierung */}
            <div className="form-section">
              <div className="form-section-header"><span className="section-letter">E</span><span className="section-title">Emotionalisierung</span></div>
              <div className="form-group"><label className="form-label">E2 – Emotionale Bilder oder Musik</label><YesNo name="cal_e2" value={f.e2} onChange={setF('e2')} /></div>
              <div className="form-group"><label className="form-label">E3 – Emotionale Sprache oder Ausrufe</label><YesNo name="cal_e3" value={f.e3} onChange={setF('e3')} /></div>
              <div className="form-group"><label className="form-label">E4 – Emotionalisierungs-Gesamteindruck</label><ScaleInput name="cal_e4" value={f.e4} onChange={setF('e4')} descriptions={E4_DESC} /></div>
            </div>

            {/* F: W-Fragen */}
            <div className="form-section">
              <div className="form-section-header"><span className="section-letter">F</span><span className="section-title">W-Fragen beantwortet</span></div>
              <div className="form-group">
                <div className="checkbox-group">
                  {[['f_wer','Wer?'],['f_was','Was?'],['f_wann','Wann?'],['f_wo','Wo?'],['f_wie','Wie?'],['f_warum','Warum?']].map(([key, label]) => (
                    <label key={key} className="checkbox-option">
                      <input type="checkbox" checked={f[key]} onChange={e => setF(key)(e.target.checked)} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* G: Beleg */}
            <div className="form-section">
              <div className="form-section-header"><span className="section-letter">G</span><span className="section-title">Beleg</span></div>
              <div className="form-group">
                <label className="form-label">Art des Belegs</label>
                <select className="form-select" value={f.g_beleg} onChange={e => setF('g_beleg')(e.target.value)}>
                  <option value="">— auswählen —</option>
                  {['Expertenmeinung','Statistik','Augenzeugen','Dokumente','Keine Belege','Nicht anwendbar'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-8" style={{ marginTop: 8 }}>
              <button className="btn btn-primary" onClick={handleSaveRating} disabled={savingRating}>
                {savingRating ? 'Wird gespeichert…' : 'Bewertung speichern'}
              </button>
              <button className="btn btn-secondary" onClick={() => setRatingItem(null)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Detailansicht pro Frage ───────────────────────────────────
function AgreementDetail({ ratings, profiles }) {
  const getName = id => profiles.find(p => p.id === id)?.name ?? '?'
  const b = v => v === true ? 'Ja' : v === false ? 'Nein' : '—'

  const fields = [
    ['C1','c1',b], ['C2','c2',b], ['C3','c3',b], ['C4','c4',v => v ?? '—'],
    ['D1','d1',b], ['D2','d2',b], ['D3','d3',v => v ?? '—'], ['D4','d4',v => v ?? '—'],
    ['E2','e2',b], ['E3','e3',b], ['E4','e4',v => v ?? '—'],
    ['F-Wer','f_wer',b], ['F-Was','f_was',b], ['F-Wann','f_wann',b],
    ['F-Wo','f_wo',b], ['F-Wie','f_wie',b], ['F-Warum','f_warum',b],
  ]

  return (
    <div className="table-wrapper">
      <table className="data-table" style={{ fontSize: '.8rem' }}>
        <thead>
          <tr>
            <th>Frage</th>
            {ratings.map(r => <th key={r.id}>{getName(r.evaluated_by)}</th>)}
            <th>Einig?</th>
          </tr>
        </thead>
        <tbody>
          {fields.map(([label, key, fmt]) => {
            const vals = ratings.map(r => fmt(r[key]))
            const allSame = vals.length > 1 && vals.every(v => v === vals[0])
            return (
              <tr key={key} style={{ background: allSame ? 'var(--success-bg, #d1fae5)' : undefined }}>
                <td>{label}</td>
                {vals.map((v, i) => <td key={i}>{v}</td>)}
                <td>{vals.length > 1 ? (allSame ? '✓' : '✗') : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
