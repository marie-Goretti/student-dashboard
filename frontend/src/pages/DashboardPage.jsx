import { useEffect, useState, useCallback } from 'react';
import MainLayout from '../components/layout/MainLayout';
import FiltersBar from '../components/dashboard/FiltersBar';
import HeroStatCard from '../components/dashboard/HeroStatCard';
import BarChartCard from '../components/dashboard/BarChartCard';
import LineChartCard from '../components/dashboard/LineChartCard';
import TopModulesList from '../components/dashboard/TopModulesList';
import {
  getKpiSummary, getRepartitionParNiveau, getRepartitionParModule,
  getEvolutionParAnnee, getDistributionNotes, getTopModules,
} from '../api/dashboardService';
import { Users, TrendingUp, Award, RotateCcw } from 'lucide-react';

// Les 10 niveaux officiels : sert à exclure les codes résiduels/invalides
// (ex: 'NAN') des graphiques, en plus du filtre déjà appliqué côté sélecteur.
const NIVEAU_OFFICIELS = [
  'B1M', 'B1SI', 'B2M', 'B2SI', 'B3M', 'B3SI',
  'M1M', 'M1SI', 'M2M', 'M2SI',
];

export default function DashboardPage() {
  const [filters, setFilters] = useState({});
  const [kpi, setKpi] = useState(null);
  const [parNiveau, setParNiveau] = useState([]);
  const [parModule, setParModule] = useState([]);
  const [evolution, setEvolution] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [topModules, setTopModules] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiData, niveauData, moduleData, evolutionData, distribData, topModulesData] = await Promise.all([
        getKpiSummary(filters),
        getRepartitionParNiveau(filters),
        getRepartitionParModule(filters),
        getEvolutionParAnnee(filters),
        getDistributionNotes(filters),
        getTopModules(filters, 5),
      ]);
      setKpi(kpiData);
      setParNiveau(niveauData);
      setParModule(moduleData);
      setEvolution(evolutionData);
      setDistribution(distribData);
      setTopModules(topModulesData);
    } catch (err) {
      console.error('Erreur chargement dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Cartes KPI compactes, superposées en bas à gauche du Hero ---
  const heroStats = (
    <div className="flex flex-wrap gap-3">
      <HeroStatCard label="Effectif total évalué" value={kpi?.effectif_total_evalue} icon={Users} />
      <HeroStatCard label="Taux de réussite" value={kpi?.taux_reussite} icon={Award} suffix="%" />
      <HeroStatCard label="Moyenne générale" value={kpi?.moyenne_generale} icon={TrendingUp} suffix="/20" />
      <HeroStatCard label="Passage en rattrapage" value={kpi?.taux_passage_rattrapage} icon={RotateCcw} suffix="%" />
    </div>
  );

  return (
    <MainLayout heroContent={heroStats}>
      <FiltersBar filters={filters} onChange={setFilters} />

      {loading ? (
        <p className="text-ink/40 text-center py-20">Chargement des données...</p>
      ) : (
        <>
          {/* --- 3 colonnes égales : niveau / module / top 5 --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6 items-stretch">
            <BarChartCard
              title="Moyenne par niveau"
              data={parNiveau.filter((n) => NIVEAU_OFFICIELS.includes(n.niveau))}
              xKey="niveau"
              bars={[{ key: 'moyenne', name: 'Moyenne' }]}
              shadeByValue
              angledLabels
            />
            <BarChartCard
              title="Moyenne & réussite par module"
              data={parModule}
              xKey="module"
              bars={[
                { key: 'moyenne', name: 'Moyenne' },
                { key: 'taux_reussite', name: 'Taux réussite (%)' },
              ]}
            />
            <TopModulesList modules={topModules} />
          </div>

          {/* --- Graphiques complémentaires --- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LineChartCard title="Évolution par année académique" data={evolution} />
            <BarChartCard
              title="Distribution des notes"
              data={distribution}
              xKey="tranche"
              bars={[{ key: 'effectif', name: "Nombre d'étudiants" }]}
            />
          </div>
        </>
      )}
    </MainLayout>
  );
}