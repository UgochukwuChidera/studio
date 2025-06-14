
// supabase/functions/flagMaterial/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient, PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface FlagMaterialPayload {
  materialId: string;
  reason?: string;
}

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
console.log('[flagMaterial] Function script loaded. Waiting for requests.');

serve(async (req: Request): Promise<Response> => {
  const requestHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => { requestHeaders[key] = value; });
  console.log(`[flagMaterial] INVOKED - Method: ${req.method}, URL: ${req.url}, Headers: ${JSON.stringify(requestHeaders)}`);

  if (req.method === 'OPTIONS') {
    console.log('[flagMaterial] Handling OPTIONS request.');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[flagMaterial:CONFIG_ERROR] Supabase URL or Anon Key not configured.');
      return jsonResponse({ success: false, error: 'Server configuration error: Missing Supabase credentials.' }, 500);
    }
    console.log('[flagMaterial:CONFIG_CHECK] Supabase URL and Anon Key found.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        console.warn('[flagMaterial:AUTH_ERROR] Missing Authorization header.');
        return jsonResponse({ success: false, error: 'Missing Authorization header.' }, 401);
    }
    console.log('[flagMaterial:AUTH_SETUP] Auth header present.');

    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.warn(`[flagMaterial:AUTH_FAILURE] User not authenticated. Error: ${userError?.message}`);
      return jsonResponse({
        success: false,
        error: 'User not authenticated.',
        details: userError?.message,
      }, 401);
    }
    console.log(`[flagMaterial:AUTH_SUCCESS] User authenticated: ${user.id}`);

    let payload: FlagMaterialPayload;
    try {
      payload = await req.json();
      console.log('[flagMaterial:PAYLOAD_PARSE_SUCCESS] Payload parsed:', payload);
    } catch (e) {
      console.error('[flagMaterial:PAYLOAD_PARSE_ERROR] Invalid JSON payload:', e.message);
      return jsonResponse({ success: false, error: 'Invalid JSON payload.', details: e.message }, 400);
    }

    if (!payload.materialId || typeof payload.materialId !== 'string') {
      console.warn('[flagMaterial:VALIDATION_ERROR] Missing or invalid required field: materialId. Payload:', payload);
      return jsonResponse({ success: false, error: 'Missing or invalid required field: materialId' }, 400);
    }

    console.log(`[flagMaterial:FLAG_START] User ${user.id} attempting to flag material ID: ${payload.materialId}`);
    const { data: newFlag, error: flagInsertError } = await supabase
      .from('flagged_content')
      .insert({
        material_id: payload.materialId,
        flagged_by_user_id: user.id,
        reason: payload.reason || null,
        status: 'pending_review',
      })
      .select()
      .single();

    if (flagInsertError) {
      const pgError = flagInsertError as PostgrestError;
      if (pgError.code === '23505' && pgError.message.includes('unique_user_material_flag')) { // Assuming 'unique_user_material_flag' is the name of your unique constraint
        console.warn(`[flagMaterial:ALREADY_FLAGGED] User ${user.id} already flagged material ${payload.materialId}.`);
        return jsonResponse({
          success: true, // Still successful from client's perspective of having *a* flag there
          message: 'You have already flagged this material.',
          code: pgError.code,
        }, 200); // Or 409 Conflict if you prefer to signal an issue
      }
      console.error('[flagMaterial:DB_INSERT_ERROR]', pgError.message, 'Code:', pgError.code, 'Details:', pgError.details);
      return jsonResponse({
        success: false,
        error: 'Failed to flag material.',
        details: pgError.message,
        code: pgError.code,
      }, 500);
    }

    console.log(`[flagMaterial:FLAG_SUCCESS] Material ${payload.materialId} flagged by user ${user.id}. Flag ID: ${newFlag.id}`);
    return jsonResponse({
      success: true,
      flag: newFlag,
      message: 'Material flagged successfully for review.',
    }, 201);

  } catch (err) {
    console.error('[flagMaterial:GLOBAL_ERROR]', err, err.stack || (err as Error).stack);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while flagging material.';
    return jsonResponse({ success: false, error: errorMessage }, 500);
  }
});
