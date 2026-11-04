import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 5,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'modules',
  pageSizeOptions = [5, 10, 20],
}) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  if (totalItems <= 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Génération intelligente des numéros de pages avec ellipses
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 mt-4 border-t border-cream-200/80 text-xs">
      {/* Texte informatif */}
      <div className="flex items-center gap-3 text-ink/60">
        <span>
          Affichage de <span className="font-semibold text-ink">{startItem}</span> à{' '}
          <span className="font-semibold text-ink">{endItem}</span> sur{' '}
          <span className="font-semibold text-ink">{totalItems}</span> {itemLabel}
        </span>

        {/* Sélecteur de taille de page */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-cream-200">
            <span className="text-[11px] text-ink/40">Afficher</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-cream-50 border border-cream-200 rounded-lg px-2 py-0.5 text-xs font-semibold text-ink outline-none cursor-pointer hover:bg-cream-100"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-ink/40">/ page</span>
          </div>
        )}
      </div>

      {/* Boutons de pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1 self-center sm:self-auto">
          {/* Bouton Précédent */}
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl border border-cream-200 bg-white text-ink/70 hover:bg-cream-100 disabled:opacity-35 disabled:cursor-not-allowed transition font-medium cursor-pointer shadow-2xs"
            title="Page précédente"
          >
            <ChevronLeft size={14} />
            <span className="hidden sm:inline text-xs">Précédent</span>
          </button>

          {/* Numéros de page */}
          <div className="flex items-center gap-1 px-1">
            {pages.map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-ink/40 text-xs select-none">
                    …
                  </span>
                );
              }

              const isActive = p === currentPage;
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center ${
                    isActive
                      ? 'bg-navy-800 text-white shadow-xs'
                      : 'bg-white hover:bg-cream-100 text-ink/70 border border-cream-200'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Bouton Suivant */}
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl border border-cream-200 bg-white text-ink/70 hover:bg-cream-100 disabled:opacity-35 disabled:cursor-not-allowed transition font-medium cursor-pointer shadow-2xs"
            title="Page suivante"
          >
            <span className="hidden sm:inline text-xs">Suivant</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
