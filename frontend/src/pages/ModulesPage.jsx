import { useState, useEffect, useCallback } from 'react';
import MainLayout from '../components/layout/MainLayout';
import HeaderBar from '../components/layout/HeaderBar';
import FiltersBar from '../components/dashboard/FiltersBar';
import { getAnalyseModules } from '../api/dashboardService';
import { Loader2 } from 'lucide-react';

export default function ModulesPage() {
  const [filters, setFilters] = useState({});
  const [data, setData] = useState({ top_modules: [], attention_modules: [] });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAnalyseModules(filters);
      setData(res || { top_modules: [], attention_modules: [] });
    } catch (err) {
      console.error('Erreur chargement analyse des modules:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const topModules = data.top_modules || [];
  const attentionModules = data.attention_modules || [];

  return (
    <MainLayout>
      {/* En-tête */}
      <HeaderBar title="Analyse des modules" currentAnnee="2024–2025" />

      {/* Barre de filtres (sans résultat) */}
      <FiltersBar filters={filters} onChange={setFilters} />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-3xl border border-cream-200">
          <Loader2 size={28} className="animate-spin text-navy-600" />
          <p className="text-xs text-ink/50">Chargement de l'analyse des modules...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ============================================================ */}
          {/* CARD 1 : Modules les plus performants                         */}
          {/* ============================================================ */}
          <div className="bg-white rounded-3xl border border-cream-200 shadow-xs overflow-hidden p-6 md:p-8">
            <h2 className="text-sm md:text-base font-bold text-ink mb-6">
              Modules les plus performants
            </h2>

            {topModules.length === 0 ? (
              <p className="text-xs text-ink/50 py-4">Aucune donnée disponible pour cette sélection.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-cream-200/80 bg-cream-50/50 text-[11px] font-bold text-ink/50 uppercase tracking-wider">
                      <th className="py-3 px-6">Module</th>
                      <th className="py-3 px-6">Moyenne</th>
                      <th className="py-3 px-6">Taux de Réussite</th>
                      <th className="py-3 px-6">Étudiants</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-100 text-xs">
                    {topModules.map((row, idx) => (
                      <tr key={idx} className="hover:bg-cream-50/30 transition-colors">
                        <td className="py-4 px-6 font-semibold text-ink text-[13px]">
                          {row.module}
                        </td>
                        <td className="py-4 px-6 font-semibold text-ink">
                          {row.moyenne !== null ? Number(row.moyenne).toFixed(1) : '—'}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-28 md:w-36 h-2 bg-cream-200 rounded-full overflow-hidden shrink-0">
                              <div
                                className="h-full bg-navy-700 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(0, row.taux_reussite))}%` }}
                              />
                            </div>
                            <span className="font-semibold text-ink text-xs">
                              {row.taux_reussite}%
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-normal text-ink/80">
                          {row.etudiants}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* CARD 2 : Modules nécessitant une attention                    */}
          {/* ============================================================ */}
          <div className="bg-white rounded-3xl border border-cream-200 shadow-xs overflow-hidden p-6 md:p-8">
            <h2 className="text-sm md:text-base font-bold text-ink mb-6">
              Modules nécessitant une attention
            </h2>

            {attentionModules.length === 0 ? (
              <p className="text-xs text-ink/50 py-4">Aucune donnée disponible pour cette sélection.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-cream-200/80 bg-cream-50/50 text-[11px] font-bold text-ink/50 uppercase tracking-wider">
                      <th className="py-3 px-6">Module</th>
                      <th className="py-3 px-6">Moyenne</th>
                      <th className="py-3 px-6">Taux de Réussite</th>
                      <th className="py-3 px-6">Taux d'Échec</th>
                      <th className="py-3 px-6">Risque</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-100 text-xs">
                    {attentionModules.map((row, idx) => {
                      const isLowMoy = row.moyenne !== null && row.moyenne < 10.0;
                      const isLowTaux = row.taux_reussite < 55;

                      return (
                        <tr key={idx} className="hover:bg-cream-50/30 transition-colors">
                          <td className="py-4 px-6 font-semibold text-ink text-[13px]">
                            {row.module}
                          </td>
                          <td
                            className={`py-4 px-6 ${
                              isLowMoy ? 'font-bold text-maroon-600' : 'font-semibold text-ink'
                            }`}
                          >
                            {row.moyenne !== null ? Number(row.moyenne).toFixed(1) : '—'}
                          </td>
                          <td
                            className={`py-4 px-6 ${
                              isLowTaux ? 'font-bold text-maroon-600' : 'font-semibold text-ink'
                            }`}
                          >
                            {row.taux_reussite}%
                          </td>
                          <td className="py-4 px-6 font-normal text-ink/80">
                            {row.taux_echec}%
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                                row.risque === 'Élevé'
                                  ? 'bg-maroon-50 text-maroon-600 border border-maroon-200/60'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200/60'
                              }`}
                            >
                              {row.risque}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </MainLayout>
  );
}
