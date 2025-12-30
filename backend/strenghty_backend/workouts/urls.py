from django.urls import path , include
from rest_framework.routers import DefaultRouter
from .views import ExerciseViewSet , WorkoutViewSet, WorkoutSetViewSet, RegisterView
from rest_framework.authtoken.views import obtain_auth_token

router = DefaultRouter()
router.register(r"exercises", ExerciseViewSet, basename="exercise")
router.register(r"workouts", WorkoutViewSet, basename="workout")
router.register(r"sets", WorkoutSetViewSet, basename="workoutset")

urlpatterns = [
    path("", include(router.urls)),
    path("auth/login/", obtain_auth_token, name="api_token_auth"),
    path("auth/register/", RegisterView.as_view(), name="auth_register"),
]

