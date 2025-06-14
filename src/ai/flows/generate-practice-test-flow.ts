
'use server';
/**
 * @fileOverview AI flow to generate a practice test from uploaded material,
 * with options for question type, number of questions, and Bloom's Taxonomy level.
 *
 * - generatePracticeTest - A function that handles the test generation process.
 * - GeneratePracticeTestInput - The input type for the generatePracticeTest function.
 * - GeneratePracticeTestOutput - The return type for the generatePracticeTest function.
 * - MCQQuestion - Interface for Multiple Choice Questions.
 * - DescriptiveQuestion - Interface for Descriptive Questions.
 * - TestQuestion - Union type for test questions.
 * - BloomLevel - Enum for Bloom's Taxonomy levels.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { BloomLevelSchema, type BloomLevel } from '@/ai/schemas'; // Import from shared location

// Types are still fine to export
export type { BloomLevel };

const MCQQuestionSchema = z.object({
  questionText: z.string().describe("The main text of the multiple-choice question. Use LaTeX for mathematical/scientific notation (e.g., $x^2$, `\\frac{a}{b}`, `H_{2}O`)."),
  options: z.array(z.string().describe("A possible answer choice. Use LaTeX for mathematical/scientific notation if applicable.")).min(2).describe("An array of at least two possible answer choices (e.g., A, B, C, D)."),
  correctOptionIndex: z.number().int().min(0).describe("The 0-based index of the correct option in the 'options' array."),
  explanation: z.string().optional().describe("A brief explanation for why the correct answer is correct. Use LaTeX for mathematical/scientific notation if applicable."),
  bloomLevel: BloomLevelSchema.optional().describe("The Bloom's Taxonomy level this question targets, if specified during generation."),
});
export type MCQQuestion = z.infer<typeof MCQQuestionSchema>;

const DescriptiveQuestionSchema = z.object({
  questionText: z.string().describe("The main text of the descriptive/subjective question. This should require a written response assessing understanding, application, or analysis. Use LaTeX for mathematical/scientific notation (e.g., `\\int f(x)dx`)."),
  bloomLevel: BloomLevelSchema.optional().describe("The Bloom's Taxonomy level this question targets, if specified during generation."),
});
export type DescriptiveQuestion = z.infer<typeof DescriptiveQuestionSchema>;

const TestQuestionSchema = z.union([MCQQuestionSchema, DescriptiveQuestionSchema]);
export type TestQuestion = z.infer<typeof TestQuestionSchema>;

const GeneratePracticeTestInputSchema = z.object({
  fileDataUri: z
    .string()
    .optional() // Optional if textPrompt is provided
    .describe(
      "The content file (e.g., notes, textbook chapter) as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'. One of fileDataUri or textPrompt must be provided."
    ),
  textPrompt: z
    .string()
    .optional() // Optional if fileDataUri is provided
    .describe(
      "A text prompt describing the topic or content for test generation. One of fileDataUri or textPrompt must be provided."
    ),
  questionType: z.enum(["multipleChoice", "descriptive"]).describe("The type of questions to generate."),
  numberOfQuestions: z.number().int().min(1).max(100).describe("The desired number of questions for the test."), // Max changed to 100
  bloomLevel: BloomLevelSchema.optional().describe("The desired Bloom's Taxonomy level for the questions. If not specified, general difficulty will be used."),
}).refine(data => data.fileDataUri || data.textPrompt, {
  message: "Either fileDataUri or textPrompt must be provided.",
});
export type GeneratePracticeTestInput = z.infer<typeof GeneratePracticeTestInputSchema>;

const GeneratePracticeTestOutputSchema = z.object({
  testTitle: z.string().describe("A suitable title for the generated practice test, based on the content. Should be concise and informative."),
  questions: z.array(TestQuestionSchema).describe("An array of generated test questions matching the specified type and number."),
});
export type GeneratePracticeTestOutput = z.infer<typeof GeneratePracticeTestOutputSchema>;

export async function generatePracticeTest(input: GeneratePracticeTestInput): Promise<GeneratePracticeTestOutput> {
  return generatePracticeTestFlow(input);
}

const generatePracticeTestPrompt = ai.definePrompt({
  name: 'generatePracticeTestPrompt',
  input: {schema: GeneratePracticeTestInputSchema},
  output: {schema: GeneratePracticeTestOutputSchema},
  prompt: `You are an expert test creator specializing in educational assessments.
Your task is to generate a practice test based on the provided material.

{{#if fileDataUri}}
Source Document Content:
{{media url=fileDataUri}}
{{else if textPrompt}}
Source Topic/Prompt: {{{textPrompt}}}
{{/if}}

Test Requirements:
1.  Generate approximately {{{numberOfQuestions}}} questions of type '{{{questionType}}}'.
    *   If 'questionType' is 'multipleChoice':
        *   If you cannot generate the requested '{{{numberOfQuestions}}}' of high-quality multiple-choice questions from the provided material, **generate as many high-quality MCQs as possible up to the requested number, while still adhering to all other MCQ requirements specified below. Do not return an empty 'questions' array if at least one valid MCQ can be formed.**
        *   If no MCQs can be reasonably generated from the material, you MUST still return a valid JSON object with an empty 'questions' array. Do not invent questions unrelated to the material.
    *   The exact number of questions can vary slightly from the requested number if it improves overall quality, but strive to be close to '{{{numberOfQuestions}}}'.
2.  The questions should be of type: {{{questionType}}}.
{{#if bloomLevel}}
3.  Target the Bloom's Taxonomy level: {{{bloomLevel}}}. (Remember, Understand, Apply, Analyze, Evaluate, Create). Assign the bloomLevel field for each question.
{{else}}
3.  Target a general difficulty appropriate for the provided content.
{{/if}}
4.  **Formatting for Math/Science**: For ALL mathematical formulas, chemical equations, physics expressions, or any other complex scientific notation within question texts, options, and explanations, YOU MUST use LaTeX syntax. Enclose inline LaTeX with '$...$' and display LaTeX with '$$...$$'.
    Examples: '$x^{2}$', '$\\frac{a}{b}$', '$\\int_{a}^{b} f(x) dx$', '$H_{2}O$'.
    For very simple notations like single variable exponents (e.g., x²), Unicode characters are acceptable if LaTeX is overly verbose, but prefer LaTeX for consistency and complex expressions.
5.  If 'questionType' is 'multipleChoice':
    *   Each question must have a clear question text.
    *   Provide a list of distinct answer options (at least 2, preferably 4).
    *   Clearly indicate the 0-based index of the correct option in the 'options' array.
    *   Optionally, provide a brief explanation for the correct answer.
6.  If 'questionType' is 'descriptive':
    *   Each question must be an open-ended, descriptive, or subjective question that requires a written response.
7.  **CRITICAL: Accuracy and Validity - CROSS-CHECK YOUR WORK**:
    *   **Before outputting, meticulously review and cross-check EVERY question, its options, the indicated correct answer, and any explanation. Ensure ABSOLUTE factual accuracy for all information.**
    *   **It is IMPERATIVE that the 'correctOptionIndex' accurately points to the objectively correct answer among the 'options' provided.**
    *   **The 'explanation' field MUST clearly and correctly justify why the chosen option is correct.**
    *   **For questions of fact, definition, or established knowledge YOU MUST double-check your response for accuracy. Verify against reliable knowledge. Avoid ambiguous or subjective MCQs unless the question type is 'descriptive' and explicitly asks for such a response.**
    *   **If the provided material is insufficient to generate a high-quality, factually accurate question, prioritize generating fewer questions of high quality or indicate if no suitable questions can be formed. DO NOT invent information or create misleading questions.**
8.  Generate a suitable, concise 'testTitle' for the practice test. This title should be generated even if the 'questions' array is empty.
9.  Ensure all questions are directly relevant to the provided document content or text prompt.
10. Your entire response MUST be a single JSON object that strictly conforms to the 'GeneratePracticeTestOutput' schema. Do not output the schema definition itself, only the JSON data. All string values within the JSON must be properly escaped.
`,
});

const generatePracticeTestFlow = ai.defineFlow(
  {
    name: 'generatePracticeTestFlow',
    inputSchema: GeneratePracticeTestInputSchema,
    outputSchema: GeneratePracticeTestOutputSchema,
  },
  async (input: GeneratePracticeTestInput) => {
    const {output} = await generatePracticeTestPrompt(input);
    if (!output) {
      throw new Error("AI failed to generate test output. The response was empty.");
    }
     // Check if output is a string that looks like a schema definition
    if (typeof output === 'string' && output.includes('"type": "object"')) {
        console.error("AI returned schema definition instead of data:", output);
        throw new Error("AI returned an unexpected format. Please try again.");
    }

    if (!output.questions || !Array.isArray(output.questions)) {
        console.warn("AI output is missing 'questions' array or it's not an array. Setting to empty array.", output);
        output.questions = [];
    }
    
    if (!output.testTitle || typeof output.testTitle !== 'string' || output.testTitle.trim() === "") {
        console.warn("AI output is missing 'testTitle' or it's empty. Generating a default title.");
        const sourceName = input.textPrompt ? `"${input.textPrompt.substring(0, 20)}..."` : (input.fileDataUri ? "Uploaded Material" : "Content");
        output.testTitle = `Practice Test on ${sourceName}`; 
    }
    return output;
  }
);
