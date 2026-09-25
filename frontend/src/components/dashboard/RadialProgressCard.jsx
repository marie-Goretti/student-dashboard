import { Settings2 } from 'lucide-react';

/**
 * Jauge circulaire façon "Growth 62%" de la maquette de référence :
 * anneau de progression avec la valeur au centre, piste pointillée pour
 * la partie non remplie, libellé en bas à gauche, bouton rond en bas à
 * droite.
 *
 * - value       : 0 à 100, détermine le remplissage de l'anneau
 * - displayText : texte affiché au centre (ex: "62%" ou "11.6/20")
 * - label       : légende en bas à gauche (ex: "Academy growth")
 * - color       : couleur de l'anneau rempli (classe Tailwind, ex: 'stroke-navy-500')
 */
export default function RadialProgressCard({
  title,
  period = 'Global',
  value,
  displayText,
  label,
  color = '#2C4A6E',
  icon: Icon = Settings2,
}) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(100, value ?? 0));
  const offset = circumference * (1 - filled / 100);

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-sm p-5 flex flex-col">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-ink text-[15px]">{title}</h3>
        <span className="flex items-center gap-1 text-xs text-ink/50 bg-cream-100 rounded-full px-3 py-1">
          {period}
        </span>
      </div>

      {/* Jauge */}
      <div className="relative flex-1 flex items-center justify-center py-2">
        <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90">
          {/* Piste non remplie, en pointillés */}
          <circle
            cx="90" cy="90" r={radius}
            fill="none"
            stroke="#E4E0D6"
            strokeWidth="12"
            strokeDasharray="1 9"
            strokeLinecap="round"
          />
          {/* Arc rempli */}
          <circle
            cx="90" cy="90" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <span className="absolute font-serif text-3xl font-semibold text-ink">
          {displayText ?? '—'}
        </span>
      </div>

      {/* Pied de carte */}
      <div className="flex items-center justify-between mt-2">
        <p className="text-sm text-ink/50">{label}</p>
        <div className="w-9 h-9 rounded-full bg-ink flex items-center justify-center text-white shrink-0">
          <Icon size={15} />
        </div>
      </div>
    </div>
  );
}