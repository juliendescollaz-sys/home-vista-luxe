import { Header } from '../components/layout';
import { Card, CardHeader, StatusBadge } from '../components/ui';
import {
  Building2,
  Home,
  Wifi,
  Phone,
  AlertTriangle,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Site, DashboardStats } from '../types';

// Mock data
const stats: DashboardStats = {
  totalSites: 3,
  sitesOnline: 2,
  totalDevices: 8,
  devicesOnline: 6,
  totalSipAccounts: 12,
  alerts: 1,
};

const sites: Site[] = [
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

const recentActivity = [
  {
    id: '1',
    timestamp: '14:32',
    site: 'Villa Descollaz',
    message: 'Application deployee avec succes sur le panel entree',
    level: 'success' as const,
  },
  {
    id: '2',
    timestamp: '12:15',
    site: 'Residence Les Music ROOM',
    message: 'Configuration SIP mise a jour pour 6 comptes',
    level: 'info' as const,
  },
  {
    id: '3',
    timestamp: '10:00',
    site: 'Bureaux NexVentures',
    message: 'Gateway hors ligne - connexion perdue',
    level: 'error' as const,
  },
];

const siteTypeConfig = {
  building: { icon: Building2, label: 'Immeuble', color: 'text-primary-400' },
  villa: { icon: Home, label: 'Villa', color: 'text-green-400' },
  office: { icon: Building2, label: 'Bureaux', color: 'text-purple-400' },
};

export function Dashboard() {
  return (
    <div>
      <Header
        title="Tableau de bord"
        subtitle="Gerez vos sites et appareils"
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary-500/10">
              <MapPin size={24} className="text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-100">
                {stats.sitesOnline}/{stats.totalSites}
              </p>
              <p className="text-sm text-dark-400">Sites en ligne</p>
            </div>
          </Card>

          <Card className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/10">
              <Wifi size={24} className="text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-100">
                {stats.devicesOnline}/{stats.totalDevices}
              </p>
              <p className="text-sm text-dark-400">Appareils en ligne</p>
            </div>
          </Card>

          <Card className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10">
              <Phone size={24} className="text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-100">
                {stats.totalSipAccounts}
              </p>
              <p className="text-sm text-dark-400">Comptes SIP</p>
            </div>
          </Card>

          <Card className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-500/10">
              <AlertTriangle size={24} className="text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-100">{stats.alerts}</p>
              <p className="text-sm text-dark-400">Alertes actives</p>
            </div>
          </Card>
        </div>

        {/* Sites Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark-100">Vos sites</h2>
            <Link
              to="/sites"
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              Voir tout <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map((site) => {
              const typeConfig = siteTypeConfig[site.type];
              const TypeIcon = typeConfig.icon;

              return (
                <Link key={site.id} to={`/sites/${site.id}`}>
                  <Card hover className="h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-dark-700 rounded-lg">
                          <TypeIcon size={20} className={typeConfig.color} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-dark-100">
                            {site.name}
                          </h3>
                          <p className="text-sm text-dark-400">
                            {site.city}, {site.country}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={site.status} size="sm" />
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-dark-700">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-dark-100">
                          {site.stats?.onlineDevices}/{site.stats?.totalDevices}
                        </p>
                        <p className="text-xs text-dark-500">Devices</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-dark-100">
                          {site.stats?.sipAccounts}
                        </p>
                        <p className="text-xs text-dark-500">SIP</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-dark-100">
                          {site.gatewayId ? '1' : '0'}
                        </p>
                        <p className="text-xs text-dark-500">Gateway</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader
            title="Activite recente"
            subtitle="Derniers evenements sur tous les sites"
          />

          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-4 p-3 bg-dark-900 rounded-lg"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    activity.level === 'success'
                      ? 'bg-green-500'
                      : activity.level === 'error'
                        ? 'bg-red-500'
                        : 'bg-primary-500'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-200">{activity.message}</p>
                  <p className="text-xs text-dark-500">{activity.site}</p>
                </div>
                <span className="text-xs text-dark-500 whitespace-nowrap">
                  {activity.timestamp}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
