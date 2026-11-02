"""
Moteur d'analyse et de génération de recommandations pédagogiques automatiques.
Applique rigoureusement les 12 règles métier académiques :
1. Écart entre devoirs et examens
2. Taux d'échec à la moyenne finale
3. Taux d'échec aux examens
4. Faibles performances au contrôle continu
5. Proportion de zéros aux devoirs
6. Étudiants ayant plusieurs matières non validées
7. Étudiants proches du seuil de validation
8. Échec persistant après rattrapage
9. Progression ou dégradation entre semestres
10. Forte dispersion des notes
11. Amélioration significative
12. Faible taux de réussite après rattrapage
"""
import math
from datetime import datetime
from collections import defaultdict, Counter
from academics.models import ResultatChoices
from .config import RecommendationsConfig, DEFAULT_CONFIG


def _clamp(val: float, min_val: float = 0.0, max_val: float = 20.0) -> float:
    return max(min_val, min(max_val, val))


def _extract_notes_on_20(ev) -> tuple[float | None, float | None, float | None]:
    """
    Extrait (note_devoir, note_examen, moyenne) ramenées sur 20.
    Prend en compte les notes brutes et pondérées (40% / 60%).
    """
    devoir = None
    if ev.note_devoir_40 is not None:
        devoir = float(ev.note_devoir_40) / 0.4
    elif ev.note_devoir1 is not None:
        devoir = float(ev.note_devoir1)
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
    """Détermine si une évaluation est un échec selon la règle officielle."""
    if ev.resultat == ResultatChoices.NON_EVALUE:
        return False
    if ev.resultat == ResultatChoices.AJOURNE:
        return True
    if moy_val is not None:
        return moy_val < seuil_validation
    return False


def _is_passed_evaluation(ev, moy_val: float | None, seuil_validation: float = 10.0) -> bool:
    """Détermine si une évaluation est validée (Admis)."""
    if ev.resultat == ResultatChoices.NON_EVALUE:
        return False
    if ev.resultat == ResultatChoices.ADMIS:
        return True
    if moy_val is not None:
        return moy_val >= seuil_validation
    return False


def _compute_std_dev(values: list[float]) -> float:
    """Calcule l'écart-type d'une série de notes."""
    n = len(values)
    if n < 2:
        return 0.0
    mean_val = sum(values) / n
    variance = sum((x - mean_val) ** 2 for x in values) / n
    return math.sqrt(variance)


class RecommendationsEngine:
    """Moteur décisionnel exécutant les 12 règles métier."""

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
                    'counts_by_priority': {'elevee': 0, 'moyenne': 0, 'faible': 0, 'positive': 0},
                    'counts_by_rule': {f"r{i}": 0 for i in range(1, 13)},
                },
                'recommandations': [],
                'info_message': "Aucune évaluation disponible pour les filtres sélectionnés.",
            }

        recommendations = []
        comparative_qs = full_cohort_queryset if full_cohort_queryset is not None else queryset

        # 1. Écart entre devoirs et examens
        recommendations.extend(self._eval_rule_1_devoir_examen_gap(evaluations, filters, now_iso))

        # 2. Taux d'échec à la moyenne finale
        recommendations.extend(self._eval_rule_2_final_failure_rate(evaluations, filters, now_iso))

        # 3. Taux d'échec aux examens
        recommendations.extend(self._eval_rule_3_exam_failure_rate(evaluations, filters, now_iso))

        # 4. Faibles performances au contrôle continu
        recommendations.extend(self._eval_rule_4_devoir_failure_rate(evaluations, filters, now_iso))

        # 5. Proportion de zéros aux devoirs
        recommendations.extend(self._eval_rule_5_zero_devoir_rate(evaluations, filters, now_iso))

        # 6. Étudiants ayant plusieurs matières non validées
        recommendations.extend(self._eval_rule_6_multiple_unvalidated(evaluations, filters, user_can_view_students, now_iso))

        # 7. Étudiants proches du seuil de validation
        recommendations.extend(self._eval_rule_7_near_validation(evaluations, filters, user_can_view_students, now_iso))

        # 8. Échec persistant après rattrapage
        recommendations.extend(self._eval_rule_8_post_rattrapage_failure(evaluations, filters, now_iso))

        # 9. Progression ou dégradation entre semestres
        recommendations.extend(self._eval_rule_9_semester_variation(comparative_qs, filters, now_iso))

        # 10. Forte dispersion des notes
        recommendations.extend(self._eval_rule_10_grade_dispersion(evaluations, filters, now_iso))

        # 11. Amélioration significative (Succès / Résultat positif)
        recommendations.extend(self._eval_rule_11_significant_improvement(comparative_qs, filters, now_iso))

        # 12. Faible taux de réussite après rattrapage
        recommendations.extend(self._eval_rule_12_low_rattrapage_pass_rate(evaluations, filters, now_iso))

        # Déduplication et conservation de la priorité la plus élevée par entité
        deduped = self._deduplicate_recommendations(recommendations)

        priority_order = {'elevee': 0, 'moyenne': 1, 'faible': 2, 'positive': 3}
        deduped.sort(key=lambda r: (priority_order.get(r['priority'], 99), r.get('rule_number', 0)))

        counts_by_prio = {'elevee': 0, 'moyenne': 0, 'faible': 0, 'positive': 0}
        counts_by_rule = {f"r{i}": 0 for i in range(1, 13)}

        for r in deduped:
            p = r.get('priority', 'faible')
            if p in counts_by_prio:
                counts_by_prio[p] += 1
            r_num = r.get('rule_number')
            if r_num and 1 <= r_num <= 12:
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
                info_msg = "Aucune alerte académique détectée : les indicateurs analysés sont conformes aux objectifs."

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
    # Seuil d'alerte : Écart absolu >= 2 points | Seuil critique : >= 4 points
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
                prio_label = "Priorité critique" if is_critical else "Priorité moyenne"
                threshold_str = f"Écart absolu ≥ {self.config.RULE_1_DIFF_CRITICAL} pts" if is_critical else f"Écart absolu ≥ {self.config.RULE_1_DIFF_ALERT} pts"

                if diff_raw > 0:
                    direction = "devoir_superieur"
                    direction_label = "Devoir > Examen"
                    desc = (
                        f"Un écart significatif de {abs_diff} point(s) est constaté entre la moyenne des devoirs ({avg_devoir}/20) "
                        f"et celle des examens ({avg_exam}/20) en {mod_name}. Les étudiants chutent lors de l'examen individuel sur table."
                    )
                    action_rec = (
                        f"Analyser le niveau de difficulté de l'examen final de {mod_name} et entraîner les étudiants aux conditions d'examen individuel."
                    )
                    actions_list = [
                        f"Vérifier le barème et la durée de l'examen terminal en {mod_name}",
                        "Organiser un examen blanc chronométré pour habituer les étudiants à la gestion du temps",
                        "Sensibiliser sur la part d'autonomie individuelle requise en examen",
                    ]
                else:
                    direction = "examen_superieur"
                    direction_label = "Examen > Devoir"
                    desc = (
                        f"La moyenne des examens ({avg_exam}/20) dépasse nettement celle des devoirs ({avg_devoir}/20) "
                        f"de {abs_diff} point(s) en {mod_name}. Le contrôle continu est sous-investi par rapport à l'examen."
                    )
                    action_rec = (
                        f"Examiner les modalités d'évaluation du contrôle continu en {mod_name} et encourager une implication régulière."
                    )
                    actions_list = [
                        f"Vérifier le taux de remise des devoirs et les retards sur {mod_name}",
                        "Clarifier le barème et les consignes des travaux de contrôle continu",
                        "Rappeler aux étudiants le coefficient déterminant du contrôle continu (40%)",
                    ]

                recs.append({
                    'id': f"rec-r1-mod-{mod_id}",
                    'rule_number': 1,
                    'rule_name': "Écart entre devoirs et examens",
                    'category': 'devoir_examen',
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
                        'sens': direction,
                    },
                    'created_at': now_iso,
                })

        return recs

    # -------------------------------------------------------------------------
    # RÈGLE 2 : Taux d'échec à la moyenne finale
    # Seuil d'alerte : >= 30% d'étudiants sous 10/20 | Seuil critique : >= 50%
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
                prio_label = "Priorité critique" if is_critical else "Priorité moyenne"
                threshold_str = f"Taux d'échec ≥ {self.config.RULE_2_FAILURE_CRITICAL}%" if is_critical else f"Taux d'échec ≥ {self.config.RULE_2_FAILURE_ALERT}%"

                moyennes = [m for _, m in valid_evals if m is not None]
                avg_mod = round(sum(moyennes) / len(moyennes), 2) if moyennes else None

                recs.append({
                    'id': f"rec-r2-mod-{mod_id}",
                    'rule_number': 2,
                    'rule_name': "Taux d'échec à la moyenne finale",
                    'category': 'matiere',
                    'title': f"Taux d'échec élevé à la moyenne finale en {mod_name}",
                    'short_title': f"Échec moyenne finale : {mod_name} ({failure_rate}%)",
                    'description': (
                        f"{failure_rate}% des étudiants ont une moyenne finale sous 10/20 en {mod_name} "
                        f"({failure_count} sur {total_count} étudiants évalués). Moyenne observée : {avg_mod if avg_mod is not None else 'N/A'}/20."
                    ),
                    'indicator_value': failure_rate,
                    'indicator_label': f"{failure_rate}% d'échec final",
                    'threshold': threshold_str,
                    'priority': priority,
                    'priority_label': prio_label,
                    'badge_color': 'red' if is_critical else 'amber',
                    'is_positive': False,
                    'action_recommandee': f"Mettre en place des séances de renforcement ciblées et un soutien méthodologique en {mod_name}.",
                    'actions': [
                        f"Identifier les chapitres concentrant les plus grandes difficultés en {mod_name}",
                        "Proposer des plages de soutien dirigé avant les évaluations finales",
                        "Préparer un plan d'entraînement spécifique pour la session de rattrapage",
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
                        'moyenne_matiere': avg_mod,
                    },
                    'created_at': now_iso,
                })

        return recs

    # -------------------------------------------------------------------------
    # RÈGLE 3 : Taux d'échec aux examens
    # Seuil d'alerte : >= 30% d'étudiants sous 10/20 | Seuil critique : >= 50%
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
                prio_label = "Priorité critique" if is_critical else "Priorité moyenne"
                threshold_str = f"Échec examen ≥ {self.config.RULE_3_EXAM_FAILURE_CRITICAL}%" if is_critical else f"Échec examen ≥ {self.config.RULE_3_EXAM_FAILURE_ALERT}%"

                avg_exam = round(sum(ex for _, ex in exam_evals) / total_exam, 2)

                recs.append({
                    'id': f"rec-r3-mod-{mod_id}",
                    'rule_number': 3,
                    'rule_name': "Taux d'échec aux examens",
                    'category': 'matiere',
                    'title': f"Taux d'échec élevé aux examens en {mod_name}",
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
                    'action_recommandee': f"Proposer des annales corrigées et des ateliers d'entraînement aux examens en {mod_name}.",
                    'actions': [
                        f"Organiser des séances de révision des annales d'examen pour {mod_name}",
                        "Clarifier la méthodologie attendue lors de la rédaction des copies d'examen",
                        "Vérifier l'alignement entre les objectifs pédagogiques et les sujets d'examen",
                    ],
                    'annee_academique': annee_str,
                    'semestre': sem,
                    'niveau': niv_code,
                    'matiere': mod_name,
                    'etudiants_count': total_exam,
                    'details': {
                        'evaluations_examen': total_exam,
                        'examens_echec': len(failed_exam),
                        'taux_echec_examen': fail_rate,
                        'moyenne_examen': avg_exam,
                    },
                    'created_at': now_iso,
                })

        return recs

    # -------------------------------------------------------------------------
    # RÈGLE 4 : Faibles performances au contrôle continu
    # Seuil d'alerte : >= 30% d'étudiants avec moyenne devoirs < 10/20 | Critique : >= 50%
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
                prio_label = "Priorité critique" if is_critical else "Priorité moyenne"
                threshold_str = f"Échec devoirs ≥ {self.config.RULE_4_DEVOIR_FAILURE_CRITICAL}%" if is_critical else f"Échec devoirs ≥ {self.config.RULE_4_DEVOIR_FAILURE_ALERT}%"

                avg_devoir = round(sum(dev for _, dev in devoir_evals) / total_devoir, 2)

                recs.append({
                    'id': f"rec-r4-mod-{mod_id}",
                    'rule_number': 4,
                    'rule_name': "Faibles performances au contrôle continu",
                    'category': 'matiere',
                    'title': f"Faibles performances au contrôle continu en {mod_name}",
                    'short_title': f"Échec devoirs : {mod_name} ({fail_rate}%)",
                    'description': (
                        f"{fail_rate}% des étudiants ont une moyenne de devoirs sous 10/20 en {mod_name} "
                        f"({len(failed_devoir)} sur {total_devoir} étudiants, moyenne devoirs : {avg_devoir}/20)."
                    ),
                    'indicator_value': fail_rate,
                    'indicator_label': f"{fail_rate}% devoirs < 10",
                    'threshold': threshold_str,
                    'priority': priority,
                    'priority_label': prio_label,
                    'badge_color': 'red' if is_critical else 'amber',
                    'is_positive': False,
                    'action_recommandee': f"Adapter le rythme et l'accompagnement des travaux continus en {mod_name}.",
                    'actions': [
                        f"Vérifier la progressivité pédagogique des devoirs continus en {mod_name}",
                        "Instaurer des plages de tutorat méthodologique pour les premiers travaux",
                        "Encourager un feedback plus précoce pour corriger les erreurs avant les échéances",
                    ],
                    'annee_academique': annee_str,
                    'semestre': sem,
                    'niveau': niv_code,
                    'matiere': mod_name,
                    'etudiants_count': total_devoir,
                    'details': {
                        'evaluations_devoir': total_devoir,
                        'devoirs_echec': len(failed_devoir),
                        'taux_echec_devoir': fail_rate,
                        'moyenne_devoir': avg_devoir,
                    },
                    'created_at': now_iso,
                })

        return recs

    # -------------------------------------------------------------------------
    # RÈGLE 5 : Proportion de zéros aux devoirs
    # Seuil d'alerte : >= 15% de notes égales à 0 | Seuil critique : >= 25%
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

            zeros_count = sum(1 for _, dev in devoir_evals if dev == 0.0)
            zero_rate = round((zeros_count / total_devoir) * 100.0, 1)

            if zero_rate >= self.config.RULE_5_ZERO_DEVOIR_ALERT:
                first_ev = ev_list[0]
                mod_name = first_ev.id_mod.nom_mod if first_ev.id_mod else f"Module {mod_id}"
                sem = first_ev.id_mod.semestre if first_ev.id_mod else filters.get('semestre')
                niv_code = first_ev.id_niv.code_niv if first_ev.id_niv else filters.get('niveau')
                annee_str = first_ev.id_annee.annee_academique if first_ev.id_annee else filters.get('annee')

                is_critical = zero_rate >= self.config.RULE_5_ZERO_DEVOIR_CRITICAL
                priority = 'elevee' if is_critical else 'moyenne'
                prio_label = "Priorité critique" if is_critical else "Priorité moyenne"
                threshold_str = f"Zéros devoirs ≥ {self.config.RULE_5_ZERO_DEVOIR_CRITICAL}%" if is_critical else f"Zéros devoirs ≥ {self.config.RULE_5_ZERO_DEVOIR_ALERT}%"

                recs.append({
                    'id': f"rec-r5-mod-{mod_id}",
                    'rule_number': 5,
                    'rule_name': "Proportion de zéros aux devoirs",
                    'category': 'matiere',
                    'title': f"Proportion anormale de zéros aux devoirs en {mod_name}",
                    'short_title': f"Zéros devoirs : {mod_name} ({zero_rate}%)",
                    'description': (
                        f"{zero_rate}% de notes égales à 0 détectées en contrôle continu sur {mod_name} "
                        f"({zeros_count} sur {total_devoir} étudiants). Ce signal traduit un taux élevé de non-remise de travaux ou d'abandon."
                    ),
                    'indicator_value': zero_rate,
                    'indicator_label': f"{zero_rate}% de zéros",
                    'threshold': threshold_str,
                    'priority': priority,
                    'priority_label': prio_label,
                    'badge_color': 'red' if is_critical else 'amber',
                    'is_positive': False,
                    'action_recommandee': f"Enquêter sur les non-remises de devoirs en {mod_name} et instaurer des alertes de calendrier.",
                    'actions': [
                        f"Identifier les étudiants ayant obtenu 0 en devoirs sur {mod_name} pour vérifier les motifs de non-remise",
                        "Mettre en place un rappel automatique des échéances de dépôt de devoirs",
                        "Définir une procédure de rattrapage des devoirs non rendus sous justificatif",
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
    # RÈGLE 6 : Étudiants ayant plusieurs matières non validées
    # Seuil d'alerte : Au moins 3 matières non validées | Seuil critique : Au moins 5 matières
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

        critical_students = []  # >= 5 matières non validées
        alert_students = []     # 3 ou 4 matières non validées

        for etu_id, data in student_fails.items():
            count = len(data['failed_modules'])
            if count >= self.config.RULE_6_UNVALIDATED_CRITICAL:
                critical_students.append(data)
            elif count >= self.config.RULE_6_UNVALIDATED_ALERT:
                alert_students.append(data)

        def build_sample(stud_list, max_sample=10):
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

        # Cas critique : >= 5 matières non validées
        if critical_students:
            recs.append({
                'id': "rec-r6-critique",
                'rule_number': 6,
                'rule_name': "Étudiants ayant plusieurs matières non validées",
                'category': 'etudiant',
                'title': f"{len(critical_students)} étudiant(s) en échec critique (≥ 5 matières non validées)",
                'short_title': f"Échec critique : {len(critical_students)} étudiant(s) (≥ 5 échecs)",
                'description': (
                    f"{len(critical_students)} étudiant(s) cumulent au moins 5 matières non validées sur la période. "
                    f"Risque majeur de décrochage nécessitant une convocation pédagogique urgente."
                ),
                'indicator_value': len(critical_students),
                'indicator_label': f"{len(critical_students)} étudiants (≥ 5 échecs)",
                'threshold': f"Matières non validées ≥ {self.config.RULE_6_UNVALIDATED_CRITICAL}",
                'priority': 'elevee',
                'priority_label': "Priorité critique",
                'badge_color': 'red',
                'is_positive': False,
                'action_recommandee': "Convoquer immédiatement les étudiants en entretien pédagogique et établir un contrat de remédiation.",
                'actions': [
                    "Convoquer les étudiants pour un bilan individuel approfondi",
                    "Prioriser les matières fondamentales et à fort coefficient pour les rattrapages",
                    "Nommer un tuteur référent pour un suivi bi-hebdomadaire",
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

        # Cas alerte : 3 ou 4 matières non validées
        if alert_students:
            recs.append({
                'id': "rec-r6-alerte",
                'rule_number': 6,
                'rule_name': "Étudiants ayant plusieurs matières non validées",
                'category': 'etudiant',
                'title': f"{len(alert_students)} étudiant(s) en vigilance académique (3 à 4 matières non validées)",
                'short_title': f"Vigilance : {len(alert_students)} étudiant(s) (3-4 échecs)",
                'description': (
                    f"{len(alert_students)} étudiant(s) cumulent 3 ou 4 matières non validées. "
                    f"Un soutien ciblé permettra d'éviter le basculement vers un décrochage sévère."
                ),
                'indicator_value': len(alert_students),
                'indicator_label': f"{len(alert_students)} étudiants (3-4 échecs)",
                'threshold': f"Matières non validées ≥ {self.config.RULE_6_UNVALIDATED_ALERT}",
                'priority': 'moyenne',
                'priority_label': "Priorité moyenne",
                'badge_color': 'amber',
                'is_positive': False,
                'action_recommandee': "Proposer un calendrier de révision ciblé avant les examens de rattrapage.",
                'actions': [
                    "Informer les étudiants des points exacts à rattraper par module",
                    "Organiser des séances de tutorat par les pairs",
                    "Fournir les annales corrigées des matières non validées",
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

        return recs

    # -------------------------------------------------------------------------
    # RÈGLE 7 : Étudiants proches du seuil de validation
    # Seuil d'alerte : Moyenne finale dans [8, 10[ | Seuil critique : Moyenne finale dans [9, 10[
    # -------------------------------------------------------------------------
    def _eval_rule_7_near_validation(self, evaluations, filters, user_can_view_students, now_iso) -> list:
        recs = []

        # Identifier les évaluations et étudiants se trouvant dans la zone charnière
        near_critical = []  # [9.0, 10.0[ -> à moins d'un point ! (critique / priorité élevée)
        near_alert = []     # [8.0, 9.0[  -> à moins de 2 points ! (alerte / priorité moyenne)

        for ev in evaluations:
            _, _, moy = _extract_notes_on_20(ev)
            if moy is not None and self.config.RULE_7_NEAR_PASS_MIN_ALERT <= moy < self.config.RULE_7_NEAR_PASS_MAX:
                mod_name = ev.id_mod.nom_mod if ev.id_mod else "Module"
                etu_nom = "Étudiant"
                mat = ""
                if user_can_view_students and ev.id_etu:
                    etu_nom = f"{ev.id_etu.nom.upper()} {ev.id_etu.prenom.title()}".strip()
                    mat = ev.id_etu.matricule

                entry = {
                    'id_etu': ev.id_etu_id if ev.id_etu else None,
                    'etudiant': etu_nom,
                    'matricule': mat,
                    'module': mod_name,
                    'moyenne': moy,
                    'points_manquants': round(10.0 - moy, 2),
                }

                if moy >= self.config.RULE_7_NEAR_PASS_MIN_CRITICAL:
                    near_critical.append(entry)
                else:
                    near_alert.append(entry)

        # Seuil critique : [9.0, 10.0[ -> Reconversion immédiate accessible
        if near_critical:
            recs.append({
                'id': "rec-r7-proche-critique",
                'rule_number': 7,
                'rule_name': "Étudiants proches du seuil de validation",
                'category': 'rattrapage',
                'title': f"{len(near_critical)} cas à moins d'1 point de la validation (9.0 à 9.9/20)",
                'short_title': f"Cible prioritaire rattrapage : {len(near_critical)} cas (≥ 9/20)",
                'description': (
                    f"{len(near_critical)} évaluation(s) se situent entre 9.0 et 9.9/20. "
                    f"Ces étudiants sont très proches de la validation (moins d'un point manquant). La réussite au rattrapage ou au rachat est hautement accessible."
                ),
                'indicator_value': len(near_critical),
                'indicator_label': f"{len(near_critical)} cas en [9, 10[",
                'threshold': f"Moyenne finale ∈ [{self.config.RULE_7_NEAR_PASS_MIN_CRITICAL}, {self.config.RULE_7_NEAR_PASS_MAX}[",
                'priority': 'elevee',
                'priority_label': "Priorité élevée / Reconversion",
                'badge_color': 'red',
                'is_positive': False,
                'action_recommandee': "Proposer un plan de révision ciblé sur les points perdus pour sécuriser l'admission au rattrapage.",
                'actions': [
                    "Convoquer en priorité pour les séances de préparation aux rattrapages",
                    "Cibler les révisions exclusivement sur les questions manquées à l'examen initial",
                    "Maximiser le taux de conversion vers l'admission définitive",
                ],
                'annee_academique': filters.get('annee'),
                'semestre': filters.get('semestre'),
                'niveau': filters.get('niveau'),
                'matiere': None,
                'etudiants_count': len(near_critical),
                'etudiants_sample': near_critical[:10],
                'details': {
                    'nombre_cas_critiques': len(near_critical),
                },
                'created_at': now_iso,
            })

        # Seuil alerte : [8.0, 9.0[ -> Zone de vigilance / rattrapage
        if near_alert:
            recs.append({
                'id': "rec-r7-proche-alerte",
                'rule_number': 7,
                'rule_name': "Étudiants proches du seuil de validation",
                'category': 'rattrapage',
                'title': f"{len(near_alert)} cas proches de la validation (8.0 à 8.9/20)",
                'short_title': f"Proches validation : {len(near_alert)} cas (8 à 8.9/20)",
                'description': (
                    f"{len(near_alert)} évaluation(s) se situent entre 8.0 et 8.9/20 (1 à 2 points manquants). "
                    f"Un travail de renforcement ciblé avant le rattrapage leur permettra de franchir la barre des 10/20."
                ),
                'indicator_value': len(near_alert),
                'indicator_label': f"{len(near_alert)} cas en [8, 9[",
                'threshold': f"Moyenne finale ∈ [{self.config.RULE_7_NEAR_PASS_MIN_ALERT}, {self.config.RULE_7_NEAR_PASS_MIN_CRITICAL}[",
                'priority': 'moyenne',
                'priority_label': "Priorité moyenne",
                'badge_color': 'amber',
                'is_positive': False,
                'action_recommandee': "Organiser des ateliers de remédiation ciblée pour combler l'écart de 1 à 2 points.",
                'actions': [
                    "Fournir des exercices types corrigés sur les notions clés",
                    "Mettre en place des binômes d'entraide avec des étudiants admis",
                ],
                'annee_academique': filters.get('annee'),
                'semestre': filters.get('semestre'),
                'niveau': filters.get('niveau'),
                'matiere': None,
                'etudiants_count': len(near_alert),
                'etudiants_sample': near_alert[:10],
                'details': {
                    'nombre_cas_alerte': len(near_alert),
                },
                'created_at': now_iso,
            })

        return recs

    # -------------------------------------------------------------------------
    # RÈGLE 8 : Échec persistant après rattrapage
    # Seuil d'alerte : >= 30% restent sous 10/20 | Seuil critique : >= 50%
    # -------------------------------------------------------------------------
    def _eval_rule_8_post_rattrapage_failure(self, evaluations, filters, now_iso) -> list:
        recs = []
        mod_groups = defaultdict(list)

        for ev in evaluations:
            # Évaluation ayant fait l'objet d'un rattrapage
            if ev.note_rattrapage is not None or ev.moyenne_rattrapage is not None:
                mod_groups[ev.id_mod_id].append(ev)

        for mod_id, ev_list in mod_groups.items():
            total_rat = len(ev_list)
            if total_rat < self.config.MIN_RATTRAPAGE_SAMPLE:
                continue

            failed_after = []
            for ev in ev_list:
                m_rat = float(ev.moyenne_rattrapage) if ev.moyenne_rattrapage is not None else (
                    float(ev.note_rattrapage) if ev.note_rattrapage is not None else None
                )
                if ev.resultat_rattrapage == ResultatChoices.AJOURNE or (m_rat is not None and m_rat < self.config.SEUIL_VALIDATION):
                    failed_after.append(ev)

            fail_rate = round((len(failed_after) / total_rat) * 100.0, 1)

            if fail_rate >= self.config.RULE_8_POST_RAT_FAIL_ALERT:
                first_ev = ev_list[0]
                mod_name = first_ev.id_mod.nom_mod if first_ev.id_mod else f"Module {mod_id}"
                sem = first_ev.id_mod.semestre if first_ev.id_mod else filters.get('semestre')
                niv_code = first_ev.id_niv.code_niv if first_ev.id_niv else filters.get('niveau')
                annee_str = first_ev.id_annee.annee_academique if first_ev.id_annee else filters.get('annee')

                is_critical = fail_rate >= self.config.RULE_8_POST_RAT_FAIL_CRITICAL
                priority = 'elevee' if is_critical else 'moyenne'
                prio_label = "Priorité critique" if is_critical else "Priorité moyenne"
                threshold_str = f"Échec post-rattrapage ≥ {self.config.RULE_8_POST_RAT_FAIL_CRITICAL}%" if is_critical else f"Échec post-rattrapage ≥ {self.config.RULE_8_POST_RAT_FAIL_ALERT}%"

                recs.append({
                    'id': f"rec-r8-mod-{mod_id}",
                    'rule_number': 8,
                    'rule_name': "Échec persistant après rattrapage",
                    'category': 'rattrapage',
                    'title': f"Échec persistant après rattrapage en {mod_name}",
                    'short_title': f"Échec post-rattrapage : {mod_name} ({fail_rate}%)",
                    'description': (
                        f"{fail_rate}% des étudiants ayant passé le rattrapage restent sous 10/20 en {mod_name} "
                        f"({len(failed_after)} sur {total_rat} étudiants). La deuxième chance n'a pas suffi à combler les difficultés."
                    ),
                    'indicator_value': fail_rate,
                    'indicator_label': f"{fail_rate}% d'échec persistant",
                    'threshold': threshold_str,
                    'priority': priority,
                    'priority_label': prio_label,
                    'badge_color': 'red' if is_critical else 'amber',
                    'is_positive': False,
                    'action_recommandee': f"Réévaluer les prérequis fondamentaux et renforcer le dispositif d'accompagnement pré-rattrapage en {mod_name}.",
                    'actions': [
                        f"Analyser les copies de rattrapage de {mod_name} pour identifier les blocages récurrents",
                        "Mettre en place des stages intensifs de pré-rentrée ou de réorientation pédagogique",
                        "Vérifier si le format de l'épreuve de rattrapage est adapté à la mesure des acquis",
                    ],
                    'annee_academique': annee_str,
                    'semestre': sem,
                    'niveau': niv_code,
                    'matiere': mod_name,
                    'etudiants_count': total_rat,
                    'details': {
                        'total_rattrapage': total_rat,
                        'echecs_post_rattrapage': len(failed_after),
                        'taux_echec_post_rattrapage': fail_rate,
                    },
                    'created_at': now_iso,
                })

        return recs

    # -------------------------------------------------------------------------
    # RÈGLE 9 : Progression ou dégradation entre semestres
    # Seuil d'alerte : Variation d'au moins 1 pt | Seuil critique : Baisse ou hausse d'au moins 2 pts
    # -------------------------------------------------------------------------
    def _eval_rule_9_semester_variation(self, full_queryset, filters, now_iso) -> list:
        recs = []
        evals_all = list(full_queryset.select_related('id_etu', 'id_mod', 'id_niv', 'id_annee'))
        cohorts = defaultdict(lambda: defaultdict(list))

        for ev in evals_all:
            if not ev.id_niv_id:
                continue
            sem_norm = None
            if ev.id_mod and ev.id_mod.semestre:
                s = str(ev.id_mod.semestre).strip().upper()
                if '1' in s:
                    sem_norm = 'S1'
                elif '2' in s:
                    sem_norm = 'S2'

            if sem_norm:
                _, _, moy = _extract_notes_on_20(ev)
                if moy is not None:
                    cohorts[ev.id_niv_id][sem_norm].append(moy)

        for niv_id, sem_dict in cohorts.items():
            if 'S1' not in sem_dict or 'S2' not in sem_dict:
                continue

            s1_notes = sem_dict['S1']
            s2_notes = sem_dict['S2']

            if len(s1_notes) < self.config.MIN_STUDENTS_SAMPLE or len(s2_notes) < self.config.MIN_STUDENTS_SAMPLE:
                continue

            avg_s1 = round(sum(s1_notes) / len(s1_notes), 2)
            avg_s2 = round(sum(s2_notes) / len(s2_notes), 2)
            diff = round(avg_s2 - avg_s1, 2)
            abs_diff = round(abs(diff), 2)

            first_ev = next((ev for ev in evals_all if ev.id_niv_id == niv_id), None)
            niv_code = first_ev.id_niv.code_niv if first_ev and first_ev.id_niv else f"Niveau {niv_id}"
            annee_str = first_ev.id_annee.annee_academique if first_ev and first_ev.id_annee else filters.get('annee')

            # Dégradation entre semestres (diff <= -1.0)
            if diff <= -self.config.RULE_9_VARIATION_ALERT:
                is_critical = abs_diff >= self.config.RULE_9_VARIATION_CRITICAL
                priority = 'elevee' if is_critical else 'moyenne'
                prio_label = "Priorité critique" if is_critical else "Priorité moyenne"
                threshold_str = f"Baisse ≥ {self.config.RULE_9_VARIATION_CRITICAL} pts" if is_critical else f"Baisse ≥ {self.config.RULE_9_VARIATION_ALERT} pt"

                recs.append({
                    'id': f"rec-r9-degrad-niv-{niv_id}",
                    'rule_number': 9,
                    'rule_name': "Progression ou dégradation entre semestres",
                    'category': 'semestre',
                    'title': f"Dégradation des performances en {niv_code} entre S1 et S2 (-{abs_diff} pts)",
                    'short_title': f"Baisse S2/S1 : {niv_code} (-{abs_diff} pts)",
                    'description': (
                        f"La cohorte {niv_code} a enregistré une baisse de {abs_diff} point(s) entre le S1 ({avg_s1}/20) "
                        f"et le S2 ({avg_s2}/20). Une analyse ciblée des modules du second semestre s'impose."
                    ),
                    'indicator_value': -abs_diff,
                    'indicator_label': f"-{abs_diff} pts (S2 vs S1)",
                    'threshold': threshold_str,
                    'priority': priority,
                    'priority_label': prio_label,
                    'badge_color': 'red' if is_critical else 'amber',
                    'is_positive': False,
                    'action_recommandee': f"Analyser la charge de travail et les matières critiques au S2 en {niv_code}.",
                    'actions': [
                        f"Identifier les modules du S2 ayant connu la plus forte dégradation en {niv_code}",
                        "Recueillir les retours d'expérience des délégués étudiants sur le calendrier du second semestre",
                        "Renforcer le tutorat sur les enseignements complexes du S2",
                    ],
                    'annee_academique': annee_str,
                    'semestre': 'S2',
                    'niveau': niv_code,
                    'matiere': None,
                    'etudiants_count': max(len(s1_notes), len(s2_notes)),
                    'details': {
                        'moyenne_s1': avg_s1,
                        'moyenne_s2': avg_s2,
                        'variation_points': -abs_diff,
                    },
                    'created_at': now_iso,
                })

            # Progression entre semestres (diff >= +1.0)
            elif diff >= self.config.RULE_9_VARIATION_ALERT:
                is_critical = abs_diff >= self.config.RULE_9_VARIATION_CRITICAL
                recs.append({
                    'id': f"rec-r9-prog-niv-{niv_id}",
                    'rule_number': 9,
                    'rule_name': "Progression ou dégradation entre semestres",
                    'category': 'semestre',
                    'title': f"Progression notable des performances en {niv_code} (+{abs_diff} pts)",
                    'short_title': f"Hausse S2/S1 : {niv_code} (+{abs_diff} pts)",
                    'description': (
                        f"La cohorte {niv_code} a progressé de +{abs_diff} point(s) entre le S1 ({avg_s1}/20) "
                        f"et le S2 ({avg_s2}/20). Résultat positif témoignant d'une belle dynamique."
                    ),
                    'indicator_value': abs_diff,
                    'indicator_label': f"+{abs_diff} pts (S2 vs S1)",
                    'threshold': f"Hausse ≥ +{self.config.RULE_9_VARIATION_CRITICAL} pts" if is_critical else f"Hausse ≥ +{self.config.RULE_9_VARIATION_ALERT} pt",
                    'priority': 'positive',
                    'priority_label': "Progression majeure" if is_critical else "Amélioration constatée",
                    'badge_color': 'emerald',
                    'is_positive': True,
                    'action_recommandee': f"Valoriser la progression des étudiants de {niv_code} et pérenniser les méthodes de travail adoptées au S2.",
                    'actions': [
                        f"Féliciter les étudiants et enseignants de {niv_code} pour les progrès accomplis",
                        "Capitaliser sur les démarches pédagogiques qui ont produit cette hausse",
                    ],
                    'annee_academique': annee_str,
                    'semestre': 'S2',
                    'niveau': niv_code,
                    'matiere': None,
                    'etudiants_count': max(len(s1_notes), len(s2_notes)),
                    'details': {
                        'moyenne_s1': avg_s1,
                        'moyenne_s2': avg_s2,
                        'variation_points': abs_diff,
                    },
                    'created_at': now_iso,
                })

        return recs

    # -------------------------------------------------------------------------
    # RÈGLE 10 : Forte dispersion des notes
    # Seuil d'alerte : Écart-type >= 4 points | Seuil critique : >= 5 points
    # -------------------------------------------------------------------------
    def _eval_rule_10_grade_dispersion(self, evaluations, filters, now_iso) -> list:
        recs = []
        mod_groups = defaultdict(list)
        for ev in evaluations:
            if ev.id_mod_id:
                mod_groups[ev.id_mod_id].append(ev)

        for mod_id, ev_list in mod_groups.items():
            valid_notes = []
            for ev in ev_list:
                _, _, moy = _extract_notes_on_20(ev)
                if moy is not None:
                    valid_notes.append(moy)

            total_count = len(valid_notes)
            if total_count < self.config.MIN_STUDENTS_SAMPLE:
                continue

            std_dev = round(_compute_std_dev(valid_notes), 2)

            if std_dev >= self.config.RULE_10_DISPERSION_ALERT:
                first_ev = ev_list[0]
                mod_name = first_ev.id_mod.nom_mod if first_ev.id_mod else f"Module {mod_id}"
                sem = first_ev.id_mod.semestre if first_ev.id_mod else filters.get('semestre')
                niv_code = first_ev.id_niv.code_niv if first_ev.id_niv else filters.get('niveau')
                annee_str = first_ev.id_annee.annee_academique if first_ev.id_annee else filters.get('annee')

                is_critical = std_dev >= self.config.RULE_10_DISPERSION_CRITICAL
                priority = 'elevee' if is_critical else 'moyenne'
                prio_label = "Priorité critique" if is_critical else "Priorité moyenne"
                threshold_str = f"Écart-type ≥ {self.config.RULE_10_DISPERSION_CRITICAL} pts" if is_critical else f"Écart-type ≥ {self.config.RULE_10_DISPERSION_ALERT} pts"

                min_note = round(min(valid_notes), 1)
                max_note = round(max(valid_notes), 1)
                avg_note = round(sum(valid_notes) / total_count, 2)
                nb_faibles = sum(1 for n in valid_notes if n < 8.0)
                nb_excellents = sum(1 for n in valid_notes if n >= 14.0)

                recs.append({
                    'id': f"rec-r10-mod-{mod_id}",
                    'rule_number': 10,
                    'rule_name': "Forte dispersion des notes",
                    'category': 'dispersion',
                    'title': f"Forte dispersion des notes en {mod_name} (σ = {std_dev} pts)",
                    'short_title': f"Dispersion : {mod_name} (σ = {std_dev})",
                    'description': (
                        f"Écart-type prononcé de {std_dev}/20 en {mod_name} (notes de {min_note} à {max_note}/20, moyenne : {avg_note}/20). "
                        f"Forte disparité avec {nb_faibles} note(s) < 8/20 et {nb_excellents} note(s) ≥ 14/20."
                    ),
                    'indicator_value': std_dev,
                    'indicator_label': f"Écart-type σ = {std_dev}",
                    'threshold': threshold_str,
                    'priority': priority,
                    'priority_label': prio_label,
                    'badge_color': 'red' if is_critical else 'amber',
                    'is_positive': False,
                    'action_recommandee': f"Proposer un accompagnement pédagogique différencié et mobiliser les étudiants avancés comme mentors.",
                    'actions': [
                        f"Adapter le format des travaux dirigés de {mod_name} avec des parcours de renforcement",
                        "Mobiliser les étudiants en tête pour animer des groupes d'entraide",
                        "Vérifier si un déficit de prérequis explique la scission des résultats",
                    ],
                    'annee_academique': annee_str,
                    'semestre': sem,
                    'niveau': niv_code,
                    'matiere': mod_name,
                    'etudiants_count': total_count,
                    'details': {
                        'ecart_type': std_dev,
                        'note_min': min_note,
                        'note_max': max_note,
                        'moyenne': avg_note,
                        'nb_inf_8': nb_faibles,
                        'nb_sup_14': nb_excellents,
                    },
                    'created_at': now_iso,
                })

        return recs

    # -------------------------------------------------------------------------
    # RÈGLE 11 : Amélioration significative (Succès)
    # Seuil d'alerte : Hausse moy >= 1 pt OU réussite >= 10 points %
    # Seuil critique : Hausse moy >= 2 pts OU réussite >= 20 points %
    # -------------------------------------------------------------------------
    def _eval_rule_11_significant_improvement(self, full_queryset, filters, now_iso) -> list:
        recs = []
        evals_all = list(full_queryset.select_related('id_mod', 'id_niv', 'id_annee'))
        mod_sem_data = defaultdict(lambda: {'S1': [], 'S2': [], 'module_obj': None})

        for ev in evals_all:
            if not ev.id_mod_id:
                continue
            sem_norm = None
            if ev.id_mod and ev.id_mod.semestre:
                s = str(ev.id_mod.semestre).strip().upper()
                if '1' in s:
                    sem_norm = 'S1'
                elif '2' in s:
                    sem_norm = 'S2'

            if sem_norm:
                _, _, moy = _extract_notes_on_20(ev)
                if ev.resultat != ResultatChoices.NON_EVALUE or moy is not None:
                    mod_key = ev.id_mod.nom_mod.strip().upper() if (ev.id_mod and ev.id_mod.nom_mod) else str(ev.id_mod_id)
                    mod_sem_data[mod_key][sem_norm].append((ev, moy))
                    if not mod_sem_data[mod_key]['module_obj']:
                        mod_sem_data[mod_key]['module_obj'] = ev.id_mod

        for mod_key, data in mod_sem_data.items():
            s1_list = data['S1']
            s2_list = data['S2']

            if len(s1_list) < self.config.MIN_STUDENTS_SAMPLE or len(s2_list) < self.config.MIN_STUDENTS_SAMPLE:
                continue

            # 1. Gain de moyenne
            s1_moys = [m for _, m in s1_list if m is not None]
            s2_moys = [m for _, m in s2_list if m is not None]
            avg_gain = round((sum(s2_moys) / len(s2_moys)) - (sum(s1_moys) / len(s1_moys)), 2) if s1_moys and s2_moys else 0.0

            # 2. Gain de taux de réussite
            s1_passed = sum(1 for ev, m in s1_list if _is_passed_evaluation(ev, m, self.config.SEUIL_VALIDATION))
            s2_passed = sum(1 for ev, m in s2_list if _is_passed_evaluation(ev, m, self.config.SEUIL_VALIDATION))
            s1_rate = round((s1_passed / len(s1_list)) * 100.0, 1)
            s2_rate = round((s2_passed / len(s2_list)) * 100.0, 1)
            pass_gain = round(s2_rate - s1_rate, 1)

            is_critical = (avg_gain >= self.config.RULE_11_AVG_GAIN_CRITICAL) or (pass_gain >= self.config.RULE_11_PASS_GAIN_CRITICAL)
            is_alert = (avg_gain >= self.config.RULE_11_AVG_GAIN_ALERT) or (pass_gain >= self.config.RULE_11_PASS_GAIN_ALERT)

            if is_alert:
                mod_obj = data['module_obj']
                mod_name = mod_obj.nom_mod if mod_obj else mod_key
                mod_id = mod_obj.id_mod if mod_obj else mod_key

                gain_desc_parts = []
                if avg_gain >= self.config.RULE_11_AVG_GAIN_ALERT:
                    gain_desc_parts.append(f"+{avg_gain} pts de moyenne")
                if pass_gain >= self.config.RULE_11_PASS_GAIN_ALERT:
                    gain_desc_parts.append(f"+{pass_gain}% de réussite ({s1_rate}% au S1 → {s2_rate}% au S2)")

                desc = f"Amélioration significative observée en {mod_name} : {', '.join(gain_desc_parts)}."
                prio_label = "Progression majeure" if is_critical else "Amélioration significative"

                recs.append({
                    'id': f"rec-r11-mod-{mod_id}",
                    'rule_number': 11,
                    'rule_name': "Amélioration significative",
                    'category': 'matiere',
                    'title': f"Amélioration significative en {mod_name} ({', '.join(gain_desc_parts)})",
                    'short_title': f"Succès : {mod_name} (+{pass_gain if pass_gain > 0 else avg_gain} pts)",
                    'description': desc,
                    'indicator_value': max(avg_gain, pass_gain),
                    'indicator_label': f"+{pass_gain}% réussite" if pass_gain >= self.config.RULE_11_PASS_GAIN_ALERT else f"+{avg_gain} pts moy",
                    'threshold': "Hausse ≥ +2 pts moy ou +20% réussite" if is_critical else "Hausse ≥ +1 pt moy ou +10% réussite",
                    'priority': 'positive',
                    'priority_label': prio_label,
                    'badge_color': 'emerald',
                    'is_positive': True,
                    'action_recommandee': f"Valoriser la progression en {mod_name} et diffuser les bonnes pratiques associées.",
                    'actions': [
                        f"Partager les méthodes pédagogiques appliquées en {mod_name} avec les autres enseignants",
                        "Féliciter la promotion pour cette dynamique d'apprentissage positive",
                    ],
                    'annee_academique': filters.get('annee'),
                    'semestre': 'S2',
                    'niveau': filters.get('niveau'),
                    'matiere': mod_name,
                    'etudiants_count': len(s2_list),
                    'details': {
                        'gain_moyenne': avg_gain,
                        'gain_taux_reussite': pass_gain,
                        'taux_reussite_s1': s1_rate,
                        'taux_reussite_s2': s2_rate,
                    },
                    'created_at': now_iso,
                })

        return recs

    # -------------------------------------------------------------------------
    # RÈGLE 12 : Faible taux de réussite après rattrapage
    # Seuil d'alerte : Moins de 50% de réussite | Seuil critique : Moins de 30%
    # -------------------------------------------------------------------------
    def _eval_rule_12_low_rattrapage_pass_rate(self, evaluations, filters, now_iso) -> list:
        recs = []
        mod_groups = defaultdict(list)

        for ev in evaluations:
            if ev.note_rattrapage is not None or ev.moyenne_rattrapage is not None:
                mod_groups[ev.id_mod_id].append(ev)

        for mod_id, ev_list in mod_groups.items():
            total_rat = len(ev_list)
            if total_rat < self.config.MIN_RATTRAPAGE_SAMPLE:
                continue

            admis_rat = []
            for ev in ev_list:
                m_rat = float(ev.moyenne_rattrapage) if ev.moyenne_rattrapage is not None else (
                    float(ev.note_rattrapage) if ev.note_rattrapage is not None else None
                )
                if ev.resultat_rattrapage == ResultatChoices.ADMIS or (m_rat is not None and m_rat >= self.config.SEUIL_VALIDATION):
                    admis_rat.append(ev)

            pass_rate = round((len(admis_rat) / total_rat) * 100.0, 1)

            if pass_rate < self.config.RULE_12_POST_RAT_PASS_ALERT:
                first_ev = ev_list[0]
                mod_name = first_ev.id_mod.nom_mod if first_ev.id_mod else f"Module {mod_id}"
                sem = first_ev.id_mod.semestre if first_ev.id_mod else filters.get('semestre')
                niv_code = first_ev.id_niv.code_niv if first_ev.id_niv else filters.get('niveau')
                annee_str = first_ev.id_annee.annee_academique if first_ev.id_annee else filters.get('annee')

                is_critical = pass_rate < self.config.RULE_12_POST_RAT_PASS_CRITICAL
                priority = 'elevee' if is_critical else 'moyenne'
                prio_label = "Priorité critique" if is_critical else "Priorité moyenne"
                threshold_str = f"Réussite rattrapage < {self.config.RULE_12_POST_RAT_PASS_CRITICAL}%" if is_critical else f"Réussite rattrapage < {self.config.RULE_12_POST_RAT_PASS_ALERT}%"

                recs.append({
                    'id': f"rec-r12-mod-{mod_id}",
                    'rule_number': 12,
                    'rule_name': "Faible taux de réussite après rattrapage",
                    'category': 'rattrapage',
                    'title': f"Faible taux de réussite après rattrapage en {mod_name} ({pass_rate}%)",
                    'short_title': f"Faible réussite rattrapage : {mod_name} ({pass_rate}%)",
                    'description': (
                        f"Seulement {pass_rate}% de réussite après rattrapage en {mod_name} "
                        f"({len(admis_rat)} admis sur {total_rat} étudiants évalués). Le dispositif de rattrapage ne convertit pas suffisamment d'ajournements."
                    ),
                    'indicator_value': pass_rate,
                    'indicator_label': f"{pass_rate}% de réussite rattrapage",
                    'threshold': threshold_str,
                    'priority': priority,
                    'priority_label': prio_label,
                    'badge_color': 'red' if is_critical else 'amber',
                    'is_positive': False,
                    'action_recommandee': f"Revoir l'organisation et la préparation pédagogique aux rattrapages pour {mod_name}.",
                    'actions': [
                        f"Organiser des séances de tutorat obligatoire pour les étudiants convoqués au rattrapage de {mod_name}",
                        "Vérifier la représentativité de l'examen de rattrapage par rapport au cours dispensé",
                        "Prévoir des ateliers de remédiation ciblés en petits groupes",
                    ],
                    'annee_academique': annee_str,
                    'semestre': sem,
                    'niveau': niv_code,
                    'matiere': mod_name,
                    'etudiants_count': total_rat,
                    'details': {
                        'total_rattrapage': total_rat,
                        'admis_rattrapage': len(admis_rat),
                        'taux_reussite_rattrapage': pass_rate,
                    },
                    'created_at': now_iso,
                })

        return recs

    # -------------------------------------------------------------------------
    # Déduplication et sélection de la priorité la plus élevée
    # -------------------------------------------------------------------------
    def _deduplicate_recommendations(self, recommendations: list) -> list:
        priority_weights = {'elevee': 4, 'moyenne': 3, 'faible': 2, 'positive': 1}
        seen = {}

        for rec in recommendations:
            key = (
                rec.get('rule_number'),
                rec.get('category'),
                rec.get('matiere') or rec.get('niveau') or rec.get('id'),
                rec.get('annee_academique'),
                rec.get('semestre'),
            )
            existing = seen.get(key)
            if existing is None:
                seen[key] = rec
            else:
                current_weight = priority_weights.get(rec.get('priority'), 0)
                existing_weight = priority_weights.get(existing.get('priority'), 0)
                if current_weight > existing_weight:
                    seen[key] = rec

        result = list(seen.values())
        for rec in result:
            if 'recommandation_principale' not in rec:
                rec['recommandation_principale'] = rec.get('action_recommandee', '')
            if 'count' not in rec:
                rec['count'] = rec.get('etudiants_count', 0)
            if 'students_count' not in rec:
                rec['students_count'] = rec.get('etudiants_count', 0)
            if 'percentage' not in rec:
                val = rec.get('indicator_value')
                rec['percentage'] = float(val) if isinstance(val, (int, float)) and 0 <= val <= 100 else 0.0
            if 'diagnostic' not in rec:
                rec['diagnostic'] = rec.get('description', '')
            if 'default_open' not in rec:
                rec['default_open'] = (rec.get('priority') == 'elevee')

        return result
