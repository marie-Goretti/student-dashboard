import { ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PointsClesCard({ points }) {
  const navigate = useNavigate();

  const defaultItems = [
    {
      id: '01',
      titre: 'Niveaux sous la moyenne',
      description: '3 niveaux nécessitent une attention particulière.',
      badgeType: 'alert',
    },
    {
      id: '02',
      titre: 'Modules à forte dispersion',
      description: 'Des écarts importants sont détectés sur 8 modules.',
      badgeType: 'neutral',
    },
    {
      id: '03',
      titre: 'Étudiants à accompagner',
      description: '124 étudiants cumulent plusieurs facteurs de risque.',
      badgeType: 'neutral',
    },
  ];

  const items = points && points.length ? points : defaultItems;

  const handleVoirPlus = () => {
    navigate('/recommandations');
  };

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-xs p-4 flex flex-col justify-between h-[260px]">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-1.5">
        <div>
          <h3 className="font-bold text-ink text-sm tracking-tight">
            Points clés détectés
          </h3>
          <p className="text-xs text-ink/40 mt-0.5">
            Priorités recommandées
          </p>
        </div>
        <button
          onClick={handleVoirPlus}
          className="text-[11px] font-semibold text-white bg-ink hover:bg-navy-800 px-2.5 py-1 rounded-full transition shadow-xs cursor-pointer"
        >
          Voir tout
        </button>
      </div>

      {/* Liste des 3 conseils */}
      <div className="space-y-2 flex-1 flex flex-col justify-around py-0.5">
        {items.slice(0, 3).map((item, index) => {
          const isAlert = item.badgeType === 'alert' || item.isAlert;

          return (
            <div
              key={item.id || index}
              onClick={() => navigate('/recommandations')}
              className={`flex items-center justify-between gap-2.5 p-2 rounded-xl border transition cursor-pointer group ${
                isAlert
                  ? 'border-red-100 bg-red-50/20 hover:bg-red-50/40'
                  : 'border-cream-200/80 bg-cream-50/40 hover:bg-cream-100/60'
              }`}
            >
              {/* Badge numéro rond */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 shadow-xs ${
                  isAlert
                    ? 'bg-maroon-500 text-white'
                    : 'bg-white border border-cream-200 text-ink/80'
                }`}
              >
                {item.id || `0${index + 1}`}
              </div>

              {/* Contenu textuel */}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-ink group-hover:text-navy-600 transition truncate">
                  {item.titre}
                </h4>
                <p className="text-[10.5px] text-ink/55 leading-tight truncate">
                  {item.description}
                </p>
              </div>

              {/* Flèche droite ↗ */}
              <ArrowUpRight
                size={14}
                className="text-ink/30 group-hover:text-ink transition shrink-0"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
