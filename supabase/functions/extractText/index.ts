
// supabase/functions/extractText/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @deno-types="https://esm.sh/mammoth@1.7.0/mammoth.d.ts"
import mammoth from 'https://esm.sh/mammoth@1.7.0?pin=v135';
import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@4.2.67/build/pdf.mjs?pin=v135';

import { genkit, z } from 'https://esm.sh/@genkit-ai/core@1.8.0?pin=v135';
import { googleAI } from 'https://esm.sh/@genkit-ai/googleai@1.8.0?pin=v135';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id, x-supabase-edge-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS' // This function is invoked internally
};

let genkitForOCRInitialized = false;
let ocrHandwrittenNotesFlowInternal: any;

const OCRHandwrittenNotesInputSchemaInternal = z.object({
  photoDataUri: z.string().describe("Image as data URI."),
});
const OCRHandwrittenNotesOutputSchemaInternal = z.object({
  extractedText: z.string().describe('Extracted text.'),
});

async function initializeGenkitForOCR() {
  if (genkitForOCRInitialized) return;
  console.log('[extractText:OCR_INIT] Attempting to initialize Genkit for OCR...');
  try {
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
    if (!googleApiKey) {
      console.warn('[extractText:OCR_INIT_ERROR] GOOGLE_API_KEY not found. OCR for images will fail.');
      return; // Do not set genkitForOCRInitialized = true
    }
    console.log('[extractText:OCR_INIT] GOOGLE_API_KEY found.');

    if (!genkit.plugins().find(p => p.name === 'googleAI')) {
        genkit.config({
            plugins: [googleAI({ apiKey: googleApiKey })],
            logLevel: 'warn',
            enableTracingAndMetrics: false, // Disabled tracing
        });
        console.log('[extractText:OCR_INIT] genkit.config() called for OCR.');
    } else {
        console.log('[extractText:OCR_INIT] Genkit Google AI plugin already configured.');
    }

    const ocrPrompt = genkit.definePrompt({
      name: 'ocrHandwrittenNotesPromptEmbedded_extractText_v2',
      input: { schema: OCRHandwrittenNotesInputSchemaInternal },
      output: { schema: OCRHandwrittenNotesOutputSchemaInternal },
      prompt: `You are an OCR bot. Extract the text from the following image of handwritten notes. Return the extracted text. Preserve line breaks if possible.

Handwritten Notes: {{media url=photoDataUri}}`,
    });
    console.log('[extractText:OCR_INIT] OCR prompt defined.');

    ocrHandwrittenNotesFlowInternal = genkit.defineFlow(
      {
        name: 'ocrHandwrittenNotesFlowEmbedded_extractText_v2',
        inputSchema: OCRHandwrittenNotesInputSchemaInternal,
        outputSchema: OCRHandwrittenNotesOutputSchemaInternal,
      },
      async (input) => {
        const { output } = await ocrPrompt.run(input);
        if (!output) {
            throw new Error("OCR flow did not return an output.");
        }
        return output;
      }
    );
    console.log('[extractText:OCR_INIT] OCR flow defined.');
    genkitForOCRInitialized = true;
    console.log('[extractText:OCR_INIT_SUCCESS] Embedded Genkit and OCR flow initialized successfully.');
  } catch (e) {
    console.error('[extractText:OCR_INIT_FAILURE] Critical error during Genkit/OCR flow initialization:', e.message, e.stack);
  }
}

interface JobPayload {
  jobId: string;
}

async function updateJobAndMaterial(
    supabaseAdmin: SupabaseClient,
    jobId: string,
    materialId: string | null,
    jobStatus: string,
    materialNewStatus: string, // New dedicated status for saved_materials
    extractedText?: string | null,
    errorMessage?: string | null
) {
  const jobUpdateData: any = { status: jobStatus, updated_at: new Date().toISOString() };
  if (extractedText !== undefined) jobUpdateData.extracted_text = extractedText;
  if (errorMessage !== undefined) jobUpdateData.error_message = errorMessage;

  console.log(`[extractText:DB_UPDATE_JOB_START] Updating job ${jobId} to status ${jobStatus}. Payload: ${JSON.stringify(jobUpdateData)}`);
  const { error: jobUpdateError } = await supabaseAdmin
    .from('file_processing_jobs')
    .update(jobUpdateData)
    .eq('id', jobId);

  if (jobUpdateError) {
    console.error(`[extractText:DB_UPDATE_JOB_ERROR] Error updating job ${jobId}:`, jobUpdateError.message);
  } else {
    console.log(`[extractText:DB_UPDATE_JOB_SUCCESS] Job ${jobId} status updated to ${jobStatus}.`);
  }

  if (materialId) {
    const materialUpdateData: any = {
        status: materialNewStatus, // Update the new top-level status column
        updated_at: new Date().toISOString()
    };
    // Only update source_text_prompt if text was successfully extracted and intended for AI gen
    if (extractedText !== undefined && extractedText !== null && jobStatus === 'TEXT_EXTRACTED_PENDING_AI') {
        materialUpdateData.source_text_prompt = extractedText;
    }

    console.log(`[extractText:DB_UPDATE_MATERIAL_START] Updating material ${materialId} to status ${materialNewStatus}. Payload: ${JSON.stringify(materialUpdateData)}`);
    const { error: materialUpdateError } = await supabaseAdmin
        .from('saved_materials')
        .update(materialUpdateData)
        .eq('id', materialId);

    if (materialUpdateError) {
        console.error(`[extractText:DB_UPDATE_MATERIAL_ERROR] Error updating material ${materialId}:`, materialUpdateError.message);
    } else {
        console.log(`[extractText:DB_UPDATE_MATERIAL_SUCCESS] Material ${materialId} status updated to ${materialNewStatus}.`);
    }
  } else {
    console.warn(`[extractText:DB_UPDATE_MATERIAL_SKIP] No materialId provided for job ${jobId}, cannot update saved_materials record.`);
  }
}

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

console.log('[extractText] Function script loaded. Waiting for requests.');

serve(async (req: Request) => {
  const requestHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => { requestHeaders[key] = value; });
  console.log(`[extractText] INVOKED - Method: ${req.method}, URL: ${req.url}, Headers: ${JSON.stringify(requestHeaders)}`);

  // This function is typically invoked internally, so OPTIONS might not be strictly needed
  // but good practice to include if it could be called from a client under some circumstances.
  if (req.method === 'OPTIONS') {
    console.log('[extractText] Handling OPTIONS request.');
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  // IMPORTANT: This function modifies the database and downloads from storage.
  // It should use the service_role key for these operations if RLS doesn't permit anon/authenticated key for all its tasks.
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[extractText:CONFIG_ERROR] Supabase URL or Service Role Key missing.');
    return jsonResponse({ success: false, error: 'Server configuration error (extractText).' }, 500);
  }
  console.log('[extractText:CONFIG_CHECK] Supabase URL and Service Key found.');

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  await initializeGenkitForOCR();

  let payload: JobPayload;
  try {
    payload = await req.json();
    console.log('[extractText:PAYLOAD_PARSE_SUCCESS] Payload parsed:', JSON.stringify(payload));
  } catch (e) {
    console.error('[extractText:PAYLOAD_PARSE_ERROR] Invalid JSON payload:', e.message);
    return jsonResponse({ success: false, error: 'Invalid JSON payload (extractText).', details: e.message }, 400);
  }

  const { jobId } = payload;
  if (!jobId) {
    console.warn('[extractText:PAYLOAD_VALIDATION_ERROR] Missing jobId in payload.');
    return jsonResponse({ success: false, error: 'Missing jobId.' }, 400);
  }

  console.log(`[extractText:PROCESSING_START] Processing job ID: ${jobId}`);
  let materialIdForUpdate: string | null = null; // To store material_id once fetched

  try {
    const { data: job, error: fetchError } = await supabaseAdmin
      .from('file_processing_jobs')
      .select('storage_path, file_type, original_file_name, material_id') // Ensure material_id is selected
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      console.error(`[extractText:JOB_FETCH_ERROR] Error fetching job ${jobId}:`, fetchError?.message);
      await updateJobAndMaterial(supabaseAdmin, jobId, null, 'EXTRACTION_FAILED', 'EXTRACTION_FAILED', null, `Job not found or DB error: ${fetchError?.message}`);
      return jsonResponse({ success: false, error: 'Job not found or database error.' }, 404);
    }
    materialIdForUpdate = job.material_id; // Capture for later updates
    console.log(`[extractText:JOB_FETCH_SUCCESS] Fetched job ${jobId}. Material ID: ${materialIdForUpdate}, Storage Path: ${job.storage_path}`);

    await updateJobAndMaterial(supabaseAdmin, jobId, materialIdForUpdate, 'EXTRACTING', 'PENDING_EXTRACTION'); // Initial material status

    const { storage_path, file_type, original_file_name } = job;
    if (!storage_path || !file_type) {
        console.warn(`[extractText:JOB_DETAIL_MISSING] Job ${jobId} missing storage_path or file_type.`);
        await updateJobAndMaterial(supabaseAdmin, jobId, materialIdForUpdate, 'EXTRACTION_FAILED', 'EXTRACTION_FAILED', null, 'Missing storage_path or file_type in job details.');
        return jsonResponse({ success: false, error: 'Job details incomplete (missing storage_path or file_type).' }, 400);
    }

    console.log(`[extractText:FILE_DOWNLOAD_START] Downloading from: ${storage_path} for job ${jobId}`);
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(storage_path.split('/')[0]) // Bucket name
      .download(storage_path.substring(storage_path.indexOf('/') + 1)); // File path within bucket

    if (downloadError || !fileData) {
      console.error(`[extractText:FILE_DOWNLOAD_ERROR] Error downloading file for job ${jobId}:`, downloadError?.message);
      await updateJobAndMaterial(supabaseAdmin, jobId, materialIdForUpdate, 'EXTRACTION_FAILED', 'EXTRACTION_FAILED', null, `File download failed: ${downloadError?.message}`);
      return jsonResponse({ success: false, error: 'Failed to download file from storage.' }, 500);
    }
    console.log(`[extractText:FILE_DOWNLOAD_SUCCESS] File downloaded for job ${jobId}. Size: ${fileData.size} bytes.`);

    const fileBuffer = await fileData.arrayBuffer();
    let extractedText = '';

    console.log(`[extractText:EXTRACTION_START] Extracting text from ${original_file_name} (type: ${file_type}) for job ${jobId}`);

    if (file_type === 'application/pdf') {
      const loadingTask = pdfjsLib.getDocument({ data: fileBuffer });
      const pdf = await loadingTask.promise;
      let textContent = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const text = await page.getTextContent();
        textContent += text.items.map((s: any) => s.str).join(' ') + '\\n';
      }
      extractedText = textContent.trim();
    } else if (file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { // DOCX
      const result = await mammoth.extractRawText({ arrayBuffer: fileBuffer });
      extractedText = result.value;
    } else if (file_type.startsWith('image/')) {
      if (!genkitForOCRInitialized || !ocrHandwrittenNotesFlowInternal) {
        console.error('[extractText:OCR_NOT_READY] Genkit for OCR not initialized. Cannot process image. Check GOOGLE_API_KEY.');
        throw new Error('OCR service not available. Check GOOGLE_API_KEY environment variable for this function.');
      }
      const base64String = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
      const dataUri = `data:${file_type};base64,${base64String}`;
      console.log(`[extractText:OCR_INVOKE] Invoking embedded OCR flow for job ${jobId}.`);
      try {
        const ocrResult = await ocrHandwrittenNotesFlowInternal.run({ photoDataUri: dataUri });
        if (!ocrResult || typeof ocrResult.extractedText === 'undefined') {
          console.error('[extractText:OCR_RESULT_INVALID] OCR flow did not return expected extractedText field.');
          throw new Error('OCR processing failed to return valid text.');
        }
        extractedText = ocrResult.extractedText;
      } catch (ocrError) {
        console.error(`[extractText:OCR_EXECUTION_ERROR] Error during OCR flow execution for job ${jobId}:`, ocrError.message, ocrError.stack);
        throw new Error(`OCR processing failed: ${ocrError.message}`);
      }
      console.log(`[extractText:OCR_SUCCESS] OCR completed for job ${jobId}. Extracted text length: ${extractedText.length}`);
    } else if (file_type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') { // PPTX
      console.warn(`[extractText:UNSUPPORTED_PPTX] PPTX processing not yet implemented for job ${jobId}.`);
      await updateJobAndMaterial(supabaseAdmin, jobId, materialIdForUpdate, 'EXTRACTION_UNSUPPORTED', 'EXTRACTION_UNSUPPORTED', null, 'PPTX file processing is not yet supported.');
      return jsonResponse({ success: true, message: 'PPTX processing pending implementation.', jobId }, 202);
    } else {
      console.warn(`[extractText:UNSUPPORTED_TYPE] Unsupported file type: ${file_type} for job ${jobId}.`);
      await updateJobAndMaterial(supabaseAdmin, jobId, materialIdForUpdate, 'EXTRACTION_UNSUPPORTED', 'EXTRACTION_UNSUPPORTED', null, `File type ${file_type} is not supported for text extraction.`);
      return jsonResponse({ success: true, message: `File type ${file_type} not supported for extraction.`, jobId }, 202);
    }

    if (extractedText.trim() || (file_type.startsWith('image/') && typeof extractedText === 'string')) {
      await updateJobAndMaterial(supabaseAdmin, jobId, materialIdForUpdate, 'TEXT_EXTRACTED_PENDING_AI', 'PENDING_AI_GENERATION', extractedText);
      console.log(`[extractText:EXTRACTION_SUCCESS] Text extracted for job ${jobId}. Length: ${extractedText.length}`);
      return jsonResponse({ success: true, message: 'Text extracted successfully.', jobId }, 200);
    } else {
      await updateJobAndMaterial(supabaseAdmin, jobId, materialIdForUpdate, 'EXTRACTION_FAILED', 'EXTRACTION_FAILED', null, 'No text content could be extracted from the file.');
      console.warn(`[extractText:NO_TEXT_EXTRACTED] No text extracted for job ${jobId}.`);
      return jsonResponse({ success: false, error: 'No text content could be extracted.' }, 400);
    }

  } catch (err) {
    console.error(`[extractText:GLOBAL_ERROR] JobID: ${jobId || 'unknown'}. Error:`, err.message, err.stack);
    if (jobId) { // Ensure jobId is defined before trying to update status
      await updateJobAndMaterial(supabaseAdmin, jobId, materialIdForUpdate, 'EXTRACTION_FAILED', 'EXTRACTION_FAILED', null, `Unexpected error during extraction: ${err.message}`);
    }
    return jsonResponse({ success: false, error: 'An unexpected error occurred during text extraction.', details: err.message }, 500);
  }
});

