import { useState, useRef, useMemo } from 'react'
import { Pie } from 'react-chartjs-2'
import { useTheme } from '../hooks/useTheme'
import {
  TYPES, TYPE_LABELS, PROVIDERS_ORDER,
  HARD_NEWS, SOFT_NEWS, ALL_TOPICS, byType, byProvider, filterPlatform,
} from '../utils/analysisUtils'
import { pieOptions } from '../utils/chartSetup'
import '../utils/chartSetup'
import { PlatformFilter, ChartCard, InterpretationField, downloadPieGroup } from '../components/AnalysisComponents'

const TOPIC_COLORS = {
  'Politik':                        '#1d4ed8',
  'Wirtschaft':                     '#2563eb',
  'Gesellschaft':                   '#60a5fa',
  'Wissenschaft/Umwelt/Gesundheit': '#93c5fd',
  'Kriminalität/Unglück':           '#dc2626',
  'Unterhaltung/Promis':            '#ea580c',
  'Human Interest/Kurioses':        '#f97316',
  'Sport':                          '#fbbf24',
}

function topicPct(arr, topic) {
  if (!arr.length) return 0
  return +(arr.filter(p => p.topic === topic).length / arr.length * 100).toFixed(1)
}

export default function AnalysisH3({ posts }) {
  const { theme } = useTheme()
  const [platform, setPlatform] = useState('all')
  const [showProv, setShowProv] = useState(false)

  // Refs für Kreisdiagramme (3 Typen + 3 Typen + 7 Anbieter = 13)
  const tR1a = useRef(null), tR1b = useRef(null), tR1c = useRef(null)
  const tR2a = useRef(null), tR2b = useRef(null), tR2c = useRef(null)
  const pRa = useRef(null), pRb = useRef(null), pRc = useRef(null)
  const pRd = useRef(null), pRe = useRef(null), pRf = useRef(null), pRg = useRef(null)
  const typeRefs1 = [tR1a, tR1b, tR1c]
  const typeRefs2 = [tR2a, tR2b, tR2c]
  const provRefs  = [pRa, pRb, pRc, pRd, pRe, pRf, pRg]

  const filtered = useMemo(() => filterPlatform(posts, platform), [posts, platform])
  const groups   = useMemo(() => byType(filtered), [filtered])
  const provGrps = useMemo(() => byProvider(filtered), [filtered])

  const pOpts = useMemo(() => pieOptions(), [theme])

  const nTopics = filtered.filter(p => p.topic).length

  // Daten Hard vs. Soft pro Typ
  const hardPct = TYPES.map(t => {
    const arr = groups[t]; if (!arr.length) return 0
    return +(arr.filter(p => HARD_NEWS.includes(p.topic)).length / arr.length * 100).toFixed(1)
  })
  const softPct = TYPES.map(t => {
    const arr = groups[t]; if (!arr.length) return 0
    return +(arr.filter(p => SOFT_NEWS.includes(p.topic)).length / arr.length * 100).toFixed(1)
  })

  // Daten alle 8 Themen pro Typ
  const topicsByType = TYPES.map(t => ALL_TOPICS.map(topic => topicPct(groups[t], topic)))

  // Daten alle 8 Themen pro Anbieter
  const topicsByProv = PROVIDERS_ORDER.map(n => ALL_TOPICS.map(topic => topicPct(provGrps[n], topic)))

  const readingHelp1 = 'Blau = Hard News, Rot = Soft News. Je grösser der rote Anteil bei Boulevard, desto mehr spricht das für H3.'
  const readingHelp2 = 'Blautöne = Hard News, Orange/Rottöne = Soft News. Grosse warme Flächen bei Boulevard sprechen für H3.'
  const readingHelp3 = 'Gleiche Farblogik wie oben, aufgeteilt auf die 7 Anbieter.'

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 4 }}>H3 – Themenwahl</h2>
        <p className="text-muted" style={{ fontSize: '.9rem' }}>
          «Boulevardmedien bringen mehr Soft News, die anderen Anbietertypen mehr Hard News.»
        </p>
        <p className="text-muted" style={{ fontSize: '.82rem', marginTop: 4 }}>
          Hard News: Politik, Wirtschaft, Gesellschaft, Wissenschaft/Umwelt/Gesundheit · Soft News: Kriminalität/Unglück, Unterhaltung/Promis, Human Interest/Kurioses, Sport
        </p>
      </div>

      <PlatformFilter value={platform} onChange={setPlatform} />
      <p className="text-muted" style={{ marginBottom: 20, fontSize: '.85rem' }}>n = {filtered.length} Beiträge</p>

      {/* Chart 1: Hard vs. Soft pro Typ */}
      <ChartCard title="Hard News vs. Soft News pro Anbietertyp"
        n={nTopics}
        filename="h3_hardsoft_typ"
        readingHelp={readingHelp1}
        onDownload={() => downloadPieGroup({
          canvases: typeRefs1.map(r => r.current?.canvas),
          labels: TYPES.map(t => TYPE_LABELS[t]),
          title: 'Hard News vs. Soft News pro Anbietertyp',
          n: nTopics,
          readingHelp: readingHelp1,
          filename: 'h3_hardsoft_typ',
        })}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {TYPES.map((t, i) => (
            <div key={t} style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '.85rem' }}>{TYPE_LABELS[t]}</div>
              <Pie key={theme + '_' + t} ref={typeRefs1[i]} data={{
                labels: ['Hard News', 'Soft News'],
                datasets: [{ data: [hardPct[i], softPct[i]], backgroundColor: ['#2563eb', '#e74c3c'] }],
              }} options={pOpts} />
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Chart 2: alle 8 Themen pro Typ */}
      <ChartCard title="Alle 8 Themen pro Anbietertyp"
        n={nTopics}
        filename="h3_themen_typ"
        readingHelp={readingHelp2}
        onDownload={() => downloadPieGroup({
          canvases: typeRefs2.map(r => r.current?.canvas),
          labels: TYPES.map(t => TYPE_LABELS[t]),
          title: 'Alle 8 Themen pro Anbietertyp',
          n: nTopics,
          readingHelp: readingHelp2,
          filename: 'h3_themen_typ',
        })}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {TYPES.map((t, i) => (
            <div key={t} style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '.85rem' }}>{TYPE_LABELS[t]}</div>
              <Pie key={theme + '_' + t} ref={typeRefs2[i]} data={{
                labels: ALL_TOPICS,
                datasets: [{ data: topicsByType[i], backgroundColor: ALL_TOPICS.map(tp => TOPIC_COLORS[tp] ?? '#aaa') }],
              }} options={pOpts} />
            </div>
          ))}
        </div>
      </ChartCard>

      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowProv(v => !v)}>
          {showProv ? '▲ Anbieter ausblenden' : '▼ Auch pro Anbieter anzeigen (optional)'}
        </button>
      </div>

      {/* Chart 3 (optional): alle 8 Themen pro Anbieter */}
      {showProv && (
        <ChartCard title="Alle 8 Themen pro Anbieter"
          n={nTopics}
          filename="h3_themen_anbieter"
          readingHelp={readingHelp3}
          onDownload={() => downloadPieGroup({
            canvases: provRefs.map(r => r.current?.canvas),
            labels: PROVIDERS_ORDER,
            title: 'Alle 8 Themen pro Anbieter',
            n: nTopics,
            readingHelp: readingHelp3,
            filename: 'h3_themen_anbieter',
          })}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {PROVIDERS_ORDER.map((n, i) => (
              <div key={n} style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '.82rem' }}>{n}</div>
                <Pie key={theme + '_' + n} ref={provRefs[i]} data={{
                  labels: ALL_TOPICS,
                  datasets: [{ data: topicsByProv[i], backgroundColor: ALL_TOPICS.map(tp => TOPIC_COLORS[tp] ?? '#aaa') }],
                }} options={pOpts} />
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      <InterpretationField hId="h3" />
    </div>
  )
}
