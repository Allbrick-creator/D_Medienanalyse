// Berechnungsfunktionen für Phase 4 – Auswertung H1–H6

export const TYPES = ['boulevard', 'oeffentlich', 'qualitaet']

export const TYPE_LABELS = {
  boulevard:   'Boulevard',
  oeffentlich: 'Öffentlich-rechtlich',
  qualitaet:   'Qualitätszeitung',
}

export const TYPE_COLORS = {
  boulevard:   '#e74c3c',
  oeffentlich: '#3498db',
  qualitaet:   '#27ae60',
}

export const PROVIDER_TYPE_MAP = {
  'Bild':           'boulevard',
  '20 Minuten':     'boulevard',
  'Tagesschau':     'oeffentlich',
  'ZDF heute':      'oeffentlich',
  'SRF News':       'oeffentlich',
  'NZZ':            'qualitaet',
  'Tages-Anzeiger': 'qualitaet',
}

export const PROVIDERS_ORDER = ['Bild', '20 Minuten', 'Tagesschau', 'ZDF heute', 'SRF News', 'NZZ', 'Tages-Anzeiger']

export const HARD_NEWS = ['Politik', 'Wirtschaft', 'Gesellschaft', 'Wissenschaft/Umwelt/Gesundheit']
export const SOFT_NEWS = ['Kriminalität/Unglück', 'Unterhaltung/Promis', 'Human Interest/Kurioses', 'Sport']
export const ALL_TOPICS = [...HARD_NEWS, ...SOFT_NEWS]

export function postType(p)     { return p.packages?.providers?.type ?? null }
export function postProvider(p) { return p.packages?.providers?.name ?? null }

// Mittelwert, null wenn leer
export function mean(arr) {
  const nums = arr.filter(v => v !== null && v !== undefined && !isNaN(v)).map(Number)
  if (!nums.length) return null
  return nums.reduce((s, v) => s + v, 0) / nums.length
}

// Anteil true/ja in %, null wenn leer
export function pctTrue(arr) {
  const valid = arr.filter(v => v !== null && v !== undefined)
  if (!valid.length) return null
  return (valid.filter(v => v === true || v === 'ja').length / valid.length) * 100
}

// Spearman-Rangkorrelation mit Rangbindungen (Durchschnittsränge → Pearson auf Rängen)
export function spearman(xs, ys) {
  const pairs = xs.map((x, i) => [x, ys[i]])
    .filter(([x, y]) => x !== null && y !== null && !isNaN(x) && !isNaN(y))
  const n = pairs.length
  if (n < 3) return null

  const xArr = pairs.map(p => p[0])
  const yArr = pairs.map(p => p[1])

  function rankArr(vals) {
    const idx = vals.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
    const ranks = new Array(n)
    let i = 0
    while (i < n) {
      let j = i
      while (j < n - 1 && idx[j + 1].v === idx[j].v) j++
      const avg = (i + j) / 2 + 1
      for (let k = i; k <= j; k++) ranks[idx[k].i] = avg
      i = j + 1
    }
    return ranks
  }

  const rx = rankArr(xArr), ry = rankArr(yArr)
  const mx = rx.reduce((s, v) => s + v, 0) / n
  const my = ry.reduce((s, v) => s + v, 0) / n
  let num = 0, dx2 = 0, dy2 = 0
  for (let i = 0; i < n; i++) {
    const a = rx[i] - mx, b = ry[i] - my
    num += a * b; dx2 += a * a; dy2 += b * b
  }
  const denom = Math.sqrt(dx2 * dy2)
  return denom === 0 ? null : num / denom
}

// Spannweite: max − min der Werte im Objekt
export function typeRange(meansObj) {
  const vals = Object.values(meansObj).filter(v => v !== null && !isNaN(v))
  if (vals.length < 2) return null
  return Math.max(...vals) - Math.min(...vals)
}

// Beiträge mit platform='beide' duplizieren (einmal instagram, einmal tiktok)
export function expandBoth(posts) {
  const out = []
  for (const p of posts) {
    if (p.platform === 'beide') {
      out.push({ ...p, platform: 'instagram' })
      out.push({ ...p, platform: 'tiktok' })
    } else {
      out.push(p)
    }
  }
  return out
}

// Plattform-Filter (expandBoth für instagram/tiktok)
export function filterPlatform(posts, platform) {
  if (platform === 'all') return posts
  return expandBoth(posts).filter(p => p.platform === platform)
}

// Gruppierung nach Typ
export function byType(posts) {
  const r = { boulevard: [], oeffentlich: [], qualitaet: [] }
  for (const p of posts) { const t = postType(p); if (t && r[t]) r[t].push(p) }
  return r
}

// Gruppierung nach Anbieter (in kanonischer Reihenfolge)
export function byProvider(posts) {
  const r = {}
  for (const n of PROVIDERS_ORDER) r[n] = []
  for (const p of posts) { const n = postProvider(p); if (n && r[n] !== undefined) r[n].push(p) }
  return r
}

// rho in einfacher Sprache beschreiben
export function rhoLabel(rho) {
  if (rho === null) return 'Zu wenig Daten für eine Berechnung.'
  const abs = Math.abs(rho), dir = rho < 0 ? 'negativ' : 'positiv'
  const strength = abs < 0.1 ? 'kein' : abs < 0.3 ? 'schwacher' : abs < 0.5 ? 'mittlerer' : 'starker'
  return `rho = ${rho.toFixed(2)} → ${strength} ${dir}er Zusammenhang`
}

// ── Einfache Tests (in der Browser-Konsole: import { runTests } from '...') ──
export function runTests() {
  const ok = (label, got, exp, tol = 0.001) => {
    const pass = got === null ? exp === null : typeof exp === 'number' ? Math.abs(got - exp) < tol : got === exp
    console[pass ? 'log' : 'error'](`${pass ? '✓' : '✗'} ${label}`, pass ? '' : `→ got ${got}, expected ${exp}`)
  }
  ok('mean [1,2,3]', mean([1, 2, 3]), 2)
  ok('mean []', mean([]), null)
  ok('mean nulls', mean([1, null, 3]), 2)
  ok('pctTrue [t,f,t]', pctTrue([true, false, true]), 100 * 2 / 3, 0.1)
  ok('pctTrue []', pctTrue([]), null)
  ok('pctTrue ja/nein', pctTrue(['ja', 'nein']), 50)
  ok('spearman perfect neg', spearman([1,2,3,4,5],[5,4,3,2,1]), -1)
  ok('spearman perfect pos', spearman([1,2,3,4,5],[1,2,3,4,5]), 1)
  ok('spearman short', spearman([1,2],[2,1]), null)
  ok('typeRange', typeRange({a:2,b:4,c:3}), 2)
  const exp = expandBoth([{platform:'beide'},{platform:'instagram'}])
  ok('expandBoth n', exp.length, 3)
  ok('expandBoth insta', exp.filter(p=>p.platform==='instagram').length, 2)
  console.log('Tests abgeschlossen.')
}
