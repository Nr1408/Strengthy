from django.contrib import admin
from .models import Exercise, Workout, WorkoutSet

@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "muscle_group","created_at")
    list_filter = ("muscle_group",)
    search_fields = ("name", "owner__username")
    
    
@admin.register(Workout)
class WorkoutAdmin(admin.ModelAdmin):
    list_display = ("owner","date","name","created_at")
    list_filter = ("date"),
    search_fields = ("owner__username","name" )
    
    
@admin.register(WorkoutSet)
class WorkoutSetAdmin(admin.ModelAdmin):
    list_display = ("workout","exercise","set_number","reps","weight","is_pr")
    list_filter = ("exercise","is_pr")

