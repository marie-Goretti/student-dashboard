import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import StudentSearchBar from '../components/students/StudentSearchBar';
import KpiCard from '../components/dashboard/KpiCard';
import LineChartCard from '../components/dashboard/LineChartCard';
import { getStudentDashboard } from '../api/dashboardService';
import { getAnnees } from '../api/academicsService';
import { BookOpen, TrendingUp, Award, RotateCcw, ArrowLeft, Mail, Calendar, Filter } from 'lucide-react';

const RESULTAT_BADGE = {
  ADMIS: 'bg-green-100 text-green-700',
  AJOURNE: 'bg-red-100 text-red-700',
  NON_EVALUE: 'bg-gray-100 text-gray-500',
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
            <KpiCard label="Modules évalués" value={data.kpi.total_modules_evalues} icon={BookOpen} color="primary" />
            <KpiCard label="Moyenne générale" value={data.kpi.moyenne_generale} icon={TrendingUp} color="amber" suffix="/20" />
            <KpiCard label="Taux de réussite" value={data.kpi.taux_reussite} icon={Award} color="green" suffix="%" />
            <KpiCard label="Rattrapages" value={data.kpi.nombre_rattrapages} icon={RotateCcw} color="red" />
          </div>

          {/* --- Évolution --- */}
          <div className="mb-6">
            <LineChartCard title="Évolution de la moyenne par année académique" data={data.evolution} />
          </div>

          {/* --- Relevé de notes détaillé avec filtres --- */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h3 className="font-semibold text-gray-800 text-base">Relevé de notes détaillé</h3>
                <p className="text-xs text-gray-500">
                  {data.modules.length} évaluation{data.modules.length > 1 ? 's' : ''} affichée{data.modules.length > 1 ? 's' : ''}
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

            {data.modules.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-10">
                Aucune évaluation enregistrée pour les filtres sélectionnés.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2.5 pr-4 font-semibold text-xs uppercase tracking-wider">Module</th>
                      <th className="py-2.5 pr-4 font-semibold text-xs uppercase tracking-wider">Semestre</th>
                      <th className="py-2.5 pr-4 font-semibold text-xs uppercase tracking-wider">Niveau</th>
                      <th className="py-2.5 pr-4 font-semibold text-xs uppercase tracking-wider">Année</th>
                      <th className="py-2.5 pr-4 font-semibold text-xs uppercase tracking-wider text-center">Note Devoir</th>
                      <th className="py-2.5 pr-4 font-semibold text-xs uppercase tracking-wider text-center">Note Examen</th>
                      <th className="py-2.5 pr-4 font-semibold text-xs uppercase tracking-wider text-center">Moyenne</th>
                      <th className="py-2.5 pr-4 font-semibold text-xs uppercase tracking-wider">Résultat</th>
                      <th className="py-2.5 pr-4 font-semibold text-xs uppercase tracking-wider text-center">Rattrapage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.modules.map((m, i) => {
                      const semLabel = m.semestre ? (String(m.semestre).startsWith('S') ? m.semestre : `S${m.semestre}`) : '—';
                      return (
                        <tr key={i} className="border-b last:border-0 hover:bg-gray-50/50 transition">
                          <td className="py-3 pr-4 font-medium text-gray-900">{m.module}</td>
                          <td className="py-3 pr-4 text-gray-600 font-medium">{semLabel}</td>
                          <td className="py-3 pr-4 text-gray-500">{m.niveau}</td>
                          <td className="py-3 pr-4 text-gray-500">{m.annee}</td>
                          <td className="py-3 pr-4 text-center font-medium text-gray-700">
                            {m.note_devoir !== null && m.note_devoir !== undefined ? Number(m.note_devoir).toFixed(2) : '—'}
                          </td>
                          <td className="py-3 pr-4 text-center font-medium text-gray-700">
                            {m.note_examen !== null && m.note_examen !== undefined ? Number(m.note_examen).toFixed(2) : '—'}
                          </td>
                          <td className="py-3 pr-4 text-center font-bold text-gray-900">
                            {m.moyenne !== null && m.moyenne !== undefined ? Number(m.moyenne).toFixed(2) : '—'}
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${RESULTAT_BADGE[m.resultat]}`}>
                              {RESULTAT_LABEL[m.resultat] || m.resultat}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-center text-gray-600 font-medium">
                            {m.note_rattrapage !== null && m.note_rattrapage !== undefined ? Number(m.note_rattrapage).toFixed(2) : '—'}
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