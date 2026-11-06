"""
Moteur d'analyse et de génération de recommandations pédagogiques automatiques LBS.
Applique rigoureusement les 10 règles métier spécifiées :
1. Écart entre devoirs et examens (>= 2 pts / >= 4 pts)
2. Échec à la moyenne finale du module (>= 60% / >= 70%)
3. Échec aux examens (>= 60% / >= 70%)
4. Faible contrôle continu (>= 50% / >= 65%)
5. Zéros aux devoirs (>= 15% / >= 25%)
6. Étudiants avec plusieurs matières non validées (>= 5 / >= 7, alerte dès 3)
7. Étudiants proches de la validation (8 à < 10 / 9 à < 10)
9. Évolution entre semestres (>= 1 pt / >= 2 pts)
11. Amélioration significative (+1 pt ou +10% / +2 pts ou +20%)
12. Faible réussite après rattrapage (< 50% / < 30%)
"""
import math
from datetime import datetime
from collections import defaultdict
from academics.models import ResultatChoices
from .config import RecommendationsConfig, DEFAULT_CONFIG


def _clamp(val: float, min_val: float = 0.0, max_val: float = 20.0) -> float:
    return max(min_val, min(max_val, val))


def _extract_notes_on_20(ev) -> tuple[float | None, float | None, float | None]:
    """
    Extrait (note_devoir, note_examen, moyenne) ramenées sur 20.
    """
    devoir = None
    if ev.note_devoir_40 is not None:
        devoir = float(ev.note_devoir_40) / 0.4
    elif ev.note_devoir1 is not None:
        devoirs = [
            float(d) for d in [ev.note_devoir1, ev.note_devoir2, ev.note_devoir3, ev.note_devoir4]
            if d is not None
        ]
        devoir = sum(devoirs) / len(devoirs) if devoirs else None
    if devoir is not None:
        devoir = _clamp(devoir)

    exam = None
    if ev.note_examen is not None:
        exam = float(ev.note_examen)
    elif ev.note_examen_60 is not None:
        exam = float(ev.note_examen_60) / 0.6
    if exam is not None:
        exam = _clamp(exam)

    moy = None
    if ev.moyenne is not None:
        moy = _clamp(float(ev.moyenne))
    elif devoir is not None and exam is not None:
        moy = _clamp(round(devoir * 0.4 + exam * 0.6, 2))
    elif exam is not None:
        moy = exam
    elif devoir is not None:
        moy = devoir

    return devoir, exam, moy


def _is_failed_evaluation(ev, moy_val: float | None, seuil_validation: float = 10.0) -> bool:
    """Détermine si une évaluation est un échec."""
    if ev.resultat == ResultatChoices.AJOURNE:
        return True
    if ev.resultat == ResultatChoices.ADMIS:
        return False
    if moy_val is not None:
        return moy_val < seuil_validation
    return False


def _is_passed_evaluation(ev, moy_val: float | None, seuil_validation: float = 10.0) -> bool:
    """Détermine si une évaluation est validée (Admis)."""
    if ev.resultat == ResultatChoices.ADMIS:
        return True
    if ev.resultat == ResultatChoices.AJOURNE:
        return False
    if moy_val is not None:
        return moy_val >= seuil_validation
    return False


class RecommendationsEngine:
    """Moteur décisionnel exécutant les règles métier LBS."""

    def __init__(self, config: RecommendationsConfig = None):
        self.config = config or DEFAULT_CONFIG

    def evaluate(self, queryset, filters: dict = None, full_cohort_queryset=None, user=None) -> dict:
        filters = filters or {}
        now_iso = datetime.now().strftime("%Y-%m-%d %H:%M")

        user_can_view_students = True
        if user and hasattr(user, 'is_authenticated'):
            user_can_view_students = user.is_authenticated

        evaluations = list(
            queryset.select_related('id_etu', 'id_mod', 'id_niv', 'id_annee')
        )

        total_evaluations = len(evaluations)
        all_students_ids = set(ev.id_etu_id for ev in evaluations if ev.id_etu_id)

        if total_evaluations == 0:
            return {
                'summary': {
                    'total_evaluations': 0,
                    'total_etudiants': 0,
                    'total_recommandations': 0,
                    'counts_by_priority': {'elevee': 0, 'moyenne': 0, 'positive': 0},
                    'counts_by_rule': {f"r{i}": 0 for i in [1, 2, 3, 4, 5, 6, 7, 9, 11, 12]},
                },
                'recommandations': [],
                'info_message': "Aucune évaluation disponible pour les filtres sélectionnés.",
            }

        recommendations = []
        if full_cohort_queryset is not None and filters.get('semestre'):
            comparative_evals = list(
                full_cohort_queryset.select_related('id_etu', 'id_mod', 'id_niv', 'id_annee')
            )
        else:
            comparative_evals = evaluations

        # 1. Écart entre devoirs et examens
        recommendations.extend(self._eval_rule_1_devoir_examen_gap(evaluations, filters, now_iso))

        # 2. Échec à la moyenne finale du module
        recommendations.extend(self._eval_rule_2_final_failure_rate(evaluations, filters, now_iso))

        # 3. Échec aux examens
        recommendations.extend(self._eval_rule_3_exam_failure_rate(evaluations, filters, now_iso))

        # 4. Faible contrôle continu
        recommendations.extend(self._eval_rule_4_devoir_failure_rate(evaluations, filters, now_iso))

        # 5. Zéros aux devoirs
        recommendations.extend(self._eval_rule_5_zero_devoir_rate(evaluations, filters, now_iso))

        # 6. Étudiants avec plusieurs matières non validées
        recommendations.extend(self._eval_rule_6_multiple_unvalidated(evaluations, filters, user_can_view_students, now_iso))

        # 7. Étudiants proches de la validation
        recommendations.extend(self._eval_rule_7_near_validation(evaluations, filters, user_can_view_students, now_iso))

        # 9. Évolution entre semestres
        recommendations.extend(self._eval_rule_9_semester_variation(comparative_evals, filters, now_iso))

        # 11. Amélioration significative (résultat positif)
        recommendations.extend(self._eval_rule_11_significant_improvement(comparative_evals, filters, now_iso))

        # 12. Faible réussite après rattrapage
        recommendations.extend(self._eval_rule_12_low_rattrapage_pass_rate(evaluations, filters, now_iso))

        # Déduplication et conservation de la priorité la plus élevée par entité
        deduped = self._deduplicate_recommendations(recommendations)

        priority_order = {'elevee': 0, 'moyenne': 1, 'positive': 2}
        deduped.sort(key=lambda r: (priority_order.get(r['priority'], 99), r.get('rule_number', 0)))

        counts_by_prio = {'elevee': 0, 'moyenne': 0, 'positive': 0}
        counts_by_rule = {f"r{i}": 0 for i in [1, 2, 3, 4, 5, 6, 7, 9, 11, 12]}

        for r in deduped:
            p = r.get('priority', 'moyenne')
            if p in counts_by_prio:
                counts_by_prio[p] += 1
            r_num = r.get('rule_number')
            if r_num and f"r{r_num}" in counts_by_rule:
                counts_by_rule[f"r{r_num}"] += 1

        info_msg = None
        if len(deduped) == 0:
            if total_evaluations < self.config.MIN_STUDENTS_SAMPLE:
                info_msg = (
                    f"Échantillon insuffisant ({total_evaluations} évaluation(s)). "
                    f"Un minimum de {self.config.MIN_STUDENTS_SAMPLE} étudiants évalués "
                    f"est requis pour émettre des recommandations statistiques fiables."
                )
            else:
                info_msg = "Aucune alerte pédagogique détectée : les indicateurs analysés sont conformes aux attentes."

        return {
            'summary': {
                'total_evaluations': total_evaluations,
                'total_etudiants': len(all_students_ids),
                'total_recommandations': len(deduped),
                'counts_by_priority': counts_by_prio,
                'counts_by_rule': counts_by_rule,
            },
            'recommandations': deduped,
            'info_message': info_msg,
        }

    # -------------------------------------------------------------------------
    # RÈGLE 1 : Écart entre devoirs et examens
    # Alerte : écart >= 2 points | Critique : >= 4 points
    # Action : Harmoniser devoirs et examens (le texte exact dépend du sens de l'écart)
    # -------------------------------------------------------------------------
    def _eval_rule_1_devoir_examen_gap(self, evaluations, filters, now_iso) -> list:
        recs = []
        mod_groups = defaultdict(list)
        for ev in evaluations:
            if ev.id_mod_id:
                mod_groups[ev.id_mod_id].append(ev)

        for mod_id, ev_list in mod_groups.items():
            devoir_notes = []
            exam_notes = []

            for ev in ev_list:
                dev, ex, _ = _extract_notes_on_20(ev)
                if dev is not None and ex is not None:
                    devoir_notes.append(dev)
                    exam_notes.append(ex)

            total_count = len(devoir_notes)
            if total_count < self.config.MIN_STUDENTS_SAMPLE:
                continue

            avg_devoir = round(sum(devoir_notes) / total_count, 2)
            avg_exam = round(sum(exam_notes) / total_count, 2)
            diff_raw = round(avg_devoir - avg_exam, 2)
            abs_diff = round(abs(diff_raw), 2)

            if abs_diff >= self.config.RULE_1_DIFF_ALERT:
                first_ev = ev_list[0]
                mod_name = first_ev.id_mod.nom_mod if first_ev.id_mod else f"Module {mod_id}"
                sem = first_ev.id_mod.semestre if first_ev.id_mod else filters.get('semestre')
                niv_code = first_ev.id_niv.code_niv if first_ev.id_niv else filters.get('niveau')
                annee_str = first_ev.id_annee.annee_academique if first_ev.id_annee else filters.get('annee')

                is_critical = abs_diff >= self.config.RULE_1_DIFF_CRITICAL
                priority = 'elevee' if is_critical else 'moyenne'
                prio_label = "Priorité critique" if is_critical else "Point de vigilance"
                threshold_str = f"Écart absolu ≥ {self.config.RULE_1_DIFF_CRITICAL} pts" if is_critical else f"Écart absolu ≥ {self.config.RULE_1_DIFF_ALERT} pts"

                if diff_raw > 0:
                    direction_label = "Devoir > Examen"
                    desc = (
                        f"Un écart de {abs_diff} point(s) est constaté entre la moyenne des devoirs ({avg_devoir}/20) "
                        f"et celle des examens ({avg_exam}/20) en {mod_name}. Les étudiants chutent lors de l'examen individuel."
                    )
                    action_rec = (
                        f"Harmoniser devoirs et examens : analyser le niveau de difficulté de l'examen final et entraîner les étudiants aux conditions de l'examen individuel."
                    )
                    actions_list = [
                        "Harmoniser devoirs et examens (barème et exigences)",
                        f"Vérifier le barème et la durée de l'examen terminal en {mod_name}",
                        "Organiser un examen blanc chronométré pour habituer les étudiants à la gestion du temps",
                    ]
                else:
                    direction_label = "Examen > Devoir"
                    desc = (
                        f"La moyenne des examens ({avg_exam}/20) dépasse celle des devoirs ({avg_devoir}/20) "
                        f"de {abs_diff} point(s) en {mod_name}. Le contrôle continu est sous-investi par rapport à l'examen."
                    )
                    action_rec = (
                        f"Harmoniser devoirs et examens : examiner les modalités d'évaluation du contrôle continu et encourager une implication régulière."
                    )
                    actions_list = [
                        "Harmoniser devoirs et examens (rythme et barème)",
                        f"Vérifier le taux de remise des devoirs sur {mod_name}",
                        "Clarifier le barème et les consignes des travaux de contrôle continu",
                    ]

                recs.append({
                    'id': f"rec-r1-mod-{mod_id}",
                    'rule_number': 1,
                    'rule_name': "Écart entre devoirs et examens",
                    'category': 'matiere',
                    'title': f"Écart Devoir/Examen marqué en {mod_name} ({direction_label})",
                    'short_title': f"Écart Devoir/Exam : {mod_name} (Δ {abs_diff} pts)",
                    'description': desc,
                    'indicator_value': abs_diff,
                    'indicator_label': f"Écart : {abs_diff} pts ({direction_label})",
                    'threshold': threshold_str,
                    'priority': priority,
                    'priority_label': prio_label,
                    'badge_color': 'red' if is_critical else 'amber',
                    'is_positive': False,
                    'action_recommandee': action_rec,
                    'actions': actions_list,
                    'annee_academique': annee_str,
                    'semestre': sem,
                    'niveau': niv_code,
                    'matiere': mod_name,
                    'etudiants_count': total_count,
                    'details': {
                        'moyenne_devoir': avg_devoir,
                        'moyenne_examen': avg_exam,
                        'ecart_points': abs_diff,
                    },
                    'created_at': now_iso,
                })

        return recs

    # -------------------------------------------------------------------------
    # RÈGLE 2 : Échec à la moyenne finale du module
    # Alerte : >= 60% sous 10 | Critique : >= 70%
    # Action : Séances de renforcement et soutien méthodologique
    # -------------------------------------------------------------------------
    def _eval_rule_2_final_failure_rate(self, evaluations, filters, now_iso) -> list:
        recs = []
        mod_groups = defaultdict(list)
        for ev in evaluations:
            if ev.id_mod_id:
                mod_groups[ev.id_mod_id].append(ev)

        for mod_id, ev_list in mod_groups.items():
            valid_evals = []
            failed_evals = []

            for ev in ev_list:
                _, _, moy = _extract_notes_on_20(ev)
                if ev.resultat != ResultatChoices.NON_EVALUE or moy is not None:
                    valid_evals.append((ev, moy))
                    if _is_failed_evaluation(ev, moy, self.config.SEUIL_VALIDATION):
                        failed_evals.append((ev, moy))

            total_count = len(valid_evals)
            if total_count < self.config.MIN_STUDENTS_SAMPLE:
                continue

            failure_count = len(failed_evals)
            failure_rate = round((failure_count / total_count) * 100.0, 1)

            if failure_rate >= self.config.RULE_2_FAILURE_ALERT:
                first_ev = ev_list[0]
                mod_name = first_ev.id_mod.nom_mod if first_ev.id_mod else f"Module {mod_id}"
                sem = first_ev.id_mod.semestre if first_ev.id_mod else filters.get('semestre')
                niv_code = first_ev.id_niv.code_niv if first_ev.id_niv else filters.get('niveau')
                annee_str = first_ev.id_annee.annee_academique if first_ev.id_annee else filters.get('annee')

                is_critical = failure_rate >= self.config.RULE_2_FAILURE_CRITICAL
                priority = 'elevee' if is_critical else 'moyenne'
                prio_label = "Priorité critique" if is_critical else "Point de vigilance"
                threshold_str = f"Échec ≥ {self.config.RULE_2_FAILURE_CRITICAL}%" if is_critical else f"Échec ≥ {self.config.RULE_2_FAILURE_ALERT}%"

                recs.append({
                    'id': f"rec-r2-mod-{mod_id}",
                    'rule_number': 2,
                    'rule_name': "Échec à la moyenne finale du module",
                    'category': 'matiere',
                    'title': f"Taux d'échec élevé à la moyenne finale en {mod_name} ({failure_rate}%)",
                    'short_title': f"Échec moyenne finale : {mod_name} ({failure_rate}%)",
                    'description': (
                        f"{failure_rate}% des étudiants ont une moyenne finale sous 10/20 en {mod_name} "
                        f"({failure_count} sur {total_count} étudiants évalués)."
                    ),
                    'indicator_value': failure_rate,
                    'indicator_label': f"{failure_rate}% d'échec final",
                    'threshold': threshold_str,
                    'priority': priority,
                    'priority_label': prio_label,
                    'badge_color': 'red' if is_critical else 'amber',
                    'is_positive': False,
                    'action_recommandee': "Séances de renforcement et soutien méthodologique.",
                    'actions': [
                        "Séances de renforcement et soutien méthodologique",
                        f"Identifier les notions concentrant les difficultés en {mod_name}",
                        "Organiser des séances de tutorat pédagogique ciblé",
                    ],
                    'annee_academique': annee_str,
                    'semestre': sem,
                    'niveau': niv_code,
                    'matiere': mod_name,
                    'etudiants_count': total_count,
                    'details': {
                        'evaluations_total': total_count,
                        'evaluations_echec': failure_count,
                        'taux_echec': failure_rate,
                    },
                    'created_at': now_iso,
                })

        return recs

    # -------------------------------------------------------------------------
    # RÈGLE 3 : Échec aux examens
    # Alerte : >= 60% sous 10 | Critique : >= 70%
    # Action : Annales corrigées et ateliers d’entraînement
    # -------------------------------------------------------------------------
    def _eval_rule_3_exam_failure_rate(self, evaluations, filters, now_iso) -> list:
        recs = []
        mod_groups = defaultdict(list)
        for ev in evaluations:
            if ev.id_mod_id:
                mod_groups[ev.id_mod_id].append(ev)

        for mod_id, ev_list in mod_groups.items():
            exam_evals = []
            for ev in ev_list:
                _, ex, _ = _extract_notes_on_20(ev)
                if ex is not None:
                    exam_evals.append((ev, ex))

            total_exam = len(exam_evals)
            if total_exam < self.config.MIN_STUDENTS_SAMPLE:
                continue

            failed_exam = [ex for _, ex in exam_evals if ex < self.config.SEUIL_VALIDATION]
            fail_rate = round((len(failed_exam) / total_exam) * 100.0, 1)

            if fail_rate >= self.config.RULE_3_EXAM_FAILURE_ALERT:
                first_ev = ev_list[0]
                mod_name = first_ev.id_mod.nom_mod if first_ev.id_mod else f"Module {mod_id}"
                sem = first_ev.id_mod.semestre if first_ev.id_mod else filters.get('semestre')
                niv_code = first_ev.id_niv.code_niv if first_ev.id_niv else filters.get('niveau')
                annee_str = first_ev.id_annee.annee_academique if first_ev.id_annee else filters.get('annee')

                is_critical = fail_rate >= self.config.RULE_3_EXAM_FAILURE_CRITICAL
                priority = 'elevee' if is_critical else 'moyenne'
                prio_label = "Priorité critique" if is_critical else "Point de vigilance"
                threshold_str = f"Échec examen ≥ {self.config.RULE_3_EXAM_FAILURE_CRITICAL}%" if is_critical else f"Échec examen ≥ {self.config.RULE_3_EXAM_FAILURE_ALERT}%"

                avg_exam = round(sum(ex for _, ex in exam_evals) / total_exam, 2)

                recs.append({
                    'id': f"rec-r3-mod-{mod_id}",
                    'rule_number': 3,
                    'rule_name': "Échec aux examens",
                    'category': 'matiere',
                    'title': f"Taux d'échec élevé aux examens en {mod_name} ({fail_rate}%)",
                    'short_title': f"Échec examen : {mod_name} ({fail_rate}%)",
                    'description': (
                        f"{fail_rate}% des étudiants ont obtenu moins de 10/20 à l'examen en {mod_name} "
                        f"({len(failed_exam)} sur {total_exam} étudiants, moyenne examen : {avg_exam}/20)."
                    ),
                    'indicator_value': fail_rate,
                    'indicator_label': f"{fail_rate}% d'échec examen",
                    'threshold': threshold_str,
                    'priority': priority,
                    'priority_label': prio_label,
                    'badge_color': 'red' if is_critical else 'amber',
                    'is_positive': False,
                    'action_recommandee': "Annales corrigées et ateliers d’entraînement.",
                    'actions': [
                        "Annales corrigées et ateliers d’entraînement",
                        "Mettre à disposition les annales corrigées et détaillées",
                        "Animer des ateliers pratiques de résolution d'exercices types",
                    ],
                    'annee_academique': annee_str,
                    'semestre': sem,
                    'niveau': niv_code,
                    'matiere': mod_name,
                    'etudiants_count': total_exam,
                    'details': {
                        'examens_total': total_exam,
                        'examens_echec': len(failed_exam),
                        'taux_echec_examen': fail_rate,
                        'moyenne_examen': avg_exam,
                    },
                    'created_at': now_iso,
                })

        return recs

    # -------------------------------------------------------------------------
    # RÈGLE 4 : Faible contrôle continu
    # Alerte : >= 50% sous 10 | Critique : >= 65%
    # Action : Adapter le rythme et l’accompagnement des travaux continus
    # -------------------------------------------------------------------------
    def _eval_rule_4_devoir_failure_rate(self, evaluations, filters, now_iso) -> list:
        recs = []
        mod_groups = defaultdict(list)
        for ev in evaluations:
            if ev.id_mod_id:
                mod_groups[ev.id_mod_id].append(ev)

        for mod_id, ev_list in mod_groups.items():
            devoir_evals = []
            for ev in ev_list:
                dev, _, _ = _extract_notes_on_20(ev)
                if dev is not None:
                    devoir_evals.append((ev, dev))

            total_devoir = len(devoir_evals)
            if total_devoir < self.config.MIN_STUDENTS_SAMPLE:
                continue

            failed_devoir = [dev for _, dev in devoir_evals if dev < self.config.SEUIL_VALIDATION]
            fail_rate = round((len(failed_devoir) / total_devoir) * 100.0, 1)

            if fail_rate >= self.config.RULE_4_DEVOIR_FAILURE_ALERT:
                first_ev = ev_list[0]
                mod_name = first_ev.id_mod.nom_mod if first_ev.id_mod else f"Module {mod_id}"
                sem = first_ev.id_mod.semestre if first_ev.id_mod else filters.get('semestre')
                niv_code = first_ev.id_niv.code_niv if first_ev.id_niv else filters.get('niveau')
                annee_str = first_ev.id_annee.annee_academique if first_ev.id_annee else filters.get('annee')

                is_critical = fail_rate >= self.config.RULE_4_DEVOIR_FAILURE_CRITICAL
                priority = 'elevee' if is_critical else 'moyenne'
                prio_label = "Priorité critique" if is_critical else "Point de vigilance"
                threshold_str = f"Échec devoirs ≥ {self.config.RULE_4_DEVOIR_FAILURE_CRITICAL}%" if is_critical else f"Échec devoirs ≥ {self.config.RULE_4_DEVOIR_FAILURE_ALERT}%"

                avg_devoir = round(sum(d for _, d in devoir_evals) / total_devoir, 2)

                recs.append({
                    'id': f"rec-r4-mod-{mod_id}",
                    'rule_number': 4,
                    'rule_name': "Faible contrôle continu",
                    'category': 'matiere',
                    'title': f"Faibles performances au contrôle continu en {mod_name} ({fail_rate}%)",
                    'short_title': f"Faible CC : {mod_name} ({fail_rate}%)",
                    'description': (
                        f"{fail_rate}% des étudiants ont une moyenne de devoirs sous 10/20 en {mod_name} "
                        f"({len(failed_devoir)} sur {total_devoir} étudiants, moyenne CC : {avg_devoir}/20)."
                    ),
                    'indicator_value': fail_rate,
                    'indicator_label': f"{fail_rate}% d'échec CC",
                    'threshold': threshold_str,
                    'priority': priority,
                    'priority_label': prio_label,
                    'badge_color': 'red' if is_critical else 'amber',
                    'is_positive': False,
                    'action_recommandee': "Adapter le rythme et l’accompagnement des travaux continus.",
                    'actions': [
                        "Adapter le rythme et l’accompagnement des travaux continus",
                        "Clarifier les consignes et les grilles d'évaluation des devoirs",
                        "Proposer un retour formatif rapide dès les premières évaluations",
                    ],
                    'annee_academique': annee_str,
                    'semestre': sem,
                    'niveau': niv_code,
                    'matiere': mod_name,
                    'etudiants_count': total_devoir,
                    'details': {
                        'devoirs_total': total_devoir,
                        'devoirs_echec': len(failed_devoir),
                        'taux_echec_devoir': fail_rate,
                        'moyenne_devoir': avg_devoir,
                    },
                    'created_at': now_iso,
                })

        return recs

    # -------------------------------------------------------------------------
    # RÈGLE 5 : Zéros aux devoirs
    # Alerte : >= 15% de zéros | Critique : >= 25%
    # Action : Enquêter sur les non-remises et instaurer des alertes de calendrier
    # -------------------------------------------------------------------------
    def _eval_rule_5_zero_devoir_rate(self, evaluations, filters, now_iso) -> list:
        recs = []
        mod_groups = defaultdict(list)
        for ev in evaluations:
            if ev.id_mod_id:
                mod_groups[ev.id_mod_id].append(ev)

        for mod_id, ev_list in mod_groups.items():
            devoir_evals = []
            for ev in ev_list:
                dev, _, _ = _extract_notes_on_20(ev)
                if dev is not None:
                    devoir_evals.append((ev, dev))

            total_devoir = len(devoir_evals)
            if total_devoir < self.config.MIN_STUDENTS_SAMPLE:
                continue

            zeros_count = sum(1 for _, d in devoir_evals if d == 0.0)
            zero_rate = round((zeros_count / total_devoir) * 100.0, 1)

            if zero_rate >= self.config.RULE_5_ZERO_DEVOIR_ALERT:
                first_ev = ev_list[0]
                mod_name = first_ev.id_mod.nom_mod if first_ev.id_mod else f"Module {mod_id}"
                sem = first_ev.id_mod.semestre if first_ev.id_mod else filters.get('semestre')
                niv_code = first_ev.id_niv.code_niv if first_ev.id_niv else filters.get('niveau')
                annee_str = first_ev.id_annee.annee_academique if first_ev.id_annee else filters.get('annee')

                is_critical = zero_rate >= self.config.RULE_5_ZERO_DEVOIR_CRITICAL
                priority = 'elevee' if is_critical else 'moyenne'
                prio_label = "Priorité critique" if is_critical else "Point de vigilance"
                threshold_str = f"Zéros devoirs ≥ {self.config.RULE_5_ZERO_DEVOIR_CRITICAL}%" if is_critical else f"Zéros devoirs ≥ {self.config.RULE_5_ZERO_DEVOIR_ALERT}%"

                recs.append({
                    'id': f"rec-r5-mod-{mod_id}",
                    'rule_number': 5,
                    'rule_name': "Zéros aux devoirs",
                    'category': 'matiere',
                    'title': f"Proportion anormale de zéros aux devoirs en {mod_name} ({zero_rate}%)",
                    'short_title': f"Zéros devoirs : {mod_name} ({zero_rate}%)",
                    'description': (
                        f"{zero_rate}% de notes égales à 0 détectées en contrôle continu sur {mod_name} "
                        f"({zeros_count} sur {total_devoir} étudiants). Ce signal traduit un taux élevé de non-remise de travaux."
                    ),
                    'indicator_value': zero_rate,
                    'indicator_label': f"{zero_rate}% de zéros",
                    'threshold': threshold_str,
                    'priority': priority,
                    'priority_label': prio_label,
                    'badge_color': 'red' if is_critical else 'amber',
                    'is_positive': False,
                    'action_recommandee': "Enquêter sur les non-remises et instaurer des alertes de calendrier.",
                    'actions': [
                        "Enquêter sur les non-remises et instaurer des alertes de calendrier",
                        "Identifier les motifs de non-remise auprès des étudiants",
                        "Mettre en place des rappels automatisés avant chaque date limite",
                    ],
                    'annee_academique': annee_str,
                    'semestre': sem,
                    'niveau': niv_code,
                    'matiere': mod_name,
                    'etudiants_count': total_devoir,
                    'details': {
                        'evaluations_devoir': total_devoir,
                        'nombre_zeros': zeros_count,
                        'taux_zeros': zero_rate,
                    },
                    'created_at': now_iso,
                })

        return recs

    # -------------------------------------------------------------------------
    # RÈGLE 6 : Étudiants avec plusieurs matières non validées
    # Alerte : >= 5 matières | Critique : >= 7 matières (surveillance à >= 3)
    # Action : À 3 : calendrier de révision avant le rattrapage. À 5 : entretien immédiat et contrat de remédiation
    # -------------------------------------------------------------------------
    def _eval_rule_6_multiple_unvalidated(self, evaluations, filters, user_can_view_students, now_iso) -> list:
        recs = []
        student_fails = defaultdict(lambda: {'etudiant': None, 'failed_modules': [], 'niv': None, 'annee': None})

        for ev in evaluations:
            if not ev.id_etu_id:
                continue
            _, _, moy = _extract_notes_on_20(ev)
            if _is_failed_evaluation(ev, moy, self.config.SEUIL_VALIDATION):
                entry = student_fails[ev.id_etu_id]
                entry['etudiant'] = ev.id_etu
                mod_name = ev.id_mod.nom_mod if ev.id_mod else "Module inconnu"
                entry['failed_modules'].append({
                    'module': mod_name,
                    'moyenne': moy,
                })
                if not entry['niv'] and ev.id_niv:
                    entry['niv'] = ev.id_niv.code_niv
                if not entry['annee'] and ev.id_annee:
                    entry['annee'] = ev.id_annee.annee_academique

        critical_students = []  # >= 7 matières non validées
        alert_students = []     # 5 ou 6 matières non validées
        warn_students = []      # 3 ou 4 matières non validées

        for etu_id, data in student_fails.items():
            count = len(data['failed_modules'])
            if count >= self.config.RULE_6_UNVALIDATED_CRITICAL:
                critical_students.append(data)
            elif count >= self.config.RULE_6_UNVALIDATED_ALERT:
                alert_students.append(data)
            elif count >= self.config.RULE_6_UNVALIDATED_WARN:
                warn_students.append(data)

        def build_sample(stud_list, max_sample=15):
            sample = []
            for s in stud_list[:max_sample]:
                etu = s['etudiant']
                if user_can_view_students and etu:
                    nom_affiche = f"{etu.nom.upper()} {etu.prenom.title()}".strip()
                    mat = etu.matricule
                else:
                    nom_affiche = "Étudiant (confidentiel)"
                    mat = "MASQUÉ"

                sample.append({
                    'id_etu': etu.id_etu if etu else None,
                    'etudiant': nom_affiche,
                    'matricule': mat,
                    'nb_non_valides': len(s['failed_modules']),
                    'matieres': [m['module'] for m in s['failed_modules']],
                })
            return sample

        # Cas critique : >= 7 matières non validées
        if critical_students:
            recs.append({
                'id': "rec-r6-critique",
                'rule_number': 6,
                'rule_name': "Étudiants avec plusieurs matières non validées",
                'category': 'etudiant',
                'title': f"{len(critical_students)} étudiant(s) en échec critique (≥ 7 matières non validées)",
                'short_title': f"Échec critique : {len(critical_students)} étudiant(s) (≥ 7 échecs)",
                'description': (
                    f"{len(critical_students)} étudiant(s) cumulent 7 matières non validées ou plus. "
                    f"Situation académique critique nécessitant un entretien d'orientation immédiat."
                ),
                'indicator_value': len(critical_students),
                'indicator_label': f"{len(critical_students)} étudiants (≥ 7 échecs)",
                'threshold': "Matières non validées ≥ 7",
                'priority': 'elevee',
                'priority_label': "Priorité critique",
                'badge_color': 'red',
                'is_positive': False,
                'action_recommandee': "Entretien immédiat et contrat de remédiation : réorientation ou redoublement accompagné.",
                'actions': [
                    "Entretien immédiat et contrat de remédiation",
                    "Bilan individuel approfondi et évaluation du parcours",
                    "Prioriser les matières fondamentales pour la session de rattrapage",
                ],
                'annee_academique': filters.get('annee'),
                'semestre': filters.get('semestre'),
                'niveau': filters.get('niveau'),
                'matiere': None,
                'etudiants_count': len(critical_students),
                'etudiants_sample': build_sample(critical_students),
                'details': {
                    'etudiants_critiques_count': len(critical_students),
                },
                'created_at': now_iso,
            })

        # Cas alerte : 5 ou 6 matières non validées (À 5 : entretien immédiat et contrat de remédiation)
        if alert_students:
            recs.append({
                'id': "rec-r6-alerte",
                'rule_number': 6,
                'rule_name': "Étudiants avec plusieurs matières non validées",
                'category': 'etudiant',
                'title': f"{len(alert_students)} étudiant(s) à risque élevé (5 à 6 matières non validées)",
                'short_title': f"Risque élevé : {len(alert_students)} étudiant(s) (5-6 échecs)",
                'description': (
                    f"{len(alert_students)} étudiant(s) cumulent 5 ou 6 matières non validées. "
                    f"Convocation urgente requise."
                ),
                'indicator_value': len(alert_students),
                'indicator_label': f"{len(alert_students)} étudiants (5-6 échecs)",
                'threshold': "Matières non validées ≥ 5",
                'priority': 'elevee',
                'priority_label': "Priorité élevée",
                'badge_color': 'orange',
                'is_positive': False,
                'action_recommandee': "Entretien immédiat et contrat de remédiation.",
                'actions': [
                    "Entretien immédiat et contrat de remédiation",
                    "Signer un contrat d'engagement pédagogique",
                    "Mettre en place un calendrier de révision avant le rattrapage",
                ],
                'annee_academique': filters.get('annee'),
                'semestre': filters.get('semestre'),
                'niveau': filters.get('niveau'),
                'matiere': None,
                'etudiants_count': len(alert_students),
                'etudiants_sample': build_sample(alert_students),
                'details': {
                    'etudiants_alerte_count': len(alert_students),
                },
                'created_at': now_iso,
            })

        # Cas surveillance : 3 à 4 matières non validées (À 3 : calendrier de révision avant le rattrapage)
        if warn_students:
            recs.append({
                'id': "rec-r6-vigilance",
                'rule_number': 6,
                'rule_name': "Étudiants avec plusieurs matières non validées",
                'category': 'etudiant',
                'title': f"{len(warn_students)} étudiant(s) en vigilance académique (3 à 4 matières non validées)",
                'short_title': f"Vigilance : {len(warn_students)} étudiant(s) (3-4 échecs)",
                'description': (
                    f"{len(warn_students)} étudiant(s) cumulent 3 ou 4 matières non validées. "
                    f"Un soutien ciblé permettra d'anticiper la session de rattrapage."
                ),
                'indicator_value': len(warn_students),
                'indicator_label': f"{len(warn_students)} étudiants (3-4 échecs)",
                'threshold': "Matières non validées ≥ 3",
                'priority': 'moyenne',
                'priority_label': "Point de vigilance",
                'badge_color': 'amber',
                'is_positive': False,
                'action_recommandee': "Calendrier de révision avant le rattrapage.",
                'actions': [
                    "Calendrier de révision avant le rattrapage",
                    "Informer les étudiants des points exacts à rattraper par module",
                    "Fournir les annales corrigées des matières non validées",
                ],
                'annee_academique': filters.get('annee'),
                'semestre': filters.get('semestre'),
                'niveau': filters.get('niveau'),
                'matiere': None,
                'etudiants_count': len(warn_students),
                'etudiants_sample': build_sample(warn_students),
                'details': {
                    'etudiants_vigilance_count': len(warn_students),
                },
                'created_at': now_iso,
            })

        return recs

    # -------------------------------------------------------------------------
    # RÈGLE 7 : Étudiants proches de la validation
    # Alerte : moyenne de 8 à moins de 10 | Critique : moyenne de 9 à moins de 10
    # Action : Plan de révision ciblé sur les points perdus ; atelier de remédiation pour combler 1 à 2 points
    # -------------------------------------------------------------------------
    def _eval_rule_7_near_validation(self, evaluations, filters, user_can_view_students, now_iso) -> list:
        recs = []
        student_means = defaultdict(list)

        for ev in evaluations:
            if not ev.id_etu_id:
                continue
            _, _, moy = _extract_notes_on_20(ev)
            if moy is not None:
                student_means[ev.id_etu_id].append((ev, moy))

        students_9_to_10 = []  # Critique : 9 <= moy < 10
        students_8_to_9 = []   # Alerte : 8 <= moy < 9

        for etu_id, ev_tuples in student_means.items():
            if not ev_tuples:
                continue
            notes = [m for _, m in ev_tuples]
            avg = round(sum(notes) / len(notes), 2)
            first_ev = ev_tuples[0][0]

            data = {
                'etudiant': first_ev.id_etu,
                'moyenne_generale': avg,
                'points_manquants': round(10.0 - avg, 2),
                'evaluations': ev_tuples,
            }

            if self.config.RULE_7_NEAR_PASS_MIN_CRITICAL <= avg < self.config.RULE_7_NEAR_PASS_MAX:
                students_9_to_10.append(data)
            elif self.config.RULE_7_NEAR_PASS_MIN_ALERT <= avg < self.config.RULE_7_NEAR_PASS_MIN_CRITICAL:
                students_8_to_9.append(data)

        def build_sample(stud_list, max_sample=15):
            sample = []
            for s in stud_list[:max_sample]:
                etu = s['etudiant']
                if user_can_view_students and etu:
                    nom_affiche = f"{etu.nom.upper()} {etu.prenom.title()}".strip()
                    mat = etu.matricule
                else:
                    nom_affiche = "Étudiant (confidentiel)"
                    mat = "MASQUÉ"

                sample.append({
                    'id_etu': etu.id_etu if etu else None,
                    'etudiant': nom_affiche,
                    'matricule': mat,
                    'moyenne': s['moyenne_generale'],
                    'points_manquants': s['points_manquants'],
                })
            return sample

        # Groupe critique (9.0 à < 10.0) : combler moins de 1 point
        if students_9_to_10:
            recs.append({
                'id': "rec-r7-critique-9-10",
                'rule_number': 7,
                'rule_name': "Étudiants proches de la validation",
                'category': 'etudiant',
                'title': f"{len(students_9_to_10)} étudiant(s) très proches de la validation (Moyenne 9.0 à 9.9/20)",
                'short_title': f"Proches validation (9-10) : {len(students_9_to_10)} étudiant(s)",
                'description': (
                    f"{len(students_9_to_10)} étudiant(s) ont une moyenne générale comprise entre 9.0 et 9.9/20. "
                    f"Il ne leur manque que moins de 1 point pour valider. Cible prioritaire d'intervention."
                ),
                'indicator_value': len(students_9_to_10),
                'indicator_label': f"{len(students_9_to_10)} étudiants (9 à <10)",
                'threshold': "Moyenne ∈ [9.0, 10.0[",
                'priority': 'elevee',
                'priority_label': "Priorité critique",
                'badge_color': 'red',
                'is_positive': False,
                'action_recommandee': "Plan de révision ciblé sur les points perdus ; atelier de remédiation pour combler 1 à 2 points.",
                'actions': [
                    "Plan de révision ciblé sur les points perdus ; atelier de remédiation pour combler 1 à 2 points",
                    "Cibler 1 ou 2 modules stratégiques à fort potentiel de points",
                    "Organiser des séances de tutorat dirigé avant la session de rattrapage",
                ],
                'annee_academique': filters.get('annee'),
                'semestre': filters.get('semestre'),
                'niveau': filters.get('niveau'),
                'matiere': None,
                'etudiants_count': len(students_9_to_10),
                'etudiants_sample': build_sample(students_9_to_10),
                'details': {
                    'etudiants_count': len(students_9_to_10),
                },
                'created_at': now_iso,
            })

        # Groupe alerte (8.0 à < 9.0) : combler 1 à 2 points
        if students_8_to_9:
            recs.append({
                'id': "rec-r7-alerte-8-9",
                'rule_number': 7,
                'rule_name': "Étudiants proches de la validation",
                'category': 'etudiant',
                'title': f"{len(students_8_to_9)} étudiant(s) proches du seuil de validation (Moyenne 8.0 à 8.9/20)",
                'short_title': f"Proches validation (8-9) : {len(students_8_to_9)} étudiant(s)",
                'description': (
                    f"{len(students_8_to_9)} étudiant(s) ont une moyenne générale comprise entre 8.0 et 8.9/20. "
                    f"Il leur manque entre 1.0 et 2.0 points pour valider l'année."
                ),
                'indicator_value': len(students_8_to_9),
                'indicator_label': f"{len(students_8_to_9)} étudiants (8 à <9)",
                'threshold': "Moyenne ∈ [8.0, 9.0[",
                'priority': 'moyenne',
                'priority_label': "Point de vigilance",
                'badge_color': 'amber',
                'is_positive': False,
                'action_recommandee': "Plan de révision ciblé sur les points perdus ; atelier de remédiation pour combler 1 à 2 points.",
                'actions': [
                    "Plan de révision ciblé sur les points perdus ; atelier de remédiation pour combler 1 à 2 points",
                    "Identifier les modules où la marge de progression est la plus forte",
                    "Mettre à disposition les annales corrigées des modules à rattraper",
                ],
                'annee_academique': filters.get('annee'),
                'semestre': filters.get('semestre'),
                'niveau': filters.get('niveau'),
                'matiere': None,
                'etudiants_count': len(students_8_to_9),
                'etudiants_sample': build_sample(students_8_to_9),
                'details': {
                    'etudiants_count': len(students_8_to_9),
                },
                'created_at': now_iso,
            })

        return recs

    # -------------------------------------------------------------------------
    # RÈGLE 9 : Évolution entre semestres
    # Alerte : variation >= 1 point | Critique : >= 2 points
    # Action : Baisse : analyser la charge de travail au S2. Hausse : valoriser la progression
    # -------------------------------------------------------------------------
    def _eval_rule_9_semester_variation(self, comparative_qs, filters, now_iso) -> list:
        recs = []
        niv_evals = defaultdict(list)
        for ev in comparative_qs:
            if ev.id_niv_id and ev.id_mod and ev.id_mod.semestre:
                niv_evals[ev.id_niv_id].append(ev)

        for niv_id, ev_list in niv_evals.items():
            s1_notes = []
            s2_notes = []

            for ev in ev_list:
                sem = str(ev.id_mod.semestre).strip()
                sem_clean = sem.upper().replace('SEMESTRE', '').replace('S', '').strip()
                _, _, moy = _extract_notes_on_20(ev)
                if moy is not None:
                    if sem_clean == '1':
                        s1_notes.append(moy)
                    elif sem_clean == '2':
                        s2_notes.append(moy)

            if len(s1_notes) < self.config.MIN_STUDENTS_SAMPLE or len(s2_notes) < self.config.MIN_STUDENTS_SAMPLE:
                continue

            avg_s1 = round(sum(s1_notes) / len(s1_notes), 2)
            avg_s2 = round(sum(s2_notes) / len(s2_notes), 2)
            diff = round(avg_s2 - avg_s1, 2)
            abs_diff = round(abs(diff), 2)

            first_ev = ev_list[0]
            niv_code = first_ev.id_niv.code_niv if first_ev.id_niv else f"Niveau {niv_id}"
            annee_str = first_ev.id_annee.annee_academique if first_ev.id_annee else filters.get('annee')

            if abs_diff >= self.config.RULE_9_VARIATION_ALERT:
                is_critical = abs_diff >= self.config.RULE_9_VARIATION_CRITICAL
                priority = 'elevee' if is_critical else 'moyenne'
                prio_label = "Priorité critique" if is_critical else "Point de vigilance"
                threshold_str = f"Variation ≥ {self.config.RULE_9_VARIATION_CRITICAL} pts" if is_critical else f"Variation ≥ {self.config.RULE_9_VARIATION_ALERT} pt"

                if diff < 0:
                    title = f"Baisse de moyenne entre semestres en {niv_code} (-{abs_diff} pts)"
                    short_title = f"Baisse S1→S2 : {niv_code} (-{abs_diff} pts)"
                    desc = (
                        f"La moyenne générale de la promotion {niv_code} a chuté de {abs_diff} point(s) "
                        f"entre le S1 ({avg_s1}/20) et le S2 ({avg_s2}/20)."
                    )
                    action_rec = "Baisse : analyser la charge de travail au S2."
                    actions_list = [
                        "Baisse : analyser la charge de travail au S2",
                        f"Vérifier le calendrier d'examens et le chevauchement des rendus en {niv_code}",
                        "Organiser un débriefing pédagogique avec les délégués de promotion",
                    ]
                    badge_col = 'red' if is_critical else 'amber'
                    is_pos = False
                else:
                    title = f"Progression marquée entre semestres en {niv_code} (+{abs_diff} pts)"
                    short_title = f"Hausse S1→S2 : {niv_code} (+{abs_diff} pts)"
                    desc = (
                        f"La moyenne générale de {niv_code} a progressé de {abs_diff} point(s) "
                        f"entre le S1 ({avg_s1}/20) et le S2 ({avg_s2}/20)."
                    )
                    action_rec = "Hausse : valoriser la progression."
                    actions_list = [
                        "Hausse : valoriser la progression",
                        "Partager les méthodes de travail efficaces au sein de l'équipe",
                    ]
                    badge_col = 'emerald'
                    is_pos = True
                    priority = 'positive'
                    prio_label = "Progression"

                recs.append({
                    'id': f"rec-r9-niv-{niv_id}",
                    'rule_number': 9,
                    'rule_name': "Évolution entre semestres",
                    'category': 'semestre',
                    'title': title,
                    'short_title': short_title,
                    'description': desc,
                    'indicator_value': diff,
                    'indicator_label': f"Δ {diff:+} pts (S1→S2)",
                    'threshold': threshold_str,
                    'priority': priority,
                    'priority_label': prio_label,
                    'badge_color': badge_col,
                    'is_positive': is_pos,
                    'action_recommandee': action_rec,
                    'actions': actions_list,
                    'annee_academique': annee_str,
                    'semestre': None,
                    'niveau': niv_code,
                    'matiere': None,
                    'etudiants_count': len(set(ev.id_etu_id for ev in ev_list if ev.id_etu_id)),
                    'details': {
                        'moyenne_s1': avg_s1,
                        'moyenne_s2': avg_s2,
                        'variation': diff,
                    },
                    'created_at': now_iso,
                })

        return recs

    # -------------------------------------------------------------------------
    # RÈGLE 11 : Amélioration significative (résultat positif)
    # Alerte : moyenne +1 point OU réussite +10 points
    # Majeure : moyenne +2 points OU réussite +20 points
    # Action : Valoriser la progression et diffuser les bonnes pratiques
    # -------------------------------------------------------------------------
    def _eval_rule_11_significant_improvement(self, comparative_qs, filters, now_iso) -> list:
        recs = []
        niv_evals = defaultdict(list)
        for ev in comparative_qs:
            if ev.id_niv_id and ev.id_mod and ev.id_mod.semestre:
                niv_evals[ev.id_niv_id].append(ev)

        for niv_id, ev_list in niv_evals.items():
            s1_evals = []
            s2_evals = []

            for ev in ev_list:
                sem = str(ev.id_mod.semestre).strip()
                sem_clean = sem.upper().replace('SEMESTRE', '').replace('S', '').strip()
                _, _, moy = _extract_notes_on_20(ev)
                if moy is not None:
                    if sem_clean == '1':
                        s1_evals.append((ev, moy))
                    elif sem_clean == '2':
                        s2_evals.append((ev, moy))

            if len(s1_evals) < self.config.MIN_STUDENTS_SAMPLE or len(s2_evals) < self.config.MIN_STUDENTS_SAMPLE:
                continue

            avg_s1 = round(sum(m for _, m in s1_evals) / len(s1_evals), 2)
            avg_s2 = round(sum(m for _, m in s2_evals) / len(s2_evals), 2)
            delta_avg = round(avg_s2 - avg_s1, 2)

            pass_s1 = round((sum(1 for _, m in s1_evals if m >= 10.0) / len(s1_evals)) * 100.0, 1)
            pass_s2 = round((sum(1 for _, m in s2_evals if m >= 10.0) / len(s2_evals)) * 100.0, 1)
            delta_pass = round(pass_s2 - pass_s1, 1)

            if delta_avg >= self.config.RULE_11_AVG_GAIN_ALERT or delta_pass >= self.config.RULE_11_PASS_GAIN_ALERT:
                first_ev = ev_list[0]
                niv_code = first_ev.id_niv.code_niv if first_ev.id_niv else f"Niveau {niv_id}"
                annee_str = first_ev.id_annee.annee_academique if first_ev.id_annee else filters.get('annee')

                is_major = (
                    delta_avg >= self.config.RULE_11_AVG_GAIN_CRITICAL
                    or delta_pass >= self.config.RULE_11_PASS_GAIN_CRITICAL
                )
                prio_label = "Progression majeure" if is_major else "Amélioration notable"

                recs.append({
                    'id': f"rec-r11-niv-{niv_id}",
                    'rule_number': 11,
                    'rule_name': "Amélioration significative (résultat positif)",
                    'category': 'matiere',
                    'title': f"Progression académique significative en {niv_code} (+{delta_avg} pts)",
                    'short_title': f"Succès : {niv_code} (+{delta_avg} pts, +{delta_pass}% réussite)",
                    'description': (
                        f"La promotion {niv_code} progresse nettement entre semestres : moyenne en hausse de +{delta_avg} point(s) "
                        f"({avg_s1}/20 au S1 → {avg_s2}/20 au S2) et taux de réussite en hausse de +{delta_pass} points de pourcentage."
                    ),
                    'indicator_value': delta_avg,
                    'indicator_label': f"+{delta_avg} pts • +{delta_pass}% réussite",
                    'threshold': "Moyenne +1 pt ou réussite +10 pts",
                    'priority': 'positive',
                    'priority_label': prio_label,
                    'badge_color': 'emerald',
                    'is_positive': True,
                    'action_recommandee': "Valoriser la progression et diffuser les bonnes pratiques.",
                    'actions': [
                        "Valoriser la progression et diffuser les bonnes pratiques",
                        "Identifier et documenter les facteurs clés de réussite",
                        "Féliciter la promotion pour les efforts d'apprentissage fournis",
                    ],
                    'annee_academique': annee_str,
                    'semestre': None,
                    'niveau': niv_code,
                    'matiere': None,
                    'etudiants_count': len(set(ev.id_etu_id for ev in ev_list if ev.id_etu_id)),
                    'details': {
                        'moyenne_s1': avg_s1,
                        'moyenne_s2': avg_s2,
                        'gain_moyenne': delta_avg,
                        'gain_taux_reussite': delta_pass,
                    },
                    'created_at': now_iso,
                })

        return recs

    # -------------------------------------------------------------------------
    # RÈGLE 12 : Faible réussite après rattrapage
    # Alerte : < 50% de réussite | Critique : < 30%
    # Action : Revoir l’organisation et la préparation aux rattrapages
    # -------------------------------------------------------------------------
    def _eval_rule_12_low_rattrapage_pass_rate(self, evaluations, filters, now_iso) -> list:
        recs = []
        mod_groups = defaultdict(list)
        for ev in evaluations:
            if ev.id_mod_id:
                mod_groups[ev.id_mod_id].append(ev)

        for mod_id, ev_list in mod_groups.items():
            rattrapage_evals = []
            for ev in ev_list:
                if ev.note_rattrapage is not None:
                    note_rat = float(ev.note_rattrapage)
                    is_pass = False
                    if ev.moyenne_rattrapage is not None:
                        is_pass = float(ev.moyenne_rattrapage) >= self.config.SEUIL_VALIDATION
                    elif ev.resultat_rattrapage == ResultatChoices.ADMIS:
                        is_pass = True
                    else:
                        is_pass = (note_rat >= self.config.SEUIL_VALIDATION)

                    rattrapage_evals.append((ev, note_rat, is_pass))

            total_rat = len(rattrapage_evals)
            if total_rat < self.config.MIN_RATTRAPAGE_SAMPLE:
                continue

            passed_count = sum(1 for _, _, p in rattrapage_evals if p)
            pass_rate = round((passed_count / total_rat) * 100.0, 1)

            if pass_rate < self.config.RULE_12_POST_RAT_PASS_ALERT:
                first_ev = ev_list[0]
                mod_name = first_ev.id_mod.nom_mod if first_ev.id_mod else f"Module {mod_id}"
                sem = first_ev.id_mod.semestre if first_ev.id_mod else filters.get('semestre')
                niv_code = first_ev.id_niv.code_niv if first_ev.id_niv else filters.get('niveau')
                annee_str = first_ev.id_annee.annee_academique if first_ev.id_annee else filters.get('annee')

                is_critical = pass_rate < self.config.RULE_12_POST_RAT_PASS_CRITICAL
                priority = 'elevee' if is_critical else 'moyenne'
                prio_label = "Priorité critique" if is_critical else "Point de vigilance"
                threshold_str = f"Réussite rattrapage < {self.config.RULE_12_POST_RAT_PASS_CRITICAL}%" if is_critical else f"Réussite rattrapage < {self.config.RULE_12_POST_RAT_PASS_ALERT}%"

                recs.append({
                    'id': f"rec-r12-mod-{mod_id}",
                    'rule_number': 12,
                    'rule_name': "Faible réussite après rattrapage",
                    'category': 'matiere',
                    'title': f"Faible réussite après rattrapage en {mod_name} ({pass_rate}%)",
                    'short_title': f"Échec rattrapage : {mod_name} ({pass_rate}%)",
                    'description': (
                        f"Seulement {pass_rate}% de réussite constatée après rattrapage en {mod_name} "
                        f"({passed_count} admis sur {total_rat} étudiants évalués en 2e session)."
                    ),
                    'indicator_value': pass_rate,
                    'indicator_label': f"{pass_rate}% de réussite rattrapage",
                    'threshold': threshold_str,
                    'priority': priority,
                    'priority_label': prio_label,
                    'badge_color': 'red' if is_critical else 'amber',
                    'is_positive': False,
                    'action_recommandee': "Revoir l’organisation et la préparation aux rattrapages.",
                    'actions': [
                        "Revoir l’organisation et la préparation aux rattrapages",
                        "Prévoir des séances de révision intensive avant la session de rattrapage",
                        "Vérifier l'alignement du sujet de rattrapage avec les objectifs du cours",
                    ],
                    'annee_academique': annee_str,
                    'semestre': sem,
                    'niveau': niv_code,
                    'matiere': mod_name,
                    'etudiants_count': total_rat,
                    'details': {
                        'etudiants_rattrapage': total_rat,
                        'etudiants_admis': passed_count,
                        'taux_reussite': pass_rate,
                    },
                    'created_at': now_iso,
                })

        return recs

    def _deduplicate_recommendations(self, recs: list[dict]) -> list[dict]:
        """Déduplique en conservant la priorité la plus haute."""
        priority_weights = {'elevee': 2, 'moyenne': 1, 'positive': 3}
        seen = {}
        for r in recs:
            key = (
                r.get('rule_number'),
                r.get('matiere') or r.get('niveau') or r.get('id'),
            )
            if key not in seen:
                seen[key] = r
            else:
                existing_weight = priority_weights.get(seen[key]['priority'], 0)
                current_weight = priority_weights.get(r['priority'], 0)
                if current_weight > existing_weight:
                    seen[key] = r
        return list(seen.values())
