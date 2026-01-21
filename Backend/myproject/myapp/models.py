from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from decimal import Decimal


# Create your models here.
class User(AbstractUser):
    USER_TYPE = (
        ('admin','Admin'),
        ('owner','Owner'),
        ('tenant','Tenant'),
    )
    role = models.CharField(max_length=100, choices=USER_TYPE, blank=True, default="tenant")
    address = models.CharField(max_length=100, blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")  # ✅ change
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Owner(models.Model):
    address = models.CharField(max_length=100)
    phone = models.CharField(max_length=30)  # ✅ change
    location = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Owner {self.id}"
    
    
class Tenant(models.Model):
    address = models.CharField(max_length=100)
    phone = models.CharField(max_length=30)  # ✅ change
    location = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Tenant {self.id}"