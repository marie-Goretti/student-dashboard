import { Trophy } from 'lucide-react';

const RANK_STYLES = [
  'bg-navy-500 text-white',
  'bg-navy-100 text-navy-600',
  'bg-navy-100 text-navy-600',
  'bg-cream-200 text-ink/60',
  'bg-cream-200 text-ink/60',
];

export default function TopModulesList({ modules }) {
  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-sm p-4 h-full">
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={15} className="text-navy-500" />
        <h3 className="font-semibold text-ink text-sm">Top 5 des modules</h3>
      </div>

      {!modules?.length ? (
        <p className="text-ink/40 text-sm text-center py-10">Aucune donnée disponible</p>
      ) : (
        <ul className="space-y-2">
          {modules.map((m, i) => (
            <li key={`${m.module}-${m.niveau}`} className="flex items-center gap-2.5">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${
                  RANK_STYLES[i] ?? RANK_STYLES[4]
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink truncate">{m.module}</p>
                <p className="text-[11px] text-ink/50">{m.niveau}</p>
              </div>
              <span className="font-serif text-base font-semibold text-navy-500 shrink-0">
                {m.moyenne}
                <span className="text-[10px] text-ink/40 font-sans">/20</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}