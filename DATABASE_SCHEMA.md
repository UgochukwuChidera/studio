
# Supabase PostgreSQL Database Schema & Setup Script for TestPrep AI (Recreation Focus)

This document outlines the PostgreSQL schema for the TestPrep AI application and provides a SQL script to **recreate** the database tables (assuming application-specific tables are already dropped or non-existent), helper functions, triggers, grant necessary privileges, and set up Row Level Security (RLS) policies.

**IMPORTANT NOTES BEFORE RUNNING:**
*   **"NUKED" DATABASE ASSUMPTION:** This script assumes you have already handled the deletion (DROP) of application-specific tables (`saved_materials`, `test_results`, `admin_notifications`, `flagged_content`, `file_processing_jobs`). If they exist, `CREATE TABLE` statements for them will fail.
*   **`public.users` TABLE:** The `CREATE TABLE public.users` statement uses `IF NOT EXISTS`. If your `public.users` table (linked to `auth.users`) was preserved, this part will not alter it unless it's missing. If `public.users` was also dropped, this will recreate it.
*   **SEQUENTIAL EXECUTION:** This script is designed to be run in its entirety for a fresh setup or section-by-section if you're targeting specific parts.
*   **SUPERUSER PRIVILEGES:** You typically need to be a database superuser (or have sufficient privileges) to execute all parts of this script for application tables. For Storage RLS, using the Supabase Dashboard UI is strongly recommended (see Section 8).

---

## Consolidated Recreation SQL Script

```sql
-- Start of Script

-- Section 1: Drop Existing RLS Policies (Safe to run, uses IF EXISTS)
-- This ensures a clean slate for policies before recreating them.

-- For public.users table
DROP POLICY IF EXISTS "Allow individual user select access" ON public.users;
DROP POLICY IF EXISTS "Allow individual user update access for specific columns" ON public.users;
DROP POLICY IF EXISTS "Allow admin full access" ON public.users;
DROP POLICY IF EXISTS "Allow admin insert access" ON public.users;

-- For public.saved_materials table
DROP POLICY IF EXISTS "Allow individual user select access for their materials" ON public.saved_materials;
DROP POLICY IF EXISTS "Allow individual user insert access for their materials" ON public.saved_materials;
DROP POLICY IF EXISTS "Allow individual user update access for their materials" ON public.saved_materials;
DROP POLICY IF EXISTS "Allow individual user delete access for their materials" ON public.saved_materials;
DROP POLICY IF EXISTS "Allow public read access for public materials" ON public.saved_materials;
DROP POLICY IF EXISTS "Allow admin full access on materials" ON public.saved_materials;

-- For public.test_results table
DROP POLICY IF EXISTS "Allow individual user select access for their test results" ON public.test_results;
DROP POLICY IF EXISTS "Allow individual user insert access for their test results" ON public.test_results;
DROP POLICY IF EXISTS "Allow individual user delete access for their test results" ON public.test_results;
DROP POLICY IF EXISTS "Allow admin full access on test results" ON public.test_results;

-- For public.admin_notifications table
DROP POLICY IF EXISTS "Allow authenticated users to read relevant notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Allow admin full access on admin notifications" ON public.admin_notifications;

-- For public.flagged_content table
DROP POLICY IF EXISTS "Allow authenticated users to insert flags" ON public.flagged_content;
DROP POLICY IF EXISTS "Allow admin full access on flagged content" ON public.flagged_content;

-- For public.file_processing_jobs table
DROP POLICY IF EXISTS "Users can manage their own file processing jobs" ON public.file_processing_jobs;
DROP POLICY IF EXISTS "Admins can manage all file processing jobs" ON public.file_processing_jobs;


-- Section 2: Drop Helper Functions (Safe to run, uses IF EXISTS)
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.is_current_user_admin();
DROP FUNCTION IF EXISTS public.get_current_user_tier();

-- Section 3: Drop Specific Application Tables (Use with caution - DELETES DATA)
DROP TABLE IF EXISTS public.file_processing_jobs CASCADE;
DROP TABLE IF EXISTS public.saved_materials CASCADE;
DROP TABLE IF EXISTS public.test_results CASCADE;
DROP TABLE IF EXISTS public.admin_notifications CASCADE;
DROP TABLE IF EXISTS public.flagged_content CASCADE;
-- Note: public.users is NOT dropped here to preserve auth linkage. It's handled with CREATE TABLE IF NOT EXISTS.

-- Section 4: Recreate Helper Functions

-- Function to auto-update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to insert a new user into public.users when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name, photo_url, subscription_tier, test_generation_quota_remaining)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        'free', -- Default tier
        100     -- Default quota for free tier
    )
    ON CONFLICT (id) DO NOTHING; -- Avoid error if user profile somehow already exists
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
  is_admin_val BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  SELECT is_admin INTO is_admin_val FROM public.users WHERE id = auth.uid();
  RETURN COALESCE(is_admin_val, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to get current user's subscription tier
CREATE OR REPLACE FUNCTION public.get_current_user_tier()
RETURNS TEXT AS $$
DECLARE
  tier TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT subscription_tier INTO tier FROM public.users WHERE id = auth.uid();
  RETURN tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- Section 5: Recreate Tables

-- Users Table (public.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY NOT NULL DEFAULT auth.uid(),
    email VARCHAR(255) UNIQUE,
    display_name TEXT,
    photo_url TEXT,
    subscription_tier VARCHAR(50) NOT NULL DEFAULT 'free',
    stripe_customer_id TEXT,
    flutterwave_customer_ref TEXT,
    current_subscription_id TEXT,
    current_period_ends_at TIMESTAMPTZ,
    settings JSONB,
    test_generation_quota_remaining INTEGER DEFAULT 100,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Saved Materials Table (public.saved_materials) - Stores FINAL processed content
CREATE TABLE IF NOT EXISTS public.saved_materials (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'test', 'notes', 'flashcards', 'test_result'
    content JSONB, -- Stores the AI generated content (questions, notes markdown, flashcard objects) OR an error object if AI gen failed.
    status VARCHAR(50) NULL DEFAULT 'PENDING_AI_GENERATION', -- Top-level status: e.g., PENDING_EXTRACTION, PENDING_AI_GENERATION, COMPLETED, EXTRACTION_FAILED, AI_PROCESSING_FAILED.
    source_file_info JSONB, -- Info about the original uploaded file (name, type, size)
    storage_path TEXT, -- Path in Supabase Storage if file-based source
    source_text_prompt TEXT, -- Stores the text prompt if that was the source, OR extracted text from original file
    generation_params JSONB, -- Parameters used for AI generation (e.g., num_questions, bloom_level)
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    share_id TEXT UNIQUE,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saved_materials_user_id ON public.saved_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_materials_type ON public.saved_materials(type);
CREATE INDEX IF NOT EXISTS idx_saved_materials_status ON public.saved_materials(status);
CREATE INDEX IF NOT EXISTS idx_saved_materials_share_id ON public.saved_materials(share_id);
CREATE INDEX IF NOT EXISTS idx_saved_materials_tags ON public.saved_materials USING GIN (tags);

-- File Processing Jobs Table (public.file_processing_jobs)
CREATE TABLE IF NOT EXISTS public.file_processing_jobs (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    material_id UUID REFERENCES public.saved_materials(id) ON DELETE SET NULL, -- Link to the initial saved_materials record
    original_file_name TEXT,
    file_type VARCHAR(100), -- MIME type
    storage_path TEXT, -- Path in Supabase Storage
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_EXTRACTION', -- e.g., PENDING_EXTRACTION, EXTRACTING, TEXT_EXTRACTED_PENDING_AI, EXTRACTION_FAILED, EXTRACTION_UNSUPPORTED, COMPLETED_AI_PROCESSED
    extracted_text TEXT, -- Stores text extracted by Supabase Edge Function
    error_message TEXT,
    generation_params JSONB, -- Parameters for AI generation, copied from client, to be used by client after text extraction
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fpj_user_id ON public.file_processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_fpj_material_id ON public.file_processing_jobs(material_id);
CREATE INDEX IF NOT EXISTS idx_fpj_status ON public.file_processing_jobs(status);


-- Test Results Table (public.test_results)
CREATE TABLE IF NOT EXISTS public.test_results (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    test_title TEXT NOT NULL,
    original_test_id UUID REFERENCES public.saved_materials(id) ON DELETE SET NULL, -- Link to the saved_material of type 'test'
    original_test_type VARCHAR(100), -- e.g., 'multipleChoice', 'descriptive'
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    percentage NUMERIC(5,2) NOT NULL,
    answers JSONB, -- Detailed answers provided by the user
    time_taken_seconds INTEGER,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW() -- This is when the test was completed
);
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON public.test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_completed_at ON public.test_results(completed_at);

-- Admin Notifications Table (public.admin_notifications)
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_audience VARCHAR(50) NOT NULL DEFAULT 'all', -- 'all', 'free', 'basic', 'pro', or specific user_ids (if more granular needed)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_by_admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_target_audience ON public.admin_notifications(target_audience);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at);

-- Flagged Content Table (public.flagged_content)
CREATE TABLE IF NOT EXISTS public.flagged_content (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES public.saved_materials(id) ON DELETE CASCADE,
    flagged_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review', -- e.g., 'pending_review', 'reviewed_action_taken', 'reviewed_no_action'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by_admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT unique_user_material_flag UNIQUE (material_id, flagged_by_user_id) -- Prevent a user from flagging the same material multiple times
);
CREATE INDEX IF NOT EXISTS idx_flagged_content_material_id ON public.flagged_content(material_id);
CREATE INDEX IF NOT EXISTS idx_flagged_content_status ON public.flagged_content(status);


-- Section 5.5: Grant Privileges
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saved_materials TO authenticated;
GRANT SELECT ON TABLE public.saved_materials TO anon; -- For public materials
GRANT SELECT, INSERT, DELETE ON TABLE public.test_results TO authenticated;
GRANT SELECT ON TABLE public.admin_notifications TO authenticated;
GRANT INSERT ON TABLE public.flagged_content TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.file_processing_jobs TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;


-- Section 6: Recreate Triggers

DROP TRIGGER IF EXISTS on_users_update ON public.users;
CREATE TRIGGER on_users_update
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS on_saved_materials_update ON public.saved_materials;
CREATE TRIGGER on_saved_materials_update
    BEFORE UPDATE ON public.saved_materials
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS on_file_processing_jobs_update ON public.file_processing_jobs;
CREATE TRIGGER on_file_processing_jobs_update
    BEFORE UPDATE ON public.file_processing_jobs
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Section 7: Enable RLS and Recreate RLS Policies

-- For public.users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual user select access" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow individual user update access for specific columns" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Allow admin full access" ON public.users FOR ALL USING (public.is_current_user_admin() = TRUE) WITH CHECK (public.is_current_user_admin() = TRUE);
CREATE POLICY "Allow admin insert access" ON public.users FOR INSERT WITH CHECK (public.is_current_user_admin() = TRUE);

-- For public.saved_materials table
ALTER TABLE public.saved_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_materials FORCE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual user select access for their materials" ON public.saved_materials FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow individual user insert access for their materials" ON public.saved_materials FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow individual user update access for their materials" ON public.saved_materials FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow individual user delete access for their materials" ON public.saved_materials FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Allow public read access for public materials" ON public.saved_materials FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Allow admin full access on materials" ON public.saved_materials FOR ALL USING (public.is_current_user_admin() = TRUE) WITH CHECK (public.is_current_user_admin() = TRUE);

-- For public.file_processing_jobs table
ALTER TABLE public.file_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_processing_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own file processing jobs"
    ON public.file_processing_jobs
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Admins can manage all file processing jobs"
--     ON public.file_processing_jobs
--     FOR ALL
--     USING (public.is_current_user_admin() = TRUE)
--     WITH CHECK (public.is_current_user_admin() = TRUE);


-- For public.test_results table
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results FORCE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual user select access for their test results" ON public.test_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow individual user insert access for their test results" ON public.test_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow individual user delete access for their test results" ON public.test_results FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Allow admin full access on test results" ON public.test_results FOR ALL USING (public.is_current_user_admin() = TRUE) WITH CHECK (public.is_current_user_admin() = TRUE);

-- For public.admin_notifications table
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications FORCE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read relevant notifications" ON public.admin_notifications FOR SELECT USING (auth.role() = 'authenticated' AND (target_audience = 'all' OR target_audience = public.get_current_user_tier()));
CREATE POLICY "Allow admin full access on admin notifications" ON public.admin_notifications FOR ALL USING (public.is_current_user_admin() = TRUE) WITH CHECK (public.is_current_user_admin() = TRUE);

-- For public.flagged_content table
ALTER TABLE public.flagged_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flagged_content FORCE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to insert flags" ON public.flagged_content FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = flagged_by_user_id);
CREATE POLICY "Allow admin full access on flagged content" ON public.flagged_content FOR ALL USING (public.is_current_user_admin() = TRUE) WITH CHECK (public.is_current_user_admin() = TRUE);


-- Section 8: Supabase Storage Policies for 'material-uploads' bucket

-- !! IMPORTANT !!
-- The PREFERRED and most reliable way to manage Storage RLS policies is through the
-- Supabase Dashboard UI: Storage -> Select your 'material-uploads' bucket -> Policies Tab.
--
-- Using the UI avoids potential ownership/permission errors that can occur when
-- trying to run CREATE POLICY statements for 'storage.objects' directly via the SQL Editor,
-- as the 'storage' schema is managed internally by Supabase.
--
-- The SQL below is provided as a REFERENCE for the logic. You will translate this logic
-- into policies created via the Supabase Dashboard UI.

-- --- How to Create Storage Policies in the Supabase Dashboard UI ---
-- 1. Go to Storage -> 'material-uploads' bucket -> Policies tab.
-- 2. Click "+ New policy".
-- 3. Choose "Create a policy from scratch".
--
-- For each policy below, fill in the UI fields:

-- Policy 1: Allow authenticated users to UPLOAD (INSERT) files into their own folder
--   - Policy Name: "Allow authenticated users to upload to their folder" (or similar)
--   - Target roles: `authenticated`
--   - Allowed operation: Check `INSERT`
--   - USING expression (leave blank for INSERT if check expression covers it)
--   - WITH CHECK expression:
--     (bucket_id = 'material-uploads') AND (auth.role() = 'authenticated') AND ((storage.foldername(name))[1] = 'user_uploads') AND ((storage.foldername(name))[2] = (auth.uid())::text)

-- Policy 2: Allow authenticated users to VIEW (SELECT) their own files
--   - Policy Name: "Allow authenticated users to view their own files"
--   - Target roles: `authenticated`
--   - Allowed operation: Check `SELECT`
--   - USING expression:
--     (bucket_id = 'material-uploads') AND (auth.role() = 'authenticated') AND ((storage.foldername(name))[1] = 'user_uploads') AND ((storage.foldername(name))[2] = (auth.uid())::text)
--   - WITH CHECK expression (leave blank for SELECT)

-- Policy 3: Allow authenticated users to UPDATE their own files
--   - Policy Name: "Allow authenticated users to update their own files"
--   - Target roles: `authenticated`
--   - Allowed operation: Check `UPDATE`
--   - USING expression:
--     (bucket_id = 'material-uploads') AND (auth.role() = 'authenticated') AND ((storage.foldername(name))[1] = 'user_uploads') AND ((storage.foldername(name))[2] = (auth.uid())::text)
--   - WITH CHECK expression:
--     (bucket_id = 'material-uploads') AND (auth.role() = 'authenticated') AND ((storage.foldername(name))[1] = 'user_uploads') AND ((storage.foldername(name))[2] = (auth.uid())::text)

-- Policy 4: Allow authenticated users to DELETE their own files
--   - Policy Name: "Allow authenticated users to delete their own files"
--   - Target roles: `authenticated`
--   - Allowed operation: Check `DELETE`
--   - USING expression:
--     (bucket_id = 'material-uploads') AND (auth.role() = 'authenticated') AND ((storage.foldername(name))[1] = 'user_uploads') AND ((storage.foldername(name))[2] = (auth.uid())::text)
--   - WITH CHECK expression (leave blank for DELETE)

-- After creating policies in the UI, ensure "Enable Row Level Security" is toggled ON for the 'material-uploads' bucket in its Policies tab.

-- SQL REFERENCE (If UI is not an option, attempt this with a superuser role, but UI is preferred):
/*
-- Ensure RLS is enabled for storage.objects table (might cause ownership error if run directly)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first if re-applying via SQL (might cause ownership error)
-- DROP POLICY IF EXISTS "Allow authenticated users to upload to their folder" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated users to view their own files" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated users to update their own files" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated users to delete their own files" ON storage.objects;

CREATE POLICY "Allow authenticated users to upload to their folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'material-uploads' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = 'user_uploads' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Allow authenticated users to view their own files"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'material-uploads' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = 'user_uploads' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Allow authenticated users to update their own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'material-uploads' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = 'user_uploads' AND
    (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK ( -- Ensure they can only update files they already have access to (redundant with USING but good practice)
    bucket_id = 'material-uploads' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = 'user_uploads' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Allow authenticated users to delete their own files"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'material-uploads' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = 'user_uploads' AND
    (storage.foldername(name))[2] = auth.uid()::text
);
*/

-- End of Script
```

