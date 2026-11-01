// Renders the README images in docs/ from the real drawing code and a sample session.
// Usage: node scripts/render-docs.ts [outdir]   (Node 22.18+ or 23.6+, which run TypeScript natively)
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = new URL('..', import.meta.url).pathname
const out = process.argv[2] ?? join(root, 'docs')
mkdirSync(out, { recursive: true })

// The hooks import './core' without an extension, as the engine resolves it. Node needs the extension, so the
// two pure modules are copied to a temp folder with that one import rewritten.
const tmp = mkdtempSync(join(tmpdir(), 'embermeter-docs-'))
for (const f of ['core.ts', 'draw.ts']) {
  const src = readFileSync(join(root, 'hooks', f), 'utf8').replace(/from '\.\/core'/g, "from './core.ts'")
  writeFileSync(join(tmp, f), src)
}
const core = await import(pathToFileURL(join(tmp, 'core.ts')).href)
const draw = await import(pathToFileURL(join(tmp, 'draw.ts')).href)
rmSync(tmp, { recursive: true, force: true })

const { emptyBoard, finishCall, parseConfig, spawnAgent, startCall, withCtx, withVitals } = core
const now = Date.now()
const T0 = now - 47 * 60_000

let b = emptyBoard(T0)
for (const [i, pct] of [8, 12, 15, 19, 22, 26, 31, 33, 38, 41, 44, 47, 52, 55, 58].entries()) {
  b = withCtx(b, { tokens: pct * 2000, window: 200000, pct, usd: 0.12 * i, limits: [] })
}
b = withCtx(b, {
  tokens: 116000,
  window: 200000,
  pct: 58,
  usd: 2.41,
  limits: [
    { kind: 'five_hour', pct: 46, resetsAt: new Date(now + 2.4 * 3600_000).toISOString() },
    { kind: 'seven_day', pct: 21, resetsAt: null },
  ],
})
for (let i = 0; i < 40; i++) {
  b = withVitals(b, { tempC: 52 + Math.round(14 * Math.sin(i / 5) + i / 4), pct: 76, discharging: false, load1: 3.4, memPct: 61 }, now)
}

// The last column is the estimated size of the result the model read back, in tokens.
const calls = [
  ['Read', '/src/app/page.tsx', 'ok', 120, 3900],
  ['Grep', 'useSession', 'ok', 340, 820],
  ['Edit', '/src/lib/http.ts', 'ok', 210, 140],
  ['Bash', 'rtk npm test', 'ok', 18400, 2600],
  ['Edit', '/src/lib/http.ts', 'ok', 190, 120],
  ['Read', '/src/store/session.ts', 'ok', 90, 2700],
  ['Bash', 'git status', 'ok', 600, 310],
  ['Write', '/src/ui/Chart.tsx', 'ok', 260, 60],
  ['Bash', 'rtk tsc', 'fail', 9200, 1800],
  ['Edit', '/server/router.ts', 'ok', 230, 150],
  ['WebFetch', 'https://docs.example.dev', 'ok', 2400, 5200],
  ['Glob', '**/*.test.ts', 'ok', 80, 240],
  ['Bash', 'rtk git diff', 'ok', 700, 1400],
  ['Edit', '/src/ui/Chart.tsx', 'ok', 310, 130],
  ['Read', '/db/schema.sql', 'ok', 110, 4100],
] as const
calls.forEach(([tool, detail, status, ms, outTok], i) => {
  const isFile = tool === 'Read' || tool === 'Edit' || tool === 'Write'
  const input = isFile ? { file: detail } : tool === 'Bash' ? { command: detail } : {}
  b = startCall(b, { id: `c${i}`, tool, detail, status: 'run', agent: false, at: T0 + i * 60_000, ms: null }, input, 'rtk')
  b = finishCall(b, `c${i}`, status, ms, outTok)
})
b = startCall(b, { id: 'live', tool: 'Bash', detail: 'rtk npm run build', status: 'run', agent: false, at: now - 4000, ms: null }, { command: 'rtk npm run build' }, 'rtk')

b = spawnAgent(b, { id: 'a1', type: 'Explore', desc: 'Map the request flow', model: 'haiku', status: 'done', startedAt: T0 + 6 * 60_000, endedAt: T0 + 11 * 60_000, tools: 23 })
b = spawnAgent(b, { id: 'a2', type: 'Plan', desc: 'Design the cache layer', model: 'opus', status: 'done', startedAt: T0 + 12 * 60_000, endedAt: T0 + 21 * 60_000, tools: 9 })
b = spawnAgent(b, { id: 'a3', type: 'general-purpose', desc: 'Write the migration', model: 'sonnet', status: 'run', startedAt: T0 + 33 * 60_000, endedAt: null, tools: 31 })
b = spawnAgent(b, { id: 'a4', type: 'code-reviewer', desc: 'Review the diff', model: 'opus', status: 'fail', startedAt: T0 + 24 * 60_000, endedAt: T0 + 27 * 60_000, tools: 4 })

const turns = [42, 18, 95, 31, 64, 120, 22, 47, 88, 35, 54, 140, 26, 71]
// Mostly the main model, with a cheaper one for quick turns.
const modelOf = (i: number) => (i % 4 === 1 ? 'claude-sonnet-5-5' : i % 7 === 6 ? 'claude-haiku-5-5' : 'claude-opus-5-5')
const sampleTurns = turns.map((s, i) => ({
  at: i * 180_000,
  ms: s * 1000,
  usd: modelOf(i) === 'claude-opus-5-5' ? s / 600 : s / 2400,
  tools: Math.round(s / 6),
  ctxDelta: 3 + (i % 3),
  reason: i === 9 ? 'error' : 'answer',
  model: modelOf(i),
  tokens: { input: 1200, output: s * 38, cacheRead: 52000, cacheWrite: 6100 },
}))
const models: Record<string, { turns: number; usd: number; input: number; output: number }> = {}
for (const t of sampleTurns) {
  const m = models[t.model] ?? { turns: 0, usd: 0, input: 0, output: 0 }
  models[t.model] = { turns: m.turns + 1, usd: m.usd + t.usd, input: m.input + 59300, output: m.output + t.tokens.output }
}
b = {
  ...b,
  turns: sampleTurns,
  models,
  tokens: { input: 16800, output: 31400, cacheRead: 728000, cacheWrite: 85400 },
  model: 'claude-opus-5-5',
  comp: {
    model: 'claude-opus-5-5',
    total: 116000,
    max: 200000,
    compactAt: 167000,
    autoCompact: true,
    slices: [
      { name: 'Messages', tokens: 78400, kind: 'messages' },
      { name: 'System tools', tokens: 17600, kind: 'tools' },
      { name: 'MCP tools', tokens: 8900, kind: 'mcp' },
      { name: 'System prompt', tokens: 4100, kind: 'system' },
      { name: 'Memory files', tokens: 3800, kind: 'memory' },
      { name: 'Skills', tokens: 2100, kind: 'skills' },
      { name: 'Custom agents', tokens: 1100, kind: 'agents' },
    ],
    memory: [
      { path: '/home/me/.claude/CLAUDE.md', tokens: 1900 },
      { path: '/home/me/work/app/CLAUDE.md', tokens: 1200 },
      { path: '/home/me/work/app/AGENTS.md', tokens: 700 },
    ],
    mcp: [
      { name: 'query', server: 'docs', tokens: 3100, loaded: true },
      { name: 'batch', server: 'docs', tokens: 2800, loaded: true },
      { name: 'search', server: 'github', tokens: 1700, loaded: true },
    ],
    at: now,
  },
  turnCount: turns.length + 1,
  gate: { allow: 61, ask: 7, deny: 2 },
  guardBlocks: 1,
  activity: [2, 5, 3, 8, 12, 6, 4, 9, 14, 11, 7, 3, 5, 10, 16, 13, 8, 6, 9, 12, 15, 18, 11, 7, 9, 13, 17, 12, 10, 14],
  compactions: 1,
  running: true,
  turnStart: now - 37_000,
  now,
}

// Thirty days of history for the Spend page: weekday work, quiet weekends, today in progress.
let life = { sessions: 0, usd: 0, turns: 0, calls: 0 }
for (let i = 29; i >= 0; i--) {
  const day = new Date(now - i * 86_400_000)
  const weekend = day.getDay() === 0 || day.getDay() === 6
  const usd = weekend ? (i % 3 === 0 ? 0.6 : 0) : 1.2 + 2.6 * Math.abs(Math.sin(i * 1.7))
  if (usd > 0) life = core.addDay(life, core.dayKey(day.getTime()), { sessions: 2, usd, turns: Math.round(usd * 14), calls: Math.round(usd * 60) })
}

// Washi, the default, is what the README shows; night and day are rendered too, and a narrow pane.
const variants = [
  ['', 'washi', 90],
  ['-night', 'night', 90],
  ['-day', 'day', 90],
  ['-narrow', 'washi', 50],
] as const
for (const [suffix, theme, cols] of variants) {
  const c = parseConfig({ budgetUsd: 5, theme, commandPrefix: 'rtk', threads: 16 })
  const D = draw.drawContext(c, null, cols)
  const pages: Record<string, string> = {
    header: draw.header(D, b, c),
    overview: draw.overview(D, b, c),
    context: draw.contextPage(D, b),
    spend: draw.spend(D, b, c, life),
    tools: draw.tools(D, b),
    files: draw.files(D, b),
    agents: draw.agents(D, b),
    system: draw.system(D, b, c),
    strip: draw.strip(D, b, c),
  }
  for (const [name, svg] of Object.entries(pages)) {
    if (suffix && name !== 'overview') continue
    writeFileSync(join(out, `${name}${suffix}.svg`), svg)
  }
}
console.log(`docs rendered to ${out}`)
