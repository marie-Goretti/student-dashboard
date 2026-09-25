from django.urls import path
from .views import ImportStudentsView, ImportGradesView

app_name = 'etl'
urlpatterns = [
    path('import-students/', ImportStudentsView.as_view(), name='import-students'),
    path('import-grades/', ImportGradesView.as_view(), name='import-grades'),
]