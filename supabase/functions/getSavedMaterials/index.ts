
// supabase/functions/getSavedMaterials/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient, PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
console.log('[getSavedMaterials] Function script loaded. Waiting for requests.');

serve(async (req: Request) => {
  const requestHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => { requestHeaders[key] = value; });
  console.log(`[getSavedMaterials] INVOKED - Method: ${req.method}, URL: ${req.url}, Headers: ${JSON.stringify(requestHeaders)}`);

  if (req.method === 'OPTIONS') {
    console.log('[getSavedMaterials] Handling OPTIONS request.');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[getSavedMaterials:CONFIG_ERROR] Supabase URL or Anon Key not configured.');
      return jsonResponse({ success: false, error: 'Server configuration error: Missing Supabase credentials.' }, 500);
    }
    console.log('[getSavedMaterials:CONFIG_CHECK] Supabase URL and Anon Key found.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        console.warn('[getSavedMaterials:AUTH_ERROR] Missing Authorization header.');
        return jsonResponse({ success: false, error: 'Missing Authorization header.' }, 401);
    }
    console.log('[getSavedMaterials:AUTH_SETUP] Auth header present.');

    const supabaseClient: SupabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.warn(`[getSavedMaterials:AUTH_FAILURE] User not authenticated. Error: ${userError?.message}`);
      return jsonResponse({ success: false, error: 'User not authenticated.', details: userError?.message }, 401);
    }
    console.log(`[getSavedMaterials:AUTH_SUCCESS] User authenticated: ${user.id}`);

    console.log(`[getSavedMaterials:DB_FETCH_START] Fetching materials for user ${user.id}.`);
    // RLS policy "Allow individual user select access for their materials" USING (auth.uid() = user_id)
    // will ensure the user only gets their own materials.
    const { data, error: dbError } = await supabaseClient
      .from('saved_materials')
      .select('*')
      // .eq('user_id', user.id) // This is handled by RLS
      .order('created_at', { ascending: false });

    if (dbError) {
      const pgError = dbError as PostgrestError;
      console.error('[getSavedMaterials:DB_FETCH_ERROR]', pgError.message, 'Code:', pgError.code, 'Details:', pgError.details);
      return jsonResponse({ success: false, error: 'Failed to fetch materials from database.', details: pgError.message, code: pgError.code }, 500);
    }

    console.log(`[getSavedMaterials:DB_FETCH_SUCCESS] Fetched ${data?.length || 0} materials for user ${user.id}.`);
    return jsonResponse({ success: true, materials: data || [] }, 200);

  } catch (err) {
    console.error('[getSavedMaterials:GLOBAL_ERROR]', err, err.stack || (err as Error).stack);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while fetching materials.';
    return jsonResponse({ success: false, error: errorMessage }, 500);
  }
});
