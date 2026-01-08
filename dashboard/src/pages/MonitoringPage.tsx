import { Header } from '../components/layout';
import { Card, CardHeader, StatusBadge } from '../components/ui';
import { Activity, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

// Mock data
const logs = [
  {
    id: '1',
    timestamp: '2024-01-15 14:32:45',
    level: 'success' as const,
    device: 'Panel Entree',
    message: 'APK envoye avec succes : app-debug.apk (140.77 Mo)',
  },
  {
    id: '2',
    timestamp: '2024-01-15 14:28:12',
    level: 'success' as const,
    device: 'Panel Entree',
    message: 'APK envoye avec succes : app-prd-release(3.3.9).apk (46.82 Mo)',
  },
  {
    id: '3',
    timestamp: '2024-01-15 12:15:00',
    level: 'warning' as const,
    device: 'Gateway SIP',
    message: 'Service MediaMTX redemarrer automatiquement',
  },
  {
    id: '4',
    timestamp: '2024-01-15 10:00:00',
    level: 'info' as const,
    device: 'Systeme',
    message: 'Verification de sante quotidienne terminee',
  },
  {
    id: '5',
    timestamp: '2024-01-14 23:45:00',
    level: 'error' as const,
    device: 'Interphone Hall',
    message: 'Connexion perdue - appareil hors ligne',
  },
];

const levelConfig = {
  success: {
    icon: CheckCircle,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
  },
  error: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
  info: { icon: Activity, color: 'text-primary-400', bg: 'bg-primary-500/10' },
};

export function MonitoringPage() {
  return (
    <div>
      <Header title="Monitoring" subtitle="Journaux systeme et activite" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-dark-100">24</p>
                <p className="text-xs text-dark-400">Operations reussies</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <AlertTriangle size={20} className="text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-dark-100">3</p>
                <p className="text-xs text-dark-400">Avertissements</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-dark-100">1</p>
                <p className="text-xs text-dark-400">Erreurs</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/10 rounded-lg">
                <Clock size={20} className="text-primary-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-dark-100">5d 12h</p>
                <p className="text-xs text-dark-400">Disponibilite</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Activity Log */}
        <Card>
          <CardHeader title="Journal d'activite" subtitle="Evenements systeme recents" />

          <div className="space-y-3">
            {logs.map((log) => {
              const config = levelConfig[log.level];
              const Icon = config.icon;

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 bg-dark-900 rounded-lg"
                >
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Icon size={18} className={config.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-dark-100">
                        {log.device}
                      </span>
                      <span className="text-xs text-dark-500">
                        {log.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-dark-300">{log.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Device Status */}
        <Card>
          <CardHeader title="Etat des appareils" subtitle="Statut actuel de tous les appareils" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-dark-900 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-dark-100">Panel Entree</span>
                <StatusBadge status="online" />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-400">Temps de reponse</span>
                  <span className="text-dark-200">45ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Derniere verif.</span>
                  <span className="text-dark-200">Il y a 2 min</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-dark-900 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-dark-100">Gateway SIP</span>
                <StatusBadge status="online" />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-400">Temps de reponse</span>
                  <span className="text-dark-200">12ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Derniere verif.</span>
                  <span className="text-dark-200">Il y a 2 min</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-dark-900 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-dark-100">Interphone Hall</span>
                <StatusBadge status="offline" />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-400">Temps de reponse</span>
                  <span className="text-dark-200">-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Vu pour la derniere fois</span>
                  <span className="text-red-400">Il y a 12h</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
