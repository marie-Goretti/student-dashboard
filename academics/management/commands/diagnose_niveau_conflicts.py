"""
Commande de diagnostic (LECTURE SEULE, aucune modification en base).

Affiche côte à côte le détail des évaluations en conflit entre un niveau
en doublon (ex: B1S1, M1MSR) et son niveau canonique (B1SI, M1M), pour
permettre de décider manuellement laquelle des deux lignes garder.

Usage :
    python manage.py diagnose_niveau_conflicts B1S1 B1SI
    python manage.py diagnose_niveau_conflicts M1MSR M1M
"""
from django.core.management.base import BaseCommand, CommandError

from students.models import DimNiveau
from academics.models import FactEvaluation


class Command(BaseCommand):
    help = "Affiche le détail des évaluations en conflit entre deux codes niveau."

    def add_arguments(self, parser):
        parser.add_argument("code_doublon", type=str, help="Ex: B1S1")
        parser.add_argument("code_canonique", type=str, help="Ex: B1SI")

    def handle(self, *args, **options):
        code_doublon = options["code_doublon"].strip().upper()
        code_canonique = options["code_canonique"].strip().upper()

        try:
            niveau_doublon = DimNiveau.objects.get(code_niv=code_doublon)
        except DimNiveau.DoesNotExist:
            raise CommandError(f"Niveau '{code_doublon}' introuvable (déjà fusionné ?).")

        try:
            niveau_canonique = DimNiveau.objects.get(code_niv=code_canonique)
        except DimNiveau.DoesNotExist:
            raise CommandError(f"Niveau '{code_canonique}' introuvable.")

        evals_doublon = FactEvaluation.objects.filter(
            id_niv=niveau_doublon
        ).select_related("id_etu", "id_mod", "id_annee")

        found_conflicts = 0

        for ev_a in evals_doublon:
            ev_b = FactEvaluation.objects.filter(
                id_etu=ev_a.id_etu, id_mod=ev_a.id_mod,
                id_niv=niveau_canonique, id_annee=ev_a.id_annee,
            ).first()

            if not ev_b:
                continue  # pas de conflit pour cette ligne, elle sera fusionnée normalement

            found_conflicts += 1
            self.stdout.write(self.style.WARNING(
                f"\n--- Conflit #{found_conflicts} : {ev_a.id_etu.nom} {ev_a.id_etu.prenom} "
                f"(matricule {ev_a.id_etu.matricule}) — module '{ev_a.id_mod.nom_mod}' "
                f"— année {ev_a.id_annee.annee_academique} ---"
            ))
            self._print_row(f"  [{code_doublon}] (id={ev_a.pk})", ev_a)
            self._print_row(f"  [{code_canonique}] (id={ev_b.pk})", ev_b)

        if found_conflicts == 0:
            self.stdout.write(self.style.SUCCESS(
                f"Aucun conflit entre '{code_doublon}' et '{code_canonique}' — la fusion peut se faire sans perte."
            ))
        else:
            self.stdout.write(self.style.NOTICE(
                f"\n{found_conflicts} conflit(s) trouvé(s). "
                "Dis-moi laquelle des deux lignes garder pour chaque cas, "
                "ou une règle générale (ex: 'toujours garder la ligne la plus complète')."
            ))

    def _print_row(self, label, ev):
        self.stdout.write(
            f"{label} : devoirs=[{ev.note_devoir1}, {ev.note_devoir2}, "
            f"{ev.note_devoir3}, {ev.note_devoir4}] | examen={ev.note_examen} | "
            f"moyenne={ev.moyenne} | resultat={ev.resultat} | "
            f"rattrapage={ev.note_rattrapage}"
        )