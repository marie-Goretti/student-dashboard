import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ArrowUpRight } from 'lucide-react';

export default function DistributionNotesCard({ data, onExploreClick }) {
  const defaultDistribution = [
    { tranche: '<5', effectif: 636, isBelow10: true },
    { tranche: '5-8', effectif: 476, isBelow10: true },
    { tranche: '8-10', effectif: 460, isBelow10: true },
    { tranche: '10-12', effectif: 926, isBelow10: false },
    { tranche: '12-14', effectif: 1351, isBelow10: false },
    { tranche: '14-16', effectif: 1336, isBelow10: false },
    { tranche: '16-18', effectif: 675, isBelow10: false },
    { tranche: '18-20', effectif: 196, isBelow10: false },
  ];

  const chartData = data && data.length ? data : defaultDistribution;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const isUnder = payload[0].payload.isBelow10;
      return (
        <div className="bg-white rounded-xl shadow-lg border border-cream-200 p-2.5 text-xs">
          <p className="font-bold text-ink mb-0.5">Tranche : {label}/20</p>
          <p className={`font-semibold ${isUnder ? 'text-maroon-500' : 'text-navy-600'}`}>
            {Number(val).toLocaleString('fr-FR')} évaluations
          </p>
          <p className="text-ink/40 text-[10px] mt-0.5">
            {isUnder ? 'Notes inférieures à 10 (Ajourné)' : 'Notes supérieures ou égales à 10 (Admis)'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-xs p-4 flex flex-col justify-between h-[260px]">
      {/* En-tête avec bouton Explorer la performance */}
      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-ink text-sm tracking-tight">
            Distribution des moyennes
          </h3>
          <p className="text-xs text-ink/40 mt-0.5">
            Vue détaillée par intervalle de notes
          </p>
        </div>
        <button
          onClick={onExploreClick}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl border border-cream-200 text-xs font-semibold text-ink/80 hover:bg-cream-100 hover:text-ink transition shadow-xs cursor-pointer"
        >
          Explorer la performance
          <ArrowUpRight size={13} className="text-ink/50" />
        </button>
      </div>

      {/* Graphique */}
      <div className="h-[185px] w-full flex items-center justify-center">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 6, right: 8, left: 0, bottom: 2 }}
            >
              <CartesianGrid vertical={false} stroke="#EFEAE0" strokeDasharray="3 3" />
              <XAxis
                dataKey="tranche"
                tick={{ fontSize: 10, fill: '#0B1220', fillOpacity: 0.65 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="effectif" radius={[4, 4, 0, 0]} barSize={22}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`dist-${index}`}
                    fill={entry.isBelow10 ? '#7A1620' : '#2C4A6E'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-xs text-ink/40 py-8">
            Aucune donnée de distribution disponible.
          </div>
        )}
      </div>
    </div>
  );
}
