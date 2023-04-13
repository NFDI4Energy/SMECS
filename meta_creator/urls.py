from django.urls import path, re_path
from django.contrib import admin

from meta_creator import views
from meta_creator.settings import META_VERSIONS, LATEST_META_VERSION


app_name = "meta_creator"

#urlpatterns = [path("", views.IndexView.as_view(), name="index"), path('download_json/', views.download_json, name='download_json')] + [re_path(r'^admin/', admin.site.urls)] + [re_path(r'^getdata/', views.index , name="getdata")] + [re_path(r'^$', views.index)] + [path(versions, views.CreatorView.as_view(metapath=metapath)) for versions, metapath in META_VERSIONS.items()]

urlpatterns = [
    path("", views.IndexView.as_view(), name="index"),
    re_path(r'^getdata/', views.index, name="getdata"),
]
