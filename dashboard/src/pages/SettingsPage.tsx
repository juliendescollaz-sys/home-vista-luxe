import { useState } from 'react';
import { Header } from '../components/layout';
import { Card, CardHeader, Button } from '../components/ui';
import {
  Save,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Server,
  Tablet,
  Phone,
  TestTube,
  Check,
  X,
  Key,
  Globe,
} from 'lucide-react';
import type { DeviceType } from '../types';

interface DeviceCredential {
  id: string;
  name: string;
  type: DeviceType;
  ip: string;
  username: string;
  password: string;
}

// Mock data
const initialCredentials: DeviceCredential[] = [
  {
    id: '1',
    name: 'Panel Entree',
    type: 'panel',
    ip: '192.168.1.23',
    username: 'admin',
    password: 'NexVentures+022%',
  },
  {
    id: '2',
    name: 'Gateway SIP',
    type: 'gateway',
    ip: '192.168.1.115',
    username: 'sip',
    password: 'neolia123',
  },
  {
    id: '3',
    name: 'Interphone Hall',
    type: 'intercom',
    ip: '192.168.1.50',
    username: 'admin',
    password: 'admin',
  },
];

const deviceTypes: { value: DeviceType; label: string; icon: typeof Tablet }[] = [
  { value: 'panel', label: 'Panel', icon: Tablet },
  { value: 'gateway', label: 'Gateway', icon: Server },
  { value: 'intercom', label: 'Intercom', icon: Phone },
];

export function SettingsPage() {
  const [credentials, setCredentials] = useState(initialCredentials);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | null>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState('http://localhost:8000');

  const togglePassword = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const testConnection = async (id: string) => {
    setTesting(id);
    setTestResults((prev) => ({ ...prev, [id]: null }));

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock result
    const success = Math.random() > 0.3;
    setTestResults((prev) => ({ ...prev, [id]: success ? 'success' : 'error' }));
    setTesting(null);
  };

  const addCredential = () => {
    const newCredential: DeviceCredential = {
      id: Date.now().toString(),
      name: 'Nouveau device',
      type: 'panel',
      ip: '',
      username: 'admin',
      password: '',
    };
    setCredentials([...credentials, newCredential]);
  };

  const removeCredential = (id: string) => {
    setCredentials(credentials.filter((c) => c.id !== id));
  };

  const updateCredential = (id: string, field: keyof DeviceCredential, value: string) => {
    setCredentials(
      credentials.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const getDeviceIcon = (type: DeviceType) => {
    switch (type) {
      case 'panel':
        return <Tablet size={20} className="text-primary-400" />;
      case 'gateway':
        return <Server size={20} className="text-green-400" />;
      case 'intercom':
        return <Phone size={20} className="text-purple-400" />;
    }
  };

  return (
    <div>
      <Header title="Parametres" subtitle="Configuration globale et credentials" />

      <div className="p-6 space-y-6">
        {/* API Configuration */}
        <Card>
          <CardHeader
            title="Configuration API"
            subtitle="Connexion au serveur backend"
            action={<Globe size={20} className="text-dark-500" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">URL de l'API</label>
              <input
                type="text"
                className="input w-full"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:8000"
              />
            </div>
            <div className="flex items-end">
              <Button variant="secondary" icon={<TestTube size={16} />}>
                Tester la connexion
              </Button>
            </div>
          </div>
        </Card>

        {/* Credentials */}
        <Card>
          <CardHeader
            title="Credentials"
            subtitle="Identifiants d'acces aux devices"
            action={
              <div className="flex items-center gap-2">
                <Key size={20} className="text-dark-500" />
                <Button size="sm" icon={<Plus size={16} />} onClick={addCredential}>
                  Ajouter
                </Button>
              </div>
            }
          />

          <div className="space-y-4">
            {credentials.map((credential) => (
              <div
                key={credential.id}
                className="p-4 bg-dark-900 rounded-lg space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(credential.type)}
                    <input
                      type="text"
                      className="bg-transparent border-none text-dark-100 font-medium focus:outline-none"
                      value={credential.name}
                      onChange={(e) =>
                        updateCredential(credential.id, 'name', e.target.value)
                      }
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {testResults[credential.id] === 'success' && (
                      <span className="flex items-center gap-1 text-green-400 text-sm">
                        <Check size={16} /> Connecte
                      </span>
                    )}
                    {testResults[credential.id] === 'error' && (
                      <span className="flex items-center gap-1 text-red-400 text-sm">
                        <X size={16} /> Echec
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={testing === credential.id}
                      onClick={() => testConnection(credential.id)}
                      icon={<TestTube size={14} />}
                    >
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeCredential(credential.id)}
                      icon={<Trash2 size={14} className="text-red-400" />}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="label">Type</label>
                    <select
                      className="input w-full"
                      value={credential.type}
                      onChange={(e) =>
                        updateCredential(credential.id, 'type', e.target.value as DeviceType)
                      }
                    >
                      {deviceTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Adresse IP</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={credential.ip}
                      onChange={(e) =>
                        updateCredential(credential.id, 'ip', e.target.value)
                      }
                      placeholder="192.168.1.x"
                    />
                  </div>

                  <div>
                    <label className="label">Utilisateur</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={credential.username}
                      onChange={(e) =>
                        updateCredential(credential.id, 'username', e.target.value)
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="label">Mot de passe</label>
                    <div className="relative">
                      <input
                        type={showPasswords[credential.id] ? 'text' : 'password'}
                        className="input w-full pr-10"
                        value={credential.password}
                        onChange={(e) =>
                          updateCredential(credential.id, 'password', e.target.value)
                        }
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
                        onClick={() => togglePassword(credential.id)}
                      >
                        {showPasswords[credential.id] ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {credentials.length === 0 && (
              <div className="text-center py-8 text-dark-400">
                Aucun credential configure. Cliquez sur "Ajouter" pour commencer.
              </div>
            )}
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button icon={<Save size={16} />}>Enregistrer</Button>
        </div>
      </div>
    </div>
  );
}
