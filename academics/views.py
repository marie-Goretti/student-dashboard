from rest_framework import viewsets, mixins
from .models import DimModule, DimAnneeAcademique, FactEvaluation
from .serializers import (
    DimModuleSerializer, DimAnneeAcademiqueSerializer, FactEvaluationDetailSerializer
)


class DimModuleViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """GET /api/academics/modules/"""
    queryset = DimModule.objects.all().order_by('code_mod')
    serializer_class = DimModuleSerializer


class DimAnneeAcademiqueViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """GET /api/academics/annees/"""
    queryset = DimAnneeAcademique.objects.all().order_by('-annee_academique')
    serializer_class = DimAnneeAcademiqueSerializer


class FactEvaluationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/academics/evaluations/
    Filtrable via query params : ?id_niv=1&id_mod=2&id_annee=3&resultat=ADMIS
    """
    queryset = FactEvaluation.objects.select_related(
        'id_etu', 'id_niv', 'id_mod', 'id_annee'
    ).all()
    serializer_class = FactEvaluationDetailSerializer
    filterset_fields = ['id_niv', 'id_mod', 'id_annee', 'resultat']