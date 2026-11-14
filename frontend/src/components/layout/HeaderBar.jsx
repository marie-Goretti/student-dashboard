import { FileDown, Loader2, ChevronDown } from 'lucide-react';
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
  const activeSubtitle = subtitle || '';

  return (
    <header className="flex flex-row items-center justify-between gap-2 mb-4 print:hidden">
      {/* Titre & sous-titre — masqué sur très petit écran, le hamburger prend la place */}
      <div className="min-w-0">
        <h1 className="text-base md:text-lg font-semibold text-ink tracking-tight truncate">
          {title}
        </h1>
        {activeSubtitle && (
          <p className="text-xs text-ink/40 mt-0.5 hidden sm:block">{activeSubtitle}</p>
        )}
      </div>

      {/* Barre d'outils droite */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Export PDF — icône seule sur mobile */}
        {onExportPdf && (
          <button
            type="button"
            onClick={onExportPdf}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-ink/60 hover:text-ink hover:border-gray-300 hover:bg-white transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-white"
            title="Télécharger le tableau de bord en PDF"
          >
            {isExporting
              ? <Loader2 size={13} className="animate-spin" />
              : <FileDown size={13} />}
            <span className="hidden sm:inline">{isExporting ? 'Export…' : exportLabel}</span>
          </button>
        )}

        <NotificationsDropdown />

        {/* Avatar */}
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5 cursor-pointer hover:border-gray-300 transition">
          <div className="w-5 h-5 rounded-md bg-navy-600 text-white font-semibold text-[10px] flex items-center justify-center shrink-0">
            AD
          </div>
          <span className="text-xs font-medium text-ink/70 hidden lg:inline">Admin</span>
          <ChevronDown size={12} className="text-ink/40 hidden sm:block" />
        </div>
      </div>
    </header>
  );
}
