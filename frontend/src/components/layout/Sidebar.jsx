import {
  Zap,
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
    <aside className="print:hidden w-64 bg-white border-r border-cream-200 h-screen flex flex-col justify-between p-4 fixed left-0 top-0 z-40 select-none">
      {/* 1. Sur le haut : Le logo & Nom de la plateforme */}
      <div>
        <NavLink
          to="/"
          title="EduPulse - Lomé Business School"
          className="flex items-center gap-3 px-2 mb-6 group"
        >
          <div className="w-10 h-10 rounded-xl bg-maroon-500 text-white flex items-center justify-center shadow-sm shadow-maroon-500/20 shrink-0 group-hover:scale-105 transition-transform">
            <Zap size={20} className="fill-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-ink text-base tracking-tight leading-tight">
              EduPulse
            </span>
            <span className="text-[11px] text-ink/45 font-medium truncate">
              Lomé Business School
            </span>
          </div>
        </NavLink>

        {/* 2. Au milieu : Navigation avec icône + nom de chaque page */}
        <nav className="flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={item.title}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-navy-600 text-white shadow-sm font-semibold'
                      : 'text-ink/65 hover:text-ink hover:bg-cream-100'
                  }`
                }
              >
                <Icon size={18} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* 3. Sur le bas : Paramètres & Déconnexion */}
      <div className="flex flex-col gap-1.5 pt-3 border-t border-cream-200 shrink-0">
        <NavLink
          to="/settings"
          title="Paramètres"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? 'bg-navy-600 text-white shadow-sm font-semibold'
                : 'text-ink/65 hover:text-ink hover:bg-cream-100'
            }`
          }
        >
          <Settings size={18} className="shrink-0" />
          <span className="truncate">Paramètres</span>
        </NavLink>

        <button
          onClick={logout}
          title="Déconnexion"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-maroon-600 hover:bg-maroon-50 transition-all cursor-pointer w-full text-left"
        >
          <LogOut size={18} className="shrink-0" />
          <span className="truncate">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
