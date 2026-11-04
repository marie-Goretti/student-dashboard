import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

export default function EvolutionReussiteCard({
  data = [],
  title = 'Évolution de la réussite',
  subtitle = 'Progression sur les dernières périodes',
}) {
  const chartData = data && data.length ? data : [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const moyVal = payload[0].value;
      const tauxVal = payload[0].payload.taux_reussite;
      return (
        <div className="bg-white rounded-xl shadow-lg border border-cream-200 p-2.5 text-xs">
          <p className="font-bold text-ink mb-1">Année académique {label}</p>
          <p className="text-navy-600 font-bold">
            Moyenne générale : {moyVal !== null ? `${Number(moyVal).toFixed(2)} / 20` : '—'}
          </p>
          {tauxVal !== undefined && (
            <p className="text-ink/60 mt-0.5 text-[11px]">
              Taux de réussite : <span className="font-semibold text-ink">{Number(tauxVal).toFixed(1)}%</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-xs p-4 flex flex-col justify-between h-[260px]">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="font-bold text-ink text-sm tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-ink/40 mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Graphique */}
      <div className="h-[185px] w-full flex items-center justify-center">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -20, bottom: 2 }}
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
                tick={{ fontSize: 10, fill: '#0B1220', fillOpacity: 0.65 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 20]}
                ticks={[0, 5, 10, 15, 20]}
                tick={{ fontSize: 10, fill: '#0B1220', fillOpacity: 0.5 }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <ReferenceLine y={10} stroke="#7A1620" strokeDasharray="3 3" strokeOpacity={0.4} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="moyenne"
                name="Moyenne générale"
                stroke="#2C4A6E"
                strokeWidth={2.5}
                fill="url(#moyLinearGrad)"
                dot={{ r: 3.5, fill: '#2C4A6E', stroke: '#ffffff', strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: '#7A1620', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-xs text-ink/40 py-8">
            Aucune donnée d'évolution disponible.
          </div>
        )}
      </div>
    </div>
  );
}
