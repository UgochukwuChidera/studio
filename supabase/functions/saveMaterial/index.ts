
// supabase/functions/saveMaterial/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient, PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface SaveMaterialPayload {
  id?: string; // Optional: if provided, indicates an update to an existing material
  title: string;
  type: string;
  content?: any; // AI-generated content; can be null/undefined if only creating placeholder
  sourceFileInfo?: { name: string; type: string; size: number } | null;
  sourceTextPrompt?: string | null;
  generationParams?: object | null;
  isPublic?: boolean;
  tags?: string[];
  storagePath?: string | null;
  status: string; // Top-level status from client e.g., "PENDING_EXTRACTION", "COMPLETED", "AI_PROCESSING_FAILED"
}
console.log('[saveMaterial] Function script loaded. Waiting for requests.');

serve(async (req: Request) => {
  const requestHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => { requestHeaders[key] = value; });
  console.log(`[saveMaterial] INVOKED - Method: ${req.method}, URL: ${req.url}, Headers: ${JSON.stringify(requestHeaders)}`);

  if (req.method === 'OPTIONS') {
    console.log('[saveMaterial] Handling OPTIONS request.');
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[saveMaterial:CONFIG_ERROR] Supabase URL or Anon Key missing.');
      return jsonResponse({ success: false, error: 'Server configuration error.' }, 500);
    }
    console.log('[saveMaterial:CONFIG_CHECK] Supabase URL and Anon Key found.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        console.warn('[saveMaterial:AUTH_ERROR] Missing Authorization header.');
        return jsonResponse({ success: false, error: 'Missing Authorization header.' }, 401);
    }
    console.log('[saveMaterial:AUTH_SETUP] Auth header present.');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.warn(`[saveMaterial:AUTH_FAILURE] User not authenticated. Error: ${userError?.message}`);
      return jsonResponse({ success: false, error: 'User not authenticated.', details: userError?.message }, 401);
    }
    console.log(`[saveMaterial:AUTH_SUCCESS] User authenticated: ${user.id}`);

    let materialData: SaveMaterialPayload;
    try {
        materialData = await req.json();
        console.log('[saveMaterial:PAYLOAD_PARSE_SUCCESS] Payload parsed:', JSON.stringify(materialData));
    } catch (e) {
        console.error('[saveMaterial:PAYLOAD_PARSE_ERROR] Invalid JSON payload:', e.message);
        return jsonResponse({ success: false, error: 'Invalid JSON payload.', details: e.message }, 400);
    }

    const { id: materialIdToUpdate, title, type, content, sourceFileInfo, sourceTextPrompt, generationParams, isPublic, tags, storagePath, status } = materialData;

    if (!title || !type || !status) {
      console.warn('[saveMaterial:VALIDATION_ERROR] Missing required fields: title, type, or status. Payload:', materialData);
      return jsonResponse({ success: false, error: 'Missing required fields: title, type, or status.' }, 400);
    }
    if (!['test', 'notes', 'flashcards', 'test_result'].includes(type)) {
      console.warn(`[saveMaterial:VALIDATION_ERROR] Invalid material type: ${type}`);
      return jsonResponse({ success: false, error: 'Invalid material type provided.' }, 400);
    }

    const dbPayload: any = {
      user_id: user.id, // Always set/ensure user_id for RLS checks
      title: title,
      type: type,
      content: content || null,
      source_file_info: sourceFileInfo || null,
      source_text_prompt: sourceTextPrompt || null,
      generation_params: generationParams || null,
      is_public: isPublic === true ? true : false,
      tags: Array.isArray(tags) ? tags : null,
      storage_path: storagePath || null,
      status: status, // Use the new top-level status
      updated_at: new Date().toISOString(),
    };

    if (materialIdToUpdate) {
        // --- UPDATE EXISTING MATERIAL ---
        console.log(`[saveMaterial:UPDATE_START] User ${user.id} updating material ID: ${materialIdToUpdate}. Payload: ${JSON.stringify(dbPayload)}`);
        // Do not include user_id in update payload as it shouldn't change owner
        const { user_id, created_at, ...updatePayload } = dbPayload;

        const { data, error: dbError } = await supabase
          .from('saved_materials')
          .update(updatePayload)
          .eq('id', materialIdToUpdate)
          // .eq('user_id', user.id) // RLS handles ensuring user owns the record they're updating
          .select()
          .single();

        if (dbError) {
          const pgError = dbError as PostgrestError;
          console.error('[saveMaterial:UPDATE_DB_ERROR] Error updating material:', pgError.message, 'Code:', pgError.code, JSON.stringify(pgError));
          return jsonResponse({ success: false, error: 'Failed to update material in database.', details: pgError.message, code: pgError.code }, 500);
        }
        console.log(`[saveMaterial:UPDATE_SUCCESS] Material ID: ${data.id} updated successfully for user ${user.id}.`);
        return jsonResponse({ success: true, material: data, operation: 'updated' }, 200);

    } else {
        // --- INSERT NEW MATERIAL ---
        dbPayload.created_at = new Date().toISOString();
        console.log(`[saveMaterial:INSERT_START] User ${user.id} inserting new material. Payload: ${JSON.stringify(dbPayload)}`);

        const { data, error: dbError } = await supabase
          .from('saved_materials')
          .insert(dbPayload)
          .select()
          .single();

        if (dbError) {
          const pgError = dbError as PostgrestError;
          console.error('[saveMaterial:INSERT_DB_ERROR] Error inserting material:', pgError.message, 'Code:', pgError.code, JSON.stringify(pgError));
          return jsonResponse({ success: false, error: 'Failed to save new material to database.', details: pgError.message, code: pgError.code }, 500);
        }

        console.log(`[saveMaterial:INSERT_SUCCESS] New material "${data.title}" (ID: ${data.id}) saved successfully for user ${user.id}.`);
        return jsonResponse({ success: true, material: data, operation: 'inserted' }, 201);
    }

  } catch (err) {
    console.error('[saveMaterial:GLOBAL_ERROR]', err.message, err.stack);
    return jsonResponse({ success: false, error: 'An unexpected error occurred while saving material.', details: err.message }, 500);
  }
});
    
    

