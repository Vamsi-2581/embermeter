export type Vitals = {
  tempC: number | null
  pct: number | null
  discharging: boolean
  load1: number | null
  memPct: number | null
}

export type Limit = { kind: string; pct: number; resetsAt: string | null }

export type Ctx = {
  tokens: number | null
  window: number | null
  pct: number | null
  usd: number | null
  limits: Limit[]
}

export type CallStatus = 'run' | 'ok' | 'denied' | 'fail'

export type Call = {
  id: string
  tool: string
  detail: string
  status: CallStatus
  agent: boolean
  at: number
  ms: number | null
}

// `out`: estimated tokens the tool's results fed back into the context (absent on boards stored before it existed).
export type ToolStat = { n: number; ok: number; fail: number; denied: number; totalMs: number; durs: number[]; out?: number }

export type FileStat = { read: number; edit: number; write: number; last: number }

export type AgentStatus = 'run' | 'done' | 'fail' | 'stopped'

export type Agent = {
  id: string
  type: string
  desc: string
  model: string
  status: AgentStatus
  startedAt: number
  endedAt: number | null
  tools: number
}

export type Tokens = { input: number; output: number; cacheRead: number; cacheWrite: number }

export type Turn = {
  at: number
  ms: number
  usd: number | null
  tools: number
  ctxDelta: number | null
  reason: string
  model: string
  tokens: Tokens | null
}

export type Slice = { name: string; tokens: number; kind: string }

export type Composition = {
  model: string
  total: number
  max: number
  compactAt: number | null
  autoCompact: boolean
  slices: Slice[]
  memory: { path: string; tokens: number }[]
  mcp: { name: string; server: string; tokens: number; loaded: boolean }[]
  at: number
}

export type ModelStat = { turns: number; usd: number; input: number; output: number }

export type LogKind ='info' | 'done' | 'warn' | 'error'

export type LogLine = { at: number; who: string; text: string; kind: LogKind }

export type Board = {
  startedAt: number
  now: number
  vitals: Vitals | null
  ctx: Ctx | null
  comp: Composition | null
  tokens: Tokens
  model: string
  running: boolean
  turnStart: number
  turnTools: number
  turnCtxStart: number | null
  costAtStart: number | null
  turns: Turn[]
  turnCount: number
  models: Record<string, ModelStat>
  calls: Call[]
  stats: Record<string, ToolStat>
  files: Record<string, FileStat>
  bash: { total: number; prefixed: number }
  gate: { allow: number; ask: number; deny: number }
  agents: Agent[]
  log: LogLine[]
  ctxHist: number[]
  tempHist: number[]
  activity: number[]
  activityMinute: number
  compactions: number
  guardBlocks: number
  alerts: string[]
}

export type Tab = 'overview' | 'context' | 'spend' | 'tools' | 'files' | 'agents' | 'system' | 'log'

export type DayStat = { sessions: number; usd: number; turns: number; calls: number }

// `days`: totals per local date (YYYY-MM-DD), the most recent 60 kept.
export type Lifetime = { sessions: number; usd: number; turns: number; calls: number; days?: Record<string, DayStat> }

declare module 'claude-code' {
  interface PluginState {
    embermeter: { board: Board; tab: Tab }
  }
}
