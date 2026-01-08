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
    name: 'Entrance Panel',
    type: 'panel',
    model: 'Indoor Panel 7"',
    ip: '192.168.1.23',
    status: 'online',
    firmware: '2.4.1',
    lastSeen: '2 min ago',
  },
  {
    id: '2',
    siteId: '1',
    name: 'Gate Intercom',
    type: 'intercom',
    model: 'Video Doorphone',
    ip: '192.168.1.50',
    status: 'online',
    firmware: '1.8.2',
    lastSeen: '5 min ago',
  },
  {
    id: '3',
    siteId: '1',
    name: 'Garage Intercom',
    type: 'intercom',
    model: 'Audio Doorphone',
    ip: '192.168.1.51',
    status: 'offline',
    lastSeen: '2 hours ago',
  },
];

const gateway: Gateway = {
  id: 'gw1',
  siteId: '1',
  name: 'Local Gateway',
  type: 'gateway',
  ip: '192.168.1.115',
  status: 'online',
  lastSeen: '1 min ago',
  services: [
    { name: 'SIP Proxy', status: 'running', port: 5060 },
    { name: 'Media Server', status: 'running', port: 8889 },
    { name: 'RTSP Relay', status: 'running', port: 8554 },
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
    username: 'villa_entrance',
    password: 'secure123',
    displayName: 'Entrance',
    deviceId: '1',
    enabled: true,
  },
  {
    id: '2',
    siteId: '1',
    serverId: 's1',
    extension: '102',
    username: 'villa_gate',
    password: 'secure456',
    displayName: 'Gate',
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
    displayName: 'Mobile App',
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
    { id: 'devices' as const, label: 'Devices', icon: Wifi, count: devices.length },
    { id: 'sip' as const, label: 'SIP Accounts', icon: Phone, count: sipAccounts.length },
    { id: 'gateway' as const, label: 'Gateway', icon: Server },
    { id: 'deploy' as const, label: 'Deploy', icon: Upload },
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
          Back to Dashboard
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
              Site Settings
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
              <Button icon={<Plus size={16} />}>Add Device</Button>
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
                        <span className="text-dark-400">IP Address</span>
                        <code className="text-dark-200">{device.ip}</code>
                      </div>
                      {device.firmware && (
                        <div className="flex justify-between">
                          <span className="text-dark-400">Firmware</span>
                          <span className="text-dark-200">{device.firmware}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-dark-400">Last seen</span>
                        <span className="text-dark-200">{device.lastSeen}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4 pt-4 border-t border-dark-700">
                      <Button size="sm" variant="secondary" icon={<Edit size={14} />}>
                        Configure
                      </Button>
                      <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />}>
                        Refresh
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
                  Push to Gateway
                </Button>
                <Button icon={<Plus size={16} />}>Add Account</Button>
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
                        Display Name
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">
                        Username
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">
                        Password
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">
                        Device
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">
                        Status
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
                              {account.enabled ? 'Enabled' : 'Disabled'}
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
                title="Local Gateway"
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
                  <p className="text-xs text-dark-400">Memory</p>
                </div>
                <div className="p-3 bg-dark-900 rounded-lg text-center">
                  <p className="text-xl font-bold text-dark-100">
                    {gateway.system?.diskUsage}%
                  </p>
                  <p className="text-xs text-dark-400">Disk</p>
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
                  Reboot Gateway
                </Button>
                <Button variant="secondary" className="w-full justify-start" icon={<Send size={16} />}>
                  Push SIP Config
                </Button>
                <Button variant="secondary" className="w-full justify-start" icon={<Upload size={16} />}>
                  Update Firmware
                </Button>
                <Button variant="secondary" className="w-full justify-start" icon={<Settings size={16} />}>
                  SSH Console
                </Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'deploy' && (
          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Deploy Configuration"
                subtitle="Push configurations to devices on this site"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Deploy App */}
                <div className="p-4 bg-dark-900 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-primary-500/10 rounded-lg">
                      <Upload size={20} className="text-primary-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-dark-100">Deploy App</h4>
                      <p className="text-sm text-dark-400">
                        Upload APK to panels
                      </p>
                    </div>
                  </div>
                  <Button className="w-full">Select APK File</Button>
                </div>

                {/* Deploy SIP */}
                <div className="p-4 bg-dark-900 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Phone size={20} className="text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-dark-100">Deploy SIP</h4>
                      <p className="text-sm text-dark-400">
                        Push SIP config to gateway
                      </p>
                    </div>
                  </div>
                  <Button className="w-full">Push Configuration</Button>
                </div>

                {/* Deploy Intercom Config */}
                <div className="p-4 bg-dark-900 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Wifi size={20} className="text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-dark-100">
                        Configure Intercoms
                      </h4>
                      <p className="text-sm text-dark-400">
                        Push config to door stations
                      </p>
                    </div>
                  </div>
                  <Button className="w-full">Configure</Button>
                </div>

                {/* Network Config */}
                <div className="p-4 bg-dark-900 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <Settings size={20} className="text-orange-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-dark-100">Network</h4>
                      <p className="text-sm text-dark-400">
                        Configure IP settings
                      </p>
                    </div>
                  </div>
                  <Button className="w-full">Configure</Button>
                </div>
              </div>
            </Card>

            {/* Deployment History */}
            <Card>
              <CardHeader title="Recent Deployments" />
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-dark-900 rounded-lg">
                  <div>
                    <p className="text-dark-200">App v3.3.9 deployed</p>
                    <p className="text-xs text-dark-500">
                      Entrance Panel - Today at 14:32
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded">
                    Success
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-dark-900 rounded-lg">
                  <div>
                    <p className="text-dark-200">SIP config pushed</p>
                    <p className="text-xs text-dark-500">
                      Gateway - Today at 12:15
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded">
                    Success
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
