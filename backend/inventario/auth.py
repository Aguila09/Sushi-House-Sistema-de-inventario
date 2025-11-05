from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model

User = get_user_model()

class ResolveUserView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'detail': 'Email es requerido'}, status=400)
            
        try:
            user = User.objects.filter(email=email).first()
            if user:
                return Response({'usuario': user.usuario})
            return Response({'detail': 'Usuario no encontrado'}, status=404)
        except Exception as e:
            return Response({'detail': str(e)}, status=500)