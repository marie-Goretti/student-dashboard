import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Layers,
} from 'lucide-react';

export default function RecommandationsPage() {
  const [filters, setFilters] = useState({});
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openCards, setOpenCards] = useState({ 'regle-1': true });
  const [openStudentTables, setOpenStudentTables] = useState({});
  const [studentSearchTerms, setStudentSearchTerms] = useState({});
  const [completedActions, setCompletedActions] = useState({});
  const [activeTab, setActiveTab] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRecommandations(filters);
      setData(res);
      // Par défaut ouvrir la première règle
      if (res?.recommandations && res.recommandations.length > 0) {
        setOpenCards((prev) => ({
          ...prev,
          [res.recommandations[0].id]: true,
        }));
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
        regle_counts: {},
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
    setCompletedActions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleAll = (expand) => {
    const nextState = {};
    recommendations.forEach((r) => {
      nextState[r.id] = expand;
    });
    setOpenCards(nextState);
  };

  const filteredRecommendations = useMemo(() => {
    if (activeTab === 'all') return recommendations;
    if (activeTab === 'critical') {
      return recommendations.filter((r) => r.priority === 'elevee');
    }
    if (activeTab === 'warning') {
      return recommendations.filter((r) => r.priority === 'moyenne');
    }
    if (activeTab === 'excellence') {
      return recommendations.filter((r) => r.priority === 'opportunite');
    }
    if (activeTab === 'normal') {
      return recommendations.filter((r) => r.priority === 'normale');
    }
    return recommendations;
  }, [recommendations, activeTab]);

  const getPriorityBadge = (rec) => {
    switch (rec.badge_color) {
      case 'red':
        return (
          <span className="text-[11px] font-semibold text-[#8B2323] bg-[#FBEBEC] px-2.5 py-0.5 rounded-md inline-block">
            {rec.priority_label}
          </span>
        );
      case 'amber':
        return (
          <span className="text-[11px] font-semibold text-[#9A6700] bg-[#FFF8E6] px-2.5 py-0.5 rounded-md inline-block">
            {rec.priority_label}
          </span>
        );
      case 'blue':
        return (
          <span className="text-[11px] font-semibold text-[#1F4B78] bg-[#EEF4FB] px-2.5 py-0.5 rounded-md inline-block">
            {rec.priority_label}
          </span>
        );
      case 'emerald':
      default:
        return (
          <span className="text-[11px] font-semibold text-[#166534] bg-[#DCFCE7] px-2.5 py-0.5 rounded-md inline-block">
            {rec.priority_label}
          </span>
        );
    }
  };

  const getPriorityIcon = (rec) => {
    switch (rec.badge_color) {
      case 'red':
        return (
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[#8B2323] shrink-0 mt-0.5">
            <AlertCircle size={20} />
          </div>
        );
      case 'amber':
        return (
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[#9A6700] shrink-0 mt-0.5">
            <AlertTriangle size={20} />
          </div>
        );
      case 'blue':
        return (
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[#1F4B78] shrink-0 mt-0.5">
            <Award size={20} />
          </div>
        );
      case 'emerald':
      default:
        return (
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[#166534] shrink-0 mt-0.5">
            <CheckCircle2 size={20} />
          </div>
        );
    }
  };

  return (
    <MainLayout>
      {/* 1. HeaderBar fidèle à EduPulse */}
      <HeaderBar
        title="Recommandations décisionnelles"
        subtitle="Année académique 2024–2025"
      />

      {/* 2. Filtres dynamiques : Année, Programme, Niveau, Module */}
      <FiltersBar
        filters={filters}
        onChange={setFilters}
        showAnnee={true}
        showProgramme={true}
        showNiveau={true}
        showModule={true}
        showSemestre={false}
      />

      {/* 3. Description & Contexte pédagogique */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div>
          <p className="text-xs md:text-sm text-ink/75 font-medium">
            Des recommandations générées à partir des tendances observées dans les données.
          </p>
          <p className="text-[11px] text-ink/45 mt-0.5">
            Système d'évaluation : Note Finale = (Devoir × 40%) + (Examen × 60%) • Seuil validation : 10.0/20
          </p>
        </div>

        {/* Boutons d'action rapides */}
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

      {/* 4. Mini-synthèse des 6 profils décisionnels */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {recommendations.map((rec) => {
          return (
            <div
              key={rec.id}
              onClick={() => {
                setOpenCards((prev) => ({ ...prev, [rec.id]: true }));
                const el = document.getElementById(rec.id);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-white rounded-xl border border-cream-200 p-3 shadow-xs hover:border-navy-400 transition cursor-pointer"
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[10px] font-semibold text-ink/45 uppercase tracking-wider">
                  Règle {rec.rule_number}
                </span>
                <span className="text-xs font-bold text-ink">
                  {rec.percentage}%
                </span>
              </div>
              <div className="text-lg font-bold text-ink tracking-tight font-sans">
                {rec.count?.toLocaleString('fr-FR')}
              </div>
              <div className="text-[11px] text-ink/60 truncate font-medium mt-0.5" title={rec.short_title}>
                {rec.short_title}
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Filtres par statut / priorité */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 text-xs">
        <span className="text-ink/40 font-medium flex items-center gap-1 shrink-0 mr-1">
          <Filter size={13} /> Profils :
        </span>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
            activeTab === 'all'
              ? 'bg-navy-600 text-white shadow-xs'
              : 'bg-white text-ink/70 border border-cream-200 hover:bg-cream-100'
          }`}
        >
          Toutes les règles ({recommendations.length})
        </button>
        <button
          onClick={() => setActiveTab('critical')}
          className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
            activeTab === 'critical'
              ? 'bg-maroon-500 text-white shadow-xs'
              : 'bg-white text-ink/70 border border-cream-200 hover:bg-cream-100'
          }`}
        >
          Priorité élevée & Rattrapage ({recommendations.filter((r) => r.priority === 'elevee').length})
        </button>
        <button
          onClick={() => setActiveTab('warning')}
          className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
            activeTab === 'warning'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-ink/70 border border-cream-200 hover:bg-cream-100'
          }`}
        >
          Négligence Devoir ({recommendations.filter((r) => r.priority === 'moyenne').length})
        </button>
        <button
          onClick={() => setActiveTab('excellence')}
          className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
            activeTab === 'excellence'
              ? 'bg-navy-500 text-white shadow-xs'
              : 'bg-white text-ink/70 border border-cream-200 hover:bg-cream-100'
          }`}
        >
          Mentors / Excellence ({recommendations.filter((r) => r.priority === 'opportunite').length})
        </button>
        <button
          onClick={() => setActiveTab('normal')}
          className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
            activeTab === 'normal'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-ink/70 border border-cream-200 hover:bg-cream-100'
          }`}
        >
          Progression normale ({recommendations.filter((r) => r.priority === 'normale').length})
        </button>
      </div>

      {/* 6. Liste des Cartes d'accordéon des Recommandations */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-navy-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-ink/50">Analyse des 6 règles décisionnelles en cours...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecommendations.map((rec) => {
            const isOpen = !!openCards[rec.id];
            const isTableOpen = !!openStudentTables[rec.id];
            const searchTerm = studentSearchTerms[rec.id] || '';

            // Filtrage des étudiants de l'échantillon
            const sampleFiltered = (rec.students_sample || []).filter(
              (s) =>
                !searchTerm.trim() ||
                s.etudiant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
            );

            return (
              <div
                id={rec.id}
                key={rec.id}
                className="bg-white rounded-2xl border border-cream-200 shadow-xs transition-all duration-200 hover:border-cream-300 overflow-hidden"
              >
                {/* En-tête de la recommandation (cliquable) */}
                <button
                  type="button"
                  onClick={() => toggleCard(rec.id)}
                  className="w-full p-5 sm:p-6 text-left flex items-start justify-between gap-4 select-none cursor-pointer group"
                >
                  <div className="flex items-start gap-4 flex-1">
                    {/* Icône de priorité */}
                    {getPriorityIcon(rec)}

                    {/* Contenu titre & diagnostic */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getPriorityBadge(rec)}
                        <span className="text-[11px] font-mono font-medium text-ink/50 bg-cream-100 px-2 py-0.5 rounded">
                          {rec.condition}
                        </span>
                        <span className="text-[11px] font-bold text-navy-600 bg-navy-50 px-2 py-0.5 rounded">
                          {rec.count} cas ({rec.percentage}%)
                        </span>
                      </div>

                      {/* Titre */}
                      <h3 className="text-sm md:text-base font-bold text-ink tracking-tight font-sans">
                        Règle {rec.rule_number} : {rec.title}
                      </h3>

                      {/* Diagnostic issu strictement des règles */}
                      <p className="text-xs md:text-sm text-ink/75 leading-relaxed font-normal">
                        <strong className="text-ink font-semibold">Diagnostic : </strong>
                        {rec.diagnostic}
                      </p>
                    </div>
                  </div>

                  {/* Chevron Déplier / Replier */}
                  <div className="text-ink/40 group-hover:text-ink/70 transition shrink-0 pt-1">
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {/* Corps déplié : Actions suggérées & Impact potentiel */}
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-cream-100/80">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 items-stretch">
                      {/* Colonne gauche : Actions suggérées & Recommandation */}
                      <div className="lg:col-span-7 flex flex-col justify-between">
                        <div>
                          {/* Recommandation principale officielle */}
                          <div className="bg-cream-100/50 rounded-xl p-3 border border-cream-200/60 mb-4">
                            <span className="text-[11px] font-bold text-navy-600 uppercase tracking-wider block mb-1">
                              Recommandation décisionnelle :
                            </span>
                            <p className="text-xs text-ink/90 font-medium leading-relaxed">
                              {rec.recommandation_principale}
                            </p>
                          </div>

                          <h4 className="text-xs font-semibold text-ink uppercase tracking-wider mb-2.5">
                            Actions suggérées (cocher au fil de la mise en place)
                          </h4>

                          <div className="space-y-2">
                            {rec.actions?.map((action, idx) => {
                              const actionKey = `${rec.id}-${idx}`;
                              const isDone = !!completedActions[actionKey];

                              return (
                                <div
                                  key={idx}
                                  onClick={() => toggleAction(rec.id, idx)}
                                  className={`flex items-start gap-2.5 p-2 rounded-xl transition cursor-pointer select-none ${
                                    isDone
                                      ? 'bg-cream-100/40 text-ink/40 line-through'
                                      : 'hover:bg-cream-100/60 text-ink/85'
                                  }`}
                                >
                                  <CheckCircle2
                                    size={16}
                                    className={`shrink-0 mt-0.5 transition-colors ${
                                      isDone
                                        ? 'text-emerald-500 fill-emerald-100'
                                        : rec.badge_color === 'red'
                                        ? 'text-[#8B2323]'
                                        : rec.badge_color === 'amber'
                                        ? 'text-[#9A6700]'
                                        : rec.badge_color === 'blue'
                                        ? 'text-[#1F4B78]'
                                        : 'text-[#166534]'
                                    }`}
                                  />
                                  <span className="text-xs leading-snug">
                                    {action}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Modules les plus concernés */}
                        {rec.top_modules && rec.top_modules.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-cream-100">
                            <span className="text-[11px] font-semibold text-ink/50 uppercase tracking-wider block mb-1.5">
                              Modules les plus concernés :
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {rec.top_modules.map((m, mIdx) => (
                                <span
                                  key={mIdx}
                                  className="text-[11px] bg-white border border-cream-200 px-2.5 py-0.5 rounded-full text-ink/75 font-medium shadow-2xs"
                                >
                                  {m.module} : <strong className="text-ink">{m.count}</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Colonne droite : Impact potentiel & Accès à la liste des étudiants */}
                      <div className="lg:col-span-5 flex flex-col justify-between">
                        <div className="bg-[#F8F6F1] rounded-2xl p-5 border border-cream-200/70 mb-4">
                          <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wider mb-2">
                            Impact potentiel
                          </div>
                          <p className="text-xs md:text-[13px] text-ink/85 font-medium leading-relaxed">
                            {rec.impact}
                          </p>
                        </div>

                        {/* Bouton pour afficher la liste réelle des étudiants */}
                        <div className="bg-white rounded-xl border border-cream-200 p-3 shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Users size={16} className="text-navy-600" />
                              <span className="text-xs font-semibold text-ink">
                                {rec.count} évaluations concernées ({rec.students_count} étudiants)
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
                      </div>
                    </div>

                    {/* Tableau dépliable des étudiants réels issus de la base */}
                    {isTableOpen && (
                      <div className="mt-5 pt-4 border-t border-cream-200">
                        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                          <h5 className="text-xs font-bold text-ink uppercase tracking-wider">
                            Échantillon des étudiants détectés par la Règle {rec.rule_number} ({sampleFiltered.length})
                          </h5>
                          <div className="flex items-center gap-2 bg-cream-100/60 rounded-full px-3 py-1 border border-cream-200 text-xs w-56">
                            <Search size={13} className="text-ink/40 shrink-0" />
                            <input
                              type="text"
                              placeholder="Filtrer étudiant ou module..."
                              value={searchTerm}
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
                                <th className="text-left py-2.5 px-3">Module</th>
                                <th className="text-center py-2.5 px-2">Niveau</th>
                                <th className="text-center py-2.5 px-2">Devoir (40%)</th>
                                <th className="text-center py-2.5 px-2">Examen (60%)</th>
                                <th className="text-center py-2.5 px-2">Moyenne Finale</th>
                                <th className="text-right py-2.5 px-3">Statut</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-cream-100">
                              {sampleFiltered.map((st, sIdx) => {
                                const isAdmis = st.statut === 'Admis';
                                return (
                                  <tr key={st.id_eval || sIdx} className="hover:bg-cream-100/30 transition">
                                    <td className="py-2 px-3 font-semibold text-ink">
                                      {st.etudiant}
                                      {st.matricule && (
                                        <span className="text-[10px] text-ink/40 block font-normal font-mono">
                                          {st.matricule}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-ink/80">{st.module}</td>
                                    <td className="py-2 px-2 text-center text-ink/60 font-mono">{st.niveau}</td>
                                    <td className="py-2 px-2 text-center font-medium text-ink">
                                      {st.note_devoir?.toFixed(1)}/20
                                    </td>
                                    <td className="py-2 px-2 text-center font-medium text-ink">
                                      {st.note_examen?.toFixed(1)}/20
                                    </td>
                                    <td className="py-2 px-2 text-center font-bold text-navy-700">
                                      {st.moyenne?.toFixed(1)}/20
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                          isAdmis
                                            ? 'bg-[#E8F5E9] text-[#2E7D32]'
                                            : 'bg-[#FFEBEE] text-[#C62828]'
                                        }`}
                                      >
                                        {st.statut}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
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
