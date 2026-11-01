import { expect, test } from 'claude-code/testing'

import { emptyBoard, endTurn, finishCall, parseConfig, startCall, startTurn } from '../hooks/core'
import { card, contextPage, drawContext, spend, tools } from '../hooks/draw'
import type { Board } from '../types'

const ctx = (pct: number, usd: number) => ({ tokens: pct * 2000, window: 200000, pct, usd, limits: [] })

const session = (): Board => {
  let b = emptyBoard(0)
  b = startTurn(b, 0, ctx(10, 0))
  b = startCall(b, { id: 'a', tool: 'Read', detail: '<x>.ts', status: 'run', agent: false, at: 10, ms: null }, {}, '')
  b = finishCall(b, 'a', 'ok', 20, 2400)
  b = endTurn(b, 1000, 1000, 'answer', ctx(14, 0.8), { model: 'claude-<opus>', output_tokens: 400 })
  return { ...b, now: Date.UTC(2026, 10, 1, 12) }
}

test('the spend page draws the waterfall, models and days at both widths', async () => {
  const cfg = parseConfig({ budgetUsd: 2 })
  const life = { sessions: 1, usd: 0.8, turns: 1, calls: 1, days: { '2026-11-01': { sessions: 1, usd: 0.8, turns: 1, calls: 1 } } }
  for (const cols of [90, 50]) {
    const out = spend(drawContext(cfg, null, cols), session(), cfg, life)
    expect(out).toContain('COST WATERFALL')
    expect(out).toContain('total $0.80 of $2.00')
    expect(out).toContain('LAST 30 DAYS')
    // Model names are user-visible text and must arrive escaped.
    expect(out).toContain('claude-&lt;opus&gt;')
    expect(out.includes('<opus>')).toBe(false)
  }
  expect(spend(drawContext(cfg, null, 90), emptyBoard(0), cfg, null)).toContain('no costed turns yet')
})

test('tools and context pages show the context fed back by each tool', async () => {
  const cfg = parseConfig({})
  const D = drawContext(cfg, null, 90)
  expect(tools(D, session())).toContain('ctx fed')
  expect(contextPage(D, session())).toContain('FED BACK BY TOOLS')
})

test('the session card is a static picture with escaped text', async () => {
  const cfg = parseConfig({})
  const b = { ...session(), branch: 'fix/<script>' }
  const out = card(drawContext(cfg, null, 90), b, cfg)
  expect(out).toContain('width="600"')
  expect(out).toContain('fix/&lt;script&gt;')
  expect(out.includes('<animate')).toBe(false)
})
