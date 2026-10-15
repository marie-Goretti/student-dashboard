import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Info,
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
import { getAnnees } from '../api/academicsService';

export default function RattrapagesPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({});
  const [isReady, setIsReady] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Charger la dernière année (la plus élevée) par défaut
  useEffect(() => {
    getAnnees()
      .then((res) => {
        const list = (res.results ?? res)
          .filter((a) => a.annee_academique && a.annee_academique !== 'nan' && a.annee_academique !== 'None')
          .sort((a, b) => String(b.annee_academique).localeCompare(String(a.annee_academique)));
        if (list.length > 0) {
          setFilters({ id_annee: list[0].id_annee });
        }
        setIsReady(true);
      })
      .catch(() => setIsReady(true));
  }, []);

  const loadData = useCallback(async () => {
    if (!isReady) return;
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
  }, [filters, isReady]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Données 100% réelles issues de l'API (aucun mock factice)
  const kpi = data?.kpi || {
    etudiants_concernes: 0,
    modules_concernes: 0,
    taux_reussite: 0,
    taux_echec: 0,
  };

  const synthese = data?.synthese || {
    moyenne_avant: 0,
    gain_moyen: 0,
    moyenne_apres: 0,
  };

  const chartData = useMemo(() => {
    return data?.par_niveau || [];
  }, [data]);

  const allStudents = useMemo(() => {
    return data?.etudiants || [];
  }, [data]);

  // Filtrage par recherche
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return allStudents;
    const term = searchTerm.toLowerCase();
    return allStudents.filter(
      (s) =>
        (s.etudiant && s.etudiant.toLowerCase().includes(term)) ||
        (s.matricule && s.matricule.toLowerCase().includes(term)) ||
        (s.module && s.module.toLowerCase().includes(term)) ||
        (s.niveau && s.niveau.toLowerCase().includes(term)) ||
        (s.resultat && s.resultat.toLowerCase().includes(term))
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

      {/* 2. Filtres : Année, Programme, Niveau, Semestre, Module + Réinitialiser */}
      <FiltersBar
        filters={filters}
        onChange={setFilters}
        showAnnee={true}
        showProgramme={true}
        showNiveau={true}
        showSemestre={true}
        showModule={true}
        defaultLatestAnnee={true}
      />

      {/* 3. Les 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Carte 1 : Étudiants concernés */}
        <div className="bg-white rounded-2xl border border-cream-200 p-5 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-cream-100 flex items-center justify-center text-ink/60 mb-3">
            <Users size={18} />
          </div>
          <div className="text-2xl font-bold text-ink tracking-tight font-sans">
            {kpi.etudiants_concernes?.toLocaleString('fr-FR') ?? '0'}
          </div>
          <div className="text-xs text-ink/50 mt-1">Étudiants concernés</div>
        </div>

        {/* Carte 2 : Modules concernés */}
        <div className="bg-white rounded-2xl border border-cream-200 p-5 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-cream-100 flex items-center justify-center text-ink/60 mb-3">
            <BookOpen size={18} />
          </div>
          <div className="text-2xl font-bold text-ink tracking-tight font-sans">
            {kpi.modules_concernes?.toLocaleString('fr-FR') ?? '0'}
          </div>
          <div className="text-xs text-ink/50 mt-1">Modules concernés</div>
        </div>

        {/* Carte 3 : Taux de réussite */}
        <div className="bg-white rounded-2xl border border-cream-200 p-5 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-cream-100 flex items-center justify-center text-ink/60 mb-3">
            <TrendingUp size={18} />
          </div>
          <div className="text-2xl font-bold text-ink tracking-tight font-sans">
            {String(kpi.taux_reussite ?? 0).replace('.', ',')}%
          </div>
          <div className="text-xs text-ink/50 mt-1">Taux de réussite</div>
        </div>

        {/* Carte 4 : Taux d'échec après rattrapage */}
        <div className="bg-white rounded-2xl border border-cream-200 p-5 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-cream-100 flex items-center justify-center text-maroon-500 mb-3">
            <XCircle size={18} />
          </div>
          <div className="text-2xl font-bold text-ink tracking-tight font-sans">
            {String(kpi.taux_echec ?? 0).replace('.', ',')}%
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
                    {synthese.moyenne_avant !== null && synthese.moyenne_avant !== undefined
                      ? String(synthese.moyenne_avant).replace('.', ',')
                      : '—'}
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
                  {synthese.gain_moyen !== null && synthese.gain_moyen !== undefined
                    ? `${Number(synthese.gain_moyen) > 0 ? '+' : ''}${String(synthese.gain_moyen).replace('.', ',')} pts`
                    : '—'}
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
                    {synthese.moyenne_apres !== null && synthese.moyenne_apres !== undefined
                      ? String(synthese.moyenne_apres).replace('.', ',')
                      : '—'}
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
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div>
                <h3 className="font-bold text-ink text-[15px] tracking-tight">
                  Détail des rattrapages
                </h3>
              </div>

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
                    <th className="text-center py-2 px-1.5 uppercase tracking-wider" title="Note de devoir ramenée sur 20">
                      CC (/20)
                    </th>
                    <th className="text-center py-2 px-1.5 uppercase tracking-wider" title="Note obtenue à l'épreuve de rattrapage">
                      Rattrapage
                    </th>
                    <th className="text-center py-2 px-1.5 uppercase tracking-wider" title="Moyenne session normale">
                      Avant
                    </th>
                    <th className="text-center py-2 px-1.5 uppercase tracking-wider" title="Moyenne recalculée : 40% CC + 60% Rattrapage">
                      Moy. Après
                    </th>
                    <th className="text-center py-2 px-1.5 uppercase tracking-wider">
                      Gain
                    </th>
                    <th className="text-right py-2 px-2 uppercase tracking-wider">
                      Résultat
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-ink/50">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
                          <span>Chargement des données réelles de rattrapage...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedStudents.length > 0 ? (
                    paginatedStudents.map((item, idx) => {
                      const isAdmis = item.resultat === 'Admis' || Number(item.apres) >= 10.0;
                      return (
                        <tr
                          key={item.id_eval || idx}
                          className="hover:bg-cream-100/40 transition-colors"
                        >
                          <td
                            className="py-2.5 px-2 font-medium text-ink cursor-pointer hover:text-navy-700 transition"
                            onClick={() => item.id_etu && navigate(`/students/${item.id_etu}`)}
                          >
                            <div className="font-semibold">{item.etudiant}</div>
                            {item.matricule && (
                              <div className="text-[10px] text-ink/40 font-mono">{item.matricule}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-ink/75">
                            <div
                              className="font-medium cursor-pointer hover:text-navy-700 transition"
                              onClick={() => item.id_mod && navigate(`/modules/${item.id_mod}`)}
                            >
                              {item.module}
                            </div>
                            {item.niveau && (
                              <span
                                onClick={() => item.id_niv && navigate(`/niveaux/${item.id_niv}`)}
                                className="inline-block text-[10px] px-1.5 py-0.2 bg-cream-100 hover:bg-cream-200 cursor-pointer text-ink/70 rounded font-medium mt-0.5 transition"
                              >
                                {item.niveau}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-1.5 text-center text-ink/70 font-mono">
                            {item.note_devoir !== null && item.note_devoir !== undefined
                              ? Number(item.note_devoir).toFixed(1)
                              : '—'}
                          </td>
                          <td className="py-2.5 px-1.5 text-center font-bold text-navy-800 font-mono">
                            {item.note_rattrapage !== null && item.note_rattrapage !== undefined
                              ? Number(item.note_rattrapage).toFixed(1)
                              : '—'}
                          </td>
                          <td className="py-2.5 px-1.5 text-center text-ink/60 font-mono">
                            {typeof item.avant === 'number'
                              ? item.avant.toFixed(1)
                              : item.avant}
                          </td>
                          <td className="py-2.5 px-1.5 text-center font-black text-ink font-mono bg-cream-50/50">
                            {typeof item.apres === 'number'
                              ? item.apres.toFixed(1)
                              : item.apres}
                          </td>
                          <td className="py-2.5 px-1.5 text-center font-bold text-navy-600 font-mono">
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
                              {isAdmis ? 'Admis' : 'Refusé'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-10 text-center text-xs text-ink/40"
                      >
                        Aucun étudiant en rattrapage trouvé pour les critères sélectionnés.
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
