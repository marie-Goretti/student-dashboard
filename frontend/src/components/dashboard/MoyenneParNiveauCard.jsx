import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function MoyenneParNiveauCard({ data }) {
  const navigate = useNavigate();
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
        <div className="bg-white rounded-xl shadow-lg border border-cream-200 p-2.5 text-xs">
          <p className="font-bold text-ink mb-0.5">{label}</p>
          <p className="text-navy-600 font-semibold">
            Moyenne : {val !== null ? `${Number(val).toFixed(2)}/20` : '—'}
          </p>
          {effectif && <p className="text-ink/50 text-[10px] mt-0.5">Effectif : {effectif} évaluations</p>}
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
            Moyenne par niveau
          </h3>
          <p className="text-xs text-ink/40 mt-0.5">
            Moyenne générale sur 20 par promotion
          </p>
        </div>
        <span className="text-[11px] font-semibold text-ink/50 bg-cream-100 rounded-full px-2.5 py-0.5">
          Global
        </span>
      </div>

      {/* Graphique */}
      {chartData.length > 0 ? (
        <div className="h-[185px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              barGap={4}
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
              <Bar dataKey="moyenne" radius={[4, 4, 0, 0]} barSize={22}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={entry.moyenne !== null && entry.moyenne < 10 ? '#7A1620' : '#2C4A6E'}
                    className="hover:opacity-85 transition cursor-pointer"
                    onClick={() => navigate(`/niveaux/${entry.id_niv || entry.niveau}`)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center text-xs text-ink/40 py-8">
          Aucune donnée disponible.
        </div>
      )}
    </div>
  );
}
