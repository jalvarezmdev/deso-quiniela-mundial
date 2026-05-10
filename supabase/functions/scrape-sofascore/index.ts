// Supabase Edge Function stub for SofaScore scraping.
// Replace with a robust parser + source validation before production.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

serve(async () => {
  const payload = {
    ok: true,
    source: 'sofascore',
    message:
      'Stub function. Implement fetch/parse/upsert for fixtures and live scores with admin override preservation.',
    syncedAt: new Date().toISOString(),
  }

  return new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  })
})
