import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.spec.ts',
  workers: 1,
  use: { serviceWorkers: 'block', locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' },
  webServer: [
    // The deployed (legacy) app, served as static files
    { command: 'python3 -m http.server 4173 --directory ../web', url: 'http://localhost:4173/app/index.html', reuseExistingServer: true },
    // The React app built with fake Firebase (npm run build:fake)
    { command: 'npx vite preview --outDir dist-fake --port 4174 --strictPort', url: 'http://localhost:4174/', reuseExistingServer: true },
  ],
})
