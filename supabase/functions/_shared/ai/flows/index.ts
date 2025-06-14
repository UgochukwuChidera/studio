

// This file, if used directly by Supabase Edge Functions,
// would typically be part of the bundled code for each function or managed via import maps.
// For dashboard deployment, the relevant types/exports from these flows
// would be copied/embedded directly into the Edge Function's index.ts.

// These types are useful for defining the expected structure of inputs/outputs for the AI flows.

// --- For generate-practice-test-flow ---
import type { BloomLevel } from '../schemas'; 
export interface MCQQuestionShared {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
  bloomLevel?: BloomLevel;
}
export interface DescriptiveQuestionShared {
  questionText: string;
  bloomLevel?: BloomLevel;
}
export type TestQuestionShared = MCQQuestionShared | DescriptiveQuestionShared;

export interface GeneratePracticeTestInputShared {
  textContent: string; 
  questionType: "multipleChoice" | "descriptive";
  numberOfQuestions: number;
  bloomLevel?: BloomLevel;
}
export interface GeneratePracticeTestOutputShared {
  testTitle: string;
  questions: TestQuestionShared[];
}

// --- For generate-flashcards-flow ---
export interface FlashcardShared {
  front: string;
  back: string;
}
export interface GenerateFlashcardsInputShared {
  textContent: string; 
  numberOfFlashcards?: number;
}
export interface GenerateFlashcardsOutputShared {
  title: string;
  flashcards: FlashcardShared[];
}

// --- For generate-notes-flow ---
export type NoteLengthShared = "short" | "medium" | "long";
export interface GenerateNotesInputShared {
  textContent: string; 
  noteLength?: NoteLengthShared;
}
export interface GenerateNotesOutputShared {
  title: string;
  notesContent: string; // Markdown content
}

// --- For ocr-handwritten-notes ---
export interface OCRHandwrittenNotesInputShared {
  photoDataUri: string; // Expects a data URI of the image
}
export interface OCRHandwrittenNotesOutputShared {
  extractedText: string;
}

// This file exports types from flows that are now intended to be EMBEDDED
// directly into the Supabase Edge Functions that need them (specifically
// `extractText` for OCR, and `textGenerate` for tests/notes/flashcards).
// The Next.js client will use the flows from `src/ai/flows/`.
// This `_shared` directory serves as a reference for the Genkit flow structures.

    
    