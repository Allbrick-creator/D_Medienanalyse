import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AnalysisH1 from './AnalysisH1'
import AnalysisH2 from './AnalysisH2'
import AnalysisH3 from './AnalysisH3'
import AnalysisH4 from './AnalysisH4'
import AnalysisH5 from './AnalysisH5'
import AnalysisH6 from './AnalysisH6'

const TABS = [
  { id: null,  label: 'Übersicht' },
  { id: 'h1',  label: 'H1 – Clickbait' },
  { id: 'h2',  label: 'H2 – Sachlichkeit' },
  { id: 'h3',  label: 'H3 – Themenwahl' },
  { id: 'h4',  label: 'H4 – Emotion vs. Information' },
  { id: 'h5',  label: 'H5 – Plattform: Zuspitzung' },
  { id: 'h6',  label: 'H6 – Plattform: Angleichung' },
]

const H_COMPONENTS = { h1: AnalysisH1, h2: AnalysisH2, h3: AnalysisH3, h4: AnalysisH4, h5: AnalysisH5, h6: AnalysisH6 }

const HYPOTHESES = [
  { id: 'h1', title: 'H1 – Clickbait', text: 'Boulevardmedien setzen häufiger Clickbait ein als öffentlich-rechtliche Anbieter und Qualitätszeitungen.' },
  { id: 'h2', title: 'H2 – Sachlichkeit', text: 'Öffentlich-rechtliche Anbieter berichten am sachlichsten.' },
  { id: 'h3', title: 'H3 – Themenwahl', text: 'Boulevardmedien bringen mehr Soft News, die anderen Anbietertypen mehr Hard News.' },
  { id: 'h4', title: 'H4 – Emotion vs. Information', text: 'Je stärker ein Beitrag emotionalisiert, desto weniger Information enthält er.' },
  { id: 'h5', title: 'H5 – Plattform: TikTok zugespitzter', text: 'Auf TikTok sind Beiträge stärker zugespitzt und emotionalisiert als auf Instagram.' },
  { id: 'h6', title: 'H6 – Plattform: Angleichung', text: 'Auf TikTok gleichen sich die Anbietertypen stärker an als auf Instagram.' },
]

export default function Analysis() {
  const [posts, setPosts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const location  = useLocation()
  const navigate  = useNavigate()

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

  const activeH = location.pathname.match(/\/auswertung\/(h[1-6])/)?.[1] ?? null
  const ActiveComp = activeH ? H_COMPONENTS[activeH] : null

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Auswertung</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {TABS.map(tab => (
          <button key={String(tab.id)} onClick={() => navigate(tab.id ? `/auswertung/${tab.id}` : '/auswertung')}
            className={`btn btn-sm ${activeH === tab.id ? 'btn-primary' : 'btn-secondary'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Hinweis-Box */}
      <div className="alert" style={{ marginBottom: 24, fontSize: '.85rem',
        background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px' }}>
        ℹ Die Ergebnisse zeigen Tendenzen einer Stichprobe und sind keine statistischen Beweise. Alle Auswertungen beziehen sich ausschliesslich auf die erfassten Beiträge.
      </div>

      {loading && <p className="text-muted">Daten werden geladen…</p>}
      {error   && <p style={{ color: 'var(--danger)' }}>Fehler: {error}</p>}

      {/* Übersicht */}
      {!loading && !error && !activeH && (
        <div>
          <p className="text-muted" style={{ marginBottom: 20 }}>
            {posts.length} Beiträge total erfasst. Wähle eine Hypothese zum Auswerten.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {HYPOTHESES.map(h => (
              <div key={h.id} className="card" style={{ padding: 20, cursor: 'pointer' }}
                onClick={() => navigate(`/auswertung/${h.id}`)}>
                <h3 style={{ marginBottom: 8 }}>{h.title}</h3>
                <p className="text-muted" style={{ fontSize: '.85rem', lineHeight: 1.5 }}>{h.text}</p>
                <div style={{ marginTop: 12 }}>
                  <span className="btn btn-primary btn-sm">Auswerten →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aktive H-Seite */}
      {!loading && !error && ActiveComp && (
        <ActiveComp posts={posts} />
      )}
    </div>
  )
}
