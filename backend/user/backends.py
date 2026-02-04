from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model


class EmailBackend(ModelBackend):
    """Authenticate using an email address.

    Works with calls to `authenticate(email=..., password=...)` and also
    accepts `username` fallback for compatibility.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        email = kwargs.get("email") or username
        if email is None or password is None:
            return None

        UserModel = get_user_model()
        try:
            user = UserModel.objects.get(email__iexact=email)
        except UserModel.DoesNotExist:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
