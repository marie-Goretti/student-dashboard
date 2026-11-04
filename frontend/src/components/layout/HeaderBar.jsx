import { Search, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationsDropdown from './NotificationsDropdown';

export default function HeaderBar({
  title = 'Tableau de bord académique',
  subtitle,
}) {
  const { user } = useAuth() || {};

  // Ne pas afficher de sous-titre par défaut, et ne jamais injecter "Année académique ..."
  const activeSubtitle = subtitle || '';

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
      {/* Titre & sous-titre */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight font-sans">
          {title}
        </h1>
        {activeSubtitle && (
          <p className="text-xs text-ink/50 mt-0.5">
            {activeSubtitle}
          </p>
        )}
      </div>

      {/* Barre d'outils droite : Recherche, Notification, Profil */}
      <div className="flex items-center gap-3">
        {/* Champ de recherche */}
        <div className="flex items-center gap-2 bg-white rounded-full px-4 py-1.5 border border-cream-200 shadow-xs w-60 md:w-72">
          <Search size={15} className="text-ink/40 shrink-0" />
          <input
            type="text"
            placeholder="Rechercher dans EduPulse"
            className="bg-transparent text-xs w-full outline-none placeholder:text-ink/40 text-ink"
          />
        </div>

        {/* Menu déroulant des notifications interactives */}
        <NotificationsDropdown />

        {/* Avatar Administrateur */}
        <div className="flex items-center gap-2 bg-white border border-cream-200 rounded-full px-3 py-1 shadow-xs cursor-pointer hover:bg-cream-100 transition">
          <div className="w-6 h-6 rounded-full bg-ink text-white font-semibold text-[11px] flex items-center justify-center">
            AD
          </div>
          <span className="text-xs font-semibold text-ink hidden md:inline">
            Administrateur
          </span>
          <ChevronDown size={13} className="text-ink/50" />
        </div>
      </div>
    </header>
  );
}
