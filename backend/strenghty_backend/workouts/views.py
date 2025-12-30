from rest_framework import viewsets, permissions , generics
from .models import Exercise, Workout, WorkoutSet
from .serializers import ExerciseSerializer,WorkoutSerializer,WorkoutSetSerializer, RegisterSerializer

class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return getattr(obj, "owner", None) == request.user
    
class ExerciseViewSet(viewsets.ModelViewSet):
    serializer_class = ExerciseSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    
    def get_queryset(self):
        return Exercise.objects.filter(owner=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
        
class WorkoutViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    
    def get_queryset(self):
        return Workout.objects.filter(owner=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
        
class WorkoutSetViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutSetSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        qs = WorkoutSet.objects.filter(workout__owner=self.request.user)
        workout_id = self.request.query_params.get("workout")
        if workout_id:
            try:
                wid = int(workout_id)
                qs = qs.filter(workout_id=wid)
            except ValueError:
                pass
        return qs

class RegisterView(generics.CreateAPIView):
    serializer_class= RegisterSerializer
    permission_classes = [permissions.AllowAny]