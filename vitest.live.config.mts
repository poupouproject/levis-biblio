import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

// Tests de bout en bout contre le vrai portail de la Ville, en lecture seule.
// Requiert MON_COMPTE_LEVIS et MON_COMPTE_LEVIS_PASS dans .env.local. Jamais exécutés en CI.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/live/**/*.live.test.ts'],
    env: loadEnv('development', process.cwd(), ''),
    testTimeout: 60_000,
    fileParallelism: false,
  },
});
