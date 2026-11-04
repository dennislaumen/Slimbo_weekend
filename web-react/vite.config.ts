import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Vitest also runs against the in-memory fakes
const fake = process.env.VITE_FAKE === '1' || Boolean(process.env.VITEST)
process.env.TZ = 'Europe/Amsterdam'
const fakeModule = (name: string) => fileURLToPath(new URL(`./src/data/fake/${name}.ts`, import.meta.url))

// VITE_FAKE=1 swaps Firebase for the in-memory fake (e2e flows, visual tests, dev:fake) and Vitest always does.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: fake
      ? { 'firebase/app': fakeModule('app'), 'firebase/auth': fakeModule('auth'), 'firebase/firestore': fakeModule('firestore') }
      : {},
  },
  test: { environment: 'jsdom', globals: true, setupFiles: ['src/test-setup.ts'], include: ['src/**/*.test.{ts,tsx}'], env: { VITE_FAKE: '1' } },
})
