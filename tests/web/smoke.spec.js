// Rooktest van de web-app: Firebase wordt vervangen door vaste testdata,
// daarna laden we het tabblad Spellen en klikken we de filters aan.
const { test, expect } = require("@playwright/test");

const { FB, stubs } = require("./firebase-stub");

test.beforeEach(async ({ page }) => {
  await page.route("**/config.js", (r) => r.fulfill({ contentType: "text/javascript", body: `window.FIREBASE_CONFIG={apiKey:"x",projectId:"p"};` }));
  await page.route(FB + "*", (r) => {
    const f = r.request().url().slice(FB.length);
    return r.fulfill({ contentType: "text/javascript", body: stubs[f] });
  });
  await page.addInitScript(() => {
    localStorage.setItem("app_eventId", "e1");
    localStorage.setItem("app_tab", "spellen");
  });
  await page.goto("/app/index.html");
  await expect(page.locator("[data-gedit]")).toHaveCount(3);
});

const titles = (page) => page.locator("[data-gedit]").allInnerTexts().then((t) => t.map((x) => x.replace("✎", "").trim()));

test("Gaat mee en Wenslijst sluiten elkaar uit", async ({ page }) => {
  await page.getByRole("button", { name: "Gaat mee (2)" }).click();
  expect(await titles(page)).toEqual(["Azul", "Catan"]);
  await page.getByRole("button", { name: "Wenslijst (1)" }).click();
  expect(await titles(page)).toEqual(["Brass"]);
  await expect(page.getByRole("button", { name: "Gaat mee (2)" })).not.toHaveClass(/on/);
});

test("Neem ik mee filtert op de eigen naam", async ({ page }) => {
  await page.getByRole("button", { name: "Neem ik mee (1)" }).click();
  expect(await titles(page)).toEqual(["Catan"]);
  await page.getByRole("button", { name: "Neem ik mee (1)" }).click();
  expect(await titles(page)).toHaveLength(3);
});

test("Iedereen in het eigenaarfilter verbergt de wenslijst", async ({ page }) => {
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page.locator("#gOwner").selectOption({ label: "Iedereen (meegebracht)" });
  expect(await titles(page)).toEqual(["Azul", "Catan"]);
  await page.getByRole("button", { name: "Filters wissen" }).click();
  expect(await titles(page)).toHaveLength(3);
});

// ---- flows: elke test kijkt welke schrijfacties naar Firestore gaan
const writes = (page) => page.evaluate(() => window.__writes || []);

test("♥ aantikken zet het spel op de eigen lijst", async ({ page }) => {
  await page.locator('[data-want="g2"]').click();
  expect(await writes(page)).toEqual([["update", "events/e1/members/u1", expect.objectContaining({ wants: { union: ["g2"] } })]]);
});

test("spel toevoegen: opgeslagen met eigenaar, en meteen op de eigen ♥-lijst", async ({ page }) => {
  await page.locator("#gameNew").click();
  await page.locator("#gName").fill("Wingspan");
  await page.locator("#gMin").fill("1");
  await page.locator("#gMax").fill("5");
  await page.locator("#gSave").click();
  await expect.poll(async () => (await writes(page)).length).toBe(2);
  const [add, upd] = await writes(page);
  expect(add).toEqual(["add", "games", expect.objectContaining({ name: "Wingspan", owner: "Anna", wishlist: false, minPlayers: 1, maxPlayers: 5 })]);
  expect(upd).toEqual(["update", "events/e1/members/u1", { wants: { union: ["new1"] } }]);
});

test("een spel dat er al staat wordt niet dubbel toegevoegd", async ({ page }) => {
  await page.locator("#gameNew").click();
  await page.locator("#gName").fill("catan");
  await page.locator("#gSave").click();
  await expect(page.locator("#toast")).toContainText("staat al in de lijst");
  expect(await writes(page)).toEqual([]);
});

test("spel op de wenslijst: eigenaar wordt leeggemaakt", async ({ page }) => {
  await page.locator("#gameNew").click();
  await page.locator("#gName").fill("Gloomhaven");
  await page.locator("#gWishIn").check();
  await expect(page.locator("#gOwnerIn")).toHaveValue("");
  await page.locator("#gSave").click();
  await expect.poll(async () => (await writes(page)).length).toBeGreaterThan(0);
  expect((await writes(page))[0][2]).toEqual(expect.objectContaining({ name: "Gloomhaven", owner: "", wishlist: true }));
});

test("activiteit plannen: opgeslagen als GEPLAND met de ingevulde titel", async ({ page }) => {
  await page.locator('[data-tab="planning"]').click();
  await page.locator("#planNew").click();
  await page.locator("#eTitle").fill("Pizza bij de Italiaan");
  await page.locator("#eSave").click();
  await expect.poll(async () => (await writes(page)).length).toBe(1);
  expect((await writes(page))[0]).toEqual(["add", "activities", expect.objectContaining({ title: "Pizza bij de Italiaan", type: "ETEN", status: "GEPLAND", createdBy: "u1" })]);
});
