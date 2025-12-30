from rest_framework import serializers
from django.db import models
from .models import Exercise, Workout, WorkoutSet
from django.contrib.auth import get_user_model

User = get_user_model()

class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = ["id","name","muscle_group","description","created_at"]
        read_only_fields = ["id", "created_at"]
        
class WorkoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workout
        fields = ["id","date","name","notes","created_at","updated_at","ended_at"]
        read_only_fields = ["id","created_at","updated_at"]
        
class WorkoutSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutSet
        fields = [
            "id",
            "workout",
            "exercise",
            "set_number",
            "reps",
            "weight",
            "unit",
            "is_pr",
            "is_abs_weight_pr",
            "is_e1rm_pr",
            "is_volume_pr",
            "is_rep_pr",
            "set_type",
            "rpe",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "set_number",
            "created_at",
            "is_pr",
            "is_abs_weight_pr",
            "is_e1rm_pr",
            "is_volume_pr",
            "is_rep_pr",
        ]

    LBS_PER_KG = 2.20462

    def _to_kg(self, weight, unit: str | None) -> float | None:
        if weight is None:
            return None
        try:
            w = float(weight)
        except (TypeError, ValueError):
            return None
        u = unit or "lbs"
        if u == "kg":
            return w
        return w / self.LBS_PER_KG

    def _compute_pr_flags(
        self,
        *,
        workout: Workout,
        exercise: Exercise,
        reps: int | None,
        weight,
        unit: str | None,
        set_type: str | None,
        exclude_id: int | None = None,
    ) -> dict:
        """Compute detailed PR flags for a set.

        Applies across all workouts/dates for this user+exercise, considering only
        Standard and Failure sets. Uses kg internally so kg/lbs mixes compare
        correctly.
        """

        # Default flags
        flags = {
            "is_abs_weight_pr": False,
            "is_e1rm_pr": False,
            "is_volume_pr": False,
            "is_rep_pr": False,
        }

        effective_type = (set_type or "S").upper()
        if effective_type not in {"S", "F"}:
            return flags

        if reps is None or reps <= 0 or weight is None:
            return flags

        current_w_kg = self._to_kg(weight, unit)
        if current_w_kg is None or current_w_kg <= 0:
            return flags

        # Current metrics
        current_volume = current_w_kg * reps
        # Brzycki estimated 1RM: w * 36 / (37 - reps)
        try:
            if reps >= 37:
                current_e1rm = None
            else:
                current_e1rm = current_w_kg * 36.0 / (37.0 - reps)
        except ZeroDivisionError:
            current_e1rm = None

        # Historical metrics across all workouts for this user+exercise
        # Consider only prior working sets with positive weight and reps.
        qs = WorkoutSet.objects.filter(
            workout__owner=workout.owner,
            exercise=exercise,
            set_type__in=["S", "F"],
            weight__isnull=False,
            weight__gt=0,
            reps__gt=0,
        )
        if exclude_id is not None:
            qs = qs.exclude(id=exclude_id)

        # If there is literally no prior working set for this exercise,
        # treat this set as establishing a baseline, not a PR.
        if not qs.exists():
            return flags

        max_weight_kg = None
        max_e1rm = None
        max_volume = None
        reps_at_weight: dict[float, int] = {}

        for s in qs.iterator():
            w_kg = self._to_kg(s.weight, getattr(s, "unit", None))
            if w_kg is None or w_kg <= 0:
                continue
            if s.reps is None or s.reps <= 0:
                continue

            # Track absolute max weight
            if max_weight_kg is None or w_kg > max_weight_kg:
                max_weight_kg = w_kg

            # Volume
            vol = w_kg * s.reps
            if max_volume is None or vol > max_volume:
                max_volume = vol

            # Estimated 1RM
            try:
                if s.reps < 37:
                    e1rm = w_kg * 36.0 / (37.0 - s.reps)
                else:
                    e1rm = None
            except ZeroDivisionError:
                e1rm = None
            if e1rm is not None and (max_e1rm is None or e1rm > max_e1rm):
                max_e1rm = e1rm

            # Rep PR tracking per exact weight (rounded to 2 decimals)
            key = round(w_kg, 2)
            prev_best = reps_at_weight.get(key)
            if prev_best is None or s.reps > prev_best:
                reps_at_weight[key] = s.reps

        # Absolute weight PR vs historical max
        if max_weight_kg is None or current_w_kg > max_weight_kg:
            flags["is_abs_weight_pr"] = True

        # Volume PR vs historical max
        if max_volume is None or current_volume > max_volume:
            flags["is_volume_pr"] = True

        # Estimated 1RM PR vs historical max
        if current_e1rm is not None and (max_e1rm is None or current_e1rm > max_e1rm):
            flags["is_e1rm_pr"] = True

        # Rep PR at this exact weight (no tolerance beyond 2 decimal rounding)
        key = round(current_w_kg, 2)
        hist_reps = reps_at_weight.get(key)
        # At this point we know there is some history for the exercise.
        # If there were no prior sets at this exact weight, treat this as
        # a rep PR for that weight (baseline at this load), but still only
        # if the exercise itself isn't brand new (handled above).
        if hist_reps is None or reps > hist_reps:
            flags["is_rep_pr"] = True

        return flags

    def create(self, validated_data):
        workout = validated_data["workout"]
        exercise = validated_data["exercise"]
        # Always assign the next available set_number for this workout+exercise
        # to avoid unique_together collisions when the client has added/removed
        # sets locally.
        existing_max = (
            WorkoutSet.objects.filter(workout=workout, exercise=exercise)
            .aggregate(models.Max("set_number"))
            .get("set_number__max")
            or 0
        )
        validated_data["set_number"] = existing_max + 1
        reps = validated_data.get("reps")
        weight = validated_data.get("weight")
        unit = validated_data.get("unit") or "lbs"
        set_type = validated_data.get("set_type") or "S"

        flags = self._compute_pr_flags(
            workout=workout,
            exercise=exercise,
            reps=reps,
            weight=weight,
            unit=unit,
            set_type=set_type,
        )
        for k, v in flags.items():
            validated_data[k] = v
        validated_data["is_pr"] = any(flags.values())

        return super().create(validated_data)

    def update(self, instance, validated_data):
        workout = validated_data.get("workout", instance.workout)
        exercise = validated_data.get("exercise", instance.exercise)
        reps = validated_data.get("reps", instance.reps)
        weight = validated_data.get("weight", instance.weight)
        unit = validated_data.get("unit", getattr(instance, "unit", "lbs"))
        set_type = validated_data.get("set_type", instance.set_type or "S")

        flags = self._compute_pr_flags(
            workout=workout,
            exercise=exercise,
            reps=reps,
            weight=weight,
            unit=unit,
            set_type=set_type,
            exclude_id=instance.id,
        )
        for k, v in flags.items():
            validated_data[k] = v
        validated_data["is_pr"] = any(flags.values())

        return super().update(instance, validated_data)
        
class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password"]
        read_only_fields = ["id"]
        
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
        )
        return user