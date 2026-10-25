"""
Service utilitaire pour la détection et la gestion des années académiques.
Extrait l'année académique depuis le nom de fichier ou toute chaîne de caractères,
et assure son enregistrement dans la dimension dim_annee_academique pour alimenter
les filtres de l'application.
"""
import re
import unicodedata


def _strip_accents(text: str) -> str:
    """Supprime les accents pour une analyse robuste."""
    normalized = unicodedata.normalize('NFKD', text)
    return ''.join(c for c in normalized if not unicodedata.combining(c))


def extract_academic_year(filename: str = None, text: str = None) -> str | None:
    """
    Extrait l'année académique depuis le nom de fichier ou un texte.
    Exemples supportés :
      - "liste_etudiants_2024-2025.xlsx" -> "2024-2025"
      - "Master_Etudiants_2024_2025.xlsx" -> "2024-2025"
      - "etudiants 2024 2025.xlsx"        -> "2024-2025"
      - "etudiants_2024/2025.xlsx"        -> "2024-2025"
      - "etudiants_2024-25.xlsx"          -> "2024-2025"
      - "etudiants_2024_25.xlsx"          -> "2024-2025"
      - "2024-2025_etudiants.xlsx"        -> "2024-2025"
      - "etudiants_2024.xlsx"             -> "2024-2025" (format universitaire standard)
    """
    target = filename or text
    if not target:
        return None

    # Normaliser la chaîne (sans accents, en minuscules)
    s = _strip_accents(str(target)).strip()
    # Retirer l'extension (.xlsx, .xls, .csv, etc.)
    s = re.sub(r'\.[a-zA-Z0-9]+$', '', s)

    # 1. Format standard YYYY-YYYY avec séparateur (- _ / . espace)
    # Ex: 2024-2025, 2024_2025, 2024 2025, 2024/2025
    m_full = re.search(r'(?:^|[\D_])(20\d{2})[\s_\-/\.](20\d{2})(?:$|[\D_])', s)
    if m_full:
        y1, y2 = m_full.group(1), m_full.group(2)
        return f"{y1}-{y2}"

    # 2. Format court YYYY-YY (ex: 2024-25, 2024_25)
    m_short = re.search(r'(?:^|[\D_])(20\d{2})[\s_\-/\.](\d{2})(?:$|[\D_])', s)
    if m_short:
        y1, y2 = m_short.group(1), m_short.group(2)
        return f"{y1}-20{y2}"

    # 3. Format année unique (ex: 2024 -> 2024-2025)
    m_single = re.search(r'(?:^|[\D_])(20\d{2})(?:$|[\D_])', s)
    if m_single:
        y1 = m_single.group(1)
        next_year = int(y1) + 1
        return f"{y1}-{next_year}"

    return None


def ensure_academic_year_exists(academic_year: str):
    """
    Vérifie et insère l'année académique dans DimAnneeAcademique si elle n'y figure pas déjà.
    Retourne un tuple (annee_instance, created).
    """
    if not academic_year:
        return None, False

    from academics.models import DimAnneeAcademique

    clean_year = str(academic_year).strip()
    return DimAnneeAcademique.objects.get_or_create(annee_academique=clean_year)
