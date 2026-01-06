import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';

interface LogEntry {
  timestamp: number;
  type: 'log' | 'warn' | 'error';
  message: string;
}

// Store global pour persister les logs entre les écrans
// Ceci évite de perdre les logs quand le composant est démonté/remonté
const globalLogs: LogEntry[] = [];
let logsListeners: ((logs: LogEntry[]) => void)[] = [];
let isInterceptorInstalled = false;

function addGlobalLog(type: 'log' | 'warn' | 'error', message: string) {
  const entry = { timestamp: Date.now(), type, message };
  globalLogs.push(entry);
  // Garder max 200 logs
  if (globalLogs.length > 200) {
    globalLogs.shift();
  }
  // Notifier tous les listeners
  logsListeners.forEach(listener => listener([...globalLogs]));
}

function clearGlobalLogs() {
  globalLogs.length = 0;
  logsListeners.forEach(listener => listener([]));
}

// Installer l'intercepteur une seule fois au niveau global
if (!isInterceptorInstalled && typeof window !== 'undefined') {
  isInterceptorInstalled = true;
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args: any[]) => {
    originalLog(...args);
    addGlobalLog('log', args.map(a => String(a)).join(' '));
  };

  console.warn = (...args: any[]) => {
    originalWarn(...args);
    addGlobalLog('warn', args.map(a => String(a)).join(' '));
  };

  console.error = (...args: any[]) => {
    originalError(...args);
    addGlobalLog('error', args.map(a => String(a)).join(' '));
  };
}

export function DebugConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([...globalLogs]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // S'abonner aux updates des logs
    const listener = (newLogs: LogEntry[]) => setLogs(newLogs);
    logsListeners.push(listener);

    // Sync initial
    setLogs([...globalLogs]);

    return () => {
      logsListeners = logsListeners.filter(l => l !== listener);
    };
  }, []);

  useEffect(() => {
    // Auto-scroll vers le bas
    if (logsEndRef.current && isExpanded) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isExpanded]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-black/95 text-white text-xs font-mono border-t border-white/20">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/10">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Debug Console</span>
          <span className="text-white/50">({logs.length} logs)</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-white hover:bg-white/20"
            onClick={() => clearGlobalLogs()}
          >
            Clear
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-white hover:bg-white/20"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-white hover:bg-white/20"
            onClick={() => setIsVisible(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Logs */}
      {isExpanded && (
        <div className="max-h-64 overflow-y-auto px-3 py-2 space-y-1">
          {logs.length === 0 && (
            <div className="text-white/50 italic">No logs yet...</div>
          )}
          {logs.map((log, index) => (
            <div
              key={index}
              className={`${
                log.type === 'error'
                  ? 'text-red-400'
                  : log.type === 'warn'
                  ? 'text-yellow-400'
                  : 'text-white/80'
              } leading-tight`}
            >
              <span className="text-white/40">
                {new Date(log.timestamp).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>{' '}
              {log.message}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
}

// Hook pour réafficher la console si elle a été fermée
export function useDebugConsole() {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl + Shift + D pour toggle la console
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        const event = new CustomEvent('toggle-debug-console');
        window.dispatchEvent(event);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
}
