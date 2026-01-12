from django.contrib import admin
from django.urls import path, include
from workouts import views as workout_views

from django.contrib.auth import get_user_model
from django.http import HttpResponse


def emergency_admin_reset(request):
    User = get_user_model()

    user, created = User.objects.get_or_create(
        username="nr",
        defaults={"is_staff": True, "is_superuser": True},
    )

    user.set_password("140808")
    user.is_staff = True
    user.is_superuser = True
    user.save()

    if created:
        return HttpResponse("Admin user CREATED and password set.")
    else:
        return HttpResponse("Admin password reset successful.")


urlpatterns = [
    path("admin/", admin.site.urls),

    # 👇 temporary reset endpoint
    path("emergency-reset/", emergency_admin_reset),

    # 👇 API routes
    path("api/", include("workouts.urls")),
    path("api/public-config/", workout_views.public_config, name="public-config"),
]
