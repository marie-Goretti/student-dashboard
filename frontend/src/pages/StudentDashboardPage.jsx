import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import StudentSearchBar from '../components/students/StudentSearchBar';
import KpiCard from '../components/dashboard/KpiCard';
import LineChartCard from '../components/dashboard/LineChartCard';
import { getStudentDashboard } from '../api/dashboardService';
import { getAnnees } from '../api/academicsService';
import { BookOpen, TrendingUp, Award, RotateCcw, ArrowLeft, Mail, Calendar, Filter, CheckCircle2, XCircle, Info, Sparkles } from 'lucide-react';

const RESULTAT_BADGE = {
  ADMIS: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  AJOURNE: 'bg-rose-50 text-rose-700 border border-rose-200',
  NON_EVALUE: 'bg-gray-100 text-gray-500 border border-gray-200',
};

const RESULTAT_LABEL = {
  ADMIS: 'Admis',
  AJOURNE: 'Ajourné',
  NON_EVALUE: 'Non évalué',
};

export default function StudentDashboardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anneesList, setAnneesList] = useState([]);
  const [studentFilters, setStudentFilters] = useState({ id_annee: '', semestre: '' });

  useEffect(() => {
    getAnnees()
      .then((res) => {
        const list = (res.results ?? res)
          .filter((a) => a.annee_academique && a.annee_academique !== 'nan' && a.annee_academique !== 'None')
          .sort((a, b) => String(b.annee_academique).localeCompare(String(a.annee_academique)));
        setAnneesList(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getStudentDashboard(id, studentFilters)
      .then(setData)
      .catch(() => setError("Étudiant introuvable."))
      .finally(() => setLoading(false));
  }, [id, studentFilters]);

  const hasFilters = Boolean(studentFilters.id_annee || studentFilters.semestre);

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <button
            onClick={() => navigate('/students')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2 cursor-pointer"
          >
            <ArrowLeft size={14} /> Retour à la recherche
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Fiche Étudiant</h1>
        </div>
        <div className="w-full sm:w-80">
          <StudentSearchBar />
        </div>
      </div>

      {loading && !data && <p className="text-gray-400 text-center py-20">Chargement...</p>}
      {error && <p className="text-red-500 text-center py-20">{error}</p>}

      {data && (
        <>
          {/* --- Infos étudiant --- */}
          <div className="bg-white rounded-xl shadow-sm border p-5 mb-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {data.etudiant.nom} {data.etudiant.prenom}
              </h2>
              <p className="text-sm text-gray-500">Matricule : {data.etudiant.matricule}</p>
            </div>
            <div className="flex gap-6 text-sm text-gray-500 flex-wrap">
              {data.etudiant.mail && (
                <div className="flex items-center gap-1.5">
                  <Mail size={14} /> {data.etudiant.mail}
                </div>
              )}
              {data.etudiant.annee_souscription && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} /> Inscrit en {data.etudiant.annee_souscription}
                </div>
              )}
            </div>
          </div>

          {/* --- KPI Cards --- */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <KpiCard label="Modules évalués" value={data.kpi?.total_modules_evalues ?? 0} icon={BookOpen} color="primary" />
            <KpiCard label="Moyenne générale" value={data.kpi?.moyenne_generale ?? '—'} icon={TrendingUp} color="amber" suffix={data.kpi?.moyenne_generale !== null && data.kpi?.moyenne_generale !== undefined ? '/20' : ''} />
            <KpiCard label="Taux de réussite" value={data.kpi?.taux_reussite ?? 0} icon={Award} color="green" suffix="%" />
            <KpiCard label="Rattrapages" value={data.kpi?.nombre_rattrapages ?? 0} icon={RotateCcw} color="red" />
          </div>

          {/* --- Évolution --- */}
          <div className="mb-6">
            <LineChartCard title="Évolution de la moyenne par année académique" data={data.evolution || []} />
          </div>

          {/* --- Relevé de notes détaillé avec filtres --- */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h3 className="font-semibold text-gray-800 text-base">Relevé de notes détaillé</h3>
                <p className="text-xs text-gray-500">
                  {data.modules?.length ?? 0} évaluation{data.modules?.length > 1 ? 's' : ''} affichée{data.modules?.length > 1 ? 's' : ''}
                </p>
              </div>

              {/* Filtres : Année Académique & Semestre */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Filtre Année */}
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs">
                  <span className="text-gray-500 font-medium">Année :</span>
                  <select
                    value={studentFilters.id_annee}
                    onChange={(e) => setStudentFilters({ ...studentFilters, id_annee: e.target.value })}
                    className="bg-transparent font-semibold text-gray-800 outline-none cursor-pointer"
                  >
                    <option value="">Toutes les années</option>
                    {anneesList.map((a) => (
                      <option key={a.id_annee} value={a.id_annee}>
                        {a.annee_academique}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtre Semestre */}
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs">
                  <span className="text-gray-500 font-medium">Semestre :</span>
                  <select
                    value={studentFilters.semestre}
                    onChange={(e) => setStudentFilters({ ...studentFilters, semestre: e.target.value })}
                    className="bg-transparent font-semibold text-gray-800 outline-none cursor-pointer"
                  >
                    <option value="">Tous les semestres</option>
                    <option value="1">Semestre 1</option>
                    <option value="2">Semestre 2</option>
                  </select>
                </div>

                {/* Réinitialiser */}
                {hasFilters && (
                  <button
                    onClick={() => setStudentFilters({ id_annee: '', semestre: '' })}
                    className="flex items-center gap-1 text-xs text-maroon-600 hover:text-maroon-800 bg-maroon-50 hover:bg-maroon-100 px-2.5 py-1.5 rounded-xl font-medium transition cursor-pointer"
                    title="Réinitialiser les filtres"
                  >
                    <RotateCcw size={12} />
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>

            {/* Note explicative sur la règle du rattrapage 40% / 60% */}
            <div className="mb-4 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
              <Info size={16} className="text-amber-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <span className="font-semibold text-amber-950">Règle de validation des rattrapages :</span> Lorsqu'un étudiant n'atteint pas 10/20 en session normale (40% Devoir + 60% Examen), il passe en rattrapage. La note de rattrapage remplace la note d'examen (conservée pour historique) dans le calcul : <span className="font-semibold">40% Devoir (CC) + 60% Rattrapage</span>. Si cette moyenne recalculée atteint <span className="font-semibold text-emerald-800">≥ 10/20</span>, le module est validé (<span className="font-semibold text-emerald-800">Admis</span>), sinon il est définitivement ajourné.
              </p>
            </div>

            {!data.modules || data.modules.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-10">
                Aucune évaluation enregistrée pour les filtres sélectionnés.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2.5 pr-4 font-semibold text-xs uppercase tracking-wider">Module</th>
                      <th className="py-2.5 pr-3 font-semibold text-xs uppercase tracking-wider">Sem.</th>
                      <th className="py-2.5 pr-3 font-semibold text-xs uppercase tracking-wider">Niveau</th>
                      <th className="py-2.5 pr-3 font-semibold text-xs uppercase tracking-wider">Année</th>
                      <th className="py-2.5 pr-3 font-semibold text-xs uppercase tracking-wider text-center">Devoir CC (40%)</th>
                      <th className="py-2.5 pr-3 font-semibold text-xs uppercase tracking-wider text-center">Examen SN (60%)</th>
                      <th className="py-2.5 pr-3 font-semibold text-xs uppercase tracking-wider text-center">Moyenne SN</th>
                      <th className="py-2.5 pr-3 font-semibold text-xs uppercase tracking-wider text-center">Session Normale</th>
                      <th className="py-2.5 pr-3 font-semibold text-xs uppercase tracking-wider text-center">Épreuve Rattrapage</th>
                      <th className="py-2.5 pr-3 font-semibold text-xs uppercase tracking-wider text-center">Moy. Recalculée (40/60)</th>
                      <th className="py-2.5 pr-4 font-semibold text-xs uppercase tracking-wider text-right">Statut Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.modules || []).map((m, i) => {
                      const semLabel = m.semestre ? (String(m.semestre).startsWith('S') ? m.semestre : `S${m.semestre}`) : '—';
                      const hasRat = m.note_rattrapage !== null && m.note_rattrapage !== undefined;
                      const isAdmisNormal = m.resultat === 'ADMIS' || (m.moyenne !== null && m.moyenne >= 10);
                      const isAdmisRat = hasRat && (
                        m.resultat_rattrapage === 'ADMIS' ||
                        (m.moyenne_rattrapage !== null && Number(m.moyenne_rattrapage) >= 10)
                      );
                      const isAdmisFinal = isAdmisNormal || isAdmisRat;

                      return (
                        <tr key={i} className="border-b last:border-0 hover:bg-gray-50/50 transition">
                          <td className="py-3 pr-4 font-semibold text-gray-900">
                            {m.module}
                          </td>
                          <td className="py-3 pr-3 text-gray-600 font-medium">{semLabel}</td>
                          <td className="py-3 pr-3 text-gray-500">{m.niveau}</td>
                          <td className="py-3 pr-3 text-gray-500">{m.annee}</td>

                          {/* Devoir CC (40%) */}
                          <td className="py-3 pr-3 text-center font-medium text-gray-700">
                            {m.note_devoir !== null && m.note_devoir !== undefined ? `${Number(m.note_devoir).toFixed(2)}/20` : '—'}
                          </td>

                          {/* Examen SN (60%) */}
                          <td className="py-3 pr-3 text-center font-medium text-gray-700">
                            {m.note_examen !== null && m.note_examen !== undefined ? `${Number(m.note_examen).toFixed(2)}/20` : '—'}
                          </td>

                          {/* Moyenne SN */}
                          <td className={`py-3 pr-3 text-center font-bold ${m.moyenne < 10 ? 'text-rose-600' : 'text-gray-900'}`}>
                            {m.moyenne !== null && m.moyenne !== undefined ? `${Number(m.moyenne).toFixed(2)}/20` : '—'}
                          </td>

                          {/* Session Normale Résultat */}
                          <td className="py-3 pr-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${RESULTAT_BADGE[m.resultat] || 'bg-gray-100 text-gray-600'}`}>
                              {m.resultat === 'ADMIS' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                              {RESULTAT_LABEL[m.resultat] || m.resultat}
                            </span>
                          </td>

                          {/* Épreuve de rattrapage (/20) */}
                          <td className="py-3 pr-3 text-center font-semibold text-gray-800">
                            {hasRat ? (
                              <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-900 rounded font-bold border border-amber-200">
                                {Number(m.note_rattrapage).toFixed(2)}/20
                              </span>
                            ) : (
                              <span className="text-gray-300 font-normal">—</span>
                            )}
                          </td>

                          {/* Moyenne recalculée (40% Devoir + 60% Rattrapage) */}
                          <td className="py-3 pr-3 text-center font-bold">
                            {hasRat && m.moyenne_rattrapage !== null && m.moyenne_rattrapage !== undefined ? (
                              <span className={`${Number(m.moyenne_rattrapage) >= 10 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {Number(m.moyenne_rattrapage).toFixed(2)}/20
                              </span>
                            ) : (
                              <span className="text-gray-300 font-normal">—</span>
                            )}
                          </td>

                          {/* Statut Final */}
                          <td className="py-3 pr-4 text-right">
                            {isAdmisNormal ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 size={12} />
                                Admis (SN)
                              </span>
                            ) : isAdmisRat ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                                <Sparkles size={12} className="text-amber-500" />
                                Admis (Rattrapage)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle size={12} />
                                Ajourné
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </MainLayout>
  );
}