import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

export default function EvolutionReussiteCard({ data = [], currentPeriod = '' }) {
  const chartData = data && data.length ? data : [];

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
        {currentPeriod && (
          <span className="text-[11px] font-semibold text-navy-600 bg-navy-50 border border-navy-100 px-2.5 py-1 rounded-full">
            {currentPeriod}
          </span>
        )}
      </div>

      {/* Graphique linéaire (Line / Area chart) */}
      <div className="h-[250px] w-full flex items-center justify-center">
        {chartData.length > 0 ? (
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
        ) : (
          <div className="text-center text-xs text-ink/40 py-12">
            Aucune donnée d'évolution disponible pour le moment.
          </div>
        )}
      </div>
    </div>
  );
}
