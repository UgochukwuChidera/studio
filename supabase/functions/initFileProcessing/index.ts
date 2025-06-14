
// supabase/functions/initFileProcessing/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface InitiatePayload {
  materialId: string; // ID of the pre-created record in saved_materials
  originalFileName: string;
  fileType: string; // MIME type
  storagePath: string;
  generationParams: any;
}

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

console.log('[initFileProcessing] Function script loaded. Waiting for requests.');

serve(async (req: Request) => {
  const requestHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => { requestHeaders[key] = value; });
  console.log(`[initFileProcessing] INVOKED - Method: ${req.method}, URL: ${req.url}, Headers: ${JSON.stringify(requestHeaders)}`);

  if (req.method === 'OPTIONS') {
    console.log('[initFileProcessing] Handling OPTIONS request.');
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[initFileProcessing:CONFIG_ERROR] Supabase URL or Anon Key missing.');
      return jsonResponse({ success: false, error: 'Server configuration error.' }, 500);
    }
    console.log('[initFileProcessing:CONFIG_CHECK] Supabase URL and Anon Key found.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.warn('[initFileProcessing:AUTH_ERROR] Missing Authorization header.');
      return jsonResponse({ success: false, error: 'Missing Authorization header.' }, 401);
    }
    console.log('[initFileProcessing:AUTH_SETUP] Auth header present.');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.warn(`[initFileProcessing:AUTH_FAILURE] User not authenticated. Error: ${userError?.message}`);
      return jsonResponse({ success: false, error: 'User not authenticated.', details: userError?.message }, 401);
    }
    console.log(`[initFileProcessing:AUTH_SUCCESS] User authenticated: ${user.id}`);

    let payload: InitiatePayload;
    try {
      payload = await req.json();
      console.log('[initFileProcessing:PAYLOAD_PARSE_SUCCESS] Payload parsed:', JSON.stringify(payload));
    } catch (e) {
      console.error('[initFileProcessing:PAYLOAD_PARSE_ERROR] Invalid JSON payload:', e.message);
      return jsonResponse({ success: false, error: 'Invalid JSON payload.', details: e.message }, 400);
    }

    const { materialId, originalFileName, fileType, storagePath, generationParams } = payload;
    if (!materialId || !originalFileName || !fileType || !storagePath || !generationParams) {
      console.warn('[initFileProcessing:VALIDATION_ERROR] Missing required fields. Payload:', payload);
      return jsonResponse({ success: false, error: 'Missing required fields (materialId, originalFileName, fileType, storagePath, generationParams).' }, 400);
    }

    console.log(`[initFileProcessing:JOB_CREATE_START] User ${user.id} initiating processing for material ID: ${materialId}, file: ${originalFileName}`);

    const { data: jobData, error: jobError } = await supabase
      .from('file_processing_jobs')
      .insert({
        user_id: user.id,
        material_id: materialId,
        original_file_name: originalFileName,
        file_type: fileType,
        storage_path: storagePath,
        status: 'PENDING_EXTRACTION',
        generation_params: generationParams,
      })
      .select()
      .single();

    if (jobError) {
      console.error('[initFileProcessing:JOB_CREATE_DB_ERROR]', jobError.message, JSON.stringify(jobError));
      return jsonResponse({ success: false, error: 'Failed to create processing job.', details: jobError.message }, 500);
    }
    console.log(`[initFileProcessing:JOB_CREATE_SUCCESS] Job record created (ID: ${jobData.id}).`);

    // Asynchronously invoke the text extraction function. DO NOT await this.
    console.log(`[initFileProcessing:ASYNC_INVOKE_START] Asynchronously invoking 'extractText' for job ${jobData.id}.`);
    supabase.functions.invoke('extractText', {
      body: { jobId: jobData.id },
    }, { noWait: true })
    .then(({ data: invokeData, error: invokeError }) => {
        if (invokeError) {
            console.error(`[initFileProcessing:ASYNC_INVOKE_ERROR] Error from ASYNC invocation of 'extractText' for job ${jobData.id}:`, invokeError.message, JSON.stringify(invokeError));
            // Note: Updating job status to 'INVOCATION_FAILED' here might be complex due to async nature.
            // 'extractText' should robustly handle its own startup and update status.
        } else {
            console.log(`[initFileProcessing:ASYNC_INVOKE_SUCCESS] Successfully ASYNC invoked 'extractText' for job ${jobData.id}. Response (if any):`, invokeData);
        }
    }).catch(asyncInvokeError => {
        console.error(`[initFileProcessing:ASYNC_INVOKE_CATCH] CATCH during ASYNC invocation of 'extractText' for job ${jobData.id}:`, asyncInvokeError);
    });

    console.log(`[initFileProcessing:RETURN_TO_CLIENT] Returning job ID ${jobData.id} to client.`);
    return jsonResponse({ success: true, jobId: jobData.id, message: 'File processing initiated.' }, 202);

  } catch (err) {
    console.error('[initFileProcessing:GLOBAL_ERROR]', err.message, err.stack);
    return jsonResponse({ success: false, error: 'An unexpected error occurred.', details: err.message }, 500);
  }
});

