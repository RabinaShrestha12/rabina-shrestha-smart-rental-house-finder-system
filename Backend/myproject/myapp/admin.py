from django.contrib import admin
from .models import FurnitureItem


@admin.register(FurnitureItem)
class FurnitureItemAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "category", "furniture_type", "color", "width", "height", "is_active")
    list_filter = ("category", "is_active")
    search_fields = ("name", "category", "furniture_type", "color")