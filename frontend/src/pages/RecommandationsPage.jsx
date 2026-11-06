import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import HeaderBar from '../components/layout/HeaderBar';
import FiltersBar from '../components/dashboard/FiltersBar';
import { getRecommandations } from '../api/dashboardService';
import {
  exportDashboardToPdf,
  exportSingleRecommendationToPdf,
  exportRecommendationStudentsCsv,
} from '../utils/pdfExportService';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileDown,
  Filter,
  Loader2,
  Users,
  Search,
  Sparkles,
} from 'lucide-react';

export default function RecommandationsPage() {
  const navigate = useNavigate();
  const pageContainerRef = useRef(null);
  const [filters, setFilters] = useState({});
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openCards, setOpenCards] = useState({});
  const [openStudentTables, setOpenStudentTables] = useState({});
  const [studentSearchTerms, setStudentSearchTerms] = useState({});
  const [exportingRecId, setExportingRecId] = useState(null);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [completedActions, setCompletedActions] = useState(() => {
    try {
      const saved = localStorage.getItem('edupulse_completed_actions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'elevee' | 'moyenne' | 'positive'
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'matiere' | 'etudiant' | 'semestre'
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRecommandations(filters);
      setData(res);
      // Par défaut ouvrir les 2 premières recommandations prioritaires
      if (res?.recommandations && res.recommandations.length > 0) {
        const initialOpen = {};
        res.recommandations.slice(0, 2).forEach((r) => {
          initialOpen[r.id] = true;
        });
        setOpenCards(initialOpen);
      }
    } catch (err) {
      console.error('Erreur chargement recommandations:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const recommendations = useMemo(() => {
    return data?.recommandations || [];
  }, [data]);

  const toggleCard = (id) => {
    setOpenCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleStudentTable = (id) => {
    setOpenStudentTables((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleAction = (recId, actionIdx) => {
    const key = `${recId}-${actionIdx}`;
    setCompletedActions((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('edupulse_completed_actions', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleAll = (expand) => {
    const nextState = {};
    recommendations.forEach((r) => {
      nextState[r.id] = expand;
    });
    setOpenCards(nextState);
  };

  // Résumé textuel des filtres pour les exports
  const activeFilterSummary = useMemo(() => {
    const parts = [];
    if (filters.annee || filters.id_annee) {
      parts.push(`Année : ${filters.annee || filters.id_annee}`);
    }
    if (filters.filiere) parts.push(`Filière : ${String(filters.filiere).toUpperCase()}`);
    if (filters.niveau) parts.push(`Niveau : ${filters.niveau}`);
    if (filters.semestre) parts.push(`Semestre : S${String(filters.semestre).replace(/\D/g, '')}`);
    if (filters.module) parts.push(`Module : ${filters.module}`);
    return parts.length > 0 ? parts.join(' • ') : 'Toutes les cohortes';
  }, [filters]);

  // Export individuel d'une recommandation en PDF
  const handleExportSinglePdf = async (rec) => {
    if (exportingRecId === rec.id) return;
    setExportingRecId(rec.id);
    try {
      await exportSingleRecommendationToPdf(rec, activeFilterSummary);
    } catch (err) {
      console.error('Erreur export recommandation:', err);
      alert("Une erreur est survenue lors de l'exportation de la recommandation.");
    } finally {
      setExportingRecId(null);
    }
  };

  // Export CSV de la liste des étudiants concernés par une recommandation
  const handleExportStudentsCsv = (rec) => {
    try {
      exportRecommendationStudentsCsv(rec);
    } catch (err) {
      console.error('Erreur export étudiants CSV:', err);
      alert("Impossible d'exporter la liste des étudiants.");
    }
  };

  // Export global de l'ensemble des recommandations visibles
  const handleExportAllPdf = async () => {
    if (isExportingAll) return;
    setIsExportingAll(true);
    try {
      const target = pageContainerRef.current || document.getElementById('recommandations-container');
      const filename = `rapport_recommandations_lbs_${new Date().toISOString().slice(0, 10)}.pdf`;
      await exportDashboardToPdf(target, filename);
    } catch (err) {
      console.error('Erreur export global PDF:', err);
      window.print();
    } finally {
      setIsExportingAll(false);
    }
  };

  // Filtrage combiné par priorité, catégorie et recherche textuelle
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((r) => {
      // Filtre priorité
      if (activeTab !== 'all') {
        if (activeTab === 'positive' && !r.is_positive) return false;
        if (activeTab === 'elevee' && (r.priority !== 'elevee' || r.is_positive)) return false;
        if (activeTab === 'moyenne' && (r.priority !== 'moyenne' || r.is_positive)) return false;
      }

      // Filtre catégorie
      if (activeCategory !== 'all') {
        if (r.category !== activeCategory) return false;
      }

      // Recherche libre
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = r.title?.toLowerCase().includes(term);
        const matchesDesc = r.description?.toLowerCase().includes(term);
        const matchesMatiere = r.matiere?.toLowerCase().includes(term);
        const matchesNiveau = r.niveau?.toLowerCase().includes(term);
        if (!matchesTitle && !matchesDesc && !matchesMatiere && !matchesNiveau) {
          return false;
        }
      }

      return true;
    });
  }, [recommendations, activeTab, activeCategory, searchTerm]);

  const getPriorityBadge = (rec) => {
    if (rec.is_positive) {
      return (
        <span className="text-[11px] font-semibold text-[#166534] bg-[#DCFCE7] border border-[#BBF7D0] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
          <Sparkles size={11} className="text-[#166534]" />
          {rec.priority_label || 'Succès'}
        </span>
      );
    }
    switch (rec.priority) {
      case 'elevee':
        return (
          <span className="text-[11px] font-semibold text-[#8B2323] bg-[#FBEBEC] border border-[#F8D7DA] px-2.5 py-0.5 rounded-full inline-block">
            {rec.priority_label || 'Priorité critique'}
          </span>
        );
      case 'moyenne':
      default:
        return (
          <span className="text-[11px] font-semibold text-[#9A6700] bg-[#FFF8E6] border border-[#FEEBC8] px-2.5 py-0.5 rounded-full inline-block">
            {rec.priority_label || 'Point de vigilance'}
          </span>
        );
    }
  };

  const getPriorityIcon = (rec) => {
    if (rec.is_positive) {
      return (
        <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
          <Award size={18} />
        </div>
      );
    }
    switch (rec.priority) {
      case 'elevee':
        return (
          <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-maroon-600 shrink-0">
            <AlertCircle size={18} />
          </div>
        );
      case 'moyenne':
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle size={18} />
          </div>
        );
    }
  };

  return (
    <MainLayout>
      <div ref={pageContainerRef} id="recommandations-container" className="space-y-4">
        {/* 0. En-tête institutionnel réservé à l'impression / Export PDF */}
        <div className="hidden print:block mb-4 pb-3 border-b-2 border-navy-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-navy-900 text-white flex items-center justify-center font-bold text-sm tracking-wider">
                LBS
              </div>
              <div>
                <div className="text-xl font-bold tracking-tight text-navy-950 font-serif leading-tight">
                  Lomé Business School
                </div>
                <div className="text-xs font-semibold text-maroon-700 tracking-wide">
                  Rapport Analytique des Recommandations & Plans d'Action Pédagogiques
                </div>
              </div>
            </div>
            <div className="text-right text-[11px] text-ink/70">
              <div>Exporté le <strong>{new Date().toLocaleDateString('fr-FR')}</strong> à <strong>{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong></div>
              <div className="text-[10px] text-navy-800 font-semibold mt-0.5">
                {activeFilterSummary}
              </div>
            </div>
          </div>
        </div>

        {/* 1. HeaderBar institutionnelle EduPulse avec export direct en PDF */}
        <HeaderBar
          title="Recommandations Pédagogiques & Décisionnelles"
          onExportPdf={handleExportAllPdf}
          isExporting={isExportingAll}
          exportLabel="Exporter le rapport global (PDF)"
        />

        {/* 2. Barre de filtres académiques */}
        <FiltersBar
          filters={filters}
          onChange={setFilters}
          showAnnee={true}
          showProgramme={true}
          showNiveau={true}
          showModule={true}
          showSemestre={true}
        />

        {/* 3. Description méthodologique & actions globales */}
        <div className="flex items-center justify-between gap-4 mb-2 mt-1 flex-wrap">
          <div>
            <p className="text-xs md:text-sm text-ink/75 font-medium">
              Recommandations pédagogiques et plans d'action générés automatiquement.
            </p>
            <p className="text-[11px] text-ink/45 mt-0.5">
              Seuils d'alerte et critiques • Devoirs, examens, validation et suivi semestriel • Fiches exportables
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleAll(true)}
              className="text-xs text-ink/60 hover:text-ink font-medium px-2.5 py-1 rounded-lg hover:bg-cream-100 transition cursor-pointer"
            >
              Tout déplier
            </button>
            <span className="text-ink/20">|</span>
            <button
              onClick={() => toggleAll(false)}
              className="text-xs text-ink/60 hover:text-ink font-medium px-2.5 py-1 rounded-lg hover:bg-cream-100 transition cursor-pointer"
            >
              Tout replier
            </button>
          </div>
        </div>

        {/* 4. Filtres par Priorité et Recherche */}
        <div className="bg-white rounded-2xl border border-cream-200 p-3 mb-5 shadow-xs space-y-3 print:hidden">
          {/* Ligne 1 : Onglets Priorités */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-ink/40 font-medium flex items-center gap-1 shrink-0 mr-1">
                <Filter size={13} /> Priorité :
              </span>

              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-full font-medium transition cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-navy-600 text-white shadow-xs'
                    : 'bg-cream-100/60 text-ink/70 hover:bg-cream-100'
                }`}
              >
                Toutes ({recommendations.length})
              </button>

              <button
                onClick={() => setActiveTab('elevee')}
                className={`px-3 py-1.5 rounded-full font-medium transition cursor-pointer ${
                  activeTab === 'elevee'
                    ? 'bg-maroon-500 text-white shadow-xs'
                    : 'bg-cream-100/60 text-ink/70 hover:bg-cream-100'
                }`}
              >
                Priorités critiques & élevées ({recommendations.filter((r) => r.priority === 'elevee' && !r.is_positive).length})
              </button>

              <button
                onClick={() => setActiveTab('moyenne')}
                className={`px-3 py-1.5 rounded-full font-medium transition cursor-pointer ${
                  activeTab === 'moyenne'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-cream-100/60 text-ink/70 hover:bg-cream-100'
                }`}
              >
                Points de vigilance ({recommendations.filter((r) => r.priority === 'moyenne' && !r.is_positive).length})
              </button>

              <button
                onClick={() => setActiveTab('positive')}
                className={`px-3 py-1.5 rounded-full font-medium transition cursor-pointer ${
                  activeTab === 'positive'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-cream-100/60 text-ink/70 hover:bg-cream-100'
                }`}
              >
                Succès & Progrès ({recommendations.filter((r) => r.is_positive).length})
              </button>
            </div>

            {/* Recherche libre */}
            <div className="flex items-center gap-2 bg-cream-100/50 rounded-xl px-3 py-1.5 border border-cream-200 text-xs w-full sm:w-64">
              <Search size={14} className="text-ink/40 shrink-0" />
              <input
                type="text"
                placeholder="Rechercher matière, niveau, mot-clé..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-xs w-full outline-none placeholder:text-ink/40 text-ink"
              />
            </div>
          </div>

          {/* Ligne 2 : Filtres par Catégorie */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pt-1 border-t border-cream-100">
            <span className="text-ink/40 font-medium shrink-0 mr-1">Catégorie :</span>
            {[
              { id: 'all', label: 'Toutes catégories' },
              { id: 'matiere', label: 'Matières & Modules' },
              { id: 'etudiant', label: 'Étudiants & Validation' },
              { id: 'semestre', label: 'Évolution entre semestres' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-medium shrink-0 ${
                  activeCategory === cat.id
                    ? 'bg-ink text-white'
                    : 'bg-white border border-cream-200 text-ink/60 hover:text-ink hover:bg-cream-100/50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Liste des Cartes de Recommandations */}
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-3xl border border-cream-200">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-navy-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-ink/50">Analyse pédagogique en cours...</p>
            </div>
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className="bg-white rounded-3xl border border-cream-200 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-cream-100 flex items-center justify-center text-ink/40 mx-auto mb-3">
              <CheckCircle2 size={24} className="text-emerald-500" />
            </div>
            <h3 className="text-base font-bold text-ink">Aucune recommandation correspondante</h3>
            <p className="text-xs text-ink/50 max-w-md mx-auto mt-1">
              {data?.info_message ||
                "Toutes les métriques analysées pour cette sélection sont conformes ou les filtres choisis ne contiennent aucun signal d'alerte."}
            </p>
            {(activeTab !== 'all' || activeCategory !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setActiveTab('all');
                  setActiveCategory('all');
                  setSearchTerm('');
                }}
                className="mt-4 px-4 py-2 bg-navy-600 text-white rounded-xl text-xs font-semibold hover:bg-navy-700 transition"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecommendations.map((rec) => {
              const isOpen = !!openCards[rec.id];
              const isTableOpen = !!openStudentTables[rec.id];
              const currentStudentSearch = studentSearchTerms[rec.id] || '';
              const isExportingThis = exportingRecId === rec.id;

              // Échantillon filtré d'étudiants
              const sampleFiltered = (rec.etudiants_sample || rec.students_sample || []).filter((s) => {
                if (!currentStudentSearch.trim()) return true;
                const term = currentStudentSearch.toLowerCase();
                return (
                  s.etudiant?.toLowerCase().includes(term) ||
                  s.matricule?.toLowerCase().includes(term) ||
                  (s.matieres && s.matieres.some((m) => m.toLowerCase().includes(term)))
                );
              });

              return (
                <div
                  id={rec.id}
                  key={rec.id}
                  className={`bg-white rounded-2xl border shadow-xs transition-all duration-200 overflow-hidden ${
                    rec.is_positive
                      ? 'border-emerald-200 hover:border-emerald-300'
                      : rec.priority === 'elevee'
                      ? 'border-red-200 hover:border-red-300'
                      : 'border-cream-200 hover:border-cream-300'
                  }`}
                >
                  {/* En-tête de la recommandation avec action d'export dédiée */}
                  <div
                    className={`w-full p-4 sm:p-5 flex items-start justify-between gap-3 select-none ${
                      rec.is_positive ? 'bg-gradient-to-r from-emerald-50/30 to-white' : ''
                    }`}
                  >
                    {/* Zone gauche cliquable pour plier/déplier */}
                    <div
                      onClick={() => toggleCard(rec.id)}
                      className="flex items-start gap-3 sm:gap-4 flex-1 cursor-pointer min-w-0"
                    >
                      {/* Icône de priorité */}
                      {getPriorityIcon(rec)}

                      {/* Contenu titre & diagnostic */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        {/* Ligne des badges d'identification (SANS BADGE DE RÈGLE) */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {getPriorityBadge(rec)}

                          {rec.indicator_label && (
                            <span className="text-[11px] font-bold text-navy-700 bg-navy-50 px-2.5 py-0.5 rounded-full border border-navy-100">
                              {rec.indicator_label}
                            </span>
                          )}

                          {rec.threshold && (
                            <span className="text-[10px] font-mono text-ink/50 bg-cream-100/60 px-2 py-0.5 rounded">
                              Seuil : {rec.threshold}
                            </span>
                          )}

                          {/* Périmètre d'application */}
                          {rec.niveau && (
                            <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                              {rec.niveau}
                            </span>
                          )}
                          {rec.semestre && (
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                              Semestre {rec.semestre}
                            </span>
                          )}
                        </div>

                        {/* Titre de la recommandation */}
                        <h3 className="text-sm md:text-base font-bold text-ink tracking-tight font-sans">
                          {rec.title}
                        </h3>

                        {/* Constat / Diagnostic chiffré */}
                        <p className="text-xs md:text-sm text-ink/75 leading-relaxed font-normal">
                          <strong className="text-ink font-semibold">Constat : </strong>
                          {rec.description}
                        </p>
                      </div>
                    </div>

                    {/* Actions à droite : Bouton d'export individuel PDF + Chevron */}
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportSinglePdf(rec);
                        }}
                        disabled={isExportingThis}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-cream-200 text-ink shadow-2xs hover:bg-cream-100 hover:border-cream-300 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        title="Télécharger la fiche d'action de cette recommandation en PDF"
                        aria-label="Télécharger cette recommandation en PDF"
                      >
                        {isExportingThis ? (
                          <>
                            <Loader2 size={13} className="animate-spin text-maroon-600" />
                            <span className="hidden md:inline">Export...</span>
                          </>
                        ) : (
                          <>
                            <FileDown size={13} className="text-maroon-600" />
                            <span className="hidden sm:inline">Exporter</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleCard(rec.id)}
                        className="text-ink/40 hover:text-ink/70 transition p-1 cursor-pointer rounded-lg hover:bg-cream-100/60"
                        title={isOpen ? 'Replier la recommandation' : 'Déplier la recommandation'}
                        aria-label={isOpen ? 'Replier' : 'Déplier'}
                      >
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Corps déplié : Actions suggérées & Détails analytiques */}
                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-cream-100/80">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 items-stretch">
                        {/* Colonne gauche : Action recommandée & Checklist concrète */}
                        <div className="lg:col-span-7 flex flex-col justify-between">
                          <div>
                            {/* Recommandation principale officielle */}
                            <div
                              className={`rounded-xl p-3.5 border mb-4 ${
                                rec.is_positive
                                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                                  : rec.priority === 'elevee'
                                  ? 'bg-red-50/50 border-red-200 text-red-950'
                                  : 'bg-cream-100/60 border-cream-200 text-ink'
                              }`}
                            >
                              <span
                                className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${
                                  rec.is_positive
                                    ? 'text-emerald-700'
                                    : rec.priority === 'elevee'
                                    ? 'text-red-700'
                                    : 'text-navy-600'
                                }`}
                              >
                                Action Recommandée :
                              </span>
                              <p className="text-xs md:text-sm font-semibold leading-relaxed">
                                {rec.action_recommandee}
                              </p>
                            </div>

                            <h4 className="text-xs font-semibold text-ink uppercase tracking-wider mb-2.5">
                              Plan d'action applicable (cocher pour marquer comme réalisé)
                            </h4>

                            <div className="space-y-2">
                              {rec.actions?.map((action, idx) => {
                                const actionKey = `${rec.id}-${idx}`;
                                const isDone = !!completedActions[actionKey];

                                return (
                                  <div
                                    key={idx}
                                    onClick={() => toggleAction(rec.id, idx)}
                                    className={`flex items-start gap-2.5 p-2.5 rounded-xl transition cursor-pointer select-none border ${
                                      isDone
                                        ? 'bg-cream-100/40 border-transparent text-ink/40 line-through'
                                        : 'hover:bg-cream-100/60 border-cream-200/60 text-ink/85 bg-white'
                                    }`}
                                  >
                                    <CheckCircle2
                                      size={17}
                                      className={`shrink-0 mt-0.5 transition-colors ${
                                        isDone
                                          ? 'text-emerald-500 fill-emerald-100'
                                          : rec.is_positive
                                          ? 'text-emerald-600'
                                          : rec.priority === 'elevee'
                                          ? 'text-maroon-600'
                                          : 'text-amber-600'
                                      }`}
                                    />
                                    <span className="text-xs leading-snug">{action}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Colonne droite : Périmètre & Accès aux étudiants concernés */}
                        <div className="lg:col-span-5 flex flex-col justify-between">
                          <div className="bg-[#F8F6F1] rounded-2xl p-5 border border-cream-200/70 mb-4">
                            <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wider mb-2">
                              Périmètre d'application
                            </div>
                            <div className="space-y-1.5 text-xs text-ink/85">
                              {rec.matiere && (
                                <div className="flex items-center justify-between">
                                  <span className="text-ink/50">Matière :</span>
                                  <strong className="text-ink">{rec.matiere}</strong>
                                </div>
                              )}
                              {rec.niveau && (
                                <div className="flex items-center justify-between">
                                  <span className="text-ink/50">Niveau :</span>
                                  <strong className="text-ink">{rec.niveau}</strong>
                                </div>
                              )}
                              {rec.semestre && (
                                <div className="flex items-center justify-between">
                                  <span className="text-ink/50">Semestre :</span>
                                  <strong className="text-ink">{rec.semestre}</strong>
                                </div>
                              )}
                              {rec.annee_academique && (
                                <div className="flex items-center justify-between">
                                  <span className="text-ink/50">Année :</span>
                                  <strong className="text-ink">{rec.annee_academique}</strong>
                                </div>
                              )}
                              <div className="flex items-center justify-between pt-2 border-t border-cream-200/60">
                                <span className="text-ink/50">Élèves concernés :</span>
                                <strong className="text-ink">{rec.etudiants_count} étudiant(s)</strong>
                              </div>
                            </div>
                          </div>

                          {/* Bouton pour afficher la liste réelle des étudiants si échantillon disponible */}
                          {(rec.etudiants_sample || rec.students_sample) && (
                            <div className="bg-white rounded-xl border border-cream-200 p-3 shadow-2xs">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Users size={16} className="text-navy-600" />
                                  <span className="text-xs font-semibold text-ink">
                                    {rec.etudiants_count} étudiant(s) concerné(s)
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleStudentTable(rec.id)}
                                  className="text-xs font-semibold text-navy-600 hover:text-navy-800 underline cursor-pointer"
                                >
                                  {isTableOpen ? 'Masquer la liste' : 'Voir les étudiants'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tableau dépliable des étudiants réels */}
                      {isTableOpen && (rec.etudiants_sample || rec.students_sample) && (
                        <div className="mt-5 pt-4 border-t border-cream-200">
                          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                            <h5 className="text-xs font-bold text-ink uppercase tracking-wider">
                              Liste des étudiants identifiés ({sampleFiltered.length})
                            </h5>
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Bouton d'export direct CSV des étudiants */}
                              <button
                                type="button"
                                onClick={() => handleExportStudentsCsv(rec)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white border border-cream-200 text-ink hover:bg-cream-100 transition cursor-pointer shadow-2xs"
                                title="Télécharger la liste de ces étudiants en format CSV compatible Excel"
                              >
                                <Download size={12} className="text-maroon-600" />
                                <span>Export CSV</span>
                              </button>

                              {/* Barre de recherche dans le tableau */}
                              <div className="flex items-center gap-2 bg-cream-100/60 rounded-full px-3 py-1 border border-cream-200 text-xs w-56">
                                <Search size={13} className="text-ink/40 shrink-0" />
                                <input
                                  type="text"
                                  placeholder="Filtrer étudiant ou matricule..."
                                  value={currentStudentSearch}
                                  onChange={(e) =>
                                    setStudentSearchTerms((prev) => ({
                                      ...prev,
                                      [rec.id]: e.target.value,
                                    }))
                                  }
                                  className="bg-transparent text-xs w-full outline-none placeholder:text-ink/40 text-ink"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="overflow-x-auto rounded-xl border border-cream-200 bg-white shadow-2xs">
                            <table className="w-full text-xs">
                              <thead className="bg-cream-100/60 text-ink/60 font-semibold text-[11px] border-b border-cream-200">
                                <tr>
                                  <th className="text-left py-2.5 px-3">Étudiant</th>
                                  <th className="text-left py-2.5 px-3">Matricule</th>
                                  {rec.rule_number === 6 ? (
                                    <>
                                      <th className="text-center py-2.5 px-2">Matières non validées</th>
                                      <th className="text-left py-2.5 px-3">Détail des matières</th>
                                    </>
                                  ) : rec.rule_number === 7 ? (
                                    <>
                                      <th className="text-center py-2.5 px-2">Moyenne actuelle</th>
                                      <th className="text-center py-2.5 px-2">Points manquants</th>
                                    </>
                                  ) : (
                                    <>
                                      <th className="text-left py-2.5 px-3">Module</th>
                                      <th className="text-center py-2.5 px-2">Note / Statut</th>
                                    </>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-cream-100">
                                {sampleFiltered.map((st, sIdx) => (
                                  <tr key={sIdx} className="hover:bg-cream-100/30 transition">
                                    <td className="py-2.5 px-3 font-semibold text-ink">
                                      {(st.id_etu || (st.matricule && st.matricule !== 'MASQUÉ')) ? (
                                        <button
                                          onClick={() => navigate(`/students/${st.id_etu || st.matricule}`)}
                                          className="text-left font-semibold text-navy-800 hover:text-navy-950 hover:underline cursor-pointer transition-colors"
                                          title="Voir la fiche détaillée de l'étudiant"
                                        >
                                          {st.etudiant}
                                        </button>
                                      ) : (
                                        st.etudiant
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-ink/60 font-mono text-[11px]">
                                      {(st.id_etu || (st.matricule && st.matricule !== 'MASQUÉ')) ? (
                                        <button
                                          onClick={() => navigate(`/students/${st.id_etu || st.matricule}`)}
                                          className="text-left font-mono hover:text-maroon-700 hover:underline cursor-pointer transition-colors"
                                          title="Voir la fiche détaillée de l'étudiant"
                                        >
                                          {st.matricule}
                                        </button>
                                      ) : (
                                        st.matricule
                                      )}
                                    </td>
                                    {rec.rule_number === 6 ? (
                                      <>
                                        <td className="py-2.5 px-2 text-center font-bold text-maroon-600">
                                          {st.nb_non_valides}
                                        </td>
                                        <td className="py-2.5 px-3 text-ink/70">
                                          {st.matieres?.join(', ') || 'N/A'}
                                        </td>
                                      </>
                                    ) : rec.rule_number === 7 ? (
                                      <>
                                        <td className="py-2.5 px-2 text-center font-bold text-amber-700">
                                          {st.moyenne ? `${st.moyenne}/20` : '-'}
                                        </td>
                                        <td className="py-2.5 px-2 text-center font-bold text-maroon-600">
                                          {st.points_manquants ? `-${st.points_manquants} pt(s)` : '-'}
                                        </td>
                                      </>
                                    ) : (
                                      <>
                                        <td className="py-2.5 px-3 text-ink/80">{st.module || rec.matiere}</td>
                                        <td className="py-2.5 px-2 text-center font-semibold text-navy-700">
                                          {st.moyenne ?? '-'}
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Barre d'action d'exportation au bas de la fiche dépliée */}
                      <div className="mt-5 pt-3.5 border-t border-cream-200 flex items-center justify-between gap-3 flex-wrap">
                        <div className="text-[11px] text-ink/50">
                          Fiche décisionnelle officielle prête à être archivée ou transmise à la commission
                        </div>
                        <div className="flex items-center gap-2">
                          {(rec.etudiants_sample?.length > 0 || rec.students_sample?.length > 0) && (
                            <button
                              type="button"
                              onClick={() => handleExportStudentsCsv(rec)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-cream-100/70 border border-cream-200 text-ink hover:bg-cream-200/60 transition cursor-pointer"
                              title="Télécharger la liste des étudiants concernés au format CSV (Excel)"
                            >
                              <Download size={13} className="text-navy-700" />
                              <span>Liste étudiants (CSV)</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleExportSinglePdf(rec)}
                            disabled={isExportingThis}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-navy-900 text-white hover:bg-navy-800 transition shadow-xs cursor-pointer disabled:opacity-60"
                          >
                            {isExportingThis ? (
                              <>
                                <Loader2 size={13} className="animate-spin text-white" />
                                <span>Génération PDF...</span>
                              </>
                            ) : (
                              <>
                                <FileDown size={13} />
                                <span>Télécharger la fiche (PDF)</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pied de page institutionnel réservé à l'impression / Export PDF */}
        <div className="hidden print:flex items-center justify-between text-[10px] text-ink/50 pt-4 mt-6 border-t border-cream-200">
          <span>Lomé Business School • Plateforme de Pilotage Académique & Recommandations</span>
          <span>Document officiel généré pour suivi pédagogique</span>
        </div>
      </div>
    </MainLayout>
  );
}
