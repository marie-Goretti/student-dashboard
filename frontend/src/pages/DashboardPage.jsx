import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import HeaderBar from '../components/layout/HeaderBar';
import HeroBanner from '../components/dashboard/HeroBanner';
import FiltersBar from '../components/dashboard/FiltersBar';
import MoyenneParNiveauCard from '../components/dashboard/MoyenneParNiveauCard';
import DevoirVsExamenCard from '../components/dashboard/DevoirVsExamenCard';
import PointsClesCard from '../components/dashboard/PointsClesCard';
import EvolutionReussiteCard from '../components/dashboard/EvolutionReussiteCard';
import DistributionNotesCard from '../components/dashboard/DistributionNotesCard';
import { getAnnees } from '../api/academicsService';
import {
  getKpiSummary,
  getRepartitionParNiveau,
  getDevoirVsExamen,
  getPointsCles,
  getEvolutionParAnnee,
  getDistributionNotes,
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
  const [loading, setLoading] = useState(true);

  const [anneesList, setAnneesList] = useState([]);

  // Charger la dernière année (la plus élevée) par défaut
  useEffect(() => {
    getAnnees()
      .then((data) => {
        const list = (data.results ?? data)
          .filter((a) => a.annee_academique && a.annee_academique !== 'nan' && a.annee_academique !== 'None')
          .sort((a, b) => String(b.annee_academique).localeCompare(String(a.annee_academique)));
        setAnneesList(list);
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
      ] = await Promise.all([
        getKpiSummary(filters),
        getRepartitionParNiveau(filters),
        getDevoirVsExamen(filters),
        getPointsCles(filters),
        getEvolutionParAnnee(filters),
        getDistributionNotes(filters),
      ]);

      setKpi(kpiData);
      setParNiveau(niveauData);
      setDevoirVsExamen(devoirData);
      setPointsCles(pointsData);
      setEvolution(evolutionData);
      setDistribution(distribData);
    } catch (err) {
      console.error('Erreur chargement dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, isReady]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeYearLabel =
    anneesList.find((a) => String(a.id_annee) === String(filters.id_annee))?.annee_academique ||
    anneesList[0]?.annee_academique ||
    '';

  return (
    <MainLayout>
      {/* 1. En-tête : Titre, Année dynamique */}
      <HeaderBar currentAnnee={activeYearLabel} />

      {/* 2. Hero Banner avec image de campus contenant les 4 KPIs : Nombre d'étudiants, Moyenne générale, Taux de réussite, Taux d'échec */}
      <HeroBanner
        kpi={kpi}
        onAlertClick={() => {
          navigate('/recommandations');
        }}
      />

      {/* 3. Barre de filtres : sans module, avec semestre, et année par défaut sur la plus élevée */}
      <FiltersBar
        filters={filters}
        onChange={setFilters}
        showModule={false}
        showSemestre={true}
        defaultLatestAnnee={true}
      />

      {/* 5. Section des graphiques demandés */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-navy-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-ink/50">Mise à jour des analyses en cours...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Rangée 1 : 3 graphiques (Moyenne par niveau, Évolution linéaire de la réussite, Points clés détectés) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            <MoyenneParNiveauCard data={parNiveau} />
            <EvolutionReussiteCard data={evolution} currentPeriod={activeYearLabel} />
            <PointsClesCard points={pointsCles} />
          </div>

          {/* Rangée 2 : 2 graphiques larges (Devoir vs examen final moyenne, Distribution des notes) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
            <DevoirVsExamenCard data={devoirVsExamen} />
            <DistributionNotesCard
              data={distribution}
              onExploreClick={() => {
                alert('Exploration des cohortes par tranche de performance');
              }}
            />
          </div>
        </div>
      )}
    </MainLayout>
  );
}