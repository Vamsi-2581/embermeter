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

const P = PALETTES.washi
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

// ---------------------------------------------------------------- washi: paper, sun, ink, mist

// Paper: a slow mottle for the fibres and a fine grain on top, both from SVG noise, so no image is embedded.
const paper = (id: string, w: number, h: number) =>
  `<filter id="${id}-fibre" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.011 0.018" numOctaves="3" seed="11"/>` +
  `<feColorMatrix values="0 0 0 0 0.55  0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0.22 0"/></filter>` +
  `<filter id="${id}-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" stitchTiles="stitch"/>` +
  `<feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0 0.18  0 0 0 0.16 0"/></filter>` +
  `<radialGradient id="${id}-vignette" cx="0.5" cy="0.45" r="0.75"><stop offset="0.6" stop-color="#7a6648" stop-opacity="0"/><stop offset="1" stop-color="#7a6648" stop-opacity="0.16"/></radialGradient>`

// The vermilion sun: lighter towards the lower right, as ink pooled on the paper, with its own speckle.
const sunDefs = (id: string) =>
  `<radialGradient id="${id}-sun" cx="0.62" cy="0.7" r="0.75"><stop offset="0" stop-color="#e0574a"/><stop offset="0.65" stop-color="${P.amber}"/><stop offset="1" stop-color="#b93127"/></radialGradient>` +
  `<filter id="${id}-speckle" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="9"/>` +
  `<feColorMatrix values="0 0 0 0 0.95  0 0 0 0 0.88  0 0 0 0 0.8  0 0 0 0.35 -0.05"/></filter>`

const sun = (id: string, cx: number, cy: number, r: number) =>
  `<clipPath id="${id}-sunclip"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>` +
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}-sun)"/>` +
  `<rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" filter="url(#${id}-speckle)" clip-path="url(#${id}-sunclip)"/>`

// Ink fading into mist: sumi at the peak, gone by the foot.
const inkDefs = (id: string) =>
  `<linearGradient id="${id}-ink" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.ink}"/><stop offset="0.55" stop-color="#3b3f40" stop-opacity="0.9"/><stop offset="1" stop-color="#5b5d5a" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="${id}-redface" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${P.amber}" stop-opacity="0.85"/><stop offset="1" stop-color="${P.amber}" stop-opacity="0"/></linearGradient>` +
  `<filter id="${id}-mist" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="9"/></filter>` +
  `<filter id="${id}-soft" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="2" result="n"/>` +
  `<feDisplacementMap in="SourceGraphic" in2="n" scale="3"/></filter>`

// A peak with its sunlit face, a red ridge behind, and mist across the foot.
const mountain = (id: string, x: number, base: number, s: number) => {
  const X = (v: number) => n(x + v * s)
  const Y = (v: number) => n(base - v * s)
  return (
    `<g filter="url(#${id}-soft)">` +
    `<path d="M ${X(70)} ${Y(0)} L ${X(150)} ${Y(66)} L ${X(168)} ${Y(58)} L ${X(205)} ${Y(30)} L ${X(240)} ${Y(0)} Z" fill="${P.amber}" opacity="0.45"/>` +
    `<path d="M ${X(-20)} ${Y(0)} L ${X(30)} ${Y(38)} L ${X(62)} ${Y(70)} L ${X(80)} ${Y(96)} L ${X(92)} ${Y(124)} L ${X(104)} ${Y(112)} L ${X(130)} ${Y(80)} L ${X(150)} ${Y(56)} L ${X(190)} ${Y(0)} Z" fill="url(#${id}-ink)"/>` +
    `<path d="M ${X(92)} ${Y(124)} L ${X(104)} ${Y(112)} L ${X(130)} ${Y(80)} L ${X(150)} ${Y(56)} L ${X(176)} ${Y(18)} L ${X(118)} ${Y(40)} L ${X(100)} ${Y(84)} Z" fill="url(#${id}-redface)"/>` +
    `</g>` +
    `<ellipse cx="${X(85)}" cy="${Y(4)}" rx="${n(150 * s)}" ry="${n(18 * s)}" fill="${P.ground}" filter="url(#${id}-mist)" opacity="0.95">` +
    `<animate attributeName="cx" values="${X(75)};${X(98)};${X(75)}" dur="14s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/></ellipse>`
  )
}

// A bird in sumi: wings beat, and the flock drifts.
const bird = (x: number, y: number, s: number, phase: number) =>
  `<g transform="translate(${n(x)} ${n(y)}) scale(${s})"><path d="M -9 -1 Q -5 -6 0 0 Q 5 -6 9 -1 Q 5 -2.5 0 2.2 Q -5 -2.5 -9 -1 Z" fill="${P.ink}">` +
  `<animateTransform attributeName="transform" type="scale" values="1 1;1 0.35;1 1" dur="0.95s" begin="-${n(phase)}s" repeatCount="indefinite"/></path></g>`

const flock = (pts: [number, number, number][], dx: number, dy: number, dur: number) =>
  `<g><animateTransform attributeName="transform" type="translate" values="0 0;${dx} ${dy};0 0" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>` +
  pts.map(([x, y, s], i) => bird(x, y, s, i * 0.31)).join('') +
  `</g>`

// A hanko seal: a red stamp, slightly askew, with the letters in paper.
const seal = (x: number, y: number, size: number, text: string) =>
  `<g transform="rotate(-4 ${n(x + size / 2)} ${n(y + size / 2)})"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="4" fill="${P.amber}" opacity="0.92"/>` +
  `<rect x="${x + 3}" y="${y + 3}" width="${size - 6}" height="${size - 6}" rx="2.5" fill="none" stroke="${P.panel}" stroke-width="1.2" opacity="0.85"/>` +
  t(x + size / 2, y + size / 2 + size * 0.15, text, { font: SERIF, size: size * 0.42, weight: 700, color: P.panel, anchor: 'middle' }) +
  `</g>`

// A plate of washi: mottled paper, a hairline frame and a fine inner rule.
const plate = (w: number, h: number, body: string, label: string, id: string, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">` +
  `<defs>${paper(id, w, h)}<clipPath id="${id}-clip"><rect width="${w}" height="${h}" rx="14"/></clipPath>${defs}</defs>` +
  `<g clip-path="url(#${id}-clip)"><rect width="${w}" height="${h}" fill="${P.ground}"/>` +
  `<rect width="${w}" height="${h}" filter="url(#${id}-fibre)"/><rect width="${w}" height="${h}" filter="url(#${id}-grain)"/>` +
  `<rect width="${w}" height="${h}" fill="url(#${id}-vignette)"/>` +
  body +
  `</g>` +
  `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="13.5" fill="none" stroke="${P.line}"/>` +
  `<rect x="7.5" y="7.5" width="${w - 15}" height="${h - 15}" rx="9" fill="none" stroke="${P.ink}" stroke-opacity="0.12"/>` +
  `</svg>`

// ---------------------------------------------------------------- hero

const hero = () => {
  const H = 380
  const cx = 668
  const cy = 188
  const r = 98
  const f = 0.62
  let g = ''

  // The sun is the dial: a ring of ink ticks around it, a crimson red line, and a pointer that settles on the reading.
  g += sun('hero', cx, cy, r)
  for (let i = 0; i <= 24; i++) {
    const a = deg(i / 24)
    const major = i % 4 === 0
    const [x0, y0] = pt(cx, cy, r + 12, a)
    const [x1, y1] = pt(cx, cy, r + (major ? 22 : 17), a)
    g += `<line x1="${n(x0)}" y1="${n(y0)}" x2="${n(x1)}" y2="${n(y1)}" stroke="${P.ink}" stroke-opacity="${major ? 0.7 : 0.35}" stroke-width="${major ? 1.4 : 1}" stroke-linecap="round"/>`
  }
  g += `<path d="${arc(cx, cy, r + 17, deg(0.85), deg(1))}" fill="none" stroke="${P.rust}" stroke-width="3" stroke-linecap="round"/>`
  const end = deg(f)
  const [px, py] = pt(cx, cy, r + 30, 0)
  g +=
    `<g transform="rotate(${n(end)} ${cx} ${cy})"><animateTransform attributeName="transform" type="rotate" values="150 ${cx} ${cy};${n(end + 8)} ${cx} ${cy};${n(end - 3)} ${cx} ${cy};${n(end)} ${cx} ${cy}" keyTimes="0;0.6;0.82;1" dur="2.4s" fill="freeze"/>` +
    `<path d="M ${n(px)} ${n(py)} l 9 -5 l 0 10 Z" fill="${P.ink}"/></g>`

  g += mountain('hero', cx - 128, 312, 1.25)
  g += flock(
    [
      [cx + 30, cy - 52, 1],
      [cx + 58, cy - 66, 0.9],
      [cx + 50, cy - 34, 0.95],
      [cx - 10, cy + 2, 0.85],
    ],
    -14,
    -6,
    11,
  )

  // Masthead.
  g += t(44, 40, 'MODEL EM-1', { font: MONO, size: 10, color: P.faint, ls: 3 })
  g += t(W / 2, 41, 'Operator’s Manual', { font: SERIF, size: 13, italic: true, color: P.sub, anchor: 'middle' })
  g += t(W - 44, 40, 'No. 0001 · MIT', { font: MONO, size: 10, color: P.faint, anchor: 'end', ls: 1 })
  g += `<line x1="44" y1="54" x2="${W - 44}" y2="54" stroke="${P.ink}" stroke-opacity="0.25"/>`

  // Wordmark, seal and tagline.
  g += t(44, 140, 'Embermeter', { font: SERIF, size: 62, color: P.ink, ls: -1 })
  g += seal(388, 92, 38, 'EM')
  g += t(46, 174, 'a live instrument panel for Claude Code', { font: SERIF, size: 17, italic: true, color: P.sub })
  g += `<line x1="46" y1="192" x2="128" y2="192" stroke="${P.amber}" stroke-width="2" stroke-linecap="round"/>`

  // Readouts: each cycles through a few plausible values, discretely, like a display.
  const readout = (x: number, cap: string, values: string[]) => {
    let s = `<rect x="${x}" y="212" width="118" height="56" rx="6" fill="${P.panel}" fill-opacity="0.7" stroke="${P.ink}" stroke-opacity="0.2"/>`
    s += t(x + 12, 231, cap, { font: MONO, size: 8.5, color: P.faint, ls: 2 })
    s += `<circle cx="${x + 106}" cy="228" r="3" fill="${P.amber}"><animate attributeName="opacity" values="1;0.25;1" dur="1.8s" repeatCount="indefinite"/></circle>`
    const k = values.length
    values.forEach((v, i) => {
      const vals = values.map((_, j) => (j === i ? 1 : 0)).join(';') + `;${i === 0 ? 1 : 0}`
      const times = values.map((_, j) => n(j / k)).join(';') + ';1'
      s += t(x + 12, 257, v, {
        font: MONO,
        size: 18,
        weight: 600,
        color: P.ink,
        attrs: ` opacity="${i === 0 ? 1 : 0}"`,
        inner: `<animate attributeName="opacity" values="${vals}" keyTimes="${times}" calcMode="discrete" dur="${k * 1.7}s" repeatCount="indefinite"/>`,
      })
    })
    return s
  }
  g += readout(44, 'RUNWAY', ['9 turns', '8 turns'])
  g += readout(174, 'CACHE HIT', ['89%', '90%', '89%', '91%'])
  g += readout(304, 'CPU', ['68°', '69°', '67°', '68°'])

  // Ticker tape, in ink with vermilion stops.
  const items = [
    'turn 14 · 2.1k out · 38s',
    'Bash npm test ✓ 18.4s',
    'Edit src/lib/http.ts',
    'Explore agent done · 23 tools',
    'context +4% · runway 9 turns',
    'loop watch quiet',
    'cpu 68° · guard armed',
    'cost $2.41 · $3.08/h',
    'Read fed 11k tokens',
    'rate limit 5h · 46%',
  ]
  const sep = ' ● '
  const chars = items.join(sep).length + sep.length
  const Lt = n(chars * 6.6)
  const tape = items.map(s => `<tspan fill="${P.sub}">${esc(s)}</tspan><tspan fill="${P.amber}">${sep}</tspan>`).join('')
  const ty = 330
  g += `<defs><clipPath id="tape"><rect x="44" y="${ty}" width="${W - 88}" height="28"/></clipPath></defs>`
  g += `<line x1="44" y1="${ty}" x2="${W - 44}" y2="${ty}" stroke="${P.ink}" stroke-opacity="0.25"/><line x1="44" y1="${ty + 28}" x2="${W - 44}" y2="${ty + 28}" stroke="${P.ink}" stroke-opacity="0.25"/>`
  g +=
    `<g clip-path="url(#tape)"><g><animateTransform attributeName="transform" type="translate" from="0 0" to="-${Lt} 0" dur="${n(Lt / 36)}s" repeatCount="indefinite"/>` +
    `<text x="44" y="${ty + 18}" font-family="${MONO}" font-size="11" textLength="${n(Lt * 2)}" lengthAdjust="spacing" xml:space="preserve">${tape}${tape}</text></g></g>`
  return plate(W, H, g, 'Embermeter, model EM-1: a live instrument panel for Claude Code', 'hero', sunDefs('hero') + inkDefs('hero'))
}

// ---------------------------------------------------------------- section plates

const SECTIONS = [
  ['install', 'I', 'Installation', 'fig. 1 · one command'],
  ['instruments', 'II', 'The Instruments', 'fig. 2 · sixteen gauges'],
  ['tour', 'III', 'A Tour of the Panel', 'fig. 3 · eight tabs'],
  ['controls', 'IV', 'Controls', 'fig. 4 · commands & settings'],
  ['workings', 'V', 'Inner Workings', 'fig. 5 · architecture'],
  ['safety', 'VI', 'Safety Notice', 'fig. 6 · privacy & security'],
  ['notes', 'VII', 'Field Notes', 'fig. 7 · questions'],
  ['bench', 'VIII', 'The Workbench', 'fig. 8 · contributing'],
] as const

// An ensō, the brushed circle, closes a little more with each section, so the README reads like a gauge filling up.
const section = (i: number) => {
  const [, num, title, cap] = SECTIONS[i]!
  const f = (i + 1) / SECTIONS.length
  const cx = 52
  const cy = 40
  const r = 20
  const C = n(2 * Math.PI * r)
  const brush = (w: number, o: number, rot: number, len: number) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${P.ink}" stroke-width="${w}" stroke-opacity="${o}" stroke-linecap="round" stroke-dasharray="${n(len)} ${C}" transform="rotate(${rot} ${cx} ${cy})">` +
    `<animate attributeName="stroke-dasharray" from="0 ${C}" to="${n(len)} ${C}" dur="1.6s" ${EASE} fill="freeze"/></circle>`
  let g = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${P.ink}" stroke-opacity="0.08" stroke-width="5"/>`
  g += brush(5, 0.85, -100, C * f * 0.94) + brush(2, 0.35, -96, C * f * 0.9)
  g += `<circle cx="${cx}" cy="${cy}" r="${n(5 + 4 * f)}" fill="${P.amber}" opacity="0.9"/>`
  g += t(94, 31, num, { font: SERIF, size: 12, color: P.amber, ls: 3 })
  g += t(94, 57, title, { font: SERIF, size: 26, color: P.ink })
  const titleEnd = 94 + title.length * 13.4
  const capW = cap.length * 6.1
  g += `<line x1="${n(titleEnd + 18)}" y1="53" x2="${n(W - 34 - capW - 14)}" y2="53" stroke="${P.ink}" stroke-opacity="0.35" stroke-width="1.2" stroke-dasharray="1 5" stroke-linecap="round"/>`
  g += t(W - 34, 57, cap, { font: MONO, size: 10, color: P.faint, anchor: 'end' })
  return plate(W, 80, g, `${num}. ${title}`, `s${i}`)
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
      t(76, 52, 'build · held', { font: MONO, size: 10, color: P.sub }),
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
  {
    title: 'Loop watch',
    lines: ['Spots the same call again', 'and again, and says so.'],
    glyph: () =>
      `<g transform="translate(40 38)"><circle r="17" fill="none" stroke="${P.line}" stroke-width="5"/>` +
      `<circle r="17" fill="none" stroke="${P.amber}" stroke-width="5" stroke-linecap="round" stroke-dasharray="40 67"><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="1.6s" repeatCount="indefinite"/></circle></g>` +
      t(74, 34, 'npm test ×3', { font: MONO, size: 11, color: P.ink }) +
      t(74, 50, 'may be looping', { size: 10, color: P.rust }),
  },
  {
    title: 'Context fed by tools',
    lines: ['Which tool results eat', 'the window, ranked.'],
    glyph: () =>
      [
        ['Read', 1, P.amber],
        ['Bash', 0.56, P.steel],
        ['Web', 0.47, P.steel],
      ]
        .map(([name, w, c], i) => {
          const y = 18 + i * 15
          return (
            t(16, y + 7, String(name), { font: MONO, size: 9, color: P.faint }) +
            bar(52, y, 132, 6, P.line) +
            `<rect x="52" y="${y}" width="${n(132 * Number(w))}" height="6" rx="2" fill="${c}"><animate attributeName="width" from="0" to="${n(132 * Number(w))}" dur="0.9s" begin="${i * 0.2}s" ${EASE} fill="freeze"/></rect>`
          )
        })
        .join(''),
  },
  {
    title: 'Cost waterfall',
    lines: ['Every turn stacked on the', 'total, by model too.'],
    glyph: () => {
      const steps = [6, 3, 9, 4, 12, 5, 7]
      let cum = 0
      let s = `<line x1="16" y1="62" x2="184" y2="62" stroke="${P.line}"/>`
      steps.forEach((h, i) => {
        const y = 62 - cum - h
        s += `<rect x="${16 + i * 24}" y="${y}" width="18" height="${h}" rx="1.5" fill="${i === 4 ? P.amber : P.sage}" opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="${n(i * 0.18)}s" fill="freeze"/></rect>`
        cum += h
      })
      return s
    },
  },
  {
    title: 'Thirty days',
    lines: ['A calendar of spend, from', 'totals kept on your machine.'],
    glyph: () => {
      const spend = [0.4, 0.8, 0.3, 0, 0, 0.6, 0.9, 0.5, 0.7, 0.2, 0, 0, 0.5, 1, 0.6, 0.3, 0.8, 0, 0, 0.4, 0.7, 0.9, 0.5, 0.6]
      return spend
        .map((v, i) => {
          const today = i === spend.length - 1
          return `<rect x="${16 + (i % 8) * 21}" y="${16 + Math.floor(i / 8) * 15}" width="18" height="12" rx="2" fill="${v ? P.amber : P.line}" opacity="${v ? n(0.2 + v * 0.8) : 1}"${today ? ` stroke="${P.amber}" stroke-width="1.2"` : ''}>${today ? `<animate attributeName="opacity" values="0.4;1;0.4" dur="2.4s" repeatCount="indefinite"/>` : ''}</rect>`
        })
        .join('')
    },
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
  const rows = Math.ceil(TILES.length / 4)
  return plate(W, 22 * 2 + rows * th + (rows - 1) * gap, g, 'The sixteen instruments of Embermeter', 'cluster')
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
      ['Themes', 'washi · night · day'],
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
      const kw = k.length * 7.6
      const vw = v.length * 7.9
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
  let g = sun('end', cx, 62, 34)
  g += mountain('end', cx - 70, 98, 0.62)
  g += flock(
    [
      [cx + 14, 44, 0.55],
      [cx + 28, 37, 0.5],
    ],
    -6,
    -3,
    9,
  )
  g += t(cx, 132, 'Keep the ember low.', { font: SERIF, size: 20, italic: true, color: P.ink, anchor: 'middle' })
  g += t(cx, 154, 'EMBERMETER · MODEL EM-1 · MIT', { font: MONO, size: 9.5, color: P.faint, anchor: 'middle', ls: 3 })
  g += seal(W - 74, 120, 30, 'EM')
  return plate(W, 176, g, 'Keep the ember low.', 'end', sunDefs('end') + inkDefs('end'))
}

const files: Record<string, string> = { 'hero.svg': hero(), 'cluster.svg': cluster(), 'spec.svg': spec(), 'signoff.svg': signoff() }
SECTIONS.forEach(([id], i) => (files[`section-${id}.svg`] = section(i)))
for (const [name, svg] of Object.entries(files)) writeFileSync(join(out, name), svg)
console.log(`${Object.keys(files).length} art files rendered to ${out}`)
