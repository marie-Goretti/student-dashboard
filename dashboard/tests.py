"""
Tests unitaires pour le moteur de recommandations pédagogiques de Student Dashboard.
Couvre exhaustivement les 12 règles métier et leurs seuils d'alerte et critiques :
1. Écart entre devoirs et examens (>= 2 pts / >= 4 pts)
2. Taux d'échec à la moyenne finale (>= 30% / >= 50%)
3. Taux d'échec aux examens (>= 30% / >= 50%)
4. Faibles performances au contrôle continu (>= 30% / >= 50%)
5. Proportion de zéros aux devoirs (>= 15% / >= 25%)
6. Étudiants ayant plusieurs matières non validées (>= 3 / >= 5)
7. Étudiants proches du seuil de validation ([8, 10[ / [9, 10[)
8. Échec persistant après rattrapage (>= 30% / >= 50%)
9. Progression ou dégradation entre semestres (>= 1 pt / >= 2 pts)
10. Forte dispersion des notes (sigma >= 4 pts / >= 5 pts)
11. Amélioration significative (+1 pt ou +10% / +2 pts ou +20%)
12. Faible taux de réussite après rattrapage (< 50% / < 30%)
"""
from django.test import TestCase
from academics.models import DimModule, DimAnneeAcademique, FactEvaluation, ResultatChoices
from students.models import DimEtudiant, DimNiveau
from dashboard.recommendations.config import RecommendationsConfig
from dashboard.recommendations.engine import RecommendationsEngine
from dashboard.recommendations import get_recommendations, get_points_cles


class Recommendations12RulesTests(TestCase):

    def setUp(self):
        self.annee_2024 = DimAnneeAcademique.objects.create(annee_academique="2023-2024")
        self.niv_b1m = DimNiveau.objects.create(code_niv="B1M", libelle_niv="Bachelor 1 Management")
        self.niv_b1si = DimNiveau.objects.create(code_niv="B1SI", libelle_niv="Bachelor 1 SI")

        self.mod_algo = DimModule.objects.create(code_mod="INF101", nom_mod="Algorithmique", semestre="S1")
        self.mod_bdd = DimModule.objects.create(code_mod="INF102", nom_mod="Bases de données", semestre="S2")
        self.mod_math = DimModule.objects.create(code_mod="MAT101", nom_mod="Mathématiques", semestre="S1")
        self.mod_droit = DimModule.objects.create(code_mod="DRO101", nom_mod="Droit des affaires", semestre="S1")
        self.mod_eco = DimModule.objects.create(code_mod="ECO101", nom_mod="Économie", semestre="S1")
        self.mod_anglais = DimModule.objects.create(code_mod="ANG101", nom_mod="Anglais", semestre="S1")

        self.config = RecommendationsConfig()
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
    # TEST RÈGLE 1 : Écart entre devoirs et examens (>= 2 pts / >= 4 pts)
    # -------------------------------------------------------------------------
    def test_rule_1_devoir_examen_gap(self):
        students = self._create_students(6, prefix="R1")

        # Cas Alerte : Devoir 13/20, Examen 10.5/20 -> Écart 2.5 pts (>= 2 pts)
        for st in students:
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                note_devoir_40=5.2,  # 5.2 / 0.4 = 13.0
                note_examen=10.5,
                moyenne=11.5,
                resultat=ResultatChoices.ADMIS,
            )

        res = self.engine.evaluate(FactEvaluation.objects.filter(id_mod=self.mod_algo))
        r1 = [r for r in res['recommandations'] if r['rule_number'] == 1]
        self.assertEqual(len(r1), 1)
        self.assertEqual(r1[0]['priority'], 'moyenne')
        self.assertEqual(r1[0]['indicator_value'], 2.5)

        # Cas Critique : Devoir 15/20, Examen 9/20 -> Écart 6.0 pts (>= 4 pts)
        FactEvaluation.objects.filter(id_mod=self.mod_algo).delete()
        for st in students:
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                note_devoir_40=6.0,  # 15.0
                note_examen=9.0,
                moyenne=11.4,
                resultat=ResultatChoices.ADMIS,
            )

        res = self.engine.evaluate(FactEvaluation.objects.filter(id_mod=self.mod_algo))
        r1 = [r for r in res['recommandations'] if r['rule_number'] == 1]
        self.assertEqual(len(r1), 1)
        self.assertEqual(r1[0]['priority'], 'elevee')
        self.assertEqual(r1[0]['indicator_value'], 6.0)

    # -------------------------------------------------------------------------
    # TEST RÈGLE 2 : Taux d'échec à la moyenne finale (>= 30% / >= 50%)
    # -------------------------------------------------------------------------
    def test_rule_2_final_failure_rate(self):
        students = self._create_students(10, prefix="R2")

        # Cas Alerte : 4 échecs sur 10 = 40.0% (>= 30%)
        for i, st in enumerate(students):
            is_fail = i < 4
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=7.0 if is_fail else 13.0,
                resultat=ResultatChoices.AJOURNE if is_fail else ResultatChoices.ADMIS,
            )

        res = self.engine.evaluate(FactEvaluation.objects.filter(id_mod=self.mod_algo))
        r2 = [r for r in res['recommandations'] if r['rule_number'] == 2]
        self.assertEqual(len(r2), 1)
        self.assertEqual(r2[0]['priority'], 'moyenne')
        self.assertEqual(r2[0]['indicator_value'], 40.0)

        # Cas Critique : 6 échecs sur 10 = 60.0% (>= 50%)
        FactEvaluation.objects.filter(id_mod=self.mod_algo).delete()
        for i, st in enumerate(students):
            is_fail = i < 6
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=6.0 if is_fail else 14.0,
                resultat=ResultatChoices.AJOURNE if is_fail else ResultatChoices.ADMIS,
            )

        res = self.engine.evaluate(FactEvaluation.objects.filter(id_mod=self.mod_algo))
        r2 = [r for r in res['recommandations'] if r['rule_number'] == 2]
        self.assertEqual(len(r2), 1)
        self.assertEqual(r2[0]['priority'], 'elevee')
        self.assertEqual(r2[0]['indicator_value'], 60.0)

    # -------------------------------------------------------------------------
    # TEST RÈGLE 3 : Taux d'échec aux examens (>= 30% / >= 50%)
    # -------------------------------------------------------------------------
    def test_rule_3_exam_failure_rate(self):
        students = self._create_students(10, prefix="R3")

        # Cas Critique : 5 examens < 10 sur 10 = 50.0% (>= 50%)
        for i, st in enumerate(students):
            is_fail = i < 5
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                note_examen=7.0 if is_fail else 12.0,
                moyenne=10.0,
                resultat=ResultatChoices.ADMIS,
            )

        res = self.engine.evaluate(FactEvaluation.objects.filter(id_mod=self.mod_algo))
        r3 = [r for r in res['recommandations'] if r['rule_number'] == 3]
        self.assertEqual(len(r3), 1)
        self.assertEqual(r3[0]['priority'], 'elevee')
        self.assertEqual(r3[0]['indicator_value'], 50.0)

    # -------------------------------------------------------------------------
    # TEST RÈGLE 4 : Faibles performances au contrôle continu (>= 30% / >= 50%)
    # -------------------------------------------------------------------------
    def test_rule_4_devoir_failure_rate(self):
        students = self._create_students(10, prefix="R4")

        # Cas Alerte : 4 devoirs < 10 sur 10 = 40.0% (>= 30% et < 50%)
        for i, st in enumerate(students):
            is_fail = i < 4
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                note_devoir_40=3.2 if is_fail else 5.2,  # 8.0/20 vs 13.0/20
                note_examen=12.0,
                moyenne=11.0,
                resultat=ResultatChoices.ADMIS,
            )

        res = self.engine.evaluate(FactEvaluation.objects.filter(id_mod=self.mod_algo))
        r4 = [r for r in res['recommandations'] if r['rule_number'] == 4]
        self.assertEqual(len(r4), 1)
        self.assertEqual(r4[0]['priority'], 'moyenne')
        self.assertEqual(r4[0]['indicator_value'], 40.0)

    # -------------------------------------------------------------------------
    # TEST RÈGLE 5 : Proportion de zéros aux devoirs (>= 15% / >= 25%)
    # -------------------------------------------------------------------------
    def test_rule_5_zero_devoir_rate(self):
        students = self._create_students(10, prefix="R5")

        # 2 zéros sur 10 = 20.0% (>= 15% -> alerte)
        for i, st in enumerate(students):
            is_zero = i < 2
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                note_devoir_40=0.0 if is_zero else 4.8,
                note_examen=12.0,
                moyenne=7.2 if is_zero else 12.0,
                resultat=ResultatChoices.AJOURNE if is_zero else ResultatChoices.ADMIS,
            )

        res = self.engine.evaluate(FactEvaluation.objects.filter(id_mod=self.mod_algo))
        r5 = [r for r in res['recommandations'] if r['rule_number'] == 5]
        self.assertEqual(len(r5), 1)
        self.assertEqual(r5[0]['priority'], 'moyenne')
        self.assertEqual(r5[0]['indicator_value'], 20.0)

    # -------------------------------------------------------------------------
    # TEST RÈGLE 6 : Étudiants ayant plusieurs matières non validées (>= 3 / >= 5)
    # -------------------------------------------------------------------------
    def test_rule_6_multiple_unvalidated(self):
        students = self._create_students(6, prefix="R6")
        mods = [self.mod_algo, self.mod_bdd, self.mod_math, self.mod_droit, self.mod_eco, self.mod_anglais]

        # Étudiant 0 : 5 matières non validées -> Seuil critique (>= 5)
        for m in mods[:5]:
            FactEvaluation.objects.create(
                id_etu=students[0], id_mod=m, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=6.0, resultat=ResultatChoices.AJOURNE,
            )

        # Étudiant 1 : 3 matières non validées -> Seuil alerte (>= 3)
        for m in mods[:3]:
            FactEvaluation.objects.create(
                id_etu=students[1], id_mod=m, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=7.0, resultat=ResultatChoices.AJOURNE,
            )

        res = self.engine.evaluate(FactEvaluation.objects.all())
        r6 = [r for r in res['recommandations'] if r['rule_number'] == 6]
        self.assertEqual(len(r6), 2)  # 1 critique et 1 alerte
        crit = next(r for r in r6 if r['priority'] == 'elevee')
        alt = next(r for r in r6 if r['priority'] == 'moyenne')
        self.assertEqual(crit['etudiants_count'], 1)
        self.assertEqual(alt['etudiants_count'], 1)

    # -------------------------------------------------------------------------
    # TEST RÈGLE 7 : Étudiants proches du seuil de validation ([8, 10[ / [9, 10[)
    # -------------------------------------------------------------------------
    def test_rule_7_near_validation(self):
        students = self._create_students(6, prefix="R7")

        # 3 étudiants avec moyenne = 9.4 (dans [9, 10[ -> critique / conversion prioritaire)
        # 2 étudiants avec moyenne = 8.5 (dans [8, 9[ -> alerte)
        for i, st in enumerate(students):
            moy = 9.4 if i < 3 else (8.5 if i < 5 else 12.0)
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=moy,
                resultat=ResultatChoices.AJOURNE if moy < 10 else ResultatChoices.ADMIS,
            )

        res = self.engine.evaluate(FactEvaluation.objects.filter(id_mod=self.mod_algo))
        r7 = [r for r in res['recommandations'] if r['rule_number'] == 7]
        self.assertEqual(len(r7), 2)
        crit = next(r for r in r7 if r['priority'] == 'elevee')
        alt = next(r for r in r7 if r['priority'] == 'moyenne')
        self.assertEqual(crit['etudiants_count'], 3)
        self.assertEqual(alt['etudiants_count'], 2)

    # -------------------------------------------------------------------------
    # TEST RÈGLE 8 : Échec persistant après rattrapage (>= 30% / >= 50%)
    # -------------------------------------------------------------------------
    def test_rule_8_post_rattrapage_failure(self):
        students = self._create_students(6, prefix="R8")

        # 4 étudiants sur 6 restent sous 10 après rattrapage = 66.7% (>= 50% -> critique)
        for i, st in enumerate(students):
            is_fail_after = i < 4
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=6.0,
                resultat=ResultatChoices.AJOURNE,
                note_rattrapage=7.0 if is_fail_after else 12.0,
                moyenne_rattrapage=7.5 if is_fail_after else 11.0,
                resultat_rattrapage=ResultatChoices.AJOURNE if is_fail_after else ResultatChoices.ADMIS,
            )

        res = self.engine.evaluate(FactEvaluation.objects.filter(id_mod=self.mod_algo))
        r8 = [r for r in res['recommandations'] if r['rule_number'] == 8]
        self.assertEqual(len(r8), 1)
        self.assertEqual(r8[0]['priority'], 'elevee')
        self.assertAlmostEqual(r8[0]['indicator_value'], 66.7, places=1)

    # -------------------------------------------------------------------------
    # TEST RÈGLE 9 : Progression ou dégradation entre semestres (>= 1 pt / >= 2 pts)
    # -------------------------------------------------------------------------
    def test_rule_9_semester_variation(self):
        students = self._create_students(6, prefix="R9")

        # Dégradation de 2.2 pts (S1: 13.0, S2: 10.8) -> Critique (>= 2 pts)
        for st in students:
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=13.0, resultat=ResultatChoices.ADMIS,
            )
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_bdd, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=10.8, resultat=ResultatChoices.ADMIS,
            )

        res = self.engine.evaluate(FactEvaluation.objects.filter(id_niv=self.niv_b1m))
        r9 = [r for r in res['recommandations'] if r['rule_number'] == 9]
        self.assertEqual(len(r9), 1)
        self.assertEqual(r9[0]['priority'], 'elevee')
        self.assertEqual(r9[0]['indicator_value'], -2.2)

    # -------------------------------------------------------------------------
    # TEST RÈGLE 10 : Forte dispersion des notes (sigma >= 4 pts / >= 5 pts)
    # -------------------------------------------------------------------------
    def test_rule_10_grade_dispersion(self):
        students = self._create_students(6, prefix="R10")

        # Notes : [6.0, 6.0, 6.0, 16.0, 16.0, 16.0] -> sigma = 5.0 (>= 5 pts -> critique)
        for i, st in enumerate(students):
            note = 6.0 if i < 3 else 16.0
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=note, resultat=ResultatChoices.AJOURNE if note < 10 else ResultatChoices.ADMIS,
            )

        res = self.engine.evaluate(FactEvaluation.objects.filter(id_mod=self.mod_algo))
        r10 = [r for r in res['recommandations'] if r['rule_number'] == 10]
        self.assertEqual(len(r10), 1)
        self.assertEqual(r10[0]['priority'], 'elevee')
        self.assertEqual(r10[0]['indicator_value'], 5.0)

    # -------------------------------------------------------------------------
    # TEST RÈGLE 11 : Amélioration significative (+1 pt ou +10% / +2 pts ou +20%)
    # -------------------------------------------------------------------------
    def test_rule_11_significant_improvement(self):
        students = self._create_students(10, prefix="R11")

        # S1 : Taux de réussite = 40% (4/10), Moyenne = 9.0
        # S2 : Taux de réussite = 65% (6.5/10), Moyenne = 11.5
        # Gain réussite = +25.0 points % (>= 20% -> progression majeure)
        mod_s1 = DimModule.objects.create(code_mod="PRG1", nom_mod="Prog", semestre="S1")
        mod_s2 = DimModule.objects.create(code_mod="PRG2", nom_mod="Prog", semestre="S2")

        for i, st in enumerate(students):
            FactEvaluation.objects.create(
                id_etu=st, id_mod=mod_s1, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=11.0 if i < 4 else 8.0,
                resultat=ResultatChoices.ADMIS if i < 4 else ResultatChoices.AJOURNE,
            )
            FactEvaluation.objects.create(
                id_etu=st, id_mod=mod_s2, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=12.0 if i < 7 else 8.0,
                resultat=ResultatChoices.ADMIS if i < 7 else ResultatChoices.AJOURNE,
            )

        res = self.engine.evaluate(FactEvaluation.objects.filter(id_niv=self.niv_b1m))
        r11 = [r for r in res['recommandations'] if r['rule_number'] == 11]
        self.assertEqual(len(r11), 1)
        self.assertTrue(r11[0]['is_positive'])

    # -------------------------------------------------------------------------
    # TEST RÈGLE 12 : Faible taux de réussite après rattrapage (< 50% / < 30%)
    # -------------------------------------------------------------------------
    def test_rule_12_low_rattrapage_pass_rate(self):
        students = self._create_students(5, prefix="R12")

        # Seulement 1 admis sur 5 en rattrapage = 20.0% de réussite (< 30% -> critique)
        for i, st in enumerate(students):
            is_pass = i == 0
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=6.0,
                resultat=ResultatChoices.AJOURNE,
                note_rattrapage=11.0 if is_pass else 7.0,
                moyenne_rattrapage=10.5 if is_pass else 7.2,
                resultat_rattrapage=ResultatChoices.ADMIS if is_pass else ResultatChoices.AJOURNE,
            )

        res = self.engine.evaluate(FactEvaluation.objects.filter(id_mod=self.mod_algo))
        r12 = [r for r in res['recommandations'] if r['rule_number'] == 12]
        self.assertEqual(len(r12), 1)
        self.assertEqual(r12[0]['priority'], 'elevee')
        self.assertEqual(r12[0]['indicator_value'], 20.0)

    # -------------------------------------------------------------------------
    # TEST : Points clés et intégration globale
    # -------------------------------------------------------------------------
    def test_points_cles_and_summary_12_rules(self):
        students = self._create_students(6, prefix="INT")
        for st in students:
            FactEvaluation.objects.create(
                id_etu=st, id_mod=self.mod_algo, id_niv=self.niv_b1m, id_annee=self.annee_2024,
                moyenne=5.0, resultat=ResultatChoices.AJOURNE,
            )

        points = get_points_cles(filters={'id_niv': self.niv_b1m.pk})
        self.assertTrue(1 <= len(points) <= 3)

        full_res = get_recommendations(filters={'id_niv': self.niv_b1m.pk})
        self.assertIn('counts_by_rule', full_res['summary'])
        self.assertEqual(len(full_res['summary']['counts_by_rule']), 12)


class StudentDashboardTests(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(username="testuser", password="password123")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.annee = DimAnneeAcademique.objects.create(annee_academique="2024-2025")
        self.niv = DimNiveau.objects.create(code_niv="B2SI", libelle_niv="Bachelor 2 SI")
        self.module = DimModule.objects.create(code_mod="INF201", nom_mod="Architecture logicielle", semestre="S1")

        self.student = DimEtudiant.objects.create(
            matricule="LBS-2024-999",
            nom="Dupont",
            prenom="Jean",
            mail="jean.dupont@campus.edu",
            annee_souscription="2024-2025",
        )

        FactEvaluation.objects.create(
            id_etu=self.student,
            id_mod=self.module,
            id_niv=self.niv,
            id_annee=self.annee,
            note_devoir_40=14.0,  # 14 / 0.4 = 35/20 or note_devoir
            note_examen=12.0,
            moyenne=12.5,
            resultat=ResultatChoices.ADMIS,
        )

    def test_get_student_by_pk(self):
        response = self.client.get(f"/api/dashboard/student/{self.student.id_etu}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['etudiant']['matricule'], "LBS-2024-999")
        self.assertEqual(data['etudiant']['nom'], "Dupont")
        self.assertEqual(data['kpi']['total_modules_evalues'], 1)
        self.assertEqual(data['kpi']['taux_reussite'], 100.0)
        self.assertEqual(len(data['modules']), 1)
        self.assertEqual(data['modules'][0]['module'], "Architecture logicielle")

    def test_get_student_by_matricule(self):
        response = self.client.get("/api/dashboard/student/lbs-2024-999/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['etudiant']['id_etu'], self.student.id_etu)

    def test_get_student_not_found(self):
        response = self.client.get("/api/dashboard/student/UNKNOWN-99999/")
        self.assertEqual(response.status_code, 404)
        self.assertIn('introuvable', response.json()['error'])

    def test_student_without_evaluations(self):
        empty_st = DimEtudiant.objects.create(
            matricule="LBS-EMPTY-01",
            nom="Martin",
            prenom="Sophie",
            annee_souscription="2024-2025",
        )
        response = self.client.get(f"/api/dashboard/student/{empty_st.id_etu}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['etudiant']['nom'], "Martin")
        self.assertEqual(data['kpi']['total_modules_evalues'], 0)
        self.assertEqual(len(data['modules']), 0)
