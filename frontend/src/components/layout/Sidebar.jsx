import {
  Upload,
  LayoutGrid,
  Layers,
  BookOpen,
  Users,
  RotateCw,
  Lightbulb,
  Settings,
  LogOut,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { logout } = useAuth();

  const navItems = [
    {
      to: '/import',
      icon: Upload,
      label: 'Import',
      title: 'Import de données',
    },
    {
      to: '/',
      end: true,
      icon: LayoutGrid,
      label: 'Tableau de bord',
      title: 'Tableau de bord',
    },
    {
      to: '/niveaux',
      icon: Layers,
      label: 'Niveaux',
      title: 'Niveaux',
    },
    {
      to: '/modules',
      icon: BookOpen,
      label: 'Modules',
      title: 'Modules',
    },
    {
      to: '/students',
      icon: Users,
      label: 'Étudiants',
      title: 'Étudiants',
    },
    {
      to: '/rattrapages',
      icon: RotateCw,
      label: 'Rattrapages',
      title: 'Rattrapages',
    },
    {
      to: '/recommandations',
      icon: Lightbulb,
      label: 'Recommandations',
      title: 'Recommandations décisionnelles',
    },
  ];

  return (
    <aside className="print:hidden w-56 bg-white border-r border-gray-100 h-screen flex flex-col justify-between py-6 px-3 fixed left-0 top-0 z-40 select-none">
      {/* 1. Logo & Nom */}
      <div>
        <NavLink
          to="/"
          title="LBS Perform"
          className="flex items-center px-2 mb-8 group"
        >
          <img
            src="/lbs-perform-logo.png"
            alt="LBS Perform"
            className="h-8 w-auto object-contain"
          />
        </NavLink>

        {/* 2. Navigation */}
        <nav className="flex flex-col gap-0.5 overflow-y-auto max-h-[calc(100vh-200px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={item.title}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                    isActive
                      ? 'bg-navy-600 text-white'
                      : 'text-ink/50 hover:text-ink hover:bg-gray-50'
                  }`
                }
              >
                <Icon size={16} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* 3. Bas : Paramètres & Déconnexion */}
      <div className="flex flex-col gap-0.5 pt-4 border-t border-gray-100">
        <NavLink
          to="/settings"
          title="Paramètres"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
              isActive
                ? 'bg-navy-600 text-white'
                : 'text-ink/50 hover:text-ink hover:bg-gray-50'
            }`
          }
        >
          <Settings size={16} className="shrink-0" />
          <span className="truncate">Paramètres</span>
        </NavLink>

        <button
          onClick={logout}
          title="Déconnexion"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-maroon-500 hover:bg-maroon-50 transition-all cursor-pointer w-full text-left"
        >
          <LogOut size={16} className="shrink-0" />
          <span className="truncate">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
