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
        <div className="bg-white rounded-xl shadow-lg border border-cream-200 p-3 text-xs">
          <p className="font-bold text-ink mb-1">Tranche de notes : {label}</p>
          <p className={`font-semibold ${isUnder ? 'text-maroon-500' : 'text-navy-600'}`}>
            Effectif : {Number(val).toLocaleString('fr-FR')} évaluations
          </p>
          <p className="text-ink/40 text-[11px] mt-0.5">
            {isUnder ? 'Notes inférieures à 10 (Ajourné)' : 'Notes supérieures ou égales à 10 (Admis)'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-xs p-5 flex flex-col justify-between">
      {/* En-tête avec bouton Explorer la performance */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-ink text-[15px] tracking-tight">
            Distribution des moyennes
          </h3>
          <p className="text-xs text-ink/40 mt-0.5">
            Vue détaillée par intervalle de notes
          </p>
        </div>
        <button
          onClick={onExploreClick}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-cream-200 text-xs font-semibold text-ink/80 hover:bg-cream-100 hover:text-ink transition shadow-xs cursor-pointer"
        >
          Explorer la performance
          <ArrowUpRight size={14} className="text-ink/50" />
        </button>
      </div>

      {/* Graphique avec barres épaisses et colorées selon le seuil 10 */}
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 12, left: -4, bottom: 6 }}
          >
            <CartesianGrid vertical={false} stroke="#EFEAE0" strokeDasharray="3 3" />
            <XAxis
              dataKey="tranche"
              tick={{ fontSize: 11, fill: '#0B1220', fillOpacity: 0.65 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#0B1220', fillOpacity: 0.5 }}
              axisLine={false}
              tickLine={false}
              width={46}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="effectif"
              barSize={38}
              radius={[6, 6, 0, 0]}
            >
              {chartData.map((entry, index) => {
                const isUnder =
                  entry.isBelow10 !== undefined
                    ? entry.isBelow10
                    : entry.tranche.includes('<5') || entry.tranche.includes('5-8') || entry.tranche.includes('8-10') || entry.tranche.includes('0-5');
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={isUnder ? '#7A1620' : '#2C4A6E'}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
