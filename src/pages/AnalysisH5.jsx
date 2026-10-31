import { useState, useRef, useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { useTheme } from '../hooks/useTheme'
import {
  TYPES, TYPE_LABELS, TYPE_COLORS, PROVIDERS_ORDER, PROVIDER_TYPE_MAP,
  mean, byType, expandBoth,
} from '../utils/analysisUtils'
import { barOptions } from '../utils/chartSetup'
import '../utils/chartSetup'
import { ChartCard, InterpretationField } from '../components/AnalysisComponents'

const PLT_COLORS = { instagram: '#c2185b', tiktok: '#00acc1' }
const PLT_LABELS = { instagram: 'Instagram', tiktok: 'TikTok' }

function platformGroups(posts, exclusive) {
  const base = exclusive ? posts.filter(p => p.platform !== 'beide') : expandBoth(posts)
  return {
    instagram: base.filter(p => p.platform === 'instagram'),
    tiktok:    base.filter(p => p.platform === 'tiktok'),
  }
}

export default function AnalysisH5({ posts }) {
  const { theme } = useTheme()
  const [exclusive, setExclusive] = useState(false)
  const ref1 = useRef(), ref2 = useRef(), ref3 = useRef()

  const plts = useMemo(() => platformGroups(posts, exclusive), [posts, exclusive])

  // Chart 1: Ø C4 und E4, Instagram vs. TikTok gesamt
  const c4Gesamt = ['instagram', 'tiktok'].map(pl => { const v = mean(plts[pl].map(p => p.c4)); return v !== null ? +v.toFixed(2) : null })
  const e4Gesamt = ['instagram', 'tiktok'].map(pl => { const v = mean(plts[pl].map(p => p.e4)); return v !== null ? +v.toFixed(2) : null })

  // Chart 2: Ø C4 und E4 pro Typ, Instagram vs. TikTok
  const typeLabels = TYPES.map(t => TYPE_LABELS[t])
  const c4ByTypeInsta = TYPES.map(t => { const v = mean(byType(plts.instagram)[t].map(p => p.c4)); return v !== null ? +v.toFixed(2) : null })
  const c4ByTypeTikTok = TYPES.map(t => { const v = mean(byType(plts.tiktok)[t].map(p => p.c4)); return v !== null ? +v.toFixed(2) : null })
  const e4ByTypeInsta = TYPES.map(t => { const v = mean(byType(plts.instagram)[t].map(p => p.e4)); return v !== null ? +v.toFixed(2) : null })
  const e4ByTypeTikTok = TYPES.map(t => { const v = mean(byType(plts.tiktok)[t].map(p => p.e4)); return v !== null ? +v.toFixed(2) : null })

  // Chart 3: Anteil 'beide' pro Anbieter (immer original posts)
  const bothPct = PROVIDERS_ORDER.map(n => {
    const all = posts.filter(p => PROVIDER_TYPE_MAP[n] === (p.packages?.providers?.type) && p.packages?.providers?.name === n)
    if (!all.length) return null
    return +(all.filter(p => p.platform === 'beide').length / all.length * 100).toFixed(1)
  })
  const bothColors = PROVIDERS_ORDER.map(n => TYPE_COLORS[PROVIDER_TYPE_MAP[n]] ?? '#aaa')

  const opts14 = useMemo(() => ({ ...barOptions({ yMin: 1, yMax: 4, yLabel: 'Mittelwert (1–4)' }),
    plugins: { ...barOptions().plugins, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y?.toFixed(2)}` } } }
  }), [theme])
  const opts3 = useMemo(() => ({ ...barOptions({ yMin: 0, yMax: 100, yLabel: 'Anteil "beide" (%)' }),
    plugins: { ...barOptions().plugins, legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y?.toFixed(1)} %` } } }
  }), [theme])

  const nInsta = plts.instagram.length, nTikTok = plts.tiktok.length

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 4 }}>H5 – Plattform: TikTok zugespitzter</h2>
        <p className="text-muted" style={{ fontSize: '.9rem' }}>
          «Auf TikTok sind Beiträge stärker zugespitzt und emotionalisiert als auf Instagram.»
        </p>
      </div>

      <div className="flex gap-8" style={{ marginBottom: 20 }}>
        <button className={`btn btn-sm ${!exclusive ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setExclusive(false)}>
          Alle Beiträge (inkl. «beide»)
        </button>
        <button className={`btn btn-sm ${exclusive ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setExclusive(true)}>
          Nur exklusive Beiträge
        </button>
      </div>

      <p className="text-muted" style={{ marginBottom: 20, fontSize: '.85rem' }}>
        Instagram: n = {nInsta} · TikTok: n = {nTikTok}
        {!exclusive && ' · Beiträge mit «beide» zählen für beide Plattformen.'}
      </p>

      <ChartCard title="Ø Clickbait (C4) und Emotionalisierung (E4): Instagram vs. TikTok"
        chartRef={ref1} filename="h5_c4e4_gesamt"
        note={!exclusive ? 'Beiträge mit «beide» verkleinern den Unterschied, da sie für beide Plattformen identisch gezählt werden. Für einen klaren Vergleich → «Nur exklusive Beiträge».' : undefined}
        readingHelp="C4 = Clickbait-Skala, E4 = Emotionalisierungsskala (je 1–4). Spricht für H5, wenn TikTok bei beiden Werten höher liegt.">
        <Bar ref={ref1} data={{
          labels: ['C4 – Clickbait', 'E4 – Emotionalisierung'],
          datasets: [
            { label: 'Instagram', data: [c4Gesamt[0], e4Gesamt[0]], backgroundColor: PLT_COLORS.instagram },
            { label: 'TikTok',    data: [c4Gesamt[1], e4Gesamt[1]], backgroundColor: PLT_COLORS.tiktok },
          ],
        }} options={opts14} />
      </ChartCard>

      <ChartCard title="Ø C4 pro Anbietertyp: Instagram vs. TikTok"
        n={nInsta + nTikTok} chartRef={ref2} filename="h5_c4_typ"
        readingHelp="Vergleich pro Anbietertyp. Ein TikTok-Balken höher als Instagram-Balken spricht pro Typ für H5.">
        <Bar ref={ref2} data={{
          labels: typeLabels,
          datasets: [
            { label: 'Instagram C4', data: c4ByTypeInsta,  backgroundColor: PLT_COLORS.instagram },
            { label: 'TikTok C4',    data: c4ByTypeTikTok, backgroundColor: PLT_COLORS.tiktok },
            { label: 'Instagram E4', data: e4ByTypeInsta,  backgroundColor: PLT_COLORS.instagram + '88' },
            { label: 'TikTok E4',    data: e4ByTypeTikTok, backgroundColor: PLT_COLORS.tiktok    + '88' },
          ],
        }} options={opts14} />
      </ChartCard>

      <ChartCard title="Anteil Crossposting («beide») pro Anbieter"
        n={posts.length} chartRef={ref3} filename="h5_beide_anbieter"
        readingHelp="Wie viel Prozent der Beiträge wurden für beide Plattformen gleich erfasst? Ein hoher Anteil «beide» verkleinert den Plattformunterschied in den obigen Diagrammen.">
        <Bar ref={ref3} data={{
          labels: PROVIDERS_ORDER,
          datasets: [{ label: 'Anteil «beide» (%)', data: bothPct, backgroundColor: bothColors, borderWidth: 0 }],
        }} options={opts3} />
      </ChartCard>

      <InterpretationField hId="h5" />
    </div>
  )
}
