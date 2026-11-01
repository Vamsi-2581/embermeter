import { expect, test } from 'claude-code/testing'

import {
  cacheHit,
  compactPct,
  throughput,
  toComposition,
  compliance,
  countCpus,
  emptyBoard,
  endAgent,
  endTurn,
  fileBoard,
  finishCall,
  forecast,
  health,
  newAlerts,
  normalize,
  parseConfig,
  pickTemp,
  refuse,
  report,
  shortPath,
  spawnAgent,
  startCall,
  startTurn,
  toolBoard,
  withCtx,
} from '../hooks/core'
import type { Call } from '../types'

const cfg = parseConfig({})
const call = (id: string, tool: string, at = 1000): Call => ({ id, tool, detail: '', status: 'run', agent: false, at, ms: null })
const ctx = (pct: number, usd = 0) => ({ tokens: pct * 2000, window: 200000, pct, usd, limits: [] })

test('config falls back to safe defaults and rejects a bad pattern', async () => {
  const c = parseConfig({ maxTempC: 9999, heavyPattern: '(', commandPrefix: ' rtk ' })
  expect(c.maxTempC).toBe(80)
  expect(c.heavy.test('npm run build')).toBe(true)
  expect(c.prefix).toBe('rtk')
})

test('a stored board from an older version is filled in', async () => {
  const b = normalize({ turnCount: 3, gate: { allow: 2 } })
  expect(b.turnCount).toBe(3)
  expect(b.gate.deny).toBe(0)
  expect(b.activity.length).toBe(1)
})

test('tool stats count outcomes, durations and files', async () => {
  let b = emptyBoard(0)
  b = startCall(b, call('a', 'Edit'), { file: '/src/x.ts' }, 'rtk')
  b = finishCall(b, 'a', 'ok', 200)
  b = startCall(b, call('b', 'Edit'), { file: '/src/x.ts' }, 'rtk')
  b = finishCall(b, 'b', 'fail', 400)
  b = startCall(b, call('c', 'Read'), { file: '/src/y.ts' }, 'rtk')
  b = finishCall(b, 'c', 'ok', 50)
  const edit = toolBoard(b).find(r => r.tool === 'Edit')
  expect(edit?.n).toBe(2)
  expect(edit?.okPct).toBe(50)
  expect(edit?.avg).toBe(300)
  expect(fileBoard(b)[0]?.path).toBe('/src/x.ts')
  expect(fileBoard(b)[0]?.edit).toBe(2)
})

test('prefix compliance scores Bash commands', async () => {
  let b = emptyBoard(0)
  b = startCall(b, call('a', 'Bash'), { command: 'rtk git status' }, 'rtk')
  b = startCall(b, call('b', 'Bash'), { command: 'git status' }, 'rtk')
  expect(compliance(b)).toBe(50)
})

test('turns record cost and context growth; the forecast reads the runway', async () => {
  let b = withCtx(emptyBoard(0), ctx(40, 1))
  b = startTurn(b, 1000, ctx(40, 1))
  b = endTurn(b, 5000, 4000, 'answer', ctx(50, 1.5))
  b = startTurn(b, 6000, ctx(50, 1.5))
  b = endTurn(b, 9000, 3000, 'answer', ctx(60, 2))
  expect(b.turns.length).toBe(2)
  expect(b.turns[0]?.usd).toBe(0.5)
  expect(b.turns[0]?.ctxDelta).toBe(10)
  const f = forecast(b)
  expect(f.burn).toBe(10)
  expect(f.turnsLeft).toBe(4)
})

test('agents move from running to done and count their tools', async () => {
  let b = spawnAgent(emptyBoard(0), { id: 'x', type: 'Explore', desc: '', model: '', status: 'run', startedAt: 0, endedAt: null, tools: 0 })
  b = startCall(b, { ...call('t', 'Grep'), agent: true }, { agentId: 'x' }, '')
  b = endAgent(b, 'x', 'answer', 5000)
  expect(b.agents[0]?.status).toBe('done')
  expect(b.agents[0]?.tools).toBe(1)
})

test('health grades drop with full context and heat', async () => {
  const calm = health(withCtx(emptyBoard(0), ctx(20)), cfg)
  expect(calm.grade).toBe('A')
  const hot = { ...withCtx(emptyBoard(0), ctx(98)), vitals: { tempC: 95, pct: 50, discharging: false, load1: 1, memPct: 40 } }
  expect(['C', 'D', 'F']).toContain(health(hot, cfg).grade)
})

test('alerts fire once per crossing', async () => {
  const b = withCtx(emptyBoard(0), ctx(90))
  const first = newAlerts(b, cfg).map(a => a.key)
  expect(first).toContain('ctx70')
  expect(first).toContain('ctx85')
  expect(newAlerts({ ...b, alerts: first }, cfg).length).toBe(0)
})

test('heat guard refuses only when hot or low on battery', async () => {
  const v = { tempC: 60, pct: 80, discharging: false, load1: 1, memPct: 30 }
  expect(refuse(v, cfg)).toBe(null)
  expect(refuse({ ...v, tempC: 91 }, cfg)).toContain('91C')
  expect(refuse({ ...v, pct: 10, discharging: true }, cfg)).toContain('battery')
  expect(refuse({ ...v, tempC: 91 }, parseConfig({ guard: false }))).toBe(null)
})

test('the heavy pattern matches commands, not paths or flags', async () => {
  for (const c of ['npm test', 'rtk npm run build', 'npm ci', 'npx vitest run', 'prisma migrate dev', 'pnpm install']) expect(cfg.heavy.test(c)).toBe(true)
  for (const c of ['sed -i s/a/b/ tests/core.test.ts', 'cat vite.config.ts', 'git commit --ci', 'ls build/', 'rtk git status']) expect(cfg.heavy.test(c)).toBe(false)
})

test('temperature prefers CPU sensors over ACPI and Wi-Fi zones', async () => {
  const zones = [
    { type: 'acpitz', milli: 89000 },
    { type: 'x86_pkg_temp', milli: 70000 },
    { type: 'TCPU', milli: 68000 },
    { type: 'iwlwifi_1', milli: 51000 },
  ]
  expect(pickTemp(zones)).toBe(70)
  expect(pickTemp([{ type: 'acpitz', milli: 55000 }, { type: 'x', milli: null }])).toBe(55)
  expect(pickTemp([])).toBe(null)
})

test('CPU count reads the online range list', async () => {
  expect(countCpus('0-15')).toBe(16)
  expect(countCpus('0,2-5\n')).toBe(5)
  expect(countCpus('')).toBe(null)
})

test('long paths keep their tail', async () => {
  expect(shortPath('/home/me/project/src/components/Button.tsx', 24).endsWith('Button.tsx')).toBe(true)
})

test('the report is markdown with the key figures', async () => {
  let b = withCtx(emptyBoard(0), ctx(30, 0.25))
  b = startCall(b, call('a', 'Bash'), { command: 'rtk ls' }, 'rtk')
  b = finishCall(b, 'a', 'ok', 100)
  const r = report(b, cfg, { sessions: 2, usd: 3, turns: 10, calls: 40 })
  expect(r).toContain('# Embermeter session report')
  expect(r).toContain('| Bash | 1 |')
  expect(r).toContain('All time: 2 sessions')
})

test('turn usage adds up tokens, cache hit and throughput', async () => {
  let b = startTurn(emptyBoard(0), 0, null)
  b = endTurn(b, 10_000, 10_000, 'answer', null, { input_tokens: 100, output_tokens: 500, cache_read_input_tokens: 800, cache_creation_input_tokens: 100, model: 'claude-x' })
  expect(b.tokens.output).toBe(500)
  expect(b.model).toBe('claude-x')
  expect(cacheHit(b.tokens)).toBe(0.8)
  expect(throughput(b)).toBe(50)
})

test('the context breakdown becomes a composition, and the runway ends at auto-compact', async () => {
  const comp = toComposition(
    {
      model: 'claude-x',
      totalTokens: 60000,
      maxTokens: 200000,
      autoCompactThreshold: 160000,
      isAutoCompactEnabled: true,
      categories: [
        { name: 'System prompt', tokens: 3000, isDeferred: false, kind: 'system' },
        { name: 'Messages', tokens: 57000, isDeferred: false, kind: 'messages' },
        { name: 'Deferred', tokens: 9000, isDeferred: true, kind: 'tools' },
      ],
      memoryFiles: [{ path: '/a/CLAUDE.md', tokens: 900 }],
      mcpTools: [],
    },
    5,
  )
  expect(comp?.slices.length).toBe(2)
  expect(comp?.memory[0]?.tokens).toBe(900)
  let b = { ...withCtx(emptyBoard(0), ctx(50)), comp }
  expect(compactPct(b)).toBe(80)
  b = startTurn(b, 0, ctx(50))
  b = endTurn(b, 1000, 1000, 'answer', ctx(60))
  expect(forecast(b).turnsLeft).toBe(2)
  expect(toComposition(null, 0)).toBe(null)
})
