from django.db import models


class DimNiveau(models.Model):
    """Dimension : Niveau académique (ex: B1SI, M2SI)."""
    id_niv = models.AutoField(primary_key=True)
    code_niv = models.CharField(max_length=20, unique=True, db_index=True)
    libelle_niv = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'dim_niveau'
        verbose_name = "Niveau"
        verbose_name_plural = "Niveaux"

    def __str__(self):
        return self.code_niv


class DimEtudiant(models.Model):
    """Dimension : Étudiant."""
    id_etu = models.AutoField(primary_key=True)
    matricule = models.CharField(max_length=50, unique=True, db_index=True)
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    date_naissance = models.DateField(blank=True, null=True)
    mail = models.EmailField(blank=True, null=True)
    annee_souscription = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        db_table = 'dim_etudiant'
        verbose_name = "Étudiant"
        verbose_name_plural = "Étudiants"
        indexes = [
            models.Index(fields=['nom', 'prenom']),
        ]

    def __str__(self):
        return f"{self.matricule} - {self.nom} {self.prenom}"