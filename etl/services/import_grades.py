"""
Service d'import du fichier de suivi des notes (.xlsx).

Particularités de ce fichier (constatées lors de l'analyse) :
- Une seule feuille utile : "SUIVI NOTES 2024-2025". Toutes les autres
  feuilles sont des PV de jury / rattrapage et ne sont PAS importées.
- La colonne MATRICULE de cette feuille n'est pas fiable (doublons,
  erreurs de saisie) -> on ne l'utilise PAS pour retrouver l'étudiant.
- Le matching se fait sur NOM + PRENOMS normalisés (accents et casse
  ignorés), en réutilisant les étudiants déjà importés via le fichier
  Master (Import 1).
- Les en-têtes de colonnes sont mal formés (retours à la ligne dans les
  cellules, typo "SEMEST2E22"...) -> on lit les colonnes par POSITION,
  la structure du fichier étant fixe.

Règles de gestion :
- Met à jour annee_souscription dans dim_etudiant
- Crée/récupère dynamiquement dim_niveau, dim_module, dim_annee_academique
- Upsert atomique dans fact_evaluation
- note_devoir_40 = 40% x SOMME(devoir1..devoir4)
- note_examen_60 = 60% x note_examen
- moyenne = note_devoir_40 + note_examen_60 (sur 20)
- resultat = Admis si moyenne >= 10, sinon Ajourné
"""
import random
import re
import string
import unicodedata
from decimal import Decimal, InvalidOperation

import pandas as pd
from django.db import transaction
from django.db.utils import IntegrityError

from students.models import DimEtudiant
from academics.models import (
    DimNiveau, DimModule, DimAnneeAcademique, FactEvaluation, ResultatChoices
)


class GradeImportError(Exception):
    pass


# Nom de feuille par défaut (pour référence / rétro-compatibilité)
DEFAULT_SHEET_NAME = "SUIVI NOTES 2024-2025"


def detect_grades_sheet_name(sheet_names: list) -> str:
    """
    Détecte automatiquement le nom de la feuille de suivi des notes,
    quelle que soit l'année académique (ex: 2024-2025, 2023-2024, etc.).
    """
    # 1. Correspondance exacte ou partielle avec SUIVI et NOTE
    for s in sheet_names:
        norm = _strip_accents(str(s)).upper()
        if "SUIVI" in norm and "NOTE" in norm:
            return s

    # 2. Correspondance avec SUIVI ou NOTE ou EVAL
    for s in sheet_names:
        norm = _strip_accents(str(s)).upper()
        if any(w in norm for w in ["SUIVI", "NOTE", "EVAL"]):
            return s

    # 3. Première feuille par défaut si existante
    if sheet_names:
        return sheet_names[0]

    raise GradeImportError("Le fichier Excel ne contient aucune feuille.")

# Nombre de lignes à sauter avant la ligne d'en-tête réelle (titre +
# lignes vides). La ligne d'en-tête est donc la 5e ligne du fichier.
HEADER_SKIP_ROWS = 5

# Ordre FIXE des colonnes dans la feuille (positionnel, car les en-têtes
# texte sont abîmés / peu fiables) :
# 0 MATRICULE (non fiable, ignoré comme clé)
# 1 DATE DE NAISSANCE
# 2 MAIL ETUDIANT
# 3 NOM
# 4 PRENOMS
# 5 NIVEAU (libellé)
# 6 MODULES
# 7 SEMESTRE
# 8 ANNEE EN COURS
# 9 ANNEE SOUSCRIPTION
# 10 CODE NIVEAU
# 11-14 Notes Devoir 1-4
# 15 Notes Finales DEVOIR (calculé source, ignoré : on recalcule)
# 16 Notes DEVOIR (40%) (calculé source, ignoré : on recalcule)
# 17 Notes EXAMEN
# 18 Notes EXAMEN (60%) (calculé source, ignoré : on recalcule)
# 19 MOYENNES (calculé source, ignoré : on recalcule)
# 20 RESULTATS (calculé source, ignoré : on recalcule)
# 21 Année académique Rattrapage
# 22 Note de Rattrapage
# 23 Moyenne Rattrapage (calculé source, ignoré : on recalcule)
# 24 Résultat rattrapage (calculé source, ignoré : on recalcule)
COLUMN_NAMES = [
    "matricule_source", "date_naissance", "mail", "nom", "prenom",
    "niveau_libelle", "module_nom", "semestre", "annee_en_cours",
    "annee_souscription", "code_niveau",
    "devoir1", "devoir2", "devoir3", "devoir4",
    "_devoir_finale_src", "_devoir_40_src",
    "note_examen", "_examen_60_src",
    "_moyenne_src", "_resultat_src",
    "annee_rattrapage", "note_rattrapage",
    "_moyenne_rattrapage_src", "_resultat_rattrapage_src",
]

DEVOIR_COLS = ["devoir1", "devoir2", "devoir3", "devoir4"]

# Liste officielle des niveaux existants dans l'établissement.
NIVEAU_CODES_OFFICIELS = [
    "B1M", "B1SI", "B2M", "B2SI", "B3M", "B3SI",
    "M1M", "M1SI", "M2M", "M2SI",
]

# Table de correspondance {3 premiers caractères : code officiel}.
# Permet d'absorber les erreurs de saisie sur le(s) dernier(s) caractère(s)
# (ex: 'B3S1' avec un chiffre 1 au lieu du 'I' -> reconnu comme 'B3SI',
# car les 3 premiers caractères 'B3S' sont identiques).
_NIVEAU_PREFIX_MAP = {code[:3]: code for code in NIVEAU_CODES_OFFICIELS}


def _normalize_code_niveau(raw_value: str) -> str:
    """Normalise un CODE NIVEAU en le faisant correspondre à l'un des 10
    niveaux officiels via ses 3 premiers caractères. Lève GradeImportError
    si aucun niveau officiel ne correspond à ce préfixe."""
    cleaned = re.sub(r"\s+", "", str(raw_value or "")).strip().upper()
    if not cleaned:
        raise GradeImportError("CODE NIVEAU manquant sur cette ligne.")

    prefix = cleaned[:3]
    canonical = _NIVEAU_PREFIX_MAP.get(prefix)
    if canonical is None:
        raise GradeImportError(
            f"CODE NIVEAU '{raw_value}' non reconnu (préfixe '{prefix}' ne "
            f"correspond à aucun des niveaux officiels : {', '.join(NIVEAU_CODES_OFFICIELS)})."
        )
    return canonical


def _strip_accents(text: str) -> str:
    """Supprime les accents pour un matching robuste (é -> e, etc.)."""
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(c for c in normalized if not unicodedata.combining(c))


def _normalize_name(value) -> str:
    """Normalise un nom/prénom pour le matching : majuscules, sans
    accents, espaces multiples réduits, espaces de bord supprimés."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    text = str(value).strip().upper()
    text = _strip_accents(text)
    text = re.sub(r"\s+", " ", text)
    return text


def _to_decimal_or_none(value):
    """Convertit en Decimal borné [0,20], ou None si invalide/absent."""
    if value is None or (isinstance(value, float) and pd.isna(value)) or value == "":
        return None
    try:
        dec = Decimal(str(value))
        if dec < 0 or dec > 20:
            return None
        return dec
    except (InvalidOperation, ValueError):
        return None


def _calculer_devoir_40(notes_devoirs: list) -> Decimal:
    """note_devoir_40 = 40% x MOYENNE(devoir1..devoir4). Ignore les devoirs
    non renseignés (None) dans le calcul. Note sur 8 maximum."""
    valides = [n for n in notes_devoirs if n is not None]
    if not valides:
        return None
    moyenne_devoirs = sum(valides) / Decimal(len(valides))
    return round(moyenne_devoirs * Decimal("0.4"), 2)


def _calculer_examen_60(note_examen) -> Decimal:
    """note_examen_60 = 60% x note_examen."""
    if note_examen is None:
        return None
    return round(Decimal(note_examen) * Decimal("0.6"), 2)


def _determiner_resultat(moyenne) -> str:
    """Admis si moyenne >= 10, sinon Ajourné."""
    if moyenne is None:
        return ResultatChoices.NON_EVALUE
    return ResultatChoices.ADMIS if moyenne >= 10 else ResultatChoices.AJOURNE


_SR_JR_SUFFIX_RE = re.compile(r"\s*\(?\b(SR|JR)\)?\s*$", re.IGNORECASE)


def _normalize_module_name(module_nom: str) -> str:
    """Normalise le nom d'un module pour la déduplication : supprime un
    éventuel suffixe Sr/Jr en fin de nom (ex: 'ANALYSE&MODELISATION M1M Sr'
    et 'ANALYSE&MODELISATION M1M Jr' sont le même module), et nettoie les
    espaces superflus. Le nom stocké en base est cette version normalisée."""
    if not module_nom:
        return module_nom
    cleaned = _SR_JR_SUFFIX_RE.sub("", module_nom.strip())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned or module_nom.strip()


def _generate_module_code(module_nom: str) -> str:
    """Génère un code_mod = 3 premières lettres du nom du module (en
    majuscules, alpha uniquement) + 4 chiffres aléatoires. Ex: 'DEV1002'."""
    letters = re.sub(r"[^A-Za-zÀ-ÿ]", "", module_nom or "")
    prefix = (letters[:3] or "MOD").upper()
    digits = "".join(random.choices(string.digits, k=4))
    return f"{prefix}{digits}"


def _get_or_create_module(module_nom_raw: str, semestre):
    """Trouve un module existant par nom normalisé + semestre (matching
    insensible à la casse, Sr/Jr fusionnés), ou en crée un nouveau avec un
    code_mod généré aléatoirement (retente en cas de collision, la paire
    (code_mod, semestre) étant contrainte UNIQUE)."""
    normalized_name = _normalize_module_name(module_nom_raw)

    existing = DimModule.objects.filter(
        nom_mod__iexact=normalized_name, semestre=semestre
    ).first()
    if existing:
        return existing, False

    for _ in range(10):  # quelques tentatives en cas de collision de code
        code = _generate_module_code(normalized_name)
        try:
            module = DimModule.objects.create(
                code_mod=code, semestre=semestre, nom_mod=normalized_name
            )
            return module, True
        except IntegrityError:
            continue

    raise GradeImportError(
        f"Impossible de générer un code_mod unique pour le module '{normalized_name}'."
    )


def _build_student_lookup():
    """Construit un dictionnaire {(nom_normalise, prenom_normalise): etudiant}
    à partir de dim_etudiant, en détectant les homonymes (ambiguïtés)."""
    lookup = {}
    ambiguous_keys = set()

    for etu in DimEtudiant.objects.all():
        key = (_normalize_name(etu.nom), _normalize_name(etu.prenom))
        if key in lookup:
            ambiguous_keys.add(key)
        else:
            lookup[key] = etu

    for key in ambiguous_keys:
        lookup.pop(key, None)  # on retire les homonymes : ils devront être traités manuellement

    return lookup, ambiguous_keys


def _clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    n_cols = min(len(COLUMN_NAMES), df.shape[1])
    df = df.iloc[:, :n_cols].copy()
    df.columns = COLUMN_NAMES[:n_cols]

    # Supprimer les lignes totalement vides ou sans nom (lignes de fin de tableau)
    df = df.dropna(how="all")
    df = df[df["nom"].notna() & (df["nom"].astype(str).str.strip() != "")]

    return df


@transaction.atomic
def import_grades_file(file_obj, sheet_name: str = None) -> dict:
    """
    Importe la feuille de suivi des notes (détectée automatiquement ou spécifiée),
    avec matching des étudiants par NOM+PRENOM (le matricule de ce
    fichier n'étant pas fiable), création dynamique des dimensions et
    upsert atomique dans fact_evaluation.
    """
    try:
        excel_file = pd.ExcelFile(file_obj, engine="openpyxl")
        target_sheet = sheet_name or detect_grades_sheet_name(excel_file.sheet_names)
        df = pd.read_excel(
            excel_file,
            sheet_name=target_sheet,
            header=None,
            skiprows=HEADER_SKIP_ROWS,
        )
    except ValueError as e:
        target = sheet_name or "de suivi des notes"
        raise GradeImportError(
            f"Feuille '{target}' introuvable dans le fichier : {e}"
        )
    except Exception as e:
        raise GradeImportError(f"Impossible de lire le fichier Excel : {e}")

    df = _clean_dataframe(df)

    student_lookup, ambiguous_keys = _build_student_lookup()

    report = {
        "created": 0, "updated": 0, "errors": [], "total": len(df),
        "etudiants_introuvables": 0, "etudiants_ambigus": 0,
        "etudiants_auto_crees": 0,
    }

    for idx, row in df.iterrows():
        ligne_excel = idx + HEADER_SKIP_ROWS + 2  # +2 : en-tête + index 0-based -> 1-based
        nom_source = row.get("nom")
        prenom_source = row.get("prenom")

        try:
            key = (_normalize_name(nom_source), _normalize_name(prenom_source))

            if key in ambiguous_keys:
                report["errors"].append({
                    "ligne": ligne_excel,
                    "matricule": "N/A",
                    "erreur": (
                        f"Homonyme détecté pour '{nom_source} {prenom_source}' : "
                        "plusieurs étudiants du fichier Master partagent ce nom. "
                        "Résolution manuelle requise."
                    ),
                })
                report["etudiants_ambigus"] += 1
                continue

            etudiant = student_lookup.get(key)
            if etudiant is None:
                # Si l'étudiant n'est pas encore présent dans dim_etudiant
                # (ex: fichier d'une autre année académique dont le master n'a pas encore été injecté),
                # on le crée automatiquement pour intégrer ses notes et évaluations.
                nom_clean = str(nom_source or "").strip().upper()
                prenom_clean = str(prenom_source or "").strip()
                if nom_clean and prenom_clean:
                    mat_raw = str(row.get("matricule_source") or "").strip().upper()
                    if mat_raw and mat_raw not in ("NAN", "NONE", "N/A", ""):
                        candidate_mat = mat_raw
                    else:
                        candidate_mat = f"ETU_{_normalize_name(nom_clean)[:3]}_{random.randint(1000, 9999)}"

                    final_mat = candidate_mat
                    suffix = 1
                    while DimEtudiant.objects.filter(matricule=final_mat).exists():
                        final_mat = f"{candidate_mat}_{suffix}"
                        suffix += 1

                    etudiant = DimEtudiant.objects.create(
                        matricule=final_mat,
                        nom=nom_clean,
                        prenom=prenom_clean,
                        mail=str(row.get("mail") or "").strip() if pd.notna(row.get("mail")) else None,
                        annee_souscription=str(row.get("annee_souscription") or "").strip() if pd.notna(row.get("annee_souscription")) else None,
                    )
                    student_lookup[key] = etudiant
                    report["etudiants_auto_crees"] += 1
                else:
                    report["errors"].append({
                        "ligne": ligne_excel,
                        "matricule": "N/A",
                        "erreur": (
                            f"Étudiant '{nom_source} {prenom_source}' introuvable — "
                            "importer d'abord le fichier master étudiants."
                        ),
                    })
                    report["etudiants_introuvables"] += 1
                    continue

            # --- Mise à jour annee_souscription si absente ---
            annee_souscription = row.get("annee_souscription")
            if not etudiant.annee_souscription and pd.notna(annee_souscription):
                etudiant.annee_souscription = str(annee_souscription).strip()
                etudiant.save(update_fields=["annee_souscription"])

            # --- Dimensions ---
            code_niveau = _normalize_code_niveau(row.get("code_niveau"))

            niveau, _ = DimNiveau.objects.get_or_create(
                code_niv=code_niveau,
                defaults={"libelle_niv": code_niveau},
            )

            module_nom = str(row.get("module_nom") or "").strip()
            semestre = row.get("semestre")
            semestre = str(semestre).strip() if pd.notna(semestre) else None
            if not module_nom:
                raise GradeImportError("Nom de module manquant sur cette ligne.")
            module, _ = _get_or_create_module(module_nom, semestre)

            annee_academique = str(row.get("annee_en_cours") or "").strip()
            if not annee_academique:
                raise GradeImportError("ANNEE EN COURS manquante sur cette ligne.")
            annee, _ = DimAnneeAcademique.objects.get_or_create(
                annee_academique=annee_academique
            )

            # --- Calcul des notes ---
            devoirs = [_to_decimal_or_none(row.get(c)) for c in DEVOIR_COLS]
            note_examen = _to_decimal_or_none(row.get("note_examen"))
            note_rattrapage = _to_decimal_or_none(row.get("note_rattrapage"))

            devoir_40 = _calculer_devoir_40(devoirs)
            examen_60 = _calculer_examen_60(note_examen)

            moyenne = None
            if devoir_40 is not None and examen_60 is not None:
                moyenne = round(devoir_40 + examen_60, 2)
            elif examen_60 is not None:
                moyenne = round(note_examen, 2)
            elif devoir_40 is not None:
                moyenne = round(devoir_40 / Decimal("0.4"), 2)

            if moyenne is not None:
                moyenne = min(max(moyenne, Decimal("0.00")), Decimal("20.00"))

            resultat = _determiner_resultat(moyenne)

            moyenne_rattrapage = note_rattrapage
            resultat_rattrapage = None
            if note_rattrapage is not None:
                resultat_rattrapage = (
                    ResultatChoices.ADMIS if note_rattrapage >= 10 else ResultatChoices.AJOURNE
                )

            # --- Upsert dans fact_evaluation (quadruplet unique) ---
            obj, created = FactEvaluation.objects.update_or_create(
                id_etu=etudiant, id_mod=module, id_niv=niveau, id_annee=annee,
                defaults={
                    "note_devoir1": devoirs[0], "note_devoir2": devoirs[1],
                    "note_devoir3": devoirs[2], "note_devoir4": devoirs[3],
                    "note_devoir_40": devoir_40,
                    "note_examen": note_examen, "note_examen_60": examen_60,
                    "moyenne": moyenne, "resultat": resultat,
                    "note_rattrapage": note_rattrapage,
                    "moyenne_rattrapage": moyenne_rattrapage,
                    "resultat_rattrapage": resultat_rattrapage,
                },
            )
            report["created" if created else "updated"] += 1

        except Exception as e:
            report["errors"].append({
                "ligne": ligne_excel,
                "matricule": "N/A",
                "erreur": str(e),
            })

    return report