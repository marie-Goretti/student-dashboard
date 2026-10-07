import { useState, useEffect, useCallback } from 'react';
import MainLayout from '../components/layout/MainLayout';
import HeaderBar from '../components/layout/HeaderBar';
import FiltersBar from '../components/dashboard/FiltersBar';
import { getAnalyseNiveaux } from '../api/dashboardService';
import { Loader2 } from 'lucide-react';

export default function NiveauxPage() {
  const [filters, setFilters] = useState({});
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAnalyseNiveaux(filters);
      setData(res);
    } catch (err) {
      console.error('Erreur chargement analyse des niveaux:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getRiskBadge = (risque) => {
    switch (risque) {
      case 'Faible':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Faible
          </span>
        );
      case 'Moyen':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            Moyen
          </span>
        );
      case 'Élevé':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-maroon-600">
            <span className="w-1.5 h-1.5 rounded-full bg-maroon-500" />
            Élevé
          </span>
        );
      case 'Critique':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-maroon-700">
            <span className="w-1.5 h-1.5 rounded-full bg-maroon-700" />
            Critique
          </span>
        );
    }
  };

  return (
    <MainLayout>
      {/* En-tête de la page */}
      <HeaderBar title="Analyse des niveaux" currentAnnee="2024–2025" />

      {/* Barre de filtres (sans résultat, sans niveau car niveau est la dimension de ligne) */}
      <FiltersBar
        filters={filters}
        onChange={setFilters}
        showNiveau={false}
      />

      {/* Tableau d'analyse des niveaux */}
      <div className="bg-white rounded-3xl border border-cream-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 size={28} className="animate-spin text-navy-600" />
            <p className="text-xs text-ink/50">Chargement de l'analyse des niveaux...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-xs text-ink/50">
            Aucun niveau trouvé pour les filtres sélectionnés.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-cream-200/80 bg-cream-50/50 text-[11px] font-bold text-ink/50 uppercase tracking-wider">
                  <th className="py-4 px-6">Niveau</th>
                  <th className="py-4 px-6">Étudiants</th>
                  <th className="py-4 px-6">Moyenne Générale</th>
                  <th className="py-4 px-6">Taux de Réussite</th>
                  <th className="py-4 px-6">Taux d'Échec</th>
                  <th className="py-4 px-6">Rattrapages</th>
                  <th className="py-4 px-6">Niveau de Risque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100 text-xs">
                {data.map((row, idx) => {
                  const isMoyLow = row.moyenne !== null && row.moyenne < 10.0;
                  const isTauxLow = row.taux_reussite !== null && row.taux_reussite < 70.0;

                  return (
                    <tr
                      key={idx}
                      className="hover:bg-cream-50/40 transition-colors"
                    >
                      <td className="py-4 px-6 font-bold text-ink text-[13px]">
                        {row.niveau}
                      </td>
                      <td className="py-4 px-6 font-normal text-ink/80">
                        {row.etudiants}
                      </td>
                      <td
                        className={`py-4 px-6 ${
                          isMoyLow
                            ? 'font-bold text-maroon-600'
                            : 'font-normal text-ink/80'
                        }`}
                      >
                        {row.moyenne !== null ? Number(row.moyenne).toFixed(2) : '—'}
                      </td>
                      <td
                        className={`py-4 px-6 ${
                          isTauxLow
                            ? 'font-bold text-maroon-600'
                            : 'font-normal text-ink/80'
                        }`}
                      >
                        {row.taux_reussite !== null ? `${Number(row.taux_reussite).toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-4 px-6 font-normal text-ink/80">
                        {row.taux_echec !== null ? `${Number(row.taux_echec).toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-4 px-6 font-normal text-ink/80">
                        {row.rattrapages ?? 0}
                      </td>
                      <td className="py-4 px-6">
                        {getRiskBadge(row.risque)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
