
// supabase/functions/getTestHistory/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient, PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
console.log('[getTestHistory] Function script loaded. Waiting for requests.');

serve(async (req: Request) => {
  const requestHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => { requestHeaders[key] = value; });
  console.log(`[getTestHistory] INVOKED - Method: ${req.method}, URL: ${req.url}, Headers: ${JSON.stringify(requestHeaders)}`);

  if (req.method === 'OPTIONS') {
    console.log('[getTestHistory] Handling OPTIONS request.');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[getTestHistory:CONFIG_ERROR] Supabase URL or Anon Key not configured.');
      return jsonResponse({ success: false, error: 'Server configuration error.' }, 500);
    }
    console.log('[getTestHistory:CONFIG_CHECK] Supabase URL and Anon Key found.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.warn('[getTestHistory:AUTH_ERROR] Missing Authorization header.');
      return jsonResponse({ success: false, error: 'Missing Authorization header.' }, 401);
    }
    console.log('[getTestHistory:AUTH_SETUP] Auth header present.');

    const supabaseClient: SupabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.warn(`[getTestHistory:AUTH_FAILURE] User not authenticated. Error: ${userError?.message}`);
      return jsonResponse({ success: false, error: 'User not authenticated.', details: userError?.message }, 401);
    }
    console.log(`[getTestHistory:AUTH_SUCCESS] User authenticated: ${user.id}`);

    console.log(`[getTestHistory:DB_FETCH_START] Fetching test history for user ${user.id}.`);
    const { data, error: dbError } = await supabaseClient
      .from('test_results')
      .select('*')
      // .eq('user_id', user.id) // Handled by RLS
      .order('completed_at', { ascending: false });

    if (dbError) {
      const pgError = dbError as PostgrestError;
      console.error('[getTestHistory:DB_FETCH_ERROR]', pgError.message, 'Code:', pgError.code, 'Details:', pgError.details);
      return jsonResponse({ success: false, error: 'Failed to fetch test history.', details: pgError.message, code: pgError.code }, 500);
    }

    console.log(`[getTestHistory:DB_FETCH_SUCCESS] Fetched ${data?.length || 0} test history entries for user ${user.id}.`);
    return jsonResponse({ success: true, history: data || [] }, 200);

  } catch (err) {
    console.error('[getTestHistory:GLOBAL_ERROR]', err, err.stack || (err as Error).stack);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while fetching test history.';
    return jsonResponse({ success: false, error: errorMessage }, 500);
  }
});

