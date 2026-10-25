"""
Service d'import du fichier Master Étudiants (.xlsx / .csv).
Règle : UPSERT dans dim_etudiant basé sur le matricule.
Extrait automatiquement l'année académique depuis le nom du fichier pour l'ajouter
aux filtres d'année (dim_annee_academique) s'il n'y figure pas déjà.
"""
import pandas as pd
from django.db import transaction
from students.models import DimEtudiant
from .academic_year import extract_academic_year, ensure_academic_year_exists


# Colonnes attendues dans le fichier (adapter si tes en-têtes diffèrent)
EXPECTED_COLUMNS = {
    'matricule': 'matricule',
    'nom': 'nom',
    'prenom': 'prenom',
    'date_naissance': 'date_naissance',
    'mail': 'mail',
    'annee_souscription': 'annee_souscription',
}


class StudentImportError(Exception):
    """Exception levée en cas d'erreur bloquante lors de l'import."""
    pass


def _clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Nettoie et normalise le dataframe brut."""
    # Normaliser les noms de colonnes (minuscules, sans espaces)
    df.columns = [str(c).strip().lower().replace(' ', '_') for c in df.columns]

    missing = set(['matricule', 'nom', 'prenom']) - set(df.columns)
    if missing:
        raise StudentImportError(
            f"Colonnes obligatoires manquantes dans le fichier : {missing}"
        )

    # Supprimer les lignes totalement vides
    df = df.dropna(how='all')

    # Nettoyer le matricule (obligatoire pour l'upsert)
    df['matricule'] = df['matricule'].astype(str).str.strip().str.upper()
    df = df[df['matricule'].notna() & (df['matricule'] != '') & (df['matricule'] != 'NAN')]

    # Date de naissance -> format date propre
    if 'date_naissance' in df.columns:
        df['date_naissance'] = pd.to_datetime(df['date_naissance'], errors='coerce').dt.date

    return df


@transaction.atomic
def import_students_file(file_obj, filename: str = None) -> dict:
    """
    Importe le fichier master étudiants avec upsert par matricule.
    Détecte l'année académique dans le nom du fichier et l'insère dans
    dim_annee_academique (filtre année) si elle n'y est pas déjà.

    Args:
        file_obj: fichier .xlsx / .csv (uploadé via DRF, InMemoryUploadedFile ou ouvert)
        filename: nom optionnel du fichier pour l'extraction de l'année

    Returns:
        dict: rapport d'exécution {created, updated, errors, total, annee_academique, annee_created}
    """
    effective_filename = filename or getattr(file_obj, 'name', '')

    # 1. Extraction de l'année académique depuis le nom du fichier
    academic_year = extract_academic_year(filename=effective_filename)

    # 2. Lecture du fichier Excel ou CSV
    try:
        fn_lower = str(effective_filename).lower()
        if fn_lower.endswith('.csv'):
            try:
                df = pd.read_csv(file_obj, encoding='utf-8')
            except UnicodeDecodeError:
                if hasattr(file_obj, 'seek'):
                    file_obj.seek(0)
                df = pd.read_csv(file_obj, encoding='latin1')
        else:
            df = pd.read_excel(file_obj)
    except Exception as e:
        raise StudentImportError(f"Impossible de lire le fichier : {e}")

    df = _clean_dataframe(df)

    # 3. Fallback : si l'année n'était pas dans le nom du fichier, chercher dans les données de souscription
    if not academic_year and 'annee_souscription' in df.columns:
        for y_candidate in df['annee_souscription'].dropna().unique():
            if str(y_candidate).strip().lower() not in ('nan', 'none', ''):
                extracted = extract_academic_year(text=str(y_candidate))
                if extracted:
                    academic_year = extracted
                    break

    # 4. Enregistrement de l'année académique dans les filtres (DimAnneeAcademique)
    annee_obj = None
    annee_created = False
    if academic_year:
        annee_obj, annee_created = ensure_academic_year_exists(academic_year)

    report = {
        'created': 0,
        'updated': 0,
        'errors': [],
        'total': len(df),
        'annee_academique': academic_year,
        'annee_created': annee_created,
    }

    for idx, row in df.iterrows():
        try:
            matricule = row['matricule']

            raw_nom = row.get('nom')
            nom_val = str(raw_nom).strip() if pd.notna(raw_nom) and str(raw_nom).strip().lower() not in ('nan', 'none') else ''

            raw_prenom = row.get('prenom')
            prenom_val = str(raw_prenom).strip() if pd.notna(raw_prenom) and str(raw_prenom).strip().lower() not in ('nan', 'none') else ''

            raw_mail = row.get('mail')
            mail_val = str(raw_mail).strip() if pd.notna(raw_mail) and str(raw_mail).strip().lower() not in ('nan', 'none') else None

            # Nettoyage de annee_souscription pour cette ligne
            raw_annee = row.get('annee_souscription')
            clean_annee = None
            if pd.notna(raw_annee):
                s_annee = str(raw_annee).strip()
                if s_annee.lower() not in ('nan', 'none', '', 'null'):
                    clean_annee = s_annee

            defaults = {
                'nom': nom_val,
                'prenom': prenom_val,
                'date_naissance': row.get('date_naissance') if pd.notna(row.get('date_naissance')) else None,
                'mail': mail_val,
            }

            # Si l'année de souscription est explicite dans la ligne, on l'utilise.
            # Sinon, on applique l'année académique déduite du nom du fichier.
            if clean_annee:
                defaults['annee_souscription'] = clean_annee
            elif academic_year:
                defaults['annee_souscription'] = academic_year

            # Recherche par matricule OU par nom + prénom normalisés
            existing = DimEtudiant.objects.filter(matricule=matricule).first()
            if not existing and defaults['nom'] and defaults['prenom']:
                from .import_grades import _normalize_name
                norm_nom = _normalize_name(defaults['nom'])
                norm_prenom = _normalize_name(defaults['prenom'])
                for candidate in DimEtudiant.objects.all():
                    if _normalize_name(candidate.nom) == norm_nom and _normalize_name(candidate.prenom) == norm_prenom:
                        existing = candidate
                        break

            if existing:
                is_existing_annee_valid = (
                    existing.annee_souscription
                    and str(existing.annee_souscription).strip().lower() not in ('nan', 'none', '', 'null')
                )
                for k, v in defaults.items():
                    # Ne pas écraser une année de souscription valide déjà enregistrée avec le fallback
                    if k == 'annee_souscription' and is_existing_annee_valid and not clean_annee:
                        continue
                    if v is not None:
                        setattr(existing, k, v)
                existing.save()
                report['updated'] += 1
            else:
                DimEtudiant.objects.create(matricule=matricule, **defaults)
                report['created'] += 1

        except Exception as e:
            report['errors'].append({
                'ligne': idx + 2,  # +2 car Excel commence à 1 + ligne d'en-tête
                'matricule': row.get('matricule', 'N/A'),
                'erreur': str(e),
            })

    return report