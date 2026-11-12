from django.urls import path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.reverse import reverse
from .views import ImportStudentsView, ImportGradesView, AnalyzeFileView, AutoImportView


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request, format=None):
    return Response({
        'analyze': reverse('etl:analyze-file', request=request, format=format),
        'import-auto': reverse('etl:import-auto', request=request, format=format),
        'import-students': reverse('etl:import-students', request=request, format=format),
        'import-grades': reverse('etl:import-grades', request=request, format=format),
    })


app_name = 'etl'
urlpatterns = [
    path('', api_root, name='api-root'),
    path('analyze/', AnalyzeFileView.as_view(), name='analyze-file'),
    path('import-auto/', AutoImportView.as_view(), name='import-auto'),
    path('import-students/', ImportStudentsView.as_view(), name='import-students'),
    path('import-grades/', ImportGradesView.as_view(), name='import-grades'),
]
