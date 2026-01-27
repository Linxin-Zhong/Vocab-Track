from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    id = models.AutoField(primary_key=True, db_column="user_id")
    username = models.CharField(max_length=150, unique=False, db_column="user_name")
    email = models.EmailField(unique=True, blank=False, null=False)
    create_time = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "tbl_user"

    def __str__(self):
        return self.email
