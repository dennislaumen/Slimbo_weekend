import { cleanup, renderHook, screen } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { createActions } from '../data/actions'
import { scenarioNames, scenarios } from '../data/fake/scenarios'
import { renderApp, writes } from '../test/render'
import { resetFake } from '../data/fake/firestore'
import { usePresence } from './usePresence'

describe('scenarios for dev:fake', () => {
  it.each(scenarioNames)('"%s" renders on every tab without crashing', async (name) => {
    for (const tab of ['nu', 'planning', 'spellen', 'meer'] as const) {
      await renderApp({ fixture: scenarios[name]!(), tab })
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      cleanup()
    }
  })
})

describe('usePresence', () => {
  it('reports the device a moment after opening and then every minute', () => {
    vi.useFakeTimers()
    resetFake()
    const { unmount } = renderHook(() => usePresence(createActions('e1', 'u1')))
    expect(writes()).toEqual([])
    vi.advanceTimersByTime(1500)
    expect(writes()).toHaveLength(1)
    expect(writes()[0]).toEqual(['set', 'events/e1/members/u1', expect.objectContaining({ platform: 'webapp', lastOpenedAt: expect.any(Number) })])
    vi.advanceTimersByTime(60_000)
    expect(writes()).toHaveLength(2)
    expect(writes()[1]![2]).not.toHaveProperty('lastOpenedAt')
    unmount()
    vi.advanceTimersByTime(120_000)
    expect(writes()).toHaveLength(2)
    vi.useRealTimers()
  })

  it('does nothing when disabled', () => {
    vi.useFakeTimers()
    resetFake()
    renderHook(() => usePresence(createActions('e1', 'u1'), false))
    vi.advanceTimersByTime(120_000)
    expect(writes()).toEqual([])
    vi.useRealTimers()
  })
})

describe('legacy stub', () => {
  it('still matches the Firebase SDK version the legacy app loads', () => {
    const html = fs.readFileSync(path.resolve('../web/app/index.html'), 'utf8')
    const stub = fs.readFileSync(path.resolve('e2e/legacy-stub.ts'), 'utf8')
    const version = /firebasejs\/([\d.]+)\//.exec(html)?.[1]
    expect(stub).toContain(`firebasejs/${version}/`)
  })
})
