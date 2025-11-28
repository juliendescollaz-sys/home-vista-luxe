-- Drop the scenes table and related objects
DROP TRIGGER IF EXISTS update_scenes_updated_at ON public.scenes;
DROP POLICY IF EXISTS "Users can view all scenes" ON public.scenes;
DROP POLICY IF EXISTS "Users can create scenes" ON public.scenes;
DROP POLICY IF EXISTS "Users can update their own scenes" ON public.scenes;
DROP POLICY IF EXISTS "Users can delete their own scenes" ON public.scenes;
DROP TABLE IF EXISTS public.scenes;