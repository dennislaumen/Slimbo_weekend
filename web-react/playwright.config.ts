import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.spec.ts',
  workers: 1,
  use: { serviceWorkers: 'block', locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' },
  // Servers are never reused: a leftover server would silently test an old build.
  webServer: [
    // The deployed (legacy) app, only needed by the parity test (PW_LEGACY=1)
    ...(process.env.PW_LEGACY === '1'
      ? [{ command: 'python3 -m http.server 4173 --directory ../web', url: 'http://localhost:4173/app/index.html', stdout: 'ignore' as const }]
      : []),
    // The React app built with fake Firebase (npm run build:fake)
    { command: 'npx vite preview --outDir dist-fake --port 4174 --strictPort', url: 'http://localhost:4174/', stdout: 'ignore' },
  ],
})
