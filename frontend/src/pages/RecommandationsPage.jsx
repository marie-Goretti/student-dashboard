import { useState, useEffect, useCallback } from 'react';
import MainLayout from '../components/layout/MainLayout';
import HeaderBar from '../components/layout/HeaderBar';
import { getRecommandations } from '../api/dashboardService';
import {
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Sparkles,
  Filter,
} from 'lucide-react';

export default function RecommandationsPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCards, setOpenCards] = useState({ 'rec-1': true });
  const [completedActions, setCompletedActions] = useState({});
  const [priorityFilter, setPriorityFilter] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRecommandations({});
      setRecommendations(res || []);
      // Ouvrir le premier élément par défaut
      if (res && res.length > 0) {
        const initialOpen = {};
        res.forEach((r, idx) => {
          if (r.default_open || idx === 0) {
            initialOpen[r.id] = true;
          }
        });
        setOpenCards(initialOpen);
      }
    } catch (err) {
      console.error('Erreur chargement recommandations:', err);
      // Fallback local conforme au mockup
      setRecommendations([
        {
          id: 'rec-1',
          priority: 'elevee',
          priority_label: 'Priorité élevée',
          badge_color: 'red',
          title: 'Module Finance — Forte difficulté détectée',
          description:
            'Le module Finance présente une moyenne de 7,4/20 et un taux de réussite de 39%, largement inférieur au seuil de 60% défini.',
          actions: [
            "Analyser les résultats par type d'évaluation (devoir vs examen)",
            'Identifier les groupes d\'étudiants les plus concernés',
            'Organiser une séance de renforcement pédagogique',
            'Suivre l\'évolution au prochain contrôle continu',
          ],
          impact:
            'Réduction potentielle du taux d\'échec de 15% si les actions sont mises en place.',
          default_open: true,
        },
        {
          id: 'rec-2',
          priority: 'elevee',
          priority_label: 'Priorité élevée',
          badge_color: 'red',
          title: 'Module Droit — Intervention urgente requise',
          description:
            'Le module Droit présente un taux de réussite de 44% et un écart important entre les notes de devoir et d\'examen.',
          actions: [
            'Revoir les modalités d\'évaluation des devoirs et examens',
            'Mettre en place un soutien méthodologique pour la préparation aux examens',
            'Harmoniser les barèmes de notation entre enseignants',
            'Planifier des séances de révision dirigées',
          ],
          impact:
            'Amélioration attendue du taux de validation de 12 à 18% sur la cohorte.',
          default_open: false,
        },
        {
          id: 'rec-3',
          priority: 'moyenne',
          priority_label: 'Priorité moyenne',
          badge_color: 'amber',
          title: 'Écart important entre devoirs et examens',
          description:
            'Plusieurs modules présentent des écarts > 3 points entre les résultats de devoirs et les examens finaux, indiquant une préparation insuffisante.',
          actions: [
            'Aligner le niveau d\'exigence des devoirs surveillés sur celui des examens',
            'Organiser des examens blancs à mi-semestre',
            'Fournir des retours individualisés aux étudiants après chaque évaluation',
            'Renforcer les ateliers d\'entraînement aux épreuves synthétiques',
          ],
          impact:
            'Réduction du décrochage avant les épreuves finales de 20%.',
          default_open: false,
        },
        {
          id: 'rec-4',
          priority: 'opportunite',
          priority_label: 'Opportunité',
          badge_color: 'blue',
          title: 'Module Marketing — Bonnes performances',
          description:
            'Le module Marketing présente une moyenne de 15,2/20 et un taux de réussite de 91%, bien au-dessus de la moyenne générale.',
          actions: [
            'Documenter et diffuser les pratiques pédagogiques adoptées dans ce module',
            'Impliquer les étudiants les plus performants dans un programme de tutorat par les pairs',
            'Valoriser les méthodes d\'évaluation interactives auprès de l\'équipe pédagogique',
            'Transposer les méthodes actives aux modules transversaux en difficulté',
          ],
          impact:
            'Effet d\'entraînement positif sur l\'ensemble des modules transversaux.',
          default_open: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleCard = (id) => {
    setOpenCards((prev) => ({
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

  const filteredRecommendations = recommendations.filter((r) => {
    if (priorityFilter === 'all') return true;
    return r.priority === priorityFilter;
  });

  const getPriorityBadge = (rec) => {
    if (rec.priority === 'elevee') {
      return (
        <span className="text-[11px] font-semibold text-[#8B2323] bg-[#FBEBEC] px-2.5 py-0.5 rounded-md inline-block">
          {rec.priority_label || 'Priorité élevée'}
        </span>
      );
    }
    if (rec.priority === 'moyenne') {
      return (
        <span className="text-[11px] font-semibold text-[#9A6700] bg-[#FFF8E6] px-2.5 py-0.5 rounded-md inline-block">
          {rec.priority_label || 'Priorité moyenne'}
        </span>
      );
    }
    return (
      <span className="text-[11px] font-semibold text-[#1F4B78] bg-[#EEF4FB] px-2.5 py-0.5 rounded-md inline-block">
        {rec.priority_label || 'Opportunité'}
      </span>
    );
  };

  const getPriorityIcon = (rec) => {
    if (rec.priority === 'elevee') {
      return (
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[#8B2323] shrink-0 mt-0.5">
          <AlertCircle size={18} />
        </div>
      );
    }
    if (rec.priority === 'moyenne') {
      return (
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[#9A6700] shrink-0 mt-0.5">
          <AlertTriangle size={18} />
        </div>
      );
    }
    return (
      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[#1F4B78] shrink-0 mt-0.5">
        <TrendingUp size={18} />
      </div>
    );
  };

  return (
    <MainLayout>
      {/* 1. HeaderBar fidèle à EduPulse */}
      <HeaderBar
        title="Recommandations décisionnelles"
        subtitle="Année académique 2024–2025"
      />

      {/* 2. Sous-titre descriptif fidèle à la maquette */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <p className="text-xs md:text-sm text-ink/60">
          Des recommandations générées à partir des tendances observées dans les données.
        </p>

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

      {/* 3. Filtre par priorité */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 text-xs">
        <span className="text-ink/40 font-medium flex items-center gap-1 shrink-0 mr-1">
          <Filter size={13} /> Filtrer :
        </span>
        <button
          onClick={() => setPriorityFilter('all')}
          className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
            priorityFilter === 'all'
              ? 'bg-navy-600 text-white shadow-xs'
              : 'bg-white text-ink/70 border border-cream-200 hover:bg-cream-100'
          }`}
        >
          Toutes ({recommendations.length})
        </button>
        <button
          onClick={() => setPriorityFilter('elevee')}
          className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
            priorityFilter === 'elevee'
              ? 'bg-maroon-500 text-white shadow-xs'
              : 'bg-white text-ink/70 border border-cream-200 hover:bg-cream-100'
          }`}
        >
          Priorité élevée ({recommendations.filter((r) => r.priority === 'elevee').length})
        </button>
        <button
          onClick={() => setPriorityFilter('moyenne')}
          className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
            priorityFilter === 'moyenne'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-ink/70 border border-cream-200 hover:bg-cream-100'
          }`}
        >
          Priorité moyenne ({recommendations.filter((r) => r.priority === 'moyenne').length})
        </button>
        <button
          onClick={() => setPriorityFilter('opportunite')}
          className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
            priorityFilter === 'opportunite'
              ? 'bg-navy-500 text-white shadow-xs'
              : 'bg-white text-ink/70 border border-cream-200 hover:bg-cream-100'
          }`}
        >
          Opportunités ({recommendations.filter((r) => r.priority === 'opportunite').length})
        </button>
      </div>

      {/* 4. Liste des cartes d'accordéon */}
      <div className="space-y-4">
        {filteredRecommendations.map((rec) => {
          const isOpen = !!openCards[rec.id];

          return (
            <div
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

                  {/* Contenu titre & description */}
                  <div className="space-y-1.5 flex-1">
                    {/* Badge de priorité */}
                    <div>{getPriorityBadge(rec)}</div>

                    {/* Titre */}
                    <h3 className="text-sm md:text-base font-bold text-ink tracking-tight font-sans">
                      {rec.title}
                    </h3>

                    {/* Description courte */}
                    <p className="text-xs md:text-sm text-ink/65 leading-relaxed font-normal">
                      {rec.description}
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
                    {/* Colonne gauche : Actions suggérées */}
                    <div className="lg:col-span-7">
                      <h4 className="text-xs font-semibold text-ink uppercase tracking-wider mb-3">
                        Actions suggérées
                      </h4>

                      <div className="space-y-2.5">
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
                                  : 'hover:bg-cream-100/60 text-ink/80'
                              }`}
                            >
                              <CheckCircle2
                                size={17}
                                className={`shrink-0 mt-0.5 transition-colors ${
                                  isDone
                                    ? 'text-emerald-500 fill-emerald-100'
                                    : rec.priority === 'elevee'
                                    ? 'text-[#8B2323]'
                                    : rec.priority === 'moyenne'
                                    ? 'text-[#9A6700]'
                                    : 'text-[#1F4B78]'
                                }`}
                              />
                              <span className="text-xs md:text-[13px] leading-snug">
                                {action}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Colonne droite : Impact potentiel */}
                    <div className="lg:col-span-5 flex flex-col justify-center">
                      <div className="bg-[#F8F6F1] rounded-2xl p-5 border border-cream-200/70 h-full flex flex-col justify-center">
                        <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wider mb-2">
                          Impact potentiel
                        </div>
                        <p className="text-xs md:text-[13px] text-ink/85 font-medium leading-relaxed">
                          {rec.impact}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredRecommendations.length === 0 && (
          <div className="bg-white rounded-2xl border border-cream-200 p-12 text-center text-xs text-ink/50">
            Aucune recommandation trouvée pour ce niveau de priorité.
          </div>
        )}
      </div>
    </MainLayout>
  );
}
