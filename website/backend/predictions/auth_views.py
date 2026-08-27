from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

def is_valid_server_request(request):
    client_secret = request.headers.get('X-Server-Secret')
    return client_secret == getattr(settings, 'SECRET_KEY', '')

class SyncUserView(APIView):
    permission_classes = [] 
    authentication_classes = []

    def post(self, request):
        if not is_valid_server_request(request):
            return Response({'error': 'Akses Ditolak. Endpoint ini khusus server-to-server.'}, status=status.HTTP_403_FORBIDDEN)

        email = request.data.get('email')
        name = request.data.get('name')
        
        if not email:
            return Response({'error': 'Email wajib disertakan'}, status=status.HTTP_400_BAD_REQUEST)
            
        username_base = email.split('@')[0]
        
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': username_base,
                'first_name': name or '',
                'is_active': True
            }
        )
        
        if created:
            user.save()
            
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'User berhasil disinkronisasi', 
            'user_id': user.id,
            'is_staff': user.is_staff,
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

class CheckStaffView(APIView):
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        if not is_valid_server_request(request):
            return Response({'error': 'Akses Ditolak. Endpoint ini khusus server-to-server.'}, status=status.HTTP_403_FORBIDDEN)

        email = request.query_params.get('email')
        if not email:
            return Response({'is_staff': False})
            
        try:
            user = User.objects.get(email=email)
            return Response({'is_staff': user.is_staff})
        except User.DoesNotExist:
            return Response({'is_staff': False})