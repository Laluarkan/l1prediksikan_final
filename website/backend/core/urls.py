from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import IsAdminUser

def health_check(request):
    return JsonResponse({"status": "healthy", "message": "API L1 Prediksi-Kan berjalan optimal."})

urlpatterns = [
    # Jalur admin diubah dari 'admin/' menjadi jalur rahasia untuk menghindari serangan bot
    path('rahasia-dapur-l1/', admin.site.urls),
    
    path('api/', include('predictions.urls')),
    
    path('health/', health_check, name='health-check'),
    
    # Skema dan dokumentasi API diproteksi khusus staf admin
    path('api/schema/', SpectacularAPIView.as_view(permission_classes=[IsAdminUser]), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema', permission_classes=[IsAdminUser]), name='swagger-ui'),
]