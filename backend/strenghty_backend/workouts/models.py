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
    # Mark exercises explicitly created by the user via the "New Exercise"
    # dialog. Exercises created implicitly (e.g. during logging when a
    # matching user exercise doesn't exist) will have this False by default.
    custom = models.BooleanField(default=False)
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


class CardioSet(models.Model):
    """Structured cardio metrics tracked per workout set.

    This keeps strength sets (weight/reps) separate from cardio while still
    attaching to the same Workout and Exercise models.
    """

    CARDIO_MODE_CHOICES = [
        ("TREADMILL", "Treadmill"),
        ("BIKE", "Stationary Bike"),
        ("ELLIPTICAL", "Elliptical Trainer"),
        ("STAIRS", "Stair Climber"),
        ("ROW", "Rowing Machine"),
    ]

    workout = models.ForeignKey(Workout, on_delete=models.CASCADE, related_name="cardio_sets")
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name="cardio_sets")
    set_number = models.PositiveIntegerField(default=1)
    mode = models.CharField(max_length=16, choices=CARDIO_MODE_CHOICES)

    # Core metrics
    duration_seconds = models.PositiveIntegerField(help_text="Total duration in seconds")
    distance_meters = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    floors = models.PositiveIntegerField(null=True, blank=True)
    level = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    # Rowing-specific metrics
    split_seconds = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text="Split time in seconds per 500m")
    spm = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True, help_text="Strokes per minute")

    # PR flags
    is_pr = models.BooleanField(default=False)
    is_distance_pr = models.BooleanField(default=False)
    is_pace_pr = models.BooleanField(default=False)
    is_ascent_pr = models.BooleanField(default=False)
    is_intensity_pr = models.BooleanField(default=False)
    is_split_pr = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["workout", "set_number"]
        unique_together = ("workout", "exercise", "set_number")

    def __str__(self) -> str:
        return f"Cardio {self.exercise.name} - Set {self.set_number}"
    
class PasswordResetCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="password_reset_codes")
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["user", "code", "created_at"]),
        ]

    def __str__(self):
        return f"Password reset code for {self.user.username} ({self.code})"


class Profile(models.Model):
    """Per-user onboarding/profile data persisted on the server.

    Stored values mirror the client `user:onboarding` shape so the SPA
    and native apps can fetch and populate their local storage from the
    server after login.
    """

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    goals = models.TextField(blank=True, help_text="JSON-encoded list of goal ids")
    age = models.PositiveIntegerField(null=True, blank=True)
    height = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    height_unit = models.CharField(max_length=4, default="cm")
    current_weight = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    goal_weight = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    experience = models.CharField(max_length=50, blank=True)
    monthly_workouts = models.PositiveIntegerField(null=True, blank=True)

    def __str__(self):
        return f"Profile for {self.user.username}"
