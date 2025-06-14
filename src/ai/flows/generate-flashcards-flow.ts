
'use server';
/**
 * @fileOverview AI flow to generate flashcards from uploaded material.
 *
 * - generateFlashcards - A function that handles the flashcard generation process.
 * - GenerateFlashcardsInput - The input type for the generateFlashcards function.
 * - GenerateFlashcardsOutput - The return type for the generateFlashcards function.
 * - Flashcard - Interface for a single flashcard.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FlashcardSchema = z.object({
  front: z.string().describe("The content for the front of the flashcard (e.g., a question, term, or concept). Must be plain text or use LaTeX for formulas (e.g., $E=mc^2$). Should be concise."),
  back: z.string().describe("The content for the back of the flashcard (e.g., a short answer, definition, or brief explanation). Must be plain text or use LaTeX for formulas. Should be concise."),
});
export type Flashcard = z.infer<typeof FlashcardSchema>;

const GenerateFlashcardsInputSchema = z.object({
  fileDataUri: z
    .string()
    .optional()
    .describe(
      "The content file (e.g., notes, textbook chapter) as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'. One of fileDataUri or textPrompt must be provided."
    ),
  textPrompt: z
    .string()
    .optional()
    .describe(
      "A text prompt describing the topic or content for flashcard generation. One of fileDataUri or textPrompt must be provided."
    ),
  numberOfFlashcards: z.number().int().min(1).max(50).optional().default(10).describe("The desired number of flashcards to generate."),
}).refine(data => data.fileDataUri || data.textPrompt, {
  message: "Either fileDataUri or textPrompt must be provided.",
});
export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsInputSchema>;

const GenerateFlashcardsOutputSchema = z.object({
  title: z.string().describe("A suitable title for the set of flashcards, based on the content. Should be concise."),
  flashcards: z.array(FlashcardSchema).describe("An array of generated flashcards."),
});
export type GenerateFlashcardsOutput = z.infer<typeof GenerateFlashcardsOutputSchema>;

export async function generateFlashcards(input: GenerateFlashcardsInput): Promise<GenerateFlashcardsOutput> {
  return generateFlashcardsFlow(input);
}

const generateFlashcardsPrompt = ai.definePrompt({
  name: 'generateFlashcardsPrompt',
  input: {schema: GenerateFlashcardsInputSchema},
  output: {schema: GenerateFlashcardsOutputSchema},
  prompt: `You are an expert in creating concise and effective study materials, specifically Q&A style flashcards.
Your task is to generate a set of flashcards based on the provided material.

{{#if fileDataUri}}
Source Document Content:
{{media url=fileDataUri}}
{{else if textPrompt}}
Source Topic/Prompt: {{{textPrompt}}}
{{/if}}

Flashcard Requirements:
1.  Generate approximately {{{numberOfFlashcards}}} flashcards.
2.  Each flashcard must have a 'front' (question/term) and a 'back' (answer/definition).
3.  **Formatting**: Content for 'front' and 'back' should primarily be PLAIN TEXT.
    *   **For any mathematical formulas, chemical equations, or complex scientific notation, YOU MUST use LaTeX syntax.** Enclose inline LaTeX with '$...$' (e.g., '$x^{2}$') and display LaTeX with '$$...$$'.
    *   Avoid Markdown formatting (like asterisks, hashes) unless it's part of a LaTeX expression.
4.  Generate a concise 'title' for the flashcard set.
5.  Ensure relevance to the provided material.
6.  Your entire response MUST be a single JSON object conforming to 'GenerateFlashcardsOutput' schema.
`,
});

const generateFlashcardsFlow = ai.defineFlow(
  {
    name: 'generateFlashcardsFlow',
    inputSchema: GenerateFlashcardsInputSchema,
    outputSchema: GenerateFlashcardsOutputSchema,
  },
  async (input: GenerateFlashcardsInput) => {
    const {output} = await generateFlashcardsPrompt(input);
    if (!output) {
      throw new Error("AI failed to generate flashcards output. The response was empty.");
    }
    // Check if output is a string that looks like a schema definition
    if (typeof output === 'string' && output.includes('"type": "object"')) {
        console.error("AI returned schema definition instead of data:", output);
        throw new Error("AI returned an unexpected format. Please try again.");
    }

    if (!output.flashcards || !Array.isArray(output.flashcards)) {
        console.warn("AI generated an invalid flashcard set or missing 'flashcards' array.");
        output.flashcards = [];
    }
    if (!output.title || typeof output.title !== 'string' || output.title.trim() === "") {
        const sourceName = input.textPrompt ? `"${input.textPrompt.substring(0, 20)}..."` : (input.fileDataUri ? "Uploaded Material" : "Content");
        output.title = `Flashcards on ${sourceName}`;
    }
    return output;
  }
);

