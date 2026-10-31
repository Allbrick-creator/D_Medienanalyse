import { useState, useRef, useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { useTheme } from '../hooks/useTheme'
import {
  TYPES, TYPE_LABELS, TYPE_COLORS, PROVIDERS_ORDER, PROVIDER_TYPE_MAP,
  mean, pctTrue, byType, byProvider, filterPlatform,
} from '../utils/analysisUtils'
import { barOptions } from '../utils/chartSetup'
import '../utils/chartSetup'
import { PlatformFilter, ChartCard, InterpretationField } from '../components/AnalysisComponents'

export default function AnalysisH2({ posts }) {
  const { theme } = useTheme()
  const [platform, setPlatform] = useState('all')
  const ref1 = useRef(), ref2 = useRef(), ref3 = useRef()

  const filtered = useMemo(() => filterPlatform(posts, platform), [posts, platform])
  const groups   = useMemo(() => byType(filtered), [filtered])
  const provGrps = useMemo(() => byProvider(filtered), [filtered])

  const typeLabels = TYPES.map(t => TYPE_LABELS[t])
  const typeColors = TYPES.map(t => TYPE_COLORS[t])

  // Chart 1: Mittelwert D4 pro Typ
  const d4ByType = TYPES.map(t => { const v = mean(groups[t].map(p => p.d4)); return v !== null ? +v.toFixed(2) : null })

  // Chart 2: Mittelwert D4 pro Anbieter
  const d4ByProv   = PROVIDERS_ORDER.map(n => { const v = mean(provGrps[n].map(p => p.d4)); return v !== null ? +v.toFixed(2) : null })
  const provColors = PROVIDERS_ORDER.map(n => TYPE_COLORS[PROVIDER_TYPE_MAP[n]] ?? '#aaa')

  // Chart 3: D1 (Quelle), D2 (wertend), D3 (Gegenseite) pro Typ
  const d1 = TYPES.map(t => { const v = pctTrue(groups[t].map(p => p.d1)); return v !== null ? +v.toFixed(1) : null })
  const d2 = TYPES.map(t => { const v = pctTrue(groups[t].map(p => p.d2)); return v !== null ? +v.toFixed(1) : null })
  // D3: nur ja/nein, nicht_relevant ausschliessen
  const d3 = TYPES.map(t => {
    const valid = groups[t].map(p => p.d3).filter(v => v === 'ja' || v === 'nein')
    if (!valid.length) return null
    return +(valid.filter(v => v === 'ja').length / valid.length * 100).toFixed(1)
  })
  const d3n = TYPES.map(t => groups[t].filter(p => p.d3 === 'nicht_relevant').length)

  const opts14 = useMemo(() => ({ ...barOptions({ yMin: 1, yMax: 4, yLabel: 'Ø D4 (1 = einseitig, 4 = neutral)' }),
    plugins: { ...barOptions().plugins, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y?.toFixed(2)}` } } }
  }), [theme])

  const opts2 = useMemo(() => ({ ...barOptions({ yMin: 1, yMax: 4, yLabel: 'Ø D4' }),
    plugins: { ...barOptions().plugins, legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y?.toFixed(2)}` } } }
  }), [theme])

  const opts3 = useMemo(() => barOptions({ yMin: 0, yMax: 100, yLabel: 'Anteil Ja (%)' }), [theme])

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 4 }}>H2 – Sachlichkeit</h2>
        <p className="text-muted" style={{ fontSize: '.9rem' }}>
          «Öffentlich-rechtliche Anbieter berichten am sachlichsten.»
        </p>
      </div>

      <PlatformFilter value={platform} onChange={setPlatform} />
      <p className="text-muted" style={{ marginBottom: 20, fontSize: '.85rem' }}>n = {filtered.length} Beiträge</p>

      <ChartCard title="Ø Objektivitätsskala (D4) pro Anbietertyp"
        n={filtered.filter(p => p.d4 != null).length} chartRef={ref1} filename="h2_d4_typ"
        readingHelp="D4-Skala: 1 = einseitig und wertend bis 4 = neutral, ausgewogen, belegt. Höhere Werte sprechen für H2.">
        <Bar ref={ref1} data={{
          labels: typeLabels,
          datasets: [{ label: 'Ø D4', data: d4ByType, backgroundColor: typeColors, borderWidth: 0 }],
        }} options={opts14} />
      </ChartCard>

      <ChartCard title="Ø Objektivitätsskala (D4) pro Anbieter"
        n={filtered.filter(p => p.d4 != null).length} chartRef={ref2} filename="h2_d4_anbieter"
        readingHelp="Gleiche Skala, aufgeteilt auf die 7 Anbieter.">
        <Bar ref={ref2} data={{
          labels: PROVIDERS_ORDER,
          datasets: [{ label: 'Ø D4', data: d4ByProv, backgroundColor: provColors, borderWidth: 0 }],
        }} options={opts2} />
      </ChartCard>

      <ChartCard title="Sachlichkeitsmerkmale (D1–D3) pro Anbietertyp"
        n={filtered.length} chartRef={ref3} filename="h2_d1d2d3_typ"
        note={`D2 (wertende Formulierungen): Ein niedriger Wert ist hier sachlicher. – D3 «nicht relevant» ausgeschlossen: Boulevard ${d3n[0]}, Öffentlich-rechtlich ${d3n[1]}, Qualität ${d3n[2]} Beiträge.`}
        readingHelp="D1 = Quelle genannt (höher = sachlicher). D2 = wertende Formulierungen (niedriger = sachlicher!). D3 = Gegenseite zu Wort kommen lassen (höher = sachlicher).">
        <Bar ref={ref3} data={{
          labels: typeLabels,
          datasets: [
            { label: 'D1 Quelle genannt',        data: d1, backgroundColor: '#27ae60' },
            { label: 'D2 Wertende Formulierungen (↓ besser)', data: d2, backgroundColor: '#e74c3c' },
            { label: 'D3 Gegenseite (nur ja/nein)', data: d3, backgroundColor: '#3498db' },
          ],
        }} options={opts3} />
      </ChartCard>

      <InterpretationField hId="h2" />
    </div>
  )
}
