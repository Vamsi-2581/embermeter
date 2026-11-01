// Renders the README art in docs/art/: hero plate, section plates, instrument cluster, spec sheet, sign-off.
// Usage: node scripts/render-art.ts [outdir]   (Node 22.18+ or 23.6+)
// Colours come from PALETTES in hooks/draw.ts, so the art and the pane stay one system.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = new URL('..', import.meta.url).pathname
const out = process.argv[2] ?? join(root, 'docs', 'art')
mkdirSync(out, { recursive: true })

const tmp = mkdtempSync(join(tmpdir(), 'embermeter-art-'))
for (const f of ['core.ts', 'draw.ts']) {
  writeFileSync(join(tmp, f), readFileSync(join(root, 'hooks', f), 'utf8').replace(/from '\.\/core'/g, "from './core.ts'"))
}
const { PALETTES } = await import(pathToFileURL(join(tmp, 'draw.ts')).href)
rmSync(tmp, { recursive: true, force: true })

const P = PALETTES.night
const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', serif"
const SANS = "Inter, ui-sans-serif, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'DejaVu Sans Mono', monospace"
const EASE = 'calcMode="spline" keyTimes="0;1" keySplines="0.22 1 0.36 1"'
const W = 880

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const n = (v: number) => Math.round(v * 100) / 100

type T = { size?: number; color?: string; font?: string; weight?: number; anchor?: 'start' | 'middle' | 'end'; italic?: boolean; ls?: number; attrs?: string; inner?: string }
const t = (x: number, y: number, s: string, o: T = {}) =>
  `<text x="${n(x)}" y="${n(y)}" font-family="${o.font ?? SANS}" font-size="${o.size ?? 12}" fill="${o.color ?? P.sub}"` +
  (o.weight ? ` font-weight="${o.weight}"` : '') +
  (o.anchor && o.anchor !== 'start' ? ` text-anchor="${o.anchor}"` : '') +
  (o.italic ? ' font-style="italic"' : '') +
  (o.ls ? ` letter-spacing="${o.ls}"` : '') +
  (o.attrs ?? '') +
  `>${esc(s)}${o.inner ?? ''}</text>`

const pt = (cx: number, cy: number, r: number, deg: number): [number, number] => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)]
const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const [x0, y0] = pt(cx, cy, r, a0)
  const [x1, y1] = pt(cx, cy, r, a1)
  return `M ${n(x0)} ${n(y0)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${n(x1)} ${n(y1)}`
}
const deg = (f: number) => 150 + 240 * f

// An engraved plate: ground, double rule and amber corner studs.
const plate = (w: number, h: number, body: string, label: string, id: string) => {
  const studs = [
    [8, 8],
    [w - 8, 8],
    [8, h - 8],
    [w - 8, h - 8],
  ]
    .map(([x, y]) => `<rect x="${x! - 2.5}" y="${y! - 2.5}" width="5" height="5" fill="${P.amber}" opacity="0.7" transform="rotate(45 ${x} ${y})"/>`)
    .join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">` +
    `<defs><clipPath id="${id}-clip"><rect width="${w}" height="${h}" rx="16"/></clipPath>` +
    `<radialGradient id="${id}-ember"><stop offset="0" stop-color="${P.amber}" stop-opacity="0.5"/><stop offset="1" stop-color="${P.amber}" stop-opacity="0"/></radialGradient></defs>` +
    `<g clip-path="url(#${id}-clip)"><rect width="${w}" height="${h}" fill="${P.ground}"/></g>` +
    `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="15.5" fill="none" stroke="${P.line}"/>` +
    `<rect x="5.5" y="5.5" width="${w - 11}" height="${h - 11}" rx="11" fill="none" stroke="${P.grid}"/>` +
    studs +
    body +
    `</svg>`
  )
}

// ---------------------------------------------------------------- hero

const hero = () => {
  const cx = 178
  const cy = 196
  const r = 92
  const f = 0.62
  let g = `<circle cx="${cx}" cy="${cy}" r="78" fill="url(#hero-ember)"><animate attributeName="opacity" values="0.55;1;0.55" dur="3.4s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/></circle>`
  for (let i = 0; i <= 20; i++) {
    const a = deg(i / 20)
    const major = i % 2 === 0
    const [x0, y0] = pt(cx, cy, r + 12, a)
    const [x1, y1] = pt(cx, cy, r + (major ? 21 : 16), a)
    g += `<line x1="${n(x0)}" y1="${n(y0)}" x2="${n(x1)}" y2="${n(y1)}" stroke="${major ? P.sub : P.faint}" stroke-width="${major ? 1.4 : 1}" stroke-linecap="round"/>`
    if (i % 4 === 0) {
      const [lx, ly] = pt(cx, cy, r + 33, a)
      g += t(lx, ly + 3.5, String(i * 5), { font: MONO, size: 9, color: P.faint, anchor: 'middle' })
    }
  }
  g += `<path d="${arc(cx, cy, r + 15, deg(0.85), deg(1))}" fill="none" stroke="${P.rust}" stroke-width="3" stroke-linecap="round"/>`
  const L = n((r * 240 * Math.PI) / 180)
  const F = n(L * f)
  g += `<path d="${arc(cx, cy, r, 150, 390)}" fill="none" stroke="${P.line}" stroke-width="10" stroke-linecap="round"/>`
  g += `<path d="${arc(cx, cy, r, 150, 390)}" fill="none" stroke="${P.amber}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${F} ${L}"><animate attributeName="stroke-dasharray" from="0 ${L}" to="${F} ${L}" dur="1.8s" ${EASE} fill="freeze"/></path>`
  const end = deg(f)
  g +=
    `<g transform="rotate(${n(end)} ${cx} ${cy})"><animateTransform attributeName="transform" type="rotate" values="150 ${cx} ${cy};${n(end + 9)} ${cx} ${cy};${n(end - 4)} ${cx} ${cy};${n(end + 1.5)} ${cx} ${cy};${n(end)} ${cx} ${cy}" keyTimes="0;0.55;0.75;0.9;1" dur="2.2s" fill="freeze"/>` +
    `<g><animateTransform attributeName="transform" type="rotate" values="0 ${cx} ${cy};1.6 ${cx} ${cy};-1.1 ${cx} ${cy};0 ${cx} ${cy}" dur="4.6s" begin="2.2s" repeatCount="indefinite"/>` +
    `<line x1="${cx - 14}" y1="${cy}" x2="${cx + 74}" y2="${cy}" stroke="${P.ink}" stroke-width="2.6" stroke-linecap="round"/></g></g>`
  g += `<circle cx="${cx}" cy="${cy}" r="8" fill="${P.amber}"/><circle cx="${cx}" cy="${cy}" r="3" fill="${P.ground}"/>`
  g += t(cx, cy + 56, '62%', { font: MONO, size: 22, weight: 600, color: P.ink, anchor: 'middle' })
  g += t(cx, cy + 74, 'CONTEXT', { size: 9.5, color: P.faint, anchor: 'middle', ls: 2 })

  // Masthead.
  g += t(30, 33, 'MODEL EM-1', { font: MONO, size: 10, color: P.faint, ls: 3 })
  g += t(W / 2, 34, 'Operator’s Manual', { font: SERIF, size: 13, italic: true, color: P.sub, anchor: 'middle' })
  g += t(W - 30, 33, 'No. 0001 · MIT', { font: MONO, size: 10, color: P.faint, anchor: 'end', ls: 1 })
  g += `<line x1="22" y1="46" x2="${W - 22}" y2="46" stroke="${P.line}"/><line x1="22" y1="50" x2="${W - 22}" y2="50" stroke="${P.grid}"/>`

  // Wordmark.
  g += t(342, 146, 'Embermeter', { font: SERIF, size: 68, color: P.ink, ls: -1 })
  g += t(345, 180, 'a live instrument panel for Claude Code', { font: SERIF, size: 18, italic: true, color: P.sub })

  // Readouts: each cycles through a few plausible values, discretely, like a display.
  const readout = (x: number, cap: string, values: string[], live: boolean) => {
    let s = `<rect x="${x}" y="206" width="154" height="56" rx="9" fill="${P.panel}" stroke="${P.line}"/>`
    s += t(x + 14, 226, cap, { font: MONO, size: 9, color: P.faint, ls: 2 })
    if (live) s += `<circle cx="${x + 140}" cy="222" r="3" fill="${P.amber}"><animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite"/></circle>`
    const k = values.length
    values.forEach((v, i) => {
      if (k === 1) {
        s += t(x + 14, 251, v, { font: MONO, size: 20, weight: 600, color: P.ink })
        return
      }
      const vals = values.map((_, j) => (j === i ? 1 : 0)).join(';') + `;${i === 0 ? 1 : 0}`
      const times = values.map((_, j) => n(j / k)).join(';') + ';1'
      s += t(x + 14, 251, v, {
        font: MONO,
        size: 20,
        weight: 600,
        color: P.ink,
        attrs: ` opacity="${i === 0 ? 1 : 0}"`,
        inner: `<animate attributeName="opacity" values="${vals}" keyTimes="${times}" calcMode="discrete" dur="${k * 1.7}s" repeatCount="indefinite"/>`,
      })
    })
    return s
  }
  g += readout(342, 'RUNWAY', ['9 turns', '8 turns'], true)
  g += readout(506, 'CACHE HIT', ['89%', '90%', '89%', '91%'], true)
  g += readout(670, 'CPU', ['68°', '69°', '67°', '68°'], true)

  // Ticker tape.
  const items = [
    'turn 14 · 2.1k out · 38s',
    'Bash npm test ✓ 18.4s',
    'Edit src/lib/http.ts',
    'Explore agent done · 23 tools',
    'context +4% · runway 9 turns',
    'cache 89%',
    'cpu 68° · guard armed',
    'cost $2.41 · $3.08/h',
    'Grep useSession ✓ 340ms',
    'rate limit 5h · 46%',
  ]
  const sep = ' ◆ '
  const chars = items.join(sep).length + sep.length
  const Lt = n(chars * 6.6)
  const tape = items.map(s => `<tspan fill="${P.sub}">${esc(s)}</tspan><tspan fill="${P.amber}">${sep}</tspan>`).join('')
  g += `<defs><clipPath id="tape"><rect x="22" y="290" width="${W - 44}" height="32" rx="7"/></clipPath></defs>`
  g += `<rect x="22" y="290" width="${W - 44}" height="32" rx="7" fill="${P.panel}" stroke="${P.line}"/>`
  g +=
    `<g clip-path="url(#tape)"><g><animateTransform attributeName="transform" type="translate" from="0 0" to="-${Lt} 0" dur="${n(Lt / 38)}s" repeatCount="indefinite"/>` +
    `<text x="34" y="310" font-family="${MONO}" font-size="11" textLength="${n(Lt * 2)}" lengthAdjust="spacing" xml:space="preserve">${tape}${tape}</text></g></g>`
  g += `<rect x="22" y="290" width="28" height="32" rx="7" fill="${P.panel}" opacity="0.85"/><rect x="${W - 50}" y="290" width="28" height="32" rx="7" fill="${P.panel}" opacity="0.85"/>`
  return plate(W, 348, g, 'Embermeter, model EM-1: a live instrument panel for Claude Code', 'hero')
}

// ---------------------------------------------------------------- section plates

const SECTIONS = [
  ['install', 'I', 'Installation', 'fig. 1 · one command'],
  ['instruments', 'II', 'The Instruments', 'fig. 2 · twelve gauges'],
  ['tour', 'III', 'A Tour of the Panel', 'fig. 3 · seven tabs'],
  ['controls', 'IV', 'Controls', 'fig. 4 · commands & settings'],
  ['workings', 'V', 'Inner Workings', 'fig. 5 · architecture'],
  ['safety', 'VI', 'Safety Notice', 'fig. 6 · privacy & security'],
  ['notes', 'VII', 'Field Notes', 'fig. 7 · questions'],
  ['bench', 'VIII', 'The Workbench', 'fig. 8 · contributing'],
] as const

// The little dial's needle advances section by section, so the README reads like a gauge filling up.
const section = (i: number) => {
  const [, num, title, cap] = SECTIONS[i]!
  const f = (i + 1) / SECTIONS.length
  const cx = 48
  const cy = 40
  const r = 19
  const L = n((r * 240 * Math.PI) / 180)
  let g = `<path d="${arc(cx, cy, r, 150, 390)}" fill="none" stroke="${P.line}" stroke-width="4" stroke-linecap="round"/>`
  g += `<path d="${arc(cx, cy, r, 150, 390)}" fill="none" stroke="${P.amber}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${n(L * f)} ${L}"><animate attributeName="stroke-dasharray" from="0 ${L}" to="${n(L * f)} ${L}" dur="1.4s" ${EASE} fill="freeze"/></path>`
  const end = deg(f)
  g += `<g transform="rotate(${n(end)} ${cx} ${cy})"><animateTransform attributeName="transform" type="rotate" from="150 ${cx} ${cy}" to="${n(end)} ${cx} ${cy}" dur="1.4s" ${EASE} fill="freeze"/><line x1="${cx}" y1="${cy}" x2="${cx + 14}" y2="${cy}" stroke="${P.ink}" stroke-width="1.8" stroke-linecap="round"/></g>`
  g += `<circle cx="${cx}" cy="${cy}" r="3.2" fill="${P.amber}"/>`
  g += t(88, 31, num, { font: SERIF, size: 12, color: P.amber, ls: 3 })
  g += t(88, 57, title, { font: SERIF, size: 26, color: P.ink })
  const titleEnd = 88 + title.length * 13.4
  const capW = cap.length * 6.1
  g += `<line x1="${n(titleEnd + 18)}" y1="53" x2="${n(W - 30 - capW - 14)}" y2="53" stroke="${P.faint}" stroke-width="1.2" stroke-dasharray="1 5" stroke-linecap="round"/>`
  g += t(W - 30, 57, cap, { font: MONO, size: 10, color: P.faint, anchor: 'end' })
  return plate(W, 78, g, `${num}. ${title}`, `s${i}`)
}

// ---------------------------------------------------------------- instrument cluster

type Tile = { title: string; lines: [string, string]; glyph: () => string }
const bar = (x: number, y: number, w: number, h: number, c: string, o = 1) => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${h}" rx="${Math.min(2, h / 2)}" fill="${c}" opacity="${o}"/>`

const TILES: Tile[] = [
  {
    title: 'Runway to compact',
    lines: ['Turns left before auto-', 'compact, learned per turn.'],
    glyph: () =>
      `<path d="M 30 62 L 62 18 M 120 62 L 88 18" stroke="${P.sub}" stroke-width="1.4"/>` +
      `<line x1="75" y1="62" x2="75" y2="18" stroke="${P.amber}" stroke-width="2" stroke-dasharray="6 6"><animate attributeName="stroke-dashoffset" from="0" to="12" dur="0.8s" repeatCount="indefinite"/></line>` +
      t(148, 50, '9', { font: MONO, size: 30, weight: 600, color: P.amber }) +
      t(170, 50, 'turns', { size: 10, color: P.faint }),
  },
  {
    title: 'Context composition',
    lines: ['What fills the window, with', 'the compaction line marked.'],
    glyph: () => {
      const segs: [number, string][] = [
        [0.39, P.amber],
        [0.09, P.steel],
        [0.05, P.sage],
        [0.03, P.sand],
        [0.02, P.rose],
      ]
      let x = 16
      let s = bar(16, 34, 168, 14, P.line)
      segs.forEach(([w, c], i) => {
        s += `<rect x="${n(x)}" y="34" width="${n(w * 168)}" height="14" fill="${c}"><animate attributeName="width" from="0" to="${n(w * 168)}" dur="0.6s" begin="${i * 0.15}s" ${EASE} fill="freeze"/></rect>`
        x += w * 168
      })
      return s + `<line x1="${n(16 + 0.83 * 168)}" y1="26" x2="${n(16 + 0.83 * 168)}" y2="56" stroke="${P.rust}" stroke-width="2"/>` + t(n(16 + 0.83 * 168), 22, 'compact', { size: 8.5, color: P.rust, anchor: 'middle' })
    },
  },
  {
    title: 'Health grade',
    lines: ['One A–F score, with the', 'reasons spelled out.'],
    glyph: () =>
      `<rect x="16" y="16" width="44" height="44" rx="10" fill="none" stroke="${P.sage}" stroke-width="1.6"/>` +
      t(38, 47, 'A', { font: MONO, size: 24, weight: 700, color: P.sage, anchor: 'middle' }) +
      t(74, 34, '96 / 100', { font: MONO, size: 11, color: P.ink }) +
      t(74, 50, 'all clear', { size: 10, color: P.faint }),
  },
  {
    title: 'Cache analytics',
    lines: ['Hit rate, cache reads and', 'writes, tokens per second.'],
    glyph: () => {
      const C = n(2 * Math.PI * 20)
      return (
        `<circle cx="40" cy="39" r="20" fill="none" stroke="${P.line}" stroke-width="6"/>` +
        `<circle cx="40" cy="39" r="20" fill="none" stroke="${P.sage}" stroke-width="6" stroke-dasharray="${n(C * 0.89)} ${C}" transform="rotate(-90 40 39)"><animate attributeName="stroke-dasharray" from="0 ${C}" to="${n(C * 0.89)} ${C}" dur="1.2s" ${EASE} fill="freeze"/></circle>` +
        t(76, 36, '89% hit', { font: MONO, size: 12, color: P.ink }) +
        t(76, 52, '62 tok/s', { font: MONO, size: 10, color: P.faint })
      )
    },
  },
  {
    title: 'Cost burn',
    lines: ['Per hour, per turn, and a', 'budget with a red line.'],
    glyph: () =>
      `<line x1="16" y1="22" x2="184" y2="22" stroke="${P.rust}" stroke-width="1.4" stroke-dasharray="4 4"/>` +
      t(184, 17, 'budget', { size: 8.5, color: P.rust, anchor: 'end' }) +
      `<polyline points="16,58 40,54 64,50 88,47 112,40 136,37 160,31 184,28" fill="none" stroke="${P.amber}" stroke-width="2" stroke-linejoin="round" stroke-dasharray="190" stroke-dashoffset="0"><animate attributeName="stroke-dashoffset" from="190" to="0" dur="1.4s" ${EASE} fill="freeze"/></polyline>`,
  },
  {
    title: 'Rate limits',
    lines: ['Every window, how full,', 'and when it resets.'],
    glyph: () =>
      t(16, 30, '5h', { font: MONO, size: 10, color: P.faint }) +
      bar(40, 22, 144, 8, P.line) +
      bar(40, 22, 144 * 0.46, 8, P.amber) +
      t(16, 52, '7d', { font: MONO, size: 10, color: P.faint }) +
      bar(40, 44, 144, 8, P.line) +
      bar(40, 44, 144 * 0.21, 8, P.steel) +
      t(184, 66, 'resets 2h 24m', { font: MONO, size: 8.5, color: P.faint, anchor: 'end' }),
  },
  {
    title: 'Live flow',
    lines: ['Particles move only where', 'work is happening.'],
    glyph: () => {
      const xs = [24, 74, 124, 174]
      let s = `<path d="M 24 40 L 174 40" stroke="${P.line}" stroke-width="1.4"/>`
      xs.forEach((x, i) => (s += `<circle cx="${x}" cy="40" r="7" fill="${P.panel}" stroke="${i === 3 ? P.amber : P.sub}" stroke-width="1.4"/>`))
      for (let k = 0; k < 3; k++) {
        s += `<circle r="2.6" fill="${P.amber}"><animateMotion path="M 24 40 L 174 40" dur="1.8s" begin="-${n(k * 0.6)}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.45 0 0.55 1"/></circle>`
      }
      return s + ['prompt', 'model', 'gate', 'tools'].map((l, i) => t(xs[i]!, 64, l, { size: 8.5, color: P.faint, anchor: 'middle' })).join('')
    },
  },
  {
    title: 'Tool leaderboard',
    lines: ['Calls, failures, avg and', 'p95 for every tool.'],
    glyph: () =>
      [1, 0.74, 0.52, 0.31]
        .map((w, i) => {
          const y = 18 + i * 12
          return bar(16, y, 168 * w * 0.9, 7, P.sage, 0.85) + bar(16 + 168 * w * 0.9, y, 168 * w * 0.1, 7, P.rust, 0.9)
        })
        .join(''),
  },
  {
    title: 'File heatmap',
    lines: ['Every file touched, tinted', 'by how much it changed.'],
    glyph: () => {
      const heat = [0.9, 0.2, 0.5, 0.1, 0.7, 0.3, 0.15, 0.6, 0.25, 0.8, 0.1, 0.45, 0.2, 0.35, 0.95, 0.1, 0.5, 0.2, 0.7, 0.3, 0.1, 0.55, 0.15, 0.4]
      return heat.map((h, i) => `<rect x="${16 + (i % 8) * 21}" y="${16 + Math.floor(i / 8) * 15}" width="18" height="12" rx="2" fill="${P.amber}" opacity="${n(0.1 + h * 0.85)}"/>`).join('')
    },
  },
  {
    title: 'Subagent swimlanes',
    lines: ['Each agent on a timeline;', 'click to open its transcript.'],
    glyph: () =>
      [
        [16, 52, P.sage],
        [56, 70, P.steel],
        [110, 74, P.amber],
      ]
        .map(([x, w, c], i) => {
          const y = 18 + i * 15
          const grow = i === 2 ? `<animate attributeName="width" values="20;${w};${w}" keyTimes="0;0.8;1" dur="3s" repeatCount="indefinite"/>` : ''
          return `<line x1="16" y1="${y + 4}" x2="184" y2="${y + 4}" stroke="${P.grid}"/><rect x="${x}" y="${y}" width="${w}" height="8" rx="4" fill="${c}">${grow}</rect>`
        })
        .join(''),
  },
  {
    title: 'Heat guard',
    lines: ['Holds heavy jobs while the', 'CPU runs hot.'],
    glyph: () =>
      `<g transform="translate(40 40)"><path d="M 0 -22 C 10 -10 16 -2 12 10 C 9 19 -9 19 -12 10 C -15 1 -8 -6 -4 -12 C -3 -6 0 -3 3 -4 C 4 -10 2 -16 0 -22 Z" fill="${P.amber}"><animateTransform attributeName="transform" type="scale" values="1 1;1.04 0.96;0.97 1.05;1 1" dur="1.3s" repeatCount="indefinite"/></path>` +
      `<path d="M 0 2 C 4 6 5 9 3 13 C 1 16 -3 16 -4 13 C -5 9 -2 6 0 2 Z" fill="${P.ground}" opacity="0.55"/></g>` +
      `<line x1="76" y1="28" x2="184" y2="28" stroke="${P.rust}" stroke-width="1.4"/>` +
      t(184, 22, 'limit 80°', { font: MONO, size: 8.5, color: P.rust, anchor: 'end' }) +
      t(76, 52, 'npm run build · held', { font: MONO, size: 10, color: P.sub }),
  },
  {
    title: 'Session report',
    lines: ['One click to Markdown,', 'plus lifetime totals.'],
    glyph: () =>
      `<path d="M 20 14 H 52 L 62 24 V 64 H 20 Z" fill="${P.panel}" stroke="${P.sub}" stroke-width="1.3"/><path d="M 52 14 V 24 H 62" fill="none" stroke="${P.sub}" stroke-width="1.3"/>` +
      [30, 38, 46, 54].map((y, i) => bar(27, y, i === 0 ? 18 : 28 - i * 3, 2.5, i === 0 ? P.amber : P.faint)).join('') +
      t(76, 36, '# Session report', { font: MONO, size: 10, color: P.ink }) +
      t(76, 52, '| Bash | 4 | 75% |', { font: MONO, size: 10, color: P.faint }),
  },
]

const cluster = () => {
  const tw = 200
  const th = 136
  const gap = 12
  let g = ''
  TILES.forEach((tile, i) => {
    const x = 22 + (i % 4) * (tw + gap)
    const y = 22 + Math.floor(i / 4) * (th + gap)
    g += `<g transform="translate(${x} ${y})">`
    g += `<rect width="${tw}" height="${th}" rx="12" fill="${P.panel}" stroke="${P.line}"/>`
    g += t(tw - 14, 92, String(i + 1).padStart(2, '0'), { font: MONO, size: 9, color: P.faint, anchor: 'end' })
    g += `<g>${tile.glyph()}</g>`
    g += t(16, 92, tile.title, { size: 13, weight: 600, color: P.ink })
    g += t(16, 110, tile.lines[0], { size: 10.5, color: P.sub })
    g += t(16, 124, tile.lines[1], { size: 10.5, color: P.sub })
    g += `</g>`
  })
  return plate(W, 22 * 2 + 3 * th + 2 * gap, g, 'The twelve instruments of Embermeter', 'cluster')
}

// ---------------------------------------------------------------- spec sheet

const spec = () => {
  const rows: [string, string][][] = [
    [
      ['Network', 'none'],
      ['Model calls', 'none'],
      ['Files written', 'none'],
      ['Processes spawned', 'none'],
      ['Runtime dependencies', '0'],
      ['Timers', '1'],
    ],
    [
      ['Sensor period', '5 s'],
      ['Context breakdown', '≤ 15 s'],
      ['Memory', 'capped'],
      ['Surfaces', 'VS Code · desktop · tty'],
      ['Themes', 'night · day'],
      ['Licence', 'MIT'],
    ],
  ]
  let g = t(30, 40, 'SPECIFICATIONS', { font: MONO, size: 10, color: P.amber, ls: 3 })
  g += t(W - 30, 40, 'model EM-1, reference build', { font: SERIF, size: 12, italic: true, color: P.faint, anchor: 'end' })
  g += `<line x1="22" y1="52" x2="${W - 22}" y2="52" stroke="${P.line}"/>`
  rows.forEach((col, c) => {
    const x0 = c === 0 ? 30 : 466
    const x1 = c === 0 ? 414 : W - 30
    col.forEach(([k, v], i) => {
      const y = 84 + i * 30
      const kw = k.length * 7.1
      const vw = v.length * 7.4
      g += t(x0, y, k, { font: SERIF, size: 14, italic: true, color: P.sub })
      g += `<line x1="${n(x0 + kw + 10)}" y1="${y - 3}" x2="${n(x1 - vw - 10)}" y2="${y - 3}" stroke="${P.faint}" stroke-width="1.2" stroke-dasharray="1 5" stroke-linecap="round"/>`
      g += t(x1, y, v, { font: MONO, size: 12.5, color: v === 'none' || v === '0' ? P.sage : P.ink, anchor: 'end' })
    })
  })
  g += `<line x1="440" y1="66" x2="440" y2="236" stroke="${P.grid}"/>`
  g += t(W / 2, 262, 'Vitals read from Linux /sys and /proc. On other platforms they read “–” and the heat guard rests.', { font: SERIF, size: 12, italic: true, color: P.faint, anchor: 'middle' })
  return plate(W, 286, g, 'Specifications: no network, no model calls, no files written, no processes, zero dependencies, one timer', 'spec')
}

// ---------------------------------------------------------------- sign-off

const signoff = () => {
  const cx = W / 2
  let g = `<circle cx="${cx}" cy="50" r="34" fill="url(#end-ember)"><animate attributeName="opacity" values="0.5;1;0.5" dur="2.8s" repeatCount="indefinite"/></circle>`
  g +=
    `<g transform="translate(${cx} 52)"><path d="M 0 -18 C 8 -8 13 -2 10 8 C 7 15 -7 15 -10 8 C -12 1 -6 -5 -3 -10 C -2 -5 0 -2 2 -3 C 3 -8 2 -13 0 -18 Z" fill="${P.amber}"><animateTransform attributeName="transform" type="scale" values="1 1;1.05 0.95;0.96 1.05;1 1" dur="1.4s" repeatCount="indefinite"/></path></g>`
  g += t(cx, 104, 'Keep the ember low.', { font: SERIF, size: 20, italic: true, color: P.ink, anchor: 'middle' })
  g += t(cx, 126, 'EMBERMETER · MODEL EM-1 · MIT', { font: MONO, size: 9.5, color: P.faint, anchor: 'middle', ls: 3 })
  return plate(W, 150, g, 'Keep the ember low.', 'end')
}

const files: Record<string, string> = { 'hero.svg': hero(), 'cluster.svg': cluster(), 'spec.svg': spec(), 'signoff.svg': signoff() }
SECTIONS.forEach(([id], i) => (files[`section-${id}.svg`] = section(i)))
for (const [name, svg] of Object.entries(files)) writeFileSync(join(out, name), svg)
console.log(`${Object.keys(files).length} art files rendered to ${out}`)
