
# Security TODOs & Pre-Production Checklist for TestPrep AI (Supabase Backend Focus)

This document lists critical security-related changes, temporary development overrides, and placeholders that **MUST** be addressed before deploying TestPrep AI to a production environment using a **Supabase backend**.

## 1. Development Overrides to Revert/Modify

*   **Client-Side Tier Override in AuthContext:**
    *   **Location:** `src/contexts/auth-context.tsx`
    *   **Issue:** A development override forces a "pro" tier for testing.
    *   **Action Required:**
        *   **VERIFY AND REMOVE** the client-side tier override. User tier should be determined by data fetched from the Supabase `users` table (or user metadata) after authentication and successful `public.users` table population.
        *   **CROSSCHECK ALL EDGE FUNCTIONS** the edge functions should be fully checked for security compliance e.g. removing wildcards (`*`), etc.

## 2. Security Features to Fully Implement (Supabase Context)

*   **reCAPTCHA Integration (or equivalent bot protection):**
    *   **Locations:** `src/app/auth/signin/page.tsx`, `src/app/auth/signup/page.tsx`, `src/app/auth/forgot-password/page.tsx`.
    *   **Issue:** Placeholders exist for reCAPTCHA.
    *   **Action Required:**
        *   Implement a bot protection solution suitable for Supabase Auth (e.g., hCaptcha, or Google reCAPTCHA if integrating custom auth flows or protecting specific Edge Functions).
        *   Verify tokens on the server-side within **Supabase Edge Functions** if protecting custom actions.

*   **Supabase API Endpoint Protection (Edge Functions):**
    *   **Issue:** Edge Functions need protection.
    *   **Action Required:**
        *   Use JWT authentication for all **Supabase Edge Functions** that require user context (verify token from `Authorization` header).
        *   Implement API key protection for publicly accessible but sensitive Edge Functions if any (though JWT auth is generally preferred).
        *   Consider rate limiting on critical Edge Functions.

*   **Supabase Row Level Security (RLS) Policies:**
    *   **Location:** Supabase Dashboard (SQL editor).
    *   **Issue:** RLS is crucial for data security in Supabase. Schema and example policies are drafted in `DATABASE_SCHEMA.md`.
    *   **Action Required:**
        *   **IMPLEMENT AND THOROUGHLY TEST RLS POLICIES** for all tables (`users`, `saved_materials`, `test_results`, `admin_notifications`, `flagged_content`) based on the drafted policies in `DATABASE_SCHEMA.md`.
        *   Ensure least privilege, validate writes, and implement ownership checks (e.g., `auth.uid() = user_id`).

*   **API Key Security (GOOGLE_API_KEY / Genkit):**
    *   **Issue:** The `GOOGLE_API_KEY` for Genkit (Gemini models) must not be exposed client-side.
    *   **Action Required:**
        *   All Genkit flows should be invoked via **Supabase Edge Functions**.
        *   Store the `GOOGLE_API_KEY` as a secret in your Supabase project settings and access it from Edge Functions.

*   **Two-Factor Authentication (2FA) with Supabase Auth:**
    *   **Location:** `src/app/settings/page.tsx` (UI placeholder), Supabase Auth settings.
    *   **Issue:** 2FA is currently simulated in the UI.
    *   **Action Required:**
        *   Implement robust 2FA using Supabase Auth's built-in MFA capabilities (e.g., TOTP). Update client-side UI to manage 2FA setup and verification.

## 3. Data Storage & Transition TODOs (Supabase Focus)

*   **Migration from `localStorage` to Supabase PostgreSQL:**
    *   **Locations:** `src/app/ai-content-generator/ai-content-generator-client.tsx`, `src/app/my-tests/my-saved-materials-client.tsx`, `src/app/cbt/cbt-client.tsx`, `src/app/my-tests/test-history/test-history-client.tsx`.
    *   **Issue:** `savedMaterials` and `testResults` are currently managed in a hybrid `localStorage` and attempted Supabase sync mode. This needs full migration to Supabase as the single source of truth. Client-side calls to (currently non-existent) Edge Functions are prepared.
    *   **Action Required:**
        *   **Develop Supabase Edge Functions** for `saveMaterial`, `getSavedMaterials`, `deleteMaterial`, `saveTestResult`, `getTestHistory`, `deleteTestResult`.
        *   **Deploy Edge Functions** to your Supabase project.
        *   **Connect Client-Side Code:** Ensure all relevant client components correctly call these deployed Supabase Edge Functions.
        *   **Remove `localStorage` for Primary Storage:** Once cloud persistence is stable and deployed, remove reliance on `localStorage` for these core data types. `localStorage` might still be used for minor UI preferences or caching.
        *   **Data Migration Strategy (Optional):** If there's existing valuable data in `localStorage` for users, plan a one-time migration strategy to move it to Supabase upon their first login after the backend switch.

## 4. General Security Best Practices for Supabase

*   **Input Validation:** Ensure all user inputs (client-side and Supabase Edge Functions) are validated. Zod can be used in Deno (Edge Functions).
*   **Error Handling:** Implement robust error handling in Edge Functions that doesn't leak sensitive information.
*   **Dependency Management:** Keep Deno dependencies for Edge Functions and Next.js dependencies up-to-date.
*   **Secure Storage of Secrets:** Use Supabase's built-in secrets management for API keys (Genkit, payment gateways, etc.) and the `SUPABASE_SERVICE_ROLE_KEY` within Edge Functions.
*   **Regular Security Audits:** Consider post-launch.
*   **Database Connection Pooling:** Ensure Edge Functions use Supabase client libraries correctly to manage database connections efficiently.

This list should serve as a good starting point for your pre-production security and data transition review with Supabase.
      