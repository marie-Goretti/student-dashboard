import { LayoutDashboard, Upload, LogOut, UserSearch, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/students', icon: UserSearch, label: 'Fiche Étudiant' },
  { to: '/import', icon: Upload, label: 'Import Excel' },
];

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="w-20 bg-white border-r border-cream-200 h-screen flex flex-col items-center py-5 fixed left-0 top-0">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-cream-200 mb-8 shrink-0" />

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-3">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) =>
              `w-11 h-11 rounded-full flex items-center justify-center transition ${
                isActive
                  ? 'bg-navy-500 text-white shadow-sm'
                  : 'bg-cream-100 text-navy-600 hover:bg-cream-200'
              }`
            }
          >
            <Icon size={18} strokeWidth={2} />
          </NavLink>
        ))}
      </nav>

      {/* Bas de sidebar : déconnexion + réglages */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={logout}
          title="Déconnexion"
          className="w-11 h-11 rounded-full flex items-center justify-center bg-cream-100 text-maroon-500 hover:bg-maroon-50 transition"
        >
          <LogOut size={18} />
        </button>
        <button
          title="Réglages"
          className="w-11 h-11 rounded-full flex items-center justify-center bg-cream-100 text-navy-600 hover:bg-cream-200 transition"
        >
          <Settings size={18} />
        </button>
      </div>
    </aside>
  );
}