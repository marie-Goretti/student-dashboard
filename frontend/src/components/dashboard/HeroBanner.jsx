import { Sparkles, ArrowUpRight, Users, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react';

export default function HeroBanner({ kpi, loading = false, onAlertClick }) {
  const formatNumber = (val) => {
    if (val === null || val === undefined) return '—';
    return Number(val).toLocaleString('fr-FR');
  };

  const formatDecimal = (val, digits = 2) => {
    if (val === null || val === undefined) return '—';
    return Number(val).toLocaleString('fr-FR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  };

  const isLoaded = Boolean(kpi && !loading);

  return (
    <div className="mb-3.5">
      {/* Bannière Hero compacte avec image de campus */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-xs bg-navy-900 border border-cream-200"
        style={{
          backgroundImage: "url('/lbs-building.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 45%',
        }}
      >
        {/* Voile sombre pour lisibilité maximale */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/75 to-ink/50" />

        <div className="relative p-4 md:p-5 lg:p-6">
          {/* Ligne haute : Tag d'intelligence + bouton d'action */}
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-white/90 bg-white/15 backdrop-blur-md border border-white/10 shadow-xs">
              <Sparkles size={12} className="text-amber-300" />
              Intelligence académique en temps réel
            </span>

            <button
              onClick={onAlertClick}
              className="print:hidden inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white bg-maroon-600 hover:bg-maroon-700 transition shadow-xs cursor-pointer"
            >
              Voir les alertes
              <ArrowUpRight size={13} />
            </button>
          </div>

          {/* Titre & sous-titre compacts */}
          <div className="max-w-2xl mb-3.5">
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-snug">
              Pilotez la réussite étudiante avec confiance.
            </h2>
            <p className="text-xs text-white/75 mt-1 leading-relaxed max-w-xl">
              Une lecture instantanée des performances, des tendances et des points de vigilance de votre établissement.
            </p>
          </div>

          {/* Les 4 cartes compactes */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 print:grid-cols-4">
            {/* 1. Étudiants */}
            <div className="bg-white rounded-xl p-3 md:p-3.5 shadow-xs border border-cream-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-ink/70 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Users size={14} className="text-ink/60" />
                  <span className="text-[11px] font-bold text-ink/70">Étudiants</span>
                </div>
                <ArrowUpRight size={14} className="text-ink/30" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl md:text-2xl font-bold text-ink tracking-tight font-sans">
                  {isLoaded && kpi.effectif_total_evalue != null
                    ? formatNumber(kpi.effectif_total_evalue)
                    : '—'}
                </span>
                <span className="text-[10px] font-semibold text-ink/60 bg-cream-100 px-1.5 py-0.5 rounded-full">
                  Évalués
                </span>
              </div>
            </div>

            {/* 2. Modules */}
            <div className="bg-white rounded-xl p-3 md:p-3.5 shadow-xs border border-cream-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-ink/70 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <BookOpen size={14} className="text-ink/60" />
                  <span className="text-[11px] font-bold text-ink/70">Modules</span>
                </div>
                <ArrowUpRight size={14} className="text-ink/30" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl md:text-2xl font-bold text-ink tracking-tight font-sans">
                  {isLoaded && kpi.total_modules != null
                    ? formatNumber(kpi.total_modules)
                    : '—'}
                </span>
                <span className="text-[10px] font-semibold text-ink/60 bg-cream-100 px-1.5 py-0.5 rounded-full">
                  Enseignés
                </span>
              </div>
            </div>

            {/* 3. Moyenne générale */}
            <div className="bg-white rounded-xl p-3 md:p-3.5 shadow-xs border border-cream-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-ink/70 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-ink/60" />
                  <span className="text-[11px] font-bold text-ink/70">Moyenne générale</span>
                </div>
                <ArrowUpRight size={14} className="text-ink/30" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl md:text-2xl font-bold text-ink tracking-tight font-sans">
                  {isLoaded && kpi.moyenne_generale != null
                    ? `${formatDecimal(kpi.moyenne_generale)}`
                    : '—'}
                </span>
                <span className="text-[10px] font-semibold text-ink/60 bg-cream-100 px-1.5 py-0.5 rounded-full">
                  sur 20
                </span>
              </div>
            </div>

            {/* 4. Situation à surveiller (Carte rouge bordeaux) */}
            <div
              onClick={onAlertClick}
              className="bg-[#7A1620] text-white rounded-xl p-3 md:p-3.5 shadow-xs border border-maroon-700/60 flex flex-col justify-between cursor-pointer hover:bg-[#68131B] transition"
            >
              <div className="flex items-center justify-between text-white/80 mb-1.5">
                <span className="text-[11px] font-bold text-white/90">Situation à surveiller</span>
                <AlertTriangle size={14} className="text-amber-300" />
              </div>
              <div>
                <p className="text-xl md:text-2xl font-bold text-white tracking-tight font-sans leading-tight">
                  {isLoaded && kpi.modules_a_risque !== undefined
                    ? `${kpi.modules_a_risque} module${kpi.modules_a_risque > 1 ? 's' : ''}`
                    : '—'}
                </p>
                <p className="text-[10px] text-white/80 mt-0.5 truncate">
                  {isLoaded && kpi.modules_a_risque !== undefined
                    ? kpi.modules_a_risque > 0
                      ? 'requièrent une action prioritaire'
                      : 'aucune matière critique'
                    : 'analyse en cours...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
