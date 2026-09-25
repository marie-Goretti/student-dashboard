from django.contrib import admin
from .models import DimModule, DimAnneeAcademique, FactEvaluation

@admin.register(DimModule)
class DimModuleAdmin(admin.ModelAdmin):
    list_display = ('code_mod', 'nom_mod', 'semestre')
    search_fields = ('code_mod', 'nom_mod')

@admin.register(DimAnneeAcademique)
class DimAnneeAcademiqueAdmin(admin.ModelAdmin):
    list_display = ('annee_academique',)

@admin.register(FactEvaluation)
class FactEvaluationAdmin(admin.ModelAdmin):
    list_display = ('id_etu', 'id_mod', 'id_niv', 'id_annee', 'moyenne', 'resultat')
    list_filter = ('id_niv', 'id_annee', 'resultat')