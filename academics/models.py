from django.db import models
from students.models import DimEtudiant, DimNiveau


class DimModule(models.Model):
    """Dimension : Module / matière enseignée."""
    id_mod = models.AutoField(primary_key=True)
    code_mod = models.CharField(max_length=20, db_index=True)
    nom_mod = models.CharField(max_length=150)
    semestre = models.CharField(max_length=10, blank=True, null=True)

    class Meta:
        db_table = 'dim_module'
        verbose_name = "Module"
        verbose_name_plural = "Modules"
        constraints = [
            # Un même code module peut exister sur plusieurs niveaux/années,
            # mais on évite les doublons parfaits (code + semestre identiques)
            models.UniqueConstraint(
                fields=['code_mod', 'semestre'],
                name='uniq_module_code_semestre'
            )
        ]

    def __str__(self):
        return f"{self.code_mod} - {self.nom_mod}"


class DimAnneeAcademique(models.Model):
    """Dimension : Année académique (ex: 2024-2025)."""
    id_annee = models.AutoField(primary_key=True)
    annee_academique = models.CharField(max_length=20, unique=True, db_index=True)

    class Meta:
        db_table = 'dim_annee_academique'
        verbose_name = "Année académique"
        verbose_name_plural = "Années académiques"

    def __str__(self):
        return self.annee_academique


class ResultatChoices(models.TextChoices):
    ADMIS = 'ADMIS', 'Admis'
    AJOURNE = 'AJOURNE', 'Ajourné'
    NON_EVALUE = 'NON_EVALUE', 'Non évalué'


class FactEvaluation(models.Model):
    """Table de faits : une ligne = les notes d'un étudiant pour un module,
    un niveau et une année académique donnés."""
    id_eval = models.AutoField(primary_key=True)

    # --- Clés étrangères (dimensions) ---
    id_etu = models.ForeignKey(
        DimEtudiant, on_delete=models.CASCADE,
        db_column='id_etu', related_name='evaluations'
    )
    id_mod = models.ForeignKey(
        DimModule, on_delete=models.CASCADE,
        db_column='id_mod', related_name='evaluations'
    )
    id_niv = models.ForeignKey(
        DimNiveau, on_delete=models.CASCADE,
        db_column='id_niv', related_name='evaluations'
    )
    id_annee = models.ForeignKey(
        DimAnneeAcademique, on_delete=models.CASCADE,
        db_column='id_annee', related_name='evaluations'
    )

    # --- Notes devoirs (contrôle continu) ---
    note_devoir1 = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    note_devoir2 = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    note_devoir3 = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    note_devoir4 = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    note_devoir_40 = models.DecimalField(
        max_digits=5, decimal_places=2, blank=True, null=True,
        help_text="Moyenne des devoirs ramenée sur 40"
    )

    # --- Examen ---
    note_examen = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    note_examen_60 = models.DecimalField(
        max_digits=5, decimal_places=2, blank=True, null=True,
        help_text="Note d'examen ramenée sur 60"
    )

    # --- Résultat session normale ---
    moyenne = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    resultat = models.CharField(
        max_length=20, choices=ResultatChoices.choices,
        default=ResultatChoices.NON_EVALUE
    )

    # --- Rattrapage ---
    note_rattrapage = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    moyenne_rattrapage = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    resultat_rattrapage = models.CharField(
        max_length=20, choices=ResultatChoices.choices,
        blank=True, null=True
    )

    # --- Métadonnées ---
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'fact_evaluation'
        verbose_name = "Évaluation"
        verbose_name_plural = "Évaluations"
        constraints = [
            models.UniqueConstraint(
                fields=['id_etu', 'id_mod', 'id_niv', 'id_annee'],
                name='uniq_evaluation_quadruplet'
            )
        ]
        indexes = [
            models.Index(fields=['id_niv']),
            models.Index(fields=['id_annee']),
            models.Index(fields=['id_mod']),
            models.Index(fields=['resultat']),
        ]

    def __str__(self):
        return f"{self.id_etu} | {self.id_mod} | {self.id_annee} -> {self.moyenne}"