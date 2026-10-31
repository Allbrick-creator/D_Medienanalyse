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

export default function AnalysisH1({ posts }) {
  const { theme } = useTheme()
  const [platform, setPlatform] = useState('all')
  const ref1 = useRef(), ref2 = useRef(), ref3 = useRef()

  const filtered = useMemo(() => filterPlatform(posts, platform), [posts, platform])
  const groups   = useMemo(() => byType(filtered), [filtered])
  const provGrps = useMemo(() => byProvider(filtered), [filtered])

  const typeLabels = TYPES.map(t => TYPE_LABELS[t])
  const typeColors = TYPES.map(t => TYPE_COLORS[t])

  // Chart 1: Mittelwert C4 pro Typ
  const c4ByType = TYPES.map(t => {
    const v = mean(groups[t].map(p => p.c4))
    return v !== null ? +v.toFixed(2) : null
  })

  // Chart 2: Mittelwert C4 pro Anbieter (nach Typ eingefärbt)
  const c4ByProv  = PROVIDERS_ORDER.map(n => { const v = mean(provGrps[n].map(p => p.c4)); return v !== null ? +v.toFixed(2) : null })
  const provColors = PROVIDERS_ORDER.map(n => TYPE_COLORS[PROVIDER_TYPE_MAP[n]] ?? '#aaa')

  // Chart 3: Anteil C1/C2/C3 in % pro Typ (gruppierte Balken)
  const c1 = TYPES.map(t => { const v = pctTrue(groups[t].map(p => p.c1)); return v !== null ? +v.toFixed(1) : null })
  const c2 = TYPES.map(t => { const v = pctTrue(groups[t].map(p => p.c2)); return v !== null ? +v.toFixed(1) : null })
  const c3 = TYPES.map(t => { const v = pctTrue(groups[t].map(p => p.c3)); return v !== null ? +v.toFixed(1) : null })

  const opts1 = useMemo(() => ({ ...barOptions({ yMin: 1, yMax: 4, yLabel: 'Ø C4 (1–4)' }),
    plugins: { ...barOptions().plugins, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y?.toFixed(2)}` } } }
  }), [theme])

  const opts2 = useMemo(() => ({ ...barOptions({ yMin: 1, yMax: 4, yLabel: 'Ø C4 (1–4)' }),
    plugins: { ...barOptions().plugins, legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y?.toFixed(2)}` } } }
  }), [theme])

  const opts3 = useMemo(() => barOptions({ yMin: 0, yMax: 100, yLabel: 'Anteil Ja (%)' }), [theme])

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 4 }}>H1 – Clickbait</h2>
        <p className="text-muted" style={{ fontSize: '.9rem' }}>
          «Boulevardmedien setzen häufiger Clickbait ein als öffentlich-rechtliche Anbieter und Qualitätszeitungen.»
        </p>
      </div>

      <PlatformFilter value={platform} onChange={setPlatform} />
      <p className="text-muted" style={{ marginBottom: 20, fontSize: '.85rem' }}>n = {filtered.length} Beiträge</p>

      <ChartCard title="Ø Clickbait-Skala (C4) pro Anbietertyp"
        n={filtered.filter(p => p.c4 != null).length} chartRef={ref1} filename="h1_c4_typ"
        readingHelp="C4-Skala: 1 = sachlich-informativer Titel bis 4 = reisserisch, übertriebenes Versprechen. Je höher der Balken, desto mehr Clickbait.">
        <Bar ref={ref1} data={{
          labels: typeLabels,
          datasets: [{ label: 'Ø C4', data: c4ByType, backgroundColor: typeColors, borderWidth: 0 }],
        }} options={opts1} />
      </ChartCard>

      <ChartCard title="Ø Clickbait-Skala (C4) pro Anbieter"
        n={filtered.filter(p => p.c4 != null).length} chartRef={ref2} filename="h1_c4_anbieter"
        readingHelp="Gleiche Skala wie oben, aufgeteilt nach den 7 Anbietern. Farben entsprechen dem Anbietertyp.">
        <Bar ref={ref2} data={{
          labels: PROVIDERS_ORDER,
          datasets: [{ label: 'Ø C4', data: c4ByProv, backgroundColor: provColors, borderWidth: 0 }],
        }} options={opts2} />
      </ChartCard>

      <ChartCard title="Anteil Clickbait-Merkmale (C1–C3) pro Anbietertyp"
        n={filtered.length} chartRef={ref3} filename="h1_c1c2c3_typ"
        readingHelp="C1 = Neugierlücke, C2 = Superlative/Übertreibungen, C3 = Grossbuchstaben/Ausrufezeichen/Emojis. Je höher der Balken, desto häufiger wurde das Merkmal als vorhanden bewertet.">
        <Bar ref={ref3} data={{
          labels: typeLabels,
          datasets: [
            { label: 'C1 Neugierlücke',    data: c1, backgroundColor: '#e74c3c' },
            { label: 'C2 Superlative',      data: c2, backgroundColor: '#e67e22' },
            { label: 'C3 Symbole/Grossbst.', data: c3, backgroundColor: '#f39c12' },
          ],
        }} options={opts3} />
      </ChartCard>

      <InterpretationField hId="h1" />
    </div>
  )
}
