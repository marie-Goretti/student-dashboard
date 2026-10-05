import { ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PointsClesCard({ points }) {
  const navigate = useNavigate();

  // Liste par défaut si données non chargées
  const defaultItems = [
    {
      id: '01',
      titre: 'Niveaux sous la moyenne',
      description: '3 niveaux nécessitent une attention particulière.',
      isAlert: true,
    },
    {
      id: '02',
      titre: 'Modules à forte dispersion',
      description: 'Des écarts importants sont détectés sur 8 modules.',
      isAlert: false,
    },
    {
      id: '03',
      titre: 'Étudiants à accompagner',
      description: '124 étudiants cumulent plusieurs facteurs de risque.',
      isAlert: false,
    },
  ];

  const items = points && points.length ? points : defaultItems;

  const handleVoirPlus = () => {
    // Bouton prévu pour mener vers la page dédiée qu'on créera plus tard
    navigate('/performance');
  };

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-xs p-5 flex flex-col justify-between">
      {/* En-tête avec titre et bouton "Voir plus" */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-ink text-[15px] tracking-tight">
            Points clés détectés
          </h3>
          <p className="text-xs text-ink/40 mt-0.5">
            Priorités recommandées
          </p>
        </div>
        <button
          onClick={handleVoirPlus}
          title="Consulter les détails des conseils de performance"
          className="inline-flex items-center gap-1 bg-ink hover:bg-navy-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition shadow-xs cursor-pointer"
        >
          Voir plus
        </button>
      </div>

      {/* Liste des 3 conseils pour améliorer la performance */}
      <div className="space-y-3 flex-1 flex flex-col justify-around py-1">
        {items.slice(0, 3).map((item, index) => {
          const isFirst = index === 0 || item.badgeType === 'alert' || item.isAlert;
          return (
            <div
              key={item.id || index}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-cream-200/80 bg-cream-100/40 hover:bg-cream-100 transition cursor-pointer group"
            >
              {/* Badge numéro rond */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                  isFirst
                    ? 'bg-maroon-500 text-white'
                    : 'bg-white border border-cream-200 text-ink/80'
                }`}
              >
                {item.id || `0${index + 1}`}
              </div>

              {/* Contenu textuel */}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs md:text-sm font-semibold text-ink group-hover:text-navy-600 transition truncate">
                  {item.titre}
                </h4>
                <p className="text-[11px] text-ink/55 mt-0.5 line-clamp-1 leading-snug">
                  {item.description}
                </p>
              </div>

              {/* Flèche droite ↗ */}
              <ArrowUpRight
                size={16}
                className="text-ink/30 group-hover:text-ink transition shrink-0"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
