import { ChevronDown, FileDown, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationsDropdown from './NotificationsDropdown';

export default function HeaderBar({
  title = 'Tableau de bord académique',
  subtitle,
  onExportPdf,
  isExporting = false,
  exportLabel = 'Exporter en PDF',
}) {
  const { user } = useAuth() || {};

  // Ne pas afficher de sous-titre par défaut, et ne jamais injecter "Année académique ..."
  const activeSubtitle = subtitle || '';

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 print:hidden">
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

      {/* Barre d'outils droite : Export PDF, Notification, Profil */}
      <div className="flex items-center gap-2.5">
        {/* Bouton Exporter en PDF avec téléchargement direct */}
        {onExportPdf && (
          <button
            type="button"
            onClick={onExportPdf}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-cream-200 text-ink shadow-xs hover:bg-cream-100 hover:border-cream-300 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            title="Télécharger immédiatement le tableau de bord en PDF"
            aria-label="Télécharger immédiatement le tableau de bord en PDF"
          >
            {isExporting ? (
              <>
                <Loader2 size={14} className="animate-spin text-maroon-600" />
                <span className="hidden sm:inline">Téléchargement...</span>
              </>
            ) : (
              <>
                <FileDown size={14} className="text-maroon-600" />
                <span className="hidden sm:inline">{exportLabel}</span>
              </>
            )}
          </button>
        )}

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
