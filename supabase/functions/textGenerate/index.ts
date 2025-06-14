
// supabase/functions/textGenerate/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { genkit, z } from 'https://esm.sh/@genkit-ai/core@1.8.0?pin=v135';
import { googleAI } from 'https://esm.sh/@genkit-ai/googleai@1.8.0?pin=v135';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id, x-supabase-edge-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

let genkitForContentGenInitialized = false;
let generatePracticeTestFlowInternal: any;
let generateFlashcardsFlowInternal: any;
let generateNotesFlowInternal: any;

// --- Internal Zod Schemas for AI Flows ---
const BloomLevelSchemaInternal = z.enum(["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"])
    .describe("The desired cognitive complexity level based on Bloom's Taxonomy.");

const MCQQuestionSchemaInternal = z.object({
  questionText: z.string().describe("The main text of the multiple-choice question. Use LaTeX for math."),
  options: z.array(z.string().describe("A possible answer choice. Use LaTeX for math.")).min(2),
  correctOptionIndex: z.number().int().min(0).describe("The 0-based index of the correct option."),
  explanation: z.string().optional().describe("A brief explanation. Use LaTeX for math."),
  bloomLevel: BloomLevelSchemaInternal.optional(),
});

const DescriptiveQuestionSchemaInternal = z.object({
  questionText: z.string().describe("The main text of the descriptive question. Use LaTeX for math."),
  bloomLevel: BloomLevelSchemaInternal.optional(),
});

const TestQuestionSchemaInternal = z.union([MCQQuestionSchemaInternal, DescriptiveQuestionSchemaInternal]);

const FlashcardSchemaInternal = z.object({
  front: z.string().describe("Content for the front of the flashcard (question/term). LaTeX for math."),
  back: z.string().describe("Content for the back of the flashcard (answer/definition). LaTeX for math."),
});
// --- End Internal Zod Schemas ---

async function initializeGenkitAndContentFlows() {
  console.log('[textGenerate:AI_INIT] Attempting to initialize Genkit and content flows...');
  if (genkitForContentGenInitialized) {
    console.log('[textGenerate:AI_INIT] Genkit already initialized.');
    return;
  }
  try {
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
    if (!googleApiKey) {
      console.warn('[textGenerate:AI_INIT_ERROR] GOOGLE_API_KEY not found in environment variables. AI generation will fail.');
      return; // Do not set genkitForContentGenInitialized = true
    }
    console.log('[textGenerate:AI_INIT] GOOGLE_API_KEY found.');

     if (!genkit.plugins().find(p => p.name === 'googleAI')) {
        genkit.config({
            plugins: [googleAI({ apiKey: googleApiKey })],
            logLevel: 'warn', // Changed from 'info' to 'warn'
            enableTracingAndMetrics: false, // Disabled tracing
        });
        console.log('[textGenerate:AI_INIT] genkit.config() called with googleAI plugin.');
    } else {
        console.log('[textGenerate:AI_INIT] Genkit Google AI plugin was already configured.');
    }

    // --- Define Generate Practice Test Flow ---
    const GeneratePracticeTestInputSchemaEF = z.object({
      textContent: z.string().describe("The text content to generate the test from."),
      questionType: z.enum(["multipleChoice", "descriptive"]),
      numberOfQuestions: z.number().int().min(1).max(100),
      bloomLevel: BloomLevelSchemaInternal.optional(),
    });
    const GeneratePracticeTestOutputSchemaEF = z.object({
      testTitle: z.string().describe("A suitable title for the generated practice test."),
      questions: z.array(TestQuestionSchemaInternal).describe("Array of generated test questions."),
    });
    const testPrompt = genkit.definePrompt({
      name: 'generatePracticeTestPromptEmbedded_textGen_v3',
      input: { schema: GeneratePracticeTestInputSchemaEF },
      output: { schema: GeneratePracticeTestOutputSchemaEF },
      prompt: `You are an expert test creator specializing in educational assessments.
Your task is to generate a practice test based on the provided material.
Material: {{{textContent}}}
Question Type: {{{questionType}}}
Number of Questions: {{{numberOfQuestions}}}
{{#if bloomLevel}}Target Bloom's Taxonomy level: {{{bloomLevel}}}{{/if}}
Ensure factual accuracy. For MCQs, provide distinct options and a clear correct answer. Use LaTeX for all mathematical/scientific notation (e.g., $x^2$).
Strictly follow the output JSON schema. Do not output the schema definition itself, only the JSON data. All string values within the JSON must be properly escaped.`,
    });
    generatePracticeTestFlowInternal = genkit.defineFlow({
      name: 'generatePracticeTestFlowEmbedded_textGen_v3',
      inputSchema: GeneratePracticeTestInputSchemaEF,
      outputSchema: GeneratePracticeTestOutputSchemaEF
    },
      async (input) => {
        const { output } = await testPrompt.run(input);
        if (!output) throw new Error("Practice test generation flow did not return output.");
        return output;
      }
    );
    console.log('[textGenerate:AI_INIT] generatePracticeTestFlowInternal defined.');

    // --- Define Generate Flashcards Flow ---
    const GenerateFlashcardsInputSchemaEF = z.object({
      textContent: z.string().describe("The text content for flashcards."),
      numberOfFlashcards: z.number().int().min(1).max(50).optional().default(10),
    });
    const GenerateFlashcardsOutputSchemaEF = z.object({
      title: z.string().describe("A suitable title for the flashcard set."),
      flashcards: z.array(FlashcardSchemaInternal).describe("Array of generated flashcards."),
    });
    const flashcardsPrompt = genkit.definePrompt({
        name: 'generateFlashcardsPromptEmbedded_textGen_v3',
        input: {schema: GenerateFlashcardsInputSchemaEF},
        output: {schema: GenerateFlashcardsOutputSchemaEF},
        prompt: `Generate approximately {{{numberOfFlashcards}}} flashcards from the following material:
{{{textContent}}}
Each flashcard must have a 'front' (question/term) and a 'back' (answer/definition).
Use LaTeX for any mathematical formulas or scientific notation.
Output a suitable 'title' for the flashcard set.
Strictly follow the output JSON schema.`
    });
    generateFlashcardsFlowInternal = genkit.defineFlow({
        name: 'generateFlashcardsFlowEmbedded_textGen_v3',
        inputSchema: GenerateFlashcardsInputSchemaEF,
        outputSchema: GenerateFlashcardsOutputSchemaEF
    },
      async (input) => {
        const { output } = await flashcardsPrompt.run(input);
        if (!output) throw new Error("Flashcard generation flow did not return output.");
        return output;
      }
    );
    console.log('[textGenerate:AI_INIT] generateFlashcardsFlowInternal defined.');

    // --- Define Generate Notes Flow ---
    const GenerateNotesInputSchemaEF = z.object({
      textContent: z.string().describe("The text content for notes."),
      noteLength: z.enum(["short", "medium", "long"]).optional().default("medium"),
    });
    const GenerateNotesOutputSchemaEF = z.object({
      title: z.string().describe("A suitable title for the notes."),
      notesContent: z.string().describe("Summary notes in Markdown format. Start with H1 title. Use LaTeX for math.")
    });
    const notesPrompt = genkit.definePrompt({
        name: 'generateNotesPromptEmbedded_textGen_v3',
        input: {schema: GenerateNotesInputSchemaEF},
        output: {schema: GenerateNotesOutputSchemaEF},
        prompt: `Generate engaging summary notes of '{{{noteLength}}}' length from the material:
{{{textContent}}}
The 'notesContent' MUST be a single string using Markdown (begin with an H1 title like '# Notes Title'). For ALL formulas or scientific notation, use LaTeX syntax.
Output a 'title' field for metadata.
Strictly follow the output JSON schema.`
    });
    generateNotesFlowInternal = genkit.defineFlow({
        name: 'generateNotesFlowEmbedded_textGen_v3',
        inputSchema: GenerateNotesInputSchemaEF,
        outputSchema: GenerateNotesOutputSchemaEF
    },
      async (input) => {
        const { output } = await notesPrompt.run(input);
        if (!output) throw new Error("Notes generation flow did not return output.");
        return output;
      }
    );
    console.log('[textGenerate:AI_INIT] generateNotesFlowInternal defined.');

    genkitForContentGenInitialized = true;
    console.log('[textGenerate:AI_INIT_SUCCESS] Embedded Genkit and AI content flows initialized successfully.');
  } catch (e) {
    console.error('[textGenerate:AI_INIT_FAILURE] Critical error during Genkit/Flows initialization:', e.message, e.stack);
  }
}

interface GeneratePayload {
  textContent: string;
  generationType: 'test' | 'notes' | 'flashcards';
  generationParams: any;
}

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

console.log('[textGenerate] Function script loaded. Waiting for requests.');

serve(async (req: Request) => {
  const requestHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => { requestHeaders[key] = value; });
  console.log(`[textGenerate] INVOKED - Method: ${req.method}, URL: ${req.url}, Headers: ${JSON.stringify(requestHeaders)}`);

  if (req.method === 'OPTIONS') {
    console.log('[textGenerate] Handling OPTIONS request.');
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
     if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[textGenerate:CONFIG_ERROR] Supabase URL or Anon Key not found in environment variables.');
      return jsonResponse({ success: false, error: 'Server configuration error: Missing Supabase credentials.' }, 500);
    }
    console.log('[textGenerate:CONFIG_CHECK] Supabase URL and Anon Key found.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.warn('[textGenerate:AUTH_ERROR] Missing Authorization header.');
      return jsonResponse({ success: false, error: 'Missing Authorization header.' }, 401);
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
    });
    console.log('[textGenerate:AUTH_SETUP] Supabase client created with auth header.');

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        console.warn(`[textGenerate:AUTH_FAILURE] User not authenticated. Error: ${userError?.message}`);
        return jsonResponse({ success: false, error: 'User not authenticated.', details: userError?.message }, 401);
    }
    console.log(`[textGenerate:AUTH_SUCCESS] User authenticated: ${user.id}`);

    await initializeGenkitAndContentFlows();
    if (!genkitForContentGenInitialized) {
      console.error('[textGenerate:AI_INIT_CHECK_FAILED] AI Content Generation service failed to initialize. This usually means GOOGLE_API_KEY is missing or invalid.');
      return jsonResponse({ success: false, error: 'AI Content Generation service not initialized. Check server logs for GOOGLE_API_KEY issues.' }, 503);
    }
    console.log('[textGenerate:AI_INIT_CHECK_SUCCESS] Genkit initialization confirmed.');


    let payload: GeneratePayload;
    try {
      payload = await req.json();
      console.log('[textGenerate:PAYLOAD_PARSE_SUCCESS] Payload parsed successfully:', JSON.stringify(payload));
    } catch (e) {
      console.error('[textGenerate:PAYLOAD_PARSE_ERROR] Invalid JSON payload:', e.message);
      return jsonResponse({ success: false, error: 'Invalid JSON payload.', details: e.message }, 400);
    }

    const { textContent, generationType, generationParams } = payload;
    if (!textContent || !generationType || !generationParams) {
      console.warn('[textGenerate:PAYLOAD_VALIDATION_ERROR] Missing required fields in payload. Received:', payload);
      return jsonResponse({ success: false, error: 'Missing required fields (textContent, generationType, generationParams).' }, 400);
    }

    console.log(`[textGenerate:PROCESSING_START] User ${user.id} generating ${generationType}. Params: ${JSON.stringify(generationParams)}. Text content length: ${textContent.length}`);

    let aiResult: any;
    let flowToRun: any;
    let inputForFlow: any;

    switch (generationType) {
      case 'test':
        flowToRun = generatePracticeTestFlowInternal;
        inputForFlow = {
          textContent,
          questionType: generationParams.questionType || "multipleChoice",
          numberOfQuestions: generationParams.numberOfQuestions || 10,
          bloomLevel: generationParams.bloomLevel,
        };
        break;
      case 'notes':
        flowToRun = generateNotesFlowInternal;
        inputForFlow = {
          textContent,
          noteLength: generationParams.noteLength || "medium",
        };
        break;
      case 'flashcards':
        flowToRun = generateFlashcardsFlowInternal;
        inputForFlow = {
          textContent,
          numberOfFlashcards: generationParams.numberOfFlashcards || 10,
        };
        break;
      default:
        console.warn(`[textGenerate:TYPE_ERROR] Unsupported generation type: ${generationType}`);
        return jsonResponse({ success: false, error: `Unsupported generation type: ${generationType}` }, 400);
    }

    if (!flowToRun) {
        console.error(`[textGenerate:FLOW_ERROR] AI flow for ${generationType} is not available/defined.`);
        return jsonResponse({ success: false, error: `AI flow for ${generationType} not available.` }, 500);
    }
    
    console.log(`[textGenerate:AI_FLOW_INVOKE] Invoking Genkit flow '${flowToRun.name}' for ${generationType}. Input (truncated): ${JSON.stringify(inputForFlow).substring(0, 200)}...`);
    try {
        aiResult = await flowToRun.run(inputForFlow);
    } catch (flowError) {
        console.error(`[textGenerate:AI_FLOW_EXECUTION_ERROR] Error during Genkit flow execution for ${generationType}:`, flowError.message, flowError.stack);
        let clientErrorMessage = `AI generation for ${generationType} failed.`;
        if (flowError.message?.includes("SAFETY")) {
            clientErrorMessage = "Content generation blocked due to safety settings. Try a different prompt.";
        } else if (flowError.message?.includes("quota")) {
            clientErrorMessage = "AI processing quota exceeded. Please try again later.";
        } else if (flowError.message) {
            clientErrorMessage = `AI Error: ${flowError.message}`;
        }
        return jsonResponse({ success: false, error: clientErrorMessage, details: flowError.message }, 500);
    }


    if (!aiResult) {
      console.error(`[textGenerate:AI_RESULT_ERROR] AI generation for ${generationType} returned no result (null or undefined).`);
      throw new Error(`AI generation for ${generationType} returned no result.`);
    }
    
    console.log(`[textGenerate:PROCESSING_SUCCESS] Successfully generated ${generationType} for user ${user.id}. Output length: ${JSON.stringify(aiResult).length}`);
    return jsonResponse({ success: true, generatedContent: aiResult }, 200);

  } catch (err) {
    console.error('[textGenerate:GLOBAL_ERROR] An unhandled error occurred in the main try-catch block:', err.message, err.stack);
    let errorMessage = 'An unexpected error occurred during AI content generation.';
    if (err.message?.includes("SAFETY")) { 
        errorMessage = "Content generation blocked due to safety settings. Try a different prompt.";
    } else if (err.message) {
        errorMessage = err.message;
    }
    return jsonResponse({ success: false, error: errorMessage, details: err.stack }, 500);
  }
});

