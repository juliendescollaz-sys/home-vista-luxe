-- Create users table for authentication
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  pass_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create ha_links table to store encrypted HA tokens
CREATE TABLE public.ha_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ha_base_url TEXT NOT NULL,
  ha_token_enc BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create pair_codes table for one-time QR code pairing
CREATE TABLE public.pair_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_jwt_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  link_id UUID NOT NULL REFERENCES public.ha_links(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_pair_codes_jwt_id ON public.pair_codes(code_jwt_id);
CREATE INDEX idx_pair_codes_expires ON public.pair_codes(expires_at);
CREATE INDEX idx_ha_links_user ON public.ha_links(user_id);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ha_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pair_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own data"
  ON public.users FOR SELECT
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own data"
  ON public.users FOR UPDATE
  USING (auth.uid()::text = id::text);

-- RLS Policies for ha_links table
CREATE POLICY "Users can view their own HA links"
  ON public.ha_links FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own HA links"
  ON public.ha_links FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own HA links"
  ON public.ha_links FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own HA links"
  ON public.ha_links FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- RLS Policies for pair_codes table
CREATE POLICY "Users can view their own pair codes"
  ON public.pair_codes FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own pair codes"
  ON public.pair_codes FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Trigger to update updated_at on ha_links
CREATE OR REPLACE FUNCTION public.update_ha_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ha_links_updated_at_trigger
  BEFORE UPDATE ON public.ha_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ha_links_updated_at();