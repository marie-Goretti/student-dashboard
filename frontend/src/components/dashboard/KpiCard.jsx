export default function KpiCard({ label, value, icon: Icon, color = 'navy', suffix = '' }) {
  const colorMap = {
    navy: 'bg-navy-50 text-navy-500',
    maroon: 'bg-maroon-50 text-maroon-500',
    cream: 'bg-cream-200 text-ink',
  };

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colorMap[color] ?? colorMap.navy}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm text-ink/60">{label}</p>
        <p className="text-2xl font-serif font-semibold text-ink">
          {value ?? '—'}{value !== null && value !== undefined ? suffix : ''}
        </p>
      </div>
    </div>
  );
}