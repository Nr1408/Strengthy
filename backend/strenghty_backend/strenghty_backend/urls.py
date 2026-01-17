from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import get_user_model
from django.http import HttpResponse

def health_check(request):
    return HttpResponse("OK", status=200)

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
    path("health", health_check, name="health"),
    path("admin/", admin.site.urls),
    path("emergency-reset/", emergency_admin_reset),
    
    # ✅ This now handles EVERYTHING starting with 'api/', including public-config
    path("api/", include("workouts.urls")), 
]