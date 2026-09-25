from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework import status

from .services.import_students import import_students_file, StudentImportError
from .services.import_grades import import_grades_file, GradeImportError


class ImportStudentsView(APIView):
    """POST /api/etl/import-students/  (multipart/form-data, champ 'file')"""
    parser_classes = [MultiPartParser]

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response(
                {'detail': "Aucun fichier fourni (champ 'file' attendu)."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not file_obj.name.endswith(('.xlsx', '.xls')):
            return Response(
                {'detail': "Format de fichier invalide. Seuls les .xlsx/.xls sont acceptés."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            report = import_students_file(file_obj)
        except StudentImportError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'detail': f"Erreur inattendue lors de l'import : {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(report, status=status.HTTP_200_OK)


class ImportGradesView(APIView):
    """POST /api/etl/import-grades/  (multipart/form-data, champ 'file')"""
    parser_classes = [MultiPartParser]

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response(
                {'detail': "Aucun fichier fourni (champ 'file' attendu)."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not file_obj.name.endswith(('.xlsx', '.xls')):
            return Response(
                {'detail': "Format de fichier invalide. Seuls les .xlsx/.xls sont acceptés."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            report = import_grades_file(file_obj)
        except GradeImportError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'detail': f"Erreur inattendue lors de l'import : {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(report, status=status.HTTP_200_OK)