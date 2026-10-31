import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AnalysisH1 from './AnalysisH1'
import AnalysisH2 from './AnalysisH2'
import AnalysisH3 from './AnalysisH3'
import AnalysisH4 from './AnalysisH4'
import AnalysisH5 from './AnalysisH5'
import AnalysisH6 from './AnalysisH6'

const SLIDES = [
  { id: 'h1', label: 'H1 – Clickbait',         Comp: AnalysisH1 },
  { id: 'h2', label: 'H2 – Sachlichkeit',       Comp: AnalysisH2 },
  { id: 'h3', label: 'H3 – Themenwahl',         Comp: AnalysisH3 },
  { id: 'h4', label: 'H4 – Emotion vs. Info',   Comp: AnalysisH4 },
  { id: 'h5', label: 'H5 – Plattform: TikTok',  Comp: AnalysisH5 },
  { id: 'h6', label: 'H6 – Angleichung',        Comp: AnalysisH6 },
]

export default function Presentation() {
  const [posts, setPosts]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [idx, setIdx]             = useState(0)

  useEffect(() => { loadPosts() }, [])

  async function loadPosts() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('posts')
      .select('*, packages!inner(id, day, providers!inner(id, name, type))')
    if (err) { setError(err.message); setLoading(false); return }
    setPosts(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (!fullscreen) return
    function onKey(e) {
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, SLIDES.length - 1))
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(i - 1, 0))
      if (e.key === 'Escape')     setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  // Prevent body scroll when fullscreen
  useEffect(() => {
    document.body.style.overflow = fullscreen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [fullscreen])

  function start(startIdx = 0) {
    setIdx(startIdx)
    setFullscreen(true)
  }

  const { Comp } = SLIDES[idx]

  if (fullscreen) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'var(--bg)', display: 'flex', flexDirection: 'column',
      }}>
        {/* Slide-Tabs */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '6px 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface)', flexShrink: 0, flexWrap: 'wrap', gap: 6,
        }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {SLIDES.map((s, i) => (
              <button key={s.id} onClick={() => setIdx(i)}
                className={`btn btn-sm ${i === idx ? 'btn-primary' : 'btn-secondary'}`}
                style={{ minWidth: 0 }}>
                {s.label}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setFullscreen(false)}
            title="Präsentation beenden (Escape)">
            ✕ Schliessen
          </button>
        </div>

        {/* Folie */}
        <div key={idx} style={{ flex: 1, overflow: 'auto', padding: '24px 32px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
          {loading ? <p className="text-muted">Daten werden geladen…</p>
            : error ? <p style={{ color: 'var(--danger)' }}>Fehler: {error}</p>
            : <Comp posts={posts} />}
        </div>

        {/* Navigation Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 24px', borderTop: '1px solid var(--border)',
          background: 'var(--surface)', flexShrink: 0,
        }}>
          <button className="btn btn-secondary" onClick={() => setIdx(i => Math.max(i - 1, 0))}
            disabled={idx === 0}>
            ← Zurück
          </button>
          <span className="text-muted" style={{ fontSize: '.85rem' }}>
            {idx + 1} / {SLIDES.length} &nbsp;·&nbsp; ← → navigieren &nbsp;·&nbsp; Esc schliessen
          </span>
          <button className="btn btn-secondary" onClick={() => setIdx(i => Math.min(i + 1, SLIDES.length - 1))}
            disabled={idx === SLIDES.length - 1}>
            Weiter →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Präsentation</h1>
      </div>

      <p className="text-muted" style={{ marginBottom: 24 }}>
        Zeige alle Hypothesen als Vollbild-Folien. Navigation mit den Pfeiltasten ← →, beenden mit Escape.
      </p>

      {loading && <p className="text-muted">Daten werden geladen…</p>}
      {error   && <p style={{ color: 'var(--danger)' }}>Fehler: {error}</p>}

      {!loading && !error && (
        <>
          <button className="btn btn-primary" style={{ marginBottom: 28 }}
            onClick={() => start(0)}>
            Präsentation starten →
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {SLIDES.map((s, i) => (
              <div key={s.id} className="card"
                style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => start(i)}>
                <span style={{ fontWeight: 600 }}>{s.label}</span>
                <span className="btn btn-ghost btn-sm" style={{ pointerEvents: 'none' }}>→</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
