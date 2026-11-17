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

const EXPORT_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

function wrapTextLines(ctx, text, maxW) {
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line + word + ' '
    if (ctx.measureText(test).width > maxW && line) { lines.push(line.trim()); line = word + ' ' }
    else line = test
  }
  if (line.trim()) lines.push(line.trim())
  return lines
}

function drawTextWrapped(ctx, text, x, y, maxW, lineH) {
  for (const l of wrapTextLines(ctx, text, maxW)) { ctx.fillText(l, x, y); y += lineH }
  return y
}

function buildExportCanvas(title, n, note, readingHelp, drawMain) {
  const PAD = 24
  const FONT = EXPORT_FONT
  const OUTPUT_DPR = 2

  // --- measure phase ---
  const tmp = document.createElement('canvas')
  const tmx = tmp.getContext('2d')
  const totalW = drawMain.width + PAD * 2
  const textW = totalW - PAD * 2

  function mH(text, fs, lh) {
    tmx.font = `${fs}px ${FONT}`
    return wrapTextLines(tmx, text, textW).length * lh
  }

  let totalH = PAD + 20  // title
  if (n !== undefined) totalH += 18
  if (note) { totalH += 8 + mH(note, 11, 15) + 8 }
  totalH += 14
  const mainTop = totalH
  totalH += drawMain.height
  if (readingHelp) { totalH += 12 + mH(readingHelp, 11, 15) }
  totalH += PAD

  // --- draw phase ---
  const cs = getComputedStyle(document.documentElement)
  const bgColor    = cs.getPropertyValue('--surface').trim()    || '#ffffff'
  const textColor  = cs.getPropertyValue('--text').trim()       || '#111111'
  const mutedColor = cs.getPropertyValue('--text-muted').trim() || '#888888'

  const c = document.createElement('canvas')
  c.width = Math.round(totalW * OUTPUT_DPR)
  c.height = Math.round(totalH * OUTPUT_DPR)
  const ctx = c.getContext('2d')
  ctx.scale(OUTPUT_DPR, OUTPUT_DPR)

  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, totalW, totalH)

  let y = PAD + 15
  ctx.font = `bold 15px ${FONT}`; ctx.fillStyle = textColor
  ctx.fillText(title, PAD, y); y += 22

  if (n !== undefined) {
    ctx.font = `12px ${FONT}`; ctx.fillStyle = mutedColor
    ctx.fillText(`n = ${n}`, PAD, y); y += 18
  }

  if (note) {
    y += 8
    ctx.font = `11px ${FONT}`; ctx.fillStyle = textColor
    y = drawTextWrapped(ctx, note, PAD, y, textW, 15)
    y += 8
  }

  y += 14
  drawMain.fn(ctx, PAD, y)
  y += drawMain.height

  if (readingHelp) {
    y += 12
    ctx.font = `italic 11px ${FONT}`; ctx.fillStyle = mutedColor
    drawTextWrapped(ctx, readingHelp, PAD, y, textW, 15)
  }

  return c
}

function triggerDownload(canvas, filename) {
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${filename}.png`; a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

// Hilfsfunktion für mehrere Kreisdiagramme nebeneinander
export function downloadPieGroup({ canvases, labels, title, n, readingHelp, filename }) {
  const valid = canvases.filter(Boolean)
  if (!valid.length) return

  const dpr = window.devicePixelRatio || 1
  const pieW = valid[0].width / dpr
  const pieH = valid[0].height / dpr
  const GAP = 20
  const LABEL_H = 20
  const perRow = Math.min(valid.length, 4)
  const rows = Math.ceil(valid.length / perRow)
  const innerW = perRow * pieW + (perRow - 1) * GAP
  const innerH = rows * (LABEL_H + pieH) + (rows - 1) * GAP

  const drawMain = {
    width: innerW,
    height: innerH,
    fn: (ctx, ox, oy) => {
      const pieLabelColor = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#111111'
      let y = oy
      for (let row = 0; row < rows; row++) {
        const start = row * perRow
        const count = Math.min(perRow, valid.length - start)
        const rowW = count * pieW + (count - 1) * GAP
        const rx = ox + (innerW - rowW) / 2
        for (let col = 0; col < count; col++) {
          const idx = start + col
          const x = rx + col * (pieW + GAP)
          ctx.font = `bold 12px ${EXPORT_FONT}`; ctx.fillStyle = pieLabelColor
          ctx.textAlign = 'center'
          ctx.fillText(labels[idx] ?? '', x + pieW / 2, y + 14)
          ctx.drawImage(valid[idx], 0, 0, valid[idx].width, valid[idx].height, x, y + LABEL_H, pieW, pieH)
        }
        y += LABEL_H + pieH + GAP
      }
      ctx.textAlign = 'left'
    },
  }

  triggerDownload(buildExportCanvas(title, n, null, readingHelp, drawMain), filename)
}

// Diagramm-Karte mit Titel, n, Download-Button, Lesehilfe
export function ChartCard({ title, n, chartRef, filename = 'diagramm', readingHelp, note, children, onDownload }) {
  function download() {
    if (onDownload) { onDownload(); return }
    const chartCanvas = chartRef?.current?.canvas
    if (!chartCanvas) return
    const dpr = window.devicePixelRatio || 1
    const cW = chartCanvas.width / dpr
    const cH = chartCanvas.height / dpr
    const drawMain = {
      width: cW, height: cH,
      fn: (ctx, x, y) => ctx.drawImage(chartCanvas, 0, 0, chartCanvas.width, chartCanvas.height, x, y, cW, cH),
    }
    triggerDownload(buildExportCanvas(title, n, note, readingHelp, drawMain), filename)
  }
  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {n !== undefined && <span className="text-muted" style={{ fontSize: '.8rem' }}>n = {n}</span>}
        </div>
        {(chartRef || onDownload) && (
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
