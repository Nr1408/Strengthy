from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Exercise(models.Model):
    MUSCLE_GROUP_CHOICES = [
        ("CHEST", "Chest"),
        ("BACK", "Back"),
        ("LEGS", "Legs"),
        ("SHOULDERS","Shoulders"),
        ("ARMS", "Arms"),
        ("CORE", "Core"),
        ("OTHER", "Other")        
    ]
    
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="exercises")
    name = models.CharField(max_length=100)
    muscle_group = models.CharField(max_length=20, choices=MUSCLE_GROUP_CHOICES)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ("owner","name")
        
    def __str__(self) -> str:
        return f"{self.name} ({self.owner.username})"
        
    

class Workout(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE,related_name="workouts")
    name = models.CharField(max_length=100, blank=False)
    date = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ["-date", "-created_at"]
        
    def __str__(self) -> str:
        return f"Workout on {self.date} by {self. owner.username}"
    
class WorkoutSet(models.Model):
    workout = models.ForeignKey(Workout, on_delete=models.CASCADE, related_name="sets")
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE,related_name="sets")
    set_number = models.PositiveIntegerField()
    reps = models.PositiveIntegerField()
    weight = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    UNIT_CHOICES = [
        ("lbs", "Pounds"),
        ("kg", "Kilograms"),
    ]
    unit = models.CharField(max_length=3, choices=UNIT_CHOICES, default="lbs")
    is_pr = models.BooleanField(default=False)
    # Detailed PR types
    is_abs_weight_pr = models.BooleanField(default=False)
    is_e1rm_pr = models.BooleanField(default=False)
    is_volume_pr = models.BooleanField(default=False)
    is_rep_pr = models.BooleanField(default=False)
    SET_TYPE_CHOICES = [
        ("W", "Warm-up"),
        ("S", "Standard"),
        ("F", "Failure"),
        ("D", "Drop Set"),
    ]
    set_type = models.CharField(max_length=1, choices=SET_TYPE_CHOICES, default="S")
    rpe = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ["workout" , "set_number"]
        unique_together = ("workout", "exercise", "set_number")
        
    def __str__(self) -> str:
        return f"{self.exercise.name} - Set {self.set_number} ({self.reps}reps)"
    