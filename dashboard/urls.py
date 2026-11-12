from django.urls import path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.reverse import reverse
from .views import (
    KpiSummaryView, RepartitionParNiveauView, RepartitionParModuleView,
    EvolutionParAnneeView, DistributionNotesView, ComparaisonFilieresView,
    TopModulesView, StudentDashboardView, DevoirVsExamenView, PointsClesView,
    AnalyseNiveauxView, AnalyseModulesView, AnalyseEtudiantsView,
    AnalyseRattrapagesView, RecommandationsView,
    NiveauDetailView, ModuleDetailView,
)


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request, format=None):
    return Response({
        'kpi-summary': reverse('dashboard:kpi-summary', request=request, format=format),
        'repartition-niveau': reverse('dashboard:repartition-niveau', request=request, format=format),
        'analyse-niveaux': reverse('dashboard:analyse-niveaux', request=request, format=format),
        'analyse-modules': reverse('dashboard:analyse-modules', request=request, format=format),
        'analyse-etudiants': reverse('dashboard:analyse-etudiants', request=request, format=format),
        'analyse-rattrapages': reverse('dashboard:analyse-rattrapages', request=request, format=format),
        'recommandations': reverse('dashboard:recommandations', request=request, format=format),
        'devoir-vs-examen': reverse('dashboard:devoir-vs-examen', request=request, format=format),
        'points-cles': reverse('dashboard:points-cles', request=request, format=format),
        'repartition-module': reverse('dashboard:repartition-module', request=request, format=format),
        'evolution-annee': reverse('dashboard:evolution-annee', request=request, format=format),
        'distribution-notes': reverse('dashboard:distribution-notes', request=request, format=format),
        'comparaison-filieres': reverse('dashboard:comparaison-filieres', request=request, format=format),
        'top-modules': reverse('dashboard:top-modules', request=request, format=format),
    })


app_name = 'dashboard'
urlpatterns = [
    path('', api_root, name='api-root'),
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
