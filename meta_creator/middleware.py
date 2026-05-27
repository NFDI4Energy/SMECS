# meta_creator/middleware.py

from django.db import models
from django.utils.timezone import now
from .models import SiteStats

# Paths to ignore — admin, static files, favicon, captcha
EXCLUDED_PATHS = [
    '/admin/',
    '/static/',
    '/favicon.ico',
    '/captcha/',
]


class TrackingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

        # Step 1 — Skip excluded paths
        if any(request.path.startswith(p) for p in EXCLUDED_PATHS):
            return self.get_response(request)

        # Step 2 — Only track if user has given cookie consent
        if request.COOKIES.get('cookie_consent') == 'true':

            current = now()
            today = current.date()
            current_hour = current.hour  # 0–23

            # Step 3 — Get or create this hour's stats row
            stats, _ = SiteStats.objects.get_or_create(
                date=today,
                hour=current_hour
            )

            # Step 4 — Count every request (atomic increment)
            SiteStats.objects.filter(
                date=today,
                hour=current_hour
            ).update(
                total_requests=models.F('total_requests') + 1
            )

            # Step 5 — Count unique visitor (once per session only)
            # CHANGE 5: Session is only touched AFTER consent is confirmed
            if not request.session.get('counted'):
                request.session['counted'] = True
                request.session.modified = True  # ensure session is saved
                SiteStats.objects.filter(
                    date=today,
                    hour=current_hour
                ).update(
                    unique_visitors=models.F('unique_visitors') + 1
                )

        return self.get_response(request)