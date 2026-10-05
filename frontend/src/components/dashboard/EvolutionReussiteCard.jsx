import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function EvolutionReussiteCard({ data, currentPeriod = '2024-2025' }) {
  // Données de secours réalistes si non encore disponibles
  const defaultEvolution = [
    { annee: '2021', taux_reussite: 53.4 },
    { annee: '2022', taux_reussite: 57.8 },
    { annee: '2023', taux_reussite: 61.2 },
    { annee: '2024', taux_reussite: 64.5 },
    { annee: '2025', taux_reussite: 66.4 },
  ];

  const chartData = data && data.length ? data : defaultEvolution;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      return (
        <div className="bg-white rounded-xl shadow-lg border border-cream-200 p-3 text-xs">
          <p className="font-bold text-ink mb-1">Année {label}</p>
          <p className="text-navy-600 font-semibold">
            Taux de réussite : {val !== null ? `${Number(val).toFixed(1)}%` : '—'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-xs p-5 flex flex-col justify-between">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-ink text-[15px] tracking-tight">
            Évolution de la réussite
          </h3>
          <p className="text-xs text-ink/40 mt-0.5">
            Progression sur les dernières périodes
          </p>
        </div>
        <span className="text-xs font-medium text-ink/50 bg-cream-100 rounded-full px-3 py-1">
          {currentPeriod}
        </span>
      </div>

      {/* Graphique linéaire (Line / Area chart) */}
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 12, right: 12, left: -4, bottom: 6 }}
          >
            <defs>
              <linearGradient id="tauxLinearGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2C4A6E" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#2C4A6E" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#EFEAE0" strokeDasharray="3 3" />
            <XAxis
              dataKey="annee"
              tick={{ fontSize: 11, fill: '#0B1220', fillOpacity: 0.65 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[45, 80]}
              ticks={[50, 57, 64, 71, 75]}
              tick={{ fontSize: 11, fill: '#0B1220', fillOpacity: 0.5 }}
              tickFormatter={(v) => `${v}%`}
              axisLine={false}
              tickLine={false}
              width={46}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="taux_reussite"
              stroke="#2C4A6E"
              strokeWidth={3}
              fill="url(#tauxLinearGrad)"
              dot={{ r: 5, fill: '#2C4A6E', stroke: '#ffffff', strokeWidth: 2 }}
              activeDot={{ r: 7, fill: '#7A1620', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
