'use server';

/**
 * @fileOverview This file defines a Genkit flow for extracting text from uploaded handwritten notes using OCR.
 *
 * - ocrHandwrittenNotes - A function that handles the OCR process and returns the extracted text.
 * - OCRHandwrittenNotesInput - The input type for the ocrHandwrittenNotes function.
 * - OCRHandwrittenNotesOutput - The return type for the ocrHandwrittenNotes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OCRHandwrittenNotesInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of handwritten notes, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type OCRHandwrittenNotesInput = z.infer<typeof OCRHandwrittenNotesInputSchema>;

const OCRHandwrittenNotesOutputSchema = z.object({
  extractedText: z.string().describe('The extracted text from the handwritten notes.'),
});
export type OCRHandwrittenNotesOutput = z.infer<typeof OCRHandwrittenNotesOutputSchema>;

export async function ocrHandwrittenNotes(input: OCRHandwrittenNotesInput): Promise<OCRHandwrittenNotesOutput> {
  return ocrHandwrittenNotesFlow(input);
}

const ocrHandwrittenNotesPrompt = ai.definePrompt({
  name: 'ocrHandwrittenNotesPrompt',
  input: {schema: OCRHandwrittenNotesInputSchema},
  output: {schema: OCRHandwrittenNotesOutputSchema},
  prompt: `You are an OCR bot. Extract the text from the following image of handwritten notes. Return the extracted text.

Handwritten Notes: {{media url=photoDataUri}}`,
});

const ocrHandwrittenNotesFlow = ai.defineFlow(
  {
    name: 'ocrHandwrittenNotesFlow',
    inputSchema: OCRHandwrittenNotesInputSchema,
    outputSchema: OCRHandwrittenNotesOutputSchema,
  },
  async input => {
    const {output} = await ocrHandwrittenNotesPrompt(input);
    return output!;
  }
);
