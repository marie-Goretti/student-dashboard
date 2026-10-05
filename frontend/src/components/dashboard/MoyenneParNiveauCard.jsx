import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function MoyenneParNiveauCard({ data }) {
  // Filtre sur les 10 niveaux officiels
  const NIVEAU_ORDER = ['B1M', 'B1SI', 'B2M', 'B2SI', 'B3M', 'B3SI', 'M1M', 'M1SI', 'M2M', 'M2SI'];
  const chartData = (data || [])
    .filter((d) => NIVEAU_ORDER.includes(d.niveau))
    .sort((a, b) => NIVEAU_ORDER.indexOf(a.niveau) - NIVEAU_ORDER.indexOf(b.niveau));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const effectif = payload[0].payload.effectif;
      return (
        <div className="bg-white rounded-xl shadow-lg border border-cream-200 p-3 text-xs">
          <p className="font-bold text-ink mb-1">{label}</p>
          <p className="text-navy-600 font-semibold">
            Moyenne : {val !== null ? `${Number(val).toFixed(2)}/20` : '—'}
          </p>
          {effectif && <p className="text-ink/50 mt-0.5">Effectif : {effectif} évaluations</p>}
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
            Moyenne par niveau
          </h3>
          <p className="text-xs text-ink/40 mt-0.5">
            Moyenne générale sur 20 par promotion
          </p>
        </div>
        <span className="text-xs font-medium text-ink/50 bg-cream-100 rounded-full px-3 py-1">
          Global
        </span>
      </div>

      {/* Graphique */}
      {chartData.length > 0 ? (
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              barGap={4}
              margin={{ top: 8, right: 8, left: -12, bottom: 20 }}
            >
              <CartesianGrid vertical={false} stroke="#EFEAE0" strokeDasharray="3 3" />
              <XAxis
                dataKey="niveau"
                tick={{ fontSize: 11, fill: '#0B1220', fillOpacity: 0.65 }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={35}
              />
              <YAxis
                domain={[0, 20]}
                ticks={[0, 5, 10, 15, 20]}
                tick={{ fontSize: 11, fill: '#0B1220', fillOpacity: 0.5 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="moyenne"
                name="Moyenne"
                barSize={26}
                radius={[6, 6, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.moyenne !== null && Number(entry.moyenne) < 10 ? '#7A1620' : '#2C4A6E'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[250px] flex items-center justify-center text-xs text-ink/40">
          Aucune donnée disponible
        </div>
      )}
    </div>
  );
}
