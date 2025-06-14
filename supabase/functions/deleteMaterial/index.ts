
// supabase/functions/deleteMaterial/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient, PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface DeleteMaterialPayload {
  materialId: string;
}

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
console.log('[deleteMaterial] Function script loaded. Waiting for requests.');

serve(async (req: Request) => {
  const requestHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => { requestHeaders[key] = value; });
  console.log(`[deleteMaterial] INVOKED - Method: ${req.method}, URL: ${req.url}, Headers: ${JSON.stringify(requestHeaders)}`);

  if (req.method === 'OPTIONS') {
    console.log('[deleteMaterial] Handling OPTIONS request.');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[deleteMaterial:CONFIG_ERROR] Supabase URL or Anon Key not configured.');
      return jsonResponse({ success: false, error: 'Server configuration error: Missing Supabase credentials.' }, 500);
    }
    console.log('[deleteMaterial:CONFIG_CHECK] Supabase URL and Anon Key found.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.warn('[deleteMaterial:AUTH_ERROR] Missing Authorization header.');
      return jsonResponse({ success: false, error: 'Missing Authorization header.' }, 401);
    }
    console.log('[deleteMaterial:AUTH_SETUP] Auth header present.');

    const supabaseClient: SupabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.warn(`[deleteMaterial:AUTH_FAILURE] User not authenticated. Error: ${userError?.message}`);
      return jsonResponse({ success: false, error: 'User not authenticated.', details: userError?.message }, 401);
    }
    console.log(`[deleteMaterial:AUTH_SUCCESS] User authenticated: ${user.id}`);

    let payload: DeleteMaterialPayload;
    try {
      payload = await req.json();
      console.log('[deleteMaterial:PAYLOAD_PARSE_SUCCESS] Payload parsed:', payload);
    } catch (e) {
      console.error('[deleteMaterial:PAYLOAD_PARSE_ERROR] Invalid JSON payload:', e.message);
      return jsonResponse({ success: false, error: 'Invalid JSON payload.', details: e.message }, 400);
    }

    if (!payload.materialId || typeof payload.materialId !== 'string') {
      console.warn('[deleteMaterial:VALIDATION_ERROR] Missing or invalid required field: materialId. Payload:', payload);
      return jsonResponse({ success: false, error: 'Missing or invalid required field: materialId' }, 400);
    }
    console.log(`[deleteMaterial:DELETE_START] User ${user.id} attempting to delete material ID: ${payload.materialId}`);

    // RLS policy "Allow individual user delete access for their materials" USING (auth.uid() = user_id)
    // will ensure the user can only delete their own materials.
    const { error: dbError } = await supabaseClient
      .from('saved_materials')
      .delete()
      .eq('id', payload.materialId);
      // .eq('user_id', user.id); // This is handled by RLS, can be removed if RLS is strict.

    if (dbError) {
      const pgError = dbError as PostgrestError;
      console.error('[deleteMaterial:DELETE_DB_ERROR]', pgError.message, 'Code:', pgError.code, 'Details:', pgError.details);
      return jsonResponse({ success: false, error: 'Failed to delete material from database.', details: pgError.message, code: pgError.code }, 500);
    }

    // If we reach here, the delete was successful or the record didn't exist (which is fine for a delete op).
    // Supabase delete doesn't error if the row isn't found, it just results in 0 rows affected.
    console.log(`[deleteMaterial:DELETE_SUCCESS] Material ID: ${payload.materialId} deleted (or did not exist) for user ${user.id}.`);
    return jsonResponse({ success: true, message: 'Material deleted successfully.' }, 200);

  } catch (err) {
    console.error('[deleteMaterial:GLOBAL_ERROR]', err, err.stack || (err as Error).stack);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while deleting material.';
    return jsonResponse({ success: false, error: errorMessage }, 500);
  }
});
