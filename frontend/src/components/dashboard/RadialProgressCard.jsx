export default function RadialProgressCard({
  kpi,
  title = 'Résultats académiques',
  subtitle = 'Répartition de la cohorte',
  period = 'Global',
  showLegend = false,
}) {
  const value = kpi?.taux_reussite !== undefined ? Math.round(kpi.taux_reussite) : 66;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(100, value));
  const offset = circumference * (1 - filled / 100);

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-xs p-4 flex flex-col justify-between h-[260px]">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-ink text-sm tracking-tight">{title}</h3>
          <p className="text-xs text-ink/40 mt-0.5">{subtitle}</p>
        </div>
        <span className="text-[11px] font-semibold text-ink/50 bg-cream-100 rounded-full px-2.5 py-0.5">
          {period}
        </span>
      </div>

      {/* Anneau circulaire centré */}
      <div className="relative flex-1 flex items-center justify-center py-2">
        <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90">
          {/* Piste arrière-plan */}
          <circle
            cx="75"
            cy="75"
            r={radius}
            fill="none"
            stroke="#EFEAE0"
            strokeWidth="12"
          />
          {/* Arc rempli réussite */}
          <circle
            cx="75"
            cy="75"
            r={radius}
            fill="none"
            stroke="#2C4A6E"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-ink tracking-tight font-sans">
            {value}%
          </span>
          <span className="text-[10px] font-medium text-ink/50 -mt-0.5">
            de réussite
          </span>
        </div>
      </div>

      {showLegend && (
        <div className="flex items-center justify-center gap-4 text-[11px] text-ink/60">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2C4A6E]" />
            <span>Admis</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#7A1620]" />
            <span>Refusés</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#D5CEBE]" />
            <span>Autres</span>
          </div>
        </div>
      )}
    </div>
  );
}
