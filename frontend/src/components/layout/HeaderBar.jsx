import { Search, Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function HeaderBar({ currentAnnee = '2024-2025' }) {
  const { user } = useAuth() || {};

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      {/* Titre & sous-titre */}
      <div>
        <h1 className="text-2xl md:text-[26px] font-bold text-ink tracking-tight font-sans">
          Tableau de bord académique
        </h1>
        <p className="text-xs md:text-sm text-ink/50 mt-0.5">
          Année académique {currentAnnee}
        </p>
      </div>

      {/* Barre d'outils droite : Recherche, Notification, Profil */}
      <div className="flex items-center gap-3">
        {/* Champ de recherche */}
        <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 border border-cream-200 shadow-xs w-60 md:w-72">
          <Search size={16} className="text-ink/40 shrink-0" />
          <input
            type="text"
            placeholder="Rechercher dans EduPulse"
            className="bg-transparent text-sm w-full outline-none placeholder:text-ink/40 text-ink"
          />
        </div>

        {/* Cloche notification avec badge */}
        <button
          className="relative w-10 h-10 rounded-full bg-white border border-cream-200 flex items-center justify-center text-ink/70 hover:bg-cream-100 transition shadow-xs"
          title="Notifications"
        >
          <Bell size={18} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-maroon-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
            3
          </span>
        </button>

        {/* Avatar Administrateur */}
        <div className="flex items-center gap-2.5 bg-white border border-cream-200 rounded-full px-3 py-1.5 shadow-xs cursor-pointer hover:bg-cream-100 transition">
          <div className="w-7 h-7 rounded-full bg-ink text-white font-semibold text-xs flex items-center justify-center">
            AD
          </div>
          <span className="text-xs font-semibold text-ink hidden md:inline">
            Administrateur
          </span>
          <ChevronDown size={14} className="text-ink/50" />
        </div>
      </div>
    </header>
  );
}
