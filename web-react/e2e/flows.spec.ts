/** Behaviour of the React app with fake Firebase: what the user sees and which writes the app sends. */
import { expect, test, type Page } from '@playwright/test'

const writes = (page: Page) => page.evaluate(() => window.__writes ?? [])
const titles = async (page: Page) => (await page.locator('[data-gedit]').allInnerTexts()).map((t) => t.replace('✎', '').trim())

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('app_eventId', 'e1')
    localStorage.setItem('app_tab', 'spellen')
  })
  await page.goto('http://localhost:4174/')
  await expect(page.locator('[data-gedit]')).toHaveCount(4)
})

test('Gaat mee and Wenslijst exclude each other', async ({ page }) => {
  await page.getByRole('button', { name: 'Gaat mee (3)' }).click()
  expect(await titles(page)).toEqual(['Azul', 'Catan', 'Party 10'])
  await page.getByRole('button', { name: 'Wenslijst (1)' }).click()
  expect(await titles(page)).toEqual(['Brass'])
  await expect(page.getByRole('button', { name: 'Gaat mee (3)' })).not.toHaveClass(/on/)
})

test('Neem ik mee filters on the own name and toggles off again', async ({ page }) => {
  await page.getByRole('button', { name: 'Neem ik mee (1)' }).click()
  expect(await titles(page)).toEqual(['Catan'])
  await page.getByRole('button', { name: 'Neem ik mee (1)' }).click()
  expect(await titles(page)).toHaveLength(4)
})

test('"Iedereen" owner filter hides the wishlist; "Filters wissen" restores it', async ({ page }) => {
  await page.getByRole('button', { name: /^Filters/ }).click()
  await page.locator('#gOwner').selectOption({ label: 'Iedereen (meegebracht)' })
  expect(await titles(page)).toEqual(['Azul', 'Catan', 'Party 10'])
  await page.getByRole('button', { name: 'Filters wissen' }).click()
  expect(await titles(page)).toHaveLength(4)
})

test('7+ players keeps only games that seat seven', async ({ page }) => {
  await page.getByRole('button', { name: /^Filters/ }).click()
  await page.getByRole('button', { name: '7+' }).click()
  expect(await titles(page)).toEqual(['Party 10'])
})

test('tapping ♥ adds and removes a game on the own list', async ({ page }) => {
  await page.locator('[data-gedit="g1"]').locator('xpath=ancestor::div[contains(@class,"card")]').getByLabel('Wil ik spelen').click()
  await page.locator('[data-gedit="g2"]').locator('xpath=ancestor::div[contains(@class,"card")]').getByLabel('Wil ik spelen').click()
  expect(await writes(page)).toEqual([
    ['update', 'events/e1/members/u1', { wants: { union: ['g1'] } }],
    ['update', 'events/e1/members/u1', { wants: { remove: ['g2'] } }],
  ])
})

test('adding a game stores owner and counts, and adds it to the own hearts', async ({ page }) => {
  await page.locator('#gameNew').click()
  await expect(page.locator('#gName')).toBeFocused()
  await page.locator('#gName').fill('Wingspan')
  await page.locator('#gMin').fill('1')
  await page.locator('#gMax').fill('5')
  await page.locator('#gSave').click()
  await expect.poll(async () => (await writes(page)).length).toBe(2)
  const [add, upd] = await writes(page)
  expect(add).toEqual(['add', 'events/e1/games', expect.objectContaining({ name: 'Wingspan', owner: 'Anna', wishlist: false, minPlayers: 1, maxPlayers: 5 })])
  expect(upd).toEqual(['update', 'events/e1/members/u1', { wants: { union: ['new1'] } }])
})

test('a duplicate game name is rejected without a write', async ({ page }) => {
  await page.locator('#gameNew').click()
  await page.locator('#gName').fill('catan')
  await page.locator('#gSave').click()
  await expect(page.locator('#toast')).toContainText('staat al in de lijst')
  expect(await writes(page)).toEqual([])
})

test('a wishlist game clears the owner', async ({ page }) => {
  await page.locator('#gameNew').click()
  await page.locator('#gName').fill('Gloomhaven')
  await page.locator('#gWishIn').check()
  await expect(page.locator('#gOwnerIn')).toHaveValue('')
  await page.locator('#gSave').click()
  await expect.poll(async () => (await writes(page)).length).toBeGreaterThan(0)
  expect((await writes(page))[0]?.[2]).toEqual(expect.objectContaining({ name: 'Gloomhaven', owner: '', wishlist: true }))
})

test('planning an activity stores it as GEPLAND with the entered title', async ({ page }) => {
  await page.getByRole('button', { name: /Planning/ }).click()
  await page.locator('#planNew').click()
  await page.locator('#eTitle').fill('Pizza bij de Italiaan')
  await page.locator('#eSave').click()
  await expect.poll(async () => (await writes(page)).length).toBe(1)
  expect((await writes(page))[0]).toEqual(['add', 'events/e1/activities', expect.objectContaining({ title: 'Pizza bij de Italiaan', type: 'ETEN', status: 'GEPLAND', createdBy: 'u1' })])
})

test('cancelling an activity from its menu', async ({ page }) => {
  await page.getByRole('button', { name: /Planning/ }).click()
  await page.getByLabel('Meer').first().click()
  await page.getByRole('button', { name: 'Annuleren' }).click()
  await expect.poll(async () => (await writes(page)).length).toBe(1)
  expect((await writes(page))[0]).toEqual(['batch', '', [['update', 'events/e1/activities/a1', expect.objectContaining({ status: 'GEANNULEERD', updatedBy: 'u1' })]]])
})

test('changing the status writes status and note', async ({ page }) => {
  await page.getByRole('button', { name: /Nu$/ }).click()
  await page.getByRole('button', { name: 'Bezet' }).click()
  expect((await writes(page))[0]).toEqual(['update', 'events/e1/members/u1', expect.objectContaining({ status: 'BEZET', statusNote: 'tot 15:00 vrij' })])
})
