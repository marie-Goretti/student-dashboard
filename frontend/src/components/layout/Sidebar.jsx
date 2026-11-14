import { useState, useEffect } from 'react';
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
  Menu,
  X,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Ferme le drawer à chaque changement de route
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Bloque le scroll du body quand le drawer est ouvert sur mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const navItems = [
    { to: '/import',          icon: Upload,      label: 'Import',           title: 'Import de données' },
    { to: '/',   end: true,   icon: LayoutGrid,  label: 'Tableau de bord',  title: 'Tableau de bord' },
    { to: '/niveaux',         icon: Layers,      label: 'Niveaux',          title: 'Niveaux' },
    { to: '/modules',         icon: BookOpen,    label: 'Modules',          title: 'Modules' },
    { to: '/students',        icon: Users,       label: 'Étudiants',        title: 'Étudiants' },
    { to: '/rattrapages',     icon: RotateCw,    label: 'Rattrapages',      title: 'Rattrapages' },
    { to: '/recommandations', icon: Lightbulb,   label: 'Recommandations',  title: 'Recommandations décisionnelles' },
  ];

  const NavContent = () => (
    <>
      {/* Logo */}
      <div>
        <NavLink
          to="/"
          title="LBS Perform"
          className="flex items-center px-2 mb-8 group"
        >
          <img
            src="/lbs-perform-logo.png"
            alt="LBS Perform"
            className="h-11 w-auto object-contain"
          />
        </NavLink>

        {/* Navigation */}
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
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
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

      {/* Bas */}
      <div className="flex flex-col gap-0.5 pt-4 border-t border-gray-100">
        <NavLink
          to="/settings"
          title="Paramètres"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
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
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-maroon-500 hover:bg-maroon-50 transition-all cursor-pointer w-full text-left"
        >
          <LogOut size={16} className="shrink-0" />
          <span className="truncate">Déconnexion</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Bouton hamburger mobile (visible uniquement < md) ── */}
      <button
        onClick={() => setOpen(true)}
        className="print:hidden md:hidden fixed top-3.5 left-4 z-50 p-2 rounded-lg bg-white border border-gray-100 text-ink shadow-sm"
        aria-label="Ouvrir le menu"
      >
        <Menu size={20} />
      </button>

      {/* ── Overlay sombre mobile ── */}
      {open && (
        <div
          className="print:hidden md:hidden fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Drawer mobile (slide-in depuis la gauche) ── */}
      <aside
        className={`print:hidden md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100
                    flex flex-col justify-between py-6 px-3 select-none
                    transition-transform duration-300 ease-in-out
                    ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Bouton fermeture */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-ink/40 hover:text-ink hover:bg-gray-50 transition"
          aria-label="Fermer le menu"
        >
          <X size={18} />
        </button>

        <NavContent />
      </aside>

      {/* ── Sidebar fixe desktop (visible uniquement ≥ md) ── */}
      <aside className="print:hidden hidden md:flex w-56 bg-white border-r border-gray-100 h-screen flex-col justify-between py-6 px-3 fixed left-0 top-0 z-40 select-none">
        <NavContent />
      </aside>
    </>
  );
}
