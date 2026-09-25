"""
Service d'import du fichier Master Étudiants (.xlsx).
Règle : UPSERT dans dim_etudiant basé sur le matricule.
"""
import pandas as pd
from django.db import transaction
from students.models import DimEtudiant


# Colonnes attendues dans le fichier Excel (adapter si tes en-têtes diffèrent)
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

    # Nettoyer texte
    for col in ['nom', 'prenom', 'mail']:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()
            df[col] = df[col].replace({'nan': None, 'None': None, '': None})

    # Date de naissance -> format date propre
    if 'date_naissance' in df.columns:
        df['date_naissance'] = pd.to_datetime(df['date_naissance'], errors='coerce').dt.date

    # annee_souscription -> string propre ou None
    if 'annee_souscription' in df.columns:
        df['annee_souscription'] = df['annee_souscription'].astype(str).str.strip()
        df['annee_souscription'] = df['annee_souscription'].replace(
            {'nan': None, 'None': None, '': None}
        )
    else:
        df['annee_souscription'] = None

    return df


@transaction.atomic
def import_students_file(file_obj) -> dict:
    """
    Importe le fichier master étudiants avec upsert par matricule.

    Args:
        file_obj: fichier .xlsx (uploadé via DRF, InMemoryUploadedFile)

    Returns:
        dict: rapport d'exécution {created, updated, errors, total}
    """
    try:
        df = pd.read_excel(file_obj, engine='openpyxl')
    except Exception as e:
        raise StudentImportError(f"Impossible de lire le fichier Excel : {e}")

    df = _clean_dataframe(df)

    report = {'created': 0, 'updated': 0, 'errors': [], 'total': len(df)}

    for idx, row in df.iterrows():
        try:
            matricule = row['matricule']
            defaults = {
                'nom': row.get('nom') or '',
                'prenom': row.get('prenom') or '',
                'date_naissance': row.get('date_naissance') if pd.notna(row.get('date_naissance')) else None,
                'mail': row.get('mail'),
            }

            # On ne touche à annee_souscription QUE si elle est fournie et non vide
            # (règle métier : ne pas écraser une valeur existante avec du vide)
            if row.get('annee_souscription'):
                defaults['annee_souscription'] = row['annee_souscription']

            obj, created = DimEtudiant.objects.update_or_create(
                matricule=matricule,
                defaults=defaults,
            )
            report['created' if created else 'updated'] += 1

        except Exception as e:
            report['errors'].append({
                'ligne': idx + 2,  # +2 car Excel commence à 1 + ligne d'en-tête
                'matricule': row.get('matricule', 'N/A'),
                'erreur': str(e),
            })

    return report