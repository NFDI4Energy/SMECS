# meta_creator/models.py

from django.db import models


class SiteStats(models.Model):
    date = models.DateField()
    hour = models.PositiveSmallIntegerField()  # 0–23
    total_requests = models.PositiveIntegerField(default=0)
    unique_visitors = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('date', 'hour')  # one row per hour per day
        verbose_name = "Site Stat"
        verbose_name_plural = "Site Stats"
        ordering = ['-date', '-hour']

    def __str__(self):
        return (
            f"{self.date} {self.hour:02d}:00 — "
            f"Requests: {self.total_requests}, "
            f"Visitors: {self.unique_visitors}"
        )