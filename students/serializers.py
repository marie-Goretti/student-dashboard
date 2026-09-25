from rest_framework import serializers
from .models import DimEtudiant, DimNiveau


class DimNiveauSerializer(serializers.ModelSerializer):
    class Meta:
        model = DimNiveau
        fields = ['id_niv', 'code_niv', 'libelle_niv']


class DimEtudiantSerializer(serializers.ModelSerializer):
    class Meta:
        model = DimEtudiant
        fields = [
            'id_etu', 'matricule', 'nom', 'prenom',
            'date_naissance', 'mail', 'annee_souscription'
        ]

    def validate_matricule(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le matricule ne peut pas être vide.")
        return value.strip().upper()