from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DimNiveauViewSet, DimEtudiantViewSet

router = DefaultRouter()
router.register('niveaux', DimNiveauViewSet, basename='niveau')
router.register('etudiants', DimEtudiantViewSet, basename='etudiant')

app_name = 'students'
urlpatterns = [path('', include(router.urls))]