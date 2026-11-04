import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const fake = process.env.VITE_FAKE === '1'
const fakeModule = (name: string) => fileURLToPath(new URL(`./src/data/fake/${name}.ts`, import.meta.url))

// VITE_FAKE=1 swaps Firebase for in-memory fixtures (visual tests, local demo).
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: fake
      ? { 'firebase/app': fakeModule('app'), 'firebase/auth': fakeModule('auth'), 'firebase/firestore': fakeModule('firestore') }
      : {},
  },
  test: { environment: 'jsdom', globals: true, setupFiles: ['src/test-setup.ts'], include: ['src/**/*.test.{ts,tsx}'] },
})
