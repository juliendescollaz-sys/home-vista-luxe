-- Migration: Create Intercom Management Tables
-- Date: 2026-01-15
-- Description: Tables for SIP account management with Site/Building/Unit hierarchy

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============== SITES ==============
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  type TEXT NOT NULL DEFAULT 'building' CHECK (type IN ('building', 'villa')),
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'partial', 'offline')),
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- RLS: User who created the site
  user_id UUID REFERENCES auth.users(id)
);

-- Index for faster queries
CREATE INDEX idx_sites_status ON sites(status);
CREATE INDEX idx_sites_user_id ON sites(user_id);

-- ============== BUILDINGS ==============
CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  floor_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_buildings_site_id ON buildings(site_id);

-- ============== UNITS (Logements) ==============
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  floor INTEGER,
  owner_name TEXT,
  owner_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: unit number per building
  UNIQUE(building_id, number)
);

CREATE INDEX idx_units_building_id ON units(building_id);

-- ============== SIP ACCOUNTS ==============
CREATE TABLE IF NOT EXISTS sip_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'sip.neolia.app',
  password_hash TEXT, -- Hashed password, never exposed
  extension TEXT,
  display_name TEXT,
  type TEXT NOT NULL CHECK (type IN ('panel', 'mobile')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  registered BOOLEAN NOT NULL DEFAULT false,
  last_registration TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: username per domain
  UNIQUE(username, domain)
);

CREATE INDEX idx_sip_accounts_unit_id ON sip_accounts(unit_id);
CREATE INDEX idx_sip_accounts_username ON sip_accounts(username);
CREATE INDEX idx_sip_accounts_registered ON sip_accounts(registered);

-- ============== CALL RULES ==============
CREATE TABLE IF NOT EXISTS call_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_pattern TEXT NOT NULL, -- Regex pattern for caller
  action TEXT NOT NULL CHECK (action IN ('ring', 'forward', 'voicemail', 'reject')),
  target_sip_uri TEXT, -- For forward action
  priority INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_call_rules_unit_id ON call_rules(unit_id);
CREATE INDEX idx_call_rules_priority ON call_rules(priority DESC);

-- ============== ACTIVITY LOGS ==============
CREATE TABLE IF NOT EXISTS intercom_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  sip_account_id UUID REFERENCES sip_accounts(id) ON DELETE SET NULL,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'success', 'warning', 'error')),
  action TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_site_id ON intercom_activity_logs(site_id);
CREATE INDEX idx_activity_logs_level ON intercom_activity_logs(level);
CREATE INDEX idx_activity_logs_created_at ON intercom_activity_logs(created_at DESC);

-- ============== TRIGGERS ==============

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sites_updated_at
  BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buildings_updated_at
  BEFORE UPDATE ON buildings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sip_accounts_updated_at
  BEFORE UPDATE ON sip_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_rules_updated_at
  BEFORE UPDATE ON call_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============== ROW LEVEL SECURITY ==============

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE sip_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE intercom_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own sites
CREATE POLICY "Users can view own sites"
  ON sites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sites"
  ON sites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sites"
  ON sites FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sites"
  ON sites FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Buildings inherit from parent site
CREATE POLICY "Users can view buildings of own sites"
  ON buildings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sites WHERE sites.id = buildings.site_id AND sites.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage buildings of own sites"
  ON buildings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM sites WHERE sites.id = buildings.site_id AND sites.user_id = auth.uid()
  ));

-- Policy: Units inherit from parent building
CREATE POLICY "Users can view units of own buildings"
  ON units FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM buildings b
    JOIN sites s ON s.id = b.site_id
    WHERE b.id = units.building_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage units of own buildings"
  ON units FOR ALL
  USING (EXISTS (
    SELECT 1 FROM buildings b
    JOIN sites s ON s.id = b.site_id
    WHERE b.id = units.building_id AND s.user_id = auth.uid()
  ));

-- Policy: SIP accounts inherit from parent unit
CREATE POLICY "Users can view sip_accounts of own units"
  ON sip_accounts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM units u
    JOIN buildings b ON b.id = u.building_id
    JOIN sites s ON s.id = b.site_id
    WHERE u.id = sip_accounts.unit_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage sip_accounts of own units"
  ON sip_accounts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM units u
    JOIN buildings b ON b.id = u.building_id
    JOIN sites s ON s.id = b.site_id
    WHERE u.id = sip_accounts.unit_id AND s.user_id = auth.uid()
  ));

-- Policy: Call rules inherit from parent unit
CREATE POLICY "Users can manage call_rules of own units"
  ON call_rules FOR ALL
  USING (EXISTS (
    SELECT 1 FROM units u
    JOIN buildings b ON b.id = u.building_id
    JOIN sites s ON s.id = b.site_id
    WHERE u.id = call_rules.unit_id AND s.user_id = auth.uid()
  ));

-- Policy: Activity logs - users can view logs for their own resources
CREATE POLICY "Users can view own activity logs"
  ON intercom_activity_logs FOR SELECT
  USING (
    site_id IN (SELECT id FROM sites WHERE user_id = auth.uid())
    OR site_id IS NULL
  );

-- ============== FUNCTIONS ==============

-- Function to get dashboard stats
CREATE OR REPLACE FUNCTION get_intercom_stats(p_user_id UUID)
RETURNS TABLE (
  sites_total BIGINT,
  sites_online BIGINT,
  sites_partial BIGINT,
  sites_offline BIGINT,
  buildings_total BIGINT,
  units_total BIGINT,
  sip_accounts_total BIGINT,
  sip_accounts_registered BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM sites WHERE user_id = p_user_id)::BIGINT as sites_total,
    (SELECT COUNT(*) FROM sites WHERE user_id = p_user_id AND status = 'online')::BIGINT as sites_online,
    (SELECT COUNT(*) FROM sites WHERE user_id = p_user_id AND status = 'partial')::BIGINT as sites_partial,
    (SELECT COUNT(*) FROM sites WHERE user_id = p_user_id AND status = 'offline')::BIGINT as sites_offline,
    (SELECT COUNT(*) FROM buildings b JOIN sites s ON s.id = b.site_id WHERE s.user_id = p_user_id)::BIGINT as buildings_total,
    (SELECT COUNT(*) FROM units u JOIN buildings b ON b.id = u.building_id JOIN sites s ON s.id = b.site_id WHERE s.user_id = p_user_id)::BIGINT as units_total,
    (SELECT COUNT(*) FROM sip_accounts sa JOIN units u ON u.id = sa.unit_id JOIN buildings b ON b.id = u.building_id JOIN sites s ON s.id = b.site_id WHERE s.user_id = p_user_id)::BIGINT as sip_accounts_total,
    (SELECT COUNT(*) FROM sip_accounts sa JOIN units u ON u.id = sa.unit_id JOIN buildings b ON b.id = u.building_id JOIN sites s ON s.id = b.site_id WHERE s.user_id = p_user_id AND sa.registered = true)::BIGINT as sip_accounts_registered;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_intercom_stats(UUID) TO authenticated;

-- ============== COMMENTS ==============

COMMENT ON TABLE sites IS 'Projets/Sites (immeubles ou villas)';
COMMENT ON TABLE buildings IS 'Batiments au sein d''un site';
COMMENT ON TABLE units IS 'Logements/Appartements';
COMMENT ON TABLE sip_accounts IS 'Comptes SIP pour interphonie';
COMMENT ON TABLE call_rules IS 'Regles de routage des appels';
COMMENT ON TABLE intercom_activity_logs IS 'Logs d''activite interphonie';
