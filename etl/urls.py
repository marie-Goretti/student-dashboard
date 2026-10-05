from django.urls import path
from .views import ImportStudentsView, ImportGradesView, AnalyzeFileView, AutoImportView

app_name = 'etl'
urlpatterns = [
    path('analyze/', AnalyzeFileView.as_view(), name='analyze-file'),
    path('import-auto/', AutoImportView.as_view(), name='import-auto'),
    path('import-students/', ImportStudentsView.as_view(), name='import-students'),
    path('import-grades/', ImportGradesView.as_view(), name='import-grades'),
]