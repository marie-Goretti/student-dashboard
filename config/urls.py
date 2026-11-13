from django.contrib import admin
from django.urls import path, include
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth.models import User


@api_view(["GET"])
def api_root(request, format=None):
    return Response({
        "auth_login": reverse("token_obtain_pair", request=request, format=format),
        "auth_refresh": reverse("token_refresh", request=request, format=format),
        "auth_register": request.build_absolute_uri("/api/auth/register/"),
        "students": request.build_absolute_uri("/api/students/"),
        "academics": request.build_absolute_uri("/api/academics/"),
        "etl": request.build_absolute_uri("/api/etl/"),
        "dashboard": request.build_absolute_uri("/api/dashboard/"),
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    username   = request.data.get("username", "").strip()
    password   = request.data.get("password", "")
    email      = request.data.get("email", "").strip()
    first_name = request.data.get("first_name", "").strip()
    last_name  = request.data.get("last_name", "").strip()

    if not username or not password:
        return Response({"error": "Le nom d'utilisateur et le mot de passe sont requis."}, status=400)

    if len(password) < 8:
        return Response({"error": "Le mot de passe doit contenir au moins 8 caractères."}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({"error": "Ce nom d'utilisateur est déjà pris."}, status=400)

    if email and User.objects.filter(email=email).exists():
        return Response({"error": "Cette adresse email est déjà utilisée."}, status=400)

    user = User.objects.create_user(
        username=username,
        password=password,
        email=email,
        first_name=first_name,
        last_name=last_name,
    )

    return Response({
        "message": "Compte créé avec succès.",
        "username": user.username,
    }, status=201)


urlpatterns = [
    path("admin/", admin.site.urls),

    # --- Page d accueil de l API ---
    path("api/", api_root, name="api-root"),

    # --- Authentification JWT ---
    path("api/auth/login/",    TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/",  TokenRefreshView.as_view(),   name="token_refresh"),
    path("api/auth/register/", register,                     name="auth_register"),

    # --- Apps metier ---
    path("api/students/",  include("students.urls")),
    path("api/academics/", include("academics.urls")),
    path("api/etl/",       include("etl.urls")),
    path("api/dashboard/", include("dashboard.urls")),

    # --- Login/logout pour la Browsable API ---
    path("api-auth/", include("rest_framework.urls")),
]
