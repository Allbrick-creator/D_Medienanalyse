import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// Plattform-Filter-Buttons
export function PlatformFilter({ value, onChange }) {
  return (
    <div className="flex gap-8" style={{ marginBottom: 20 }}>
      {[['all','Alle'], ['instagram','Instagram'], ['tiktok','TikTok']].map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)}
          className={`btn btn-sm ${value === v ? 'btn-primary' : 'btn-secondary'}`}>
          {l}
        </button>
      ))}
    </div>
  )
}

// Diagramm-Karte mit Titel, n, Download-Button, Lesehilfe
export function ChartCard({ title, n, chartRef, filename = 'diagramm', readingHelp, note, children }) {
  function download() {
    const url = chartRef?.current?.toBase64Image?.('image/png', 1)
    if (!url) return
    const a = document.createElement('a')
    a.href = url; a.download = `${filename}.png`; a.click()
  }
  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {n !== undefined && <span className="text-muted" style={{ fontSize: '.8rem' }}>n = {n}</span>}
        </div>
        {chartRef && (
          <button className="btn btn-ghost btn-sm" onClick={download} title="Als PNG herunterladen"
            style={{ flexShrink: 0 }}>
            ↓ PNG
          </button>
        )}
      </div>
      {note && (
        <div className="alert" style={{ marginBottom: 12, padding: '6px 12px', fontSize: '.82rem',
          background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6 }}>
          {note}
        </div>
      )}
      {children}
      {readingHelp && (
        <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginTop: 10, fontStyle: 'italic',
          borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          {readingHelp}
        </p>
      )}
    </div>
  )
}

// Interpretationsfeld (lädt aus hypothesis_interpretations, editierbar für Admin/Bewerter)
export function InterpretationField({ hId }) {
  const { profile } = useAuth()
  const canEdit = profile?.role === 'admin' || profile?.role === 'bewerter'
  const [status, setStatus]   = useState('offen')
  const [text, setText]       = useState('')
  const [saved, setSaved]     = useState(false)
  const [loaded, setLoaded]   = useState(false)

  useEffect(() => {
    supabase.from('hypothesis_interpretations').select('*').eq('id', hId).single()
      .then(({ data }) => {
        if (data) { setStatus(data.status ?? 'offen'); setText(data.text ?? '') }
        setLoaded(true)
      })
  }, [hId])

  async function save() {
    await supabase.from('hypothesis_interpretations')
      .update({ status, text, updated_by: profile?.id, updated_at: new Date().toISOString() })
      .eq('id', hId)
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  if (!loaded) return null

  const STATUS_LABELS = {
    offen: 'Offen', bestaetigt: 'Bestätigt',
    teilweise: 'Teilweise bestätigt', widerlegt: 'Widerlegt',
  }
  const STATUS_COLOR = {
    offen: 'var(--text-muted)', bestaetigt: 'var(--success)',
    teilweise: 'var(--warning)',   widerlegt: 'var(--danger)',
  }

  return (
    <div className="card" style={{
      padding: 20, marginTop: 8,
      borderLeft: `4px solid ${STATUS_COLOR[status] ?? 'var(--border)'}`,
    }}>
      <h3 style={{ marginBottom: 12 }}>Interpretation</h3>
      {canEdit ? (
        <>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label">Status</label>
            <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([v, l]) =>
                <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label">Begründung</label>
            <textarea className="form-input" rows={4} value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Wie interpretierst du die Ergebnisse?"
              style={{ resize: 'vertical' }} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={save}>Speichern</button>
          {saved && <span className="text-muted" style={{ marginLeft: 10, fontSize: '.85rem' }}>✓ Gespeichert</span>}
        </>
      ) : (
        <>
          <div style={{ marginBottom: 8 }}>
            <span style={{ color: STATUS_COLOR[status], fontWeight: 600 }}>{STATUS_LABELS[status]}</span>
          </div>
          {text
            ? <p style={{ fontSize: '.9rem', whiteSpace: 'pre-wrap' }}>{text}</p>
            : <p className="text-muted" style={{ fontSize: '.85rem' }}>Noch keine Interpretation erfasst.</p>
          }
        </>
      )}
    </div>
  )
}

// Hinweis bei wenig Daten (n < 10) in einer Gruppe
export function LowNWarning({ groups, threshold = 10 }) {
  const low = Object.entries(groups).filter(([, arr]) => arr.length > 0 && arr.length < threshold)
  if (!low.length) return null
  return (
    <div style={{ marginBottom: 12, padding: '6px 12px', fontSize: '.82rem',
      background: 'rgba(251, 191, 36, 0.12)', border: '1px solid var(--warning)',
      borderRadius: 6, color: 'var(--warning)' }}>
      ⚠ Wenig Beiträge, Ergebnis unsicher: {low.map(([k, v]) => `${k} (n=${v.length})`).join(', ')}
    </div>
  )
}
