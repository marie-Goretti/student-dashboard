import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
import { exportDashboardToPdf } from '../utils/pdfExportService';

export default function DashboardPage() {
  const navigate = useNavigate();
  const dashboardRef = useRef(null);
  const [filters, setFilters] = useState({});
  const [anneesList, setAnneesList] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [kpi, setKpi] = useState(null);
  const [parNiveau, setParNiveau] = useState([]);
  const [devoirVsExamen, setDevoirVsExamen] = useState([]);
  const [pointsCles, setPointsCles] = useState([]);
  const [evolution, setEvolution] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [comparaisonFilieres, setComparaisonFilieres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

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

  // Déclencheur du téléchargement direct du PDF
  const handleExportPdf = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const target = dashboardRef.current || document.getElementById('dashboard-export-container');
      const filename = `rapport_dashboard_lbs_${filters.id_annee ? `annee_${filters.id_annee}` : 'global'}.pdf`;
      await exportDashboardToPdf(target, filename);
    } catch (err) {
      console.error('Erreur export direct PDF:', err);
      // Fallback au mode impression système si html2canvas rencontre une restriction
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  // Résumé textuel des filtres actifs pour le rapport imprimé
  const activeFilterSummary = useMemo(() => {
    const parts = [];
    if (filters.id_annee) {
      const a = anneesList.find((item) => String(item.id_annee) === String(filters.id_annee));
      if (a) parts.push(`Année : ${a.annee_academique}`);
    } else {
      parts.push('Toutes les années');
    }
    if (filters.filiere) parts.push(`Filière : ${String(filters.filiere).toUpperCase()}`);
    if (filters.semestre) parts.push(`Semestre : S${String(filters.semestre).replace(/\D/g, '')}`);
    return parts.join(' • ');
  }, [filters, anneesList]);

  return (
    <MainLayout>
      <div ref={dashboardRef} id="dashboard-export-container" className="space-y-3.5">
        {/* 0. En-tête institutionnel réservé à l'impression / Export PDF */}
        <div className="hidden print:block mb-4 pb-3 border-b-2 border-navy-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-navy-900 text-white flex items-center justify-center font-bold text-sm tracking-wider">
                LBS
              </div>
              <div>
                <div className="text-xl font-bold tracking-tight text-navy-950 font-serif leading-tight">
                  Lomé Business School
                </div>
                <div className="text-xs font-semibold text-maroon-700 tracking-wide">
                  Rapport de Performance Académique & Pilotage Institutionnel
                </div>
              </div>
            </div>
            <div className="text-right text-[11px] text-ink/70">
              <div>Exporté le <strong>{new Date().toLocaleDateString('fr-FR')}</strong> à <strong>{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong></div>
              <div className="text-[10px] text-navy-800 font-semibold mt-0.5">
                {activeFilterSummary}
              </div>
            </div>
          </div>
        </div>

        {/* 1. En-tête : Titre + Bouton d'export PDF avec téléchargement direct */}
        <HeaderBar onExportPdf={handleExportPdf} isExporting={isExporting} />

        {/* 2. Hero Banner compact avec 4 indicateurs clés */}
        <HeroBanner
          kpi={kpi}
          onAlertClick={() => {
            navigate('/recommandations');
          }}
        />

        {/* 3. Barre de filtres compacte (masquée à l'export/impression) */}
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
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch print:grid-cols-12">
              <div className="md:col-span-6 lg:col-span-4 xl:col-span-4 print:col-span-4">
                <ManagementVsSiCard data={comparaisonFilieres} />
              </div>
              <div className="md:col-span-6 lg:col-span-5 xl:col-span-5 print:col-span-5">
                <EvolutionReussiteCard data={evolution} />
              </div>
              <div className="md:col-span-12 lg:col-span-3 xl:col-span-3 print:col-span-3">
                <PointsClesCard points={pointsCles} />
              </div>
            </div>

            {/* Rangée 2 : Distribution des notes et Devoir vs Examen */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-stretch print:grid-cols-2">
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

        {/* Pied de page institutionnel réservé à l'impression / Export PDF */}
        <div className="hidden print:flex items-center justify-between text-[10px] text-ink/50 pt-4 mt-6 border-t border-cream-200">
          <span>Lomé Business School • Plateforme de Pilotage Académique</span>
          <span>Document officiel généré pour analyse interne</span>
        </div>
      </div>
    </MainLayout>
  );
}
