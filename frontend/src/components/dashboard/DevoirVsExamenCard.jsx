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
        <div className="bg-white rounded-xl shadow-lg border border-cream-200 p-2.5 text-xs">
          <p className="font-bold text-ink mb-1">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-navy-600 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-xs bg-[#2C4A6E]" />
                Devoirs (CC) :
              </span>
              <span className="font-bold">{devoirVal !== undefined ? `${Number(devoirVal).toFixed(2)}/20` : '—'}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-maroon-500 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-xs bg-[#7A1620]" />
                Examen final :
              </span>
              <span className="font-bold">{examenVal !== undefined ? `${Number(examenVal).toFixed(2)}/20` : '—'}</span>
            </div>
            {diff !== null && (
              <p className="text-ink/60 border-t border-cream-200 pt-0.5 mt-0.5 text-[10px]">
                Écart :{' '}
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
    <div className="bg-white rounded-2xl border border-cream-200 shadow-xs p-4 flex flex-col justify-between h-[260px]">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-1.5">
        <div>
          <h3 className="font-bold text-ink text-sm tracking-tight">
            Devoir vs examen final (moyenne)
          </h3>
          <p className="text-xs text-ink/40 mt-0.5">
            Contrôle continu (sur 20) vs Épreuve terminale (sur 20)
          </p>
        </div>
      </div>

      {/* Graphique à deux barres groupées */}
      <div className="h-[185px] w-full flex items-center justify-center">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 6, right: 8, left: -20, bottom: 2 }}
            >
              <CartesianGrid vertical={false} stroke="#EFEAE0" strokeDasharray="3 3" />
              <XAxis
                dataKey="niveau"
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
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '4px', fontSize: '10px' }}
              />
              <Bar dataKey="devoir" name="Devoirs (CC)" fill="#2C4A6E" radius={[3, 3, 0, 0]} barSize={12} />
              <Bar dataKey="examen" name="Examen final" fill="#7A1620" radius={[3, 3, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-xs text-ink/40 py-8">
            Aucune donnée de devoirs et examens disponible.
          </div>
        )}
      </div>
    </div>
  );
}
