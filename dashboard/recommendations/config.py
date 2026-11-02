"""
Configuration centralisée du moteur de recommandations pédagogiques.
Définit les seuils d'alerte et seuils critiques pour les 12 règles métier :
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
from dataclasses import dataclass


@dataclass
class RecommendationsConfig:
    """Paramètres et seuils configurables pour les 12 règles de recommandations."""

    # --- Normes officielles de notation de l'établissement ---
    NOTE_MAX: float = 20.0
    SEUIL_VALIDATION: float = 10.0
    COEF_DEVOIR: float = 0.4
    COEF_EXAMEN: float = 0.6

    # --- Garde-fous méthodologiques et tailles d'échantillons ---
    MIN_STUDENTS_SAMPLE: int = 5  # Minimum d'étudiants évalués pour analyse collective
    MIN_RATTRAPAGE_SAMPLE: int = 3  # Minimum d'étudiants en rattrapage pour analyse post-rattrapage
    EXCLURE_NOTES_MANQUANTES: bool = True  # Exclure au lieu d'assimiler arbitrairement à zéro

    # --- RÈGLE 1 : Écart entre devoirs et examens ---
    # Écart absolu >= 2 points (alerte) | Écart absolu >= 4 points (critique)
    RULE_1_DIFF_ALERT: float = 2.0
    RULE_1_DIFF_CRITICAL: float = 4.0

    # --- RÈGLE 2 : Taux d'échec à la moyenne finale ---
    # >= 30% d'étudiants sous 10/20 (alerte) | >= 50% (critique)
    RULE_2_FAILURE_ALERT: float = 30.0
    RULE_2_FAILURE_CRITICAL: float = 50.0

    # --- RÈGLE 3 : Taux d'échec aux examens ---
    # >= 30% d'étudiants sous 10/20 (alerte) | >= 50% (critique)
    RULE_3_EXAM_FAILURE_ALERT: float = 30.0
    RULE_3_EXAM_FAILURE_CRITICAL: float = 50.0

    # --- RÈGLE 4 : Faibles performances au contrôle continu ---
    # >= 30% d'étudiants avec une moyenne de devoirs sous 10/20 (alerte) | >= 50% (critique)
    RULE_4_DEVOIR_FAILURE_ALERT: float = 30.0
    RULE_4_DEVOIR_FAILURE_CRITICAL: float = 50.0

    # --- RÈGLE 5 : Proportion de zéros aux devoirs ---
    # >= 15% de notes égales à 0 (alerte) | >= 25% (critique)
    RULE_5_ZERO_DEVOIR_ALERT: float = 15.0
    RULE_5_ZERO_DEVOIR_CRITICAL: float = 25.0

    # --- RÈGLE 6 : Étudiants ayant plusieurs matières non validées ---
    # Au moins 3 matières non validées (alerte) | Au moins 5 matières non validées (critique)
    RULE_6_UNVALIDATED_ALERT: int = 3
    RULE_6_UNVALIDATED_CRITICAL: int = 5

    # --- RÈGLE 7 : Étudiants proches du seuil de validation ---
    # Moyenne finale comprise entre 8 et moins de 10/20 (alerte) | Moyenne finale comprise entre 9 et moins de 10/20 (critique)
    RULE_7_NEAR_PASS_MIN_ALERT: float = 8.0
    RULE_7_NEAR_PASS_MIN_CRITICAL: float = 9.0
    RULE_7_NEAR_PASS_MAX: float = 10.0

    # --- RÈGLE 8 : Échec persistant après rattrapage ---
    # >= 30% des étudiants concernés restent sous 10/20 (alerte) | >= 50% (critique)
    RULE_8_POST_RAT_FAIL_ALERT: float = 30.0
    RULE_8_POST_RAT_FAIL_CRITICAL: float = 50.0

    # --- RÈGLE 9 : Progression ou dégradation entre semestres ---
    # Variation d'au moins 1 point de moyenne (alerte) | Baisse ou hausse d'au moins 2 points (critique)
    RULE_9_VARIATION_ALERT: float = 1.0
    RULE_9_VARIATION_CRITICAL: float = 2.0

    # --- RÈGLE 10 : Forte dispersion des notes ---
    # Écart-type >= 4 points (alerte) | Écart-type >= 5 points (critique)
    RULE_10_DISPERSION_ALERT: float = 4.0
    RULE_10_DISPERSION_CRITICAL: float = 5.0

    # --- RÈGLE 11 : Amélioration significative (Résultats positifs) ---
    # Hausse moyenne >= 1 pt OU hausse réussite >= 10 points % (alerte/progrès notable)
    # Hausse moyenne >= 2 pts OU hausse réussite >= 20 points % (critique/progression majeure)
    RULE_11_AVG_GAIN_ALERT: float = 1.0
    RULE_11_AVG_GAIN_CRITICAL: float = 2.0
    RULE_11_PASS_GAIN_ALERT: float = 10.0
    RULE_11_PASS_GAIN_CRITICAL: float = 20.0

    # --- RÈGLE 12 : Faible taux de réussite après rattrapage ---
    # Moins de 50% de réussite (alerte) | Moins de 30% de réussite (critique)
    RULE_12_POST_RAT_PASS_ALERT: float = 50.0
    RULE_12_POST_RAT_PASS_CRITICAL: float = 30.0


# Instance de configuration partagée
DEFAULT_CONFIG = RecommendationsConfig()
