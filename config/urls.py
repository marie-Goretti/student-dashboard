from django.contrib import admin
from django.urls import path, include
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


@api_view(["GET"])
def api_root(request, format=None):
    return Response({
        "auth_login": reverse("token_obtain_pair", request=request, format=format),
        "auth_refresh": reverse("token_refresh", request=request, format=format),
        "students": request.build_absolute_uri("/api/students/"),
        "academics": request.build_absolute_uri("/api/academics/"),
        "etl": request.build_absolute_uri("/api/etl/"),
        "dashboard": request.build_absolute_uri("/api/dashboard/"),
    })


urlpatterns = [
    path('admin/', admin.site.urls),

    # --- Page d'accueil de l'API ---
    path('api/', api_root, name='api-root'),

    # --- Authentification JWT ---
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # --- Apps métier ---
    path('api/students/', include('students.urls')),
    path('api/academics/', include('academics.urls')),
    path('api/etl/', include('etl.urls')),
    path('api/dashboard/', include('dashboard.urls')),

    # --- Login/logout pour la Browsable API ---
    path('api-auth/', include('rest_framework.urls')),
]