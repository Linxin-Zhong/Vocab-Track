from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import RegisterSerializer, UserSerializer, LoginSerializer
from .models import User


# ----------------------------
# 用户注册 & 列表视图
# ----------------------------
class UserListCreateView(generics.ListCreateAPIView):
    """
    GET /users/       -> 列出所有用户
    POST /users/      -> 注册新用户
    """

    queryset = User.objects.all()
    serializer_class = UserSerializer  # GET 用 UserSerializer

    def get_serializer_class(self):
        if self.request.method == "POST":
            return RegisterSerializer  # POST 用 RegisterSerializer
        return UserSerializer  # GET 用 UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"message": "User created successfully"}, status=status.HTTP_201_CREATED
        )


# ----------------------------
# 用户详情视图（查看 / 修改 / 删除）
# ----------------------------
class UserRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /users/<id>/       -> 用户详情
    PATCH /users/<id>/     -> 修改用户
    DELETE /users/<id>/    -> 删除用户
    """

    queryset = User.objects.all()
    serializer_class = UserSerializer


# ----------------------------
# 用户登录
# ----------------------------
class LoginView(APIView):
    """
    POST /login/           -> 用户登录
    """

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        return Response(
            {"message": f"Login success {user.username}!"}, status=status.HTTP_200_OK
        )
