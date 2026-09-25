from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # --- Authentification JWT ---
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # --- Apps métier ---
    path('api/students/', include('students.urls')),
    path('api/academics/', include('academics.urls')),
    path('api/etl/', include('etl.urls')),
    path('api/dashboard/', include('dashboard.urls')),
]