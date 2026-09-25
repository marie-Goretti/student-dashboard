from rest_framework import viewsets, mixins, filters as drf_filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import DimEtudiant, DimNiveau
from .serializers import DimEtudiantSerializer, DimNiveauSerializer


class DimNiveauViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """GET /api/students/niveaux/"""
    queryset = DimNiveau.objects.all().order_by('code_niv')
    serializer_class = DimNiveauSerializer


class DimEtudiantViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/students/etudiants/                       -> liste complète
    GET /api/students/etudiants/{id}/                   -> détail
    GET /api/students/etudiants/?search=dupont          -> recherche par
        matricule, nom ou prénom (utilisé par la barre de recherche)
    GET /api/students/etudiants/?annee_souscription=... -> filtre exact
    """
    queryset = DimEtudiant.objects.all().order_by('nom', 'prenom')
    serializer_class = DimEtudiantSerializer
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter]
    filterset_fields = ['annee_souscription']
    search_fields = ['matricule', 'nom', 'prenom']