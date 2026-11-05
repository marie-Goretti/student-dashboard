import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

export default function ManagementVsSiCard({
  data = [],
  title = "Management vs Système d'Info",
  subtitle = "Comparaison des moyennes",
}) {
  // Filtrer les données pour les paliers B1, B2, B3, M1, M2
  const chartData = useMemo(() => {
    if (!data || !data.length) return [];
    // Si la liste contient d'autres groupes ou juste Global
    const filtered = data.filter((d) => (d.palier || d.groupe) !== 'Global');
    if (filtered.length > 0) return filtered;
    return data;
  }, [data]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const mgtVal = payload.find((p) => p.dataKey === 'management')?.value;
      const siVal = payload.find((p) => p.dataKey === 'systeme_information')?.value;

      let ecart = null;
      let leader = null;
      if (mgtVal !== null && mgtVal !== undefined && siVal !== null && siVal !== undefined) {
        const diff = Number(siVal) - Number(mgtVal);
        ecart = Math.abs(diff).toFixed(2);
        if (diff > 0.05) leader = 'SI';
        else if (diff < -0.05) leader = 'MGT';
        else leader = 'Égalité';
      }

      return (
        <div className="bg-white rounded-xl shadow-lg border border-cream-200 p-2.5 text-xs min-w-[170px]">
          <p className="font-bold text-ink mb-1.5 pb-1 border-b border-cream-100">
            Niveau {label}
          </p>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-ink/70">
                <span className="w-2 h-2 rounded-full bg-[#7A1620]" />
                Management :
              </span>
              <span className="font-bold text-[#7A1620]">
                {mgtVal !== null && mgtVal !== undefined ? `${Number(mgtVal).toFixed(2)}/20` : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-ink/70">
                <span className="w-2 h-2 rounded-full bg-[#2C4A6E]" />
                Système d'Info :
              </span>
              <span className="font-bold text-[#2C4A6E]">
                {siVal !== null && siVal !== undefined ? `${Number(siVal).toFixed(2)}/20` : '—'}
              </span>
            </div>
          </div>

          {ecart !== null && leader !== 'Égalité' && (
            <p className="mt-2 pt-1 border-t border-cream-100 text-[10px] text-ink/50 text-right">
              Écart : <strong className="text-ink font-semibold">+{ecart} pt</strong> ({leader})
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-xs p-4 flex flex-col justify-between h-[260px]">
      {/* En-tête : Titre & Sous-titre */}
      <div className="mb-1">
        <h3 className="font-bold text-ink text-sm tracking-tight leading-tight">
          {title}
        </h3>
        <p className="text-[11px] text-ink/40 mt-0.5">
          {subtitle}
        </p>
      </div>

      {/* Graphique Barres Groupées */}
      <div className="h-[175px] w-full flex items-center justify-center">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              barGap={3}
              barCategoryGap="22%"
              margin={{ top: 8, right: 8, left: 0, bottom: 2 }}
            >
              <CartesianGrid vertical={false} stroke="#EFEAE0" strokeDasharray="3 3" />
              <XAxis
                dataKey="palier"
                tick={{ fontSize: 10, fill: '#0B1220', fillOpacity: 0.65 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[0, 20]} />
              <ReferenceLine y={10} stroke="#7A1620" strokeDasharray="3 3" strokeOpacity={0.35} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="management"
                name="Management"
                fill="#7A1620"
                radius={[4, 4, 0, 0]}
                maxBarSize={16}
              />
              <Bar
                dataKey="systeme_information"
                name="Système d'Information"
                fill="#2C4A6E"
                radius={[4, 4, 0, 0]}
                maxBarSize={16}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-xs text-ink/40 py-8">
            Aucune donnée de comparaison disponible.
          </div>
        )}
      </div>

      {/* Légende discrète inférieure */}
      <div className="flex items-center justify-center gap-4 text-[11px] pt-1 border-t border-cream-100">
        <div className="flex items-center gap-1.5 text-ink/70">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#7A1620]" />
          <span>Management</span>
        </div>
        <div className="flex items-center gap-1.5 text-ink/70">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#2C4A6E]" />
          <span>Système d'Information</span>
        </div>
      </div>
    </div>
  );
}
