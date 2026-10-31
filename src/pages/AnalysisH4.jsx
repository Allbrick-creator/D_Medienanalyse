import { useState, useRef, useMemo, Fragment } from 'react'
import { Bar, Scatter } from 'react-chartjs-2'
import { useTheme } from '../hooks/useTheme'
import {
  TYPES, TYPE_LABELS, TYPE_COLORS, mean, spearman, rhoLabel, byType, filterPlatform,
} from '../utils/analysisUtils'
import { barOptions, scatterOptions } from '../utils/chartSetup'
import '../utils/chartSetup'
import { PlatformFilter, ChartCard, InterpretationField } from '../components/AnalysisComponents'

function jitter() { return (Math.random() - 0.5) * 0.25 }

export default function AnalysisH4({ posts }) {
  const { theme } = useTheme()
  const [platform, setPlatform] = useState('all')
  const ref1 = useRef(), ref2 = useRef()

  const filtered = useMemo(() => filterPlatform(posts, platform), [posts, platform])
  const valid    = useMemo(() => filtered.filter(p => p.e4 != null && p.f_score != null), [filtered])
  const groups   = useMemo(() => byType(valid), [valid])

  // Spearman gesamt
  const rhoAll  = useMemo(() => spearman(valid.map(p => +p.e4), valid.map(p => +p.f_score)), [valid])

  // Spearman pro Typ
  const rhoByType = useMemo(() =>
    Object.fromEntries(TYPES.map(t => [t, spearman(groups[t].map(p => +p.e4), groups[t].map(p => +p.f_score))])),
  [groups])

  // Streudiagramm: je Typ ein Dataset mit Jitter
  const scatterDatasets = useMemo(() =>
    TYPES.map(t => ({
      label: TYPE_LABELS[t],
      data: groups[t].map(p => ({ x: +p.e4 + jitter(), y: +p.f_score + jitter() })),
      backgroundColor: TYPE_COLORS[t] + 'aa',
      pointRadius: 5,
    })),
  [groups])

  // Balken: Ø W-Fragen-Wert pro E4-Stufe (1–4)
  const e4Labels  = ['1', '2', '3', '4']
  const e4Means   = e4Labels.map(lv => {
    const sub = valid.filter(p => String(p.e4) === lv)
    return { v: mean(sub.map(p => +p.f_score)), n: sub.length }
  })

  const opts1 = useMemo(() => scatterOptions({ xLabel: 'E4 (Emotionalisierung 1–4)', yLabel: 'W-Fragen-Wert (0–6)' }), [theme])
  const opts2 = useMemo(() => ({ ...barOptions({ yMin: 0, yMax: 6, yLabel: 'Ø W-Fragen-Wert (0–6)' }),
    plugins: { ...barOptions().plugins, legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y?.toFixed(2)}` } } }
  }), [theme])

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 4 }}>H4 – Emotion vs. Information</h2>
        <p className="text-muted" style={{ fontSize: '.9rem' }}>
          «Je stärker ein Beitrag emotionalisiert, desto weniger Information enthält er.»
        </p>
      </div>

      <PlatformFilter value={platform} onChange={setPlatform} />
      <p className="text-muted" style={{ marginBottom: 12, fontSize: '.85rem' }}>
        n = {valid.length} Beiträge mit vollständigen E4- und W-Fragen-Werten
      </p>

      {/* Spearman-Ergebnisse */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <h3 style={{ marginBottom: 10 }}>Spearman-Rangkorrelation (E4 × W-Fragen-Wert)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', alignItems: 'center' }}>
          <strong>Gesamt:</strong>
          <span style={{ color: rhoAll !== null && rhoAll < 0 ? 'var(--success)' : 'var(--text)' }}>
            {rhoLabel(rhoAll)}
          </span>
          {TYPES.map(t => (
            <Fragment key={t}>
              <strong>{TYPE_LABELS[t]}:</strong>
              <span style={{ color: rhoByType[t] !== null && rhoByType[t] < 0 ? 'var(--success)' : 'var(--text)' }}>
                {rhoLabel(rhoByType[t])} (n={groups[t].length})
              </span>
            </Fragment>
          ))}
        </div>
        <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: 10 }}>
          rho zwischen −1 und +1. Negativ = mehr Emotion geht mit weniger Information einher (spricht für H4).
          Stärke: |rho| &lt; 0.1 kein · 0.1–0.3 schwach · 0.3–0.5 mittel · &gt; 0.5 stark.
          Korrelation zeigt einen Zusammenhang, keine Ursache.
        </p>
      </div>

      <ChartCard title="Streudiagramm: Emotionalisierung (E4) vs. W-Fragen-Wert"
        n={valid.length} chartRef={ref1} filename="h4_scatter"
        readingHelp="Jeder Punkt ist ein Beitrag. Wenn Punkte bei höherem E4 tendenziell tiefer liegen, spricht das für H4. Leichter Jitter verhindert Überlappung.">
        <Scatter ref={ref1} data={{ datasets: scatterDatasets }} options={opts1} />
      </ChartCard>

      <ChartCard title="Ø W-Fragen-Wert pro Emotionalisierungsstufe (E4)"
        chartRef={ref2} filename="h4_wfragen_e4stufe"
        readingHelp={`Fallende Balken von Stufe 1 → 4 sprechen für H4. n pro Stufe: 1=${e4Means[0].n}, 2=${e4Means[1].n}, 3=${e4Means[2].n}, 4=${e4Means[3].n}.`}>
        <Bar ref={ref2} data={{
          labels: e4Labels.map((l, i) => `Stufe ${l} (n=${e4Means[i].n})`),
          datasets: [{
            label: 'Ø W-Fragen-Wert',
            data: e4Means.map(e => e.v !== null ? +e.v.toFixed(2) : null),
            backgroundColor: ['#c0392b', '#e67e22', '#f39c12', '#f1c40f'],
            borderWidth: 0,
          }],
        }} options={opts2} />
      </ChartCard>

      <InterpretationField hId="h4" />
    </div>
  )
}
