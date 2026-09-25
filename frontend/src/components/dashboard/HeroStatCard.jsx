export default function HeroStatCard({ label, value, icon: Icon, suffix = '' }) {
  return (
    <div className="bg-white/95 backdrop-blur rounded-xl px-4 py-3 flex items-center gap-3 min-w-[170px]">
      <div className="w-9 h-9 rounded-lg bg-navy-50 text-navy-500 flex items-center justify-center shrink-0">
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-ink/50 leading-tight truncate">{label}</p>
        <p className="font-serif text-xl font-semibold text-ink leading-tight">
          {value ?? '—'}{value !== null && value !== undefined ? suffix : ''}
        </p>
      </div>
    </div>
  );
}