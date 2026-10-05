import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export default function DevoirVsExamenCard({ data }) {
  const NIVEAU_ORDER = ['B1M', 'B1SI', 'B2M', 'B2SI', 'B3M', 'B3SI', 'M1M', 'M1SI', 'M2M', 'M2SI'];
  const chartData = (data || [])
    .filter((d) => NIVEAU_ORDER.includes(d.niveau))
    .sort((a, b) => NIVEAU_ORDER.indexOf(a.niveau) - NIVEAU_ORDER.indexOf(b.niveau));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const devoirVal = payload.find((p) => p.dataKey === 'devoir')?.value;
      const examenVal = payload.find((p) => p.dataKey === 'examen')?.value;
      const diff =
        devoirVal !== undefined && examenVal !== undefined
          ? (Number(devoirVal) - Number(examenVal)).toFixed(2)
          : null;

      return (
        <div className="bg-white rounded-xl shadow-lg border border-cream-200 p-3 text-xs">
          <p className="font-bold text-ink mb-1">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-navy-600 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#2C4A6E]" />
                Devoirs (CC) :
              </span>
              <span className="font-bold">{devoirVal !== undefined ? `${Number(devoirVal).toFixed(2)}/20` : '—'}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-maroon-500 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#7A1620]" />
                Examen final :
              </span>
              <span className="font-bold">{examenVal !== undefined ? `${Number(examenVal).toFixed(2)}/20` : '—'}</span>
            </div>
            {diff !== null && (
              <p className="text-ink/60 border-t border-cream-200 pt-1 mt-1 text-[11px]">
                Écart CC vs Exam :{' '}
                <span className={Number(diff) >= 0 ? 'text-navy-600 font-semibold' : 'text-maroon-500 font-semibold'}>
                  {Number(diff) >= 0 ? `+${diff}` : diff} pt
                </span>
              </p>
            )}
          </div>
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
            Devoir vs examen final (moyenne)
          </h3>
          <p className="text-xs text-ink/40 mt-0.5">
            Contrôle continu ramené sur 20 vs Examen final sur 20
          </p>
        </div>
        <span className="text-xs font-medium text-ink/50 bg-cream-100 rounded-full px-3 py-1">
          Comparaison
        </span>
      </div>

      {/* Graphique groupé */}
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
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
                formatter={(val) => <span className="text-ink/70 font-medium">{val}</span>}
              />
              <Bar
                dataKey="devoir"
                name="Devoirs (CC)"
                fill="#2C4A6E"
                barSize={14}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="examen"
                name="Examen final"
                fill="#7A1620"
                barSize={14}
                radius={[4, 4, 0, 0]}
              />
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
