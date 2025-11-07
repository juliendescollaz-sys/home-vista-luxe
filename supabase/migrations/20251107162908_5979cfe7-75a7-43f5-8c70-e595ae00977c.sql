-- Fix security issue: Set search_path on update function
CREATE OR REPLACE FUNCTION public.update_ha_links_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;