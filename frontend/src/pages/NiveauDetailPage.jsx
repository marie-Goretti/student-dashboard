import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import HeaderBar from '../components/layout/HeaderBar';
import { getNiveauDetail } from '../api/dashboardService';
import {
  ArrowLeft, Users, BookOpen, TrendingUp, Award, AlertTriangle,
  RotateCcw, Search, ChevronRight, Layers, CheckCircle2, XCircle,
  GraduationCap, Calendar, BarChart3, Loader2
} from 'lucide-react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';

export default function NiveauDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAnnee, setSelectedAnnee] = useState('');
  const [selectedSemestre, setSelectedSemestre] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [activeTab, setActiveTab] = useState('modules'); // 'modules' | 'etudiants'

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (selectedAnnee) filters.id_annee = selectedAnnee;
      if (selectedSemestre) filters.semestre = selectedSemestre;
      const res = await getNiveauDetail(id, filters);
      setData(res);
    } catch (err) {
      console.error('Erreur chargement détail niveau:', err);
      setError("Impossible de charger les données de ce niveau.");
    } finally {
      setLoading(false);
    }
  }, [id, selectedAnnee, selectedSemestre]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrage des étudiants par recherche
  const filteredStudents = useMemo(() => {
    if (!data?.etudiants) return [];
    if (!studentSearch.trim()) return data.etudiants;
    const q = studentSearch.toLowerCase();
    return data.etudiants.filter(
      (e) =>
        e.nom_complet.toLowerCase().includes(q) ||
        e.matricule.toLowerCase().includes(q)
    );
  }, [data?.etudiants, studentSearch]);

  const getRiskBadge = (risque) => {
    switch (risque) {
      case 'Faible':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Faible
          </span>
        );
      case 'Moyen':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Moyen
          </span>
        );
      case 'Élevé':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-maroon-600 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-maroon-500" />
            Élevé
          </span>
        );
    }
  };

  if (loading && !data) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 size={36} className="animate-spin text-navy-600" />
          <p className="text-xs text-ink/50">Chargement de la fiche de promotion...</p>
        </div>
      </MainLayout>
    );
  }

  if (error || !data) {
    return (
      <MainLayout>
        <div className="p-8 text-center bg-white rounded-3xl border border-cream-200 my-8">
          <AlertTriangle className="mx-auto text-maroon-500 mb-3" size={36} />
          <h2 className="text-lg font-bold text-ink mb-1">Niveau introuvable</h2>
          <p className="text-xs text-ink/60 mb-4">{error || "Ce niveau n'existe pas ou ne contient aucune évaluation."}</p>
          <button
            onClick={() => navigate('/niveaux')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-800 text-white text-xs font-medium hover:bg-navy-900 transition"
          >
            <ArrowLeft size={14} /> Retour à l'analyse des niveaux
          </button>
        </div>
      </MainLayout>
    );
  }

  const { niveau, kpi, modules, distribution, evolution, annees } = data;
  const isMoyLow = kpi.moyenne_generale !== null && kpi.moyenne_generale < 10.0;

  return (
    <MainLayout>
      <HeaderBar title={`Fiche Niveau : ${niveau.code_niv}`} currentAnnee="2024–2025" />

      {/* Navigation retour & Breadcrumbs */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <button
          onClick={() => navigate('/niveaux')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/60 hover:text-navy-800 transition cursor-pointer"
        >
          <ArrowLeft size={14} /> Retour à l'analyse des niveaux
        </button>

        {/* Filtres contextuels : Année & Semestre */}
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
            <span className="text-ink/50 font-medium">Semestre</span>
            <select
              value={selectedSemestre}
              onChange={(e) => setSelectedSemestre(e.target.value)}
              className="bg-transparent text-ink font-semibold outline-none cursor-pointer text-xs"
            >
              <option value="">Tous</option>
              <option value="1">Semestre 1</option>
              <option value="2">Semestre 2</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hero Banner du Niveau */}
      <div className="bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 text-white rounded-3xl p-6 md:p-8 shadow-sm mb-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/5 to-transparent pointer-events-none" />
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-cream-100 text-xs font-medium mb-3 backdrop-blur-xs">
              <GraduationCap size={14} className="text-cream-200" />
              Promotion Universitaire
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
              {niveau.code_niv} — {niveau.libelle_niv}
            </h1>
            <p className="text-xs md:text-sm text-cream-100/70 max-w-xl">
              Tableau de bord de suivi académique spécifique à cette cohorte. Synthèse des résultats, performances par module et étudiants inscrits.
            </p>
          </div>

          {/* Badge résumé effectif */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-white">
              <Users size={22} />
            </div>
            <div>
              <p className="text-[11px] text-cream-200/80 uppercase font-bold tracking-wider">Effectif évalué</p>
              <p className="text-2xl font-black text-white">{kpi.effectif} <span className="text-xs font-normal text-cream-100/70">étudiants</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Grille des KPIs clés */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-6">
        {/* KPI 1 : Effectif */}
        <div className="bg-white rounded-2xl border border-cream-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-ink/50">Effectif</span>
            <Users size={15} className="text-navy-600" />
          </div>
          <p className="text-xl font-bold text-ink">{kpi.effectif}</p>
          <p className="text-[11px] text-ink/40 mt-1">{kpi.total_evaluations} évaluations</p>
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

        {/* KPI 3 : Taux Réussite */}
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

        {/* KPI 4 : Taux Échec */}
        <div className="bg-white rounded-2xl border border-cream-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-ink/50">Échec</span>
            <XCircle size={15} className="text-maroon-500" />
          </div>
          <p className="text-xl font-bold text-maroon-600">{kpi.taux_echec}%</p>
          <p className="text-[11px] text-ink/40 mt-1">{kpi.rattrapages} en rattrapage</p>
        </div>

        {/* KPI 5 : Devoir CC */}
        <div className="bg-white rounded-2xl border border-cream-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-ink/50">Devoirs (CC)</span>
            <span className="w-2.5 h-2.5 rounded-xs bg-[#2C4A6E]" />
          </div>
          <p className="text-xl font-bold text-[#2C4A6E]">
            {kpi.moyenne_devoir !== null ? `${kpi.moyenne_devoir}/20` : '—'}
          </p>
          <p className="text-[11px] text-ink/40 mt-1">Note contrôle continu</p>
        </div>

        {/* KPI 6 : Examen Final */}
        <div className="bg-white rounded-2xl border border-cream-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-ink/50">Examen Final</span>
            <span className="w-2.5 h-2.5 rounded-xs bg-[#7A1620]" />
          </div>
          <p className="text-xl font-bold text-[#7A1620]">
            {kpi.moyenne_examen !== null ? `${kpi.moyenne_examen}/20` : '—'}
          </p>
          <p className="text-[11px] text-ink/40 mt-1">Épreuve terminale</p>
        </div>
      </div>

      {/* Graphiques analytiques pour ce niveau */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {/* Graphique 1 : Distribution des notes de la promotion */}
        <div className="bg-white rounded-3xl border border-cream-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-ink text-[14px]">Distribution des notes</h3>
              <p className="text-xs text-ink/40">Répartition par tranche de performance sur 20</p>
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
                    <Cell key={`dist-${index}`} fill={entry.isBelow10 ? '#7A1620' : '#2C4A6E'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique 2 : Évolution pluriannuelle de ce niveau */}
        <div className="bg-white rounded-3xl border border-cream-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-ink text-[14px]">Progression pluriannuelle</h3>
              <p className="text-xs text-ink/40">Évolution de la moyenne et du taux de réussite par cohorte</p>
            </div>
            <span className="text-xs text-ink/50 bg-cream-100 rounded-full px-2.5 py-0.5">
              Historique
            </span>
          </div>

          {evolution && evolution.length > 0 ? (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolution} margin={{ top: 8, right: 12, left: -20, bottom: 8 }}>
                  <CartesianGrid vertical={false} stroke="#EFEAE0" strokeDasharray="3 3" />
                  <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#0B1220', fillOpacity: 0.6 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 20]} ticks={[0, 5, 10, 15, 20]} tick={{ fontSize: 11, fill: '#0B1220', fillOpacity: 0.5 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip
                    formatter={(val, name) => [
                      name === 'Moyenne' ? `${val}/20` : `${val}%`,
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="moyenne" name="Moyenne" stroke="#2C4A6E" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs text-ink/40">
              Historique insuffisant pour tracer la courbe
            </div>
          )}
        </div>
      </div>

      {/* Onglets Modules vs Étudiants */}
      <div className="bg-white rounded-3xl border border-cream-200 shadow-xs overflow-hidden">
        <div className="border-b border-cream-200 px-6 pt-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('modules')}
              className={`pb-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'modules'
                  ? 'border-navy-800 text-navy-800'
                  : 'border-transparent text-ink/40 hover:text-ink/70'
              }`}
            >
              <BookOpen size={16} />
              Modules du Niveau ({modules.length})
            </button>
            <button
              onClick={() => setActiveTab('etudiants')}
              className={`pb-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'etudiants'
                  ? 'border-navy-800 text-navy-800'
                  : 'border-transparent text-ink/40 hover:text-ink/70'
              }`}
            >
              <Users size={16} />
              Étudiants Inscrits ({data.etudiants.length})
            </button>
          </div>

          {activeTab === 'etudiants' && (
            <div className="relative pb-3 w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-2.5 text-ink/40" />
              <input
                type="text"
                placeholder="Rechercher un étudiant..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-cream-200 text-xs text-ink placeholder:text-ink/40 focus:outline-navy-600"
              />
            </div>
          )}
        </div>

        {/* TAB 1 : TABLEAU DES MODULES DU NIVEAU */}
        {activeTab === 'modules' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-cream-200/80 bg-cream-50/50 text-[11px] font-bold text-ink/50 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Code</th>
                  <th className="py-3.5 px-6">Nom du Module</th>
                  <th className="py-3.5 px-6">Semestre</th>
                  <th className="py-3.5 px-6">Moyenne</th>
                  <th className="py-3.5 px-6">Taux de Réussite</th>
                  <th className="py-3.5 px-6">Rattrapages</th>
                  <th className="py-3.5 px-6">Niveau de Risque</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100 text-xs">
                {modules.map((m) => {
                  const isModMoyLow = m.moyenne !== null && m.moyenne < 10.0;
                  return (
                    <tr
                      key={m.id_mod}
                      onClick={() => navigate(`/modules/${m.id_mod}`)}
                      className="hover:bg-cream-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-6 font-mono text-xs text-ink/60">
                        {m.code_mod}
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-ink text-[13px] group-hover:text-navy-700 transition">
                        {m.nom_mod}
                      </td>
                      <td className="py-3.5 px-6 text-ink/70">
                        {m.semestre ? `Semestre ${m.semestre}` : '—'}
                      </td>
                      <td className={`py-3.5 px-6 font-semibold ${isModMoyLow ? 'text-maroon-600 font-bold' : 'text-ink'}`}>
                        {m.moyenne !== null ? `${Number(m.moyenne).toFixed(2)}/20` : '—'}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-cream-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-navy-700 h-full rounded-full"
                              style={{ width: `${Math.min(100, Math.max(0, m.taux_reussite))}%` }}
                            />
                          </div>
                          <span className="font-semibold text-ink text-xs">{m.taux_reussite}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-ink/70">
                        {m.rattrapages}
                      </td>
                      <td className="py-3.5 px-6">
                        {getRiskBadge(m.risque)}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-navy-600 group-hover:text-navy-800">
                          Détails <ChevronRight size={13} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2 : TABLEAU DES ÉTUDIANTS DU NIVEAU */}
        {activeTab === 'etudiants' && (
          <div className="overflow-x-auto">
            {filteredStudents.length === 0 ? (
              <p className="text-xs text-ink/50 text-center py-12">Aucun étudiant ne correspond à cette recherche.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-cream-200/80 bg-cream-50/50 text-[11px] font-bold text-ink/50 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Étudiant</th>
                    <th className="py-3.5 px-6">Matricule</th>
                    <th className="py-3.5 px-6">Moyenne Générale</th>
                    <th className="py-3.5 px-6">Modules Validés</th>
                    <th className="py-3.5 px-6">En Difficulté</th>
                    <th className="py-3.5 px-6">Rattrapage</th>
                    <th className="py-3.5 px-6">Statut</th>
                    <th className="py-3.5 px-6 text-right">Fiche</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-100 text-xs">
                  {filteredStudents.map((e) => {
                    const isLow = e.moyenne < 10.0;
                    return (
                      <tr
                        key={e.id_etu}
                        onClick={() => navigate(`/students/${e.id_etu}`)}
                        className="hover:bg-cream-50/50 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-navy-100 text-navy-800 font-bold flex items-center justify-center text-[11px] shrink-0">
                              {e.initiales}
                            </div>
                            <span className="font-semibold text-ink text-[13px] group-hover:text-navy-700 transition">
                              {e.nom_complet}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-6 font-mono text-xs text-ink/60">
                          {e.matricule}
                        </td>
                        <td className={`py-3.5 px-6 font-semibold ${isLow ? 'text-maroon-600 font-bold' : 'text-ink'}`}>
                          {Number(e.moyenne).toFixed(2)}/20
                        </td>
                        <td className="py-3.5 px-6 text-emerald-700 font-medium">
                          {e.modules_valides} module{e.modules_valides > 1 ? 's' : ''}
                        </td>
                        <td className="py-3.5 px-6">
                          {e.en_difficulte > 0 ? (
                            <span className="text-maroon-600 font-medium">{e.en_difficulte} module{e.en_difficulte > 1 ? 's' : ''}</span>
                          ) : (
                            <span className="text-ink/40">0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6">
                          {e.rattrapages > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-maroon-600">
                              {e.rattrapages}
                            </span>
                          ) : (
                            <span className="text-ink/40">Non</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              e.statut === 'Admis'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-maroon-600 border border-rose-200'
                            }`}
                          >
                            {e.statut === 'Admis' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {e.statut}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-navy-600 group-hover:text-navy-800">
                            Voir fiche <ChevronRight size={13} />
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
      </div>
    </MainLayout>
  );
}
