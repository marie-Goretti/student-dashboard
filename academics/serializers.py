from rest_framework import serializers
from .models import DimModule, DimAnneeAcademique, FactEvaluation
from students.serializers import DimEtudiantSerializer, DimNiveauSerializer


class DimModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DimModule
        fields = ['id_mod', 'code_mod', 'nom_mod', 'semestre']


class DimAnneeAcademiqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = DimAnneeAcademique
        fields = ['id_annee', 'annee_academique']


class FactEvaluationSerializer(serializers.ModelSerializer):
    """Serializer d'écriture (utilisé par l'ETL et les vues standard)."""

    class Meta:
        model = FactEvaluation
        fields = [
            'id_eval', 'id_etu', 'id_mod', 'id_niv', 'id_annee',
            'note_devoir1', 'note_devoir2', 'note_devoir3', 'note_devoir4',
            'note_devoir_40', 'note_examen', 'note_examen_60',
            'moyenne', 'resultat',
            'note_rattrapage', 'moyenne_rattrapage', 'resultat_rattrapage',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id_eval', 'created_at', 'updated_at']

    def validate(self, data):
        """Valide que toutes les notes fournies sont comprises entre 0 et 20."""
        note_fields = [
            'note_devoir1', 'note_devoir2', 'note_devoir3', 'note_devoir4',
            'note_examen', 'note_rattrapage',
        ]
        for field in note_fields:
            value = data.get(field)
            if value is not None and not (0 <= value <= 20):
                raise serializers.ValidationError(
                    {field: f"La note doit être comprise entre 0 et 20 (reçu : {value})."}
                )
        return data


class FactEvaluationDetailSerializer(serializers.ModelSerializer):
    """Serializer de lecture enrichi (pour affichage détaillé côté dashboard)."""
    etudiant = DimEtudiantSerializer(source='id_etu', read_only=True)
    niveau = DimNiveauSerializer(source='id_niv', read_only=True)
    module = DimModuleSerializer(source='id_mod', read_only=True)
    annee = DimAnneeAcademiqueSerializer(source='id_annee', read_only=True)

    class Meta:
        model = FactEvaluation
        fields = [
            'id_eval', 'etudiant', 'niveau', 'module', 'annee',
            'note_devoir1', 'note_devoir2', 'note_devoir3', 'note_devoir4',
            'note_devoir_40', 'note_examen', 'note_examen_60',
            'moyenne', 'resultat',
            'note_rattrapage', 'moyenne_rattrapage', 'resultat_rattrapage',
        ]