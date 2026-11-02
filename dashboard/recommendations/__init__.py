"""
Module de recommandations pédagogiques de Student Dashboard.
Expose le moteur d'évaluation, la configuration et les fonctions de service.
"""
from academics.models import FactEvaluation
from .config import RecommendationsConfig, DEFAULT_CONFIG
from .engine import RecommendationsEngine


def _apply_recommendation_filters(queryset, filters: dict):
    """Applique les filtres académiques standards."""
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


def get_recommendations(filters: dict = None, user=None, config: RecommendationsConfig = None) -> dict:
    """
    Génère l'ensemble des recommandations pédagogiques à partir des filtres actifs.
    Évalue les 9 règles métier sur les données académiques réelles.
    """
    filters = filters or {}
    base_qs = FactEvaluation.objects.all()

    # Queryset filtré principal
    filtered_qs = _apply_recommendation_filters(base_qs, filters)

    # Queryset sans le filtre de semestre pour permettre les comparaisons inter-semestres (Règles 3, 6, 7)
    cohort_filters = {k: v for k, v in filters.items() if k != 'semestre'}
    full_cohort_qs = _apply_recommendation_filters(base_qs, cohort_filters)

    engine = RecommendationsEngine(config=config or DEFAULT_CONFIG)
    return engine.evaluate(
        queryset=filtered_qs,
        filters=filters,
        full_cohort_queryset=full_cohort_qs,
        user=user,
    )


def get_points_cles(filters: dict = None, config: RecommendationsConfig = None) -> list:
    """
    Génère les points clés détectés (pour la carte du tableau de bord principal).
    Sélectionne les 3 recommandations prioritaires réelles pour action immédiate.
    """
    data = get_recommendations(filters=filters, config=config)
    recs = data.get('recommandations', [])

    if not recs:
        return [
            {
                'id': '01',
                'titre': 'Performance académique',
                'description': data.get('info_message', "Toutes les métriques académiques analysées sont conformes aux attentes."),
                'badgeType': 'neutral',
                'action': 'surveillance',
            }
        ]

    points = []
    for idx, r in enumerate(recs[:3]):
        badge_type = 'alert' if r['priority'] == 'elevee' else ('warning' if r['priority'] == 'moyenne' else ('positive' if r['is_positive'] else 'neutral'))
        points.append({
            'id': f"0{idx + 1}",
            'titre': r['short_title'],
            'description': r['description'],
            'badgeType': badge_type,
            'isAlert': r['priority'] == 'elevee',
            'action': 'prioritaire' if r['priority'] == 'elevee' else ('vigilance' if r['priority'] == 'moyenne' else 'suivi'),
            'indicator': r.get('indicator_label'),
            'rule_number': r.get('rule_number'),
        })

    return points
