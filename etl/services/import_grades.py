"""
Service d'import optimisé du fichier de suivi des notes (.xlsx).

Particularités de ce fichier :
- Détection automatique de la feuille de notes (ex: "SUIVI NOTES 2024-2025", "SUIVI NOTES", etc.).
- Le matching se fait sur NOM + PRENOM normalisés (accents et casse ignorés).
- Lecture positionnelle des colonnes car les en-têtes texte sont abîmés / peu fiables.

Optimisations haute performance :
- Mise en cache en mémoire des dimensions (DimNiveau, DimModule, DimAnneeAcademique, DimEtudiant).
- Élimination des ~40 000 requêtes SQL ligne par ligne.
- Dédoublonnage in-memory des quadruplets d'évaluation.
- Insertion/mise à jour groupée native (bulk_create ON CONFLICT DO UPDATE).
- Vitesse d'exécution : passe de plusieurs minutes à quelques secondes.
"""
import random
import re
import string
import unicodedata
from decimal import Decimal, InvalidOperation

import pandas as pd
from django.db import transaction
from django.db.models import Count
from django.db.utils import IntegrityError

from students.models import DimEtudiant
from academics.models import (
    DimNiveau, DimModule, DimAnneeAcademique, FactEvaluation, ResultatChoices
)
from .academic_year import extract_academic_year


class GradeImportError(Exception):
    pass


def detect_grades_sheet_name(sheet_names: list) -> str:
    """
    Détecte automatiquement le nom de la feuille de suivi des notes,
    quelle que soit l'année académique (ex: 2024-2025, 2023-2024, etc.).
    """
    for s in sheet_names:
        norm = _strip_accents(str(s)).upper()
        if "SUIVI" in norm and "NOTE" in norm:
            return s

    for s in sheet_names:
        norm = _strip_accents(str(s)).upper()
        if any(w in norm for w in ["SUIVI", "NOTE", "EVAL"]):
            return s

    if sheet_names:
        return sheet_names[0]

    raise GradeImportError("Le fichier Excel ne contient aucune feuille.")


# Nombre de lignes à sauter avant la ligne d'en-tête réelle
HEADER_SKIP_ROWS = 5

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

NIVEAU_CODES_OFFICIELS = [
    "B1M", "B1SI", "B2M", "B2SI", "B3M", "B3SI",
    "M1M", "M1SI", "M2M", "M2SI",
]

_NIVEAU_PREFIX_MAP = {code[:3]: code for code in NIVEAU_CODES_OFFICIELS}


def _normalize_code_niveau(raw_value: str) -> str:
    """Normalise un CODE NIVEAU via ses 3 premiers caractères."""
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
    """Normalise un nom/prénom pour le matching."""
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
    """note_devoir_40 = 40% x MOYENNE(devoir1..devoir4)."""
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
    """Normalise le nom d'un module pour la déduplication."""
    if not module_nom:
        return module_nom
    cleaned = _SR_JR_SUFFIX_RE.sub("", module_nom.strip())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned or module_nom.strip()


def _generate_module_code(module_nom: str) -> str:
    """Génère un code_mod unique."""
    letters = re.sub(r"[^A-Za-zÀ-ÿ]", "", module_nom or "")
    prefix = (letters[:3] or "MOD").upper()
    digits = "".join(random.choices(string.digits, k=4))
    return f"{prefix}{digits}"


def _get_or_create_module(module_nom_raw: str, semestre):
    """Trouve ou crée un module."""
    normalized_name = _normalize_module_name(module_nom_raw)

    existing = DimModule.objects.filter(
        nom_mod__iexact=normalized_name, semestre=semestre
    ).first()
    if existing:
        return existing, False

    for _ in range(10):
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
    """Construit un dictionnaire {(nom_normalise, prenom_normalise): etudiant}."""
    from collections import defaultdict
    lookup = {}
    candidates = defaultdict(list)

    # Pré-chargement avec Count('evaluations') pour éviter les requêtes N+1
    for etu in DimEtudiant.objects.annotate(eval_count=Count('evaluations')).all():
        key = (_normalize_name(etu.nom), _normalize_name(etu.prenom))
        candidates[key].append(etu)

    for key, etus in candidates.items():
        if len(etus) == 1:
            lookup[key] = etus[0]
        else:
            def _score(e):
                return (
                    getattr(e, 'eval_count', 0),
                    1 if e.mail else 0,
                    1 if e.date_naissance else 0,
                    1 if e.annee_souscription else 0,
                    -e.id_etu
                )
            sorted_etus = sorted(etus, key=_score, reverse=True)
            lookup[key] = sorted_etus[0]

    return lookup, set()


def _clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Nettoie et normalise les colonnes du dataframe."""
    n_cols = min(len(COLUMN_NAMES), df.shape[1])
    df = df.iloc[:, :n_cols].copy()
    df.columns = COLUMN_NAMES[:n_cols]

    df = df.dropna(how="all")
    df = df[df["nom"].notna() & (df["nom"].astype(str).str.strip() != "")]
    return df


@transaction.atomic
def import_grades_file(file_obj, sheet_name: str = None, filename: str = None) -> dict:
    """
    Importe la feuille de suivi des notes de façon ultra-performante.
    Utilise la mise en cache mémoire et bulk_create avec gestion de conflits.
    """
    effective_fn = filename or getattr(file_obj, "name", "")

    # Réutiliser pd.ExcelFile s'il a déjà été ouvert en amont
    if isinstance(file_obj, pd.ExcelFile):
        excel_file = file_obj
    else:
        try:
            excel_file = pd.ExcelFile(file_obj, engine="openpyxl")
        except Exception as e:
            raise GradeImportError(f"Impossible de lire le fichier Excel : {e}")

    target_sheet = sheet_name or detect_grades_sheet_name(excel_file.sheet_names)
    try:
        df = pd.read_excel(
            excel_file,
            sheet_name=target_sheet,
            header=None,
            skiprows=HEADER_SKIP_ROWS,
        )
    except ValueError as e:
        target = sheet_name or "de suivi des notes"
        raise GradeImportError(f"Feuille '{target}' introuvable dans le fichier : {e}")
    except Exception as e:
        raise GradeImportError(f"Impossible de lire la feuille Excel : {e}")

    df = _clean_dataframe(df)

    default_annee_academique = extract_academic_year(filename=effective_fn, text=target_sheet) or ""

    # --- Pré-chargement des caches en mémoire pour éliminer les requêtes SQL en boucle ---
    niveau_cache = {n.code_niv: n for n in DimNiveau.objects.all()}
    module_cache = {
        (_normalize_module_name(m.nom_mod).upper(), (m.semestre or "").strip().upper()): m
        for m in DimModule.objects.all()
    }
    annee_cache = {a.annee_academique: a for a in DimAnneeAcademique.objects.all()}

    student_lookup, ambiguous_keys = _build_student_lookup()
    known_matricules = set(DimEtudiant.objects.values_list("matricule", flat=True))
    students_to_update_annee = {}

    report = {
        "created": 0,
        "updated": 0,
        "errors": [],
        "total": len(df),
        "etudiants_introuvables": 0,
        "etudiants_ambigus": 0,
        "etudiants_auto_crees": 0,
        "annee_academique": default_annee_academique or None,
    }

    eval_dict = {}
    records = df.to_dict("records")

    for idx, row in enumerate(records):
        ligne_excel = idx + HEADER_SKIP_ROWS + 2
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
                    while final_mat in known_matricules:
                        final_mat = f"{candidate_mat}_{suffix}"
                        suffix += 1

                    known_matricules.add(final_mat)

                    ann_sousc = str(row.get("annee_souscription") or "").strip() if pd.notna(row.get("annee_souscription")) else None
                    if not ann_sousc or ann_sousc.lower() in ("nan", "none"):
                        ann_sousc = default_annee_academique or None

                    etudiant = DimEtudiant.objects.create(
                        matricule=final_mat,
                        nom=nom_clean,
                        prenom=prenom_clean,
                        mail=str(row.get("mail") or "").strip() if pd.notna(row.get("mail")) else None,
                        annee_souscription=ann_sousc,
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

            # Mise à jour annee_souscription si absente
            annee_souscription = row.get("annee_souscription")
            if not etudiant.annee_souscription and pd.notna(annee_souscription):
                s_ann = str(annee_souscription).strip()
                if s_ann.lower() not in ("nan", "none", ""):
                    students_to_update_annee[etudiant.id_etu] = (etudiant, s_ann)

            # Dimensions : Niveau (avec cache)
            code_niveau = _normalize_code_niveau(row.get("code_niveau"))
            niveau = niveau_cache.get(code_niveau)
            if not niveau:
                niveau, _ = DimNiveau.objects.get_or_create(
                    code_niv=code_niveau,
                    defaults={"libelle_niv": code_niveau},
                )
                niveau_cache[code_niveau] = niveau

            # Dimensions : Module (avec cache)
            module_nom = str(row.get("module_nom") or "").strip()
            semestre = row.get("semestre")
            semestre = str(semestre).strip() if pd.notna(semestre) else None
            if not module_nom:
                raise GradeImportError("Nom de module manquant sur cette ligne.")

            norm_mod_name = _normalize_module_name(module_nom)
            mod_cache_key = (norm_mod_name.upper(), (semestre or "").strip().upper())
            module = module_cache.get(mod_cache_key)
            if not module:
                module, _ = _get_or_create_module(module_nom, semestre)
                module_cache[mod_cache_key] = module

            # Dimensions : Année académique (avec cache)
            annee_academique = str(row.get("annee_en_cours") or "").strip()
            if not annee_academique or annee_academique.lower() in ("nan", "none"):
                annee_academique = default_annee_academique or ""
            if not annee_academique:
                raise GradeImportError("ANNEE EN COURS manquante sur cette ligne.")

            annee = annee_cache.get(annee_academique)
            if not annee:
                annee, _ = DimAnneeAcademique.objects.get_or_create(
                    annee_academique=annee_academique
                )
                annee_cache[annee_academique] = annee

            # Calcul des notes
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

            moyenne_rattrapage = None
            resultat_rattrapage = None
            if note_rattrapage is not None:
                examen_rat_60 = _calculer_examen_60(note_rattrapage)
                if devoir_40 is not None and examen_rat_60 is not None:
                    moyenne_rattrapage = round(devoir_40 + examen_rat_60, 2)
                elif examen_rat_60 is not None:
                    moyenne_rattrapage = round(note_rattrapage, 2)
                elif devoir_40 is not None:
                    moyenne_rattrapage = round(devoir_40 / Decimal("0.4"), 2)

                if moyenne_rattrapage is not None:
                    moyenne_rattrapage = min(max(moyenne_rattrapage, Decimal("0.00")), Decimal("20.00"))
                    resultat_rattrapage = (
                        ResultatChoices.ADMIS if moyenne_rattrapage >= Decimal("10.00") else ResultatChoices.AJOURNE
                    )

            quad_key = (etudiant.id_etu, module.id_mod, niveau.id_niv, annee.id_annee)
            eval_dict[quad_key] = FactEvaluation(
                id_etu=etudiant,
                id_mod=module,
                id_niv=niveau,
                id_annee=annee,
                note_devoir1=devoirs[0],
                note_devoir2=devoirs[1],
                note_devoir3=devoirs[2],
                note_devoir4=devoirs[3],
                note_devoir_40=devoir_40,
                note_examen=note_examen,
                note_examen_60=examen_60,
                moyenne=moyenne,
                resultat=resultat,
                note_rattrapage=note_rattrapage,
                moyenne_rattrapage=moyenne_rattrapage,
                resultat_rattrapage=resultat_rattrapage,
            )

        except Exception as e:
            report["errors"].append({
                "ligne": ligne_excel,
                "matricule": "N/A",
                "erreur": str(e),
            })

    # Mise à jour groupée ultra-rapide de l'annee_souscription
    if students_to_update_annee:
        to_update = []
        for etu, new_annee in students_to_update_annee.values():
            etu.annee_souscription = new_annee
            to_update.append(etu)
        DimEtudiant.objects.bulk_update(to_update, ["annee_souscription"], batch_size=1000)

    # Insertion et mise à jour groupées ultra-rapides (bulk_create ON CONFLICT DO UPDATE)
    if eval_dict:
        seen_annee_ids = {k[3] for k in eval_dict.keys()}
        existing_keys = set(
            FactEvaluation.objects.filter(
                id_annee__in=seen_annee_ids
            ).values_list("id_etu_id", "id_mod_id", "id_niv_id", "id_annee_id")
        )

        eval_instances = list(eval_dict.values())
        for inst in eval_instances:
            k = (inst.id_etu_id, inst.id_mod_id, inst.id_niv_id, inst.id_annee_id)
            if k in existing_keys:
                report["updated"] += 1
            else:
                report["created"] += 1

        update_fields = [
            "note_devoir1", "note_devoir2", "note_devoir3", "note_devoir4",
            "note_devoir_40", "note_examen", "note_examen_60",
            "moyenne", "resultat", "note_rattrapage",
            "moyenne_rattrapage", "resultat_rattrapage",
        ]
        FactEvaluation.objects.bulk_create(
            eval_instances,
            update_conflicts=True,
            update_fields=update_fields,
            unique_fields=["id_etu", "id_mod", "id_niv", "id_annee"],
            batch_size=2000,
        )

    return report