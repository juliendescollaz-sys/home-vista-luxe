// =============================================================================
// SITES - Immeubles, villas, bureaux
// =============================================================================

export type SiteType = 'building' | 'villa' | 'office';
export type SiteStatus = 'online' | 'partial' | 'offline';

export interface Site {
  id: string;
  name: string;
  type: SiteType;
  address: string;
  city: string;
  country: string;
  status: SiteStatus;
  gatewayId?: string;
  createdAt: string;
  updatedAt: string;
  stats?: SiteStats;
}

export interface SiteStats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  sipAccounts: number;
}

// =============================================================================
// ZONES - Entrees, etages, unites (appartements, bureaux)
// =============================================================================

export type ZoneType = 'entrance' | 'floor' | 'unit' | 'common';

export interface Zone {
  id: string;
  siteId: string;
  name: string;
  type: ZoneType;
  parentId?: string;
  order?: number;
}

// =============================================================================
// DEVICES - Panels, intercoms, gateways (agnostique du modele)
// =============================================================================

export type DeviceType = 'panel' | 'intercom' | 'gateway';
export type DeviceStatus = 'online' | 'offline' | 'unknown' | 'error';

export interface Device {
  id: string;
  siteId: string;
  zoneId?: string;
  name: string;
  type: DeviceType;
  model?: string;
  ip: string;
  macAddress?: string;
  status: DeviceStatus;
  lastSeen?: string;
  firmware?: string;
}

// =============================================================================
// GATEWAYS - R-Pi locaux qui gerent SIP et media
// =============================================================================

export interface Gateway extends Device {
  type: 'gateway';
  services: GatewayService[];
  system?: GatewaySystem;
}

export interface GatewayService {
  name: string;
  status: 'running' | 'stopped' | 'error';
  port?: number;
}

export interface GatewaySystem {
  uptime: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  temperature?: number;
}

// =============================================================================
// SIP - Configuration et comptes
// =============================================================================

export interface SipServer {
  id: string;
  siteId: string;
  name: string;
  host: string;
  port: number;
  transport: 'udp' | 'tcp' | 'tls' | 'ws' | 'wss';
  domain?: string;
  outboundProxy?: string;
}

export interface SipAccount {
  id: string;
  siteId: string;
  serverId: string;
  extension: string;
  username: string;
  password: string;
  displayName: string;
  deviceId?: string;
  zoneId?: string;
  enabled: boolean;
}

// =============================================================================
// CONFIGURATIONS - Deployables vers les devices
// =============================================================================

export type ConfigType = 'sip' | 'network' | 'app' | 'intercom';
export type ConfigStatus = 'draft' | 'pending' | 'deployed' | 'error';

export interface DeployableConfig {
  id: string;
  siteId: string;
  name: string;
  type: ConfigType;
  targetDeviceId?: string;
  targetGatewayId?: string;
  content: Record<string, unknown>;
  status: ConfigStatus;
  createdAt: string;
  deployedAt?: string;
  error?: string;
}

export interface NetworkConfig {
  mode: 'dhcp' | 'static';
  ip?: string;
  subnet?: string;
  gateway?: string;
  dns1?: string;
  dns2?: string;
}

export interface AppConfig {
  packageName: string;
  version?: string;
  autoStart: boolean;
  keepAlive: boolean;
  returnInterval?: number;
  showIcon: boolean;
}

// =============================================================================
// CREDENTIALS - Acces aux devices
// =============================================================================

export interface DeviceCredentials {
  id: string;
  deviceId: string;
  username: string;
  password: string;
}

// =============================================================================
// API & DASHBOARD
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DashboardStats {
  totalSites: number;
  sitesOnline: number;
  totalDevices: number;
  devicesOnline: number;
  totalSipAccounts: number;
  alerts: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  siteId?: string;
  deviceId?: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: Record<string, unknown>;
}
