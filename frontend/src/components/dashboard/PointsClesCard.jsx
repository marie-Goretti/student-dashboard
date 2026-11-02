import { ArrowUpRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PointsClesCard({ points }) {
  const navigate = useNavigate();

  // Liste par défaut si données non encore chargées
  const defaultItems = [
    {
      id: '01',
      titre: 'Analyse des performances',
      description: 'Calcul des recommandations décisionnelles en cours...',
      badgeType: 'neutral',
      isAlert: false,
    },
  ];

  const items = points && points.length ? points : defaultItems;

  const handleVoirPlus = () => {
    navigate('/recommandations');
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
          title="Consulter les détails des recommandations pédagogiques"
          className="inline-flex items-center gap-1 bg-ink hover:bg-navy-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition shadow-xs cursor-pointer"
        >
          Voir plus
        </button>
      </div>

      {/* Liste des 3 conseils pour améliorer la performance */}
      <div className="space-y-3 flex-1 flex flex-col justify-around py-1">
        {items.slice(0, 3).map((item, index) => {
          const isAlert = item.badgeType === 'alert' || item.isAlert;
          const isWarning = item.badgeType === 'warning';
          const isPositive = item.badgeType === 'positive';

          return (
            <div
              key={item.id || index}
              onClick={() => navigate('/recommandations')}
              className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition cursor-pointer group ${
                isAlert
                  ? 'border-red-100 bg-red-50/20 hover:bg-red-50/40'
                  : isPositive
                  ? 'border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50/40'
                  : 'border-cream-200/80 bg-cream-100/40 hover:bg-cream-100'
              }`}
            >
              {/* Badge numéro rond */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                  isAlert
                    ? 'bg-maroon-500 text-white'
                    : isPositive
                    ? 'bg-emerald-600 text-white'
                    : isWarning
                    ? 'bg-amber-500 text-white'
                    : 'bg-white border border-cream-200 text-ink/80'
                }`}
              >
                {isPositive ? <Sparkles size={13} /> : item.id || `0${index + 1}`}
              </div>

              {/* Contenu textuel */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs md:text-sm font-semibold text-ink group-hover:text-navy-600 transition truncate">
                    {item.titre}
                  </h4>
                  {item.indicator && (
                    <span className="text-[10px] font-bold text-navy-700 bg-navy-50 px-1.5 py-0.2 rounded border border-navy-100 shrink-0">
                      {item.indicator}
                    </span>
                  )}
                </div>
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
