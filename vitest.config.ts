import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'scripts/**/*.test.ts',
      'supabase/functions/scrape-onefootball/sync-policy.test.ts',
    ],
  },
})
