
// supabase/functions/saveTestResult/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient, PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface TestResultPayload {
  testTitle: string;
  originalTestId?: string | null; // ID of the saved_material if test was from there
  originalTestType?: string | null; // e.g., 'multipleChoice'
  score: number;
  totalQuestions: number;
  percentage: number;
  answers: any; // JSONB for detailed answers
  timeTakenSeconds?: number | null;
}

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
console.log('[saveTestResult] Function script loaded. Waiting for requests.');

serve(async (req: Request) => {
  const requestHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => { requestHeaders[key] = value; });
  console.log(`[saveTestResult] INVOKED - Method: ${req.method}, URL: ${req.url}, Headers: ${JSON.stringify(requestHeaders)}`);

  if (req.method === 'OPTIONS') {
    console.log('[saveTestResult] Handling OPTIONS request.');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[saveTestResult:CONFIG_ERROR] Supabase URL or Anon Key not configured.');
      return jsonResponse({ success: false, error: 'Server configuration error.' }, 500);
    }
    console.log('[saveTestResult:CONFIG_CHECK] Supabase URL and Anon Key found.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.warn('[saveTestResult:AUTH_ERROR] Missing Authorization header.');
      return jsonResponse({ success: false, error: 'Missing Authorization header.' }, 401);
    }
    console.log('[saveTestResult:AUTH_SETUP] Auth header present.');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.warn(`[saveTestResult:AUTH_FAILURE] User not authenticated. Error: ${userError?.message}`);
      return jsonResponse({ success: false, error: 'User not authenticated.', details: userError?.message }, 401);
    }
    console.log(`[saveTestResult:AUTH_SUCCESS] User authenticated: ${user.id}`);

    let payload: TestResultPayload;
    try {
      payload = await req.json();
      console.log('[saveTestResult:PAYLOAD_PARSE_SUCCESS] Payload parsed:', JSON.stringify(payload));
    } catch (e) {
      console.error('[saveTestResult:PAYLOAD_PARSE_ERROR] Invalid JSON payload:', e.message);
      return jsonResponse({ success: false, error: 'Invalid JSON payload.', details: e.message }, 400);
    }

    const { testTitle, originalTestId, originalTestType, score, totalQuestions, percentage, answers, timeTakenSeconds } = payload;

    if (testTitle === undefined || score === undefined || totalQuestions === undefined || percentage === undefined || answers === undefined) {
      console.warn('[saveTestResult:VALIDATION_ERROR] Missing required fields for test result. Payload:', payload);
      return jsonResponse({ success: false, error: 'Missing required fields for test result.' }, 400);
    }

    const dbPayload = {
      user_id: user.id,
      test_title: testTitle,
      original_test_id: originalTestId || null,
      original_test_type: originalTestType || "unknown",
      score,
      total_questions: totalQuestions,
      percentage,
      answers,
      time_taken_seconds: timeTakenSeconds !== undefined ? timeTakenSeconds : null,
      completed_at: new Date().toISOString(),
    };

    console.log(`[saveTestResult:INSERT_START] User ${user.id} saving test result. Payload: ${JSON.stringify(dbPayload)}`);
    const { data: newTestResult, error: dbError } = await supabase
      .from('test_results')
      .insert(dbPayload)
      .select()
      .single();

    if (dbError) {
      const pgError = dbError as PostgrestError;
      console.error('[saveTestResult:INSERT_DB_ERROR]', pgError.message, 'Code:', pgError.code, JSON.stringify(pgError));
      return jsonResponse({ success: false, error: 'Failed to save test result.', details: pgError.message, code: pgError.code }, 500);
    }

    console.log(`[saveTestResult:INSERT_SUCCESS] Test result ID: ${newTestResult.id} saved for user ${user.id}.`);
    return jsonResponse({ success: true, result: newTestResult, message: 'Test result saved successfully.' }, 201);

  } catch (err) {
    console.error('[saveTestResult:GLOBAL_ERROR]', err.message, err.stack);
    return jsonResponse({ success: false, error: 'An unexpected error occurred while saving test result.', details: err.message }, 500);
  }
});

