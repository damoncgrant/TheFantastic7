# Custom user model: logs in with email + password instead of a username,
# and tracks whether the account is an applicant or an employer.
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.APPLICANT)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        APPLICANT = "applicant", "Applicant"
        EMPLOYER = "employer", "Employer"

    username = None
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=150, blank=True, default="")
    role = models.CharField(max_length=20, choices=Role.choices)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email
