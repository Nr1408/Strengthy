from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ExerciseViewSet,
    WorkoutViewSet,
    WorkoutSetViewSet,
    CardioSetViewSet,
    RegisterView,
    AccountSettingsView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    GoogleLoginView,
    GoogleRedirectReceiver,
    ProfileView,
    public_config,  # ✅ ADDED THIS IMPORT
)
from rest_framework.authtoken.views import obtain_auth_token

router = DefaultRouter()
router.register(r"exercises", ExerciseViewSet, basename="exercise")
router.register(r"workouts", WorkoutViewSet, basename="workout")
router.register(r"sets", WorkoutSetViewSet, basename="workoutset")
router.register(r"cardio-sets", CardioSetViewSet, basename="cardioset")

urlpatterns = [
    path("", include(router.urls)),
    path("auth/login/", obtain_auth_token, name="api_token_auth"),
    path("auth/register/", RegisterView.as_view(), name="auth_register"),
    path("auth/account/", AccountSettingsView.as_view(), name="auth_account"),
    path("auth/password-reset/request/", PasswordResetRequestView.as_view(), name="auth_password_reset_request"),
    path("auth/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="auth_password_reset_confirm"),
    path("auth/google/", GoogleLoginView.as_view(), name="auth_google"),
    path("auth/google/redirect/", GoogleRedirectReceiver, name="auth_google_redirect"),
    path("profile/", ProfileView.as_view(), name="user_profile"),
    
    # ✅ MOVED THE CONFIG ROUTE HERE
    path("public-config/", public_config, name="public-config"),
]