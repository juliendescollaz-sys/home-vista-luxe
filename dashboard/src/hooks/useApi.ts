// Hooks React Query pour l'API Dashboard Neolia
// Encapsule les appels API avec cache, loading states et error handling

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import type { Site, Device, SipAccount } from '../types';

// ============================================================================
// Query Keys
// ============================================================================

export const queryKeys = {
  sites: ['sites'] as const,
  site: (id: string) => ['sites', id] as const,
  devices: (siteId: string) => ['devices', siteId] as const,
  zones: (siteId: string) => ['zones', siteId] as const,
  sipAccounts: (siteId: string) => ['sipAccounts', siteId] as const,
  dashboardStats: ['dashboardStats'] as const,
  activityLogs: (options?: { siteId?: string; level?: string }) =>
    ['activityLogs', options] as const,
};

// ============================================================================
// Sites Hooks
// ============================================================================

export function useSites() {
  return useQuery({
    queryKey: queryKeys.sites,
    queryFn: api.fetchSites,
    staleTime: 30 * 1000, // 30 secondes
  });
}

export function useSite(id: string) {
  return useQuery({
    queryKey: queryKeys.site(id),
    queryFn: () => api.fetchSite(id),
    enabled: Boolean(id),
  });
}

export function useCreateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (site: Omit<Site, 'id' | 'createdAt' | 'updatedAt' | 'stats'>) =>
      api.createSite(site),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
    },
  });
}

export function useUpdateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Site> }) =>
      api.updateSite(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites });
      queryClient.invalidateQueries({ queryKey: queryKeys.site(id) });
    },
  });
}

export function useDeleteSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
    },
  });
}

// ============================================================================
// Devices Hooks
// ============================================================================

export function useDevices(siteId: string) {
  return useQuery({
    queryKey: queryKeys.devices(siteId),
    queryFn: () => api.fetchDevices(siteId),
    enabled: Boolean(siteId),
    staleTime: 10 * 1000, // 10 secondes
  });
}

export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (device: Omit<Device, 'id'>) => api.createDevice(device),
    onSuccess: (_, device) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.devices(device.siteId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.site(device.siteId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
    },
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      siteId: _siteId,
      updates,
    }: {
      id: string;
      siteId: string;
      updates: Partial<Device>;
    }) => api.updateDevice(id, updates),
    onSuccess: (_, { siteId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.devices(siteId) });
    },
  });
}

export function useDeleteDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, siteId: _siteId }: { id: string; siteId: string }) =>
      api.deleteDevice(id),
    onSuccess: (_, { siteId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.devices(siteId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.site(siteId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
    },
  });
}

// ============================================================================
// Zones Hooks
// ============================================================================

export function useZones(siteId: string) {
  return useQuery({
    queryKey: queryKeys.zones(siteId),
    queryFn: () => api.fetchZones(siteId),
    enabled: Boolean(siteId),
  });
}

// ============================================================================
// SIP Accounts Hooks
// ============================================================================

export function useSipAccounts(siteId: string) {
  return useQuery({
    queryKey: queryKeys.sipAccounts(siteId),
    queryFn: () => api.fetchSipAccounts(siteId),
    enabled: Boolean(siteId),
  });
}

export function useCreateSipAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (account: Omit<SipAccount, 'id'>) => api.createSipAccount(account),
    onSuccess: (_, account) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sipAccounts(account.siteId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.site(account.siteId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
    },
  });
}

// ============================================================================
// Dashboard Stats Hook
// ============================================================================

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: api.fetchDashboardStats,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

// ============================================================================
// Activity Logs Hooks
// ============================================================================

export function useActivityLogs(options?: {
  siteId?: string;
  level?: 'info' | 'success' | 'warning' | 'error';
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.activityLogs(options),
    queryFn: () => api.fetchActivityLogs(options),
    staleTime: 30 * 1000,
  });
}
