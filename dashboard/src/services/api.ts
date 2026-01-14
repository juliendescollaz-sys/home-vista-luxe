// Service API pour le Dashboard Neolia
// Connecte le frontend au backend Supabase
// Utilise des mock data en fallback si Supabase n'est pas configure

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Site, Device, SipAccount, DashboardStats, ActivityLog, Zone } from '../types';
import {
  mockSites,
  mockDevices,
  mockZones,
  mockSipAccounts,
  mockStats,
  mockRecentActivity,
  delay,
} from '../data/mockData';

// ============================================================================
// Types de mapping DB -> UI
// Note: Types simplifies car les types Supabase seront regeneres apres migration
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbBuilding = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbDevice = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbSipAccount = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbZone = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbActivityLog = any;

// ============================================================================
// Fonctions de conversion DB -> Types UI
// ============================================================================

function mapBuildingToSite(building: DbBuilding & {
  devices?: { count: number }[];
  devices_online?: { count: number }[];
  sip_accounts?: { count: number }[];
}): Site {
  const stats = {
    totalDevices: building.devices?.[0]?.count || 0,
    onlineDevices: building.devices_online?.[0]?.count || 0,
    offlineDevices: (building.devices?.[0]?.count || 0) - (building.devices_online?.[0]?.count || 0),
    sipAccounts: building.sip_accounts?.[0]?.count || 0,
  };

  // Mapping building_type -> SiteType
  const typeMapping: Record<string, 'building' | 'villa' | 'office'> = {
    'apartment_building': 'building',
    'house': 'villa',
    'residence': 'building',
    'office': 'office',
  };

  return {
    id: building.id,
    name: building.name,
    type: typeMapping[building.building_type] || 'building',
    address: building.address || '',
    city: building.city || '',
    country: building.country,
    status: building.status,
    createdAt: building.created_at || '',
    updatedAt: building.updated_at || '',
    stats,
  };
}

function mapDbDeviceToDevice(device: DbDevice): Device {
  const typeMapping: Record<string, 'panel' | 'intercom' | 'gateway'> = {
    'panel': 'panel',
    'intercom': 'intercom',
    'gateway': 'gateway',
    'camera': 'panel', // Map camera to panel for now
    'other': 'panel',
  };

  return {
    id: device.id,
    siteId: device.building_id,
    zoneId: device.zone_id || undefined,
    name: device.name,
    type: typeMapping[device.device_type] || 'panel',
    model: device.model || undefined,
    ip: device.ip_address || '',
    macAddress: device.mac_address || undefined,
    status: device.status === 'error' ? 'error' : device.status,
    lastSeen: device.last_seen || undefined,
    firmware: device.firmware_version || undefined,
  };
}

function mapDbSipAccountToSipAccount(account: DbSipAccount): SipAccount {
  return {
    id: account.id,
    siteId: account.building_id,
    serverId: account.sip_server_id || '',
    extension: account.extension || '',
    username: account.username,
    password: '********', // Ne jamais exposer le mot de passe
    displayName: account.display_name || '',
    deviceId: account.device_id || undefined,
    zoneId: undefined, // A gerer via unit_id si necessaire
    enabled: account.enabled,
  };
}

function mapDbZoneToZone(zone: DbZone): Zone {
  const typeMapping: Record<string, 'entrance' | 'floor' | 'unit' | 'common'> = {
    'entrance': 'entrance',
    'floor': 'floor',
    'common': 'common',
    'parking': 'common',
    'garden': 'common',
    'other': 'common',
  };

  return {
    id: zone.id,
    siteId: zone.building_id,
    name: zone.name,
    type: typeMapping[zone.zone_type] || 'common',
    parentId: zone.parent_id || undefined,
    order: zone.sort_order,
  };
}

function mapDbActivityLogToActivityLog(log: DbActivityLog): ActivityLog {
  return {
    id: log.id,
    timestamp: log.created_at || new Date().toISOString(),
    siteId: log.building_id || undefined,
    deviceId: log.device_id || undefined,
    level: log.level,
    message: log.message || log.action,
    details: log.metadata as Record<string, unknown> | undefined,
  };
}

// ============================================================================
// API SERVICES
// ============================================================================

// --- Sites (Buildings) ---

export async function fetchSites(): Promise<Site[]> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, using mock data');
    await delay(300); // Simule latence reseau
    return mockSites;
  }

  const { data, error } = await supabase
    .from('buildings')
    .select(`
      *,
      devices:devices(count),
      devices_online:devices(count).filter(status.eq.online),
      sip_accounts:sip_accounts(count)
    `)
    .order('name');

  if (error) {
    console.error('Error fetching sites:', error);
    throw error;
  }

  return (data || []).map(mapBuildingToSite);
}

export async function fetchSite(id: string): Promise<Site | null> {
  if (!isSupabaseConfigured()) {
    await delay(200);
    return mockSites.find(s => s.id === id) || null;
  }

  const { data, error } = await supabase
    .from('buildings')
    .select(`
      *,
      devices:devices(count),
      devices_online:devices(count).filter(status.eq.online),
      sip_accounts:sip_accounts(count)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching site:', error);
    throw error;
  }

  return data ? mapBuildingToSite(data) : null;
}

export async function createSite(site: Omit<Site, 'id' | 'createdAt' | 'updatedAt' | 'stats'>): Promise<Site> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  // Recuperer l'organization_id de l'utilisateur connecte
  const { data: memberData } = await supabase
    .from('organization_members')
    .select('organization_id')
    .limit(1)
    .single();

  if (!memberData) {
    throw new Error('User not part of any organization');
  }

  const typeMapping: Record<string, 'apartment_building' | 'house' | 'residence' | 'office'> = {
    'building': 'apartment_building',
    'villa': 'house',
    'office': 'office',
  };

  const { data, error } = await supabase
    .from('buildings')
    .insert({
      organization_id: memberData.organization_id,
      name: site.name,
      address: site.address,
      city: site.city,
      country: site.country,
      building_type: typeMapping[site.type] || 'apartment_building',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating site:', error);
    throw error;
  }

  return mapBuildingToSite(data);
}

export async function updateSite(id: string, updates: Partial<Site>): Promise<Site> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const typeMapping: Record<string, 'apartment_building' | 'house' | 'residence' | 'office'> = {
    'building': 'apartment_building',
    'villa': 'house',
    'office': 'office',
  };

  const { data, error } = await supabase
    .from('buildings')
    .update({
      name: updates.name,
      address: updates.address,
      city: updates.city,
      country: updates.country,
      building_type: updates.type ? typeMapping[updates.type] : undefined,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating site:', error);
    throw error;
  }

  return mapBuildingToSite(data);
}

export async function deleteSite(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabase
    .from('buildings')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting site:', error);
    throw error;
  }
}

// --- Devices ---

export async function fetchDevices(siteId: string): Promise<Device[]> {
  if (!isSupabaseConfigured()) {
    await delay(200);
    return mockDevices[siteId] || [];
  }

  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('building_id', siteId)
    .order('name');

  if (error) {
    console.error('Error fetching devices:', error);
    throw error;
  }

  return (data || []).map(mapDbDeviceToDevice);
}

export async function createDevice(device: Omit<Device, 'id'>): Promise<Device> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const typeMapping: Record<string, 'panel' | 'intercom' | 'gateway' | 'camera' | 'other'> = {
    'panel': 'panel',
    'intercom': 'intercom',
    'gateway': 'gateway',
  };

  const { data, error } = await supabase
    .from('devices')
    .insert({
      building_id: device.siteId,
      zone_id: device.zoneId,
      name: device.name,
      device_type: typeMapping[device.type] || 'other',
      model: device.model,
      ip_address: device.ip,
      mac_address: device.macAddress,
      firmware_version: device.firmware,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating device:', error);
    throw error;
  }

  return mapDbDeviceToDevice(data);
}

export async function updateDevice(id: string, updates: Partial<Device>): Promise<Device> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('devices')
    .update({
      name: updates.name,
      zone_id: updates.zoneId,
      model: updates.model,
      ip_address: updates.ip,
      mac_address: updates.macAddress,
      firmware_version: updates.firmware,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating device:', error);
    throw error;
  }

  return mapDbDeviceToDevice(data);
}

export async function deleteDevice(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabase
    .from('devices')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting device:', error);
    throw error;
  }
}

// --- Zones ---

export async function fetchZones(siteId: string): Promise<Zone[]> {
  if (!isSupabaseConfigured()) {
    await delay(150);
    return mockZones[siteId] || [];
  }

  const { data, error } = await supabase
    .from('zones')
    .select('*')
    .eq('building_id', siteId)
    .order('sort_order');

  if (error) {
    console.error('Error fetching zones:', error);
    throw error;
  }

  return (data || []).map(mapDbZoneToZone);
}

// --- SIP Accounts ---

export async function fetchSipAccounts(siteId: string): Promise<SipAccount[]> {
  if (!isSupabaseConfigured()) {
    await delay(200);
    return mockSipAccounts[siteId] || [];
  }

  const { data, error } = await supabase
    .from('sip_accounts')
    .select('*')
    .eq('building_id', siteId)
    .order('extension');

  if (error) {
    console.error('Error fetching SIP accounts:', error);
    throw error;
  }

  return (data || []).map(mapDbSipAccountToSipAccount);
}

export async function createSipAccount(account: Omit<SipAccount, 'id'>): Promise<SipAccount> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('sip_accounts')
    .insert({
      building_id: account.siteId,
      sip_server_id: account.serverId || null,
      username: account.username,
      password_encrypted: account.password, // Note: devrait etre hash cote serveur
      extension: account.extension,
      display_name: account.displayName,
      device_id: account.deviceId,
      enabled: account.enabled,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating SIP account:', error);
    throw error;
  }

  return mapDbSipAccountToSipAccount(data);
}

// --- Dashboard Stats ---

export async function fetchDashboardStats(): Promise<DashboardStats> {
  if (!isSupabaseConfigured()) {
    await delay(250);
    return mockStats;
  }

  const { data, error } = await supabase.rpc('get_dashboard_stats');

  if (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }

  const stats = data as {
    sites_total?: number;
    sites_online?: number;
    devices_total?: number;
    devices_online?: number;
    sip_accounts_total?: number;
    alerts_count?: number;
  };

  return {
    totalSites: stats.sites_total || 0,
    sitesOnline: stats.sites_online || 0,
    totalDevices: stats.devices_total || 0,
    devicesOnline: stats.devices_online || 0,
    totalSipAccounts: stats.sip_accounts_total || 0,
    alerts: stats.alerts_count || 0,
  };
}

// --- Activity Logs ---

export async function fetchActivityLogs(options?: {
  siteId?: string;
  level?: 'info' | 'success' | 'warning' | 'error';
  limit?: number;
}): Promise<ActivityLog[]> {
  if (!isSupabaseConfigured()) {
    await delay(200);
    let logs = [...mockRecentActivity];
    if (options?.siteId) {
      logs = logs.filter(l => l.siteId === options.siteId);
    }
    if (options?.level) {
      logs = logs.filter(l => l.level === options.level);
    }
    if (options?.limit) {
      logs = logs.slice(0, options.limit);
    }
    return logs;
  }

  let query = supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options?.limit || 50);

  if (options?.siteId) {
    query = query.eq('building_id', options.siteId);
  }

  if (options?.level) {
    query = query.eq('level', options.level);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching activity logs:', error);
    throw error;
  }

  return (data || []).map(mapDbActivityLogToActivityLog);
}

// --- Realtime Subscriptions ---

export function subscribeToDeviceChanges(
  siteId: string,
  callback: (device: Device) => void
) {
  if (!isSupabaseConfigured()) {
    return { unsubscribe: () => {} };
  }

  const channel = supabase
    .channel(`devices:${siteId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'devices',
        filter: `building_id=eq.${siteId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(mapDbDeviceToDevice(payload.new as DbDevice));
        }
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

export function subscribeToActivityLogs(
  callback: (log: ActivityLog) => void
) {
  if (!isSupabaseConfigured()) {
    return { unsubscribe: () => {} };
  }

  const channel = supabase
    .channel('activity_logs')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_logs',
      },
      (payload) => {
        if (payload.new) {
          callback(mapDbActivityLogToActivityLog(payload.new as DbActivityLog));
        }
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
