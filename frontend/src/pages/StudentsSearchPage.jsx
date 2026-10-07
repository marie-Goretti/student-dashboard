import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import HeaderBar from '../components/layout/HeaderBar';
import FiltersBar from '../components/dashboard/FiltersBar';
import { getAnalyseEtudiants } from '../api/dashboardService';
import { Search, Loader2 } from 'lucide-react';

export default function StudentsSearchPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAnalyseEtudiants(filters, search);
      setStudents(res || []);
    } catch (err) {
      console.error('Erreur chargement des étudiants:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  useEffect(() => {
    // Petit debounce pour la recherche textuelle
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  return (
    <MainLayout>
      {/* En-tête */}
      <HeaderBar title="Étudiants" currentAnnee="2024–2025" />

      {/* Barre de filtres (sans résultat, sans année) */}
      <FiltersBar
        filters={filters}
        onChange={setFilters}
        showAnnee={false}
      />

      {/* Card principale avec Recherche et Tableau des étudiants */}
      <div className="bg-white rounded-3xl border border-cream-200 shadow-xs overflow-hidden p-6 md:p-8">
        {/* Champ de recherche interne */}
        <div className="flex items-center gap-2.5 bg-[#FAF8F5] border border-cream-200 rounded-xl px-4 py-2.5 mb-6 max-w-md shadow-2xs">
          <Search size={16} className="text-ink/40 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un étudiant, matricule ou nom..."
            className="bg-transparent text-xs md:text-sm w-full outline-none placeholder:text-ink/40 text-ink"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={28} className="animate-spin text-navy-600" />
            <p className="text-xs text-ink/50">Recherche des étudiants en cours...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-xs text-ink/50">
            Aucun étudiant ne correspond à ces critères.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-cream-200/80 bg-cream-50/50 text-[11px] font-bold text-ink/50 uppercase tracking-wider">
                  <th className="py-3 px-6">Nom & Prénom</th>
                  <th className="py-3 px-6">Niveau</th>
                  <th className="py-3 px-6">Moyenne</th>
                  <th className="py-3 px-6">Modules Validés</th>
                  <th className="py-3 px-6">En Difficulté</th>
                  <th className="py-3 px-6">Rattrapage</th>
                  <th className="py-3 px-6">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100 text-xs">
                {students.map((student) => {
                  const isMoyLow = student.moyenne !== null && student.moyenne < 10.0;
                  const isRefuse = student.statut === 'Refusé';
                  const hasRattrapage = student.rattrapage === 'Oui';
                  const hasDifficulte = student.en_difficulte > 0;

                  return (
                    <tr
                      key={student.id_etu}
                      onClick={() => navigate(`/students/${student.id_etu}`)}
                      className="hover:bg-cream-50/40 transition-colors cursor-pointer"
                      title="Cliquer pour voir la fiche détaillée de l'étudiant"
                    >
                      {/* Nom & Prénom + Initiales + Matricule */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#1E3A5F] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
                            {student.initiales || 'ET'}
                          </div>
                          <div>
                            <div className="font-bold text-ink text-[13px] leading-tight">
                              {student.nom_complet || `${student.nom} ${student.prenom}`}
                            </div>
                            <div className="text-[11px] font-mono text-ink/50 mt-0.5">
                              {student.matricule}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Niveau */}
                      <td className="py-3.5 px-6 font-medium text-ink/80 text-xs">
                        {student.niveau || '—'}
                      </td>

                      {/* Moyenne */}
                      <td
                        className={`py-3.5 px-6 ${
                          isMoyLow ? 'font-bold text-maroon-600' : 'font-bold text-ink'
                        }`}
                      >
                        {student.moyenne !== null ? Number(student.moyenne).toFixed(1) : '—'}
                      </td>

                      {/* Modules Validés */}
                      <td className="py-3.5 px-6 font-normal text-ink/80">
                        {student.modules_valides}
                      </td>

                      {/* En Difficulté */}
                      <td
                        className={`py-3.5 px-6 ${
                          hasDifficulte ? 'font-semibold text-maroon-600' : 'font-normal text-ink/80'
                        }`}
                      >
                        {student.en_difficulte}
                      </td>

                      {/* Rattrapage */}
                      <td
                        className={`py-3.5 px-6 ${
                          hasRattrapage ? 'font-semibold text-maroon-600' : 'font-normal text-ink/60'
                        }`}
                      >
                        {student.rattrapage}
                      </td>

                      {/* Statut */}
                      <td
                        className={`py-3.5 px-6 ${
                          isRefuse ? 'font-semibold text-maroon-600' : 'font-medium text-ink/80'
                        }`}
                      >
                        {student.statut}
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