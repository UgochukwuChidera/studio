
'use server';
/**
 * @fileOverview AI flow to generate summary notes from uploaded material with varying lengths.
 *
 * - generateNotes - A function that handles the note generation process.
 * - GenerateNotesInput - The input type for the generateNotes function.
 * - GenerateNotesOutput - The return type for the generateNotes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export type NoteLength = "short" | "medium" | "long";

const GenerateNotesInputSchema = z.object({
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
      "A text prompt describing the topic or content for note generation. One of fileDataUri or textPrompt must be provided."
    ),
  noteLength: z.enum(["short", "medium", "long"])
    .optional()
    .default("medium")
    .describe("The desired length and detail of the notes (short: ~3 min read, medium: ~7 min read, long: ~10 min read)."),
}).refine(data => data.fileDataUri || data.textPrompt, {
  message: "Either fileDataUri or textPrompt must be provided.",
});
export type GenerateNotesInput = z.infer<typeof GenerateNotesInputSchema>;

const GenerateNotesOutputSchema = z.object({
  title: z.string().describe("A suitable, concise title for the notes, based on the content. This title is for metadata; the main display title should be an H1 in notesContent."),
  notesContent: z.string().describe("A concise, engaging, and easy-to-read summary of the key information. This should be a single string using well-structured markdown. The content MUST begin with the title formatted as a Markdown H1 heading (e.g., '# My Notes Title'). For any formulas or scientific notation, use LaTeX syntax enclosed in '$...$' for inline math or '$$...$$' for display math (e.g., '$E=mc^2$', '$\\frac{1}{2}$')."),
});
export type GenerateNotesOutput = z.infer<typeof GenerateNotesOutputSchema>;

export async function generateNotes(input: GenerateNotesInput): Promise<GenerateNotesOutput> {
  return generateNotesFlow(input);
}

const generateNotesPrompt = ai.definePrompt({
  name: 'generateNotesPrompt',
  input: {schema: GenerateNotesInputSchema},
  output: {schema: GenerateNotesOutputSchema},
  prompt: `You are an expert in creating fun, interactive, and easy-to-read summary notes from complex study materials. 🎯
Your task is to read the provided material and generate engaging summary notes that highlight key concepts and main points.

{{#if fileDataUri}}
Source Document Content:
{{media url=fileDataUri}}
{{else if textPrompt}}
Source Topic/Prompt: {{{textPrompt}}}
{{/if}}

Note Generation Requirements:
1.  **Length & Detail**: Generate notes of approximately {{{noteLength}}} length and detail.
    *   'short': Aim for a summary readable in about 3 minutes. Very concise.
    *   'medium': Aim for a summary readable in about 7 minutes. Balanced detail.
    *   'long': Aim for a summary readable in about 10-12 minutes. More comprehensive.
    Adjust conciseness and depth of information accordingly.
2.  **Title as Markdown H1**: Generate a concise 'title' for the notes. THIS TITLE MUST BE THE FIRST LINE OF THE 'notesContent' AS A MARKDOWN H1 HEADING (e.g., "# Generated Notes Title").
3.  **Extract Critical Info**: Identify key concepts, definitions 💡, main arguments, significant examples.
4.  **Structure Logically with Markdown**: Use markdown extensively (headings, subheadings, bullets, bold, italics).
    *   **Mathematical/Scientific Notation**: For ALL formulas, chemical equations, etc., YOU MUST use LaTeX syntax. Enclose inline LaTeX with '$...$' (e.g., '$x^{2}$') and display LaTeX with '$...$'.
      Examples: '$E=mc^2$', '$\\frac{a}{b}$', '$\\int_{a}^{b} f(x) dx$', '$H_{2}O$'.
5.  **Engaging & Accessible Language**: Clear, concise, motivating, fun. 🤓 Use relevant emojis (🚀, ✨, 🤔, ✅) judiciously.
6.  **Single String Output**: 'notesContent' must be a single string with markdown (and LaTeX) embedded.
7.  **True Summary**: Digestible and memorable transformation, not copied sentences.
8.  **JSON Format**: Entire response MUST be a single JSON object conforming to 'GenerateNotesOutput' schema. Ensure the 'title' field in the JSON output is also populated (this can be the same as the H1 title in 'notesContent', but without the '#' markdown).
`,
});

const generateNotesFlow = ai.defineFlow(
  {
    name: 'generateNotesFlow',
    inputSchema: GenerateNotesInputSchema,
    outputSchema: GenerateNotesOutputSchema,
  },
  async (input: GenerateNotesInput) => {
    const {output} = await generateNotesPrompt(input);
    if (!output) {
      throw new Error("AI failed to generate notes output. The response was empty.");
    }
     // Check if output is a string that looks like a schema definition
    if (typeof output === 'string' && output.includes('"type": "object"')) {
        console.error("AI returned schema definition instead of data:", output);
        throw new Error("AI returned an unexpected format. Please try again.");
    }

    if (!output.notesContent || typeof output.notesContent !== 'string' || output.notesContent.trim() === "") {
        console.warn("AI generated empty or invalid notes content.");
        output.notesContent = "# Notes Error\n\nNo summary could be generated for this content.";
    }
    if (!output.title || typeof output.title !== 'string' || output.title.trim() === "") {
        // Try to extract title from H1 if AI forgot to populate the separate title field
        const h1Match = output.notesContent.match(/^#\s*(.*)/);
        if (h1Match && h1Match[1]) {
            output.title = h1Match[1].trim();
        } else {
            const sourceName = input.textPrompt ? `"${input.textPrompt.substring(0, 20)}..."` : (input.fileDataUri ? "Uploaded Material" : "Content");
            output.title = `Key Notes on ${sourceName}`;
            if (!output.notesContent.startsWith('#')) { // Prepend a title if one wasn't in markdown
                 output.notesContent = `# ${output.title}\n\n${output.notesContent}`;
            }
        }
    }
    return output;
  }
);

    