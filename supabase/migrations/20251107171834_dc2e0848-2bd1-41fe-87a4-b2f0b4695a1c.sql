-- Fix security issues: Add DELETE policy for pair_codes and remove unused users table

-- 1. Add DELETE policy for pair_codes table
-- Users should be able to delete their own expired pair codes
CREATE POLICY "Users can delete their own pair codes"
ON public.pair_codes
FOR DELETE
USING (auth.uid()::text = user_id);

-- 2. Drop the unused users table
-- This table is not used by the application (auth is handled by Supabase Auth)
-- Keeping it creates confusion and potential security risks
DROP TABLE IF EXISTS public.users CASCADE;