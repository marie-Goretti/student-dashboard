import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import StudentSearchBar from '../components/students/StudentSearchBar';
import KpiCard from '../components/dashboard/KpiCard';
import LineChartCard from '../components/dashboard/LineChartCard';
import { getStudentDashboard } from '../api/dashboardService';
import { BookOpen, TrendingUp, Award, RotateCcw, ArrowLeft, Mail, Calendar } from 'lucide-react';

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

  useEffect(() => {
    setLoading(true);
    setError(null);
    getStudentDashboard(id)
      .then(setData)
      .catch(() => setError("Étudiant introuvable."))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <button
            onClick={() => navigate('/students')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft size={14} /> Retour à la recherche
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Fiche Étudiant</h1>
        </div>
        <div className="w-full sm:w-80">
          <StudentSearchBar />
        </div>
      </div>

      {loading && <p className="text-gray-400 text-center py-20">Chargement...</p>}
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
            <div className="flex gap-6 text-sm text-gray-500">
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

          {/* --- Relevé de notes détaillé --- */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Relevé de notes détaillé</h3>
            {data.modules.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-10">Aucune évaluation enregistrée.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-4">Module</th>
                      <th className="py-2 pr-4">Niveau</th>
                      <th className="py-2 pr-4">Année</th>
                      <th className="py-2 pr-4">Devoirs (40%)</th>
                      <th className="py-2 pr-4">Examen (60%)</th>
                      <th className="py-2 pr-4">Moyenne</th>
                      <th className="py-2 pr-4">Résultat</th>
                      <th className="py-2 pr-4">Rattrapage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.modules.map((m, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium text-gray-800">{m.module}</td>
                        <td className="py-2 pr-4 text-gray-500">{m.niveau}</td>
                        <td className="py-2 pr-4 text-gray-500">{m.annee}</td>
                        <td className="py-2 pr-4 text-gray-500">{m.note_devoir_40 ?? '—'}</td>
                        <td className="py-2 pr-4 text-gray-500">{m.note_examen_60 ?? '—'}</td>
                        <td className="py-2 pr-4 font-semibold text-gray-800">{m.moyenne ?? '—'}</td>
                        <td className="py-2 pr-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RESULTAT_BADGE[m.resultat]}`}>
                            {RESULTAT_LABEL[m.resultat]}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-gray-500">{m.note_rattrapage ?? '—'}</td>
                      </tr>
                    ))}
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