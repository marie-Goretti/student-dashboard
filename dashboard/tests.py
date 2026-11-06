"""
Tests unitaires pour le moteur de recommandations pédagogiques LBS.
Couvre l'ensemble des 10 règles métier actives :
- Règle 1 : Écart entre devoirs et examens (>= 2 pts / >= 4 pts)
- Règle 2 : Échec à la moyenne finale du module (>= 60% / >= 70%)
- Règle 3 : Échec aux examens (>= 60% / >= 70%)
- Règle 4 : Faible contrôle continu (>= 50% / >= 65%)
- Règle 5 : Zéros aux devoirs (>= 15% / >= 25%)
- Règle 6 : Étudiants avec plusieurs matières non validées (>= 5 / >= 7, warn >= 3)
- Règle 7 : Étudiants proches de la validation (8 à < 10 / 9 à < 10)
- Règle 9 : Évolution entre semestres (>= 1 pt / >= 2 pts)
- Règle 11 : Amélioration significative (+1 pt ou +10% / +2 pts ou +20%)
- Règle 12 : Faible réussite après rattrapage (< 50% / < 30%)
- Absence de badges de règle dans les titres et labels
- get_points_cles
"""
from django.test import TestCase
from academics.models import DimModule, DimAnneeAcademique, FactEvaluation
from students.models import DimEtudiant, DimNiveau
from dashboard.recommendations.config import RecommendationsConfig
from dashboard.recommendations.engine import RecommendationsEngine
from dashboard.recommendations import get_recommendations, get_points_cles


class RecommendationsRulesTests(TestCase):

    def setUp(self):
        self.annee_2023 = DimAnneeAcademique.objects.create(annee_academique="2022-2023")
        self.annee_2024 = DimAnneeAcademique.objects.create(annee_academique="2023-2024")
        self.niv_b1m = DimNiveau.objects.create(code_niv="B1M", libelle_niv="Bachelor 1 Management")
        self.niv_b1si = DimNiveau.objects.create(code_niv="B1SI", libelle_niv="Bachelor 1 SI")

        self.mod_algo = DimModule.objects.create(code_mod="INF101", nom_mod="Algorithmique", semestre="1")
        self.mod_bdd = DimModule.objects.create(code_mod="INF102", nom_mod="Bases de données", semestre="2")
        self.mod_math = DimModule.objects.create(code_mod="MAT101", nom_mod="Mathématiques", semestre="1")
        self.mod_droit = DimModule.objects.create(code_mod="DRO101", nom_mod="Droit des affaires", semestre="2")
        self.mod_eco = DimModule.objects.create(code_mod="ECO101", nom_mod="Économie", semestre="1")
        self.mod_anglais = DimModule.objects.create(code_mod="ANG101", nom_mod="Anglais", semestre="2")
        self.mod_mgt = DimModule.objects.create(code_mod="MGT101", nom_mod="Management", semestre="1")
        self.mod_compta = DimModule.objects.create(code_mod="CPT101", nom_mod="Comptabilité", semestre="2")

        self.config = RecommendationsConfig(MIN_STUDENTS_SAMPLE=3, MIN_RATTRAPAGE_SAMPLE=2)
        self.engine = RecommendationsEngine(self.config)

    def _create_students(self, count: int, prefix: str = "ETU") -> list[DimEtudiant]:
        students = []
        for i in range(count):
            st = DimEtudiant.objects.create(
                matricule=f"{prefix}_{i:04d}",
                nom=f"Nom_{prefix}_{i}",
                prenom=f"Prenom_{i}",
                mail=f"{prefix}_{i}@campus.edu",
                annee_souscription="2023-2024",
            )
            students.append(st)
        return students

    # -------------------------------------------------------------------------
    # RÈGLE 1 : Écart entre devoirs et examens
    # Alerte : écart >= 2 points | Critique : >= 4 points
    # Action : Harmoniser devoirs et examens
    # -------------------------------------------------------------------------
    def test_rule_1_devoir_examen_gap(self):
        students = self._create_students(4, prefix="R1")
        # Moyenne devoirs = 15/20, Moyenne examens = 10/20 -> écart = +5.0 points (Critique >= 4 pts)
        for st in students:
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                note_devoir_40=6.0,  # 6 / 0.4 = 15/20
                note_examen=10.0,
                moyenne=12.0,
            )

        res = self.engine.evaluate(FactEvaluation.objects.filter(id_mod=self.mod_algo))
        recs = [r for r in res['recommandations'] if r['rule_number'] == 1]
        self.assertEqual(len(recs), 1)
        r = recs[0]
        self.assertEqual(r['priority'], 'elevee')
        self.assertIn("Harmoniser devoirs et examens", r['action_recommandee'])
        self.assertNotIn("Règle 1", r['title'])

    # -------------------------------------------------------------------------
    # RÈGLE 2 : Échec à la moyenne finale du module
    # Alerte : >= 60% sous 10 | Critique : >= 70%
    # Action : Séances de renforcement et soutien méthodologique
    # -------------------------------------------------------------------------
    def test_rule_2_final_failure_rate(self):
        students = self._create_students(10, prefix="R2")
        # 7 étudiants sur 10 sous 10 = 70% d'échec (Critique >= 70%)
        for idx, st in enumerate(students):
            moy = 7.0 if idx < 7 else 13.0
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_math, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=moy, note_examen=moy,
            )

        res = self.engine.evaluate(FactEvaluation.objects.filter(id_mod=self.mod_math))
        recs = [r for r in res['recommandations'] if r['rule_number'] == 2]
        self.assertEqual(len(recs), 1)
        r = recs[0]
        self.assertEqual(r['priority'], 'elevee')
        self.assertEqual(r['indicator_value'], 70.0)
        self.assertIn("Séances de renforcement et soutien méthodologique", r['action_recommandee'])

    # -------------------------------------------------------------------------
    # RÈGLE 3 : Échec aux examens
    # Alerte : >= 60% sous 10 à l'examen | Critique : >= 70%
    # Action : Annales corrigées et ateliers d’entraînement
    # -------------------------------------------------------------------------
    def test_rule_3_exam_failure_rate(self):
        students = self._create_students(10, prefix="R3")
        # 8 étudiants sur 10 ont note_examen < 10 (80% >= 70% -> Critique)
        for idx, st in enumerate(students):
            ex = 6.0 if idx < 8 else 14.0
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_droit, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                note_examen=ex, moyenne=ex,
            )

        res = self.engine.evaluate(FactEvaluation.objects.filter(id_mod=self.mod_droit))
        recs = [r for r in res['recommandations'] if r['rule_number'] == 3]
        self.assertEqual(len(recs), 1)
        r = recs[0]
        self.assertEqual(r['priority'], 'elevee')
        self.assertIn("Annales corrigées et ateliers d’entraînement", r['action_recommandee'])

    # -------------------------------------------------------------------------
    # RÈGLE 4 : Faible contrôle continu
    # Alerte : >= 50% avec moyenne de devoirs sous 10 | Critique : >= 65%
    # Action : Adapter le rythme et l’accompagnement des travaux continus
    # -------------------------------------------------------------------------
    def test_rule_4_devoir_failure_rate(self):
        students = self._create_students(10, prefix="R4")
        # 6 étudiants sur 10 ont note devoir < 10 (60% >= 50% -> Alerte / moyenne)
        for idx, st in enumerate(students):
            dev = 7.0 if idx < 6 else 14.0
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_eco, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                note_devoir_40=round(dev * 0.4, 2),
                note_examen=12.0,
                moyenne=round(dev * 0.4 + 12.0 * 0.6, 2),
            )

        res = self.engine.evaluate(FactEvaluation.objects.filter(id_mod=self.mod_eco))
        recs = [r for r in res['recommandations'] if r['rule_number'] == 4]
        self.assertEqual(len(recs), 1)
        r = recs[0]
        self.assertEqual(r['priority'], 'moyenne')
        self.assertIn("Adapter le rythme et l’accompagnement des travaux continus", r['action_recommandee'])

    # -------------------------------------------------------------------------
    # RÈGLE 5 : Zéros aux devoirs
    # Alerte : >= 15% de notes à 0 | Critique : >= 25%
    # Action : Enquêter sur les non-remises et instaurer des alertes de calendrier
    # -------------------------------------------------------------------------
    def test_rule_5_zero_devoir_rate(self):
        students = self._create_students(10, prefix="R5")
        # 2 étudiants sur 10 ont 0 aux devoirs = 20% (>= 15% -> Alerte / moyenne)
        for idx, st in enumerate(students):
            dev = 0.0 if idx < 2 else 12.0
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_anglais, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                note_devoir_40=round(dev * 0.4, 2),
                note_examen=11.0,
                moyenne=round(dev * 0.4 + 11.0 * 0.6, 2),
            )

        res = self.engine.evaluate(FactEvaluation.objects.filter(id_mod=self.mod_anglais))
        recs = [r for r in res['recommandations'] if r['rule_number'] == 5]
        self.assertEqual(len(recs), 1)
        r = recs[0]
        self.assertEqual(r['priority'], 'moyenne')
        self.assertEqual(r['indicator_value'], 20.0)
        self.assertIn("Enquêter sur les non-remises et instaurer des alertes de calendrier", r['action_recommandee'])

    # -------------------------------------------------------------------------
    # RÈGLE 6 : Étudiants avec plusieurs matières non validées
    # Alerte : >= 5 matières | Critique : >= 7 matières (surveillance dès 3)
    # Action : À 3 : calendrier de révision avant le rattrapage. À 5 : entretien immédiat et contrat de remédiation
    # -------------------------------------------------------------------------
    def test_rule_6_multiple_unvalidated(self):
        students = self._create_students(4, prefix="R6")
        all_modules = [
            self.mod_algo, self.mod_bdd, self.mod_math, self.mod_droit,
            self.mod_eco, self.mod_anglais, self.mod_mgt, self.mod_compta
        ]

        # Étudiant 0 : 7 matières non validées (Critique)
        for m in all_modules[:7]:
            FactEvaluation.objects.create(
                id_etu=students[0], id_mod=m, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=6.0, note_examen=6.0,
            )

        # Étudiant 1 : 5 matières non validées (Alerte)
        for m in all_modules[:5]:
            FactEvaluation.objects.create(
                id_etu=students[1], id_mod=m, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=7.0, note_examen=7.0,
            )

        # Étudiants 2 et 3 : valident tout
        for st in students[2:]:
            for m in all_modules[:3]:
                FactEvaluation.objects.create(
                    id_etu=st, id_mod=m, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                    moyenne=14.0, note_examen=14.0,
                )

        res = self.engine.evaluate(FactEvaluation.objects.all())
        r6_recs = [r for r in res['recommandations'] if r['rule_number'] == 6]
        self.assertGreaterEqual(len(r6_recs), 1)

        crit_rec = next((r for r in r6_recs if r['priority'] == 'elevee'), None)
        self.assertIsNotNone(crit_rec)
        self.assertIn("entretien immédiat et contrat de remédiation", crit_rec['action_recommandee'].lower())

    # -------------------------------------------------------------------------
    # RÈGLE 7 : Étudiants proches de la validation
    # Alerte : moyenne 8 à < 10 | Critique : 9 à < 10
    # Action : Plan de révision ciblé sur les points perdus ; atelier de remédiation pour combler 1 à 2 points
    # -------------------------------------------------------------------------
    def test_rule_7_near_validation(self):
        students = self._create_students(4, prefix="R7")

        # Étudiant 0 : moyenne = 9.4 (Critique 9 à <10)
        FactEvaluation.objects.create(
            id_etu=students[0], id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
            moyenne=9.4, note_examen=9.4,
        )

        # Étudiant 1 : moyenne = 8.4 (Alerte 8 à <9)
        FactEvaluation.objects.create(
            id_etu=students[1], id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
            moyenne=8.4, note_examen=8.4,
        )

        # Étudiants 2 et 3 : validés (12.0)
        for st in students[2:]:
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=12.0, note_examen=12.0,
            )

        res = self.engine.evaluate(FactEvaluation.objects.all())
        r7_recs = [r for r in res['recommandations'] if r['rule_number'] == 7]
        self.assertGreaterEqual(len(r7_recs), 1)

        r7_9_10 = next((r for r in r7_recs if '9.0 à 9.9' in r['title'] or r['priority'] == 'elevee'), None)
        self.assertIsNotNone(r7_9_10)
        self.assertIn("Plan de révision ciblé sur les points perdus", r7_9_10['action_recommandee'])

    # -------------------------------------------------------------------------
    # RÈGLE 9 : Évolution entre semestres
    # Alerte : variation >= 1 pt | Critique : variation >= 2 pts
    # Action : Baisse : analyser la charge de travail au S2. Hausse : valoriser la progression
    # -------------------------------------------------------------------------
    def test_rule_9_semester_variation(self):
        students = self._create_students(4, prefix="R9")

        # S1 (mod_algo) = 13.0, S2 (mod_bdd) = 10.5 -> baisse de 2.5 pts (Critique >= 2 pts)
        for st in students:
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=13.0, note_examen=13.0,
            )
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_bdd, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=10.5, note_examen=10.5,
            )

        res = self.engine.evaluate(FactEvaluation.objects.all())
        r9_recs = [r for r in res['recommandations'] if r['rule_number'] == 9]
        self.assertEqual(len(r9_recs), 1)
        r = r9_recs[0]
        self.assertEqual(r['priority'], 'elevee')
        self.assertIn("Baisse : analyser la charge de travail au S2", r['action_recommandee'])

    # -------------------------------------------------------------------------
    # RÈGLE 11 : Amélioration significative (résultat positif)
    # Alerte : moyenne +1 point OU réussite +10 points
    # Majeure : moyenne +2 points OU réussite +20 points
    # Action : Valoriser la progression et diffuser les bonnes pratiques
    # -------------------------------------------------------------------------
    def test_rule_11_significant_improvement(self):
        students = self._create_students(4, prefix="R11")

        # S1 = 10.0, S2 = 12.5 -> hausse de +2.5 pts
        for st in students:
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_algo, id_niv=self.niv_b1si, id_annee=self.annee_2024,
                moyenne=10.0, note_examen=10.0,
            )
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_bdd, id_niv=self.niv_b1si, id_annee=self.annee_2024,
                moyenne=12.5, note_examen=12.5,
            )

        res = self.engine.evaluate(FactEvaluation.objects.filter(id_niv=self.niv_b1si))
        r11_recs = [r for r in res['recommandations'] if r['rule_number'] == 11]
        self.assertEqual(len(r11_recs), 1)
        r = r11_recs[0]
        self.assertTrue(r['is_positive'])
        self.assertEqual(r['priority'], 'positive')
        self.assertIn("Valoriser la progression et diffuser les bonnes pratiques", r['action_recommandee'])

    # -------------------------------------------------------------------------
    # RÈGLE 12 : Faible réussite après rattrapage
    # Alerte : < 50% de réussite | Critique : < 30%
    # Action : Revoir l’organisation et la préparation aux rattrapages
    # -------------------------------------------------------------------------
    def test_rule_12_low_rattrapage_pass_rate(self):
        students = self._create_students(4, prefix="R12")

        # 4 étudiants vont au rattrapage en algo : 1 admis (11.0), 3 recalés (7.0) -> 25% réussite (Critique < 30%)
        for idx, st in enumerate(students):
            note_rat = 11.0 if idx == 0 else 7.0
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=6.0,
                note_examen=6.0,
                note_rattrapage=note_rat,
                moyenne_rattrapage=note_rat,
            )

        res = self.engine.evaluate(FactEvaluation.objects.filter(id_mod=self.mod_algo))
        r12_recs = [r for r in res['recommandations'] if r['rule_number'] == 12]
        self.assertEqual(len(r12_recs), 1)
        r = r12_recs[0]
        self.assertEqual(r['priority'], 'elevee')
        self.assertEqual(r['indicator_value'], 25.0)
        self.assertIn("Revoir l’organisation et la préparation aux rattrapages", r['action_recommandee'])

    # -------------------------------------------------------------------------
    # TEST : Absence de badges de règle dans les titres et labels
    # -------------------------------------------------------------------------
    def test_no_rule_badge_in_titles_or_labels(self):
        students = self._create_students(4, prefix="NO_BADGE")
        for st in students:
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                note_devoir_40=6.0, note_examen=10.0, moyenne=12.0,
            )

        res = self.engine.evaluate(FactEvaluation.objects.all())
        for r in res['recommandations']:
            self.assertFalse(r['title'].startswith("Règle"))
            self.assertFalse(r['short_title'].startswith("Règle"))
            self.assertNotIn("Règle", r['priority_label'])

    # -------------------------------------------------------------------------
    # TEST : get_points_cles
    # -------------------------------------------------------------------------
    def test_get_points_cles(self):
        students = self._create_students(4, prefix="PC")
        for st in students:
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=7.0, note_examen=7.0,
            )

        pts = get_points_cles()
        self.assertIsInstance(pts, list)
        self.assertLessEqual(len(pts), 3)
        if pts:
            self.assertIn('titre', pts[0])
            self.assertIn('badgeType', pts[0])
            self.assertNotIn("Règle", pts[0]['titre'])
