import {
  Zap,
  Home,
  LayoutGrid,
  TrendingUp,
  Layers,
  BookOpen,
  Users,
  RotateCw,
  Bell,
  HelpCircle,
  BarChart3,
  Database,
  Settings,
  LogOut,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="w-[72px] bg-white border-r border-cream-200 h-screen flex flex-col items-center py-4 fixed left-0 top-0 z-40 select-none">
      {/* Logo EduPulse rouge bordeaux avec éclair */}
      <div className="w-10 h-10 rounded-xl bg-maroon-500 text-white flex items-center justify-center mb-6 shadow-sm shadow-maroon-500/20">
        <Zap size={20} className="fill-white" />
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 flex flex-col items-center gap-2 overflow-y-auto no-scrollbar py-1">
        {/* Accueil */}
        <NavLink
          to="/"
          end
          title="Accueil"
          className={({ isActive }) =>
            `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-navy-700 text-white shadow-sm'
                : 'text-ink/60 hover:text-ink hover:bg-cream-100'
            }`
          }
        >
          <Home size={18} />
        </NavLink>

        {/* Dashboard (actif par défaut) */}
        <NavLink
          to="/"
          title="Tableau de bord"
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-navy-600 text-white shadow-sm"
        >
          <LayoutGrid size={18} />
        </NavLink>

        {/* Analytics / Tendance */}
        <button
          title="Analyses et tendances"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-ink/50 hover:text-ink hover:bg-cream-100 transition-all"
        >
          <TrendingUp size={18} />
        </button>

        {/* Filières / Programmes */}
        <button
          title="Programmes"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-ink/50 hover:text-ink hover:bg-cream-100 transition-all"
        >
          <Layers size={18} />
        </button>

        {/* Modules / Cours */}
        <button
          title="Modules & Matières"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-ink/50 hover:text-ink hover:bg-cream-100 transition-all"
        >
          <BookOpen size={18} />
        </button>

        {/* Étudiants */}
        <NavLink
          to="/students"
          title="Fiches Étudiants"
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

        {/* Sync / Rattrapage */}
        <button
          title="Synchronisation"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-ink/50 hover:text-ink hover:bg-cream-100 transition-all"
        >
          <RotateCw size={18} />
        </button>

        {/* Notifications */}
        <button
          title="Notifications"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-ink/50 hover:text-ink hover:bg-cream-100 transition-all"
        >
          <Bell size={18} />
        </button>

        {/* Aide */}
        <button
          title="Support & Aide"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-ink/50 hover:text-ink hover:bg-cream-100 transition-all"
        >
          <HelpCircle size={18} />
        </button>

        {/* Rapports graphiques */}
        <button
          title="Rapports"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-ink/50 hover:text-ink hover:bg-cream-100 transition-all"
        >
          <BarChart3 size={18} />
        </button>

        {/* Import & Données */}
        <NavLink
          to="/import"
          title="Base de données & Import"
          className={({ isActive }) =>
            `w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-navy-600 text-white shadow-sm'
                : 'text-ink/50 hover:text-ink hover:bg-cream-100'
            }`
          }
        >
          <Database size={18} />
        </NavLink>
      </nav>

      {/* Bas de sidebar : Réglages & Déconnexion */}
      <div className="flex flex-col items-center gap-2 pt-2 border-t border-cream-200">
        <button
          title="Paramètres"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-ink/50 hover:text-ink hover:bg-cream-100 transition-all"
        >
          <Settings size={18} />
        </button>
        <button
          onClick={logout}
          title="Déconnexion"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-maroon-500 hover:bg-maroon-50 transition-all"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}