/**
 * Hook pour la gestion admin de l'interphonie
 * Utilise React Query pour le cache et les mutations
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  Site,
  SiteInsert,
  Building,
  BuildingInsert,
  IntercomUnit,
  UnitInsert,
  SIPAccount,
  SIPAccountInsert,
  IntercomDashboardStats,
  KamailioSyncResult,
} from '@/types/intercom';

// Query keys
const QUERY_KEYS = {
  sites: ['intercom', 'sites'],
  buildings: (siteId?: string) => ['intercom', 'buildings', siteId],
  units: (buildingId?: string) => ['intercom', 'units', buildingId],
  sipAccounts: (unitId?: string) => ['intercom', 'sip-accounts', unitId],
  stats: ['intercom', 'stats'],
};

// ============== SITES ==============

export function useSites() {
  return useQuery({
    queryKey: QUERY_KEYS.sites,
    queryFn: async (): Promise<Site[]> => {
      // TODO: Replace with actual Supabase query when tables are created
      // const { data, error } = await supabase
      //   .from('sites')
      //   .select('*, buildings(count), units(count)')
      //   .order('name');

      // Mock data for now
      return [
        {
          id: 'site-1',
          name: 'Residence Les Cimes',
          address: '123 Avenue du Mont-Blanc, 74000 Annecy',
          type: 'building',
          status: 'online',
          timezone: 'Europe/Paris',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          buildings_count: 2,
          units_count: 24,
          sip_accounts_count: 48,
        },
        {
          id: 'site-2',
          name: 'Villa Montagne',
          address: '456 Chemin des Alpes, 74400 Chamonix',
          type: 'villa',
          status: 'partial',
          timezone: 'Europe/Paris',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          buildings_count: 1,
          units_count: 1,
          sip_accounts_count: 2,
        },
      ];
    },
  });
}

export function useCreateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (site: SiteInsert): Promise<Site> => {
      // TODO: Replace with actual Supabase insert
      // const { data, error } = await supabase
      //   .from('sites')
      //   .insert(site)
      //   .select()
      //   .single();

      // Mock response
      return {
        id: `site-${Date.now()}`,
        ...site,
        type: site.type || 'building',
        status: 'offline',
        timezone: site.timezone || 'Europe/Paris',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sites });
      toast.success('Site cree avec succes');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============== BUILDINGS ==============

export function useBuildings(siteId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.buildings(siteId),
    queryFn: async (): Promise<Building[]> => {
      // TODO: Replace with actual Supabase query
      const allBuildings: Building[] = [
        { id: 'bldg-1', site_id: 'site-1', name: 'Batiment A', units_count: 12, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'bldg-2', site_id: 'site-1', name: 'Batiment B', units_count: 12, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'bldg-3', site_id: 'site-2', name: 'Villa', units_count: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ];

      return siteId ? allBuildings.filter(b => b.site_id === siteId) : allBuildings;
    },
    enabled: true,
  });
}

export function useCreateBuilding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (building: BuildingInsert): Promise<Building> => {
      return {
        id: `bldg-${Date.now()}`,
        ...building,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.buildings(variables.site_id) });
      toast.success('Batiment cree avec succes');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============== UNITS ==============

export function useUnits(buildingId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.units(buildingId),
    queryFn: async (): Promise<IntercomUnit[]> => {
      const allUnits: IntercomUnit[] = [
        {
          id: 'unit-1',
          building_id: 'bldg-1',
          number: '101',
          floor: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sip_accounts: [
            { id: 'sip-1', unit_id: 'unit-1', username: 'unit101', domain: 'sip.neolia.app', type: 'panel', enabled: true, registered: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'sip-2', unit_id: 'unit-1', username: 'unit101-mobile', domain: 'sip.neolia.app', type: 'mobile', enabled: true, registered: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          ],
        },
        {
          id: 'unit-2',
          building_id: 'bldg-1',
          number: '102',
          floor: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sip_accounts: [
            { id: 'sip-3', unit_id: 'unit-2', username: 'unit102', domain: 'sip.neolia.app', type: 'panel', enabled: true, registered: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          ],
        },
      ];

      return buildingId ? allUnits.filter(u => u.building_id === buildingId) : allUnits;
    },
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (unit: UnitInsert): Promise<IntercomUnit> => {
      return {
        id: `unit-${Date.now()}`,
        ...unit,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sip_accounts: [],
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.units(variables.building_id) });
      toast.success('Logement cree avec succes');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============== SIP ACCOUNTS ==============

export function useSIPAccounts(unitId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.sipAccounts(unitId),
    queryFn: async (): Promise<SIPAccount[]> => {
      // Will be implemented with Supabase
      return [];
    },
  });
}

export function useCreateSIPAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (account: SIPAccountInsert): Promise<SIPAccount> => {
      // TODO: This will call an Edge Function that:
      // 1. Creates the account in Supabase
      // 2. Syncs with Kamailio via SSH or API

      const username = account.username || `unit${Date.now()}`;

      return {
        id: `sip-${Date.now()}`,
        unit_id: account.unit_id,
        username,
        domain: account.domain || 'sip.neolia.app',
        extension: account.extension,
        display_name: account.display_name,
        type: account.type,
        enabled: true,
        registered: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sipAccounts(variables.unit_id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.units() });
      toast.success('Compte SIP cree et synchronise');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteSIPAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string): Promise<void> => {
      // TODO: Delete from Supabase and sync with Kamailio
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intercom'] });
      toast.success('Compte SIP supprime');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============== KAMAILIO SYNC ==============

export function useSyncKamailio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<KamailioSyncResult> => {
      // TODO: Call Edge Function that:
      // 1. Gets all SIP accounts from Supabase
      // 2. Compares with Kamailio subscriber table
      // 3. Creates/updates/deletes as needed

      // Mock response
      await new Promise(resolve => setTimeout(resolve, 2000));

      return {
        success: true,
        accounts_created: 0,
        accounts_updated: 0,
        accounts_deleted: 0,
        errors: [],
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['intercom'] });
      if (result.success) {
        toast.success(`Sync terminee: ${result.accounts_created} crees, ${result.accounts_updated} mis a jour`);
      } else {
        toast.error(`Sync avec erreurs: ${result.errors.join(', ')}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Erreur de sync: ${error.message}`);
    },
  });
}

// ============== STATS ==============

export function useIntercomStats() {
  return useQuery({
    queryKey: QUERY_KEYS.stats,
    queryFn: async (): Promise<IntercomDashboardStats> => {
      // TODO: Call RPC function for aggregated stats
      return {
        sites_total: 2,
        sites_online: 1,
        buildings_total: 3,
        units_total: 25,
        sip_accounts_total: 50,
        sip_accounts_registered: 35,
      };
    },
  });
}
