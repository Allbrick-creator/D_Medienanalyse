import { useState, useRef, useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { useTheme } from '../hooks/useTheme'
import {
  TYPES, TYPE_LABELS, TYPE_COLORS, PROVIDERS_ORDER, PROVIDER_TYPE_MAP,
  HARD_NEWS, SOFT_NEWS, ALL_TOPICS, byType, byProvider, filterPlatform,
} from '../utils/analysisUtils'
import { barOptions } from '../utils/chartSetup'
import '../utils/chartSetup'
import { PlatformFilter, ChartCard, InterpretationField } from '../components/AnalysisComponents'

// Farben für die 8 Themen: Hard = Blautöne, Soft = Orange/Rottöne
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
  if (!arr.length) return null
  return +(arr.filter(p => p.topic === topic).length / arr.length * 100).toFixed(1)
}

export default function AnalysisH3({ posts }) {
  const { theme } = useTheme()
  const [platform, setPlatform]   = useState('all')
  const [showProv, setShowProv]   = useState(false)
  const ref1 = useRef(), ref2 = useRef(), ref3 = useRef()

  const filtered = useMemo(() => filterPlatform(posts, platform), [posts, platform])
  const groups   = useMemo(() => byType(filtered), [filtered])
  const provGrps = useMemo(() => byProvider(filtered), [filtered])

  const typeLabels = TYPES.map(t => TYPE_LABELS[t])

  // Chart 1: Hard vs. Soft gestapelt 100 %
  const hardPct = TYPES.map(t => {
    const arr = groups[t]; if (!arr.length) return null
    return +(arr.filter(p => HARD_NEWS.includes(p.topic)).length / arr.length * 100).toFixed(1)
  })
  const softPct = TYPES.map(t => {
    const arr = groups[t]; if (!arr.length) return null
    return +(arr.filter(p => SOFT_NEWS.includes(p.topic)).length / arr.length * 100).toFixed(1)
  })

  // Chart 2: alle 8 Themen gestapelt 100 % pro Typ
  const topicDatasets = ALL_TOPICS.map(topic => ({
    label: topic,
    data: TYPES.map(t => topicPct(groups[t], topic)),
    backgroundColor: TOPIC_COLORS[topic] ?? '#aaa',
  }))

  // Chart 3 (optional): alle 8 Themen pro Anbieter
  const topicByProvDs = ALL_TOPICS.map(topic => ({
    label: topic,
    data: PROVIDERS_ORDER.map(n => topicPct(provGrps[n], topic)),
    backgroundColor: TOPIC_COLORS[topic] ?? '#aaa',
  }))
  const provColors = PROVIDERS_ORDER.map(n => TYPE_COLORS[PROVIDER_TYPE_MAP[n]] ?? '#aaa')

  const stackOpts = useMemo(() => barOptions({ yMin: 0, yMax: 100, yLabel: 'Anteil (%)', stacked: true }), [theme])

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

      <ChartCard title="Hard News vs. Soft News pro Anbietertyp"
        n={filtered.filter(p => p.topic).length} chartRef={ref1} filename="h3_hardsoft_typ"
        readingHelp="Jeder Balken zeigt 100 %. Blau = Hard News, Rot = Soft News. Spricht für H3, wenn bei Boulevard der rote Anteil klar höher liegt.">
        <Bar ref={ref1} data={{
          labels: typeLabels,
          datasets: [
            { label: 'Hard News', data: hardPct, backgroundColor: '#2563eb' },
            { label: 'Soft News', data: softPct, backgroundColor: '#e74c3c' },
          ],
        }} options={stackOpts} />
      </ChartCard>

      <ChartCard title="Alle 8 Themen pro Anbietertyp"
        n={filtered.filter(p => p.topic).length} chartRef={ref2} filename="h3_themen_typ"
        readingHelp="Blautöne = Hard News, Orange/Rottöne = Soft News. Je mehr warme Farben bei Boulevard, desto mehr Soft News.">
        <Bar ref={ref2} data={{
          labels: typeLabels,
          datasets: topicDatasets,
        }} options={stackOpts} />
      </ChartCard>

      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowProv(v => !v)}>
          {showProv ? '▲ Anbieter ausblenden' : '▼ Auch pro Anbieter anzeigen (optional)'}
        </button>
      </div>

      {showProv && (
        <ChartCard title="Alle 8 Themen pro Anbieter"
          n={filtered.filter(p => p.topic).length} chartRef={ref3} filename="h3_themen_anbieter"
          readingHelp="Gleiche Farblogik wie oben, aufgeteilt auf die 7 Anbieter.">
          <Bar ref={ref3} data={{
            labels: PROVIDERS_ORDER,
            datasets: topicByProvDs,
          }} options={stackOpts} />
        </ChartCard>
      )}

      <InterpretationField hId="h3" />
    </div>
  )
}
