from django.urls import path, re_path

from meta_creator import views

app_name = "meta_creator"

urlpatterns = [
    path("", views.IndexView.as_view(), name="index"),
    re_path(r'^getdata/', views.index, name="getdata"),
    re_path(r'^import/', views.import_metadata, name="import"),
    re_path(r'^from-registry/', views.from_registry, name="from-registry"),
    re_path(r'^information/', views.information, name='information'),
    re_path(r'^legals/', views.legals, name='legals'),
    re_path(r'^api/validate-jsonld/', views.validate_jsonld_api, name="validate-jsonld"),
]
