// Types generes pour la base de donnees Supabase
// Basés sur la migration v2 (20250114160000_dashboard_tables_v2.sql)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: 'neolia_admin' | 'owner' | 'gestionnaire' | 'installateur' | 'resident';
          created_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: 'neolia_admin' | 'owner' | 'gestionnaire' | 'installateur' | 'resident';
          created_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: 'neolia_admin' | 'owner' | 'gestionnaire' | 'installateur' | 'resident';
          created_at?: string | null;
        };
      };
      buildings: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          address: string | null;
          city: string | null;
          country: string;
          building_type: 'apartment_building' | 'house' | 'residence' | 'office';
          status: 'online' | 'partial' | 'offline';
          timezone: string;
          config: Json;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          address?: string | null;
          city?: string | null;
          country?: string;
          building_type?: 'apartment_building' | 'house' | 'residence' | 'office';
          status?: 'online' | 'partial' | 'offline';
          timezone?: string;
          config?: Json;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          address?: string | null;
          city?: string | null;
          country?: string;
          building_type?: 'apartment_building' | 'house' | 'residence' | 'office';
          status?: 'online' | 'partial' | 'offline';
          timezone?: string;
          config?: Json;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      zones: {
        Row: {
          id: string;
          building_id: string;
          parent_id: string | null;
          name: string;
          zone_type: 'entrance' | 'floor' | 'common' | 'parking' | 'garden' | 'other';
          floor_number: number | null;
          sort_order: number;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          building_id: string;
          parent_id?: string | null;
          name: string;
          zone_type?: 'entrance' | 'floor' | 'common' | 'parking' | 'garden' | 'other';
          floor_number?: number | null;
          sort_order?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          building_id?: string;
          parent_id?: string | null;
          name?: string;
          zone_type?: 'entrance' | 'floor' | 'common' | 'parking' | 'garden' | 'other';
          floor_number?: number | null;
          sort_order?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      units: {
        Row: {
          id: string;
          building_id: string;
          zone_id: string | null;
          name: string;
          unit_type: 'apartment' | 'house' | 'studio' | 'office' | 'commercial';
          floor_number: number | null;
          door_number: string | null;
          sort_order: number;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          building_id: string;
          zone_id?: string | null;
          name: string;
          unit_type?: 'apartment' | 'house' | 'studio' | 'office' | 'commercial';
          floor_number?: number | null;
          door_number?: string | null;
          sort_order?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          building_id?: string;
          zone_id?: string | null;
          name?: string;
          unit_type?: 'apartment' | 'house' | 'studio' | 'office' | 'commercial';
          floor_number?: number | null;
          door_number?: string | null;
          sort_order?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      residents: {
        Row: {
          id: string;
          user_id: string | null;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      resident_units: {
        Row: {
          id: string;
          resident_id: string;
          unit_id: string;
          is_owner: boolean;
          move_in_date: string | null;
          move_out_date: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          resident_id: string;
          unit_id: string;
          is_owner?: boolean;
          move_in_date?: string | null;
          move_out_date?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          resident_id?: string;
          unit_id?: string;
          is_owner?: boolean;
          move_in_date?: string | null;
          move_out_date?: string | null;
          created_at?: string | null;
        };
      };
      devices: {
        Row: {
          id: string;
          building_id: string;
          zone_id: string | null;
          unit_id: string | null;
          name: string;
          device_type: 'panel' | 'intercom' | 'gateway' | 'camera' | 'other';
          model: string | null;
          ip_address: string | null;
          mac_address: string | null;
          firmware_version: string | null;
          status: 'online' | 'offline' | 'error';
          last_seen: string | null;
          config: Json;
          system_metrics: Json;
          services: Json;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          building_id: string;
          zone_id?: string | null;
          unit_id?: string | null;
          name: string;
          device_type: 'panel' | 'intercom' | 'gateway' | 'camera' | 'other';
          model?: string | null;
          ip_address?: string | null;
          mac_address?: string | null;
          firmware_version?: string | null;
          status?: 'online' | 'offline' | 'error';
          last_seen?: string | null;
          config?: Json;
          system_metrics?: Json;
          services?: Json;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          building_id?: string;
          zone_id?: string | null;
          unit_id?: string | null;
          name?: string;
          device_type?: 'panel' | 'intercom' | 'gateway' | 'camera' | 'other';
          model?: string | null;
          ip_address?: string | null;
          mac_address?: string | null;
          firmware_version?: string | null;
          status?: 'online' | 'offline' | 'error';
          last_seen?: string | null;
          config?: Json;
          system_metrics?: Json;
          services?: Json;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      sip_servers: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          host: string;
          port: number;
          transport: 'udp' | 'tcp' | 'tls' | 'wss';
          is_default: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          host: string;
          port?: number;
          transport?: 'udp' | 'tcp' | 'tls' | 'wss';
          is_default?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          host?: string;
          port?: number;
          transport?: 'udp' | 'tcp' | 'tls' | 'wss';
          is_default?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      sip_accounts: {
        Row: {
          id: string;
          building_id: string;
          unit_id: string | null;
          device_id: string | null;
          resident_id: string | null;
          sip_server_id: string | null;
          account_type: 'device' | 'mobile' | 'softphone';
          username: string;
          password_encrypted: string;
          extension: string | null;
          display_name: string | null;
          enabled: boolean;
          registered: boolean;
          last_registration: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          building_id: string;
          unit_id?: string | null;
          device_id?: string | null;
          resident_id?: string | null;
          sip_server_id?: string | null;
          account_type?: 'device' | 'mobile' | 'softphone';
          username: string;
          password_encrypted: string;
          extension?: string | null;
          display_name?: string | null;
          enabled?: boolean;
          registered?: boolean;
          last_registration?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          building_id?: string;
          unit_id?: string | null;
          device_id?: string | null;
          resident_id?: string | null;
          sip_server_id?: string | null;
          account_type?: 'device' | 'mobile' | 'softphone';
          username?: string;
          password_encrypted?: string;
          extension?: string | null;
          display_name?: string | null;
          enabled?: boolean;
          registered?: boolean;
          last_registration?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      call_routing_rules: {
        Row: {
          id: string;
          building_id: string;
          unit_id: string | null;
          device_id: string | null;
          name: string;
          priority: number;
          source_extension: string | null;
          destination_type: 'sip_account' | 'group' | 'voicemail' | 'external';
          destination_value: string;
          time_start: string | null;
          time_end: string | null;
          days_of_week: number[] | null;
          enabled: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          building_id: string;
          unit_id?: string | null;
          device_id?: string | null;
          name: string;
          priority?: number;
          source_extension?: string | null;
          destination_type: 'sip_account' | 'group' | 'voicemail' | 'external';
          destination_value: string;
          time_start?: string | null;
          time_end?: string | null;
          days_of_week?: number[] | null;
          enabled?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          building_id?: string;
          unit_id?: string | null;
          device_id?: string | null;
          name?: string;
          priority?: number;
          source_extension?: string | null;
          destination_type?: 'sip_account' | 'group' | 'voicemail' | 'external';
          destination_value?: string;
          time_start?: string | null;
          time_end?: string | null;
          days_of_week?: number[] | null;
          enabled?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          building_id: string | null;
          device_id: string | null;
          user_id: string | null;
          level: 'info' | 'success' | 'warning' | 'error';
          action: string;
          message: string | null;
          metadata: Json;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          building_id?: string | null;
          device_id?: string | null;
          user_id?: string | null;
          level?: 'info' | 'success' | 'warning' | 'error';
          action: string;
          message?: string | null;
          metadata?: Json;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          building_id?: string | null;
          device_id?: string | null;
          user_id?: string | null;
          level?: 'info' | 'success' | 'warning' | 'error';
          action?: string;
          message?: string | null;
          metadata?: Json;
          created_at?: string | null;
        };
      };
    };
    Functions: {
      get_dashboard_stats: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_user_org_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
    };
  };
};

// Types utilitaires
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
