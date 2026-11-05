"""Services d'agrégation pour le dashboard analytique."""
from django.db.models import Avg, Count, Q
from django.db.models.functions import Coalesce
from academics.models import FactEvaluation, ResultatChoices


def _apply_filters(queryset, filters: dict):
    """Applique les filtres optionnels niveau / module / année / filiere / semestre / resultat."""
    if not filters:
        return queryset
    if filters.get('id_niv'):
        queryset = queryset.filter(id_niv=filters['id_niv'])
    if filters.get('id_mod'):
        queryset = queryset.filter(id_mod=filters['id_mod'])
    if filters.get('id_annee'):
        queryset = queryset.filter(id_annee=filters['id_annee'])
    if filters.get('filiere'):
        f = str(filters['filiere']).strip().lower()
        if f in ['management', 'm']:
            queryset = queryset.filter(id_niv__code_niv__in=['B1M', 'B2M', 'B3M', 'M1M', 'M2M'])
        elif f in ['si', 'systeme_information', 'système d\'information', 'système information']:
            queryset = queryset.filter(id_niv__code_niv__in=['B1SI', 'B2SI', 'B3SI', 'M1SI', 'M2SI'])
    if filters.get('semestre'):
        sem = str(filters['semestre']).strip()
        sem_num = sem.upper().replace('SEMESTRE', '').replace('S', '').strip()
        sem_variants = [sem, sem_num, f"S{sem_num}", f"Semestre {sem_num}"]
        queryset = queryset.filter(id_mod__semestre__in=sem_variants)
    if filters.get('resultat'):
        queryset = queryset.filter(resultat=filters['resultat'])
    return queryset


def get_kpi_summary(filters: dict) -> dict:
    """
    KPIs globaux affichés en haut du dashboard :
    - effectif_total_evalue : nombre d'étudiants DISTINCTS ayant au moins une évaluation enregistrée
    - total_modules : nombre total de modules concernés
    - moyenne_generale : moyenne de toutes les évaluations confondues
    - modules_a_risque : nombre de modules avec une moyenne sous 10/20
    - taux_reussite : % d'évaluations avec resultat = Admis
    - taux_echec : % d'évaluations avec resultat = Ajourné
    - total_rattrapage : nombre d'évaluations passées en rattrapage
    - taux_passage_rattrapage : % d'évaluations avec note de rattrapage
    """
    qs = _apply_filters(FactEvaluation.objects.all(), filters)

    total = qs.count()
    admis = qs.filter(resultat=ResultatChoices.ADMIS).count()
    ajourne = qs.filter(resultat=ResultatChoices.AJOURNE).count()
    en_rattrapage = qs.filter(note_rattrapage__isnull=False).count()
    effectif_total_evalue = qs.values('id_etu').distinct().count()
    total_modules = qs.values('id_mod').distinct().count()
    moyenne_generale = qs.aggregate(avg=Avg('moyenne'))['avg']

    # Modules avec moyenne générale < 10
    mod_stats = qs.values('id_mod').annotate(avg=Avg('moyenne'))
    modules_a_risque = sum(1 for m in mod_stats if m['avg'] is not None and m['avg'] < 10)

    taux_reussite = round((admis / total) * 100, 2) if total > 0 else 0
    taux_echec = round((ajourne / total) * 100, 2) if total > 0 else 0
    taux_passage_rattrapage = round((en_rattrapage / total) * 100, 2) if total > 0 else 0

    return {
        'effectif_total_evalue': effectif_total_evalue,
        'total_modules': total_modules,
        'moyenne_generale': max(0.0, min(20.0, round(float(moyenne_generale), 2))) if moyenne_generale is not None else None,
        'modules_a_risque': modules_a_risque,
        'taux_reussite': taux_reussite,
        'taux_echec': taux_echec,
        'total_rattrapage': en_rattrapage,
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
        moy = max(0.0, min(20.0, round(float(row['moyenne']), 2))) if row['moyenne'] is not None else None
        result.append({
            'niveau': row['id_niv__code_niv'],
            'moyenne': moy,
            'taux_reussite': taux,
            'effectif': row['total'],
        })
    return result


def get_devoir_vs_examen(filters: dict) -> list:
    """
    Compare la moyenne des devoirs (CC ramené sur 20) vs examen final (sur 20)
    pour chaque niveau académique officiel.
    """
    qs = _apply_filters(FactEvaluation.objects.all(), filters)
    qs = qs.filter(id_niv__code_niv__in=NIVEAUX_OFFICIELS)
    data = (
        qs.values('id_niv__code_niv')
        .annotate(
            avg_devoir_40=Avg('note_devoir_40'),
            avg_examen=Avg('note_examen'),
            avg_moyenne=Avg('moyenne'),
            total=Count('id_eval'),
        )
        .order_by('id_niv__code_niv')
    )
    result = []
    for row in data:
        moy_devoir = max(0.0, min(20.0, round(float(row['avg_devoir_40']) / 0.4, 2))) if row['avg_devoir_40'] is not None else None
        moy_examen = max(0.0, min(20.0, round(float(row['avg_examen']), 2))) if row['avg_examen'] is not None else None
        moy_gen = max(0.0, min(20.0, round(float(row['avg_moyenne']), 2))) if row['avg_moyenne'] is not None else None
        result.append({
            'niveau': row['id_niv__code_niv'],
            'devoir': moy_devoir,
            'examen': moy_examen,
            'moyenne': moy_gen,
            'effectif': row['total'],
        })
    return result


def get_evolution_par_annee(filters: dict) -> list:
    """
    Évolution comparant les moyennes générales des années académiques (sur 20).
    Exclut les valeurs 'nan' et fournit la progression réelle sur les cohortes.
    """
    # Note: On compare les années académiques entre elles même si un filtre d'année est actif
    filters_no_annee = {k: v for k, v in filters.items() if k != 'id_annee'}
    qs = _apply_filters(FactEvaluation.objects.all(), filters_no_annee)

    data = (
        qs.exclude(id_annee__annee_academique__in=['nan', 'None', '', None])
        .exclude(id_annee__annee_academique__isnull=True)
        .values('id_annee__annee_academique')
        .annotate(
            moyenne=Avg('moyenne'),
            total=Count('id_eval'),
            admis=Count('id_eval', filter=Q(resultat=ResultatChoices.ADMIS)),
        )
        .filter(moyenne__isnull=False, total__gte=50)
        .order_by('id_annee__annee_academique')
    )

    result = []
    for row in data:
        annee = row['id_annee__annee_academique']
        moy = row['moyenne']
        tot = row['total']
        adm = row['admis']
        if moy is not None and tot > 0:
            moy_val = max(0.0, min(20.0, round(float(moy), 2)))
            taux = round((adm / tot) * 100, 1)
            result.append({
                'annee': annee,
                'moyenne': moy_val,
                'taux_reussite': taux,
                'total': tot,
            })

    return result


NIVEAUX_OFFICIELS = [
    'B1M', 'B1SI', 'B2M', 'B2SI', 'B3M', 'B3SI',
    'M1M', 'M1SI', 'M2M', 'M2SI',
]


def get_comparaison_filieres(filters: dict) -> list:
    """
    Données de comparaison des moyennes entre les deux filières :
    - Management (codes niveau finissant par 'M' hors 'SI' : B1M, B2M, B3M, M1M, M2M)
    - Système d'Information (codes niveau finissant par 'SI' : B1SI, B2SI, B3SI, M1SI, M2SI)

    Renvoie un premier groupe 'Global' (moyenne générale de chaque filière),
    puis un groupe par cycle / palier (B1, B2, B3, M1, M2) pour un Clustered Bar Chart.
    """
    # On ignore le filtre filiere ici pour toujours pouvoir comparer les deux filières côte à côte
    comp_filters = {k: v for k, v in (filters or {}).items() if k != 'filiere'}
    qs = _apply_filters(FactEvaluation.objects.all(), comp_filters)
    qs = qs.exclude(moyenne__isnull=True).exclude(id_niv__code_niv='NAN')

    def _round(value):
        if value is None:
            return None
        return max(0.0, min(20.0, round(float(value), 2)))

    # --- Moyennes Globales ---
    qs_mgt = qs.filter(Q(id_niv__code_niv__in=['B1M', 'B2M', 'B3M', 'M1M', 'M2M']) | Q(id_niv__code_niv__endswith='M')).exclude(id_niv__code_niv__endswith='SI')
    qs_si = qs.filter(Q(id_niv__code_niv__in=['B1SI', 'B2SI', 'B3SI', 'M1SI', 'M2SI']) | Q(id_niv__code_niv__endswith='SI'))

    global_mgt = qs_mgt.aggregate(avg=Avg('moyenne'))['avg']
    global_si = qs_si.aggregate(avg=Avg('moyenne'))['avg']

    result = [{
        'groupe': 'Global',
        'palier': 'Global',
        'management': _round(global_mgt),
        'systeme_information': _round(global_si),
    }]

    # --- Moyennes par cycle d'études (B1, B2, B3, M1, M2) ---
    par_niveau = {
        row['id_niv__code_niv']: row['moyenne']
        for row in qs.values('id_niv__code_niv').annotate(moyenne=Avg('moyenne'))
    }

    for prefix in ['B1', 'B2', 'B3', 'M1', 'M2']:
        result.append({
            'groupe': prefix,
            'palier': prefix,
            'management': _round(par_niveau.get(f'{prefix}M')),
            'systeme_information': _round(par_niveau.get(f'{prefix}SI')),
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
        .values('id_mod', 'id_mod__nom_mod', 'id_niv__code_niv')
        .annotate(moyenne=Avg('moyenne'), effectif=Count('id_eval'))
        .order_by('-moyenne')[:limit]
    )
    return [
        {
            'id_mod': row['id_mod'],
            'module': row['id_mod__nom_mod'],
            'niveau': row['id_niv__code_niv'],
            'moyenne': max(0.0, min(20.0, round(float(row['moyenne']), 2))) if row['moyenne'] is not None else None,
            'effectif': row['effectif'],
        }
        for row in data
    ]


def get_distribution_notes(filters: dict) -> list:
    """
    Répartition des notes par tranche (histogramme conforme à la maquette).
    Tranches : <5, 5-8, 8-10, 10-12, 12-14, 14-16, 16-18, 18-20.
    """
    qs = _apply_filters(FactEvaluation.objects.all(), filters)
    tranches = [
        ('<5', 0, 5),
        ('5-8', 5, 8),
        ('8-10', 8, 10),
        ('10-12', 10, 12),
        ('12-14', 12, 14),
        ('14-16', 14, 16),
        ('16-18', 16, 18),
        ('18-20', 18, 20.01),
    ]
    result = []
    for label, borne_min, borne_max in tranches:
        count = qs.filter(moyenne__gte=borne_min, moyenne__lt=borne_max).count()
        result.append({
            'tranche': label,
            'effectif': count,
            'isBelow10': borne_min < 10,
        })
    return result


def get_points_cles(filters: dict) -> list:
    """
    Points clés détectés & conseils pour améliorer la performance (exactement 3 points).
    Générés dynamiquement à partir des recommandations prioritaires réelles.
    """
    try:
        from .recommendations import get_points_cles as compute_points_cles
        return compute_points_cles(filters=filters)
    except Exception:
        return [
            {
                'id': '01',
                'titre': 'Performance académique',
                'description': "Diagnostic académique en cours de consolidation.",
                'badgeType': 'neutral',
                'action': 'surveillance',
            }
        ]


def get_student_kpi(id_etu, filters: dict = None) -> dict:
    """KPIs propres à UN étudiant : nb de modules évalués, sa moyenne
    générale sur la période sélectionnée (tenant compte de la note retenue après rattrapage),
    son taux de réussite personnel, et le nombre de modules passés en rattrapage."""
    qs = FactEvaluation.objects.filter(id_etu=id_etu)
    if filters:
        qs = _apply_filters(qs, filters)

    total_modules = qs.count()
    # Admis en session normale OU validé au rattrapage (>= 10)
    admis = qs.filter(
        Q(resultat=ResultatChoices.ADMIS) |
        Q(resultat_rattrapage=ResultatChoices.ADMIS) |
        Q(moyenne_rattrapage__gte=10)
    ).count()
    en_rattrapage = qs.filter(note_rattrapage__isnull=False).count()

    # Moyenne générale calculée avec la note retenue (note après rattrapage si présente)
    evals = list(qs)
    notes = []
    for ev in evals:
        if ev.moyenne_rattrapage is not None:
            notes.append(float(ev.moyenne_rattrapage))
        elif ev.moyenne is not None:
            notes.append(float(ev.moyenne))

    moyenne_generale = (sum(notes) / len(notes)) if notes else None
    taux_reussite = round((admis / total_modules) * 100, 2) if total_modules > 0 else 0

    return {
        'total_modules_evalues': total_modules,
        'moyenne_generale': max(0.0, min(20.0, round(float(moyenne_generale), 2))) if moyenne_generale is not None else None,
        'taux_reussite': taux_reussite,
        'nombre_rattrapages': en_rattrapage,
    }


def get_student_evolution(id_etu) -> list:
    """Évolution de la moyenne de l'étudiant par année académique."""
    qs = FactEvaluation.objects.filter(id_etu=id_etu)
    data = (
        qs.values('id_annee__annee_academique')
        .annotate(
            moyenne=Avg(Coalesce('moyenne_rattrapage', 'moyenne')),
            total=Count('id_eval'),
            admis=Count(
                'id_eval',
                filter=Q(resultat=ResultatChoices.ADMIS) |
                Q(resultat_rattrapage=ResultatChoices.ADMIS) |
                Q(moyenne_rattrapage__gte=10)
            ),
        )
        .order_by('id_annee__annee_academique')
    )
    result = []
    for row in data:
        taux = round((row['admis'] / row['total']) * 100, 2) if row['total'] > 0 else 0
        moy = max(0.0, min(20.0, round(float(row['moyenne']), 2))) if row['moyenne'] is not None else None
        result.append({
            'annee': row['id_annee__annee_academique'],
            'moyenne': moy,
            'taux_reussite': taux,
        })
    return result


def get_student_modules_detail(id_etu, filters: dict = None) -> list:
    """Détail de toutes les évaluations de l'étudiant, module par module
    (pour le tableau du relevé de notes dans la fiche étudiant)."""
    qs = (
        FactEvaluation.objects.filter(id_etu=id_etu)
        .select_related('id_mod', 'id_niv', 'id_annee')
        .order_by('id_annee__annee_academique', 'id_mod__semestre', 'id_mod__nom_mod')
    )
    if filters:
        qs = _apply_filters(qs, filters)

    result = []
    for ev in qs:
        # Note devoir brute (/20)
        devoirs = [n for n in [ev.note_devoir1, ev.note_devoir2, ev.note_devoir3, ev.note_devoir4] if n is not None]
        if devoirs:
            note_devoir = round(float(sum(devoirs) / len(devoirs)), 2)
        elif ev.note_devoir_40 is not None:
            note_devoir = round(float(ev.note_devoir_40) / 0.4, 2)
        else:
            note_devoir = None

        # Note examen brute (/20)
        if ev.note_examen is not None:
            note_examen = round(float(ev.note_examen), 2)
        elif ev.note_examen_60 is not None:
            note_examen = round(float(ev.note_examen_60) / 0.6, 2)
        else:
            note_examen = None

        result.append({
            'module': ev.id_mod.nom_mod if ev.id_mod else '',
            'code_mod': ev.id_mod.code_mod if ev.id_mod else '',
            'semestre': ev.id_mod.semestre if ev.id_mod else '',
            'niveau': ev.id_niv.code_niv if ev.id_niv else '',
            'id_annee': ev.id_annee_id,
            'annee': ev.id_annee.annee_academique if ev.id_annee else '',
            'note_devoir': note_devoir,
            'note_examen': note_examen,
            'note_devoir_40': ev.note_devoir_40,
            'note_examen_60': ev.note_examen_60,
            'moyenne': ev.moyenne,
            'resultat': ev.resultat,
            'note_rattrapage': ev.note_rattrapage,
            'moyenne_rattrapage': ev.moyenne_rattrapage,
            'resultat_rattrapage': ev.resultat_rattrapage,
        })
    return result


def get_student_annees(id_etu) -> list:
    """Liste des années académiques distinctes pour cet étudiant."""
    annees = list(
        FactEvaluation.objects.filter(id_etu=id_etu)
        .exclude(id_annee__annee_academique__in=['nan', 'None', '', None])
        .values('id_annee', 'id_annee__annee_academique')
        .distinct()
        .order_by('-id_annee__annee_academique')
    )
    if not annees:
        from students.models import DimEtudiant
        from academics.models import DimAnneeAcademique
        etu = DimEtudiant.objects.filter(pk=id_etu).first()
        if etu and etu.annee_souscription:
            a_obj = DimAnneeAcademique.objects.filter(annee_academique=etu.annee_souscription).first()
            if a_obj:
                return [{'id_annee': a_obj.id_annee, 'id_annee__annee_academique': a_obj.annee_academique}]
    return annees


def get_student_semestres(id_etu) -> list:
    """Liste des semestres distincts pour cet étudiant."""
    return list(
        FactEvaluation.objects.filter(id_etu=id_etu)
        .exclude(id_mod__semestre__isnull=True)
        .values_list('id_mod__semestre', flat=True)
        .distinct()
        .order_by('id_mod__semestre')
    )


def get_analyse_niveaux(filters: dict) -> list:
    """
    Vue détaillée pour la page 'Analyse des niveaux' :
    Tableau complet avec Niveau, Étudiants, Moyenne générale,
    Taux de réussite, Taux d'échec, Rattrapages, et Niveau de risque.
    """
    qs = _apply_filters(FactEvaluation.objects.all(), filters)
    qs = qs.exclude(id_niv__code_niv__isnull=True).exclude(id_niv__code_niv='NAN')
    data = (
        qs.values('id_niv', 'id_niv__code_niv')
        .annotate(
            avg_moyenne=Avg('moyenne'),
            total=Count('id_eval'),
            admis=Count('id_eval', filter=Q(resultat=ResultatChoices.ADMIS)),
            etudiants=Count('id_etu', distinct=True),
            rattrapages=Count('id_eval', filter=Q(note_rattrapage__isnull=False) | Q(moyenne__lt=10)),
        )
        .order_by('-avg_moyenne')
    )
    result = []
    for row in data:
        tot = row['total']
        adm = row['admis']
        taux_reussite = round((adm / tot) * 100, 1) if tot > 0 else 0.0
        taux_echec = round(100.0 - taux_reussite, 1)
        if taux_reussite >= 72.0:
            risque = 'Faible'
        elif taux_reussite >= 65.0:
            risque = 'Moyen'
        elif taux_reussite >= 55.0:
            risque = 'Élevé'
        else:
            risque = 'Critique'

        result.append({
            'id_niv': row['id_niv'],
            'niveau': row['id_niv__code_niv'],
            'etudiants': row['etudiants'],
            'moyenne': max(0.0, min(20.0, round(float(row['avg_moyenne']), 2))) if row['avg_moyenne'] is not None else None,
            'taux_reussite': taux_reussite,
            'taux_echec': taux_echec,
            'rattrapages': row['rattrapages'],
            'risque': risque,
        })
    return result


def get_analyse_modules(filters: dict) -> dict:
    """
    Vue détaillée pour la page 'Analyse des modules' :
    - top_modules : les modules les plus performants (moyenne haute, taux réussite élevé)
    - attention_modules : modules nécessitant une attention (taux échec élevé, moyenne faible)
    """
    qs = _apply_filters(FactEvaluation.objects.all(), filters)
    qs = qs.exclude(id_mod__nom_mod__isnull=True).exclude(id_mod__nom_mod='NAN').exclude(moyenne__isnull=True)
    data = (
        qs.values('id_mod', 'id_mod__nom_mod')
        .annotate(
            avg_moyenne=Avg('moyenne'),
            total=Count('id_eval'),
            admis=Count('id_eval', filter=Q(resultat=ResultatChoices.ADMIS)),
            etudiants=Count('id_etu', distinct=True),
        )
    )

    modules_stats = []
    for row in data:
        if row['total'] < 3:
            continue
        tot = row['total']
        adm = row['admis']
        taux_reussite = round((adm / tot) * 100) if tot > 0 else 0
        taux_echec = 100 - taux_reussite
        moy = max(0.0, min(20.0, round(float(row['avg_moyenne']), 1)))
        risque = 'Élevé' if taux_echec >= 55 or moy < 9.0 else ('Moyen' if taux_echec >= 40 or moy < 11.0 else 'Faible')

        modules_stats.append({
            'id_mod': row['id_mod'],
            'module': row['id_mod__nom_mod'],
            'moyenne': moy,
            'taux_reussite': taux_reussite,
            'taux_echec': taux_echec,
            'etudiants': row['etudiants'],
            'risque': risque,
        })

    sorted_top = sorted(modules_stats, key=lambda x: (x['moyenne'], x['taux_reussite']), reverse=True)
    sorted_attention = sorted(modules_stats, key=lambda x: (x['moyenne'], -x['taux_echec']))

    return {
        'top_modules': sorted_top,
        'attention_modules': sorted_attention,
    }


def get_analyse_etudiants(filters: dict, search: str = None) -> list:
    """
    Liste des étudiants pour la page 'Étudiants' avec les indicateurs calculés :
    nom, prénom, initiales, matricule, niveau, moyenne, modules validés, en difficulté, rattrapage, statut.
    """
    qs = _apply_filters(FactEvaluation.objects.all(), filters)
    qs = qs.exclude(id_etu__isnull=True).exclude(id_niv__code_niv='NAN')

    if search:
        s = search.strip()
        qs = qs.filter(
            Q(id_etu__nom__icontains=s) |
            Q(id_etu__prenom__icontains=s) |
            Q(id_etu__matricule__icontains=s)
        )

    data = (
        qs.values('id_etu', 'id_etu__matricule', 'id_etu__nom', 'id_etu__prenom', 'id_niv__code_niv')
        .annotate(
            avg_moyenne=Avg(Coalesce('moyenne_rattrapage', 'moyenne')),
            total=Count('id_eval'),
            modules_valides=Count(
                'id_eval',
                filter=Q(moyenne__gte=10) | Q(moyenne_rattrapage__gte=10) | Q(resultat_rattrapage=ResultatChoices.ADMIS)
            ),
            en_difficulte=Count(
                'id_eval',
                filter=Q(moyenne__lt=10) & (Q(moyenne_rattrapage__isnull=True) | Q(moyenne_rattrapage__lt=10))
            ),
            rattrapages=Count('id_eval', filter=Q(note_rattrapage__isnull=False)),
        )
        .order_by('id_etu__nom', 'id_etu__prenom')
    )

    result = []
    seen_students = set()
    for row in data:
        id_etu = row['id_etu']
        if id_etu in seen_students:
            continue
        seen_students.add(id_etu)

        nom = (row['id_etu__nom'] or '').strip()
        prenom = (row['id_etu__prenom'] or '').strip()
        nom_complet = f"{nom.upper()} {prenom.title()}".strip()
        ini1 = nom[0].upper() if nom else 'E'
        ini2 = prenom[0].upper() if prenom else ''
        initiales = f"{ini1}{ini2}"

        moy = max(0.0, min(20.0, round(float(row['avg_moyenne']), 1))) if row['avg_moyenne'] is not None else 0.0
        en_diff = row['en_difficulte']
        has_rattrapage = row['rattrapages'] > 0
        statut = 'Admis' if moy >= 10.0 else 'Refusé'

        result.append({
            'id_etu': id_etu,
            'matricule': row['id_etu__matricule'],
            'nom': nom,
            'prenom': prenom,
            'nom_complet': nom_complet,
            'initiales': initiales,
            'niveau': row['id_niv__code_niv'],
            'moyenne': moy,
            'modules_valides': row['modules_valides'],
            'en_difficulte': en_diff,
            'rattrapage': 'Oui' if has_rattrapage else 'Non',
            'statut': statut,
        })

    # Inclusion des étudiants enregistrés dans dim_etudiant (ex: après import Master Étudiants)
    # sans évaluations dans fact_evaluation pour l'année filtrée (ou sans filtre spécifique de niveau/module)
    has_specific_academic_filter = bool(
        filters.get('id_mod') or filters.get('id_niv') or filters.get('filiere') or filters.get('semestre')
    )
    if not has_specific_academic_filter:
        from students.models import DimEtudiant
        from academics.models import DimAnneeAcademique

        etudiants_qs = DimEtudiant.objects.exclude(id_etu__in=seen_students)
        if filters.get('id_annee'):
            annee_obj = DimAnneeAcademique.objects.filter(id_annee=filters['id_annee']).first()
            if annee_obj:
                etudiants_qs = etudiants_qs.filter(annee_souscription=annee_obj.annee_academique)

        if search:
            s = search.strip()
            etudiants_qs = etudiants_qs.filter(
                Q(nom__icontains=s) |
                Q(prenom__icontains=s) |
                Q(matricule__icontains=s)
            )

        for etu in etudiants_qs.order_by('nom', 'prenom'):
            nom = (etu.nom or '').strip()
            prenom = (etu.prenom or '').strip()
            nom_complet = f"{nom.upper()} {prenom.title()}".strip()
            ini1 = nom[0].upper() if nom else 'E'
            ini2 = prenom[0].upper() if prenom else ''
            initiales = f"{ini1}{ini2}"

            result.append({
                'id_etu': etu.id_etu,
                'matricule': etu.matricule,
                'nom': nom,
                'prenom': prenom,
                'nom_complet': nom_complet,
                'initiales': initiales,
                'niveau': '—',
                'moyenne': None,
                'modules_valides': 0,
                'en_difficulte': 0,
                'rattrapage': 'Non',
                'statut': 'Inscrit',
            })

    return result


def get_analyse_rattrapages(filters: dict) -> dict:
    """
    Données complètes pour la page 'Analyse des rattrapages' :
    - kpis : Étudiants concernés, Modules concernés, Taux de réussite, Taux d'échec
    - synthese : Moyenne avant, Gain moyen, Moyenne après
    - par_niveau : Répartition comparée Avant / Après par niveau
    - etudiants : Tableau détaillé des évaluations passées en rattrapage (données réelles)
    """
    qs = _apply_filters(FactEvaluation.objects.all(), filters)
    qs_rat = qs.filter(note_rattrapage__isnull=False)

    total_evals = qs_rat.count()
    if total_evals > 0:
        etudiants_concernes = qs_rat.values('id_etu').distinct().count()
        modules_concernes = qs_rat.values('id_mod').distinct().count()

        admis_count = qs_rat.filter(
            Q(resultat_rattrapage=ResultatChoices.ADMIS) | Q(moyenne_rattrapage__gte=10)
        ).count()
        taux_reussite = round((admis_count / total_evals) * 100, 1)
        taux_echec = round(100.0 - taux_reussite, 1)

        avg_before = qs_rat.aggregate(avg=Avg('moyenne'))['avg']
        avg_after = qs_rat.aggregate(avg=Avg('moyenne_rattrapage'))['avg']
        moyenne_avant = round(float(avg_before), 1) if avg_before is not None else 0.0
        moyenne_apres = round(float(avg_after), 1) if avg_after is not None else 0.0
        gain_moyen = round(moyenne_apres - moyenne_avant, 1)

        # Graphique Avant / Après par niveau (réel)
        niveau_stats = (
            qs_rat.exclude(id_niv__code_niv__in=['NAN', '', None])
            .exclude(id_niv__code_niv__isnull=True)
            .values('id_niv__code_niv')
            .annotate(
                avg_before=Avg('moyenne'),
                avg_after=Avg('moyenne_rattrapage'),
                total=Count('id_eval')
            )
            .order_by('-total')
        )

        par_niveau = []
        for st in niveau_stats:
            niv_code = st['id_niv__code_niv']
            b_val = round(float(st['avg_before']), 1) if st['avg_before'] is not None else 0.0
            a_val = round(float(st['avg_after']), 1) if st['avg_after'] is not None else 0.0
            par_niveau.append({
                'niveau': niv_code,
                'avant': b_val,
                'apres': a_val,
                'gain': round(a_val - b_val, 1),
                'total': st['total'],
            })

        # Tableau des étudiants basé à 100% sur les données réelles
        rows = (
            qs_rat.select_related('id_etu', 'id_mod', 'id_niv', 'id_annee')
            .order_by('-id_eval')
        )
        etudiants_list = []
        for ev in rows[:1000]:
            nom = (ev.id_etu.nom or '').strip()
            prenom = (ev.id_etu.prenom or '').strip()
            nom_affiche = f"{nom.upper()} {prenom.title()}".strip() if (nom or prenom) else ev.id_etu.matricule

            devoir_cc = (
                round(float(ev.note_devoir_40) / 0.4, 1)
                if ev.note_devoir_40 is not None
                else None
            )
            note_exam = (
                round(float(ev.note_examen), 1)
                if ev.note_examen is not None
                else None
            )
            note_rat = (
                round(float(ev.note_rattrapage), 1)
                if ev.note_rattrapage is not None
                else None
            )

            # Moyenne avant rattrapage (session normale : 40% CC + 60% Examen initial)
            avant_val = (
                round(float(ev.moyenne), 1)
                if ev.moyenne is not None
                else None
            )

            # Moyenne après rattrapage (40% CC + 60% Note de rattrapage)
            apres_val = (
                round(float(ev.moyenne_rattrapage), 1)
                if ev.moyenne_rattrapage is not None
                else note_rat
            )

            diff = (
                round(apres_val - avant_val, 1)
                if (apres_val is not None and avant_val is not None)
                else None
            )
            is_adm = (
                (ev.resultat_rattrapage == ResultatChoices.ADMIS)
                or (apres_val is not None and apres_val >= 10.0)
            )

            etudiants_list.append({
                'id_eval': ev.id_eval,
                'id_etu': ev.id_etu_id,
                'matricule': ev.id_etu.matricule,
                'etudiant': nom_affiche,
                'module': ev.id_mod.nom_mod if ev.id_mod.nom_mod else 'Module',
                'code_mod': ev.id_mod.code_mod,
                'id_mod': ev.id_mod_id,
                'niveau': ev.id_niv.code_niv if ev.id_niv else '',
                'id_niv': ev.id_niv_id,
                'annee': ev.id_annee.annee_academique if ev.id_annee else '',
                'note_devoir': devoir_cc,
                'note_examen': note_exam,
                'note_rattrapage': note_rat,
                'avant': avant_val if avant_val is not None else 0.0,
                'apres': apres_val if apres_val is not None else 0.0,
                'evolution': f"+{diff}" if (diff is not None and diff > 0) else (str(diff) if diff is not None else '—'),
                'resultat': 'Admis' if is_adm else 'Refusé',
            })
    else:
        # Aucun résultat pour ces filtres : on renvoie des valeurs neutres vides, pas de faux mocks
        etudiants_concernes = 0
        modules_concernes = 0
        taux_reussite = 0.0
        taux_echec = 0.0
        moyenne_avant = 0.0
        gain_moyen = 0.0
        moyenne_apres = 0.0
        par_niveau = []
        etudiants_list = []

    return {
        'kpi': {
            'etudiants_concernes': etudiants_concernes,
            'modules_concernes': modules_concernes,
            'taux_reussite': taux_reussite,
            'taux_echec': taux_echec,
        },
        'synthese': {
            'moyenne_avant': moyenne_avant,
            'gain_moyen': gain_moyen,
            'moyenne_apres': moyenne_apres,
        },
        'par_niveau': par_niveau,
        'etudiants': etudiants_list,
    }


def get_recommandations(filters: dict, user=None) -> dict:
    """
    Génération automatique de recommandations décisionnelles et pédagogiques.
    Moteur fondé sur les 9 règles métier académiques officielles.
    """
    from .recommendations import get_recommendations as compute_recommendations
    return compute_recommendations(filters=filters, user=user)


# ---------------------------------------------------------------------------
# Vues détaillées par Niveau et par Module
# ---------------------------------------------------------------------------

def get_niveau_detail(id_or_code_niv, filters: dict = None) -> dict:
    """
    Détail complet d'un niveau académique (ex: B1M, B2SI, etc.) :
    - Infos du niveau (code, libellé)
    - KPIs clés (effectif, moyenne générale, taux de réussite/échec, rattrapages, modules)
    - Modules évalués dans ce niveau avec leurs statistiques
    - Liste des étudiants inscrits à ce niveau avec leurs performances
    - Distribution des notes
    - Évolution annuelle
    """
    from students.models import DimNiveau
    from academics.models import DimAnneeAcademique

    # Recherche par ID ou code niveau
    if str(id_or_code_niv).isdigit():
        niveau = DimNiveau.objects.filter(pk=int(id_or_code_niv)).first()
    else:
        niveau = DimNiveau.objects.filter(code_niv__iexact=str(id_or_code_niv).strip()).first()
        if not niveau:
            niveau = DimNiveau.objects.filter(libelle_niv__iexact=str(id_or_code_niv).strip()).first()

    if not niveau:
        return None

    qs = FactEvaluation.objects.filter(id_niv=niveau)
    if filters:
        # On n'applique pas id_niv car on est sur ce niveau
        filters_copy = {k: v for k, v in filters.items() if k != 'id_niv'}
        qs = _apply_filters(qs, filters_copy)

    total_evals = qs.count()
    effectif = qs.values('id_etu').distinct().count()
    admis = qs.filter(resultat=ResultatChoices.ADMIS).count()
    ajourne = qs.filter(resultat=ResultatChoices.AJOURNE).count()
    moy_gen = qs.aggregate(avg=Avg('moyenne'))['avg']
    avg_devoir_40 = qs.aggregate(avg=Avg('note_devoir_40'))['avg']
    avg_exam = qs.aggregate(avg=Avg('note_examen'))['avg']
    rattrapages = qs.filter(Q(note_rattrapage__isnull=False) | Q(moyenne__lt=10)).count()
    total_modules = qs.values('id_mod').distinct().count()

    taux_reussite = round((admis / total_evals) * 100, 1) if total_evals > 0 else 0.0
    taux_echec = round((ajourne / total_evals) * 100, 1) if total_evals > 0 else 0.0

    # Modules de ce niveau
    mod_data = (
        qs.values('id_mod', 'id_mod__code_mod', 'id_mod__nom_mod', 'id_mod__semestre')
        .annotate(
            avg_moyenne=Avg('moyenne'),
            total=Count('id_eval'),
            admis_count=Count('id_eval', filter=Q(resultat=ResultatChoices.ADMIS)),
            etudiants=Count('id_etu', distinct=True),
            rattrapages_count=Count('id_eval', filter=Q(note_rattrapage__isnull=False) | Q(moyenne__lt=10)),
        )
        .order_by('-avg_moyenne')
    )

    modules_list = []
    for m in mod_data:
        m_tot = m['total']
        m_adm = m['admis_count']
        m_taux_reussite = round((m_adm / m_tot) * 100, 1) if m_tot > 0 else 0.0
        m_taux_echec = round(100.0 - m_taux_reussite, 1)
        m_moy = max(0.0, min(20.0, round(float(m['avg_moyenne']), 2))) if m['avg_moyenne'] is not None else None
        m_risque = 'Élevé' if (m_taux_echec >= 50 or (m_moy is not None and m_moy < 10.0)) else ('Moyen' if m_taux_echec >= 35 else 'Faible')

        modules_list.append({
            'id_mod': m['id_mod'],
            'code_mod': m['id_mod__code_mod'],
            'nom_mod': m['id_mod__nom_mod'],
            'semestre': m['id_mod__semestre'],
            'moyenne': m_moy,
            'taux_reussite': m_taux_reussite,
            'taux_echec': m_taux_echec,
            'effectif': m['etudiants'],
            'rattrapages': m['rattrapages_count'],
            'risque': m_risque,
        })

    # Étudiants de ce niveau
    etu_data = (
        qs.values('id_etu', 'id_etu__matricule', 'id_etu__nom', 'id_etu__prenom')
        .annotate(
            avg_moyenne=Avg(Coalesce('moyenne_rattrapage', 'moyenne')),
            total=Count('id_eval'),
            valides=Count(
                'id_eval',
                filter=Q(moyenne__gte=10) | Q(moyenne_rattrapage__gte=10) | Q(resultat_rattrapage=ResultatChoices.ADMIS)
            ),
            en_difficulte=Count(
                'id_eval',
                filter=Q(moyenne__lt=10) & (Q(moyenne_rattrapage__isnull=True) | Q(moyenne_rattrapage__lt=10))
            ),
            rattrapages_count=Count('id_eval', filter=Q(note_rattrapage__isnull=False)),
        )
        .order_by('id_etu__nom', 'id_etu__prenom')
    )

    etudiants_list = []
    for e in etu_data:
        nom = (e['id_etu__nom'] or '').strip()
        prenom = (e['id_etu__prenom'] or '').strip()
        nom_complet = f"{nom.upper()} {prenom.title()}".strip()
        ini1 = nom[0].upper() if nom else 'E'
        ini2 = prenom[0].upper() if prenom else ''
        initiales = f"{ini1}{ini2}"
        e_moy = max(0.0, min(20.0, round(float(e['avg_moyenne']), 2))) if e['avg_moyenne'] is not None else 0.0

        etudiants_list.append({
            'id_etu': e['id_etu'],
            'matricule': e['id_etu__matricule'],
            'nom_complet': nom_complet,
            'initiales': initiales,
            'moyenne': e_moy,
            'modules_valides': e['valides'],
            'en_difficulte': e['en_difficulte'],
            'rattrapages': e['rattrapages_count'],
            'statut': 'Admis' if e_moy >= 10.0 else 'Ajourné',
        })

    # Distribution des notes de ce niveau
    tranches = [
        ('<5', 0, 5),
        ('5-8', 5, 8),
        ('8-10', 8, 10),
        ('10-12', 10, 12),
        ('12-14', 12, 14),
        ('14-16', 14, 16),
        ('16-18', 16, 18),
        ('18-20', 18, 20.01),
    ]
    distribution = []
    for label, bmin, bmax in tranches:
        count = qs.filter(moyenne__gte=bmin, moyenne__lt=bmax).count()
        distribution.append({
            'tranche': label,
            'effectif': count,
            'isBelow10': bmin < 10,
        })

    # Évolution annuelle pour ce niveau
    evo_data = (
        FactEvaluation.objects.filter(id_niv=niveau)
        .exclude(id_annee__annee_academique__in=['nan', 'None', '', None])
        .values('id_annee__annee_academique')
        .annotate(
            moyenne=Avg('moyenne'),
            total=Count('id_eval'),
            admis_count=Count('id_eval', filter=Q(resultat=ResultatChoices.ADMIS)),
            etudiants=Count('id_etu', distinct=True),
        )
        .order_by('id_annee__annee_academique')
    )
    evolution = []
    for row in evo_data:
        tot = row['total']
        adm = row['admis_count']
        t_reussite = round((adm / tot) * 100, 1) if tot > 0 else 0.0
        m_val = max(0.0, min(20.0, round(float(row['moyenne']), 2))) if row['moyenne'] is not None else None
        evolution.append({
            'annee': row['id_annee__annee_academique'],
            'moyenne': m_val,
            'taux_reussite': t_reussite,
            'effectif': row['etudiants'],
        })

    # Liste des années académiques disponibles pour ce niveau
    raw_annees = list(
        FactEvaluation.objects.filter(id_niv=niveau)
        .exclude(id_annee__annee_academique__in=['nan', 'None', '', None])
        .values('id_annee', 'id_annee__annee_academique')
        .distinct()
        .order_by('-id_annee__annee_academique')
    )
    annees = [
        {
            'id_annee': r['id_annee'],
            'annee_academique': r['id_annee__annee_academique'],
            'id_annee__annee_academique': r['id_annee__annee_academique'],
        }
        for r in raw_annees
    ]

    return {
        'niveau': {
            'id_niv': niveau.id_niv,
            'code_niv': niveau.code_niv,
            'libelle_niv': niveau.libelle_niv or niveau.code_niv,
        },
        'kpi': {
            'effectif': effectif,
            'total_evaluations': total_evals,
            'total_modules': total_modules,
            'moyenne_generale': max(0.0, min(20.0, round(float(moy_gen), 2))) if moy_gen is not None else None,
            'taux_reussite': taux_reussite,
            'taux_echec': taux_echec,
            'rattrapages': rattrapages,
            'moyenne_devoir': max(0.0, min(20.0, round(float(avg_devoir_40) / 0.4, 2))) if avg_devoir_40 is not None else None,
            'moyenne_examen': max(0.0, min(20.0, round(float(avg_exam), 2))) if avg_exam is not None else None,
        },
        'modules': modules_list,
        'etudiants': etudiants_list,
        'distribution': distribution,
        'evolution': evolution,
        'annees': annees,
    }


def get_module_detail(id_or_code_mod, filters: dict = None) -> dict:
    """
    Détail complet d'un module académique :
    - Infos du module (code, nom, semestre)
    - KPIs clés (total étudiants, moyenne générale, taux de réussite/échec, devoir vs examen, rattrapages)
    - Répartition par niveau (quelles promotions suivent ce module et leurs performances)
    - Liste individuelle des évaluations étudiantes pour ce module
    - Distribution des notes
    - Évolution annuelle
    """
    from academics.models import DimModule

    if str(id_or_code_mod).isdigit():
        module = DimModule.objects.filter(pk=int(id_or_code_mod)).first()
    else:
        module = DimModule.objects.filter(code_mod__iexact=str(id_or_code_mod).strip()).first()
        if not module:
            module = DimModule.objects.filter(nom_mod__iexact=str(id_or_code_mod).strip()).first()

    if not module:
        return None

    qs = FactEvaluation.objects.filter(id_mod=module)
    if filters:
        filters_copy = {k: v for k, v in filters.items() if k != 'id_mod'}
        qs = _apply_filters(qs, filters_copy)

    total_evals = qs.count()
    total_etudiants = qs.values('id_etu').distinct().count()
    admis = qs.filter(
        Q(resultat=ResultatChoices.ADMIS) |
        Q(moyenne_rattrapage__gte=10) |
        Q(resultat_rattrapage=ResultatChoices.ADMIS)
    ).count()
    ajourne = total_evals - admis
    moy_gen = qs.aggregate(avg=Avg(Coalesce('moyenne_rattrapage', 'moyenne')))['avg']
    avg_devoir_40 = qs.aggregate(avg=Avg('note_devoir_40'))['avg']
    avg_exam = qs.aggregate(avg=Avg('note_examen'))['avg']
    rattrapages = qs.filter(note_rattrapage__isnull=False).count()

    taux_reussite = round((admis / total_evals) * 100, 1) if total_evals > 0 else 0.0
    taux_echec = round((ajourne / total_evals) * 100, 1) if total_evals > 0 else 0.0

    # Niveaux concernés par ce module
    niv_data = (
        qs.values('id_niv', 'id_niv__code_niv')
        .annotate(
            avg_moyenne=Avg(Coalesce('moyenne_rattrapage', 'moyenne')),
            total=Count('id_eval'),
            admis_count=Count(
                'id_eval',
                filter=Q(resultat=ResultatChoices.ADMIS) |
                       Q(moyenne_rattrapage__gte=10) |
                       Q(resultat_rattrapage=ResultatChoices.ADMIS)
            ),
            etudiants=Count('id_etu', distinct=True),
        )
        .order_by('id_niv__code_niv')
    )
    niveaux_list = []
    for n in niv_data:
        n_tot = n['total']
        n_adm = n['admis_count']
        n_taux = round((n_adm / n_tot) * 100, 1) if n_tot > 0 else 0.0
        n_moy = max(0.0, min(20.0, round(float(n['avg_moyenne']), 2))) if n['avg_moyenne'] is not None else None
        niveaux_list.append({
            'id_niv': n['id_niv'],
            'code_niv': n['id_niv__code_niv'],
            'moyenne': n_moy,
            'taux_reussite': n_taux,
            'taux_echec': round(100.0 - n_taux, 1),
            'effectif': n['etudiants'],
        })

    # Liste des évaluations des étudiants pour ce module
    evals = (
        qs.select_related('id_etu', 'id_niv', 'id_annee')
        .order_by('id_annee__annee_academique', 'id_niv__code_niv', 'id_etu__nom')
    )
    etudiants_evals = []
    for ev in evals[:1500]:
        nom = (ev.id_etu.nom or '').strip()
        prenom = (ev.id_etu.prenom or '').strip()
        nom_complet = f"{nom.upper()} {prenom.title()}".strip()

        # Devoir ramené sur 20
        if ev.note_devoir_40 is not None:
            note_devoir = round(float(ev.note_devoir_40) / 0.4, 2)
        elif ev.note_devoir1 is not None:
            notes = [n for n in [ev.note_devoir1, ev.note_devoir2, ev.note_devoir3, ev.note_devoir4] if n is not None]
            note_devoir = round(float(sum(notes) / len(notes)), 2) if notes else None
        else:
            note_devoir = None

        etudiants_evals.append({
            'id_eval': ev.id_eval,
            'id_etu': ev.id_etu_id,
            'matricule': ev.id_etu.matricule,
            'nom_complet': nom_complet,
            'niveau': ev.id_niv.code_niv if ev.id_niv else '',
            'id_niv': ev.id_niv_id,
            'annee': ev.id_annee.annee_academique if ev.id_annee else '',
            'id_annee': ev.id_annee_id,
            'note_devoir': note_devoir,
            'note_examen': round(float(ev.note_examen), 2) if ev.note_examen is not None else None,
            'moyenne': round(float(ev.moyenne), 2) if ev.moyenne is not None else None,
            'resultat': ev.resultat,
            'note_rattrapage': round(float(ev.note_rattrapage), 2) if ev.note_rattrapage is not None else None,
            'moyenne_rattrapage': round(float(ev.moyenne_rattrapage), 2) if ev.moyenne_rattrapage is not None else None,
            'resultat_rattrapage': ev.resultat_rattrapage,
        })

    # Distribution des notes
    tranches = [
        ('<5', 0, 5),
        ('5-8', 5, 8),
        ('8-10', 8, 10),
        ('10-12', 10, 12),
        ('12-14', 12, 14),
        ('14-16', 14, 16),
        ('16-18', 16, 18),
        ('18-20', 18, 20.01),
    ]
    distribution = []
    for label, bmin, bmax in tranches:
        count = qs.filter(moyenne__gte=bmin, moyenne__lt=bmax).count()
        distribution.append({
            'tranche': label,
            'effectif': count,
            'isBelow10': bmin < 10,
        })

    # Évolution annuelle pour ce module
    evo_data = (
        FactEvaluation.objects.filter(id_mod=module)
        .exclude(id_annee__annee_academique__in=['nan', 'None', '', None])
        .values('id_annee__annee_academique')
        .annotate(
            moyenne=Avg('moyenne'),
            total=Count('id_eval'),
            admis_count=Count('id_eval', filter=Q(resultat=ResultatChoices.ADMIS)),
            etudiants=Count('id_etu', distinct=True),
        )
        .order_by('id_annee__annee_academique')
    )
    evolution = []
    for row in evo_data:
        tot = row['total']
        adm = row['admis_count']
        t_reussite = round((adm / tot) * 100, 1) if tot > 0 else 0.0
        m_val = max(0.0, min(20.0, round(float(row['moyenne']), 2))) if row['moyenne'] is not None else None
        evolution.append({
            'annee': row['id_annee__annee_academique'],
            'moyenne': m_val,
            'taux_reussite': t_reussite,
            'effectif': row['etudiants'],
        })

    # Années et niveaux distincts pour les filtres
    raw_annees = list(
        FactEvaluation.objects.filter(id_mod=module)
        .exclude(id_annee__annee_academique__in=['nan', 'None', '', None])
        .values('id_annee', 'id_annee__annee_academique')
        .distinct()
        .order_by('-id_annee__annee_academique')
    )
    annees = [
        {
            'id_annee': r['id_annee'],
            'annee_academique': r['id_annee__annee_academique'],
            'id_annee__annee_academique': r['id_annee__annee_academique'],
        }
        for r in raw_annees
    ]

    return {
        'module': {
            'id_mod': module.id_mod,
            'code_mod': module.code_mod,
            'nom_mod': module.nom_mod,
            'semestre': module.semestre,
        },
        'kpi': {
            'total_etudiants': total_etudiants,
            'total_evaluations': total_evals,
            'moyenne_generale': max(0.0, min(20.0, round(float(moy_gen), 2))) if moy_gen is not None else None,
            'taux_reussite': taux_reussite,
            'taux_echec': taux_echec,
            'moyenne_devoir': max(0.0, min(20.0, round(float(avg_devoir_40) / 0.4, 2))) if avg_devoir_40 is not None else None,
            'moyenne_examen': max(0.0, min(20.0, round(float(avg_exam), 2))) if avg_exam is not None else None,
            'rattrapages': rattrapages,
        },
        'niveaux': niveaux_list,
        'evaluations': etudiants_evals,
        'distribution': distribution,
        'evolution': evolution,
        'annees': annees,
    }

