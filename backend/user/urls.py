from django.urls import path
from .views import UserListCreateView, UserRetrieveUpdateDestroyView, LoginView

urlpatterns = [
    path("", UserListCreateView.as_view(), name="user-list-create"),  # /user/
    path(
        "<int:pk>/", UserRetrieveUpdateDestroyView.as_view(), name="user-detail-opr"
    ),  # /user/<id>/
    path("login/", LoginView.as_view(), name="login"),  # /user/login/
]
