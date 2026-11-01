import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'embermeter',
  component: 'Pane',
  requestId: 'embermeter',
  props: {
    title: 'Embermeter',
    isFocused: false,
    bodyColumns: 66,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

const engine = (on: any) => {
  on('command.register', () => ({ value: { command: 'embermeter' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  on('clock.now', () => ({ value: 1000 }))
  on('clock.every', () => ({ value: undefined }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200000, tokens: 40000, percent: 20 }, rateLimits: [], cost: { usd: 0.5 } } }))
  on('fs.read', () => ({ value: '50000' }))
  on('store.get', () => ({ value: null }))
  on('store.set', () => ({ value: undefined }))
}

test('the pane draws its tabs and records a tool call, on every surface', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'vscode', isInteractive: true })
  await $.tool.call({ tool: 'Bash', command: 'rtk git status' })

  for (const surface of ['vscode', 'desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Button', key: 'tab-overview' })).toBeTruthy()
    expect(await ui.find({ type: 'Button', key: 'copy' })).toBeTruthy()
    await ui.unmount()
  }
})

test('the tools tab lists the call', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'vscode', isInteractive: true })
  await $.tool.call({ tool: 'Bash', command: 'rtk git status' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'tab-tools' })
  const row = await ui.find({ type: 'Text', text: /Bash rtk git status/ })
  expect(row).toBeTruthy()
  await ui.unmount()
})
