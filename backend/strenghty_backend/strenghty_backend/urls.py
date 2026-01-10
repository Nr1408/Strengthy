from django.contrib import admin
from django.urls import path, include
from workouts import views as workout_views

urlpatterns = [
    path("admin/", admin.site.urls),

    # 👇 Tell Django that everything under /api/ belongs to the app
    path("api/", include("workouts.urls")),

    path("api/public-config/", workout_views.public_config, name="public-config"),
]
