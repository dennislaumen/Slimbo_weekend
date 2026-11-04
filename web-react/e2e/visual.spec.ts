/**
 * Pixel-parity check: renders the legacy HTML app and the React app with the same fixture
 * and the same fixed clock, in the same state, and requires identical screenshots.
 */
import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { stubLegacyFirebase } from './legacy-stub'

const LEGACY = 'http://localhost:4173/app/index.html'
const REACT = 'http://localhost:4174/'
const NOW = new Date('2027-01-15T12:07:00+01:00')
const OUT = path.resolve('test-results/visual')
/** States that deliberately differ from the legacy app, with the reason. Empty on purpose. */
const INTENTIONAL: Record<string, string> = {}

interface Scenario {
  name: string
  tab?: string
  eventId?: string | null
  steps?: (p: Page) => Promise<void>
}

const scenarios: Scenario[] = [
  { name: 'login', eventId: null },
  { name: 'nu', tab: 'nu' },
  { name: 'planning', tab: 'planning' },
  { name: 'planning-editor', tab: 'planning', steps: async (p) => { await p.locator('#planNew').click() } },
  { name: 'activity-menu', tab: 'planning', steps: async (p) => { await p.getByLabel('Meer').first().click() } },
  { name: 'spellen', tab: 'spellen' },
  { name: 'spellen-filters', tab: 'spellen', steps: async (p) => { await p.getByRole('button', { name: /^Filters/ }).click() } },
  { name: 'spellen-iedereen', tab: 'spellen', steps: async (p) => {
    await p.getByRole('button', { name: /^Filters/ }).click()
    await p.locator('#gOwner').selectOption({ label: 'Iedereen (meegebracht)' })
  } },
  { name: 'spellen-gaat-mee', tab: 'spellen', steps: async (p) => { await p.getByRole('button', { name: /^Gaat mee/ }).click() } },
  { name: 'game-editor', tab: 'spellen', steps: async (p) => { await p.locator('#gameNew').click() } },
  { name: 'game-editor-existing', tab: 'spellen', steps: async (p) => { await p.locator('[data-gedit="g2"]').click() } },
  { name: 'meer', tab: 'meer', steps: async (p) => { for (const s of await p.locator('details summary').all()) await s.click() } },
]

async function open(page: Page, url: string, legacy: boolean, s: Scenario) {
  await page.clock.setFixedTime(NOW)
  if (legacy) await stubLegacyFirebase(page)
  await page.addInitScript(([tab, eventId]) => {
    if (eventId) localStorage.setItem('app_eventId', eventId)
    localStorage.setItem('app_tab', tab)
  }, [s.tab ?? 'nu', s.eventId === undefined ? 'e1' : s.eventId] as const)
  await page.goto(url)
  await page.locator(s.eventId === null ? '#lGo' : 'nav.tabs').waitFor()
  await s.steps?.(page)
  await page.waitForTimeout(150)
}

function compare(name: string, a: Buffer, b: Buffer) {
  const x = PNG.sync.read(a)
  const y = PNG.sync.read(b)
  expect([y.width, y.height], `${name}: size`).toEqual([x.width, x.height])
  const diff = new PNG({ width: x.width, height: x.height })
  const changed = pixelmatch(x.data, y.data, diff.data, x.width, x.height, { threshold: 0.02 })
  if (changed) fs.writeFileSync(path.join(OUT, `${name}-diff.png`), PNG.sync.write(diff))
  return changed
}

fs.mkdirSync(OUT, { recursive: true })
for (const [label, viewport, colorScheme] of [
  ['phone', { width: 390, height: 844 }, 'light'],
  ['desktop', { width: 1100, height: 800 }, 'light'],
  ['phone-dark', { width: 390, height: 844 }, 'dark'],
] as const) {
  test.describe(label, () => {
    test.use({ viewport, colorScheme })
    for (const s of scenarios) {
      test(s.name, async ({ browser }) => {
        const shots: Buffer[] = []
        for (const [url, legacy] of [[LEGACY, true], [REACT, false]] as const) {
          const ctx = await browser.newContext({ viewport, colorScheme, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam', serviceWorkers: 'block' })
          const page = await ctx.newPage()
          await open(page, url, legacy, s)
          shots.push(await page.screenshot({ fullPage: false }))
          fs.writeFileSync(path.join(OUT, `${label}-${s.name}-${legacy ? 'legacy' : 'react'}.png`), shots.at(-1)!)
          await ctx.close()
        }
        test.skip(s.name in INTENTIONAL, INTENTIONAL[s.name])
        const changed = compare(`${label}-${s.name}`, shots[0]!, shots[1]!)
        expect(changed, `${changed} pixels differ from the legacy app; see ${OUT}/${label}-${s.name}-diff.png`).toBe(0)
      })
    }
  })
}
