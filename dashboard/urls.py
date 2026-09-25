from django.urls import path
from .views import (
    KpiSummaryView, RepartitionParNiveauView, RepartitionParModuleView,
    EvolutionParAnneeView, DistributionNotesView, TopModulesView, StudentDashboardView,
)

app_name = 'dashboard'
urlpatterns = [
    path('kpi-summary/', KpiSummaryView.as_view(), name='kpi-summary'),
    path('repartition-niveau/', RepartitionParNiveauView.as_view(), name='repartition-niveau'),
    path('repartition-module/', RepartitionParModuleView.as_view(), name='repartition-module'),
    path('evolution-annee/', EvolutionParAnneeView.as_view(), name='evolution-annee'),
    path('distribution-notes/', DistributionNotesView.as_view(), name='distribution-notes'),
    path('top-modules/', TopModulesView.as_view(), name='top-modules'),
    path('student/<int:id_etu>/', StudentDashboardView.as_view(), name='student-dashboard'),
]