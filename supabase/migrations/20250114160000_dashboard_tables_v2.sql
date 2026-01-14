-- Migration: Dashboard Tables v2 - Neolia
-- Date: 2025-01-14
-- Description: Structure complète avec Bâtiments, Logements, Résidents, Comptes SIP mobiles

-- ============================================
-- DROP PREVIOUS TABLES IF EXISTS (dev only)
-- ============================================
-- Uncomment in dev to reset:
-- DROP TABLE IF EXISTS public.activity_logs CASCADE;
-- DROP TABLE IF EXISTS public.sip_accounts CASCADE;
-- DROP TABLE IF EXISTS public.sip_servers CASCADE;
-- DROP TABLE IF EXISTS public.devices CASCADE;
-- DROP TABLE IF EXISTS public.resident_units CASCADE;
-- DROP TABLE IF EXISTS public.residents CASCADE;
-- DROP TABLE IF EXISTS public.units CASCADE;
-- DROP TABLE IF EXISTS public.zones CASCADE;
-- DROP TABLE IF EXISTS public.buildings CASCADE;
-- DROP TABLE IF EXISTS public.organization_members CASCADE;
-- DROP TABLE IF EXISTS public.organizations CASCADE;
-- DROP FUNCTION IF EXISTS public.get_user_org_ids CASCADE;
-- DROP FUNCTION IF EXISTS public.get_dashboard_stats CASCADE;
-- DROP FUNCTION IF EXISTS public.update_building_status CASCADE;

-- ============================================
-- ORGANIZATIONS (multi-tenant: Neolia, syndics, propriétaires)
-- ============================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL DEFAULT 'client' CHECK (type IN ('neolia', 'syndic', 'owner', 'client')),
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.organizations IS 'Organisations: Neolia (admin), syndics, propriétaires, clients';

-- ============================================
-- ORGANIZATION MEMBERS (users + roles)
-- ============================================
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN (
        'neolia_admin',    -- Admin Neolia: accès total
        'owner',           -- Propriétaire de l'org
        'gestionnaire',    -- Gestionnaire (syndic, admin immeuble)
        'installateur',    -- Installateur technique
        'resident'         -- Résident (accès limité à son logement)
    )),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

COMMENT ON COLUMN public.organization_members.role IS 'neolia_admin: tout, owner: son org, gestionnaire: ses sites, installateur: config devices, resident: son logement';

-- ============================================
-- BUILDINGS (Bâtiments: immeubles, maisons, résidences)
-- ============================================
CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'FR',

    -- Type de bâtiment avec comportements différents
    type TEXT NOT NULL DEFAULT 'apartment_building' CHECK (type IN (
        'apartment_building',  -- Immeuble collectif (plusieurs logements)
        'house',               -- Maison individuelle (1 seul logement)
        'residence',           -- Résidence (plusieurs maisons, portail commun)
        'office',              -- Bureau/commercial
        'other'
    )),

    -- Configuration spécifique au type
    config JSONB DEFAULT '{}',
    -- Pour maison: {"single_unit": true, "auto_create_unit": true}
    -- Pour immeuble: {"floors": 5, "units_per_floor": 4}
    -- Pour résidence: {"houses_count": 10, "common_gate": true}

    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'partial', 'offline')),
    timezone TEXT DEFAULT 'Europe/Paris',

    -- Localisation GPS (pour géofencing futur)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_buildings_organization ON public.buildings(organization_id);
CREATE INDEX idx_buildings_type ON public.buildings(type);
CREATE INDEX idx_buildings_status ON public.buildings(status);

COMMENT ON TABLE public.buildings IS 'Bâtiments: immeubles collectifs, maisons individuelles, résidences';

-- ============================================
-- ZONES (structure interne: entrées, étages, parties communes)
-- ============================================
CREATE TABLE IF NOT EXISTS public.zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,

    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'floor' CHECK (type IN (
        'entrance',     -- Entrée (hall, portail)
        'floor',        -- Étage
        'common',       -- Parties communes (local poubelle, parking)
        'garden',       -- Jardin (résidence)
        'other'
    )),

    floor_number INTEGER,  -- Numéro d'étage (0 = RDC, -1 = sous-sol)
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_zones_building ON public.zones(building_id);
CREATE INDEX idx_zones_parent ON public.zones(parent_id);

-- ============================================
-- UNITS (Logements: appartements, maisons)
-- ============================================
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,  -- Étage/zone

    name TEXT NOT NULL,  -- "Appartement 101", "Maison", "Lot 5"
    unit_number TEXT,    -- "101", "A", "5"

    type TEXT NOT NULL DEFAULT 'apartment' CHECK (type IN (
        'apartment',    -- Appartement dans immeuble
        'house',        -- Maison dans résidence
        'studio',       -- Studio
        'office',       -- Bureau
        'other'
    )),

    -- Infos du logement
    floor_number INTEGER,
    surface_m2 DECIMAL(6, 2),
    rooms_count INTEGER,

    -- Config SIP pour ce logement
    sip_extension TEXT,  -- Extension principale du logement (ex: "101")

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(building_id, unit_number)
);

CREATE INDEX idx_units_building ON public.units(building_id);
CREATE INDEX idx_units_zone ON public.units(zone_id);

COMMENT ON TABLE public.units IS 'Logements: appartements, maisons dans résidence';

-- ============================================
-- RESIDENTS (Résidents/propriétaires de logements)
-- ============================================
CREATE TABLE IF NOT EXISTS public.residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,  -- Lien compte auth (optionnel)

    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,

    -- Type de résident
    type TEXT NOT NULL DEFAULT 'tenant' CHECK (type IN (
        'owner',        -- Propriétaire
        'tenant',       -- Locataire
        'family',       -- Membre famille
        'other'
    )),

    -- Notifications
    notifications_enabled BOOLEAN DEFAULT TRUE,
    notification_preferences JSONB DEFAULT '{"push": true, "email": false, "sms": false}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_residents_user ON public.residents(user_id);
CREATE INDEX idx_residents_email ON public.residents(email);

COMMENT ON TABLE public.residents IS 'Résidents: personnes vivant dans les logements';

-- ============================================
-- RESIDENT_UNITS (Liaison résident ↔ logement, N:N)
-- ============================================
CREATE TABLE IF NOT EXISTS public.resident_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,

    -- Rôle dans le logement
    role TEXT NOT NULL DEFAULT 'resident' CHECK (role IN (
        'primary',      -- Résident principal
        'secondary',    -- Résident secondaire (conjoint, enfant)
        'guest'         -- Invité temporaire
    )),

    -- Période de validité (pour locations, invités)
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,  -- NULL = permanent

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(resident_id, unit_id)
);

CREATE INDEX idx_resident_units_resident ON public.resident_units(resident_id);
CREATE INDEX idx_resident_units_unit ON public.resident_units(unit_id);

COMMENT ON TABLE public.resident_units IS 'Liaison résidents ↔ logements (un résident peut avoir plusieurs logements)';

-- ============================================
-- DEVICES (Appareils: panels, intercoms, gateways)
-- ============================================
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
    unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,  -- Pour panels dans logements

    name TEXT NOT NULL,

    type TEXT NOT NULL CHECK (type IN (
        'panel',        -- Panel intérieur (Akuvox S563)
        'intercom',     -- Interphone extérieur (Akuvox E12W)
        'gateway',      -- Gateway R-Pi
        'camera',       -- Caméra IP
        'doorbell',     -- Sonnette connectée
        'lock',         -- Serrure connectée
        'other'
    )),

    model TEXT,  -- "Akuvox S563", "Akuvox E12W", "Raspberry Pi 4"

    -- Réseau
    ip_address INET,
    mac_address MACADDR,

    -- Firmware
    firmware_version TEXT,
    firmware_update_available TEXT,  -- Version dispo si update

    -- Status
    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error', 'updating')),
    last_seen TIMESTAMPTZ,
    last_error TEXT,

    -- Config spécifique au device
    config JSONB DEFAULT '{}',

    -- Métriques système (pour gateways)
    system_metrics JSONB DEFAULT '{}',
    -- {"cpu_percent": 15.2, "memory_percent": 45.8, "disk_percent": 32.1, "temperature": 52.3}

    -- Services (pour gateways)
    services JSONB DEFAULT '{}',
    -- {"mediamtx": "running", "asterisk": "running", "cloudflared": "running"}

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_devices_building ON public.devices(building_id);
CREATE INDEX idx_devices_zone ON public.devices(zone_id);
CREATE INDEX idx_devices_unit ON public.devices(unit_id);
CREATE INDEX idx_devices_type ON public.devices(type);
CREATE INDEX idx_devices_status ON public.devices(status);

-- ============================================
-- SIP SERVERS (Serveurs SIP: VPS Neolia, Asterisk local)
-- ============================================
CREATE TABLE IF NOT EXISTS public.sip_servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,  -- Si serveur local

    name TEXT NOT NULL,
    host TEXT NOT NULL,  -- "sip.neolia.app" ou IP locale
    port INTEGER DEFAULT 5060,
    transport TEXT DEFAULT 'udp' CHECK (transport IN ('udp', 'tcp', 'tls', 'wss')),

    type TEXT NOT NULL DEFAULT 'central' CHECK (type IN (
        'central',  -- Serveur central Neolia (Kamailio VPS)
        'local'     -- Serveur local (Asterisk sur R-Pi)
    )),

    is_default BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sip_servers_org ON public.sip_servers(organization_id);
CREATE INDEX idx_sip_servers_building ON public.sip_servers(building_id);

-- ============================================
-- SIP ACCOUNTS (Comptes SIP: devices ET mobiles)
-- ============================================
CREATE TABLE IF NOT EXISTS public.sip_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Contexte: soit device (panel/intercom), soit résident (mobile)
    building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,

    sip_server_id UUID REFERENCES public.sip_servers(id) ON DELETE SET NULL,

    -- Type de compte
    type TEXT NOT NULL DEFAULT 'device' CHECK (type IN (
        'device',       -- Compte pour device (panel, intercom)
        'mobile',       -- Compte pour app mobile résident
        'softphone'     -- Compte pour softphone PC
    )),

    -- Credentials SIP
    username TEXT NOT NULL,
    password_encrypted TEXT NOT NULL,  -- Chiffré avec clé serveur
    extension TEXT,  -- "101", "101-mobile-1"
    display_name TEXT,  -- "Appartement 101", "Jean Dupont Mobile"

    -- Status
    enabled BOOLEAN DEFAULT TRUE,
    registered BOOLEAN DEFAULT FALSE,
    last_registration TIMESTAMPTZ,
    registration_ip INET,
    user_agent TEXT,  -- "Oliphone/1.0 Android", "Akuvox S563"

    -- Restrictions
    can_call_out BOOLEAN DEFAULT TRUE,   -- Peut appeler
    can_receive BOOLEAN DEFAULT TRUE,    -- Peut recevoir
    max_concurrent_calls INTEGER DEFAULT 1,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(building_id, username)
);

CREATE INDEX idx_sip_accounts_building ON public.sip_accounts(building_id);
CREATE INDEX idx_sip_accounts_unit ON public.sip_accounts(unit_id);
CREATE INDEX idx_sip_accounts_device ON public.sip_accounts(device_id);
CREATE INDEX idx_sip_accounts_resident ON public.sip_accounts(resident_id);
CREATE INDEX idx_sip_accounts_type ON public.sip_accounts(type);

COMMENT ON TABLE public.sip_accounts IS 'Comptes SIP: devices (panels, intercoms) ET mobiles (apps résidents)';

-- ============================================
-- CALL ROUTING (Règles de routage des appels)
-- ============================================
CREATE TABLE IF NOT EXISTS public.call_routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    description TEXT,

    -- Source (qui appelle)
    source_type TEXT NOT NULL CHECK (source_type IN ('intercom', 'any')),
    source_device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,

    -- Destination (qui est appelé)
    destination_unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,

    -- Comportement
    ring_strategy TEXT DEFAULT 'ring_all' CHECK (ring_strategy IN (
        'ring_all',      -- Sonne tous les devices/mobiles du logement
        'ring_sequence', -- Sonne un par un
        'ring_primary'   -- Sonne uniquement le device principal
    )),
    ring_timeout INTEGER DEFAULT 30,  -- Secondes avant timeout

    -- Actions si pas de réponse
    no_answer_action TEXT DEFAULT 'voicemail' CHECK (no_answer_action IN (
        'voicemail',
        'forward',
        'hangup'
    )),
    forward_to_extension TEXT,

    priority INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_routing_building ON public.call_routing_rules(building_id);

COMMENT ON TABLE public.call_routing_rules IS 'Règles de routage: intercom → logement → tous les devices/mobiles';

-- ============================================
-- ACTIVITY LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'success', 'warning', 'error')),

    category TEXT NOT NULL DEFAULT 'system' CHECK (category IN (
        'system',       -- Événements système
        'call',         -- Appels SIP
        'door',         -- Ouverture porte
        'device',       -- Événements device
        'user',         -- Actions utilisateur
        'security'      -- Sécurité
    )),

    action TEXT NOT NULL,  -- "call.incoming", "door.opened", "device.offline"
    message TEXT,

    metadata JSONB DEFAULT '{}',
    -- {"caller": "intercom_1", "callee": "apt_101", "duration": 45}

    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_org ON public.activity_logs(organization_id);
CREATE INDEX idx_activity_logs_building ON public.activity_logs(building_id);
CREATE INDEX idx_activity_logs_level ON public.activity_logs(level);
CREATE INDEX idx_activity_logs_category ON public.activity_logs(category);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- Partition par mois pour performance (optionnel, pour gros volumes)
-- CREATE INDEX idx_activity_logs_created_month ON public.activity_logs(date_trunc('month', created_at));

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resident_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sip_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sip_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get user's organization IDs
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

-- Check if user is Neolia admin
CREATE OR REPLACE FUNCTION public.is_neolia_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE user_id = auth.uid() AND role = 'neolia_admin'
    )
$$;

-- Get user's role in an organization
CREATE OR REPLACE FUNCTION public.get_user_role(org_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role FROM public.organization_members
    WHERE user_id = auth.uid() AND organization_id = org_id
    LIMIT 1
$$;

-- Get buildings accessible to user
CREATE OR REPLACE FUNCTION public.get_user_building_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    -- Admins/gestionnaires: tous les buildings de leurs orgs
    SELECT b.id FROM public.buildings b
    WHERE b.organization_id IN (SELECT public.get_user_org_ids())

    UNION

    -- Résidents: buildings de leurs logements
    SELECT u.building_id FROM public.units u
    JOIN public.resident_units ru ON ru.unit_id = u.id
    JOIN public.residents r ON r.id = ru.resident_id
    WHERE r.user_id = auth.uid() AND ru.is_active = TRUE
$$;

-- Get units accessible to resident
CREATE OR REPLACE FUNCTION public.get_resident_unit_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT ru.unit_id FROM public.resident_units ru
    JOIN public.residents r ON r.id = ru.resident_id
    WHERE r.user_id = auth.uid() AND ru.is_active = TRUE
$$;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Organizations
CREATE POLICY "Users can view their organizations"
    ON public.organizations FOR SELECT
    USING (id IN (SELECT public.get_user_org_ids()) OR public.is_neolia_admin());

CREATE POLICY "Neolia admin can manage all organizations"
    ON public.organizations FOR ALL
    USING (public.is_neolia_admin());

-- Organization Members
CREATE POLICY "Users can view org members"
    ON public.organization_members FOR SELECT
    USING (organization_id IN (SELECT public.get_user_org_ids()) OR public.is_neolia_admin());

CREATE POLICY "Admins can manage org members"
    ON public.organization_members FOR ALL
    USING (
        public.is_neolia_admin() OR
        public.get_user_role(organization_id) IN ('owner', 'gestionnaire')
    );

-- Buildings
CREATE POLICY "Users can view accessible buildings"
    ON public.buildings FOR SELECT
    USING (id IN (SELECT public.get_user_building_ids()) OR public.is_neolia_admin());

CREATE POLICY "Gestionnaires can manage buildings"
    ON public.buildings FOR ALL
    USING (
        public.is_neolia_admin() OR
        public.get_user_role(organization_id) IN ('owner', 'gestionnaire')
    );

-- Zones
CREATE POLICY "Users can view zones"
    ON public.zones FOR SELECT
    USING (building_id IN (SELECT public.get_user_building_ids()) OR public.is_neolia_admin());

CREATE POLICY "Gestionnaires can manage zones"
    ON public.zones FOR ALL
    USING (
        public.is_neolia_admin() OR
        building_id IN (
            SELECT b.id FROM public.buildings b
            WHERE public.get_user_role(b.organization_id) IN ('owner', 'gestionnaire', 'installateur')
        )
    );

-- Units
CREATE POLICY "Users can view accessible units"
    ON public.units FOR SELECT
    USING (
        public.is_neolia_admin() OR
        building_id IN (SELECT public.get_user_building_ids()) OR
        id IN (SELECT public.get_resident_unit_ids())
    );

CREATE POLICY "Gestionnaires can manage units"
    ON public.units FOR ALL
    USING (
        public.is_neolia_admin() OR
        building_id IN (
            SELECT b.id FROM public.buildings b
            WHERE public.get_user_role(b.organization_id) IN ('owner', 'gestionnaire')
        )
    );

-- Residents
CREATE POLICY "Users can view residents"
    ON public.residents FOR SELECT
    USING (
        public.is_neolia_admin() OR
        user_id = auth.uid() OR
        id IN (
            SELECT ru.resident_id FROM public.resident_units ru
            WHERE ru.unit_id IN (
                SELECT u.id FROM public.units u
                JOIN public.buildings b ON u.building_id = b.id
                WHERE public.get_user_role(b.organization_id) IN ('owner', 'gestionnaire')
            )
        )
    );

CREATE POLICY "Users can update their own resident profile"
    ON public.residents FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Gestionnaires can manage residents"
    ON public.residents FOR ALL
    USING (public.is_neolia_admin());

-- Resident Units
CREATE POLICY "Users can view resident_units"
    ON public.resident_units FOR SELECT
    USING (
        public.is_neolia_admin() OR
        resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid()) OR
        unit_id IN (
            SELECT u.id FROM public.units u
            JOIN public.buildings b ON u.building_id = b.id
            WHERE public.get_user_role(b.organization_id) IN ('owner', 'gestionnaire')
        )
    );

-- Devices
CREATE POLICY "Users can view devices"
    ON public.devices FOR SELECT
    USING (building_id IN (SELECT public.get_user_building_ids()) OR public.is_neolia_admin());

CREATE POLICY "Installateurs can manage devices"
    ON public.devices FOR ALL
    USING (
        public.is_neolia_admin() OR
        building_id IN (
            SELECT b.id FROM public.buildings b
            WHERE public.get_user_role(b.organization_id) IN ('owner', 'gestionnaire', 'installateur')
        )
    );

-- SIP Servers
CREATE POLICY "Users can view sip servers"
    ON public.sip_servers FOR SELECT
    USING (
        public.is_neolia_admin() OR
        organization_id IN (SELECT public.get_user_org_ids()) OR
        building_id IN (SELECT public.get_user_building_ids())
    );

CREATE POLICY "Admins can manage sip servers"
    ON public.sip_servers FOR ALL
    USING (public.is_neolia_admin());

-- SIP Accounts
CREATE POLICY "Users can view their sip accounts"
    ON public.sip_accounts FOR SELECT
    USING (
        public.is_neolia_admin() OR
        building_id IN (SELECT public.get_user_building_ids()) OR
        resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid())
    );

CREATE POLICY "Gestionnaires can manage sip accounts"
    ON public.sip_accounts FOR ALL
    USING (
        public.is_neolia_admin() OR
        building_id IN (
            SELECT b.id FROM public.buildings b
            WHERE public.get_user_role(b.organization_id) IN ('owner', 'gestionnaire', 'installateur')
        )
    );

-- Call Routing Rules
CREATE POLICY "Users can view routing rules"
    ON public.call_routing_rules FOR SELECT
    USING (building_id IN (SELECT public.get_user_building_ids()) OR public.is_neolia_admin());

CREATE POLICY "Gestionnaires can manage routing rules"
    ON public.call_routing_rules FOR ALL
    USING (
        public.is_neolia_admin() OR
        building_id IN (
            SELECT b.id FROM public.buildings b
            WHERE public.get_user_role(b.organization_id) IN ('owner', 'gestionnaire')
        )
    );

-- Activity Logs
CREATE POLICY "Users can view activity logs"
    ON public.activity_logs FOR SELECT
    USING (
        public.is_neolia_admin() OR
        building_id IN (SELECT public.get_user_building_ids()) OR
        resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid())
    );

CREATE POLICY "System can insert logs"
    ON public.activity_logs FOR INSERT
    WITH CHECK (TRUE);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update building status based on devices
CREATE OR REPLACE FUNCTION public.update_building_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    total_devices INTEGER;
    online_devices INTEGER;
    new_status TEXT;
    target_building_id UUID;
BEGIN
    target_building_id := COALESCE(NEW.building_id, OLD.building_id);

    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'online')
    INTO total_devices, online_devices
    FROM public.devices
    WHERE building_id = target_building_id;

    IF total_devices = 0 THEN
        new_status := 'offline';
    ELSIF online_devices = total_devices THEN
        new_status := 'online';
    ELSIF online_devices > 0 THEN
        new_status := 'partial';
    ELSE
        new_status := 'offline';
    END IF;

    UPDATE public.buildings
    SET status = new_status, updated_at = NOW()
    WHERE id = target_building_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_building_status
    AFTER INSERT OR UPDATE OF status OR DELETE ON public.devices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_building_status();

-- Auto-create unit for single house
CREATE OR REPLACE FUNCTION public.auto_create_house_unit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.type = 'house' AND (NEW.config->>'auto_create_unit')::boolean IS NOT FALSE THEN
        INSERT INTO public.units (building_id, name, unit_number, type)
        VALUES (NEW.id, 'Maison', '1', 'house')
        ON CONFLICT (building_id, unit_number) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_create_house_unit
    AFTER INSERT ON public.buildings
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_create_house_unit();

-- ============================================
-- FUNCTIONS
-- ============================================

-- Dashboard stats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    user_building_ids UUID[];
BEGIN
    SELECT ARRAY_AGG(id) INTO user_building_ids FROM public.get_user_building_ids();

    SELECT json_build_object(
        'buildings_total', (SELECT COUNT(*) FROM public.buildings WHERE id = ANY(user_building_ids)),
        'buildings_online', (SELECT COUNT(*) FROM public.buildings WHERE id = ANY(user_building_ids) AND status = 'online'),
        'buildings_partial', (SELECT COUNT(*) FROM public.buildings WHERE id = ANY(user_building_ids) AND status = 'partial'),
        'buildings_offline', (SELECT COUNT(*) FROM public.buildings WHERE id = ANY(user_building_ids) AND status = 'offline'),
        'devices_total', (SELECT COUNT(*) FROM public.devices WHERE building_id = ANY(user_building_ids)),
        'devices_online', (SELECT COUNT(*) FROM public.devices WHERE building_id = ANY(user_building_ids) AND status = 'online'),
        'units_total', (SELECT COUNT(*) FROM public.units WHERE building_id = ANY(user_building_ids)),
        'residents_total', (SELECT COUNT(DISTINCT r.id) FROM public.residents r JOIN public.resident_units ru ON r.id = ru.resident_id JOIN public.units u ON ru.unit_id = u.id WHERE u.building_id = ANY(user_building_ids)),
        'sip_accounts_total', (SELECT COUNT(*) FROM public.sip_accounts WHERE building_id = ANY(user_building_ids)),
        'sip_accounts_registered', (SELECT COUNT(*) FROM public.sip_accounts WHERE building_id = ANY(user_building_ids) AND registered = TRUE),
        'alerts_count', (SELECT COUNT(*) FROM public.activity_logs WHERE building_id = ANY(user_building_ids) AND level = 'error' AND created_at > NOW() - INTERVAL '24 hours')
    ) INTO result;

    RETURN result;
END;
$$;

-- Get SIP accounts for a unit (device + all resident mobiles)
CREATE OR REPLACE FUNCTION public.get_unit_sip_accounts(p_unit_id UUID)
RETURNS TABLE (
    sip_account_id UUID,
    type TEXT,
    username TEXT,
    extension TEXT,
    display_name TEXT,
    device_name TEXT,
    resident_name TEXT,
    registered BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        sa.id,
        sa.type,
        sa.username,
        sa.extension,
        sa.display_name,
        d.name as device_name,
        CONCAT(r.first_name, ' ', r.last_name) as resident_name,
        sa.registered
    FROM public.sip_accounts sa
    LEFT JOIN public.devices d ON sa.device_id = d.id
    LEFT JOIN public.residents r ON sa.resident_id = r.id
    WHERE sa.unit_id = p_unit_id AND sa.enabled = TRUE
    ORDER BY sa.type, sa.extension;
$$;

-- ============================================
-- REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.buildings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.units;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sip_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;

-- ============================================
-- GRANTS
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
