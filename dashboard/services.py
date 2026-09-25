"""Services d'agrégation pour le dashboard analytique."""
from django.db.models import Avg, Count, Q
from academics.models import FactEvaluation, ResultatChoices


def _apply_filters(queryset, filters: dict):
    """Applique les filtres optionnels niveau / module / année sur le queryset."""
    if filters.get('id_niv'):
        queryset = queryset.filter(id_niv=filters['id_niv'])
    if filters.get('id_mod'):
        queryset = queryset.filter(id_mod=filters['id_mod'])
    if filters.get('id_annee'):
        queryset = queryset.filter(id_annee=filters['id_annee'])
    return queryset


def get_kpi_summary(filters: dict) -> dict:
    """
    KPIs globaux affichés en haut du dashboard :
    - effectif_total_evalue : nombre d'étudiants DISTINCTS ayant au moins
      une évaluation enregistrée
    - taux_reussite : % d'évaluations avec resultat = Admis (moyenne >= 10)
    - moyenne_generale : moyenne de toutes les évaluations confondues
    - taux_passage_rattrapage : % d'évaluations ayant une note de
      rattrapage renseignée (note_rattrapage non nulle)
    """
    qs = _apply_filters(FactEvaluation.objects.all(), filters)

    total = qs.count()
    admis = qs.filter(resultat=ResultatChoices.ADMIS).count()
    en_rattrapage = qs.filter(note_rattrapage__isnull=False).count()
    effectif_total_evalue = qs.values('id_etu').distinct().count()
    moyenne_generale = qs.aggregate(avg=Avg('moyenne'))['avg']

    taux_reussite = round((admis / total) * 100, 2) if total > 0 else 0
    taux_passage_rattrapage = round((en_rattrapage / total) * 100, 2) if total > 0 else 0

    return {
        'effectif_total_evalue': effectif_total_evalue,
        'taux_reussite': taux_reussite,
        'moyenne_generale': round(moyenne_generale, 2) if moyenne_generale is not None else None,
        'taux_passage_rattrapage': taux_passage_rattrapage,
    }


def get_repartition_par_niveau(filters: dict) -> list:
    """Moyenne et taux de réussite groupés par niveau (pour graphique en barres)."""
    qs = _apply_filters(FactEvaluation.objects.all(), filters)
    data = (
        qs.values('id_niv__code_niv')
        .annotate(
            moyenne=Avg('moyenne'),
            total=Count('id_eval'),
            admis=Count('id_eval', filter=Q(resultat=ResultatChoices.ADMIS)),
        )
        .order_by('id_niv__code_niv')
    )
    result = []
    for row in data:
        taux = round((row['admis'] / row['total']) * 100, 2) if row['total'] > 0 else 0
        result.append({
            'niveau': row['id_niv__code_niv'],
            'moyenne': round(row['moyenne'], 2) if row['moyenne'] is not None else None,
            'taux_reussite': taux,
            'effectif': row['total'],
        })
    return result


def get_repartition_par_module(filters: dict) -> list:
    """Moyenne et taux de réussite groupés par module."""
    qs = _apply_filters(FactEvaluation.objects.all(), filters)
    data = (
        qs.values('id_mod__code_mod', 'id_mod__nom_mod')
        .annotate(
            moyenne=Avg('moyenne'),
            total=Count('id_eval'),
            admis=Count('id_eval', filter=Q(resultat=ResultatChoices.ADMIS)),
        )
        .order_by('id_mod__code_mod')
    )
    result = []
    for row in data:
        taux = round((row['admis'] / row['total']) * 100, 2) if row['total'] > 0 else 0
        result.append({
            'module': row['id_mod__code_mod'],
            'nom_module': row['id_mod__nom_mod'],
            'moyenne': round(row['moyenne'], 2) if row['moyenne'] is not None else None,
            'taux_reussite': taux,
            'effectif': row['total'],
        })
    return result


def get_evolution_par_annee(filters: dict) -> list:
    """Évolution de la moyenne générale et du taux de réussite par année académique."""
    qs = _apply_filters(FactEvaluation.objects.all(), filters)
    data = (
        qs.values('id_annee__annee_academique')
        .annotate(
            moyenne=Avg('moyenne'),
            total=Count('id_eval'),
            admis=Count('id_eval', filter=Q(resultat=ResultatChoices.ADMIS)),
        )
        .order_by('id_annee__annee_academique')
    )
    result = []
    for row in data:
        taux = round((row['admis'] / row['total']) * 100, 2) if row['total'] > 0 else 0
        result.append({
            'annee': row['id_annee__annee_academique'],
            'moyenne': round(row['moyenne'], 2) if row['moyenne'] is not None else None,
            'taux_reussite': taux,
            'effectif': row['total'],
        })
    return result


def get_top_modules(filters: dict, limit: int = 5) -> list:
    """
    Top N des couples (module, niveau) ayant la meilleure moyenne, pour
    la liste "Top 5 modules" du dashboard. On regroupe par module ET
    niveau (et non juste par module) car un même module peut être suivi
    par plusieurs niveaux différents avec des résultats très différents —
    afficher une seule moyenne "toutes promotions confondues" serait
    trompeur.
    """
    qs = _apply_filters(FactEvaluation.objects.all(), filters)
    data = (
        qs.exclude(moyenne__isnull=True)
        .exclude(id_niv__code_niv='NAN')
        .values('id_mod__nom_mod', 'id_niv__code_niv')
        .annotate(moyenne=Avg('moyenne'), effectif=Count('id_eval'))
        .order_by('-moyenne')[:limit]
    )
    return [
        {
            'module': row['id_mod__nom_mod'],
            'niveau': row['id_niv__code_niv'],
            'moyenne': round(row['moyenne'], 2) if row['moyenne'] is not None else None,
            'effectif': row['effectif'],
        }
        for row in data
    ]


def get_distribution_notes(filters: dict) -> list:
    """Répartition des étudiants par tranche de notes (pour histogramme)."""
    qs = _apply_filters(FactEvaluation.objects.all(), filters)
    tranches = [
        ('0-5', 0, 5), ('5-8', 5, 8), ('8-10', 8, 10),
        ('10-12', 10, 12), ('12-14', 12, 14), ('14-16', 14, 16), ('16-20', 16, 20.01),
    ]
    result = []
    for label, borne_min, borne_max in tranches:
        count = qs.filter(moyenne__gte=borne_min, moyenne__lt=borne_max).count()
        result.append({'tranche': label, 'effectif': count})
    return result


# ---------------------------------------------------------------------------
# Dashboard individuel d'un étudiant (fiche étudiant)
# ---------------------------------------------------------------------------

def get_student_kpi(id_etu) -> dict:
    """KPIs propres à UN étudiant : nb de modules évalués, sa moyenne
    générale sur l'ensemble de son parcours, son taux de réussite
    personnel, et le nombre de fois où il est passé en rattrapage."""
    qs = FactEvaluation.objects.filter(id_etu=id_etu)

    total_modules = qs.count()
    admis = qs.filter(resultat=ResultatChoices.ADMIS).count()
    en_rattrapage = qs.filter(note_rattrapage__isnull=False).count()
    moyenne_generale = qs.aggregate(avg=Avg('moyenne'))['avg']

    taux_reussite = round((admis / total_modules) * 100, 2) if total_modules > 0 else 0

    return {
        'total_modules_evalues': total_modules,
        'moyenne_generale': round(moyenne_generale, 2) if moyenne_generale is not None else None,
        'taux_reussite': taux_reussite,
        'nombre_rattrapages': en_rattrapage,
    }


def get_student_evolution(id_etu) -> list:
    """Évolution de la moyenne de l'étudiant par année académique."""
    qs = FactEvaluation.objects.filter(id_etu=id_etu)
    data = (
        qs.values('id_annee__annee_academique')
        .annotate(
            moyenne=Avg('moyenne'),
            total=Count('id_eval'),
            admis=Count('id_eval', filter=Q(resultat=ResultatChoices.ADMIS)),
        )
        .order_by('id_annee__annee_academique')
    )
    result = []
    for row in data:
        taux = round((row['admis'] / row['total']) * 100, 2) if row['total'] > 0 else 0
        result.append({
            'annee': row['id_annee__annee_academique'],
            'moyenne': round(row['moyenne'], 2) if row['moyenne'] is not None else None,
            'taux_reussite': taux,
        })
    return result


def get_student_modules_detail(id_etu) -> list:
    """Détail de toutes les évaluations de l'étudiant, module par module
    (pour le tableau du relevé de notes dans la fiche étudiant)."""
    qs = (
        FactEvaluation.objects.filter(id_etu=id_etu)
        .select_related('id_mod', 'id_niv', 'id_annee')
        .order_by('id_annee__annee_academique', 'id_mod__nom_mod')
    )
    result = []
    for ev in qs:
        result.append({
            'module': ev.id_mod.nom_mod,
            'semestre': ev.id_mod.semestre,
            'niveau': ev.id_niv.code_niv,
            'annee': ev.id_annee.annee_academique,
            'note_devoir_40': ev.note_devoir_40,
            'note_examen_60': ev.note_examen_60,
            'moyenne': ev.moyenne,
            'resultat': ev.resultat,
            'note_rattrapage': ev.note_rattrapage,
            'resultat_rattrapage': ev.resultat_rattrapage,
        })
    return result