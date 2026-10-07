import {
  Zap,
  Upload,
  LayoutGrid,
  Layers,
  BookOpen,
  Users,
  RotateCw,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="w-[72px] bg-white border-r border-cream-200 h-screen flex flex-col items-center py-4 fixed left-0 top-0 z-40 select-none">
      {/* 1. Sur le haut : Le logo */}
      <NavLink
        to="/"
        title="EduPulse"
        className="w-10 h-10 rounded-xl bg-maroon-500 text-white flex items-center justify-center mb-6 shadow-sm shadow-maroon-500/20 shrink-0"
      >
        <Zap size={20} className="fill-white" />
      </NavLink>

      {/* 2. Au milieu : Import, Tableau de bord, Niveaux, Modules, Étudiants, Rattrapages, Alertes */}
      <nav className="flex-1 flex flex-col items-center gap-2.5">
        {/* Import (qui permet d'importer nos données) */}
        <NavLink
          to="/import"
          title="Import"
          className={({ isActive }) =>
            `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-navy-600 text-white shadow-sm'
                : 'text-ink/50 hover:text-ink hover:bg-cream-100'
            }`
          }
        >
          <Upload size={18} />
        </NavLink>

        {/* Le tableau de bord */}
        <NavLink
          to="/"
          end
          title="Tableau de bord"
          className={({ isActive }) =>
            `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-navy-600 text-white shadow-sm'
                : 'text-ink/50 hover:text-ink hover:bg-cream-100'
            }`
          }
        >
          <LayoutGrid size={18} />
        </NavLink>

        {/* Niveaux */}
        <NavLink
          to="/niveaux"
          title="Niveaux"
          className={({ isActive }) =>
            `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-navy-600 text-white shadow-sm'
                : 'text-ink/50 hover:text-ink hover:bg-cream-100'
            }`
          }
        >
          <Layers size={18} />
        </NavLink>

        {/* Modules */}
        <NavLink
          to="/modules"
          title="Modules"
          className={({ isActive }) =>
            `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-navy-600 text-white shadow-sm'
                : 'text-ink/50 hover:text-ink hover:bg-cream-100'
            }`
          }
        >
          <BookOpen size={18} />
        </NavLink>

        {/* Étudiants */}
        <NavLink
          to="/students"
          title="Étudiants"
          className={({ isActive }) =>
            `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-navy-600 text-white shadow-sm'
                : 'text-ink/50 hover:text-ink hover:bg-cream-100'
            }`
          }
        >
          <Users size={18} />
        </NavLink>

        {/* Rattrapages */}
        <NavLink
          to="/rattrapages"
          title="Rattrapages"
          className={({ isActive }) =>
            `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-navy-600 text-white shadow-sm'
                : 'text-ink/50 hover:text-ink hover:bg-cream-100'
            }`
          }
        >
          <RotateCw size={18} />
        </NavLink>

        {/* Alertes */}
        <NavLink
          to="/alertes"
          title="Alertes"
          className={({ isActive }) =>
            `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-navy-600 text-white shadow-sm'
                : 'text-ink/50 hover:text-ink hover:bg-cream-100'
            }`
          }
        >
          <Bell size={18} />
        </NavLink>
      </nav>

      {/* 3. Sur le bas : Paramètres & Déconnexion */}
      <div className="flex flex-col items-center gap-2 pt-2 border-t border-cream-200">
        <NavLink
          to="/settings"
          title="Paramètres"
          className={({ isActive }) =>
            `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-navy-600 text-white shadow-sm'
                : 'text-ink/50 hover:text-ink hover:bg-cream-100'
            }`
          }
        >
          <Settings size={18} />
        </NavLink>

        <button
          onClick={logout}
          title="Déconnexion"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-maroon-500 hover:bg-maroon-50 transition-all cursor-pointer"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}