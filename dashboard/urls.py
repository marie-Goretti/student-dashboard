from django.urls import path
from .views import (
    KpiSummaryView, RepartitionParNiveauView, RepartitionParModuleView,
    EvolutionParAnneeView, DistributionNotesView, ComparaisonFilieresView,
    TopModulesView, StudentDashboardView, DevoirVsExamenView, PointsClesView,
    AnalyseNiveauxView, AnalyseModulesView, AnalyseEtudiantsView,
    AnalyseRattrapagesView, RecommandationsView,
    NiveauDetailView, ModuleDetailView,
)

app_name = 'dashboard'
urlpatterns = [
    path('kpi-summary/', KpiSummaryView.as_view(), name='kpi-summary'),
    path('repartition-niveau/', RepartitionParNiveauView.as_view(), name='repartition-niveau'),
    path('analyse-niveaux/', AnalyseNiveauxView.as_view(), name='analyse-niveaux'),
    path('niveau/<str:id_or_code>/', NiveauDetailView.as_view(), name='niveau-detail'),
    path('analyse-modules/', AnalyseModulesView.as_view(), name='analyse-modules'),
    path('module/<str:id_or_code>/', ModuleDetailView.as_view(), name='module-detail'),
    path('analyse-etudiants/', AnalyseEtudiantsView.as_view(), name='analyse-etudiants'),
    path('analyse-rattrapages/', AnalyseRattrapagesView.as_view(), name='analyse-rattrapages'),
    path('recommandations/', RecommandationsView.as_view(), name='recommandations'),
    path('devoir-vs-examen/', DevoirVsExamenView.as_view(), name='devoir-vs-examen'),
    path('points-cles/', PointsClesView.as_view(), name='points-cles'),
    path('repartition-module/', RepartitionParModuleView.as_view(), name='repartition-module'),
    path('evolution-annee/', EvolutionParAnneeView.as_view(), name='evolution-annee'),
    path('distribution-notes/', DistributionNotesView.as_view(), name='distribution-notes'),
    path('comparaison-filieres/', ComparaisonFilieresView.as_view(), name='comparaison-filieres'),
    path('top-modules/', TopModulesView.as_view(), name='top-modules'),
    path('student/<str:id_or_matricule>/', StudentDashboardView.as_view(), name='student-dashboard'),
]