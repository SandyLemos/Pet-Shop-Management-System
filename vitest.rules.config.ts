import { defineConfig } from 'vitest/config'

// Testes das regras do Firestore. Precisam do emulador (Java 21+), por isso ficam
// fora do `npm test`. Rode com: npm run test:rules (só local, projeto demo, sem nuvem).
export default defineConfig({
  test: {
    include: ['tests-rules/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
})
