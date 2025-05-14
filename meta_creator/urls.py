from django.urls import path, re_path

from meta_creator import views

app_name = "meta_creator"

urlpatterns = [
    path("", views.IndexView.as_view(), name="index"),
    re_path(r'^getdata/', views.index, name="getdata"),
    re_path(r'^information/', views.information, name='information'),
    re_path(r'^legals/', views.legals, name='legals'),
]
