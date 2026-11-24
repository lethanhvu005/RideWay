"""App 1: accounts — Users, Operators, and OperatorMemberships (3 tables)."""
import uuid
from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone
from common import BaseRecord


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email).strip().lower()
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if not extra_fields['is_staff'] or not extra_fields['is_superuser']:
            raise ValueError('Superuser must have is_staff/is_superuser')
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=160, blank=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)
    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.email


class Operator(BaseRecord):
    name = models.CharField(max_length=180)
    legal_name = models.CharField(max_length=220, blank=True)
    contact_email = models.EmailField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=[('DRAFT', 'Draft'), ('ACTIVE', 'Active'), ('SUSPENDED', 'Suspended')],
        default='DRAFT',
    )

    class Meta:
        db_table = 'operators'


class OperatorMembership(BaseRecord):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    operator = models.ForeignKey(Operator, on_delete=models.PROTECT)
    role = models.CharField(
        max_length=24,
        choices=[('OWNER', 'Owner'), ('MANAGER', 'Manager'), ('STAFF', 'Staff')],
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'operator_memberships'
        constraints = [
            models.UniqueConstraint(fields=['user', 'operator'], name='uq_operator_user'),
        ]
