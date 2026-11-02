import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import HeaderBar from '../components/layout/HeaderBar';
import FiltersBar from '../components/dashboard/FiltersBar';
import { getRecommandations } from '../api/dashboardService';
import {
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  Users,
  Search,
  BookOpen,
  Info,
  Sparkles,
  ArrowRight,
  Sliders,
  Scale,
  GraduationCap,
  Calendar,
} from 'lucide-react';

export default function RecommandationsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({});
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openCards, setOpenCards] = useState({});
  const [openStudentTables, setOpenStudentTables] = useState({});
  const [studentSearchTerms, setStudentSearchTerms] = useState({});
  const [completedActions, setCompletedActions] = useState(() => {
    try {
      const saved = localStorage.getItem('edupulse_completed_actions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'elevee' | 'moyenne' | 'faible' | 'positive'
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'matiere' | 'niveau' | 'semestre' | 'dispersion' | 'devoir_examen' | 'etudiant'
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

  const summary = useMemo(() => {
    return (
      data?.summary || {
        total_evaluations: 0,
        total_etudiants: 0,
        total_recommandations: 0,
        counts_by_priority: { elevee: 0, moyenne: 0, faible: 0, positive: 0 },
        counts_by_rule: {},
      }
    );
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

  // Filtrage combiné par priorité, catégorie et recherche textuelle
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((r) => {
      // Filtre priorité
      if (activeTab !== 'all') {
        if (activeTab === 'positive' && !r.is_positive) return false;
        if (activeTab !== 'positive' && (r.priority !== activeTab || r.is_positive)) return false;
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
            {rec.priority_label || 'Priorité élevée'}
          </span>
        );
      case 'moyenne':
        return (
          <span className="text-[11px] font-semibold text-[#9A6700] bg-[#FFF8E6] border border-[#FEEBC8] px-2.5 py-0.5 rounded-full inline-block">
            {rec.priority_label || 'Priorité moyenne'}
          </span>
        );
      case 'faible':
      default:
        return (
          <span className="text-[11px] font-semibold text-[#1F4B78] bg-[#EEF4FB] border border-[#D0E1FD] px-2.5 py-0.5 rounded-full inline-block">
            {rec.priority_label || 'Priorité faible'}
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
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle size={18} />
          </div>
        );
      case 'faible':
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-navy-50 border border-navy-200 flex items-center justify-center text-navy-600 shrink-0">
            <Info size={18} />
          </div>
        );
    }
  };

  return (
    <MainLayout>
      {/* 1. HeaderBar institutionnelle EduPulse */}
      <HeaderBar title="Recommandations Pédagogiques & Décisionnelles" />

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

      {/* 3. Bandeau supérieur avec statistiques clés */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-cream-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-ink/50 uppercase tracking-wider">
            Total Recommandations
          </div>
          <div className="text-2xl font-bold text-ink mt-1 font-sans">
            {summary.total_recommandations ?? recommendations.length}
          </div>
          <div className="text-[11px] text-ink/50 mt-0.5">
            Sur {summary.total_evaluations?.toLocaleString('fr-FR')} évaluations
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-red-100 p-4 shadow-xs bg-gradient-to-br from-white to-red-50/30">
          <div className="text-[11px] font-bold text-maroon-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-maroon-500" />
            Priorités Élevées
          </div>
          <div className="text-2xl font-bold text-maroon-700 mt-1 font-sans">
            {summary.counts_by_priority?.elevee ?? 0}
          </div>
          <div className="text-[11px] text-maroon-600/70 mt-0.5">
            Intervention urgente recommandée
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-amber-100 p-4 shadow-xs bg-gradient-to-br from-white to-amber-50/30">
          <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Points de Vigilance
          </div>
          <div className="text-2xl font-bold text-amber-800 mt-1 font-sans">
            {summary.counts_by_priority?.moyenne ?? 0}
          </div>
          <div className="text-[11px] text-amber-700/70 mt-0.5">
            Accompagnement pédagogique ciblé
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-xs bg-gradient-to-br from-white to-emerald-50/30">
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={12} className="text-emerald-600" />
            Succès & Progrès
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1 font-sans">
            {summary.counts_by_priority?.positive ?? recommendations.filter((r) => r.is_positive).length}
          </div>
          <div className="text-[11px] text-emerald-600/70 mt-0.5">
            Dynamiques positives constatées
          </div>
        </div>
      </div>

      {/* 4. Description méthodologique & actions globales */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <p className="text-xs md:text-sm text-ink/75 font-medium">
            Diagnostic pédagogique calculé automatiquement selon les 12 règles métier officielles.
          </p>
          <p className="text-[11px] text-ink/45 mt-0.5">
            Contrôle continu 40% • Examen 60% • Seuil de validation 10.0/20 • Échantillon minimum : 5 étudiants
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

      {/* 5. Filtres par Priorité et Recherche */}
      <div className="bg-white rounded-2xl border border-cream-200 p-3 mb-5 shadow-xs space-y-3">
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
              Élevée ({recommendations.filter((r) => r.priority === 'elevee' && !r.is_positive).length})
            </button>

            <button
              onClick={() => setActiveTab('moyenne')}
              className={`px-3 py-1.5 rounded-full font-medium transition cursor-pointer ${
                activeTab === 'moyenne'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-cream-100/60 text-ink/70 hover:bg-cream-100'
              }`}
            >
              Moyenne ({recommendations.filter((r) => r.priority === 'moyenne' && !r.is_positive).length})
            </button>

            <button
              onClick={() => setActiveTab('positive')}
              className={`px-3 py-1.5 rounded-full font-medium transition cursor-pointer ${
                activeTab === 'positive'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-cream-100/60 text-ink/70 hover:bg-cream-100'
              }`}
            >
              Succès & Améliorations ({recommendations.filter((r) => r.is_positive).length})
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
            { id: 'rattrapage', label: 'Rattrapages & Validation' },
            { id: 'niveau', label: 'Niveaux & Cohortes' },
            { id: 'semestre', label: 'Évolution semestres' },
            { id: 'devoir_examen', label: 'Devoirs vs Examens' },
            { id: 'dispersion', label: 'Dispersion des notes' },
            { id: 'etudiant', label: 'Étudiants en difficulté' },
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

      {/* 6. Liste des Cartes de Recommandations */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-3xl border border-cream-200">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-navy-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-ink/50">Calcul des 12 règles décisionnelles sur les données réelles...</p>
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
                {/* En-tête de la recommandation (cliquable pour plier/déplier) */}
                <button
                  type="button"
                  onClick={() => toggleCard(rec.id)}
                  className={`w-full p-5 sm:p-6 text-left flex items-start justify-between gap-4 select-none cursor-pointer group ${
                    rec.is_positive ? 'bg-gradient-to-r from-emerald-50/30 to-white' : ''
                  }`}
                >
                  <div className="flex items-start gap-4 flex-1">
                    {/* Icône de priorité */}
                    {getPriorityIcon(rec)}

                    {/* Contenu titre & diagnostic */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Ligne des badges d'identification */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {getPriorityBadge(rec)}

                        <span className="text-[11px] font-bold text-ink/60 bg-cream-100 px-2.5 py-0.5 rounded-full">
                          Règle {rec.rule_number}
                        </span>

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
                            {rec.semestre}
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

                  {/* Chevron Déplier / Replier */}
                  <div className="text-ink/40 group-hover:text-ink/70 transition shrink-0 pt-1">
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {/* Corps déplié : Actions suggérées & Détails analytiques */}
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-cream-100/80">
                    {/* Widget Spécifique RÈGLE 9 : Comparaison Devoir vs Examen */}
                    {rec.rule_number === 9 && rec.details && (
                      <div className="mt-4 p-4 rounded-xl bg-cream-100/40 border border-cream-200">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                            <Scale size={15} className="text-navy-600" />
                            Comparaison Devoir vs Examen (sur 20)
                          </span>
                          <span className="text-xs font-bold text-navy-700 bg-white border border-cream-200 px-2.5 py-0.5 rounded-full">
                            Écart : {rec.details.ecart_points} points
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-center">
                          <div className="bg-white p-3 rounded-lg border border-cream-200">
                            <div className="text-[11px] text-ink/50 font-medium">Moyenne Contrôle Continu (40%)</div>
                            <div className="text-lg font-bold text-ink mt-0.5">
                              {rec.details.moyenne_devoir?.toFixed(1)}/20
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-cream-200">
                            <div className="text-[11px] text-ink/50 font-medium">Moyenne Examen Final (60%)</div>
                            <div className="text-lg font-bold text-ink mt-0.5">
                              {rec.details.moyenne_examen?.toFixed(1)}/20
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Widget Spécifique RÈGLE 4 : Dispersion des notes */}
                    {rec.rule_number === 4 && rec.details && (
                      <div className="mt-4 p-4 rounded-xl bg-cream-100/40 border border-cream-200">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                            <Sliders size={15} className="text-navy-600" />
                            Profil de dispersion des notes (sur 20)
                          </span>
                          <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            Écart-type : σ = {rec.details.ecart_type}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                          <div className="bg-white p-2 rounded-lg border border-cream-200">
                            <div className="text-[10px] text-ink/50">Note min</div>
                            <div className="font-bold text-ink mt-0.5">{rec.details.note_min}/20</div>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-cream-200">
                            <div className="text-[10px] text-ink/50">Note max</div>
                            <div className="font-bold text-ink mt-0.5">{rec.details.note_max}/20</div>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-cream-200">
                            <div className="text-[10px] text-ink/50">&lt; 8/20</div>
                            <div className="font-bold text-maroon-600 mt-0.5">{rec.details.nb_inf_8} étudiants</div>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-cream-200">
                            <div className="text-[10px] text-ink/50">≥ 14/20</div>
                            <div className="font-bold text-emerald-600 mt-0.5">{rec.details.nb_sup_14} étudiants</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 items-stretch">
                      {/* Colonne gauche : Action recommandée & Checklist concrète */}
                      <div className="lg:col-span-7 flex flex-col justify-between">
                        <div>
                          {/* Recommandation principale officielle */}
                          <div
                            className={`rounded-xl p-3.5 border mb-4 ${
                              rec.is_positive
                                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                                : 'bg-cream-100/60 border-cream-200 text-ink'
                            }`}
                          >
                            <span
                              className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${
                                rec.is_positive ? 'text-emerald-700' : 'text-navy-600'
                              }`}
                            >
                              Action Recommandée :
                            </span>
                            <p className="text-xs md:text-sm font-semibold leading-relaxed">
                              {rec.action_recommandee || rec.recommandation_principale}
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
                            Périmètre académique
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

                        <div className="overflow-x-auto rounded-xl border border-cream-200 bg-white shadow-2xs">
                          <table className="w-full text-xs">
                            <thead className="bg-cream-100/60 text-ink/60 font-semibold text-[11px] border-b border-cream-200">
                              <tr>
                                <th className="text-left py-2.5 px-3">Étudiant</th>
                                <th className="text-left py-2.5 px-3">Matricule</th>
                                {rec.rule_number === 5 ? (
                                  <>
                                    <th className="text-center py-2.5 px-2">Matières non validées</th>
                                    <th className="text-left py-2.5 px-3">Détail des matières</th>
                                  </>
                                ) : (
                                  <>
                                    <th className="text-left py-2.5 px-3">Module</th>
                                    <th className="text-center py-2.5 px-2">Devoir</th>
                                    <th className="text-center py-2.5 px-2">Examen</th>
                                    <th className="text-center py-2.5 px-2">Moyenne</th>
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
                                  {rec.rule_number === 5 ? (
                                    <>
                                      <td className="py-2.5 px-2 text-center font-bold text-maroon-600">
                                        {st.nb_non_valides}
                                      </td>
                                      <td className="py-2.5 px-3 text-ink/70">
                                        {st.matieres?.join(', ') || 'N/A'}
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="py-2.5 px-3 text-ink/80">{st.module || rec.matiere}</td>
                                      <td className="py-2.5 px-2 text-center text-ink">{st.note_devoir ?? '-'}</td>
                                      <td className="py-2.5 px-2 text-center text-ink">{st.note_examen ?? '-'}</td>
                                      <td className="py-2.5 px-2 text-center font-bold text-navy-700">
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </MainLayout>
  );
}
