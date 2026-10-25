import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import HeaderBar from '../components/layout/HeaderBar';
import { getModuleDetail } from '../api/dashboardService';
import {
  ArrowLeft, BookOpen, Users, TrendingUp, Award, AlertTriangle,
  RotateCcw, Search, ChevronRight, CheckCircle2, XCircle,
  Calendar, Layers, FileText, Loader2, Sparkles
} from 'lucide-react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';

export default function ModuleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAnnee, setSelectedAnnee] = useState('');
  const [selectedNiveau, setSelectedNiveau] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('evaluations'); // 'evaluations' | 'niveaux'

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (selectedAnnee) filters.id_annee = selectedAnnee;
      if (selectedNiveau) filters.id_niv = selectedNiveau;
      const res = await getModuleDetail(id, filters);
      setData(res);
    } catch (err) {
      console.error('Erreur chargement détail module:', err);
      setError("Impossible de charger les données de ce module.");
    } finally {
      setLoading(false);
    }
  }, [id, selectedAnnee, selectedNiveau]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrage des évaluations par recherche
  const filteredEvaluations = useMemo(() => {
    if (!data?.evaluations) return [];
    if (!searchQuery.trim()) return data.evaluations;
    const q = searchQuery.toLowerCase();
    return data.evaluations.filter(
      (ev) =>
        ev.nom_complet.toLowerCase().includes(q) ||
        ev.matricule.toLowerCase().includes(q) ||
        (ev.niveau && ev.niveau.toLowerCase().includes(q))
    );
  }, [data?.evaluations, searchQuery]);

  if (loading && !data) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 size={36} className="animate-spin text-navy-600" />
          <p className="text-xs text-ink/50">Chargement de la fiche de module...</p>
        </div>
      </MainLayout>
    );
  }

  if (error || !data) {
    return (
      <MainLayout>
        <div className="p-8 text-center bg-white rounded-3xl border border-cream-200 my-8">
          <AlertTriangle className="mx-auto text-maroon-500 mb-3" size={36} />
          <h2 className="text-lg font-bold text-ink mb-1">Module introuvable</h2>
          <p className="text-xs text-ink/60 mb-4">{error || "Ce module n'existe pas ou ne contient aucune note enregistrée."}</p>
          <button
            onClick={() => navigate('/modules')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-800 text-white text-xs font-medium hover:bg-navy-900 transition"
          >
            <ArrowLeft size={14} /> Retour à l'analyse des modules
          </button>
        </div>
      </MainLayout>
    );
  }

  const { module, kpi, niveaux, distribution, evolution, annees } = data;
  const isMoyLow = kpi.moyenne_generale !== null && kpi.moyenne_generale < 10.0;

  return (
    <MainLayout>
      <HeaderBar
        title={`Fiche Module : ${module.nom_mod}`}
        currentAnnee={
          annees?.find((a) => String(a.id_annee) === String(filters.id_annee))?.id_annee__annee_academique ||
          annees?.[0]?.id_annee__annee_academique ||
          ''
        }
      />

      {/* Navigation retour & Filtres */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <button
          onClick={() => navigate('/modules')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/60 hover:text-navy-800 transition cursor-pointer"
        >
          <ArrowLeft size={14} /> Retour à l'analyse des modules
        </button>

        {/* Filtres contextuels : Année & Niveau */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border border-cream-200 rounded-xl px-3 py-1.5 shadow-xs text-xs">
            <Calendar size={13} className="text-ink/40" />
            <span className="text-ink/50 font-medium">Année</span>
            <select
              value={selectedAnnee}
              onChange={(e) => setSelectedAnnee(e.target.value)}
              className="bg-transparent text-ink font-semibold outline-none cursor-pointer text-xs"
            >
              <option value="">Toutes les années</option>
              {annees?.map((a) => (
                <option key={a.id_annee} value={a.id_annee}>
                  {a.annee_academique}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-cream-200 rounded-xl px-3 py-1.5 shadow-xs text-xs">
            <Layers size={13} className="text-ink/40" />
            <span className="text-ink/50 font-medium">Niveau</span>
            <select
              value={selectedNiveau}
              onChange={(e) => setSelectedNiveau(e.target.value)}
              className="bg-transparent text-ink font-semibold outline-none cursor-pointer text-xs"
            >
              <option value="">Tous les niveaux</option>
              {niveaux?.map((n) => (
                <option key={n.id_niv} value={n.id_niv}>
                  {n.code_niv}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Hero Banner du Module */}
      <div className="bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 text-white rounded-3xl p-6 md:p-8 shadow-sm mb-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/5 to-transparent pointer-events-none" />
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-cream-100 text-xs font-medium mb-3 backdrop-blur-xs">
              <BookOpen size={14} className="text-cream-200" />
              Code : <span className="font-mono font-bold text-white">{module.code_mod}</span>
              {module.semestre && (
                <>
                  <span className="opacity-40">•</span>
                  <span>Semestre {module.semestre}</span>
                </>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
              {module.nom_mod}
            </h1>
            <p className="text-xs md:text-sm text-cream-100/70 max-w-xl">
              Analyse des résultats académiques pour ce module d'enseignement : suivi des taux de validation, dispersion devoirs/examen, et cohortes concernées.
            </p>
          </div>

          {/* Badge résumé effectif */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-white">
              <Users size={22} />
            </div>
            <div>
              <p className="text-[11px] text-cream-200/80 uppercase font-bold tracking-wider">Total Évalués</p>
              <p className="text-2xl font-black text-white">{kpi.total_etudiants} <span className="text-xs font-normal text-cream-100/70">étudiants</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Grille des KPIs clés */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-6">
        {/* KPI 1 : Évaluations */}
        <div className="bg-white rounded-2xl border border-cream-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-ink/50">Évaluations</span>
            <FileText size={15} className="text-navy-600" />
          </div>
          <p className="text-xl font-bold text-ink">{kpi.total_evaluations}</p>
          <p className="text-[11px] text-ink/40 mt-1">{kpi.total_etudiants} étudiants distincts</p>
        </div>

        {/* KPI 2 : Moyenne générale */}
        <div className="bg-white rounded-2xl border border-cream-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-ink/50">Moyenne</span>
            <TrendingUp size={15} className={isMoyLow ? 'text-maroon-500' : 'text-emerald-600'} />
          </div>
          <p className={`text-xl font-bold ${isMoyLow ? 'text-maroon-600' : 'text-ink'}`}>
            {kpi.moyenne_generale !== null ? `${kpi.moyenne_generale}/20` : '—'}
          </p>
          <p className="text-[11px] text-ink/40 mt-1">sur 20</p>
        </div>

        {/* KPI 3 : Taux de réussite */}
        <div className="bg-white rounded-2xl border border-cream-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-ink/50">Réussite</span>
            <Award size={15} className="text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-emerald-600">{kpi.taux_reussite}%</p>
          <div className="w-full bg-cream-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, kpi.taux_reussite)}%` }} />
          </div>
        </div>

        {/* KPI 4 : Taux d'échec */}
        <div className="bg-white rounded-2xl border border-cream-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-ink/50">Échec</span>
            <XCircle size={15} className="text-maroon-500" />
          </div>
          <p className="text-xl font-bold text-maroon-600">{kpi.taux_echec}%</p>
          <p className="text-[11px] text-ink/40 mt-1">{kpi.rattrapages} en rattrapage</p>
        </div>

        {/* KPI 5 : Devoirs CC */}
        <div className="bg-white rounded-2xl border border-cream-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-ink/50">Devoirs (CC)</span>
            <span className="w-2.5 h-2.5 rounded-xs bg-[#2C4A6E]" />
          </div>
          <p className="text-xl font-bold text-[#2C4A6E]">
            {kpi.moyenne_devoir !== null ? `${kpi.moyenne_devoir}/20` : '—'}
          </p>
          <p className="text-[11px] text-ink/40 mt-1">Moyenne CC ramenée</p>
        </div>

        {/* KPI 6 : Examen final */}
        <div className="bg-white rounded-2xl border border-cream-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-ink/50">Examen</span>
            <span className="w-2.5 h-2.5 rounded-xs bg-[#7A1620]" />
          </div>
          <p className="text-xl font-bold text-[#7A1620]">
            {kpi.moyenne_examen !== null ? `${kpi.moyenne_examen}/20` : '—'}
          </p>
          <p className="text-[11px] text-ink/40 mt-1">Note d'épreuve</p>
        </div>
      </div>

      {/* Graphiques analytiques pour ce module */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {/* Graphique 1 : Distribution des notes du module */}
        <div className="bg-white rounded-3xl border border-cream-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-ink text-[14px]">Distribution des notes</h3>
              <p className="text-xs text-ink/40">Évaluations groupées par tranche de notes</p>
            </div>
            <span className="text-xs text-ink/50 bg-cream-100 rounded-full px-2.5 py-0.5">
              {kpi.total_evaluations} évals
            </span>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                <CartesianGrid vertical={false} stroke="#EFEAE0" strokeDasharray="3 3" />
                <XAxis dataKey="tranche" tick={{ fontSize: 11, fill: '#0B1220', fillOpacity: 0.6 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#0B1220', fillOpacity: 0.5 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip
                  formatter={(val) => [`${val} évaluations`, 'Effectif']}
                  labelFormatter={(lbl) => `Tranche ${lbl}/20`}
                />
                <Bar dataKey="effectif" radius={[4, 4, 0, 0]} barSize={26}>
                  {distribution.map((entry, index) => (
                    <Cell key={`mod-dist-${index}`} fill={entry.isBelow10 ? '#7A1620' : '#2C4A6E'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique 2 : Comparaison par niveau / promotion */}
        <div className="bg-white rounded-3xl border border-cream-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-ink text-[14px]">Performances par niveau</h3>
              <p className="text-xs text-ink/40">Moyenne obtenue par chaque promotion à ce module</p>
            </div>
            <span className="text-xs text-ink/50 bg-cream-100 rounded-full px-2.5 py-0.5">
              {niveaux.length} niveau{niveaux.length > 1 ? 'x' : ''}
            </span>
          </div>

          {niveaux.length > 0 ? (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={niveaux} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                  <CartesianGrid vertical={false} stroke="#EFEAE0" strokeDasharray="3 3" />
                  <XAxis dataKey="code_niv" tick={{ fontSize: 11, fill: '#0B1220', fillOpacity: 0.6 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 20]} ticks={[0, 5, 10, 15, 20]} tick={{ fontSize: 11, fill: '#0B1220', fillOpacity: 0.5 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip
                    formatter={(val) => [`${val}/20`, 'Moyenne']}
                    labelFormatter={(lbl) => `Promotion ${lbl}`}
                  />
                  <Bar dataKey="moyenne" radius={[4, 4, 0, 0]} barSize={28}>
                    {niveaux.map((entry, index) => (
                      <Cell key={`niv-bar-${index}`} fill={entry.moyenne !== null && entry.moyenne < 10 ? '#7A1620' : '#2C4A6E'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs text-ink/40">
              Aucune donnée par niveau pour cette sélection
            </div>
          )}
        </div>
      </div>

      {/* Onglets Promotions vs Évaluations Individuelles */}
      <div className="bg-white rounded-3xl border border-cream-200 shadow-xs overflow-hidden">
        <div className="border-b border-cream-200 px-6 pt-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('evaluations')}
              className={`pb-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'evaluations'
                  ? 'border-navy-800 text-navy-800'
                  : 'border-transparent text-ink/40 hover:text-ink/70'
              }`}
            >
              <FileText size={16} />
              Évaluations des Étudiants ({data.evaluations.length})
            </button>
            <button
              onClick={() => setActiveTab('niveaux')}
              className={`pb-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'niveaux'
                  ? 'border-navy-800 text-navy-800'
                  : 'border-transparent text-ink/40 hover:text-ink/70'
              }`}
            >
              <Layers size={16} />
              Promotions concernées ({niveaux.length})
            </button>
          </div>

          {activeTab === 'evaluations' && (
            <div className="relative pb-3 w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-2.5 text-ink/40" />
              <input
                type="text"
                placeholder="Rechercher étudiant, matricule, niveau..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-cream-200 text-xs text-ink placeholder:text-ink/40 focus:outline-navy-600"
              />
            </div>
          )}
        </div>

        {/* TAB 1 : TABLEAU DES ÉVALUATIONS DÉTAILLÉES */}
        {activeTab === 'evaluations' && (
          <div className="overflow-x-auto">
            {filteredEvaluations.length === 0 ? (
              <p className="text-xs text-ink/50 text-center py-12">Aucune évaluation ne correspond à cette recherche.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-cream-200/80 bg-cream-50/50 text-[11px] font-bold text-ink/50 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Étudiant</th>
                    <th className="py-3.5 px-6">Matricule</th>
                    <th className="py-3.5 px-6">Niveau</th>
                    <th className="py-3.5 px-6">Année</th>
                    <th className="py-3.5 px-6">Devoirs (CC)</th>
                    <th className="py-3.5 px-6">Examen SN</th>
                    <th className="py-3.5 px-6">Moyenne SN</th>
                    <th className="py-3.5 px-6">Rattrapage (Épreuve & 40/60)</th>
                    <th className="py-3.5 px-6">Statut Final</th>
                    <th className="py-3.5 px-6 text-right">Fiche</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-100 text-xs">
                  {filteredEvaluations.map((ev) => {
                    const isMoyLow = ev.moyenne !== null && ev.moyenne < 10.0;
                    return (
                      <tr
                        key={ev.id_eval}
                        onClick={() => navigate(`/students/${ev.id_etu}`)}
                        className="hover:bg-cream-50/50 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-6 font-semibold text-ink text-[13px] group-hover:text-navy-700 transition">
                          {ev.nom_complet}
                        </td>
                        <td className="py-3.5 px-6 font-mono text-xs text-ink/60">
                          {ev.matricule}
                        </td>
                        <td className="py-3.5 px-6">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              if (ev.id_niv) navigate(`/niveaux/${ev.id_niv}`);
                            }}
                            className="inline-flex px-2 py-0.5 rounded-md bg-cream-100 text-ink/80 font-semibold hover:bg-cream-200 transition"
                          >
                            {ev.niveau}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-ink/70">
                          {ev.annee || '—'}
                        </td>
                        <td className="py-3.5 px-6 text-ink/80">
                          {ev.note_devoir !== null ? `${Number(ev.note_devoir).toFixed(2)}/20` : '—'}
                        </td>
                        <td className="py-3.5 px-6 text-ink/80">
                          {ev.note_examen !== null ? `${Number(ev.note_examen).toFixed(2)}/20` : '—'}
                        </td>
                        <td className={`py-3.5 px-6 font-semibold ${isMoyLow ? 'text-maroon-600 font-bold' : 'text-ink'}`}>
                          {ev.moyenne !== null ? `${Number(ev.moyenne).toFixed(2)}/20` : '—'}
                        </td>
                        <td className="py-3.5 px-6">
                          {ev.note_rattrapage !== null ? (
                            <div className="space-y-0.5">
                              <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-900 rounded font-semibold border border-amber-200 text-xs">
                                Épreuve : {Number(ev.note_rattrapage).toFixed(2)}/20
                              </span>
                              {ev.moyenne_rattrapage !== null && (
                                <p className="text-[11px] text-ink/60 font-medium">
                                  Moy. 40/60 : <span className={Number(ev.moyenne_rattrapage) >= 10 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>{Number(ev.moyenne_rattrapage).toFixed(2)}/20</span>
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-ink/30">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6">
                          {ev.resultat === 'ADMIS' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={12} />
                              Admis (SN)
                            </span>
                          ) : ev.moyenne_rattrapage !== null && (Number(ev.moyenne_rattrapage) >= 10 || ev.resultat_rattrapage === 'ADMIS') ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Sparkles size={12} className="text-amber-500" />
                              Admis (Rattrapage)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-maroon-600 border border-rose-200">
                              <XCircle size={12} />
                              Ajourné
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-navy-600 group-hover:text-navy-800">
                            Fiche <ChevronRight size={13} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 2 : TABLEAU DES PROMOTIONS / NIVEAUX */}
        {activeTab === 'niveaux' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-cream-200/80 bg-cream-50/50 text-[11px] font-bold text-ink/50 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Promotion / Niveau</th>
                  <th className="py-3.5 px-6">Étudiants</th>
                  <th className="py-3.5 px-6">Moyenne Obtenue</th>
                  <th className="py-3.5 px-6">Taux de Réussite</th>
                  <th className="py-3.5 px-6">Taux d'Échec</th>
                  <th className="py-3.5 px-6 text-right">Fiche Niveau</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100 text-xs">
                {niveaux.map((n) => {
                  const isLow = n.moyenne !== null && n.moyenne < 10.0;
                  return (
                    <tr
                      key={n.id_niv}
                      onClick={() => navigate(`/niveaux/${n.id_niv}`)}
                      className="hover:bg-cream-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-6 font-bold text-ink text-[13px] group-hover:text-navy-700 transition">
                        {n.code_niv}
                      </td>
                      <td className="py-3.5 px-6 text-ink/80">
                        {n.effectif} étudiant{n.effectif > 1 ? 's' : ''}
                      </td>
                      <td className={`py-3.5 px-6 font-semibold ${isLow ? 'text-maroon-600 font-bold' : 'text-ink'}`}>
                        {n.moyenne !== null ? `${Number(n.moyenne).toFixed(2)}/20` : '—'}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-cream-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-navy-700 h-full rounded-full"
                              style={{ width: `${Math.min(100, Math.max(0, n.taux_reussite))}%` }}
                            />
                          </div>
                          <span className="font-semibold text-ink text-xs">{n.taux_reussite}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-ink/70">
                        {n.taux_echec}%
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-navy-600 group-hover:text-navy-800">
                          Voir la promotion <ChevronRight size={13} />
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
    </MainLayout>
  );
}
