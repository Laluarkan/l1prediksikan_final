from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model

# Memanggil CustomUser yang sudah Anda buat sebelumnya
User = get_user_model()

class SyncUserView(APIView):
    # Dimatikan sementara pengamanan tokennya agar Next.js bisa masuk dengan bebas
    permission_classes = [] 
    authentication_classes = []

    def post(self, request):
        email = request.data.get('email')
        name = request.data.get('name')
        
        if not email:
            return Response({'error': 'Email wajib disertakan'}, status=status.HTTP_400_BAD_REQUEST)
            
        username_base = email.split('@')[0]
        
        # Logika cerdas: Ambil datanya kalau sudah ada, Buat baru kalau belum ada
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
            return Response({'message': 'User baru berhasil didaftarkan di database Django', 'user_id': user.id}, status=status.HTTP_201_CREATED)
            
        return Response({'message': 'User sudah terdaftar sebelumnya', 'user_id': user.id}, status=status.HTTP_200_OK)

class CheckStaffView(APIView):
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        email = request.query_params.get('email')
        if not email:
            return Response({'is_staff': False})
            
        try:
            user = User.objects.get(email=email)
            return Response({'is_staff': user.is_staff})
        except User.DoesNotExist:
            return Response({'is_staff': False})