import { CheckCircle2, XCircle, RotateCcw, AlertTriangle } from 'lucide-react';

export default function SecondaryKpiRow({ kpi }) {
  const formatNumber = (val) => {
    if (val === null || val === undefined) return '—';
    return Number(val).toLocaleString('fr-FR');
  };

  const formatPercent = (val) => {
    if (val === null || val === undefined) return '—';
    return Number(val).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Taux de réussite */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-cream-200 shadow-xs flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
          <CheckCircle2 size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl md:text-2xl font-bold text-ink tracking-tight font-sans">
              {kpi?.taux_reussite !== undefined ? formatPercent(kpi.taux_reussite) : '65,97%'}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              +3,4%
            </span>
          </div>
          <p className="text-xs text-ink/50 mt-0.5 truncate">Taux de réussite</p>
        </div>
      </div>

      {/* 2. Taux d'échec */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-cream-200 shadow-xs flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-maroon-50 text-maroon-500 flex items-center justify-center shrink-0 border border-maroon-100">
          <XCircle size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl md:text-2xl font-bold text-ink tracking-tight font-sans">
              {kpi?.taux_echec !== undefined ? formatPercent(kpi.taux_echec) : '29,88%'}
            </span>
            <span className="text-[11px] font-semibold text-maroon-500 bg-maroon-50 px-1.5 py-0.5 rounded-full">
              -1,7%
            </span>
          </div>
          <p className="text-xs text-ink/50 mt-0.5 truncate">Taux d'échec</p>
        </div>
      </div>

      {/* 3. Au rattrapage */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-cream-200 shadow-xs flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
          <RotateCcw size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl md:text-2xl font-bold text-ink tracking-tight font-sans">
              {kpi?.total_rattrapage !== undefined ? formatNumber(kpi.total_rattrapage) : '1 245'}
            </span>
            <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
              +4,2%
            </span>
          </div>
          <p className="text-xs text-ink/50 mt-0.5 truncate">Au rattrapage</p>
        </div>
      </div>

      {/* 4. Modules à risque */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-cream-200 shadow-xs flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-maroon-50 text-maroon-500 flex items-center justify-center shrink-0 border border-maroon-100">
          <AlertTriangle size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl md:text-2xl font-bold text-ink tracking-tight font-sans">
              {kpi?.modules_a_risque !== undefined ? kpi.modules_a_risque : '23'}
            </span>
            <span className="text-[11px] font-semibold text-maroon-500 bg-maroon-50 px-1.5 py-0.5 rounded-full">
              -13,1%
            </span>
          </div>
          <p className="text-xs text-ink/50 mt-0.5 truncate">Modules à risque</p>
        </div>
      </div>
    </div>
  );
}
