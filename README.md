# Student Dashboard

Bienvenue sur **Student Dashboard**, une application web complète conçue pour suivre, analyser et visualiser les performances académiques des étudiants. Ce projet combine un backend robuste en Python/Django, un pipeline ETL pour le traitement des données, et un frontend moderne en React pour une expérience utilisateur fluide.

## Fonctionnalités principales

- **Tableau de bord interactif** : Visualisation des données (moyennes, répartitions, progrès) grâce à des graphiques dynamiques.
- **Pipeline ETL** : Importation et nettoyage automatique des données étudiantes (depuis des fichiers Excel/CSV) avec Pandas et Openpyxl.
- **Calculs de notation avancés** : Logique métier personnalisée pour le calcul des moyennes et l'évaluation des résultats académiques.
- **API RESTful** : Backend sécurisé avec Django REST Framework et authentification JWT.
- **Interface moderne** : Design réactif et épuré construit avec React, Vite et Tailwind CSS.

## Stack Technique

### Backend
- **Langage** : Python
- **Framework** : Django & Django REST Framework
- **Données & ETL** : Pandas, NumPy, Openpyxl
- **Base de données** : PostgreSQL (`psycopg2-binary`)
- **Sécurité** : `djangorestframework-simplejwt`, `django-cors-headers`

### Frontend
- **Langage** : JavaScript (ES6+)
- **Framework** : React 19 + Vite
- **Stylisme** : Tailwind CSS
- **Visualisation** : Recharts
- **Routing & Requêtes** : React Router DOM, Axios
- **Icônes** : Lucide React

## Structure détaillée du projet

```text
student-dashboard/
│
├── academics/                    # Application Django : Gestion des programmes et cours
│   ├── migrations/               # Fichiers de migration de la base de données
│   ├── __init__.py
│   ├── admin.py                  # Interface d'administration Django
│   ├── apps.py                   # Configuration de l'application
│   ├── models.py                 # Modèles : Program, Course, Semester, etc.
│   ├── serializers.py            # Sérialiseurs DRF pour l'API
│   ├── views.py                  # Vues API (ViewSets)
│   ├── urls.py                   # Routage des endpoints
│   └── tests.py                  # Tests unitaires
│
├── students/                     # Application Django : Gestion des étudiants
│   ├── migrations/
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py                 # Modèles : Student, Enrollment, etc.
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   └── tests.py
│
├── dashboard/                    # Application Django : Tableau de bord et métriques
│   ├── migrations/
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py                 # Modèles liés aux statistiques (si nécessaire)
│   ├── services.py               # Logique métier : calcul des moyennes, agrégations
│   ├── views.py                  # Vues API pour les données du dashboard
│   ├── urls.py
│   └── tests.py
│
├── etl/                          # Pipeline ETL (Extract, Transform, Load)
│   ├── __init__.py
│   ├── extract.py                # Extraction des données depuis Excel/CSV
│   ├── transform.py              # Nettoyage, validation et transformation des données
│   ├── load.py                   # Chargement des données dans la base PostgreSQL
│   ├── utils.py                  # Fonctions utilitaires (parsing, formatage)
│   └── management/
│       └── commands/
│           └── run_etl.py        # Commande Django personnalisée : python manage.py run_etl
│
├── frontend/                     # Application React (Vite)
│   ├── node_modules/
│   ├── public/                   # Assets statiques (favicon, images)
│   ├── src/
│   │   ├── assets/               # Images, icônes locales
│   │   ├── components/           # Composants réutilisables (Header, Sidebar, Cards...)
│   │   │   ├── ui/               # Composants d'interface de base (boutons, inputs)
│   │   │   └── charts/           # Composants de visualisation (Recharts)
│   │   ├── pages/                # Pages principales (Dashboard, Students, Academics...)
│   │   ├── services/             # Appels API via Axios
│   │   ├── hooks/                # Hooks personnalisés (useAuth, useStudents...)
│   │   ├── context/              # Context API pour l'état global (authentification)
│   │   ├── utils/                # Fonctions utilitaires (formatage, validation)
│   │   ├── App.jsx               # Composant racine
│   │   ├── main.jsx              # Point d'entrée React
│   │   └── index.css             # Styles globaux (Tailwind)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js            # Configuration Vite
│   ├── tailwind.config.js        # Configuration Tailwind CSS
│   └── postcss.config.js
│
├── config/                       # Configuration principale du projet Django
│   ├── __init__.py
│   ├── settings.py               # Paramètres Django (DB, apps, middleware, JWT...)
│   ├── urls.py                   # Routage principal (inclut les apps)
│   ├── wsgi.py                   # Point d'entrée WSGI pour déploiement
│   └── asgi.py                   # Point d'entrée ASGI
│
├── .env                          # Variables d'environnement locales (NE PAS commiter)
├── .env.example                  # Modèle des variables d'environnement
├── .gitignore                    # Fichiers à ignorer par Git
├── manage.py                     # Point d'entrée Django
├── requirements.txt              # Dépendances Python
└── README.md                     # Documentation du projet
