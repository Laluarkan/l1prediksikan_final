from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

def health_check(request):
    return JsonResponse({"status": "healthy", "message": "API L1 Prediksi-Kan berjalan optimal."})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('predictions.urls')),
    
    path('health/', health_check, name='health-check'),
    
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]