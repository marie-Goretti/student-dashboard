import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

export default function EvolutionReussiteCard({ data, currentPeriod = '2024-2025' }) {
  // Données de secours réalistes si non encore disponibles (sur 20)
  const defaultEvolution = [
    { annee: '2022-2023', moyenne: 10.8, taux_reussite: 60.5 },
    { annee: '2023-2024', moyenne: 11.97, taux_reussite: 71.5 },
    { annee: '2024-2025', moyenne: 11.24, taux_reussite: 69.1 },
  ];

  const chartData = data && data.length ? data : defaultEvolution;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const moyVal = payload[0].value;
      const tauxVal = payload[0].payload.taux_reussite;
      return (
        <div className="bg-white rounded-xl shadow-lg border border-cream-200 p-3 text-xs">
          <p className="font-bold text-ink mb-1">Année académique {label}</p>
          <p className="text-navy-600 font-bold text-sm">
            Moyenne générale : {moyVal !== null ? `${Number(moyVal).toFixed(2)} / 20` : '—'}
          </p>
          {tauxVal !== undefined && (
            <p className="text-ink/60 mt-1 text-[11px]">
              Taux de réussite : <span className="font-semibold text-ink">{Number(tauxVal).toFixed(1)}%</span>
            </p>
          )}
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
            Évolution des moyennes académiques
          </h3>
          <p className="text-xs text-ink/40 mt-0.5">
            Comparaison des moyennes générales sur 20 par année
          </p>
        </div>
        <span className="text-xs font-semibold text-navy-700 bg-navy-50 border border-navy-100 rounded-full px-3 py-1">
          Barème / 20
        </span>
      </div>

      {/* Graphique linéaire (Line / Area chart) */}
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 12, right: 12, left: -10, bottom: 6 }}
          >
            <defs>
              <linearGradient id="moyLinearGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2C4A6E" stopOpacity={0.22} />
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
              domain={[0, 20]}
              ticks={[0, 5, 10, 15, 20]}
              tick={{ fontSize: 11, fill: '#0B1220', fillOpacity: 0.5 }}
              tickFormatter={(v) => `${v}`}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <ReferenceLine y={10} stroke="#7A1620" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="moyenne"
              name="Moyenne générale"
              stroke="#2C4A6E"
              strokeWidth={3}
              fill="url(#moyLinearGrad)"
              dot={{ r: 5, fill: '#2C4A6E', stroke: '#ffffff', strokeWidth: 2 }}
              activeDot={{ r: 7, fill: '#7A1620', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
