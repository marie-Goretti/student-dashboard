import { useState, useEffect, useCallback, useMemo } from 'react';
import MainLayout from '../components/layout/MainLayout';
import HeaderBar from '../components/layout/HeaderBar';
import FiltersBar from '../components/dashboard/FiltersBar';
import { getAnalyseRattrapages } from '../api/dashboardService';
import {
  Users,
  BookOpen,
  TrendingUp,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function RattrapagesPage() {
  const [filters, setFilters] = useState({});
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAnalyseRattrapages(filters);
      setData(res);
      setCurrentPage(1);
    } catch (err) {
      console.error('Erreur chargement analyse des rattrapages:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Données par défaut ou issues de l'API
  const kpi = data?.kpi || {
    etudiants_concernes: 1245,
    modules_concernes: 68,
    taux_reussite: 62.3,
    taux_echec: 37.7,
  };

  const synthese = data?.synthese || {
    moyenne_avant: 7.8,
    gain_moyen: 3.4,
    moyenne_apres: 11.2,
  };

  const chartData = useMemo(() => {
    if (data?.par_niveau && data.par_niveau.length > 0) {
      return data.par_niveau;
    }
    return [
      { niveau: 'B2SI', avant: 7.6, apres: 11.4 },
      { niveau: 'M1SI', avant: 7.2, apres: 11.1 },
      { niveau: 'M2M', avant: 6.8, apres: 9.8 },
      { niveau: 'M1M', avant: 7.5, apres: 10.9 },
    ];
  }, [data]);

  const allStudents = useMemo(() => {
    if (data?.etudiants && data.etudiants.length > 0) {
      return data.etudiants;
    }
    return [
      { id_eval: 1, etudiant: 'KODJO Samuel', module: 'Finance', avant: 6.2, apres: 11.5, evolution: '+5.3', resultat: 'Admis' },
      { id_eval: 2, etudiant: 'ADJAHO Marie', module: 'Droit', avant: 6.1, apres: 12.0, evolution: '+5.9', resultat: 'Admis' },
      { id_eval: 3, etudiant: 'GBEDE Kani', module: 'Comptabilité', avant: 7.4, apres: 10.8, evolution: '+3.4', resultat: 'Admis' },
      { id_eval: 4, etudiant: 'TOHALLA Ahoué', module: 'Marketing', avant: 5.8, apres: 9.7, evolution: '+3.9', resultat: 'Refusé' },
      { id_eval: 5, etudiant: 'MENSAH Flora', module: 'Finance', avant: 7.0, apres: 13.2, evolution: '+6.2', resultat: 'Admis' },
      { id_eval: 6, etudiant: 'DOSSOU Patrick', module: 'Mathématiques', avant: 4.5, apres: 7.8, evolution: '+3.3', resultat: 'Refusé' },
      { id_eval: 7, etudiant: 'HOUNTO Edwige', module: 'Droit', avant: 3.8, apres: 8.9, evolution: '+5.1', resultat: 'Refusé' },
      { id_eval: 8, etudiant: 'SOKPOH René', module: 'Comptabilité', avant: 8.2, apres: 11.5, evolution: '+3.3', resultat: 'Admis' },
    ];
  }, [data]);

  // Filtrage par recherche
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return allStudents;
    const term = searchTerm.toLowerCase();
    return allStudents.filter(
      (s) =>
        s.etudiant.toLowerCase().includes(term) ||
        s.module.toLowerCase().includes(term) ||
        s.resultat.toLowerCase().includes(term)
    );
  }, [allStudents, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Tooltip personnalisé pour le bar chart
  const CustomChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const apresVal = payload.find((p) => p.dataKey === 'apres')?.value;
      const avantVal = payload.find((p) => p.dataKey === 'avant')?.value;
      const gain =
        apresVal !== undefined && avantVal !== undefined
          ? (Number(apresVal) - Number(avantVal)).toFixed(1)
          : null;

      return (
        <div className="bg-white rounded-xl shadow-lg border border-cream-200 p-3 text-xs">
          <p className="font-bold text-ink mb-1.5">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-ink/70">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#223A57]" />
                Après rattrapage :
              </span>
              <span className="font-bold text-ink">{apresVal !== undefined ? `${apresVal}/20` : '—'}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-ink/70">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ECE7DD]" />
                Avant rattrapage :
              </span>
              <span className="font-medium text-ink">{avantVal !== undefined ? `${avantVal}/20` : '—'}</span>
            </div>
            {gain !== null && (
              <p className="text-ink/60 border-t border-cream-200 pt-1 mt-1 text-[11px]">
                Progression :{' '}
                <span className={Number(gain) >= 0 ? 'text-navy-600 font-bold' : 'text-maroon-500 font-bold'}>
                  {Number(gain) >= 0 ? `+${gain}` : gain} pts
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
    <MainLayout>
      {/* 1. HeaderBar fidèle à EduPulse */}
      <HeaderBar
        title="Analyse des rattrapages"
        subtitle="Année académique 2024–2025"
      />

      {/* 2. Filtres : Année, Programme, Niveau, Module + Réinitialiser */}
      <FiltersBar
        filters={filters}
        onChange={setFilters}
        showAnnee={true}
        showProgramme={true}
        showNiveau={true}
        showModule={true}
        showSemestre={false}
      />

      {/* 3. Les 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Carte 1 : Étudiants concernés */}
        <div className="bg-white rounded-2xl border border-cream-200 p-5 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-cream-100 flex items-center justify-center text-ink/60 mb-3">
            <Users size={18} />
          </div>
          <div className="text-2xl font-bold text-ink tracking-tight font-sans">
            {kpi.etudiants_concernes?.toLocaleString('fr-FR') || '1 245'}
          </div>
          <div className="text-xs text-ink/50 mt-1">Étudiants concernés</div>
        </div>

        {/* Carte 2 : Modules concernés */}
        <div className="bg-white rounded-2xl border border-cream-200 p-5 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-cream-100 flex items-center justify-center text-ink/60 mb-3">
            <BookOpen size={18} />
          </div>
          <div className="text-2xl font-bold text-ink tracking-tight font-sans">
            {kpi.modules_concernes?.toLocaleString('fr-FR') || '68'}
          </div>
          <div className="text-xs text-ink/50 mt-1">Modules concernés</div>
        </div>

        {/* Carte 3 : Taux de réussite */}
        <div className="bg-white rounded-2xl border border-cream-200 p-5 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-cream-100 flex items-center justify-center text-ink/60 mb-3">
            <TrendingUp size={18} />
          </div>
          <div className="text-2xl font-bold text-ink tracking-tight font-sans">
            {String(kpi.taux_reussite ?? 62.3).replace('.', ',')}%
          </div>
          <div className="text-xs text-ink/50 mt-1">Taux de réussite</div>
        </div>

        {/* Carte 4 : Taux d'échec après rattrapage */}
        <div className="bg-white rounded-2xl border border-cream-200 p-5 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-cream-100 flex items-center justify-center text-maroon-500 mb-3">
            <XCircle size={18} />
          </div>
          <div className="text-2xl font-bold text-ink tracking-tight font-sans">
            {String(kpi.taux_echec ?? 37.7).replace('.', ',')}%
          </div>
          <div className="text-xs text-ink/50 mt-1">Taux d'échec après rattrapage</div>
        </div>
      </div>

      {/* 4. Section Principale : 2 colonnes (Avant/Après rattrapage vs Détail des rattrapages) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Colonne gauche : Avant / Après rattrapage */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-cream-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-ink text-[15px] tracking-tight mb-4">
              Avant / Après rattrapage
            </h3>

            {/* 3 Blocs Synthèse */}
            <div className="grid grid-cols-3 gap-2.5 mb-6">
              {/* Moyenne avant */}
              <div className="bg-cream-100/70 rounded-xl p-3 text-center border border-cream-200/50">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-xl font-bold text-ink font-sans">
                    {String(synthese.moyenne_avant ?? 7.8).replace('.', ',')}
                  </span>
                  <span className="text-xs text-ink/40">/20</span>
                </div>
                <div className="text-[11px] text-ink/50 mt-0.5 font-medium">
                  Moyenne avant
                </div>
              </div>

              {/* Gain moyen Rattrapage */}
              <div className="bg-cream-100/70 rounded-xl p-3 text-center border border-cream-200/50">
                <div className="text-xl font-bold text-navy-600 font-sans">
                  +{String(synthese.gain_moyen ?? 3.4).replace('.', ',')} pts
                </div>
                <div className="text-[10px] text-ink/40 leading-none">gain moyen</div>
                <div className="text-[11px] text-ink/50 mt-1 font-medium">
                  Rattrapage
                </div>
              </div>

              {/* Moyenne après */}
              <div className="bg-cream-100/70 rounded-xl p-3 text-center border border-cream-200/50">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-xl font-bold text-ink font-sans">
                    {String(synthese.moyenne_apres ?? 11.2).replace('.', ',')}
                  </span>
                  <span className="text-xs text-ink/40">/20</span>
                </div>
                <div className="text-[11px] text-ink/50 mt-0.5 font-medium">
                  Moyenne après
                </div>
              </div>
            </div>

            {/* Graphe en barres comparatif */}
            <div className="h-[220px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  barGap={4}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="#EFEAE0"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="niveau"
                    tick={{ fontSize: 11, fill: '#0B1220', fillOpacity: 0.7 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 14]}
                    ticks={[0, 4, 8, 14]}
                    tick={{ fontSize: 11, fill: '#0B1220', fillOpacity: 0.5 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar
                    dataKey="avant"
                    name="Avant rattrapage"
                    fill="#F1EFEA"
                    barSize={14}
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="apres"
                    name="Après rattrapage"
                    fill="#223A57"
                    barSize={14}
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Légende en bas du graphe */}
          <div className="flex items-center justify-center gap-5 pt-3 border-t border-cream-100 text-xs">
            <div className="flex items-center gap-1.5 text-ink/75 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#223A57]" />
              Après rattrapage
            </div>
            <div className="flex items-center gap-1.5 text-ink/50 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E5E0D5]" />
              Avant rattrapage
            </div>
          </div>
        </div>

        {/* Colonne droite : Détail des rattrapages */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-cream-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h3 className="font-bold text-ink text-[15px] tracking-tight">
                Détail des rattrapages
              </h3>

              {/* Champ de recherche rapide */}
              <div className="flex items-center gap-2 bg-cream-100/60 rounded-full px-3 py-1 border border-cream-200 text-xs w-48 md:w-56">
                <Search size={13} className="text-ink/40 shrink-0" />
                <input
                  type="text"
                  placeholder="Filtrer étudiant ou module..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs w-full outline-none placeholder:text-ink/40 text-ink"
                />
              </div>
            </div>

            {/* Tableau */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-cream-200 text-ink/50 font-semibold text-[11px]">
                    <th className="text-left py-2 px-2 uppercase tracking-wider">
                      Étudiant
                    </th>
                    <th className="text-left py-2 px-2 uppercase tracking-wider">
                      Module
                    </th>
                    <th className="text-center py-2 px-2 uppercase tracking-wider">
                      Avant
                    </th>
                    <th className="text-center py-2 px-2 uppercase tracking-wider">
                      Après
                    </th>
                    <th className="text-center py-2 px-2 uppercase tracking-wider">
                      Évolution
                    </th>
                    <th className="text-right py-2 px-2 uppercase tracking-wider">
                      Résultat
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-100">
                  {paginatedStudents.length > 0 ? (
                    paginatedStudents.map((item, idx) => {
                      const isAdmis = item.resultat === 'Admis';
                      return (
                        <tr
                          key={item.id_eval || idx}
                          className="hover:bg-cream-100/40 transition-colors"
                        >
                          <td className="py-2.5 px-2 font-medium text-ink">
                            {item.etudiant}
                          </td>
                          <td className="py-2.5 px-2 text-ink/75">
                            {item.module}
                          </td>
                          <td className="py-2.5 px-2 text-center text-ink/70">
                            {typeof item.avant === 'number'
                              ? item.avant.toFixed(1)
                              : item.avant}
                          </td>
                          <td className="py-2.5 px-2 text-center font-semibold text-ink">
                            {typeof item.apres === 'number'
                              ? item.apres.toFixed(1)
                              : item.apres}
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold text-navy-600">
                            {item.evolution}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                isAdmis
                                  ? 'bg-[#E8F5E9] text-[#2E7D32]'
                                  : 'bg-[#FFEBEE] text-[#C62828]'
                              }`}
                            >
                              {item.resultat}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-xs text-ink/40"
                      >
                        Aucun étudiant correspondant trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination si plus d'une page */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-cream-100 text-xs text-ink/60">
              <span>
                Affichage de {(currentPage - 1) * pageSize + 1} à{' '}
                {Math.min(currentPage * pageSize, filteredStudents.length)} sur{' '}
                {filteredStudents.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded-lg hover:bg-cream-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-semibold text-ink px-1.5">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded-lg hover:bg-cream-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
