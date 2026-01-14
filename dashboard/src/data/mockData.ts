// Mock data pour le developpement sans backend
// Utilise quand Supabase n'est pas configure

import type { Site, Device, SipAccount, DashboardStats, ActivityLog, Zone } from '../types';

export const mockStats: DashboardStats = {
  totalSites: 3,
  sitesOnline: 2,
  totalDevices: 8,
  devicesOnline: 6,
  totalSipAccounts: 12,
  alerts: 1,
};

export const mockSites: Site[] = [
  {
    id: '1',
    name: 'Residence Les Music ROOM',
    type: 'building',
    address: '12 Rue de la Paix',
    city: 'Paris',
    country: 'France',
    status: 'online',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-15',
    stats: {
      totalDevices: 4,
      onlineDevices: 4,
      offlineDevices: 0,
      sipAccounts: 6,
    },
  },
  {
    id: '2',
    name: 'Villa Descollaz',
    type: 'villa',
    address: '45 Chemin des Vignes',
    city: 'Geneve',
    country: 'Suisse',
    status: 'online',
    createdAt: '2024-01-05',
    updatedAt: '2024-01-14',
    stats: {
      totalDevices: 3,
      onlineDevices: 2,
      offlineDevices: 1,
      sipAccounts: 4,
    },
  },
  {
    id: '3',
    name: 'Bureaux NexVentures',
    type: 'office',
    address: '8 Avenue du Tech',
    city: 'Lyon',
    country: 'France',
    status: 'offline',
    createdAt: '2024-01-10',
    updatedAt: '2024-01-10',
    stats: {
      totalDevices: 1,
      onlineDevices: 0,
      offlineDevices: 1,
      sipAccounts: 2,
    },
  },
];

export const mockDevices: Record<string, Device[]> = {
  '1': [
    {
      id: 'd1',
      siteId: '1',
      zoneId: 'z1',
      name: 'Panel Entree Principale',
      type: 'panel',
      model: 'Akuvox S563',
      ip: '192.168.1.100',
      macAddress: 'AA:BB:CC:DD:EE:01',
      status: 'online',
      lastSeen: new Date().toISOString(),
      firmware: '563.30.1.28',
    },
    {
      id: 'd2',
      siteId: '1',
      zoneId: 'z1',
      name: 'Intercom Portail',
      type: 'intercom',
      model: 'Akuvox E12W',
      ip: '192.168.1.101',
      macAddress: 'AA:BB:CC:DD:EE:02',
      status: 'online',
      lastSeen: new Date().toISOString(),
      firmware: '12.30.1.22',
    },
    {
      id: 'd3',
      siteId: '1',
      name: 'Gateway R-Pi',
      type: 'gateway',
      model: 'Raspberry Pi 4',
      ip: '192.168.1.10',
      macAddress: 'AA:BB:CC:DD:EE:03',
      status: 'online',
      lastSeen: new Date().toISOString(),
    },
    {
      id: 'd4',
      siteId: '1',
      zoneId: 'z2',
      name: 'Panel Etage 1',
      type: 'panel',
      model: 'Akuvox S563',
      ip: '192.168.1.102',
      macAddress: 'AA:BB:CC:DD:EE:04',
      status: 'online',
      lastSeen: new Date().toISOString(),
      firmware: '563.30.1.28',
    },
  ],
  '2': [
    {
      id: 'd5',
      siteId: '2',
      name: 'Panel Entree Villa',
      type: 'panel',
      model: 'Akuvox S563',
      ip: '192.168.2.100',
      status: 'online',
      lastSeen: new Date().toISOString(),
    },
    {
      id: 'd6',
      siteId: '2',
      name: 'Intercom Garage',
      type: 'intercom',
      model: 'Akuvox E12W',
      ip: '192.168.2.101',
      status: 'online',
      lastSeen: new Date().toISOString(),
    },
    {
      id: 'd7',
      siteId: '2',
      name: 'Gateway',
      type: 'gateway',
      model: 'Raspberry Pi 4',
      ip: '192.168.2.10',
      status: 'offline',
    },
  ],
  '3': [
    {
      id: 'd8',
      siteId: '3',
      name: 'Panel Reception',
      type: 'panel',
      model: 'Akuvox S563',
      ip: '192.168.3.100',
      status: 'offline',
    },
  ],
};

export const mockZones: Record<string, Zone[]> = {
  '1': [
    { id: 'z1', siteId: '1', name: 'Entree Principale', type: 'entrance', order: 0 },
    { id: 'z2', siteId: '1', name: 'Etage 1', type: 'floor', parentId: 'z1', order: 1 },
    { id: 'z3', siteId: '1', name: 'Etage 2', type: 'floor', parentId: 'z1', order: 2 },
    { id: 'z4', siteId: '1', name: 'Appartement 101', type: 'unit', parentId: 'z2', order: 0 },
    { id: 'z5', siteId: '1', name: 'Appartement 102', type: 'unit', parentId: 'z2', order: 1 },
  ],
  '2': [
    { id: 'z6', siteId: '2', name: 'Villa Principale', type: 'entrance', order: 0 },
  ],
  '3': [
    { id: 'z7', siteId: '3', name: 'Reception', type: 'entrance', order: 0 },
  ],
};

export const mockSipAccounts: Record<string, SipAccount[]> = {
  '1': [
    {
      id: 's1',
      siteId: '1',
      serverId: 'srv1',
      extension: '101',
      username: 'panel_101',
      password: '********',
      displayName: 'Appartement 101',
      deviceId: 'd1',
      enabled: true,
    },
    {
      id: 's2',
      siteId: '1',
      serverId: 'srv1',
      extension: '102',
      username: 'panel_102',
      password: '********',
      displayName: 'Appartement 102',
      enabled: true,
    },
    {
      id: 's3',
      siteId: '1',
      serverId: 'srv1',
      extension: '201',
      username: 'mobile_dupont',
      password: '********',
      displayName: 'M. Dupont (Mobile)',
      zoneId: 'z4',
      enabled: true,
    },
  ],
  '2': [
    {
      id: 's4',
      siteId: '2',
      serverId: 'srv1',
      extension: '001',
      username: 'villa_main',
      password: '********',
      displayName: 'Villa Descollaz',
      deviceId: 'd5',
      enabled: true,
    },
  ],
  '3': [
    {
      id: 's5',
      siteId: '3',
      serverId: 'srv1',
      extension: '500',
      username: 'office_reception',
      password: '********',
      displayName: 'Reception',
      deviceId: 'd8',
      enabled: false,
    },
  ],
};

export const mockRecentActivity: ActivityLog[] = [
  {
    id: 'log1',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    siteId: '2',
    message: 'Application deployee avec succes sur le panel entree',
    level: 'success',
  },
  {
    id: 'log2',
    timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    siteId: '1',
    message: 'Configuration SIP mise a jour pour 6 comptes',
    level: 'info',
  },
  {
    id: 'log3',
    timestamp: new Date(Date.now() - 4 * 60 * 60000).toISOString(),
    siteId: '3',
    deviceId: 'd8',
    message: 'Gateway hors ligne - connexion perdue',
    level: 'error',
  },
  {
    id: 'log4',
    timestamp: new Date(Date.now() - 6 * 60 * 60000).toISOString(),
    siteId: '1',
    message: 'Nouveau compte SIP cree: mobile_dupont',
    level: 'info',
  },
  {
    id: 'log5',
    timestamp: new Date(Date.now() - 24 * 60 * 60000).toISOString(),
    siteId: '2',
    message: 'Firmware mis a jour sur Panel Entree Villa',
    level: 'success',
  },
];

// Helper pour simuler un delai reseau
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
