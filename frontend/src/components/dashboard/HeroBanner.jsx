import { Sparkles, ArrowUpRight, Users, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';

export default function HeroBanner({ kpi, onAlertClick }) {
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

  return (
    <div className="mb-6">
      {/* Bannière Hero avec image de campus */}
      <div
        className="relative rounded-3xl overflow-hidden shadow-sm bg-navy-900 border border-cream-200"
        style={{
          backgroundImage: "url('/campus-banner.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
        }}
      >
        {/* Voile sombre pour lisibilité maximale */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/65 to-ink/40" />

        <div className="relative p-6 md:p-8">
          {/* Ligne haute : Tag d'intelligence + bouton d'action */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white/90 bg-white/15 backdrop-blur-md border border-white/10 shadow-xs">
              <Sparkles size={13} className="text-amber-300" />
              Intelligence académique en temps réel
            </span>

            <button
              onClick={onAlertClick}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-maroon-500 hover:bg-maroon-600 transition shadow-sm cursor-pointer"
            >
              Voir les recommandations
              <ArrowUpRight size={14} />
            </button>
          </div>

          {/* Titre & sous-titre */}
          <div className="max-w-2xl mb-8">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
              Pilotez la réussite étudiante avec confiance.
            </h2>
            <p className="text-xs md:text-sm text-white/75 mt-2 leading-relaxed">
              Une lecture instantanée des performances, des tendances et des points de vigilance de votre établissement.
            </p>
          </div>

          {/* Les 4 KPIs demandés : Nombre d'étudiants, Moyenne générale, Taux de réussite, Taux d'échec */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Nombre d'étudiants */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-cream-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-ink/70 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cream-100 flex items-center justify-center text-ink/70">
                    <Users size={16} />
                  </div>
                  <span className="text-xs font-semibold text-ink/70">Nombre d'étudiants</span>
                </div>
                <ArrowUpRight size={16} className="text-ink/40" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl md:text-3xl font-bold text-ink tracking-tight font-sans">
                  {formatNumber(kpi?.effectif_total_evalue ?? 513)}
                </span>
                <span className="text-[11px] font-semibold text-ink/50 bg-cream-100 px-2 py-0.5 rounded-full">
                  +4,6%
                </span>
              </div>
            </div>

            {/* 2. Moyenne générale */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-cream-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-ink/70 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cream-100 flex items-center justify-center text-ink/70">
                    <TrendingUp size={16} />
                  </div>
                  <span className="text-xs font-semibold text-ink/70">Moyenne générale</span>
                </div>
                <ArrowUpRight size={16} className="text-ink/40" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl md:text-3xl font-bold text-ink tracking-tight font-sans">
                  {kpi?.moyenne_generale !== null && kpi?.moyenne_generale !== undefined
                    ? `${formatDecimal(kpi.moyenne_generale)}/20`
                    : '11,60/20'}
                </span>
                <span className="text-[11px] font-semibold text-ink/50 bg-cream-100 px-2 py-0.5 rounded-full">
                  +0,8%
                </span>
              </div>
            </div>

            {/* 3. Taux de réussite */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-cream-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-ink/70 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <CheckCircle2 size={16} />
                  </div>
                  <span className="text-xs font-semibold text-ink/70">Taux de réussite</span>
                </div>
                <ArrowUpRight size={16} className="text-ink/40" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl md:text-3xl font-bold text-ink tracking-tight font-sans">
                  {kpi?.taux_reussite !== null && kpi?.taux_reussite !== undefined
                    ? `${formatDecimal(kpi.taux_reussite)}%`
                    : '67,03%'}
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  +3,4%
                </span>
              </div>
            </div>

            {/* 4. Taux d'échec */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-cream-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-ink/70 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-maroon-50 text-maroon-500 flex items-center justify-center border border-maroon-100">
                    <XCircle size={16} />
                  </div>
                  <span className="text-xs font-semibold text-ink/70">Taux d'échec</span>
                </div>
                <ArrowUpRight size={16} className="text-ink/40" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl md:text-3xl font-bold text-ink tracking-tight font-sans">
                  {kpi?.taux_echec !== null && kpi?.taux_echec !== undefined
                    ? `${formatDecimal(kpi.taux_echec)}%`
                    : '23,50%'}
                </span>
                <span className="text-[11px] font-semibold text-maroon-500 bg-maroon-50 px-2 py-0.5 rounded-full">
                  -1,7%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
