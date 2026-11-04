import { expect, test, type Page } from 'playwright/test'
import { seedWeekend } from './seed'

test.beforeEach(seedWeekend)

async function join(page: Page, code = 'ABC123') {
  await page.goto('/')
  await page.getByLabel('Jouw naam').fill('Eva')
  await page.getByLabel('Code van het weekend').fill(code)
  await page.getByRole('button', { name: 'Meedoen' }).click()
}

test('joining with the code gives access to the weekend data', async ({ page }) => {
  await join(page)
  await expect(page.getByRole('heading', { name: 'Emulator weekend' })).toBeVisible()
  await page.getByRole('button', { name: /Spellen/ }).click()
  await expect(page.getByText('Catan')).toBeVisible()
  await expect(page.getByText('Neemt mee: Seed')).toBeVisible()
})

test('an unknown code is rejected and nothing is readable', async ({ page }) => {
  await join(page, 'ZZZ999')
  await expect(page.getByText('Geen weekend gevonden met code ZZZ999.')).toBeVisible()
  await expect(page.getByRole('navigation')).toHaveCount(0)
})

test('a signed-in stranger that opens the weekend directly is turned away by the rules', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('app_eventId', 'e1'))
  await page.goto('/')
  await expect(page.getByText('Geen toegang tot dit weekend')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Meedoen' })).toBeVisible()
})

test('hearts and new games survive a reload (real writes, real rules)', async ({ page }) => {
  await join(page)
  await page.getByRole('button', { name: /Spellen/ }).click()
  await page.getByLabel('Wil ik spelen').click()
  await expect(page.getByLabel('Wil ik spelen')).toHaveText('♥')

  await page.getByRole('button', { name: '+ Spel' }).click()
  await page.getByLabel('Naam').fill('Wingspan')
  await page.getByRole('button', { name: 'Opslaan' }).click()
  await expect(page.getByText('Wingspan toegevoegd')).toBeVisible()

  await page.reload()
  await expect(page.getByText('Wingspan')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Mijn ♥ \(2\)/ })).toBeVisible()
})

test('the planning is shared between members', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage()
  const b = await (await browser.newContext()).newPage()
  await join(a)
  await join(b)
  await a.getByRole('button', { name: /Planning/ }).click()
  await a.getByRole('button', { name: '+ Plannen' }).click()
  await a.getByLabel('Titel').fill('Pizza')
  await a.getByRole('button', { name: 'Opslaan' }).click()
  await b.getByRole('button', { name: /Planning/ }).click()
  await expect(b.locator('.card .title', { hasText: 'Pizza' })).toBeVisible()
})
