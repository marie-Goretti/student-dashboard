from django.contrib import admin
from .models import DimEtudiant, DimNiveau

@admin.register(DimEtudiant)
class DimEtudiantAdmin(admin.ModelAdmin):
    list_display = ('matricule', 'nom', 'prenom', 'mail', 'annee_souscription')
    search_fields = ('matricule', 'nom', 'prenom')

@admin.register(DimNiveau)
class DimNiveauAdmin(admin.ModelAdmin):
    list_display = ('code_niv', 'libelle_niv')