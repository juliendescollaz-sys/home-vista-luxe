import { Bell, Search, User } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-16 bg-dark-900/50 backdrop-blur-sm border-b border-dark-700 flex items-center justify-between px-6">
      <div>
        <h1 className="text-xl font-semibold text-dark-100">{title}</h1>
        {subtitle && <p className="text-sm text-dark-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500"
          />
          <input
            type="text"
            placeholder="Rechercher..."
            className="input pl-10 w-64"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-dark-200 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full"></span>
        </button>

        {/* User */}
        <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-800 transition-colors">
          <div className="w-8 h-8 bg-dark-700 rounded-full flex items-center justify-center">
            <User size={18} className="text-dark-400" />
          </div>
        </button>
      </div>
    </header>
  );
}
