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
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSites, useDashboardStats, useActivityLogs } from '../hooks';
import { mockSites } from '../data/mockData';

const siteTypeConfig = {
  building: { icon: Building2, label: 'Immeuble', color: 'text-primary-400' },
  villa: { icon: Home, label: 'Villa', color: 'text-green-400' },
  office: { icon: Building2, label: 'Bureaux', color: 'text-purple-400' },
};

// Formatter l'heure pour l'affichage
function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// Trouver le nom du site par ID
function getSiteName(siteId: string | undefined, sites: typeof mockSites): string {
  if (!siteId) return 'Global';
  const site = sites.find(s => s.id === siteId);
  return site?.name || 'Site inconnu';
}

export function Dashboard() {
  const { data: sites = [], isLoading: sitesLoading } = useSites();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentActivity = [], isLoading: logsLoading } = useActivityLogs({ limit: 5 });

  const isLoading = sitesLoading || statsLoading || logsLoading;

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

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
                {stats?.sitesOnline ?? 0}/{stats?.totalSites ?? 0}
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
                {stats?.devicesOnline ?? 0}/{stats?.totalDevices ?? 0}
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
                {stats?.totalSipAccounts ?? 0}
              </p>
              <p className="text-sm text-dark-400">Comptes SIP</p>
            </div>
          </Card>

          <Card className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-500/10">
              <AlertTriangle size={24} className="text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-100">{stats?.alerts ?? 0}</p>
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
                        : activity.level === 'warning'
                          ? 'bg-orange-500'
                          : 'bg-primary-500'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-200">{activity.message}</p>
                  <p className="text-xs text-dark-500">{getSiteName(activity.siteId, sites)}</p>
                </div>
                <span className="text-xs text-dark-500 whitespace-nowrap">
                  {formatTime(activity.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
