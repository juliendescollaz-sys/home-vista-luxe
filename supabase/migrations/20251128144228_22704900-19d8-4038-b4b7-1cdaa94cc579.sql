-- Create scenes table for shared scenes
CREATE TABLE public.scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Sparkles',
  color TEXT,
  description TEXT,
  entities JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all shared scenes (for now, all scenes in DB are shared)
CREATE POLICY "Users can view all scenes"
ON public.scenes
FOR SELECT
TO authenticated
USING (true);

-- Policy: Users can create their own scenes
CREATE POLICY "Users can create scenes"
ON public.scenes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own scenes
CREATE POLICY "Users can update their own scenes"
ON public.scenes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can delete their own scenes
CREATE POLICY "Users can delete their own scenes"
ON public.scenes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_scenes_updated_at
BEFORE UPDATE ON public.scenes
FOR EACH ROW
EXECUTE FUNCTION public.update_ha_links_updated_at();