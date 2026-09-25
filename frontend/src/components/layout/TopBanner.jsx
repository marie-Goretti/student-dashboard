import { Search } from 'lucide-react';

/**
 * Bannière Hero institutionnelle : nom de l'école + recherche en haut,
 * et un emplacement (children) en bas à gauche pour superposer du
 * contenu — utilisé par DashboardPage pour y placer les 4 cartes KPI.
 *
 * L'image /campus-banner.png doit être placée dans frontend/public/.
 */
export default function TopBanner({ children }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden mb-6 bg-navy-600"
      style={{
        backgroundImage: "url('/campus-banner.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center 30%',
      }}
    >
      {/* Dégradé : plus sombre en bas pour la lisibilité des cartes superposées */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-ink/10" />

      <div className="relative flex flex-col justify-between h-full min-h-[15rem] md:min-h-[17rem] px-6 md:px-8 py-6">
        {/* Ligne du haut : titre + recherche */}
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl md:text-3xl font-semibold text-white">
            Lomé Business School
          </h1>

          <div className="hidden sm:flex items-center gap-2 bg-white/95 rounded-full px-4 py-2.5 w-64 md:w-80 shadow-sm">
            <Search size={16} className="text-ink/40 shrink-0" />
            <input
              type="text"
              placeholder="Recherche..."
              className="bg-transparent text-sm w-full outline-none placeholder:text-ink/40"
            />
          </div>
        </div>

        {/* Zone basse : contenu superposé (cartes KPI) */}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}