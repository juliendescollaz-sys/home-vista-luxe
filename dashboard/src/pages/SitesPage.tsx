import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Home,
  Briefcase,
  Plus,
  Search,
  Filter,
  MoreVertical,
} from 'lucide-react';
import { Header } from '../components/layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { Site, SiteType } from '../types';

// Donnees mock pour demo
const mockSites: Site[] = [
  {
    id: '1',
    name: 'Residence Les Jardins',
    type: 'building',
    address: '123 Avenue des Fleurs',
    city: 'Paris',
    country: 'France',
    status: 'online',
    gatewayId: 'gw-001',
    createdAt: '2024-01-15',
    updatedAt: '2024-03-20',
    stats: {
      totalDevices: 8,
      onlineDevices: 7,
      offlineDevices: 1,
      sipAccounts: 24,
    },
  },
  {
    id: '2',
    name: 'Villa Bellevue',
    type: 'villa',
    address: '45 Chemin des Collines',
    city: 'Nice',
    country: 'France',
    status: 'online',
    gatewayId: 'gw-002',
    createdAt: '2024-02-10',
    updatedAt: '2024-03-18',
    stats: {
      totalDevices: 3,
      onlineDevices: 3,
      offlineDevices: 0,
      sipAccounts: 4,
    },
  },
  {
    id: '3',
    name: 'Tour Horizon',
    type: 'building',
    address: '78 Boulevard Central',
    city: 'Lyon',
    country: 'France',
    status: 'partial',
    gatewayId: 'gw-003',
    createdAt: '2024-01-20',
    updatedAt: '2024-03-19',
    stats: {
      totalDevices: 15,
      onlineDevices: 12,
      offlineDevices: 3,
      sipAccounts: 45,
    },
  },
  {
    id: '4',
    name: 'Bureaux Technoparc',
    type: 'office',
    address: '5 Rue de l\'Innovation',
    city: 'Sophia Antipolis',
    country: 'France',
    status: 'offline',
    createdAt: '2024-03-01',
    updatedAt: '2024-03-01',
    stats: {
      totalDevices: 4,
      onlineDevices: 0,
      offlineDevices: 4,
      sipAccounts: 8,
    },
  },
];

const typeIcons: Record<SiteType, typeof Building2> = {
  building: Building2,
  villa: Home,
  office: Briefcase,
};

const typeLabels: Record<SiteType, string> = {
  building: 'Immeuble',
  villa: 'Villa',
  office: 'Bureaux',
};

export function SitesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<SiteType | 'all'>('all');

  const filteredSites = mockSites.filter((site) => {
    const matchesSearch =
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || site.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div>
      <Header title="Sites" subtitle="Gestion des immeubles, villas et bureaux" />

      <div className="p-6 space-y-6">
        {/* Actions & Filters */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500"
              />
              <input
                type="text"
                placeholder="Rechercher un site..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-200 placeholder-dark-500 focus:outline-none focus:border-primary-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-dark-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as SiteType | 'all')}
                className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-dark-200 focus:outline-none focus:border-primary-500"
              >
                <option value="all">Tous les types</option>
                <option value="building">Immeubles</option>
                <option value="villa">Villas</option>
                <option value="office">Bureaux</option>
              </select>
            </div>
          </div>
          <Button icon={<Plus size={18} />}>Nouveau site</Button>
        </div>

        {/* Sites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSites.map((site) => {
          const TypeIcon = typeIcons[site.type];
          return (
            <Card
              key={site.id}
              hover
              onClick={() => navigate(`/sites/${site.id}`)}
              className="relative"
            >
              {/* Menu */}
              <button
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-dark-700 text-dark-500 hover:text-dark-300 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Menu contextuel
                }}
              >
                <MoreVertical size={18} />
              </button>

              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                  <TypeIcon size={20} className="text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-dark-100 truncate">
                    {site.name}
                  </h3>
                  <p className="text-sm text-dark-500">{typeLabels[site.type]}</p>
                </div>
              </div>

              {/* Location */}
              <p className="text-sm text-dark-400 mb-4">
                {site.address}, {site.city}
              </p>

              {/* Stats */}
              {site.stats && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 bg-dark-800 rounded-lg">
                    <div className="text-lg font-semibold text-dark-100">
                      {site.stats.totalDevices}
                    </div>
                    <div className="text-xs text-dark-500">Devices</div>
                  </div>
                  <div className="text-center p-2 bg-dark-800 rounded-lg">
                    <div className="text-lg font-semibold text-dark-100">
                      {site.stats.sipAccounts}
                    </div>
                    <div className="text-xs text-dark-500">SIP</div>
                  </div>
                  <div className="text-center p-2 bg-dark-800 rounded-lg">
                    <div className="text-lg font-semibold text-success-500">
                      {site.stats.onlineDevices}
                    </div>
                    <div className="text-xs text-dark-500">Online</div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-dark-700">
                <StatusBadge
                  status={site.status}
                  labels={{
                    online: 'En ligne',
                    partial: 'Partiel',
                    offline: 'Hors ligne',
                  }}
                />
                {site.gatewayId ? (
                  <span className="text-xs text-dark-500">
                    Gateway connectée
                  </span>
                ) : (
                  <span className="text-xs text-warning-500">
                    Pas de gateway
                  </span>
                )}
              </div>
            </Card>
          );
        })}
        </div>

        {/* Empty state */}
        {filteredSites.length === 0 && (
          <div className="text-center py-12">
            <Building2 size={48} className="mx-auto text-dark-600 mb-4" />
            <h3 className="text-lg font-medium text-dark-300">Aucun site trouvé</h3>
            <p className="text-dark-500 mt-1">
              {searchQuery || filterType !== 'all'
                ? 'Essayez de modifier vos filtres'
                : 'Commencez par créer votre premier site'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
