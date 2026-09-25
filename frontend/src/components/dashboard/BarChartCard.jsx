import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// Palette réservée aux graphiques : marine puis bordeaux pour les séries
// multiples, cohérente avec la charte de l'école.
const CHART_COLORS = ['#2C4A6E', '#7A1620', '#8FA6BC'];

/**
 * - shadeByValue : quand true (utile pour une série unique), chaque barre
 *   est teintée selon son intensité relative — la valeur la plus forte
 *   garde la couleur pleine, les autres sont dégradées vers une teinte
 *   plus claire.
 * - angledLabels : incline les étiquettes de l'axe X (utile quand la
 *   carte est étroite et qu'il y a beaucoup de catégories, ex: les 10
 *   niveaux), pour éviter qu'elles se chevauchent ou soient tronquées.
 */
export default function BarChartCard({
  title, period = 'Global', data, xKey, bars, shadeByValue = false, angledLabels = false,
}) {
  const singleSeries = bars.length === 1;
  const key = singleSeries ? bars[0].key : null;

  let maxVal;
  if (shadeByValue && singleSeries && data?.length) {
    const values = data.map((d) => Number(d[key]) || 0);
    maxVal = Math.max(...values);
  }

  const opacityFor = (val) => (Number(val) === maxVal ? 1 : 0.35);

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-ink text-[15px]">{title}</h3>
        <span className="text-xs text-ink/50 bg-cream-100 rounded-full px-3 py-1">
          {period}
        </span>
      </div>

      {data?.length ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            barCategoryGap="25%"
            margin={angledLabels ? { top: 4, right: 4, left: -18, bottom: 28 } : { top: 4, right: 4, left: -18, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="#EFEAE0" strokeDasharray="3 3" />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 10, fill: '#0B1220', fillOpacity: 0.6 }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={angledLabels ? -40 : 0}
              textAnchor={angledLabels ? 'end' : 'middle'}
              height={angledLabels ? 40 : 30}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#0B1220', fillOpacity: 0.5 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              cursor={{ fill: '#F3EFE7' }}
              contentStyle={{ borderRadius: 12, border: '1px solid #EFEAE0', fontSize: 13 }}
            />
            {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {bars.map((bar, i) => (
              <Bar
                key={bar.key}
                dataKey={bar.key}
                name={bar.name}
                fill={bar.color || CHART_COLORS[i % CHART_COLORS.length]}
                radius={[6, 6, 0, 0]}
                maxBarSize={22}
              >
                {shadeByValue && singleSeries &&
                  data.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={bar.color || CHART_COLORS[i % CHART_COLORS.length]}
                      fillOpacity={opacityFor(entry[key])}
                    />
                  ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-ink/40 text-sm text-center py-16">Aucune donnée disponible</p>
      )}
    </div>
  );
}