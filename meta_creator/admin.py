# meta_creator/admin.py

from django.contrib import admin
from .models import SiteStats


@admin.register(SiteStats)
class SiteStatsAdmin(admin.ModelAdmin):

    # Columns shown in the list view
    list_display = [
        'date',
        'hour_display',
        'total_requests',
        'unique_visitors',
    ]

    # Filter sidebar — filter by date
    list_filter = ['date']

    # Default ordering — latest date and hour first
    ordering = ['-date', '-hour']

    # All fields are read-only — only middleware should write data
    readonly_fields = [
        'date',
        'hour',
        'total_requests',
        'unique_visitors',
    ]

    # Disable add and delete — data is managed by middleware only
    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    # Display hour as readable time slot e.g. "14:00 – 15:00"
    def hour_display(self, obj):
        return f"{obj.hour:02d}:00 – {(obj.hour + 1) % 24:02d}:00"

    hour_display.short_description = "Hour"