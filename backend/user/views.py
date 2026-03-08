from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .serializers import RegisterSerializer, UserSerializer, LoginSerializer
from .models import User
from rest_framework.authtoken.models import Token
from api.utils import format_serializer_errors


class UserListCreateView(generics.ListCreateAPIView):

    queryset = User.objects.all()
    serializer_class = UserSerializer  # GET 用 UserSerializer

    def get_serializer_class(self):
        if self.request.method == "POST":
            return RegisterSerializer  # POST 用 RegisterSerializer
        return UserSerializer  # GET 用 UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"message": format_serializer_errors(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Save the new user and return an auth token so clients can
        # authenticate immediately after registration. Return the new
        # user's public data to the client (no password or sensitive data).
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        user_data = UserSerializer(user).data
        return Response(
            {
                "message": "User created successfully",
                "token": token.key,
                "user": user_data,
            },
            status=status.HTTP_201_CREATED,
        )


class UserRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):

    queryset = User.objects.all()
    serializer_class = UserSerializer


class LoginView(APIView):

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(
                {"message": format_serializer_errors(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        user_data = UserSerializer(user).data
        return Response(
            {
                "message": f"Login success {user.email}!",
                "token": token.key,
                "user": user_data,
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            request.user.auth_token.delete()
            return Response(
                {"message": "Logout successful"},
                status=status.HTTP_200_OK,
            )
        except AttributeError:
            return Response(
                {"message": "Already logged out or no token found"},
                status=status.HTTP_200_OK,
            )
