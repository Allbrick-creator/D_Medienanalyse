import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// ─── Wiederverwendbare Formular-Bausteine ───────────────────

function YesNo({ name, value, onChange, required }) {
  return (
    <div className="radio-group horizontal">
      {['ja', 'nein'].map(v => (
        <label key={v} className="radio-option">
          <input
            type="radio"
            name={name}
            value={v}
            checked={value === v}
            onChange={() => onChange(v)}
            required={required && !value}
          />
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
            <input
              type="radio"
              id={`${name}_${val}`}
              name={name}
              value={val}
              checked={value === val}
              onChange={() => onChange(val)}
            />
            <label htmlFor={`${name}_${val}`}>
              <span className="scale-num">{val}</span>
              <span className="scale-desc">{desc}</span>
            </label>
          </div>
        )
      })}
    </div>
  )
}

// ─── Konstanten ──────────────────────────────────────────────

const EMPTY_FORM = {
  platform: '', posted_at: '', format: '',
  topic_category: '', topic: '',
  c1: '', c2: '', c3: '', c4: '',
  d1: '', d2: '', d3: '', d4: '',
  e1: '', e2: '', e3: '', e4: '',
  f_wer: false, f_was: false, f_wann: false, f_wo: false, f_wie: false, f_warum: false,
  g_beleg: '',
}

const HARD_NEWS = ['Politik', 'Wirtschaft', 'Gesellschaft', 'Wissenschaft/Umwelt/Gesundheit']
const SOFT_NEWS = ['Kriminalität/Unglück', 'Unterhaltung/Promis', 'Human Interest/Kurioses', 'Sport']

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

// ─── Hauptkomponente ─────────────────────────────────────────

// ─── Scroll-Rad für Stunden / Minuten ───────────────────────

const ITEM_H = 44
const REPEATS = 5
const MID = 2  // mittlere Wiederholung (0-indexed in 0..4)

function WheelPicker({ value, onChange, count, pad = 2 }) {
  const ref = useRef(null)
  const timer = useRef(null)
  const ignoreScroll = useRef(false)

  const targetTop = (val) => (MID * count + val) * ITEM_H

  useEffect(() => {
    if (ref.current) {
      ignoreScroll.current = true
      ref.current.scrollTop = targetTop(value)
      setTimeout(() => { ignoreScroll.current = false }, 200)
    }
  }, [value])

  function onScroll() {
    if (ignoreScroll.current) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (!ref.current) return
      const rawIdx = Math.round(ref.current.scrollTop / ITEM_H)
      const logicalValue = ((rawIdx % count) + count) % count
      const snapIdx = MID * count + logicalValue
      ignoreScroll.current = true
      ref.current.scrollTo({ top: snapIdx * ITEM_H, behavior: 'smooth' })
      onChange(logicalValue)
      setTimeout(() => { ignoreScroll.current = false }, 300)
    }, 120)
  }

  const totalItems = count * REPEATS

  return (
    <div style={{ width: 52, flexShrink: 0 }}>
      <div ref={ref} onScroll={onScroll} className="wheel-scroll"
        style={{
          height: ITEM_H * 3, overflowY: 'scroll', scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
        <div style={{ height: ITEM_H }} />
        {Array.from({ length: totalItems }, (_, i) => {
          const displayVal = i % count
          const isSelected = displayVal === value
          return (
            <div key={i}
              style={{
                height: ITEM_H, scrollSnapAlign: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isSelected ? '1.35rem' : '1rem',
                fontWeight: isSelected ? 700 : 400,
                color: isSelected ? 'var(--text)' : 'var(--text-muted)',
                background: isSelected ? 'var(--surface-2, rgba(128,128,128,.15))' : 'transparent',
                borderRadius: 6,
                cursor: 'pointer', userSelect: 'none',
              }}
              onClick={() => {
                onChange(displayVal)
                ref.current?.scrollTo({ top: targetTop(displayVal), behavior: 'smooth' })
              }}>
              {String(displayVal).padStart(pad, '0')}
            </div>
          )
        })}
        <div style={{ height: ITEM_H }} />
      </div>
    </div>
  )
}

function TimeWheels({ timeValue, onTimeChange, hasError }) {
  const h = timeValue ? (parseInt(timeValue.split(':')[0], 10) || 0) : 0
  const m = timeValue ? (parseInt(timeValue.split(':')[1], 10) || 0) : 0
  const fmt = n => String(n).padStart(2, '0')

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      border: `1px solid ${hasError ? 'var(--error, #e53e3e)' : 'var(--border)'}`,
      borderRadius: 'var(--radius, 6px)',
      background: 'var(--surface)',
      padding: '0 8px',
    }}>
      <WheelPicker value={h} count={24}
        onChange={newH => onTimeChange(`${fmt(newH)}:${fmt(m)}`)} />
      <div style={{
        fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)',
        padding: '0 4px', userSelect: 'none', lineHeight: 1,
      }}>:</div>
      <WheelPicker value={m} count={60}
        onChange={newM => onTimeChange(`${fmt(h)}:${fmt(newM)}`)} />
    </div>
  )
}

export default function Capture() {
  const { profile } = useAuth()
  const { paketId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId    = searchParams.get('edit')
  const isEditMode = !!editId

  const [pakete,    setPakete]    = useState([])
  const [providers, setProviders] = useState([])
  const [settings,  setSettings]  = useState(null)
  const [selectedPaketId, setSelectedPaketId] = useState(paketId ?? '')
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [errors,    setErrors]    = useState({})
  const [saving,    setSaving]    = useState(false)
  const [savedMsg,  setSavedMsg]  = useState('')
  const [postCount, setPostCount] = useState(0)
  const [existingPosts, setExistingPosts] = useState([])
  const [postedAtTime, setPostedAtTime] = useState('00:00')

  useEffect(() => {
    async function loadBase() {
      const [{ data: pkgs }, { data: provs }, { data: sett }] = await Promise.all([
        supabase.from('packages').select('*, providers(id, name, type)'),
        supabase.from('providers').select('*'),
        supabase.from('survey_settings').select('*').single(),
      ])
      setPakete(pkgs ?? [])
      setProviders(provs ?? [])
      setSettings(sett)
    }
    loadBase()
  }, [])

  // Edit-Modus: bestehenden Beitrag laden und Formular vorausfüllen
  useEffect(() => {
    if (!editId) return
    supabase.from('posts').select('*').eq('id', editId).single().then(({ data: p }) => {
      if (!p) return
      setSelectedPaketId(p.package_id)
      const b = (v) => v === true ? 'ja' : v === false ? 'nein' : ''
      const localDate = p.posted_at ? new Date(p.posted_at) : null
      const timeFromDb = localDate
        ? `${String(localDate.getHours()).padStart(2,'0')}:${String(localDate.getMinutes()).padStart(2,'0')}`
        : '00:00'
      const dateFromDb = localDate
        ? `${localDate.getFullYear()}-${String(localDate.getMonth()+1).padStart(2,'0')}-${String(localDate.getDate()).padStart(2,'0')}`
        : ''
      setPostedAtTime(timeFromDb)
      setForm({
        platform:       p.platform ?? '',
        posted_at:      dateFromDb ? `${dateFromDb}T${timeFromDb}` : '',
        format:         p.format ?? '',
        topic_category: p.topic_category ?? '',
        topic:          p.topic ?? '',
        c1: b(p.c1), c2: b(p.c2), c3: b(p.c3), c4: p.c4 ? String(p.c4) : '',
        d1: b(p.d1), d2: b(p.d2), d3: p.d3 ?? '', d4: p.d4 ? String(p.d4) : '',
        e1: b(p.e1), e2: b(p.e2), e3: b(p.e3), e4: p.e4 ? String(p.e4) : '',
        f_wer: p.f_wer ?? false, f_was: p.f_was ?? false, f_wann: p.f_wann ?? false,
        f_wo:  p.f_wo  ?? false, f_wie: p.f_wie ?? false, f_warum: p.f_warum ?? false,
        g_beleg: p.g_beleg ?? '',
      })
    })
  }, [editId])

  const loadPackageData = useCallback(async (pkgId) => {
    if (!pkgId) { setPostCount(0); setExistingPosts([]); return }
    const { data } = await supabase
      .from('posts')
      .select('id, platform, posted_at, format, topic, c4, d4, e4, evaluated_by, profiles!evaluated_by(name)')
      .eq('package_id', pkgId)
    const posts = data ?? []
    setPostCount(posts.length)
    setExistingPosts(posts)
  }, [])

  useEffect(() => { loadPackageData(selectedPaketId) }, [selectedPaketId, loadPackageData])

  const selectedPaket = pakete.find(p => p.id === selectedPaketId)

  function dayLabel(day) {
    const dateStr = settings?.[`day${day}`]
    if (!dateStr) return `Tag ${day}`
    return new Date(dateStr).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function fScore() {
    return ['f_wer','f_was','f_wann','f_wo','f_wie','f_warum'].filter(k => form[k]).length
  }

  // Beiträge der anderen Plattform (für Duplikat-Anzeige)
  const otherPlatformPosts = existingPosts.filter(p => {
    if (!form.platform || form.platform === 'beide') return false
    const other = form.platform === 'instagram' ? 'tiktok' : 'instagram'
    return p.platform === other
  })

  function validate() {
    const e = {}
    if (!selectedPaketId) e.package_id = 'Bitte ein Paket auswählen.'
    if (!form.platform)   e.platform   = 'Pflichtfeld'
    if (!form.format)     e.format     = 'Pflichtfeld'
    if (!form.posted_at)  e.posted_at  = 'Pflichtfeld'
    if (!form.topic_category) e.topic_category = 'Pflichtfeld'
    if (!form.topic)      e.topic      = 'Pflichtfeld'
    if (!form.c1)         e.c1         = 'Pflichtfeld'
    if (!form.c2)         e.c2         = 'Pflichtfeld'
    if (!form.c3)         e.c3         = 'Pflichtfeld'
    if (!form.c4)         e.c4         = 'Pflichtfeld'
    if (!form.d1)         e.d1         = 'Pflichtfeld'
    if (!form.d2)         e.d2         = 'Pflichtfeld'
    if (!form.d3)         e.d3         = 'Pflichtfeld'
    if (!form.d4)         e.d4         = 'Pflichtfeld'
    if (form.format === 'video' && !form.e1) e.e1 = 'Pflichtfeld'
    if (!form.e2)         e.e2         = 'Pflichtfeld'
    if (!form.e3)         e.e3         = 'Pflichtfeld'
    if (!form.e4)         e.e4         = 'Pflichtfeld'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) {
      document.querySelector('.form-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSaving(true)
    const payload = {
      package_id:     selectedPaketId,
      platform:       form.platform,
      posted_at:      form.posted_at ? new Date(form.posted_at).toISOString() : null,
      format:         form.format,
      evaluated_by:   profile.id,
      topic_category: form.topic_category,
      topic:          form.topic,
      c1: form.c1 === 'ja', c2: form.c2 === 'ja', c3: form.c3 === 'ja',
      c4: parseInt(form.c4),
      d1: form.d1 === 'ja', d2: form.d2 === 'ja',
      d3: form.d3,
      d4: parseInt(form.d4),
      e1: form.format === 'video' ? form.e1 === 'ja' : null,
      e2: form.e2 === 'ja', e3: form.e3 === 'ja',
      e4: parseInt(form.e4),
      f_wer: form.f_wer, f_was: form.f_was, f_wann: form.f_wann,
      f_wo: form.f_wo, f_wie: form.f_wie, f_warum: form.f_warum,
      g_beleg: form.g_beleg.trim() || null,
    }

    let error
    if (isEditMode) {
      const { error: e } = await supabase.from('posts').update(payload).eq('id', editId)
      error = e
    } else {
      const { error: e } = await supabase.from('posts').insert(payload)
      error = e
    }
    setSaving(false)

    if (error) {
      setErrors({ _submit: `Fehler: ${error.message}` })
      return
    }

    if (isEditMode) {
      setSavedMsg('Beitrag aktualisiert!')
      setTimeout(() => { setSavedMsg(''); navigate('/daten') }, 1500)
    } else {
      setSavedMsg('Beitrag gespeichert!')
      setTimeout(() => setSavedMsg(''), 3000)
      setForm(EMPTY_FORM)
      setPostedAtTime('00:00')
      setErrors({})
      loadPackageData(selectedPaketId)
    }
  }

  async function markAsIdentical(existingPostId) {
    await supabase.from('posts').update({ platform: 'beide' }).eq('id', existingPostId)
    setSavedMsg('Als identisch markiert – Plattform auf «beide» gesetzt.')
    setTimeout(() => setSavedMsg(''), 3000)
    loadPackageData(selectedPaketId)
  }

  const { profileError } = useAuth()
  const canCapture = profile?.role === 'admin' || profile?.role === 'bewerter'
  if (!canCapture) return (
    <div className="page-content">
      <div className="alert alert-error">
        {profileError
          ? <>Profil konnte nicht geladen werden.<br /><code style={{fontSize:'0.8em'}}>{profileError.code}: {profileError.message}</code></>
          : profile === null
            ? 'Profil wird geladen oder wurde nicht gefunden. Bitte Seite neu laden.'
            : 'Nur Admins und Bewerter können Beiträge erfassen.'
        }
      </div>
    </div>
  )

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>{isEditMode ? 'Beitrag bearbeiten' : 'Erfassen'}</h1>
          {isEditMode && (
            <Link to="/daten" className="text-muted" style={{ fontSize: '.85rem' }}>← Zurück zur Daten-Übersicht</Link>
          )}
        </div>
        {!isEditMode && postCount > 0 && (
          <span className={`counter-badge ${postCount >= 15 ? 'warn' : ''}`}>
            {postCount} / 15 Beiträge in diesem Paket
          </span>
        )}
      </div>

      {savedMsg && <div className="alert alert-success">{savedMsg}</div>}
      {errors._submit && <div className="alert alert-error">{errors._submit}</div>}
      {postCount >= 15 && (
        <div className="alert alert-warning">
          Dieses Paket hat bereits 15 Beiträge erreicht (Maximum).
        </div>
      )}

      <div className="capture-layout">
        {/* ── Hauptformular ── */}
        <form onSubmit={handleSubmit} noValidate>

          {/* A: Stammdaten */}
          <div className="form-section">
            <div className="form-section-header">
              <span className="section-letter">A</span>
              <span className="section-title">Stammdaten</span>
            </div>

            <div className="form-group">
              <label className="form-label">Paket</label>
              <select
                className={`form-select ${errors.package_id ? 'error' : ''}`}
                value={selectedPaketId}
                onChange={e => { setSelectedPaketId(e.target.value); setForm(EMPTY_FORM) }}
              >
                <option value="">— Paket auswählen —</option>
                {pakete.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.providers?.name} · Tag {p.day}{settings?.[`day${p.day}`]
                      ? ` (${new Date(settings[`day${p.day}`]).toLocaleDateString('de-CH', { day:'2-digit', month:'2-digit' })})`
                      : ''}
                  </option>
                ))}
              </select>
              {errors.package_id && <span className="form-error">{errors.package_id}</span>}
            </div>

            {selectedPaket && (
              <div className="card" style={{ background: 'var(--surface-2)', marginBottom: 16, padding: '12px 16px' }}>
                <strong>{selectedPaket.providers?.name}</strong>
                {' · '}
                {dayLabel(selectedPaket.day)}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Erschienen auf *</label>
              <div className="radio-group horizontal">
                {[['instagram','Instagram'],['tiktok','TikTok'],['beide','Beide']].map(([v,l]) => (
                  <label key={v} className="radio-option">
                    <input type="radio" name="platform" value={v}
                      checked={form.platform === v}
                      onChange={() => setForm(f => ({ ...f, platform: v }))} />
                    <span className="radio-label">{l}</span>
                  </label>
                ))}
              </div>
              {errors.platform && <span className="form-error">{errors.platform}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Erscheinungsdatum und -uhrzeit *</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <input type="date"
                  className={`form-input ${errors.posted_at ? 'error' : ''}`}
                  style={{ width: 156, flex: '0 0 auto' }}
                  value={form.posted_at ? form.posted_at.split('T')[0] : ''}
                  onChange={e => {
                    const d = e.target.value
                    setForm(f => ({ ...f, posted_at: d ? `${d}T${postedAtTime}` : '' }))
                  }} />
                <TimeWheels
                  hasError={!!errors.posted_at}
                  timeValue={postedAtTime}
                  onTimeChange={t => {
                    setPostedAtTime(t)
                    const d = form.posted_at?.split('T')[0] || ''
                    if (d) setForm(f => ({ ...f, posted_at: `${d}T${t}` }))
                  }} />
              </div>
              {errors.posted_at && <span className="form-error">{errors.posted_at}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Format *</label>
              <div className="radio-group horizontal">
                {[['video','Video'],['bild','Bild'],['karussell','Karussell']].map(([v,l]) => (
                  <label key={v} className="radio-option">
                    <input type="radio" name="format" value={v}
                      checked={form.format === v}
                      onChange={() => setForm(f => ({ ...f, format: v }))} />
                    <span className="radio-label">{l}</span>
                  </label>
                ))}
              </div>
              {errors.format && <span className="form-error">{errors.format}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Bewertet von</label>
              <input className="form-input" value={profile?.name ?? '—'} disabled />
            </div>
          </div>

          {/* B: Thema */}
          <div className="form-section">
            <div className="form-section-header">
              <span className="section-letter">B</span>
              <span className="section-title">Thema</span>
            </div>

            <div className="form-group">
              <label className="form-label">Kategorie *</label>
              <div className="radio-group horizontal">
                {[['hard_news','Hard News'],['soft_news','Soft News']].map(([v,l]) => (
                  <label key={v} className="radio-option">
                    <input type="radio" name="topic_category" value={v}
                      checked={form.topic_category === v}
                      onChange={() => setForm(f => ({ ...f, topic_category: v, topic: '' }))} />
                    <span className="radio-label">{l}</span>
                  </label>
                ))}
              </div>
              {errors.topic_category && <span className="form-error">{errors.topic_category}</span>}
            </div>

            {form.topic_category && (
              <div className="form-group">
                <label className="form-label">Thema *</label>
                <div className="radio-group">
                  {(form.topic_category === 'hard_news' ? HARD_NEWS : SOFT_NEWS).map(t => (
                    <label key={t} className="radio-option">
                      <input type="radio" name="topic" value={t}
                        checked={form.topic === t}
                        onChange={() => setForm(f => ({ ...f, topic: t }))} />
                      <span className="radio-label">{t}</span>
                    </label>
                  ))}
                </div>
                {errors.topic && <span className="form-error">{errors.topic}</span>}
              </div>
            )}
          </div>

          {/* C: Clickbait */}
          <div className="form-section">
            <div className="form-section-header">
              <span className="section-letter">C</span>
              <span className="section-title">Clickbait</span>
            </div>

            <div className="form-group">
              <label className="form-label">C1 – Neugierlücke (Information bewusst zurückgehalten) *</label>
              <YesNo name="c1" value={form.c1} onChange={v => setForm(f => ({ ...f, c1: v }))} required />
              {errors.c1 && <span className="form-error">{errors.c1}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">C2 – Superlative / Übertreibung *</label>
              <YesNo name="c2" value={form.c2} onChange={v => setForm(f => ({ ...f, c2: v }))} required />
              {errors.c2 && <span className="form-error">{errors.c2}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">C3 – Grossbuchstaben, mehrere Ausrufezeichen oder Emojis im Titel/Hook *</label>
              <YesNo name="c3" value={form.c3} onChange={v => setForm(f => ({ ...f, c3: v }))} required />
              {errors.c3 && <span className="form-error">{errors.c3}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">C4 – Clickbait-Skala *</label>
              <ScaleInput name="c4" value={form.c4} onChange={v => setForm(f => ({ ...f, c4: v }))} descriptions={C4_DESC} />
              {errors.c4 && <span className="form-error">{errors.c4}</span>}
            </div>
          </div>

          {/* D: Sachlichkeit */}
          <div className="form-section">
            <div className="form-section-header">
              <span className="section-letter">D</span>
              <span className="section-title">Sachlichkeit</span>
            </div>

            <div className="form-group">
              <label className="form-label">D1 – Quelle genannt *</label>
              <YesNo name="d1" value={form.d1} onChange={v => setForm(f => ({ ...f, d1: v }))} required />
              {errors.d1 && <span className="form-error">{errors.d1}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">D2 – Wertende Formulierungen im Nachrichtenteil *</label>
              <YesNo name="d2" value={form.d2} onChange={v => setForm(f => ({ ...f, d2: v }))} required />
              {errors.d2 && <span className="form-error">{errors.d2}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">D3 – Gegenseite / zweite Perspektive *</label>
              <YesNoNa name="d3" value={form.d3} onChange={v => setForm(f => ({ ...f, d3: v }))} />
              {errors.d3 && <span className="form-error">{errors.d3}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">D4 – Objektivitäts-Skala *</label>
              <ScaleInput name="d4" value={form.d4} onChange={v => setForm(f => ({ ...f, d4: v }))} descriptions={D4_DESC} />
              {errors.d4 && <span className="form-error">{errors.d4}</span>}
            </div>
          </div>

          {/* E: Emotionalisierung */}
          <div className="form-section">
            <div className="form-section-header">
              <span className="section-letter">E</span>
              <span className="section-title">Emotionalisierung</span>
            </div>

            {form.format === 'video' && (
              <div className="form-group">
                <label className="form-label">E1 – Dramatische Musik / Soundeffekte *</label>
                <YesNo name="e1" value={form.e1} onChange={v => setForm(f => ({ ...f, e1: v }))} required />
                {errors.e1 && <span className="form-error">{errors.e1}</span>}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">E2 – Emotionale Bilder *</label>
              <YesNo name="e2" value={form.e2} onChange={v => setForm(f => ({ ...f, e2: v }))} required />
              {errors.e2 && <span className="form-error">{errors.e2}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">E3 – Aufforderung zur Interaktion *</label>
              <YesNo name="e3" value={form.e3} onChange={v => setForm(f => ({ ...f, e3: v }))} required />
              {errors.e3 && <span className="form-error">{errors.e3}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">E4 – Emotionalisierungs-Skala *</label>
              <ScaleInput name="e4" value={form.e4} onChange={v => setForm(f => ({ ...f, e4: v }))} descriptions={E4_DESC} />
              {errors.e4 && <span className="form-error">{errors.e4}</span>}
            </div>
          </div>

          {/* F: W-Fragen */}
          <div className="form-section">
            <div className="form-section-header">
              <span className="section-letter">F</span>
              <span className="section-title">
                Informationsgehalt – W-Fragen
                <span className="counter-badge" style={{ marginLeft: 12 }}>{fScore()} / 6</span>
              </span>
            </div>

            <div className="checkbox-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[['f_wer','Wer'],['f_was','Was'],['f_wann','Wann'],['f_wo','Wo'],['f_wie','Wie'],['f_warum','Warum']].map(([key, label]) => (
                <label key={key} className="checkbox-option">
                  <input type="checkbox" checked={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                  <span className="checkbox-label">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* G: Beleg */}
          <div className="form-section">
            <div className="form-section-header">
              <span className="section-letter">G</span>
              <span className="section-title">Beleg (optional)</span>
            </div>
            <div className="form-group">
              <label className="form-label">Zitat oder Zeitstempel</label>
              <textarea className="form-textarea" value={form.g_beleg}
                placeholder="z.B. «Killer auf freiem Fuss» (00:08) oder Hook-Text"
                onChange={e => setForm(f => ({ ...f, g_beleg: e.target.value }))} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={saving || postCount >= 15}>
            {saving ? 'Wird gespeichert…' : 'Beitrag speichern und weiter'}
          </button>
        </form>

        {/* ── Duplikat-Panel ── */}
        <div>
          <div className="duplicate-panel">
            <div className="duplicate-panel-title">
              Bereits erfasste Beiträge dieses Pakets
            </div>

            {!selectedPaketId && (
              <p className="text-muted text-sm">Paket auswählen, um bestehende Beiträge zu sehen.</p>
            )}

            {selectedPaketId && existingPosts.length === 0 && (
              <p className="text-muted text-sm">Noch keine Beiträge in diesem Paket.</p>
            )}

            {/* Beiträge der anderen Plattform (Duplikat-Kandidaten) */}
            {otherPlatformPosts.length > 0 && (
              <>
                <p className="text-sm" style={{ marginBottom: 8, fontWeight: 500 }}>
                  {form.platform === 'instagram' ? 'TikTok' : 'Instagram'}-Beiträge (evtl. identisch):
                </p>
                {otherPlatformPosts.map(p => (
                  <div key={p.id} className="duplicate-item">
                    <div className="duplicate-item-meta">
                      {p.platform === 'instagram' ? 'Instagram' : 'TikTok'} · {p.format}
                    </div>
                    <div className="text-sm text-muted" style={{ marginBottom: 8 }}>
                      C4: {p.c4 ?? '—'} · D4: {p.d4 ?? '—'} · E4: {p.e4 ?? '—'}
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm w-full"
                      onClick={() => markAsIdentical(p.id)}
                    >
                      Identisch mit diesem Beitrag
                    </button>
                  </div>
                ))}
                <hr className="divider" />
              </>
            )}

            {/* Alle Beiträge dieses Pakets */}
            {existingPosts.length > 0 && (
              <>
                <p className="text-sm text-muted" style={{ marginBottom: 8 }}>
                  Alle Beiträge ({existingPosts.length}):
                </p>
                {existingPosts.map(p => (
                  <div key={p.id} className="duplicate-item">
                    <div className="duplicate-item-meta">
                      {p.platform === 'instagram' ? 'Instagram'
                        : p.platform === 'tiktok' ? 'TikTok' : 'Beide'} · {p.format}
                    </div>
                    <div className="text-sm text-muted">
                      {p.topic ?? '—'} · von {p.profiles?.name ?? '—'}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {selectedPaketId && (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <Link to="/pakete" className="text-sm text-muted">← Zurück zu Pakete</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
