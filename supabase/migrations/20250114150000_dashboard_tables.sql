-- Migration: Dashboard Tables for Neolia
-- Date: 2025-01-14
-- Description: Create tables for sites, devices, zones, sip_accounts, activity_logs

-- ============================================
-- ORGANIZATIONS (multi-tenant)
-- ============================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORGANIZATION MEMBERS (users belong to orgs)
-- ============================================
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'installer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- ============================================
-- SITES (projects/buildings)
-- ============================================
CREATE TABLE IF NOT EXISTS public.sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    type TEXT NOT NULL DEFAULT 'building' CHECK (type IN ('building', 'villa', 'office', 'other')),
    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'partial', 'offline')),
    timezone TEXT DEFAULT 'Europe/Paris',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sites_organization ON public.sites(organization_id);
CREATE INDEX idx_sites_status ON public.sites(status);

-- ============================================
-- ZONES (hierarchical structure within sites)
-- ============================================
CREATE TABLE IF NOT EXISTS public.zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'floor' CHECK (type IN ('entrance', 'floor', 'unit', 'common', 'parking', 'other')),
    floor_number INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_zones_site ON public.zones(site_id);
CREATE INDEX idx_zones_parent ON public.zones(parent_id);

-- ============================================
-- DEVICES (panels, intercoms, gateways)
-- ============================================
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('panel', 'intercom', 'gateway', 'camera', 'other')),
    model TEXT,
    ip_address INET,
    mac_address MACADDR,
    firmware_version TEXT,
    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
    last_seen TIMESTAMPTZ,
    config JSONB DEFAULT '{}',
    system_metrics JSONB DEFAULT '{}',
    services JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_devices_site ON public.devices(site_id);
CREATE INDEX idx_devices_zone ON public.devices(zone_id);
CREATE INDEX idx_devices_status ON public.devices(status);
CREATE INDEX idx_devices_type ON public.devices(type);

-- ============================================
-- SIP SERVERS (centralized SIP servers)
-- ============================================
CREATE TABLE IF NOT EXISTS public.sip_servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER DEFAULT 5060,
    transport TEXT DEFAULT 'udp' CHECK (transport IN ('udp', 'tcp', 'tls', 'wss')),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sip_servers_org ON public.sip_servers(organization_id);

-- ============================================
-- SIP ACCOUNTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.sip_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    sip_server_id UUID REFERENCES public.sip_servers(id) ON DELETE SET NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    extension TEXT,
    display_name TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    registered BOOLEAN DEFAULT FALSE,
    last_registration TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(site_id, username)
);

CREATE INDEX idx_sip_accounts_site ON public.sip_accounts(site_id);
CREATE INDEX idx_sip_accounts_device ON public.sip_accounts(device_id);

-- ============================================
-- ACTIVITY LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'success', 'warning', 'error')),
    action TEXT NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_site ON public.activity_logs(site_id);
CREATE INDEX idx_activity_logs_device ON public.activity_logs(device_id);
CREATE INDEX idx_activity_logs_level ON public.activity_logs(level);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sip_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sip_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Get user's organization IDs
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT organization_id
    FROM public.organization_members
    WHERE user_id = auth.uid()
$$;

-- Organizations: Users can see their own orgs
CREATE POLICY "Users can view their organizations"
    ON public.organizations FOR SELECT
    USING (id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Owners can update their organizations"
    ON public.organizations FOR UPDATE
    USING (id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND role = 'owner'
    ));

-- Organization Members: Users can see members of their orgs
CREATE POLICY "Users can view org members"
    ON public.organization_members FOR SELECT
    USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Admins can manage org members"
    ON public.organization_members FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Sites: Users can see sites of their orgs
CREATE POLICY "Users can view sites"
    ON public.sites FOR SELECT
    USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Admins can manage sites"
    ON public.sites FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Zones: Access through site membership
CREATE POLICY "Users can view zones"
    ON public.zones FOR SELECT
    USING (site_id IN (
        SELECT id FROM public.sites WHERE organization_id IN (SELECT public.get_user_org_ids())
    ));

CREATE POLICY "Admins can manage zones"
    ON public.zones FOR ALL
    USING (site_id IN (
        SELECT s.id FROM public.sites s
        JOIN public.organization_members om ON s.organization_id = om.organization_id
        WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    ));

-- Devices: Access through site membership
CREATE POLICY "Users can view devices"
    ON public.devices FOR SELECT
    USING (site_id IN (
        SELECT id FROM public.sites WHERE organization_id IN (SELECT public.get_user_org_ids())
    ));

CREATE POLICY "Admins can manage devices"
    ON public.devices FOR ALL
    USING (site_id IN (
        SELECT s.id FROM public.sites s
        JOIN public.organization_members om ON s.organization_id = om.organization_id
        WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'installer')
    ));

-- SIP Servers: Access through org membership
CREATE POLICY "Users can view sip servers"
    ON public.sip_servers FOR SELECT
    USING (organization_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "Admins can manage sip servers"
    ON public.sip_servers FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- SIP Accounts: Access through site membership
CREATE POLICY "Users can view sip accounts"
    ON public.sip_accounts FOR SELECT
    USING (site_id IN (
        SELECT id FROM public.sites WHERE organization_id IN (SELECT public.get_user_org_ids())
    ));

CREATE POLICY "Admins can manage sip accounts"
    ON public.sip_accounts FOR ALL
    USING (site_id IN (
        SELECT s.id FROM public.sites s
        JOIN public.organization_members om ON s.organization_id = om.organization_id
        WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    ));

-- Activity Logs: Read-only for site members
CREATE POLICY "Users can view activity logs"
    ON public.activity_logs FOR SELECT
    USING (site_id IN (
        SELECT id FROM public.sites WHERE organization_id IN (SELECT public.get_user_org_ids())
    ));

-- Service role can insert logs
CREATE POLICY "Service can insert logs"
    ON public.activity_logs FOR INSERT
    WITH CHECK (TRUE);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Get dashboard stats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'sites_total', (SELECT COUNT(*) FROM public.sites WHERE organization_id IN (SELECT public.get_user_org_ids())),
        'sites_online', (SELECT COUNT(*) FROM public.sites WHERE organization_id IN (SELECT public.get_user_org_ids()) AND status = 'online'),
        'sites_partial', (SELECT COUNT(*) FROM public.sites WHERE organization_id IN (SELECT public.get_user_org_ids()) AND status = 'partial'),
        'sites_offline', (SELECT COUNT(*) FROM public.sites WHERE organization_id IN (SELECT public.get_user_org_ids()) AND status = 'offline'),
        'devices_total', (SELECT COUNT(*) FROM public.devices d JOIN public.sites s ON d.site_id = s.id WHERE s.organization_id IN (SELECT public.get_user_org_ids())),
        'devices_online', (SELECT COUNT(*) FROM public.devices d JOIN public.sites s ON d.site_id = s.id WHERE s.organization_id IN (SELECT public.get_user_org_ids()) AND d.status = 'online'),
        'sip_accounts_total', (SELECT COUNT(*) FROM public.sip_accounts sa JOIN public.sites s ON sa.site_id = s.id WHERE s.organization_id IN (SELECT public.get_user_org_ids())),
        'sip_accounts_registered', (SELECT COUNT(*) FROM public.sip_accounts sa JOIN public.sites s ON sa.site_id = s.id WHERE s.organization_id IN (SELECT public.get_user_org_ids()) AND sa.registered = TRUE),
        'alerts_count', (SELECT COUNT(*) FROM public.activity_logs al JOIN public.sites s ON al.site_id = s.id WHERE s.organization_id IN (SELECT public.get_user_org_ids()) AND al.level = 'error' AND al.created_at > NOW() - INTERVAL '24 hours')
    ) INTO result;

    RETURN result;
END;
$$;

-- Function: Update site status based on devices
CREATE OR REPLACE FUNCTION public.update_site_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    total_devices INTEGER;
    online_devices INTEGER;
    new_status TEXT;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'online')
    INTO total_devices, online_devices
    FROM public.devices
    WHERE site_id = COALESCE(NEW.site_id, OLD.site_id);

    IF total_devices = 0 THEN
        new_status := 'offline';
    ELSIF online_devices = total_devices THEN
        new_status := 'online';
    ELSIF online_devices > 0 THEN
        new_status := 'partial';
    ELSE
        new_status := 'offline';
    END IF;

    UPDATE public.sites
    SET status = new_status, updated_at = NOW()
    WHERE id = COALESCE(NEW.site_id, OLD.site_id);

    RETURN NEW;
END;
$$;

-- Trigger: Auto-update site status when device status changes
CREATE TRIGGER trigger_update_site_status
    AFTER INSERT OR UPDATE OF status OR DELETE ON public.devices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_site_status();

-- ============================================
-- REALTIME
-- ============================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.sites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sip_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;

-- ============================================
-- GRANTS
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
