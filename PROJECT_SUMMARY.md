
# TestPrep AI - Application Summary
Version 1.5 (Reflecting Corrected EF Names and DB Schema Status Column)

## 1. App Overview

**App Name**: TestPrep AI

**Core Purpose**: A cross-platform test preparation application enabling users to generate, take, and share AI-powered tests.

## 2. Core Features & Implementation Status

| Feature Category          | Feature                                       | Status & Implementation Details                                                                                                                                                                                                                                                                                                   |
| :------------------------ | :-------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **UI & UX**             | **Design System**                             | Implemented: Light/Dark themes, responsive sidebar.                                                                                                                                                                                                                                                                               |
|                           | **Tools (Calculator, Sandbox etc.)**         | Implemented (UI & basic logic).                                                                                                                                                                                                                                                                                               |
| **Test Creation & Mgmt**  | **AI Test/Notes/Flashcard Generation**        | **Revised Flow:** <br/> 1. **TXT/Direct Prompt:** Client calls `textGenerate` Supabase EF. EF runs Genkit AI, returns raw content. Client calls `saveMaterial` EF (with `status: "COMPLETED"`) to save final content to `saved_materials`. <br/> 2. **DOCX/PDF/Image:** Client uploads to Supabase Storage. Calls `saveMaterial` EF (creates placeholder in `saved_materials` with `status: "PENDING_EXTRACTION"`, returns `materialId`). Then calls `initFileProcessing` EF with `materialId`. This EF creates `file_processing_jobs` record & async calls `extractText` EF. <br/> 3. **`extractText` EF:** Downloads, extracts text (DOCX/PDF via JS libs; Image via embedded Genkit OCR). Updates `file_processing_jobs` with text & status `TEXT_EXTRACTED_PENDING_AI`. Also updates linked `saved_materials` record (sets `source_text_prompt` and its top-level `status` to `PENDING_AI_GENERATION`). <br/> 4. **Client:** Polls `file_processing_jobs`. On text ready (`TEXT_EXTRACTED_PENDING_AI`), fetches `source_text_prompt` from `saved_materials` (or job record) and **runs Genkit AI (test/notes/flashcards) CLIENT-SIDE**. Calls `saveMaterial` EF with final content, `materialId` to update, and `status: "COMPLETED"` for `saved_materials`. <br/> 5. **PPTX:** `extractText` EF marks job as `EXTRACTION_UNSUPPORTED`, and `saved_materials` status as `EXTRACTION_FAILED`. |
|                           | **OCR for Handwritten Notes (Images)**        | Implemented: `extractText` Supabase EF uses an embedded Genkit `ocrHandwrittenNotes` flow (Gemini Vision) for image inputs.                                                                                                                                                                                                |
|                           | **Test/Material Sharing (Public Links)**      | Implemented (Simulated via `sessionStorage` for client-generated content before save). Real links would need unique IDs from `saved_materials`.                                                                                                                                                                             |
|                           | **Download Tests/Materials**                  | Implemented (JSON download). PDF for Notes placeholder.                                                                                                                                                                                                                                                                         |
|                           | **Save/Import Materials**                     | **Cloud-centric:** `saveMaterial` EF saves final content to `saved_materials` (handles insert/update, uses dedicated `status` column). Local import via JSON triggers save to cloud. `file_processing_jobs` table tracks file processing stages.                                                                                                                                            |
| **Security & Auth**       | **Authentication Methods**                    | Implemented (Supabase Client: Email/Password, Google).                                                                                                                                                                                                                                                                          |
|                           | **Data Encryption (E2E)**                     | Aspirational.                                                                                                                                                                                                                                                                                                                   |
|                           | **GDPR Cookie Consent**                       | Implemented (Basic Banner).                                                                                                                                                                                                                                                                                                     |
| **Analytics & Reporting** | **Dashboard Analytics**                       | Partially Implemented (Placeholders for Pro, basic for Free).                                                                                                                                                                                                                                                                   |
| **Billing & Subscriptions** | **Subscription Tiers & Pricing**            | Placeholders Updated.                                                                                                                                                                                                                                                                                                           |
| **Admin & Moderation**    | **Admin Panel & Flagging**                    | Placeholder UI for Admin. Flagging via `flagMaterial` EF.                                                                                                                                                                                                                                                                      |
| **Test Arena (CBT)**      | **MCQ Test Taking**                           | Implemented. Loads from AI generator or question bank. Saves results via `saveTestResult` EF.                                                                                                                                                                                                                                 |
| **Notifications**         | **System & Activity Notifications**         | Implemented (localStorage based).                                                                                                                                                                                                                                                                                               |
| **Test History**          | **View Past Test Results**                    | Implemented: `TestHistoryClient` fetches from `getTestHistory` EF.                                                                                                                                                                                                                                                              |


## 4. Technical Architecture (Supabase Backend Focus)

*   **Database**: Supabase PostgreSQL (`users`, `saved_materials`, `test_results`, `file_processing_jobs`, etc.). `saved_materials` now has a dedicated top-level `status` column.
*   **File Storage**: Supabase Storage (for user uploads like DOCX, PDF, images).
*   **Authentication**: Supabase Auth.
*   **Framework**: Next.js 15+ (App Router), TypeScript.
*   **AI Integration**:
    *   **Genkit (Gemini models)** used for all AI tasks.
    *   **Image OCR:** Executed within `extractText` Supabase EF. Genkit config `enableTracingAndMetrics: false`.
    *   **Main Content Gen (from DOCX/PDF extracted text):** Executed **client-side** by Next.js app using Genkit flows from `src/ai/flows/`.
    *   **Main Content Gen (from TXT/direct text):** Executed within `textGenerate` Supabase EF. Genkit config `enableTracingAndMetrics: false`.
*   **Backend Logic (File Processing & Core Data Ops)**: Supabase Edge Functions (Deno/TypeScript).
    *   `initFileProcessing`: Client calls with `materialId` (of placeholder `saved_materials` record). Creates processing job in `file_processing_jobs`, triggers `extractText` EF.
    *   `extractText`: Downloads from storage, extracts text (DOCX/PDF using JS libs, Images via embedded Genkit OCR). Updates `file_processing_jobs` (with text & status `TEXT_EXTRACTED_PENDING_AI`). Updates linked `saved_materials` (with `source_text_prompt` and `status: "PENDING_AI_GENERATION"`).
    *   `textGenerate`: Takes text, runs Genkit AI, returns generated content to client.
    *   `saveMaterial`: Saves/Updates `saved_materials` record with final AI-generated content and status (e.g., `COMPLETED` or initial `PENDING_EXTRACTION`).
    *   `getSavedMaterials`, `deleteMaterial`, `flagMaterial`: Core data operations for saved materials.
    *   `saveTestResult`, `getTestHistory`: For managing test results.
*   **Removed**: Standalone Railway worker and Redis/BullMQ queue.

## 5. Genkit AI Flows
*   **`src/ai/flows/` (Next.js Project - Client-side for extracted file content):**
    *   `generate-practice-test-flow.ts`
    *   `generate-flashcards-flow.ts`
    *   `generate-notes-flow.ts`
*   **Embedded in Supabase Edge Functions (logic copied/adapted into respective EF `index.ts`):**
    *   `ocrHandwrittenNotes` logic (from `ocr-handwritten-notes.ts`) used by `extractText` EF.
    *   `generatePracticeTest`, `generateFlashcards`, `generateNotes` logic (from respective `.ts` files) used by `textGenerate` EF.

## 6. Key Pages & Functionality
*   **`src/app/ai-content-generator/ai-content-generator-client.tsx`**:
    *   Uploads complex files to Supabase Storage.
    *   Calls `saveMaterial` EF (to create placeholder `saved_materials` record, status `PENDING_EXTRACTION`, gets `materialId`).
    *   Calls `initFileProcessing` EF (with `materialId`, starts background job in `file_processing_jobs`).
    *   Polls `file_processing_jobs` table.
    *   On text extraction completion (job status `TEXT_EXTRACTED_PENDING_AI`, `saved_materials` status `PENDING_AI_GENERATION`), fetches text from `saved_materials.source_text_prompt`, then **runs Genkit AI flows client-side.**
    *   After client-side AI, calls `saveMaterial` EF again (with `materialId` to update, final content, and `status: "COMPLETED"`).
    *   For TXT/prompts, calls `textGenerate` EF. Gets AI content. Calls `saveMaterial` EF (to create new record with `status: "COMPLETED"`).
*   **`src/app/my-tests/my-saved-materials-client.tsx`**: Interacts with `getSavedMaterials`, `deleteMaterial`, `flagMaterial` EFs.
*   **`src/app/my-tests/test-history/test-history-client.tsx`**: Interacts with `getTestHistory` EF.
*   **`src/app/cbt/cbt-client.tsx`**: Interacts with `saveTestResult` EF.

## 7. API Keys & Environment Variables
*   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Client & Supabase EFs using anon key for user context).
*   `SUPABASE_SERVICE_ROLE_KEY` (Used by `extractText` EF for admin tasks like file download from storage).
*   `GOOGLE_API_KEY` (Required as an environment secret for Supabase EFs: `extractText` and `textGenerate` due to embedded Genkit calls).

## 8. Data Storage Strategy
*   User Accounts: Supabase Auth & `users` table.
*   User Uploaded Files: Supabase Storage (`material-uploads` bucket).
*   File Processing Tracking: `file_processing_jobs` table.
*   Final Generated Content & Placeholders: `saved_materials` table (with dedicated top-level `status` column).
*   Test Results: `test_results` table.

## 9. Known Issues, Limitations & Next Steps
*   **File Processing in Deno EFs:** Using Node.js libraries like `mammoth` and `pdfjs-dist` via `esm.sh` in Deno can be fragile. Requires careful testing.
*   **PPTX Extraction:** Still a gap in `extractText` EF.
*   **Client-Side AI Orchestration & Polling:** Consider Supabase Realtime for `file_processing_jobs` status updates.
*   **Edge Function Timeouts:** Monitor `extractText` and `textGenerate`.
*   **Error Handling:** Needs to be robust across the client-EF-client flow.
*   **Implement Supabase Storage RLS policies.**
*   **Thoroughly test the entire file processing and AI generation pipeline for all supported file types.**

This summary reflects the refined architecture using a dedicated `status` column and the specified Edge Function names.
