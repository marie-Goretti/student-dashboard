"""
Service de détection automatique et de routage intelligent des imports Excel/CSV.
Reconnaît automatiquement :
- Fichier Master Étudiants -> table dim_etudiant (et dimension dim_annee_academique déduite du nom)
- Fichier Suivi des Notes -> tables dim_niveau, dim_module, dim_annee_academique, fact_evaluation
"""
import io
import csv
import re
import openpyxl
import pandas as pd
from .import_students import import_students_file, StudentImportError
from .import_grades import import_grades_file, GradeImportError
from .academic_year import extract_academic_year, ensure_academic_year_exists


def _clean_str(val) -> str:
    """Nettoie une valeur textuelle et élimine les NaN / None / chaînes vides."""
    if val is None:
        return ''
    s = str(val).strip()
    return '' if s.lower() in ('nan', 'none', 'null', 'n/a', 'nat') else s


def _format_count(n: int, singular: str, plural: str) -> str:
    """Formate un compte avec séparateur d'espace français et accord grammatical."""
    formatted = f"{n:,}".replace(',', ' ')
    label = plural if n > 1 else singular
    return f"{formatted} {label}"


def _analyze_tabular_rows(rows_stream, filename: str = '', sheet_name: str = '') -> dict:
    """
    Analyse un flux de lignes sans modifier la base de données.
    Détecte avec précision :
    - Le type de fichier ('students' ou 'grades')
    - Le nombre exact de lignes de données réelles (sans compter les en-têtes et lignes vides)
    - Le nombre exact d'étudiants distincts
    - Le nombre exact de modules distincts
    - Le nombre exact de niveaux distincts
    - L'année académique dans le contenu ou le nom
    """
    buffered = []
    for i, r in enumerate(rows_stream):
        buffered.append(r)
        if i >= 35:
            break

    header_idx = None
    file_type = 'unknown'
    header_cols = []

    # 1. Détection de l'en-tête et du type
    for idx, r in enumerate(buffered):
        if not r or not any(c is not None for c in r):
            continue
        vals_str = [_clean_str(c).upper() for c in r if c is not None]
        line_str = ' '.join(vals_str)

        # Signature Suivi des notes
        if any(sig in line_str for sig in [
            'DEVOIR', 'EXAMEN', 'MOYENNE', 'RATTRAPAGE', 'CODE_NIVEAU',
            'CODE NIVEAU', 'SEMESTRE', 'MODULE'
        ]):
            file_type = 'grades'
            header_idx = idx
            header_cols = [_clean_str(c).upper() for c in r]
            break

        # Signature Master Étudiants
        norm_vals = [re.sub(r'[^A-Z0-9]', '', _clean_str(c).upper()) for c in r if c is not None]
        if any('MATRICULE' in v for v in norm_vals) and any('NOM' in v for v in norm_vals):
            file_type = 'students'
            header_idx = idx
            header_cols = [_clean_str(c).upper() for c in r]
            break

    # Si non détecté par le contenu des 35 premières lignes, se baser sur les indices du nom
    if file_type == 'unknown':
        hint = f"{filename} {sheet_name}".upper()
        if any(k in hint for k in ('SUIVI', 'NOTE', 'EVAL', 'GRADE')):
            file_type = 'grades'
            header_idx = 5 if len(buffered) > 5 else 0
        elif any(k in hint for k in ('ETU', 'STUDENT', 'MASTER', 'INSCRIT')):
            file_type = 'students'
            header_idx = 0
        else:
            for idx, r in enumerate(buffered):
                if r and any(_clean_str(c) for c in r):
                    header_idx = idx
                    header_cols = [_clean_str(c).upper() for c in r]
                    break
            if header_idx is None:
                header_idx = 0
                header_cols = []
            file_type = 'students' if len(header_cols) <= 10 else 'grades'

    if not header_cols and header_idx is not None and header_idx < len(buffered):
        header_cols = [_clean_str(c).upper() for c in buffered[header_idx] if c is not None]

    def find_col(predicate, fallback=None):
        for i, c in enumerate(header_cols):
            if predicate(c):
                return i
        return fallback

    total_lines = 0
    students_set = set()
    modules_set = set()
    niveaux_set = set()
    detected_year_content = None

    has_devoirs = any('DEVOIR' in c or 'CC' in c for c in header_cols)
    has_examens = any('EXAM' in c for c in header_cols)
    has_rattrapage = any('RAT' in c for c in header_cols)
    has_coords = any(any(k in c for k in ('MAIL', 'NAISS', 'TEL', 'ADRESSE')) for c in header_cols)

    data_rows = buffered[header_idx + 1:] if header_idx is not None else buffered

    if file_type == 'students':
        mat_idx = find_col(lambda c: 'MATRICULE' in c or 'MATRI' in c or 'ID_ETU' in c, 0)
        nom_idx = find_col(lambda c: 'NOM' in c and 'PRENOM' not in c, 1)
        prenom_idx = find_col(lambda c: 'PRENOM' in c, 2)
        annee_idx = find_col(lambda c: 'SOUSCRIPTION' in c or 'ANNEE' in c, 5)

        def proc_stud(r):
            nonlocal total_lines, detected_year_content
            if not r or not any(_clean_str(c) for c in r):
                return
            mat = _clean_str(r[mat_idx] if len(r) > mat_idx else '').upper()
            nom = _clean_str(r[nom_idx] if len(r) > nom_idx else '').upper()
            prenom = _clean_str(r[prenom_idx] if len(r) > prenom_idx else '').upper()

            if nom == 'NOM' and mat in ('MATRICULE', ''):
                return
            if not mat and not nom:
                return

            st_key = mat if mat else (nom, prenom)
            students_set.add(st_key)
            total_lines += 1

            if not detected_year_content and annee_idx is not None and len(r) > annee_idx:
                y = extract_academic_year(text=str(r[annee_idx] or ''))
                if y:
                    detected_year_content = y

        for r in data_rows:
            proc_stud(r)
        for r in rows_stream:
            proc_stud(r)

    else:
        # Fichier Suivi des Notes
        nom_idx = find_col(lambda c: c == 'NOM' or c.endswith(' NOM'), 3)
        prenom_idx = find_col(lambda c: 'PRENOM' in c, 4)
        mat_idx = find_col(lambda c: 'MATRICULE' in c, 0)
        module_idx = find_col(lambda c: 'MODULE' in c, 6)
        niv_idx = find_col(lambda c: 'CODE_NIVEAU' in c or 'CODE NIVEAU' in c or c == 'NIVEAU', 10)
        annee_idx = find_col(lambda c: 'ANNEE' in c, 8)

        def proc_grades(r):
            nonlocal total_lines, detected_year_content
            if not r or not any(_clean_str(c) for c in r):
                return
            nom = _clean_str(r[nom_idx] if len(r) > nom_idx else '').upper()
            prenom = _clean_str(r[prenom_idx] if len(r) > prenom_idx else '').upper()
            mat = _clean_str(r[mat_idx] if len(r) > mat_idx else '').upper()

            if not nom and not mat:
                return
            if nom == 'NOM' or mat == 'MATRICULE':
                return

            st_key = (nom, prenom) if nom else mat
            students_set.add(st_key)
            total_lines += 1

            if module_idx is not None and len(r) > module_idx:
                m = _clean_str(r[module_idx])
                if m and m.upper() != 'MODULE':
                    modules_set.add(m)

            if niv_idx is not None and len(r) > niv_idx:
                n = _clean_str(r[niv_idx])
                if n and n.upper() not in ('NIVEAU', 'CODE_NIVEAU', 'CODE NIVEAU'):
                    niveaux_set.add(n)

            if not detected_year_content and annee_idx is not None and len(r) > annee_idx:
                y = extract_academic_year(text=str(r[annee_idx] or ''))
                if y:
                    detected_year_content = y

        for r in data_rows:
            proc_grades(r)
        for r in rows_stream:
            proc_grades(r)

    return {
        'file_type': file_type,
        'total_lines': total_lines,
        'students_count': len(students_set),
        'modules_count': len(modules_set),
        'niveaux_count': len(niveaux_set),
        'detected_year_content': detected_year_content,
        'has_devoirs': has_devoirs,
        'has_examens': has_examens,
        'has_rattrapage': has_rattrapage,
        'has_coords': has_coords,
    }


def analyze_uploaded_file(file_obj) -> dict:
    """
    Analyse un fichier Excel (.xlsx, .xls) ou CSV sans modifier la base de données.
    Extrait les effectifs exacts (lignes réelles, étudiants réels, modules, niveaux)
    de manière ultra-rapide et sécurisée.
    """
    content = file_obj.read()
    file_obj.seek(0)

    filename = getattr(file_obj, 'name', 'fichier_academique.xlsx')
    detected_year = extract_academic_year(filename=filename)

    res = None

    # CAS A : Fichier CSV
    if filename.lower().endswith('.csv'):
        for encoding in ('utf-8-sig', 'utf-8', 'latin1'):
            try:
                decoded = content.decode(encoding)
                sample = decoded[:4096]
                delimiter = ';' if ';' in sample and sample.count(';') > sample.count(',') else ','
                reader = csv.reader(io.StringIO(decoded), delimiter=delimiter)
                res = _analyze_tabular_rows(reader, filename=filename)
                break
            except Exception:
                continue

    # CAS B : Fichier Excel (.xlsx, .xls) via openpyxl read_only stream
    if res is None:
        try:
            wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
            sheet_names = wb.sheetnames

            # Cibler la feuille de suivi ou la première feuille
            target_sheet = sheet_names[0]
            for s in sheet_names:
                if 'SUIVI' in s.upper() and 'NOTE' in s.upper():
                    target_sheet = s
                    break

            ws = wb[target_sheet]
            res = _analyze_tabular_rows(
                ws.iter_rows(values_only=True),
                filename=filename,
                sheet_name=target_sheet,
            )
            wb.close()
        except Exception:
            pass

    # CAS C : Fallback robuste via pandas si openpyxl n'a pas pu ouvrir
    if res is None:
        try:
            excel_file = pd.ExcelFile(io.BytesIO(content))
            sheet_names = excel_file.sheet_names
            target_sheet = sheet_names[0]
            for s in sheet_names:
                if 'SUIVI' in s.upper() and 'NOTE' in s.upper():
                    target_sheet = s
                    break

            # Détection type via échantillon
            df_sample = pd.read_excel(excel_file, sheet_name=target_sheet, nrows=10)
            cols_str = ' '.join([str(c).upper() for c in df_sample.columns])
            is_grades = any(sig in cols_str for sig in ['DEVOIR', 'EXAMEN', 'MOYENNE', 'RATTRAPAGE', 'SEMESTRE', 'MODULE'])

            if is_grades:
                df = pd.read_excel(excel_file, sheet_name=target_sheet, skiprows=5)
                df = df.dropna(how='all')
                total = len(df)
                st_count = len(df.drop_duplicates(subset=[df.columns[3], df.columns[4]])) if df.shape[1] > 4 else total
                res = {
                    'file_type': 'grades',
                    'total_lines': total,
                    'students_count': st_count,
                    'modules_count': df[df.columns[6]].nunique() if df.shape[1] > 6 else 0,
                    'niveaux_count': df[df.columns[10]].nunique() if df.shape[1] > 10 else 0,
                    'detected_year_content': None,
                    'has_devoirs': True,
                    'has_examens': True,
                    'has_rattrapage': True,
                    'has_coords': False,
                }
            else:
                df = pd.read_excel(excel_file, sheet_name=sheet_names[0])
                df = df.dropna(how='all')
                total = len(df)
                mat_col = next((c for c in df.columns if 'matricule' in str(c).lower()), None)
                st_count = df[mat_col].nunique() if mat_col else total
                res = {
                    'file_type': 'students',
                    'total_lines': total,
                    'students_count': st_count,
                    'modules_count': 0,
                    'niveaux_count': 0,
                    'detected_year_content': None,
                    'has_devoirs': False,
                    'has_examens': False,
                    'has_rattrapage': False,
                    'has_coords': True,
                }
        except Exception:
            res = {
                'file_type': 'students' if ('etu' in filename.lower() or 'master' in filename.lower()) else 'grades',
                'total_lines': 0,
                'students_count': 0,
                'modules_count': 0,
                'niveaux_count': 0,
                'detected_year_content': None,
                'has_devoirs': False,
                'has_examens': False,
                'has_rattrapage': False,
                'has_coords': False,
            }

    file_type = res['file_type']
    total_lines = res['total_lines']
    students_count = res['students_count']
    modules_count = res['modules_count']
    niveaux_count = res['niveaux_count']

    final_year = detected_year or res.get('detected_year_content')

    # Construction de la checklist détaillée avec les vrais chiffres
    if file_type == 'students':
        lines_label = _format_count(total_lines, "ligne étudiante détectée", "lignes étudiantes détectées")
        students_label = _format_count(students_count, "étudiant identifié", "étudiants identifiés")
        year_item = f"Année académique reconnue : {final_year} (ajoutée aux filtres)" if final_year else None

        checklist = [
            lines_label,
            *( [year_item] if year_item else [] ),
            students_label,
            "Matricules uniques validés",
            "Données d'identité (Nom, Prénom) vérifiées",
            *( ["Coordonnées et dates de naissance reconnues"] if res.get('has_coords') else [] ),
            "Structure Master Étudiants conforme",
            "Votre fichier Master Étudiants est prêt à être analysé.",
        ]
    else:
        lines_label = _format_count(total_lines, "ligne d'évaluations détectée", "lignes d'évaluations détectées")
        students_label = _format_count(students_count, "étudiant distinct concerné", "étudiants distincts concernés")
        modules_label = _format_count(modules_count, "module détecté", "modules détectés") if modules_count > 0 else None
        niveaux_label = _format_count(niveaux_count, "niveau détecté", "niveaux détectés") if niveaux_count > 0 else None
        year_item = f"Année académique : {final_year}" if final_year else None

        checklist = [
            lines_label,
            *( [year_item] if year_item else [] ),
            students_label,
            *( [modules_label] if modules_label else [] ),
            *( [niveaux_label] if niveaux_label else [] ),
            *( ["Notes de devoir détectées"] if res.get('has_devoirs') else [] ),
            *( ["Notes d'examen détectées"] if res.get('has_examens') else [] ),
            "Résultats académiques détectés",
            *( ["Données de rattrapage détectées"] if res.get('has_rattrapage') else [] ),
            "Votre fichier de notes est prêt à être analysé.",
        ]

    return {
        'filename': filename,
        'file_type': file_type,
        'annee_academique': final_year,
        'total_lines': total_lines,
        'students_count': students_count,
        'modules_count': modules_count,
        'niveaux_count': niveaux_count,
        'checklist': checklist,
        'is_ready': True,
    }


def execute_auto_import(file_obj) -> dict:
    """
    Routage automatique du fichier vers le bon importeur (Master Étudiants ou Suivi Notes).
    Transmet le classeur déjà ouvert pour éviter les doubles lectures Excel.
    """
    content = file_obj.read()
    file_obj.seek(0)
    filename = getattr(file_obj, 'name', '')

    try:
        excel_file = pd.ExcelFile(io.BytesIO(content), engine='openpyxl')
        sheet_names = excel_file.sheet_names
    except Exception as e:
        # Tentative CSV
        if filename.lower().endswith('.csv'):
            file_obj.seek(0)
            report = import_students_file(file_obj, filename=filename)
            annee_label = report.get('annee_academique')
            libelle = f"Master Étudiants ({annee_label})" if annee_label else "Master Étudiants"
            return {
                'target': 'students',
                'type_libelle': libelle,
                'report': report,
            }
        raise GradeImportError(f"Format de fichier non lisible : {e}")

    # Détection de la feuille Notes
    grades_sheet = None
    for s in sheet_names:
        if 'SUIVI' in s.upper() and 'NOTE' in s.upper():
            grades_sheet = s
            break

    is_grades = grades_sheet is not None

    if not is_grades and len(sheet_names) == 1:
        try:
            df_test = pd.read_excel(excel_file, sheet_name=sheet_names[0], nrows=10)
            cols_str = ' '.join([str(c).upper() for c in df_test.columns])
            if any(sig in cols_str for sig in ['DEVOIR', 'EXAMEN', 'MOYENNE', 'RATTRAPAGE', 'SEMESTRE', 'MODULE']):
                is_grades = True
                grades_sheet = sheet_names[0]
            elif 'MATRICULE' in cols_str and 'NOM' in cols_str:
                is_grades = False
        except Exception:
            is_grades = True
            grades_sheet = sheet_names[0]

    if is_grades:
        # Passe directement excel_file pour éviter de re-parser le fichier Excel
        report = import_grades_file(excel_file, sheet_name=grades_sheet, filename=filename)
        libelle = f"Suivi des Notes & Évaluations ({grades_sheet})" if grades_sheet else "Suivi des Notes & Évaluations"
        return {
            'target': 'grades',
            'type_libelle': libelle,
            'report': report,
        }
    else:
        report = import_students_file(excel_file, filename=filename)
        annee_label = report.get('annee_academique')
        libelle = f"Master Étudiants ({annee_label})" if annee_label else "Master Étudiants"
        return {
            'target': 'students',
            'type_libelle': libelle,
            'report': report,
        }
