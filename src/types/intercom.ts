export interface IntercomCall {
  id: string;
  room: string;
  callerToken: string;
  calleeToken: string;
  livekitUrl: string;
  from: string;
  to: string;
  status: 'ringing' | 'active' | 'ended';
  startTime: number;
  videoEnabled: boolean;
  audioEnabled: boolean;
}

export interface IntercomDevice {
  id: string;
  name: string;
  type: 'exterior' | 'interior';
  sipExtension: string;
  location?: string;
}

export interface IntercomCallEvent {
  type: 'incoming_call' | 'call_answered' | 'call_ended';
  call: IntercomCall;
}

// ============== ADMIN TYPES ==============

// Sites (Projets/Batiments)
export interface Site {
  id: string;
  name: string;
  address: string;
  type: 'building' | 'villa';
  status: 'online' | 'partial' | 'offline';
  timezone: string;
  created_at: string;
  updated_at: string;
  buildings_count?: number;
  units_count?: number;
  sip_accounts_count?: number;
}

export interface SiteInsert {
  name: string;
  address: string;
  type?: 'building' | 'villa';
  timezone?: string;
}

// Buildings (Batiments)
export interface Building {
  id: string;
  site_id: string;
  name: string;
  floor_count?: number;
  created_at: string;
  updated_at: string;
  site?: Site;
  units_count?: number;
}

export interface BuildingInsert {
  site_id: string;
  name: string;
  floor_count?: number;
}

// Units (Logements)
export interface IntercomUnit {
  id: string;
  building_id: string;
  number: string;
  floor?: number;
  owner_name?: string;
  owner_email?: string;
  created_at: string;
  updated_at: string;
  building?: Building;
  sip_accounts?: SIPAccount[];
}

export interface UnitInsert {
  building_id: string;
  number: string;
  floor?: number;
  owner_name?: string;
  owner_email?: string;
}

// SIP Accounts
export type SIPAccountType = 'panel' | 'mobile';

export interface SIPAccount {
  id: string;
  unit_id: string;
  username: string;
  domain: string;
  extension?: string;
  display_name?: string;
  type: SIPAccountType;
  enabled: boolean;
  registered: boolean;
  last_registration?: string;
  created_at: string;
  updated_at: string;
  unit?: IntercomUnit;
}

export interface SIPAccountInsert {
  unit_id: string;
  username?: string;
  domain?: string;
  password?: string;
  extension?: string;
  display_name?: string;
  type: SIPAccountType;
}

// Dashboard Stats
export interface IntercomDashboardStats {
  sites_total: number;
  sites_online: number;
  buildings_total: number;
  units_total: number;
  sip_accounts_total: number;
  sip_accounts_registered: number;
}

// Kamailio Sync
export interface KamailioSyncResult {
  success: boolean;
  accounts_created: number;
  accounts_updated: number;
  accounts_deleted: number;
  errors: string[];
}
