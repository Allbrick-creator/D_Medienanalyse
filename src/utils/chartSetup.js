import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, BarController,
  PointElement, LineElement, ScatterController,
  ArcElement, PieController,
  Title, Tooltip, Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale, LinearScale,
  BarElement, BarController,
  PointElement, LineElement, ScatterController,
  ArcElement, PieController,
  Title, Tooltip, Legend,
)

// Theme-Farben – wenn theme='light'/'dark' übergeben wird, hardcoded Werte (kein CSS-Timing-Problem).
// Ohne theme-Parameter: CSS-Variablen lesen (korrekt bei Klick-Zeitpunkt für Exporte).
export function getChartColors(theme) {
  if (theme === 'dark')  return { text: '#f9fafb', muted: '#9ca3af', grid: '#374151' }
  if (theme === 'light') return { text: '#1a1a1a', muted: '#6b7280', grid: '#e5e7eb' }
  const s = getComputedStyle(document.documentElement)
  return {
    text:    s.getPropertyValue('--text').trim()       || '#1a1a1a',
    muted:   s.getPropertyValue('--text-muted').trim() || '#6b7280',
    grid:    s.getPropertyValue('--border').trim()     || '#e5e7eb',
  }
}

// Basisoptionen für Balkendiagramme
export function barOptions({ yMax, yMin = 0, yLabel = '', title = '', stacked = false, tooltipFmt } = {}, theme) {
  const c = getChartColors(theme)
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { labels: { color: c.text, font: { size: 12 } } },
      title:  { display: !!title, text: title, color: c.text, font: { size: 13, weight: 'normal' } },
      tooltip: {
        callbacks: tooltipFmt ? { label: tooltipFmt } : {
          label: ctx => ` ${typeof ctx.parsed.y === 'number' ? ctx.parsed.y.toFixed(1) : ctx.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        stacked,
        ticks: { color: c.text, font: { size: 11 } },
        grid:  { color: c.grid },
      },
      y: {
        stacked,
        min:  yMin,
        ...(yMax !== undefined ? { max: yMax } : {}),
        ticks: { color: c.text, font: { size: 11 }, callback: yMax === 100 ? v => v + ' %' : undefined },
        grid:  { color: c.grid },
        title: { display: !!yLabel, text: yLabel, color: c.muted, font: { size: 11 } },
      },
    },
  }
}

// Basisoptionen für Kreisdiagramme
export function pieOptions(theme) {
  const c = getChartColors(theme)
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: c.text, font: { size: 10 }, boxWidth: 10, padding: 6 },
      },
      tooltip: {
        callbacks: { label: ctx => ` ${ctx.label}: ${typeof ctx.parsed === 'number' ? ctx.parsed.toFixed(1) : ctx.parsed} %` },
      },
    },
  }
}

// Basisoptionen für Streudiagramme
export function scatterOptions({ xLabel = '', yLabel = '' } = {}, theme) {
  const c = getChartColors(theme)
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { labels: { color: c.text, font: { size: 12 } } },
      tooltip: { callbacks: { label: ctx => ` E4=${ctx.parsed.x.toFixed(1)}, W=${ctx.parsed.y.toFixed(1)}` } },
    },
    scales: {
      x: {
        min: 0.5, max: 4.5,
        ticks: { color: c.text, stepSize: 1 },
        grid:  { color: c.grid },
        title: { display: !!xLabel, text: xLabel, color: c.muted, font: { size: 11 } },
      },
      y: {
        min: -0.5, max: 6.5,
        ticks: { color: c.text, stepSize: 1 },
        grid:  { color: c.grid },
        title: { display: !!yLabel, text: yLabel, color: c.muted, font: { size: 11 } },
      },
    },
  }
}
