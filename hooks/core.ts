// Pure logic: no `$`, no I/O. Everything here is unit-tested in tests/core.test.ts.
import type { Agent, AgentStatus, Board, Call, CallStatus, Composition, Ctx, FileStat, Lifetime, LogKind, Tokens, ToolStat, Turn, Vitals } from '../types'

export type Theme = 'night' | 'day'
export type Motion = 'smooth' | 'reduced' | 'off'

export type Cfg = {
  theme: Theme
  motion: Motion
  maxTempC: number
  minBatteryPct: number
  guard: boolean
  heavy: RegExp
  prefix: string
  budgetUsd: number
  threads: number
  openOnStart: boolean
  band: boolean
  alerts: boolean
}

// A heavy word must stand alone, so paths and file names (`tests/a.test.ts`, `vite.config.ts`, `--ci`) don't count.
const DEFAULT_HEAVY = '(?<![\\w./-])(build|test|vitest|jest|playwright|tsc|lint|install|ci|docker|webpack|vite|next|prisma\\s+migrate|cargo|e2e)(?![\\w./-])'

// CPU sensors first: ACPI and Wi-Fi zones often report stale or trip-point values well above the real die temperature.
const CPU_ZONE = /^(x86_pkg_temp|TCPU|coretemp|k10temp|cpu[-_]?thermal|soc[-_]?thermal|cpu)/i

export const pickTemp = (zones: readonly { type: string; milli: number | null }[]): number | null => {
  const ok = zones.filter((z): z is { type: string; milli: number } => z.milli !== null && z.milli > 0 && z.milli < 130_000)
  const cpu = ok.filter(z => CPU_ZONE.test(z.type))
  const pool = cpu.length ? cpu : ok
  return pool.length ? Math.max(...pool.map(z => z.milli)) / 1000 : null
}

// "0-15" or "0,2-5" from /sys/devices/system/cpu/online.
export const countCpus = (online: string | null): number | null => {
  if (!online) return null
  let n = 0
  for (const part of online.trim().split(',')) {
    const [a, b] = part.split('-').map(Number)
    if (a === undefined || !Number.isFinite(a)) return null
    n += b !== undefined && Number.isFinite(b) ? b - a + 1 : 1
  }
  return n > 0 ? n : null
}

export const parseConfig = (o: Readonly<Record<string, unknown>> = {}): Cfg => {
  const num = (v: unknown, d: number, lo: number, hi: number) => {
    const n = Number(v)
    return Number.isFinite(n) && n >= lo && n <= hi ? n : d
  }
  let heavy: RegExp
  try {
    heavy = new RegExp(typeof o.heavyPattern === 'string' && o.heavyPattern ? o.heavyPattern : DEFAULT_HEAVY)
  } catch {
    heavy = new RegExp(DEFAULT_HEAVY)
  }
  return {
    theme: o.theme === 'day' ? 'day' : 'night',
    motion: o.motion === 'reduced' || o.motion === 'off' ? o.motion : 'smooth',
    maxTempC: num(o.maxTempC, 80, 40, 110),
    minBatteryPct: num(o.minBatteryPct, 20, 0, 100),
    guard: o.guard !== false,
    heavy,
    prefix: typeof o.commandPrefix === 'string' ? o.commandPrefix.trim() : '',
    budgetUsd: num(o.budgetUsd, 0, 0, 100000),
    // 0 means detect from the machine; register.tsx fills it in.
    threads: num(o.threads, 0, 0, 512),
    openOnStart: o.openOnStart !== false,
    band: o.band !== false,
    alerts: o.alerts !== false,
  }
}

// ---------------------------------------------------------------- board

export const emptyBoard = (startedAt = 0): Board => ({
  startedAt,
  now: startedAt,
  vitals: null,
  ctx: null,
  comp: null,
  tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  model: '',
  running: false,
  turnStart: 0,
  turnTools: 0,
  turnCtxStart: null,
  costAtStart: null,
  turns: [],
  turnCount: 0,
  calls: [],
  stats: {},
  files: {},
  bash: { total: 0, prefixed: 0 },
  gate: { allow: 0, ask: 0, deny: 0 },
  agents: [],
  log: [],
  ctxHist: [],
  tempHist: [],
  activity: [0],
  activityMinute: 0,
  compactions: 0,
  guardBlocks: 0,
  alerts: [],
})

// A value stored by an older version is merged over the defaults, so a reload never meets a missing field.
export const normalize = (b: unknown): Board => {
  const base = emptyBoard()
  if (!b || typeof b !== 'object') return base
  const merged = { ...base, ...(b as Partial<Board>) }
  return {
    ...merged,
    bash: { ...base.bash, ...merged.bash },
    gate: { ...base.gate, ...merged.gate },
    tokens: { ...base.tokens, ...merged.tokens },
    turns: (merged.turns ?? []).map(t => ({ ...t, model: t.model ?? '', tokens: t.tokens ?? null })),
    activity: Array.isArray(merged.activity) && merged.activity.length ? merged.activity : [0],
  }
}

export const tail = <T>(list: T[], item: T, max: number): T[] => [...list, item].slice(-max)

export const log = (b: Board, at: number, who: string, text: string, kind: LogKind = 'info'): Board => ({
  ...b,
  log: tail(b.log, { at, who: short(who, 14), text: short(text, 110), kind }, 60),
})

const FILE_KIND: Record<string, keyof Omit<FileStat, 'last'>> = {
  Read: 'read',
  Edit: 'edit',
  MultiEdit: 'edit',
  NotebookEdit: 'edit',
  Write: 'write',
}

const bump = (b: Board, at: number): Board => {
  const minute = Math.max(0, Math.floor((at - b.startedAt) / 60000))
  let activity = b.activity
  let current = b.activityMinute
  if (minute > current) {
    const gap = Math.min(minute - current, 60)
    activity = [...activity, ...Array(gap).fill(0)]
    current = minute
  }
  activity = activity.slice(-60)
  const last = activity.length - 1
  return { ...b, activity: activity.map((n, i) => (i === last ? n + 1 : n)), activityMinute: current }
}

export const startCall = (b: Board, call: Call, input: { file?: string; command?: string; agentId?: string }, prefix: string): Board => {
  let next = bump({ ...b, calls: tail(b.calls, call, 60), turnTools: b.turnTools + (call.agent ? 0 : 1) }, call.at)
  const kind = FILE_KIND[call.tool]
  if (kind && input.file) {
    const f = next.files[input.file] ?? { read: 0, edit: 0, write: 0, last: 0 }
    next = { ...next, files: { ...next.files, [input.file]: { ...f, [kind]: f[kind] + 1, last: call.at } } }
  }
  if (call.tool === 'Bash' && input.command !== undefined) {
    const isPrefixed = prefix !== '' && input.command.trim().startsWith(`${prefix} `)
    next = { ...next, bash: { total: next.bash.total + 1, prefixed: next.bash.prefixed + (isPrefixed ? 1 : 0) } }
  }
  if (input.agentId) {
    next = { ...next, agents: next.agents.map(a => (a.id === input.agentId ? { ...a, tools: a.tools + 1 } : a)) }
  }
  return next
}

export const finishCall = (b: Board, id: string, status: CallStatus, ms: number): Board => {
  const call = b.calls.find(c => c.id === id)
  if (!call) return b
  const s: ToolStat = b.stats[call.tool] ?? { n: 0, ok: 0, fail: 0, denied: 0, totalMs: 0, durs: [] }
  const stat: ToolStat = {
    n: s.n + 1,
    ok: s.ok + (status === 'ok' ? 1 : 0),
    fail: s.fail + (status === 'fail' ? 1 : 0),
    denied: s.denied + (status === 'denied' ? 1 : 0),
    totalMs: s.totalMs + (status === 'denied' ? 0 : ms),
    durs: status === 'denied' ? s.durs : tail(s.durs, ms, 50),
  }
  return {
    ...b,
    calls: b.calls.map(c => (c.id === id ? { ...c, status, ms } : c)),
    stats: { ...b.stats, [call.tool]: stat },
  }
}

export const spawnAgent = (b: Board, a: Agent): Board => ({ ...b, agents: tail(b.agents.filter(x => x.id !== a.id), a, 40) })

export const endAgent = (b: Board, id: string, reason: string, at: number): Board => {
  const status: AgentStatus = reason === 'answer' ? 'done' : reason === 'aborted' ? 'stopped' : 'fail'
  return { ...b, agents: b.agents.map(a => (a.id === id ? { ...a, status, endedAt: at } : a)) }
}

export const startTurn = (b: Board, at: number, ctx: Ctx | null): Board => ({
  ...b,
  running: true,
  now: at,
  turnStart: at,
  turnTools: 0,
  turnCount: b.turnCount + 1,
  ctx: ctx ?? b.ctx,
  costAtStart: ctx?.usd ?? b.ctx?.usd ?? null,
  turnCtxStart: (ctx ?? b.ctx)?.pct ?? null,
})

export type Usage = { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number; model?: string }

export const toTokens = (u: Usage | null | undefined): Tokens | null =>
  u ? { input: u.input_tokens ?? 0, output: u.output_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0 } : null

const addTokens = (a: Tokens, b: Tokens | null): Tokens =>
  b ? { input: a.input + b.input, output: a.output + b.output, cacheRead: a.cacheRead + b.cacheRead, cacheWrite: a.cacheWrite + b.cacheWrite } : a

export const endTurn = (b: Board, at: number, ms: number | null, reason: string, ctx: Ctx | null, usage: Usage | null = null): Board => {
  const c = ctx ?? b.ctx
  const tokens = toTokens(usage)
  const model = usage?.model ?? b.model
  const turn: Turn = {
    at,
    ms: ms ?? Math.max(0, at - b.turnStart),
    usd: c?.usd != null && b.costAtStart !== null ? Math.max(0, c.usd - b.costAtStart) : null,
    tools: b.turnTools,
    ctxDelta: c?.pct != null && b.turnCtxStart !== null ? c.pct - b.turnCtxStart : null,
    reason,
    model,
    tokens,
  }
  return { ...b, running: false, now: at, ctx: c, model, tokens: addTokens(b.tokens, tokens), turns: tail(b.turns, turn, 40) }
}

// The engine's /context breakdown, reduced to what the dashboard draws.
export const toComposition = (bd: any, at: number): Composition | null => {
  if (!bd || !Array.isArray(bd.categories)) return null
  return {
    model: String(bd.model ?? ''),
    total: Number(bd.totalTokens) || 0,
    max: Number(bd.maxTokens) || 0,
    compactAt: typeof bd.autoCompactThreshold === 'number' ? bd.autoCompactThreshold : null,
    autoCompact: Boolean(bd.isAutoCompactEnabled),
    slices: bd.categories
      .filter((c: any) => !c.isDeferred && Number(c.tokens) > 0)
      .map((c: any) => ({ name: String(c.name), tokens: Number(c.tokens), kind: String(c.kind ?? '') })),
    memory: (bd.memoryFiles ?? []).map((m: any) => ({ path: String(m.path), tokens: Number(m.tokens) || 0 })).sort((x: any, y: any) => y.tokens - x.tokens),
    mcp: (bd.mcpTools ?? []).map((t: any) => ({ name: String(t.name), server: String(t.serverName), tokens: Number(t.tokens) || 0, loaded: Boolean(t.isLoaded) })).sort((x: any, y: any) => y.tokens - x.tokens),
    at,
  }
}

// Where compaction kicks in, as a percent of the window; 100 when auto-compact is off or unknown.
export const compactPct = (b: Board) => {
  const c = b.comp
  if (!c || !c.autoCompact || !c.compactAt || !c.max) return 100
  return Math.min(100, (c.compactAt / c.max) * 100)
}

export const cacheHit = (t: Tokens) => {
  const read = t.input + t.cacheRead + t.cacheWrite
  return read ? t.cacheRead / read : null
}

// Output tokens per second over the recent turns that reported usage.
export const throughput = (b: Board) => {
  const recent = b.turns.filter(t => t.tokens && t.ms > 0).slice(-8)
  const out = recent.reduce((s, t) => s + (t.tokens?.output ?? 0), 0)
  const ms = recent.reduce((s, t) => s + t.ms, 0)
  return ms > 0 && out > 0 ? out / (ms / 1000) : null
}

export const withCtx = (b: Board, ctx: Ctx): Board => {
  const last = b.ctxHist[b.ctxHist.length - 1]
  const pct = ctx.pct
  return { ...b, ctx, ctxHist: pct != null && pct !== last ? tail(b.ctxHist, pct, 60) : b.ctxHist }
}

export const withVitals = (b: Board, v: Vitals, at: number): Board => ({
  ...b,
  vitals: v,
  now: at,
  tempHist: v.tempC !== null ? tail(b.tempHist, v.tempC, 90) : b.tempHist,
})

export const compacted = (b: Board): Board => ({
  ...b,
  compactions: b.compactions + 1,
  alerts: b.alerts.filter(k => !k.startsWith('ctx')),
})

// ---------------------------------------------------------------- analytics

export const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0

export type ToolRow = { tool: string; n: number; okPct: number; avg: number; p95: number; fail: number; denied: number }

export const toolBoard = (b: Board): ToolRow[] =>
  Object.entries(b.stats)
    .map(([tool, s]) => {
      const sorted = [...s.durs].sort((x, y) => x - y)
      const ran = s.n - s.denied
      return {
        tool,
        n: s.n,
        okPct: s.n ? Math.round((s.ok / s.n) * 100) : 100,
        avg: ran ? Math.round(s.totalMs / ran) : 0,
        p95: pct(sorted, 95),
        fail: s.fail,
        denied: s.denied,
      }
    })
    .sort((x, y) => y.n - x.n)

export type FileRow = { path: string; read: number; edit: number; write: number; touches: number; last: number }

export const fileBoard = (b: Board): FileRow[] =>
  Object.entries(b.files)
    .map(([path, f]) => ({ path, ...f, touches: f.read + f.edit + f.write }))
    .sort((x, y) => y.edit + y.write - (x.edit + x.write) || y.touches - x.touches)

export const slowest = (b: Board, n = 5): Call[] =>
  b.calls.filter(c => c.ms !== null).sort((x, y) => (y.ms ?? 0) - (x.ms ?? 0)).slice(0, n)

// Context runway: average growth per turn over the last turns that grew, and the turns left before compaction (or a full window).
export const forecast = (b: Board): { burn: number | null; turnsLeft: number | null; ceiling: number } => {
  const ceiling = compactPct(b)
  const grew = b.turns.map(t => t.ctxDelta).filter((d): d is number => d !== null && d > 0).slice(-6)
  const pctNow = b.ctx?.pct
  if (!grew.length || pctNow == null) return { burn: null, turnsLeft: null, ceiling }
  const burn = grew.reduce((s, d) => s + d, 0) / grew.length
  return { burn, turnsLeft: Math.max(0, Math.floor((ceiling - pctNow) / burn)), ceiling }
}

export const costRate = (b: Board): { perHour: number | null; perTurn: number | null; projected: number | null } => {
  const usd = b.ctx?.usd
  if (usd == null) return { perHour: null, perTurn: null, projected: null }
  const hours = Math.max((b.now - b.startedAt) / 3_600_000, 1 / 60)
  const costed = b.turns.filter(t => t.usd !== null)
  const perTurn = costed.length ? costed.reduce((s, t) => s + (t.usd ?? 0), 0) / costed.length : null
  return { perHour: usd / hours, perTurn, projected: perTurn !== null ? usd + perTurn * 10 : null }
}

export const errorRate = (b: Board) => {
  const done = Object.values(b.stats).reduce((s, x) => s + x.n, 0)
  const bad = Object.values(b.stats).reduce((s, x) => s + x.fail, 0)
  return done ? bad / done : 0
}

export type Health = { score: number; grade: 'A' | 'B' | 'C' | 'D' | 'F'; reasons: string[] }

export const health = (b: Board, cfg: Cfg): Health => {
  const reasons: string[] = []
  let score = 100
  const ctxPct = b.ctx?.pct ?? 0
  if (ctxPct > 60) {
    const hit = Math.round(((ctxPct - 60) / 40) * 30)
    score -= hit
    reasons.push(`context ${Math.round(ctxPct)}%`)
  }
  const er = errorRate(b)
  if (er > 0.05) {
    score -= Math.min(25, Math.round(er * 100))
    reasons.push(`${Math.round(er * 100)}% tool errors`)
  }
  const t = b.vitals?.tempC
  if (t != null && t > cfg.maxTempC - 10) {
    score -= t > cfg.maxTempC ? 20 : 10
    reasons.push(`${Math.round(t)}C`)
  }
  if (b.gate.deny > 0) {
    score -= Math.min(10, b.gate.deny * 2)
    reasons.push(`${b.gate.deny} denied`)
  }
  const worst = Math.max(0, ...(b.ctx?.limits ?? []).map(l => l.pct))
  if (worst > 80) {
    score -= 15
    reasons.push(`limit ${worst}%`)
  }
  if (cfg.budgetUsd > 0 && (b.ctx?.usd ?? 0) > cfg.budgetUsd) {
    score -= 10
    reasons.push('over budget')
  }
  score = Math.max(0, score)
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F'
  return { score, grade, reasons }
}

export const compliance = (b: Board): number | null => (b.bash.total ? Math.round((b.bash.prefixed / b.bash.total) * 100) : null)

// Threshold crossings worth a toast, each raised once (context ones re-arm after a compaction).
export const newAlerts = (b: Board, cfg: Cfg): { key: string; text: string }[] => {
  const out: { key: string; text: string }[] = []
  const add = (key: string, when: boolean, text: string) => {
    if (when && !b.alerts.includes(key)) out.push({ key, text })
  }
  const c = b.ctx?.pct
  add('ctx70', c != null && c >= 70, `Context at ${Math.round(c ?? 0)}%: consider /compact soon`)
  add('ctx85', c != null && c >= 85, `Context at ${Math.round(c ?? 0)}%: compaction is near`)
  const t = b.vitals?.tempC
  add('hot', t != null && t > cfg.maxTempC, `Laptop at ${Math.round(t ?? 0)}C: heavy jobs are paused`)
  const usd = b.ctx?.usd ?? 0
  if (cfg.budgetUsd > 0) {
    add('budget80', usd >= cfg.budgetUsd * 0.8, `Session cost $${usd.toFixed(2)}: 80% of the $${cfg.budgetUsd} budget`)
    add('budget100', usd >= cfg.budgetUsd, `Session cost $${usd.toFixed(2)}: over the $${cfg.budgetUsd} budget`)
  }
  for (const l of b.ctx?.limits ?? []) add(`limit-${l.kind}`, l.pct >= 90, `Rate limit ${l.kind} at ${l.pct}%`)
  return out
}

export const refuse = (v: Vitals | null, cfg: Cfg): string | null => {
  if (!cfg.guard || v === null) return null
  if (v.tempC !== null && v.tempC > cfg.maxTempC) return `laptop at ${v.tempC.toFixed(0)}C (limit ${cfg.maxTempC}C)`
  if (v.discharging && v.pct !== null && v.pct < cfg.minBatteryPct) return `battery ${v.pct}% and discharging`
  return null
}

// ---------------------------------------------------------------- formatting

export const short = (s: unknown, n: number) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}

export const shortPath = (p: string, n: number) => {
  if (p.length <= n) return p
  const parts = p.split('/')
  let out = parts.pop() ?? p
  while (parts.length && out.length + (parts[parts.length - 1] ?? '').length + 2 <= n) out = `${parts.pop()}/${out}`
  return `…/${out}`.slice(-n)
}

export const dur = (ms: number | null | undefined) => {
  if (ms == null || ms < 0) return '-'
  if (ms < 1000) return `${Math.round(ms)}ms`
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m}m${String(s % 60).padStart(2, '0')}s` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`
}

export const kfmt = (n: number | null | undefined) =>
  n == null ? '?' : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)

export const money = (n: number | null | undefined) => (n == null ? '?' : n < 10 ? `$${n.toFixed(2)}` : `$${n.toFixed(1)}`)

export const until = (iso: string | null, now: number) => {
  if (!iso) return ''
  const t = Date.parse(iso)
  // A gap past 8 days means `now` is not wall-clock time; show nothing rather than nonsense.
  return Number.isFinite(t) && t > now && t - now < 8 * 86_400_000 ? dur(t - now) : ''
}

export const describe = (e: Record<string, unknown>) =>
  short(e.command ?? e.file_path ?? e.notebook_path ?? e.pattern ?? e.path ?? e.url ?? e.query ?? e.description ?? e.prompt ?? '', 70)

// ---------------------------------------------------------------- report

export const report = (b: Board, cfg: Cfg, life: Lifetime | null): string => {
  const h = health(b, cfg)
  const f = forecast(b)
  const r = costRate(b)
  const rows = toolBoard(b).slice(0, 8)
  const files = fileBoard(b).slice(0, 8)
  const lines = [
    `# Embermeter session report`,
    ``,
    `- Health: **${h.grade}** (${h.score}/100)${h.reasons.length ? ` · ${h.reasons.join(', ')}` : ''}`,
    `- Duration: ${dur(b.now - b.startedAt)} · ${b.turnCount} turns · ${Object.values(b.stats).reduce((s, x) => s + x.n, 0)} tool calls`,
    `- Context: ${kfmt(b.ctx?.tokens)} / ${kfmt(b.ctx?.window)} (${b.ctx?.pct != null ? Math.round(b.ctx.pct) : '?'}%)${f.turnsLeft !== null ? ` · ~${f.turnsLeft} turns of runway` : ''} · ${b.compactions} compactions`,
    `- Cost: ${money(b.ctx?.usd)}${r.perHour !== null ? ` · ${money(r.perHour)}/h` : ''}${r.perTurn !== null ? ` · ${money(r.perTurn)}/turn` : ''}`,
    `- Tokens: ${kfmt(b.tokens.input)} in · ${kfmt(b.tokens.output)} out · ${kfmt(b.tokens.cacheRead)} cache read · ${kfmt(b.tokens.cacheWrite)} cache write${cacheHit(b.tokens) !== null ? ` · ${Math.round((cacheHit(b.tokens) ?? 0) * 100)}% cache hit` : ''}${throughput(b) !== null ? ` · ${Math.round(throughput(b) ?? 0)} tok/s` : ''}${b.model ? ` · ${b.model}` : ''}`,
    b.comp ? `- Context mix: ${b.comp.slices.slice().sort((x, y) => y.tokens - x.tokens).slice(0, 5).map(s => `${s.name} ${kfmt(s.tokens)}`).join(' · ')}` : '',
    `- Gate: ${b.gate.allow} allowed · ${b.gate.ask} asked · ${b.gate.deny} denied · ${b.guardBlocks} heat-guard blocks`,
    cfg.prefix && compliance(b) !== null ? `- \`${cfg.prefix}\` prefix compliance: ${compliance(b)}% of ${b.bash.total} commands` : '',
    `- Subagents: ${b.agents.length} (${b.agents.filter(a => a.status === 'done').length} done)`,
    life ? `- All time: ${life.sessions} sessions · ${money(life.usd)} · ${life.turns} turns · ${life.calls} tool calls` : '',
    ``,
    rows.length ? `| Tool | Calls | OK | Avg | p95 |\n|---|---:|---:|---:|---:|\n${rows.map(t => `| ${t.tool} | ${t.n} | ${t.okPct}% | ${dur(t.avg)} | ${dur(t.p95)} |`).join('\n')}` : '',
    ``,
    files.length ? `| File | Reads | Edits | Writes |\n|---|---:|---:|---:|\n${files.map(x => `| ${shortPath(x.path, 60)} | ${x.read} | ${x.edit} | ${x.write} |`).join('\n')}` : '',
  ]
  return lines.filter((l, i, all) => l !== '' || all[i - 1] !== '').join('\n').trim()
}
