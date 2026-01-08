import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '../components/layout';
import { Card, CardHeader, StatusBadge, Button } from '../components/ui';
import {
  ArrowLeft,
  Wifi,
  Phone,
  Server,
  Upload,
  Settings,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  Play,
  Square,
  Eye,
  EyeOff,
  Send,
  Building2,
  Home,
} from 'lucide-react';
import type { Device, SipAccount, Gateway } from '../types';

// Mock data
const siteData = {
  id: '1',
  name: 'Villa Descollaz',
  type: 'villa' as const,
  address: '45 Chemin des Vignes',
  city: 'Geneve',
  country: 'Suisse',
  status: 'online' as const,
};

const devices: Device[] = [
  {
    id: '1',
    siteId: '1',
    name: 'Panel Entree',
    type: 'panel',
    model: 'Panel interieur 7"',
    ip: '192.168.1.23',
    status: 'online',
    firmware: '2.4.1',
    lastSeen: 'Il y a 2 min',
  },
  {
    id: '2',
    siteId: '1',
    name: 'Interphone Portail',
    type: 'intercom',
    model: 'Visiophone',
    ip: '192.168.1.50',
    status: 'online',
    firmware: '1.8.2',
    lastSeen: 'Il y a 5 min',
  },
  {
    id: '3',
    siteId: '1',
    name: 'Interphone Garage',
    type: 'intercom',
    model: 'Interphone audio',
    ip: '192.168.1.51',
    status: 'offline',
    lastSeen: 'Il y a 2 heures',
  },
];

const gateway: Gateway = {
  id: 'gw1',
  siteId: '1',
  name: 'Gateway locale',
  type: 'gateway',
  ip: '192.168.1.115',
  status: 'online',
  lastSeen: 'Il y a 1 min',
  services: [
    { name: 'Proxy SIP', status: 'running', port: 5060 },
    { name: 'Serveur Media', status: 'running', port: 8889 },
    { name: 'Relais RTSP', status: 'running', port: 8554 },
  ],
  system: {
    uptime: '5d 12:34',
    cpuUsage: 23,
    memoryUsage: 45,
    diskUsage: 34,
    temperature: 52,
  },
};

const sipAccounts: SipAccount[] = [
  {
    id: '1',
    siteId: '1',
    serverId: 's1',
    extension: '101',
    username: 'villa_entree',
    password: 'secure123',
    displayName: 'Entree',
    deviceId: '1',
    enabled: true,
  },
  {
    id: '2',
    siteId: '1',
    serverId: 's1',
    extension: '102',
    username: 'villa_portail',
    password: 'secure456',
    displayName: 'Portail',
    deviceId: '2',
    enabled: true,
  },
  {
    id: '3',
    siteId: '1',
    serverId: 's1',
    extension: '103',
    username: 'villa_garage',
    password: 'secure789',
    displayName: 'Garage',
    deviceId: '3',
    enabled: true,
  },
  {
    id: '4',
    siteId: '1',
    serverId: 's1',
    extension: '200',
    username: 'villa_mobile',
    password: 'mobilepwd',
    displayName: 'App Mobile',
    enabled: true,
  },
];

type TabType = 'devices' | 'sip' | 'gateway' | 'deploy';

const deviceTypeConfig = {
  panel: { label: 'Panel', color: 'text-primary-400', bg: 'bg-primary-500/10' },
  intercom: { label: 'Intercom', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  gateway: { label: 'Gateway', color: 'text-green-400', bg: 'bg-green-500/10' },
};

export function SitePage() {
  const { siteId: _siteId } = useParams();
  // TODO: Charger les donnees du site via API avec _siteId
  const [activeTab, setActiveTab] = useState<TabType>('devices');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const tabs = [
    { id: 'devices' as const, label: 'Appareils', icon: Wifi, count: devices.length },
    { id: 'sip' as const, label: 'Comptes SIP', icon: Phone, count: sipAccounts.length },
    { id: 'gateway' as const, label: 'Gateway', icon: Server },
    { id: 'deploy' as const, label: 'Deploiement', icon: Upload },
  ];

  const togglePassword = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      <Header
        title={siteData.name}
        subtitle={`${siteData.address}, ${siteData.city}`}
      />

      <div className="p-6">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-dark-400 hover:text-dark-200 mb-6"
        >
          <ArrowLeft size={18} />
          Retour au tableau de bord
        </Link>

        {/* Site Header Card */}
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-dark-700 rounded-xl">
                {siteData.type === 'villa' ? (
                  <Home size={24} className="text-green-400" />
                ) : (
                  <Building2 size={24} className="text-primary-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-dark-100">
                    {siteData.name}
                  </h2>
                  <StatusBadge status={siteData.status} />
                </div>
                <p className="text-dark-400">
                  {siteData.address}, {siteData.city}, {siteData.country}
                </p>
              </div>
            </div>
            <Button variant="secondary" icon={<Settings size={16} />}>
              Parametres du site
            </Button>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 bg-dark-900 p-1 rounded-xl mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-dark-700 text-dark-100'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                    activeTab === tab.id
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'bg-dark-700 text-dark-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'devices' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-dark-100">
                Devices ({devices.length})
              </h3>
              <Button icon={<Plus size={16} />}>Ajouter un appareil</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {devices.map((device) => {
                const config = deviceTypeConfig[device.type];
                return (
                  <Card key={device.id} hover>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.bg}`}>
                          <Wifi size={20} className={config.color} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-dark-100">
                            {device.name}
                          </h4>
                          <p className="text-sm text-dark-400">
                            {device.model || config.label}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={device.status} size="sm" />
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-dark-400">Adresse IP</span>
                        <code className="text-dark-200">{device.ip}</code>
                      </div>
                      {device.firmware && (
                        <div className="flex justify-between">
                          <span className="text-dark-400">Firmware</span>
                          <span className="text-dark-200">{device.firmware}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-dark-400">Vu pour la derniere fois</span>
                        <span className="text-dark-200">{device.lastSeen}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4 pt-4 border-t border-dark-700">
                      <Button size="sm" variant="secondary" icon={<Edit size={14} />}>
                        Configurer
                      </Button>
                      <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />}>
                        Actualiser
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'sip' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-dark-100">
                SIP Accounts ({sipAccounts.length})
              </h3>
              <div className="flex gap-2">
                <Button variant="secondary" icon={<Send size={16} />}>
                  Envoyer a la Gateway
                </Button>
                <Button icon={<Plus size={16} />}>Ajouter un compte</Button>
              </div>
            </div>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">
                        Extension
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">
                        Nom affiche
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">
                        Utilisateur
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">
                        Mot de passe
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">
                        Appareil
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">
                        Statut
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-dark-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sipAccounts.map((account) => {
                      const linkedDevice = devices.find(
                        (d) => d.id === account.deviceId
                      );
                      return (
                        <tr
                          key={account.id}
                          className="border-b border-dark-800 hover:bg-dark-800/50"
                        >
                          <td className="py-3 px-4">
                            <span className="font-mono font-medium text-dark-100">
                              {account.extension}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-dark-200">
                            {account.displayName}
                          </td>
                          <td className="py-3 px-4">
                            <code className="text-sm text-dark-300">
                              {account.username}
                            </code>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <code className="text-sm text-dark-300">
                                {showPasswords[account.id]
                                  ? account.password
                                  : '••••••••'}
                              </code>
                              <button
                                onClick={() => togglePassword(account.id)}
                                className="text-dark-500 hover:text-dark-300"
                              >
                                {showPasswords[account.id] ? (
                                  <EyeOff size={14} />
                                ) : (
                                  <Eye size={14} />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {linkedDevice ? (
                              <span className="text-sm text-dark-200">
                                {linkedDevice.name}
                              </span>
                            ) : (
                              <span className="text-sm text-dark-500">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                account.enabled
                                  ? 'bg-green-500/10 text-green-400'
                                  : 'bg-dark-700 text-dark-400'
                              }`}
                            >
                              {account.enabled ? 'Active' : 'Desactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-dark-200">
                                <Edit size={14} />
                              </button>
                              <button className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-red-400">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'gateway' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gateway Info */}
            <Card className="lg:col-span-2">
              <CardHeader
                title="Gateway locale"
                subtitle={gateway.ip}
                action={<StatusBadge status={gateway.status} />}
              />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-3 bg-dark-900 rounded-lg text-center">
                  <p className="text-xl font-bold text-dark-100">
                    {gateway.system?.cpuUsage}%
                  </p>
                  <p className="text-xs text-dark-400">CPU</p>
                </div>
                <div className="p-3 bg-dark-900 rounded-lg text-center">
                  <p className="text-xl font-bold text-dark-100">
                    {gateway.system?.memoryUsage}%
                  </p>
                  <p className="text-xs text-dark-400">Memoire</p>
                </div>
                <div className="p-3 bg-dark-900 rounded-lg text-center">
                  <p className="text-xl font-bold text-dark-100">
                    {gateway.system?.diskUsage}%
                  </p>
                  <p className="text-xs text-dark-400">Disque</p>
                </div>
                <div className="p-3 bg-dark-900 rounded-lg text-center">
                  <p className="text-xl font-bold text-dark-100">
                    {gateway.system?.temperature}C
                  </p>
                  <p className="text-xs text-dark-400">Temp</p>
                </div>
              </div>

              <h4 className="text-sm font-medium text-dark-400 mb-3">Services</h4>
              <div className="space-y-2">
                {gateway.services.map((service) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between p-3 bg-dark-900 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <StatusBadge status={service.status} size="sm" />
                      <span className="text-dark-200">{service.name}</span>
                      {service.port && (
                        <code className="text-xs text-dark-500">
                          :{service.port}
                        </code>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-dark-200">
                        <RefreshCw size={14} />
                      </button>
                      {service.status === 'running' ? (
                        <button className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-red-400">
                          <Square size={14} />
                        </button>
                      ) : (
                        <button className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-green-400">
                          <Play size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader title="Actions" />
              <div className="space-y-3">
                <Button variant="secondary" className="w-full justify-start" icon={<RefreshCw size={16} />}>
                  Redemarrer la Gateway
                </Button>
                <Button variant="secondary" className="w-full justify-start" icon={<Send size={16} />}>
                  Envoyer config SIP
                </Button>
                <Button variant="secondary" className="w-full justify-start" icon={<Upload size={16} />}>
                  Mettre a jour le firmware
                </Button>
                <Button variant="secondary" className="w-full justify-start" icon={<Settings size={16} />}>
                  Console SSH
                </Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'deploy' && (
          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Configuration de deploiement"
                subtitle="Envoyer des configurations aux appareils de ce site"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Deploy App */}
                <div className="p-4 bg-dark-900 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-primary-500/10 rounded-lg">
                      <Upload size={20} className="text-primary-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-dark-100">Deployer l'app</h4>
                      <p className="text-sm text-dark-400">
                        Envoyer un APK aux panels
                      </p>
                    </div>
                  </div>
                  <Button className="w-full">Selectionner un fichier APK</Button>
                </div>

                {/* Deploy SIP */}
                <div className="p-4 bg-dark-900 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Phone size={20} className="text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-dark-100">Deployer SIP</h4>
                      <p className="text-sm text-dark-400">
                        Envoyer la config SIP a la gateway
                      </p>
                    </div>
                  </div>
                  <Button className="w-full">Envoyer la configuration</Button>
                </div>

                {/* Deploy Intercom Config */}
                <div className="p-4 bg-dark-900 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Wifi size={20} className="text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-dark-100">
                        Configurer les interphones
                      </h4>
                      <p className="text-sm text-dark-400">
                        Envoyer la config aux platines
                      </p>
                    </div>
                  </div>
                  <Button className="w-full">Configurer</Button>
                </div>

                {/* Network Config */}
                <div className="p-4 bg-dark-900 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <Settings size={20} className="text-orange-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-dark-100">Reseau</h4>
                      <p className="text-sm text-dark-400">
                        Configurer les parametres IP
                      </p>
                    </div>
                  </div>
                  <Button className="w-full">Configurer</Button>
                </div>
              </div>
            </Card>

            {/* Deployment History */}
            <Card>
              <CardHeader title="Deploiements recents" />
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-dark-900 rounded-lg">
                  <div>
                    <p className="text-dark-200">App v3.3.9 deployee</p>
                    <p className="text-xs text-dark-500">
                      Panel Entree - Aujourd'hui a 14:32
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded">
                    Succes
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-dark-900 rounded-lg">
                  <div>
                    <p className="text-dark-200">Config SIP envoyee</p>
                    <p className="text-xs text-dark-500">
                      Gateway - Aujourd'hui a 12:15
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded">
                    Succes
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
