import { CheckCircle2, XCircle, RotateCcw, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SecondaryKpiRow({ kpi }) {
  const navigate = useNavigate();

  const formatNumber = (val) => {
    if (val === null || val === undefined) return '—';
    return Number(val).toLocaleString('fr-FR');
  };

  const formatPercent = (val) => {
    if (val === null || val === undefined) return '—';
    return Number(val).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3.5">
      {/* 1. Taux de réussite */}
      <div className="bg-white rounded-xl p-3 md:p-3.5 shadow-xs border border-cream-200/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-ink/70 mb-1.5">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span className="text-[11px] font-bold text-ink/70">Taux de réussite</span>
          </div>
          <ArrowUpRight size={14} className="text-ink/30" />
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xl md:text-2xl font-bold text-ink tracking-tight font-sans">
            {kpi?.taux_reussite !== undefined ? formatPercent(kpi.taux_reussite) : '68,09%'}
          </span>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
            +3,4%
          </span>
        </div>
      </div>

      {/* 2. Taux d'échec */}
      <div className="bg-white rounded-xl p-3 md:p-3.5 shadow-xs border border-cream-200/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-ink/70 mb-1.5">
          <div className="flex items-center gap-1.5">
            <XCircle size={14} className="text-maroon-600" />
            <span className="text-[11px] font-bold text-ink/70">Taux d'échec</span>
          </div>
          <ArrowUpRight size={14} className="text-ink/30" />
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xl md:text-2xl font-bold text-ink tracking-tight font-sans">
            {kpi?.taux_echec !== undefined ? formatPercent(kpi.taux_echec) : '28,49%'}
          </span>
          <span className="text-[10px] font-semibold text-maroon-600 bg-rose-50 px-1.5 py-0.5 rounded-full">
            -1,7%
          </span>
        </div>
      </div>

      {/* 3. Au rattrapage */}
      <div
        onClick={() => navigate('/rattrapages')}
        className="bg-white rounded-xl p-3 md:p-3.5 shadow-xs border border-cream-200/80 flex flex-col justify-between cursor-pointer hover:border-cream-300 transition"
      >
        <div className="flex items-center justify-between text-ink/70 mb-1.5">
          <div className="flex items-center gap-1.5">
            <RotateCcw size={14} className="text-amber-600" />
            <span className="text-[11px] font-bold text-ink/70">Au rattrapage</span>
          </div>
          <ArrowUpRight size={14} className="text-ink/30" />
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xl md:text-2xl font-bold text-ink tracking-tight font-sans">
            {kpi?.total_rattrapage !== undefined ? formatNumber(kpi.total_rattrapage) : '983'}
          </span>
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
            +4,2%
          </span>
        </div>
      </div>

      {/* 4. Modules à risque */}
      <div
        onClick={() => navigate('/recommandations')}
        className="bg-white rounded-xl p-3 md:p-3.5 shadow-xs border border-cream-200/80 flex flex-col justify-between cursor-pointer hover:border-cream-300 transition"
      >
        <div className="flex items-center justify-between text-ink/70 mb-1.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-maroon-600" />
            <span className="text-[11px] font-bold text-ink/70">Modules à risque</span>
          </div>
          <ArrowUpRight size={14} className="text-ink/30" />
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xl md:text-2xl font-bold text-ink tracking-tight font-sans">
            {kpi?.modules_a_risque !== undefined ? kpi.modules_a_risque : '44'}
          </span>
          <span className="text-[10px] font-semibold text-maroon-600 bg-rose-50 px-1.5 py-0.5 rounded-full">
            -13,1%
          </span>
        </div>
      </div>
    </div>
  );
}
