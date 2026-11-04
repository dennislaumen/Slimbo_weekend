# Spellenweekend web app (React prototype)

A React + TypeScript port of `web/app/index.html`. It is not deployed; `web/` is untouched.
Goal: pixel parity with the HTML app, then a safe base to keep building on.

```
npm ci
npm run dev           # needs ../config.js with the Firebase config (see pages.yml)
npm run typecheck && npm run lint && npm test
npm run build:fake    # build with in-memory Firebase (fixtures in e2e/fixture.json)
npx playwright test   # flows.spec.ts: behaviour and writes; visual.spec.ts: parity with the legacy app
```

## Layout

- `src/domain`: pure logic and types (filters, time, labels). Unit-tested with Vitest.
- `src/data`: Firebase access: auth, live subscriptions (`useWeekend`), writes (`actions.ts`). `src/data/fake` replaces Firebase when `VITE_FAKE=1`.
- `src/app`: providers and app-wide hooks (toast, weekend context, reminders, presence).
- `src/features/*`: one folder per tab plus login. `src/components`: shared UI.

`visual.spec.ts` renders both apps with the same fixture and clock in 12 states at three
viewports (phone, desktop, dark) and requires identical screenshots.
