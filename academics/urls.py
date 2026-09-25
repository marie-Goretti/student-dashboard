from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DimModuleViewSet, DimAnneeAcademiqueViewSet, FactEvaluationViewSet

router = DefaultRouter()
router.register('modules', DimModuleViewSet, basename='module')
router.register('annees', DimAnneeAcademiqueViewSet, basename='annee')
router.register('evaluations', FactEvaluationViewSet, basename='evaluation')

app_name = 'academics'
urlpatterns = [path('', include(router.urls))]