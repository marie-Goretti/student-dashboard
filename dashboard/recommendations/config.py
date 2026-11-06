"""
Configuration centralisée du moteur de recommandations pédagogiques LBS.
Définit les seuils d'alerte et critiques pour les 10 règles actives :
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
from dataclasses import dataclass


@dataclass
class RecommendationsConfig:
    """Paramètres et seuils configurables pour les règles de recommandations."""

    # Normes officielles de notation
    NOTE_MAX: float = 20.0
    SEUIL_VALIDATION: float = 10.0
    COEF_DEVOIR: float = 0.4
    COEF_EXAMEN: float = 0.6

    # Échantillons minimaux pour pertinence statistique
    MIN_STUDENTS_SAMPLE: int = 3
    MIN_RATTRAPAGE_SAMPLE: int = 2

    # --- RÈGLE 1 : Écart entre devoirs et examens ---
    # Alerte : écart >= 2 points | Critique : >= 4 points
    RULE_1_DIFF_ALERT: float = 2.0
    RULE_1_DIFF_CRITICAL: float = 4.0

    # --- RÈGLE 2 : Échec à la moyenne finale du module ---
    # Alerte : >= 60% sous 10 | Critique : >= 70%
    RULE_2_FAILURE_ALERT: float = 60.0
    RULE_2_FAILURE_CRITICAL: float = 70.0

    # --- RÈGLE 3 : Échec aux examens ---
    # Alerte : >= 60% sous 10 à l'examen | Critique : >= 70%
    RULE_3_EXAM_FAILURE_ALERT: float = 60.0
    RULE_3_EXAM_FAILURE_CRITICAL: float = 70.0

    # --- RÈGLE 4 : Faible contrôle continu ---
    # Alerte : >= 50% avec moyenne de devoirs sous 10 | Critique : >= 65%
    RULE_4_DEVOIR_FAILURE_ALERT: float = 50.0
    RULE_4_DEVOIR_FAILURE_CRITICAL: float = 65.0

    # --- RÈGLE 5 : Zéros aux devoirs ---
    # Alerte : >= 15% de notes à 0 | Critique : >= 25%
    RULE_5_ZERO_DEVOIR_ALERT: float = 15.0
    RULE_5_ZERO_DEVOIR_CRITICAL: float = 25.0

    # --- RÈGLE 6 : Étudiants avec plusieurs matières non validées ---
    # Surveillance dès 3 matières | Alerte : >= 5 matières | Critique : >= 7 matières
    RULE_6_UNVALIDATED_WARN: int = 3
    RULE_6_UNVALIDATED_ALERT: int = 5
    RULE_6_UNVALIDATED_CRITICAL: int = 7

    # --- RÈGLE 7 : Étudiants proches de la validation ---
    # Alerte : moyenne 8 à < 10 | Critique : moyenne 9 à < 10
    RULE_7_NEAR_PASS_MIN_ALERT: float = 8.0
    RULE_7_NEAR_PASS_MIN_CRITICAL: float = 9.0
    RULE_7_NEAR_PASS_MAX: float = 10.0

    # --- RÈGLE 9 : Évolution entre semestres ---
    # Alerte : variation >= 1 point | Critique : variation >= 2 points
    RULE_9_VARIATION_ALERT: float = 1.0
    RULE_9_VARIATION_CRITICAL: float = 2.0

    # --- RÈGLE 11 : Amélioration significative (résultat positif) ---
    # Alerte : moyenne +1 point OU réussite +10 points
    # Majeure : moyenne +2 points OU réussite +20 points
    RULE_11_AVG_GAIN_ALERT: float = 1.0
    RULE_11_AVG_GAIN_CRITICAL: float = 2.0
    RULE_11_PASS_GAIN_ALERT: float = 10.0
    RULE_11_PASS_GAIN_CRITICAL: float = 20.0

    # --- RÈGLE 12 : Faible réussite après rattrapage ---
    # Alerte : moins de 50% de réussite | Critique : moins de 30%
    RULE_12_POST_RAT_PASS_ALERT: float = 50.0
    RULE_12_POST_RAT_PASS_CRITICAL: float = 30.0


DEFAULT_CONFIG = RecommendationsConfig()
