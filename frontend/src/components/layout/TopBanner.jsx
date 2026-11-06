/**
 * Bannière Hero institutionnelle : nom de l'école en haut,
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
        {/* Ligne du haut : titre institutionnel */}
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl md:text-3xl font-semibold text-white">
            Lomé Business School
          </h1>
        </div>

        {/* Zone basse : contenu superposé (cartes KPI) */}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}
