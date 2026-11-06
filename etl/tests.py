import io
import pandas as pd
from django.test import TestCase
from students.models import DimEtudiant, DimNiveau
from academics.models import DimAnneeAcademique, DimModule
from etl.services.import_grades import import_grades_file, COLUMN_NAMES, HEADER_SKIP_ROWS


class GradeImportNotificationTests(TestCase):
    """
    Tests unitaires pour la détection automatique de nouveaux étudiants
    et la génération de notifications lors de l'import d'un fichier de suivi de notes.
    """

    def setUp(self):
        self.annee = DimAnneeAcademique.objects.create(annee_academique="2024-2025")
        self.niveau = DimNiveau.objects.create(code_niv="B1SI", libelle_niv="Bachelor 1 SI")
        self.module = DimModule.objects.create(code_mod="INF101", nom_mod="Algorithmique", semestre="1")

    def _create_excel_grades(self, rows: list[dict], sheet_name: str = "SUIVI NOTES 2024-2025") -> io.BytesIO:
        """Crée un fichier Excel en mémoire respectant le format attendu du suivi des notes."""
        header_padding = [[""] * len(COLUMN_NAMES) for _ in range(HEADER_SKIP_ROWS)]

        data_rows = []
        for r in rows:
            row_data = [
                r.get("matricule_source", ""),
                r.get("date_naissance", ""),
                r.get("mail", ""),
                r.get("nom", ""),
                r.get("prenom", ""),
                r.get("niveau_libelle", "Bachelor 1 SI"),
                r.get("module_nom", "Algorithmique"),
                r.get("semestre", "1"),
                r.get("annee_en_cours", "2024-2025"),
                r.get("annee_souscription", "2024-2025"),
                r.get("code_niveau", "B1SI"),
                r.get("devoir1", 12.0),
                r.get("devoir2", None),
                r.get("devoir3", None),
                r.get("devoir4", None),
                None,  # devoir finale
                4.8,   # devoir 40
                r.get("note_examen", 14.0),
                8.4,   # exam 60
                13.2,  # moyenne
                "ADMIS",
                None, None, None, None,
            ]
            data_rows.append(row_data)

        full_table = header_padding + data_rows
        df = pd.DataFrame(full_table)

        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name=sheet_name, index=False, header=False)
        buffer.seek(0)
        return buffer

    def test_import_detects_new_student_and_generates_notification(self):
        """Vérifie qu'un étudiant absent de DimEtudiant est créé et génère une notification."""
        # La base ne contient aucun étudiant au départ
        self.assertEqual(DimEtudiant.objects.count(), 0)

        rows = [
            {
                "matricule_source": "ETU_NEW_001",
                "nom": "KOFFI",
                "prenom": "Afi",
                "mail": "afi.koffi@campus.edu",
            }
        ]
        excel_buffer = self._create_excel_grades(rows)
        report = import_grades_file(excel_buffer, filename="SUIVI_NOTES_2024_2025.xlsx")

        # Vérifications
        self.assertEqual(report["etudiants_auto_crees"], 1)
        self.assertEqual(DimEtudiant.objects.count(), 1)
        new_etudiant = DimEtudiant.objects.first()
        self.assertEqual(new_etudiant.nom, "KOFFI")
        self.assertEqual(new_etudiant.prenom, "Afi")

        # Notification générée
        notif = report.get("notification")
        self.assertIsNotNone(notif)
        self.assertIn("1 nouvel étudiant détecté", notif["title"])
        self.assertIn("KOFFI", notif["message"])
        self.assertEqual(notif["type"], "warning")
        self.assertEqual(notif["link"], "/students")
        self.assertEqual(notif["count"], 1)
        self.assertTrue(notif["unread"])

    def test_import_detects_multiple_new_students_and_pluralizes_notification(self):
        """Vérifie la détection de plusieurs nouveaux étudiants avec accord pluriel."""
        rows = [
            {"matricule_source": "ETU_001", "nom": "MENSAH", "prenom": "Kokou"},
            {"matricule_source": "ETU_002", "nom": "LAWSON", "prenom": "Akossiwa"},
            {"matricule_source": "ETU_003", "nom": "ADJALLO", "prenom": "Komla"},
        ]
        excel_buffer = self._create_excel_grades(rows)
        report = import_grades_file(excel_buffer, filename="SUIVI_NOTES_2024_2025.xlsx")

        self.assertEqual(report["etudiants_auto_crees"], 3)
        self.assertEqual(DimEtudiant.objects.count(), 3)

        notif = report.get("notification")
        self.assertIsNotNone(notif)
        self.assertIn("3 nouveaux étudiants détectés", notif["title"])
        self.assertEqual(notif["count"], 3)
        self.assertEqual(len(notif["students"]), 3)

    def test_import_with_existing_students_generates_no_new_student_notification(self):
        """Vérifie qu'aucun nouvel étudiant n'est comptabilisé si l'étudiant existe déjà."""
        DimEtudiant.objects.create(
            matricule="ETU_KNOWN_001",
            nom="DUPONT",
            prenom="Jean",
            mail="jean.dupont@campus.edu",
            annee_souscription="2024-2025",
        )
        self.assertEqual(DimEtudiant.objects.count(), 1)

        rows = [
            {"matricule_source": "ETU_KNOWN_001", "nom": "DUPONT", "prenom": "Jean"}
        ]
        excel_buffer = self._create_excel_grades(rows)
        report = import_grades_file(excel_buffer, filename="SUIVI_NOTES_2024_2025.xlsx")

        self.assertEqual(report["etudiants_auto_crees"], 0)
        self.assertEqual(DimEtudiant.objects.count(), 1)
        self.assertIsNone(report.get("notification"))
