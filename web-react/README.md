# Spellenweekend web app (React prototype)

A React + TypeScript port of `web/app/index.html`. It is not deployed; `web/` is untouched.
Goal: pixel parity with the HTML app, then a safe base to keep building on.

```
npm ci
npm run check         # typecheck, lint, Vitest, fake build, Playwright flows
npm run check:full    # plus pixel parity and the Firebase-emulator tests (needs Java 21+)
npm run dev:fake      # dev server with in-memory data: /?scenario=busy-day&tab=nu
npm run dev           # needs ../config.js with the Firebase config (see pages.yml)
```

Conventions, test seams and the fake backend are described in [AGENTS.md](AGENTS.md).

## Layout

- `src/domain`: pure logic and types (filters, time, labels). Unit-tested with Vitest.
- `src/data`: Firebase access: auth, live subscriptions (`useWeekend`), writes (`actions.ts`). `src/data/fake` replaces Firebase when `VITE_FAKE=1`.
- `src/app`: providers and app-wide hooks (toast, weekend context, reminders, presence).
- `src/features/*`: one folder per tab plus login. `src/components`: shared UI.

`e2e/visual.spec.ts` renders both apps with the same fixture and clock in 12 states at three
viewports (phone, desktop, dark) and requires identical screenshots.
