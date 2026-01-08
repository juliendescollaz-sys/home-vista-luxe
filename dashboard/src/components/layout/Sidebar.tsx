import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/sites', icon: Building2, label: 'Sites' },
  { path: '/monitoring', icon: Activity, label: 'Monitoring' },
  { path: '/settings', icon: Settings, label: 'Paramètres' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-dark-900 border-r border-dark-700 transition-all duration-300 z-50 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-dark-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-semibold text-dark-100">Neolia Admin</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-dark-200 transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                  : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <item.icon size={20} />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-dark-700">
          <div className="text-xs text-dark-500">
            <p>Neolia Dashboard v1.0</p>
          </div>
        </div>
      )}
    </aside>
  );
}
