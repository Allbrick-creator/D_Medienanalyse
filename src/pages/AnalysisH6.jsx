import { useState, useRef, useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { useTheme } from '../hooks/useTheme'
import {
  TYPES, TYPE_LABELS, TYPE_COLORS,
  mean, typeRange, byType, expandBoth,
} from '../utils/analysisUtils'
import { barOptions } from '../utils/chartSetup'
import '../utils/chartSetup'
import { ChartCard, InterpretationField, LowNWarning } from '../components/AnalysisComponents'

const PLT_COLORS = { instagram: '#c2185b', tiktok: '#00acc1' }
const CRITERIA = [
  { key: 'c4', label: 'C4 – Clickbait' },
  { key: 'd4', label: 'D4 – Sachlichkeit' },
  { key: 'e4', label: 'E4 – Emotionalisierung' },
]

function typeMeans(posts) {
  const groups = byType(posts)
  return Object.fromEntries(TYPES.map(t => [t, groups[t]]))
}

export default function AnalysisH6({ posts }) {
  const { theme } = useTheme()
  const ref1 = useRef(), ref2 = useRef(), ref3 = useRef(), ref4 = useRef()

  const { instaGrps, tikGrps, instaLow, tikLow } = useMemo(() => {
    const insta = expandBoth(posts).filter(p => p.platform === 'instagram')
    const tik   = expandBoth(posts).filter(p => p.platform === 'tiktok')
    const ig = typeMeans(insta), tg = typeMeans(tik)
    const instaLow = Object.fromEntries(TYPES.map(t => [`${TYPE_LABELS[t]} (Instagram)`, ig[t]]))
    const tikLow   = Object.fromEntries(TYPES.map(t => [`${TYPE_LABELS[t]} (TikTok)`, tg[t]]))
    return { instaGrps: ig, tikGrps: tg, instaLow, tikLow }
  }, [posts])

  const typeLabels = TYPES.map(t => TYPE_LABELS[t])
  const typeColors = TYPES.map(t => TYPE_COLORS[t])

  // Hilfsfunktion: Typ-Mittelwerte pro Kriterium
  function typeMeansFor(groups, key) {
    return TYPES.map(t => { const v = mean(groups[t].map(p => p[key])); return v !== null ? +v.toFixed(2) : null })
  }

  // Chart 1 + 2: Instagram – C4, D4, E4 pro Typ
  const c4I = typeMeansFor(instaGrps, 'c4'), c4T = typeMeansFor(tikGrps, 'c4')
  const d4I = typeMeansFor(instaGrps, 'd4'), d4T = typeMeansFor(tikGrps, 'd4')
  const e4I = typeMeansFor(instaGrps, 'e4'), e4T = typeMeansFor(tikGrps, 'e4')

  // Chart 3: Spannweite pro Kriterium und Plattform
  const spanData = CRITERIA.map(({ key }) => {
    const meansI = Object.fromEntries(TYPES.map(t => [t, mean(instaGrps[t].map(p => p[key]))]))
    const meansT = Object.fromEntries(TYPES.map(t => [t, mean(tikGrps[t].map(p => p[key]))]))
    return { instagram: typeRange(meansI), tiktok: typeRange(meansT) }
  })

  const opts14 = useMemo(() => ({ ...barOptions({ yMin: 1, yMax: 4, yLabel: 'Mittelwert (1–4)' }),
    plugins: { ...barOptions().plugins, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y?.toFixed(2)}` } } }
  }), [theme])
  const opts3 = useMemo(() => ({ ...barOptions({ yMin: 0, yMax: 3, yLabel: 'Spannweite' }),
    plugins: { ...barOptions().plugins, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y?.toFixed(2)}` } } }
  }), [theme])

  const nI = { ...Object.fromEntries(TYPES.map(t => [TYPE_LABELS[t], instaGrps[t]])) }
  const nT = { ...Object.fromEntries(TYPES.map(t => [TYPE_LABELS[t], tikGrps[t]])) }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 4 }}>H6 – Plattform: Angleichung</h2>
        <p className="text-muted" style={{ fontSize: '.9rem' }}>
          «Auf TikTok gleichen sich die Anbietertypen stärker an als auf Instagram.»
        </p>
      </div>

      <p className="text-muted" style={{ marginBottom: 8, fontSize: '.85rem' }}>
        Beiträge mit «beide» werden für beide Plattformen gezählt. n Instagram: {expandBoth(posts).filter(p => p.platform === 'instagram').length} · n TikTok: {expandBoth(posts).filter(p => p.platform === 'tiktok').length}
      </p>
      <LowNWarning groups={{ ...nI, ...nT }} threshold={10} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        <ChartCard title="Instagram: C4, D4, E4 pro Anbietertyp"
          chartRef={ref1} filename="h6_instagram">
          <Bar ref={ref1} data={{
            labels: typeLabels,
            datasets: [
              { label: 'C4 Clickbait',     data: c4I, backgroundColor: '#e74c3c' },
              { label: 'D4 Sachlichkeit',  data: d4I, backgroundColor: '#3498db' },
              { label: 'E4 Emotion',       data: e4I, backgroundColor: '#f39c12' },
            ],
          }} options={opts14} />
        </ChartCard>

        <ChartCard title="TikTok: C4, D4, E4 pro Anbietertyp"
          chartRef={ref2} filename="h6_tiktok">
          <Bar ref={ref2} data={{
            labels: typeLabels,
            datasets: [
              { label: 'C4 Clickbait',     data: c4T, backgroundColor: '#e74c3c' },
              { label: 'D4 Sachlichkeit',  data: d4T, backgroundColor: '#3498db' },
              { label: 'E4 Emotion',       data: e4T, backgroundColor: '#f39c12' },
            ],
          }} options={opts14} />
        </ChartCard>
      </div>

      <ChartCard title="Spannweite pro Kriterium: Instagram vs. TikTok"
        chartRef={ref3} filename="h6_spannweite"
        readingHelp="Die Spannweite ist der höchste Typ-Mittelwert minus dem tiefsten. Eine kleinere Spannweite auf TikTok bedeutet, dass die Typen ähnlicher bewertet wurden → spricht für H6.">
        <Bar ref={ref3} data={{
          labels: CRITERIA.map(c => c.label),
          datasets: [
            { label: 'Instagram', data: spanData.map(d => d.instagram !== null ? +d.instagram.toFixed(2) : null), backgroundColor: PLT_COLORS.instagram },
            { label: 'TikTok',    data: spanData.map(d => d.tiktok    !== null ? +d.tiktok.toFixed(2)    : null), backgroundColor: PLT_COLORS.tiktok },
          ],
        }} options={opts3} />
      </ChartCard>

      <InterpretationField hId="h6" />
    </div>
  )
}
