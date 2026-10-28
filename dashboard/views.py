from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response

from students.models import DimEtudiant
from students.serializers import DimEtudiantSerializer
from . import services


def _extract_filters(request):
    """Extrait les filtres depuis les query params (exclut resultat conformément à la directive)."""
    return {
        'id_niv': request.query_params.get('id_niv'),
        'id_mod': request.query_params.get('id_mod'),
        'id_annee': request.query_params.get('id_annee'),
        'filiere': request.query_params.get('filiere'),
        'semestre': request.query_params.get('semestre'),
    }


class KpiSummaryView(APIView):
    """GET /api/dashboard/kpi-summary/"""
    def get(self, request):
        return Response(services.get_kpi_summary(_extract_filters(request)))


class RepartitionParNiveauView(APIView):
    """GET /api/dashboard/repartition-niveau/"""
    def get(self, request):
        return Response(services.get_repartition_par_niveau(_extract_filters(request)))


class DevoirVsExamenView(APIView):
    """GET /api/dashboard/devoir-vs-examen/"""
    def get(self, request):
        return Response(services.get_devoir_vs_examen(_extract_filters(request)))


class PointsClesView(APIView):
    """GET /api/dashboard/points-cles/"""
    def get(self, request):
        return Response(services.get_points_cles(_extract_filters(request)))


class RepartitionParModuleView(APIView):
    """GET /api/dashboard/repartition-module/"""
    def get(self, request):
        return Response(services.get_repartition_par_module(_extract_filters(request)))


class EvolutionParAnneeView(APIView):
    """GET /api/dashboard/evolution-annee/"""
    def get(self, request):
        return Response(services.get_evolution_par_annee(_extract_filters(request)))


class DistributionNotesView(APIView):
    """GET /api/dashboard/distribution-notes/"""
    def get(self, request):
        return Response(services.get_distribution_notes(_extract_filters(request)))


class ComparaisonFilieresView(APIView):
    """GET /api/dashboard/comparaison-filieres/ — Management vs SI par palier"""
    def get(self, request):
        return Response(services.get_comparaison_filieres(_extract_filters(request)))


class TopModulesView(APIView):
    """GET /api/dashboard/top-modules/?id_niv=&id_mod=&id_annee=&limit=5"""
    def get(self, request):
        limit = int(request.query_params.get('limit', 5))
        return Response(services.get_top_modules(_extract_filters(request), limit=limit))


class StudentDashboardView(APIView):
    """
    GET /api/dashboard/student/{id_or_matricule}/?id_annee=&semestre=

    Fiche complète d'un étudiant : ses infos, ses KPIs personnels, son
    évolution par année académique, et le détail de toutes ses évaluations
    (filtrable par année académique et par semestre).
    """
    def get(self, request, id_or_matricule):
        if str(id_or_matricule).isdigit():
            etudiant = DimEtudiant.objects.filter(pk=int(id_or_matricule)).first()
        else:
            etudiant = DimEtudiant.objects.filter(matricule__iexact=str(id_or_matricule).strip()).first()
        if not etudiant:
            return Response({'error': f"Étudiant '{id_or_matricule}' introuvable."}, status=404)
        id_etu = etudiant.id_etu
        filters = _extract_filters(request)
        return Response({
            'etudiant': DimEtudiantSerializer(etudiant).data,
            'kpi': services.get_student_kpi(id_etu, filters=filters),
            'evolution': services.get_student_evolution(id_etu),
            'modules': services.get_student_modules_detail(id_etu, filters=filters),
            'annees': services.get_student_annees(id_etu),
            'semestres': services.get_student_semestres(id_etu),
        })


class AnalyseNiveauxView(APIView):
    """GET /api/dashboard/analyse-niveaux/"""
    def get(self, request):
        return Response(services.get_analyse_niveaux(_extract_filters(request)))


class AnalyseModulesView(APIView):
    """GET /api/dashboard/analyse-modules/"""
    def get(self, request):
        return Response(services.get_analyse_modules(_extract_filters(request)))


class AnalyseEtudiantsView(APIView):
    """GET /api/dashboard/analyse-etudiants/?search=..."""
    def get(self, request):
        search = request.query_params.get('search')
        return Response(services.get_analyse_etudiants(_extract_filters(request), search=search))


class AnalyseRattrapagesView(APIView):
    """GET /api/dashboard/analyse-rattrapages/"""
    def get(self, request):
        return Response(services.get_analyse_rattrapages(_extract_filters(request)))


class RecommandationsView(APIView):
    """GET /api/dashboard/recommandations/"""
    def get(self, request):
        return Response(services.get_recommandations(_extract_filters(request)))


class NiveauDetailView(APIView):
    """GET /api/dashboard/niveau/{id_or_code}/?id_annee=&semestre="""
    def get(self, request, id_or_code):
        data = services.get_niveau_detail(id_or_code, filters=_extract_filters(request))
        if not data:
            return Response({'error': f"Niveau '{id_or_code}' introuvable."}, status=404)
        return Response(data)


class ModuleDetailView(APIView):
    """GET /api/dashboard/module/{id_or_code}/?id_annee=&id_niv=&filiere="""
    def get(self, request, id_or_code):
        data = services.get_module_detail(id_or_code, filters=_extract_filters(request))
        if not data:
            return Response({'error': f"Module '{id_or_code}' introuvable."}, status=404)
        return Response(data)
