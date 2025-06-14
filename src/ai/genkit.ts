
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

if (!process.env.GOOGLE_API_KEY) {
  const errorMessage =
    "**********************************************************************************\n" +
    "FATAL ERROR: GOOGLE_API_KEY is not defined in your .env file.\n" +
    "The AI features of this application (test generation, flashcards, notes, OCR)\n" +
    "will NOT function correctly without it.\n\n" +
    "Please obtain an API key for the Gemini API (e.g., via Google AI Studio or Google Cloud Console)\n" +
    "and add it to your .env file like this: GOOGLE_API_KEY=YOUR_API_KEY_HERE\n" +
    "After adding the key, you MUST restart your development server for the change to take effect.\n\n" +
    "If you are facing regional, age, or other restrictions when trying to obtain a key,\n" +
    "you may need to explore alternative ways to access Google's generative AI services\n" +
    "or check Google's latest documentation for updates specific to your situation.\n" +
    "Unfortunately, I cannot generate an API key for you.\n" +
    "**********************************************************************************";
  
  // Log to console. This will appear when the server starts or when this module is first imported.
  console.error(errorMessage);

  // For development, you might want the application to still attempt to run so you can work on non-AI features.
  // If the AI key is absolutely critical for startup, you could throw an error here:
  // throw new Error("CRITICAL: GOOGLE_API_KEY is missing. AI features will fail. Please see console for details.");
}

export const ai = genkit({
  plugins: [
    googleAI() // The googleAI plugin will look for GOOGLE_API_KEY in process.env by default.
              // If you have the key and it's still not working, you can try explicitly passing it:
              // googleAI({ apiKey: process.env.GOOGLE_API_KEY })
  ],
  // You can set a default model for Genkit here if desired, for example:
  model: 'googleai/gemini-1.5-flash-latest', 
});

