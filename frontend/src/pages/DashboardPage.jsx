import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import HeaderBar from '../components/layout/HeaderBar';
import HeroBanner from '../components/dashboard/HeroBanner';
import FiltersBar from '../components/dashboard/FiltersBar';
import SecondaryKpiRow from '../components/dashboard/SecondaryKpiRow';
import ManagementVsSiCard from '../components/dashboard/ManagementVsSiCard';
import EvolutionReussiteCard from '../components/dashboard/EvolutionReussiteCard';
import PointsClesCard from '../components/dashboard/PointsClesCard';
import DistributionNotesCard from '../components/dashboard/DistributionNotesCard';
import DevoirVsExamenCard from '../components/dashboard/DevoirVsExamenCard';
import { getAnnees } from '../api/academicsService';
import {
  getKpiSummary,
  getRepartitionParNiveau,
  getDevoirVsExamen,
  getPointsCles,
  getEvolutionParAnnee,
  getDistributionNotes,
  getComparaisonFilieres,
} from '../api/dashboardService';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({});
  const [isReady, setIsReady] = useState(false);
  const [kpi, setKpi] = useState(null);
  const [parNiveau, setParNiveau] = useState([]);
  const [devoirVsExamen, setDevoirVsExamen] = useState([]);
  const [pointsCles, setPointsCles] = useState([]);
  const [evolution, setEvolution] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [comparaisonFilieres, setComparaisonFilieres] = useState([]);
  const [loading, setLoading] = useState(true);

  // Charger la dernière année (la plus élevée) par défaut
  useEffect(() => {
    getAnnees()
      .then((data) => {
        const list = (data.results ?? data)
          .filter((a) => a.annee_academique && a.annee_academique !== 'nan' && a.annee_academique !== 'None')
          .sort((a, b) => String(b.annee_academique).localeCompare(String(a.annee_academique)));
        if (list.length > 0) {
          setFilters({ id_annee: list[0].id_annee });
        }
        setIsReady(true);
      })
      .catch((err) => {
        console.error('Erreur chargement années:', err);
        setIsReady(true);
      });
  }, []);

  const loadData = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    try {
      const [
        kpiData,
        niveauData,
        devoirData,
        pointsData,
        evolutionData,
        distribData,
        filieresData,
      ] = await Promise.all([
        getKpiSummary(filters),
        getRepartitionParNiveau(filters),
        getDevoirVsExamen(filters),
        getPointsCles(filters),
        getEvolutionParAnnee(filters),
        getDistributionNotes(filters),
        getComparaisonFilieres(filters),
      ]);

      setKpi(kpiData);
      setParNiveau(niveauData);
      setDevoirVsExamen(devoirData);
      setPointsCles(pointsData);
      setEvolution(evolutionData);
      setDistribution(distribData);
      setComparaisonFilieres(filieresData);
    } catch (err) {
      console.error('Erreur chargement dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, isReady]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <MainLayout>
      {/* 1. En-tête : Titre */}
      <HeaderBar />

      {/* 2. Hero Banner compact avec 4 indicateurs clés */}
      <HeroBanner
        kpi={kpi}
        onAlertClick={() => {
          navigate('/recommandations');
        }}
      />

      {/* 3. Barre de filtres compacte */}
      <FiltersBar
        filters={filters}
        onChange={setFilters}
        showModule={true}
        showSemestre={true}
        defaultLatestAnnee={true}
      />

      {/* 4. Rangée secondaire des 4 métriques opérationnelles */}
      <SecondaryKpiRow kpi={kpi} />

      {/* 5. Section analytique principale : 3 colonnes compactes */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-2.5">
            <div className="w-7 h-7 border-3 border-navy-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-ink/50">Mise à jour des analyses en cours...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* Rangée 1 : 3 cartes (Management vs SI, Évolution de la réussite, Points clés détectés) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch">
            <div className="md:col-span-6 lg:col-span-4 xl:col-span-4">
              <ManagementVsSiCard data={comparaisonFilieres} />
            </div>
            <div className="md:col-span-6 lg:col-span-5 xl:col-span-5">
              <EvolutionReussiteCard data={evolution} />
            </div>
            <div className="md:col-span-12 lg:col-span-3 xl:col-span-3">
              <PointsClesCard points={pointsCles} />
            </div>
          </div>

          {/* Rangée 2 : Distribution des notes et Devoir vs Examen */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-stretch">
            <DistributionNotesCard
              data={distribution}
              onExploreClick={() => {
                navigate('/students');
              }}
            />
            <DevoirVsExamenCard data={devoirVsExamen} />
          </div>
        </div>
      )}
    </MainLayout>
  );
}
