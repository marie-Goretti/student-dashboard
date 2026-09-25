"""
Commande de nettoyage ponctuel : fusionne les DimNiveau en doublon créés
avant la mise en place de la normalisation du CODE NIVEAU dans l'ETL
(ex: 'B1S1' -> 'B1SI', 'M1MSR' -> 'M1M').

Les niveaux qui ne correspondent à AUCUN des 10 niveaux officiels (ex:
'NAN') sont volontairement laissés de côté : ni fusionnés, ni supprimés.

Usage :
    python manage.py merge_niveau_duplicates            # dry-run (aperçu, aucune modification)
    python manage.py merge_niveau_duplicates --apply     # applique réellement les fusions
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from students.models import DimNiveau
from academics.models import FactEvaluation

NIVEAU_CODES_OFFICIELS = [
    "B1M", "B1SI", "B2M", "B2SI", "B3M", "B3SI",
    "M1M", "M1SI", "M2M", "M2SI",
]
_NIVEAU_PREFIX_MAP = {code[:3]: code for code in NIVEAU_CODES_OFFICIELS}


class Command(BaseCommand):
    help = "Fusionne les niveaux en doublon (ex: B1S1 -> B1SI) vers leur code officiel."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Applique réellement les fusions (par défaut : dry-run, aucune écriture).",
        )

    def handle(self, *args, **options):
        apply_changes = options["apply"]
        mode = "APPLICATION RÉELLE" if apply_changes else "DRY-RUN (aperçu, aucune écriture)"
        self.stdout.write(self.style.WARNING(f"--- Mode : {mode} ---\n"))

        merges_to_do = []   # [(niveau_doublon, niveau_canonique)]
        skipped = []        # niveaux non reconnus, laissés de côté (ex: NAN)

        for niveau in DimNiveau.objects.all():
            code = (niveau.code_niv or "").strip().upper()

            if code in NIVEAU_CODES_OFFICIELS:
                continue  # déjà un code officiel, rien à faire

            prefix = code[:3]
            canonical_code = _NIVEAU_PREFIX_MAP.get(prefix)

            if canonical_code is None:
                skipped.append(niveau)
                continue

            merges_to_do.append((niveau, canonical_code))

        if skipped:
            self.stdout.write(self.style.NOTICE("Niveaux non reconnus, laissés de côté :"))
            for niveau in skipped:
                nb_evals = FactEvaluation.objects.filter(id_niv=niveau).count()
                self.stdout.write(f"  - '{niveau.code_niv}' ({nb_evals} évaluation(s) rattachée(s), inchangées)")
            self.stdout.write("")

        if not merges_to_do:
            self.stdout.write(self.style.SUCCESS("Aucun doublon à fusionner."))
            return

        self.stdout.write(self.style.NOTICE("Fusions à effectuer :"))
        for niveau_doublon, canonical_code in merges_to_do:
            nb_evals = FactEvaluation.objects.filter(id_niv=niveau_doublon).count()
            self.stdout.write(
                f"  - '{niveau_doublon.code_niv}' -> '{canonical_code}' "
                f"({nb_evals} évaluation(s) à réaffecter)"
            )

        if not apply_changes:
            self.stdout.write(
                self.style.WARNING(
                    "\nAucune modification appliquée (dry-run). "
                    "Relance avec --apply pour exécuter réellement les fusions."
                )
            )
            return

        with transaction.atomic():
            for niveau_doublon, canonical_code in merges_to_do:
                niveau_canonique, _ = DimNiveau.objects.get_or_create(
                    code_niv=canonical_code,
                    defaults={"libelle_niv": canonical_code},
                )

                # Réaffecte les évaluations vers le niveau canonique.
                # NB : si une évaluation existe déjà pour le même
                # (etudiant, module, niveau_canonique, annee), la contrainte
                # UNIQUE sur fact_evaluation empêcherait la mise à jour ->
                # on la détecte et on la signale au lieu de planter.
                evaluations = FactEvaluation.objects.filter(id_niv=niveau_doublon)
                for ev in evaluations:
                    conflict = FactEvaluation.objects.filter(
                        id_etu=ev.id_etu, id_mod=ev.id_mod,
                        id_niv=niveau_canonique, id_annee=ev.id_annee,
                    ).exclude(pk=ev.pk).first()

                    if conflict:
                        if self._are_identical(ev, conflict):
                            # Doublon exact (mêmes notes des deux côtés) :
                            # on supprime simplement la ligne en trop, sans
                            # perte de données.
                            ev.delete()
                            self.stdout.write(
                                f"    (doublon exact supprimé sans risque : "
                                f"id={ev.pk} identique à id={conflict.pk})"
                            )
                        else:
                            self.stdout.write(
                                self.style.ERROR(
                                    f"  ! Conflit détecté pour l'étudiant id={ev.id_etu_id}, "
                                    f"module id={ev.id_mod_id} : une évaluation existe déjà sous "
                                    f"'{canonical_code}' AVEC DES VALEURS DIFFÉRENTES. Ligne id={ev.pk} "
                                    f"laissée sous '{niveau_doublon.code_niv}' pour résolution manuelle."
                                )
                            )
                        continue

                    ev.id_niv = niveau_canonique
                    ev.save(update_fields=["id_niv"])

                # Supprime le doublon SEULEMENT s'il ne reste plus aucune
                # évaluation rattachée (cas des conflits non résolus ci-dessus).
                if not FactEvaluation.objects.filter(id_niv=niveau_doublon).exists():
                    niveau_doublon.delete()
                    self.stdout.write(
                        self.style.SUCCESS(f"  ✓ '{niveau_doublon.code_niv}' fusionné et supprimé.")
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"  ~ '{niveau_doublon.code_niv}' conservé (conflits non résolus)."
                        )
                    )

        self.stdout.write(self.style.SUCCESS("\nFusion terminée."))

    @staticmethod
    def _are_identical(ev_a, ev_b) -> bool:
        """Compare deux évaluations sur tous leurs champs de notes.
        Renvoie True si elles sont rigoureusement identiques (doublon exact)."""
        fields = [
            "note_devoir1", "note_devoir2", "note_devoir3", "note_devoir4",
            "note_devoir_40", "note_examen", "note_examen_60",
            "moyenne", "resultat",
            "note_rattrapage", "moyenne_rattrapage", "resultat_rattrapage",
        ]
        return all(getattr(ev_a, f) == getattr(ev_b, f) for f in fields)