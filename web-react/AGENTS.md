# web-react: guide for agents and contributors

React 18 + TypeScript (strict) + Vite port of the legacy `../web/app/index.html`. UI strings are Dutch (match the
product); code, comments and commit messages are English. Firestore contract: `../docs/schema.md`.

## Commands

| Command | What it does | Use it |
|---|---|---|
| `npm run check` | typecheck, lint, Vitest, fake build, Playwright flows | after every change, before saying "done" |
| `npm test` | Vitest only (domain + integration, about 3 s) | inner loop; `npx vitest run -t "name"` for one test |
| `npm run test:e2e` | Playwright flows in a browser on the fake backend | after UI or data-flow changes |
| `npm run test:visual` | pixel parity against the legacy app (12 states, 3 viewports) | after any markup or CSS change; needs `build:fake` first |
| `npm run test:emulator` | real SDK + real `firestore.rules` on the Firebase emulators | after changing writes, rules or the join flow; needs Java 21+ |
| `npm run dev:fake` | dev server with in-memory data, no Firebase needed | to look at a state, see scenarios below |
| `npm run check:full` | everything above | before opening a PR |

## Layout and rules

- `src/domain`: pure functions and types. No React, no Firebase, no `Date.now()` (take `now` as a parameter). Unit-test here first.
- `src/data`: everything that talks to Firebase (`useAuth`, `useWeekend` subscriptions, `actions.ts` writes). Components never import `firebase/*` directly.
- `src/app`: providers and app-wide hooks. `useWeekendContext()` gives views the data, `me`, `now`, `actions` and `run`.
- `src/features/<tab>`: one folder per tab. `src/components`: shared UI.
- All writes go through `actions.ts` and `run(write, okMessage)`, which toasts success or the error.
- Render multi-part text as one template string (`{`Hoi ${name}`}`), not several JSX text nodes. Split text nodes shift glyphs and break the pixel-parity test.
- Keep ids and class names the legacy app uses (`#planNew`, `.card`, `.chip`): the parity test and Playwright selectors rely on them.

## Testing seams

1. **Domain unit tests** (`src/domain/*.test.ts`): filters, time, labels.
2. **Integration tests** (`src/app/*.test.tsx`): the whole `<App/>` in jsdom against the in-memory Firebase fake. Use `renderApp()` from `src/test/render.tsx`. Assert what the user sees (`screen.getByRole(...)`), and use `writes()` for the exact Firestore writes. Prefer these over Playwright for flows.
3. **Playwright flows** (`e2e/flows.spec.ts`) and **visual parity** (`e2e/visual.spec.ts`): few, for what only a real browser can show.
4. **Emulator tests** (`e2e-emulator/`): the only tests where the security rules are real. Add one when a feature depends on who may read or write.

## The Firebase fake

`src/data/fake/firestore.ts` replaces `firebase/*` when `VITE_FAKE=1` and in Vitest (alias in `vite.config.ts`). It is stateful:
writes change data and re-fire snapshots. It also logs every write on `window.__writes` as `[op, path, data]`.
`arrayUnion` and `arrayRemove` show up in the log as `{ union: [...] }` and `{ remove: [...] }`.
It does not enforce rules or validate queries (`where` is ignored): use the emulator tests for that.
Seed data is `e2e/fixture.json`; other data sets are in `src/data/fake/scenarios.ts`.

## Scenarios (dev:fake)

`npm run dev:fake`, then open `/?scenario=<name>&tab=<nu|planning|spellen|meer>&uid=<u1|u2|u3>`:
`default`, `empty`, `many-games` (60 games), `busy-day` (running, upcoming, finished activities).
Add a scenario by adding a function to `scenarios` in `src/data/fake/scenarios.ts`.

## Verifying UI work

Take a screenshot of the affected state (`dev:fake` scenario or a Playwright run) and look at it. For markup or CSS changes run
`npm run test:visual`; its diffs land in `test-results/visual/*-diff.png`.
