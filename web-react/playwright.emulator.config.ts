import { defineConfig } from 'playwright/test'

// Full-stack tests: the real app build talking to the Firebase emulators with the real firestore.rules.
// Run through `npm run test:emulator` (starts the emulators; needs Java 21+).
export default defineConfig({
  testDir: 'e2e-emulator',
  workers: 1,
  use: { baseURL: 'http://localhost:4175', serviceWorkers: 'block', locale: 'nl-NL' },
  webServer: { command: 'npx vite preview --outDir dist-emulator --port 4175 --strictPort', url: 'http://localhost:4175/', stdout: 'ignore' },
})
