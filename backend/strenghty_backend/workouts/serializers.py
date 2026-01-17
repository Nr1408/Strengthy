from rest_framework import serializers
from django.db import models
from .models import Exercise, Workout, WorkoutSet, CardioSet
from .models import Profile
from django.contrib.auth import get_user_model

User = get_user_model()

class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        # Include `custom` so clients can distinguish user-created exercises
        # from ones created implicitly by other flows.
        fields = ["id", "name", "muscle_group", "description", "custom", "created_at"]
        read_only_fields = ["id", "created_at"]
        
    def validate_name(self, value: str) -> str:
        """Ensure the requesting user doesn't already have an exercise with this name.

        Uses a case-insensitive check for better UX. The serializer receives
        `request` in `.context` when used in a viewset, so we can access the
        current user here. If no request is available, skip the check.
        """
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            user = request.user
            # Case-insensitive check to avoid duplicates like "Bench" vs "bench".
            if Exercise.objects.filter(owner=user, name__iexact=value).exists():
                raise serializers.ValidationError("You already have an exercise with that name.")
        return value
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
            "half_reps",
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


class CardioSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = CardioSet
        fields = [
            "id",
            "workout",
            "exercise",
            "set_number",
            "mode",
            "duration_seconds",
            "distance_meters",
            "floors",
            "level",
            "split_seconds",
            "spm",
            "is_pr",
            "is_distance_pr",
            "is_pace_pr",
            "is_ascent_pr",
            "is_intensity_pr",
            "is_split_pr",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "set_number",
            "is_pr",
            "is_distance_pr",
            "is_pace_pr",
            "is_ascent_pr",
            "is_intensity_pr",
            "is_split_pr",
            "created_at",
        ]

    def _compute_pr_flags(
        self,
        *,
        workout: Workout,
        exercise: Exercise,
        mode: str,
        duration_seconds: int | None,
        distance_meters,
        floors: int | None,
        level,
        split_seconds,
        spm,
        exclude_id: int | None = None,
    ) -> dict:
        """Compute PR flags for cardio according to the provided spec."""

        flags = {
            "is_distance_pr": False,
            "is_pace_pr": False,
            "is_ascent_pr": False,
            "is_intensity_pr": False,
            "is_split_pr": False,
        }

        try:
            duration = int(duration_seconds or 0)
        except (TypeError, ValueError):
            duration = 0

        def _to_float(val):
            try:
                if val is None:
                    return None
                return float(val)
            except (TypeError, ValueError):
                return None

        dist = _to_float(distance_meters) or 0.0
        lvl = _to_float(level)
        fl = floors or 0
        split = _to_float(split_seconds)
        spm_val = _to_float(spm)

        qs = CardioSet.objects.filter(
            workout__owner=workout.owner,
            exercise=exercise,
            mode=mode,
        )
        if exclude_id is not None:
            qs = qs.exclude(id=exclude_id)

        # No history: treat this as establishing a baseline, not a PR.
        if not qs.exists():
            return flags

        mode = (mode or "").upper()

        # Helper to iterate history as floats
        def hist():
            for s in qs.iterator():
                yield {
                    "duration": int(getattr(s, "duration_seconds", 0) or 0),
                    "dist": _to_float(getattr(s, "distance_meters", None)) or 0.0,
                    "floors": int(getattr(s, "floors", 0) or 0),
                    "level": _to_float(getattr(s, "level", None)),
                    "split": _to_float(getattr(s, "split_seconds", None)),
                    "spm": _to_float(getattr(s, "spm", None)),
                }

        # 1) Treadmill/Bike/Elliptical: distance + pace PRs
        if mode in {"TREADMILL", "BIKE", "ELLIPTICAL"}:
            if dist > 0 and duration > 0:
                max_dist = 0.0
                max_pace = 0.0
                for h in hist():
                    if h["dist"] > max_dist:
                        max_dist = h["dist"]
                    if h["dist"] > 0 and h["duration"] > 0:
                        pace = h["dist"] / h["duration"]
                        if pace > max_pace:
                            max_pace = pace

                if dist > max_dist:
                    flags["is_distance_pr"] = True

                current_pace = dist / duration
                if current_pace > max_pace:
                    flags["is_pace_pr"] = True

        # 2) Stair Climber: total ascent + intensity (floors per minute)
        if mode == "STAIRS":
            if fl > 0 and duration > 0:
                max_floors = 0
                max_rate = 0.0
                for h in hist():
                    if h["floors"] > max_floors:
                        max_floors = h["floors"]
                    if h["floors"] > 0 and h["duration"] > 0:
                        rate = h["floors"] / (h["duration"] / 60.0)
                        if rate > max_rate:
                            max_rate = rate

                if fl > max_floors:
                    flags["is_ascent_pr"] = True

                current_rate = fl / (duration / 60.0)
                if current_rate > max_rate:
                    flags["is_intensity_pr"] = True

        # 3) Rowing: distance + split PR (lower split is better)
        if mode == "ROW":
            if dist > 0:
                max_dist = 0.0
                best_split = None
                for h in hist():
                    if h["dist"] > max_dist:
                        max_dist = h["dist"]
                    if h["split"] and (best_split is None or h["split"] < best_split):
                        best_split = h["split"]

                if dist > max_dist:
                    flags["is_distance_pr"] = True

                if split is not None and split > 0:
                    if best_split is None or split < best_split:
                        flags["is_split_pr"] = True

        return flags

    def create(self, validated_data):
        workout = validated_data["workout"]
        exercise = validated_data["exercise"]
        mode = validated_data.get("mode") or ""

        existing_max = (
            CardioSet.objects.filter(workout=workout, exercise=exercise)
            .aggregate(models.Max("set_number"))
            .get("set_number__max")
            or 0
        )
        validated_data["set_number"] = existing_max + 1

        flags = self._compute_pr_flags(
            workout=workout,
            exercise=exercise,
            mode=mode,
            duration_seconds=validated_data.get("duration_seconds"),
            distance_meters=validated_data.get("distance_meters"),
            floors=validated_data.get("floors"),
            level=validated_data.get("level"),
            split_seconds=validated_data.get("split_seconds"),
            spm=validated_data.get("spm"),
        )
        for k, v in flags.items():
            validated_data[k] = v
        validated_data["is_pr"] = any(flags.values())

        return super().create(validated_data)

    def update(self, instance, validated_data):
        workout = validated_data.get("workout", instance.workout)
        exercise = validated_data.get("exercise", instance.exercise)
        mode = validated_data.get("mode", instance.mode)

        flags = self._compute_pr_flags(
            workout=workout,
            exercise=exercise,
            mode=mode,
            duration_seconds=validated_data.get("duration_seconds", instance.duration_seconds),
            distance_meters=validated_data.get("distance_meters", instance.distance_meters),
            floors=validated_data.get("floors", instance.floors),
            level=validated_data.get("level", instance.level),
            split_seconds=validated_data.get("split_seconds", instance.split_seconds),
            spm=validated_data.get("spm", instance.spm),
            exclude_id=instance.id,
        )
        for k, v in flags.items():
            validated_data[k] = v
        validated_data["is_pr"] = any(flags.values())

        return super().update(instance, validated_data)


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            "goals",
            "age",
            "height",
            "height_unit",
            "current_weight",
            "goal_weight",
            "experience",
            "monthly_workouts",
        ]

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # `goals` stored as JSON string server-side; expose as list in API
        try:
            import json as _json
            rep_goals = []
            if rep.get("goals"):
                rep_goals = _json.loads(rep["goals"]) if isinstance(rep["goals"], str) else rep["goals"]
            rep["goals"] = rep_goals
        except Exception:
            rep["goals"] = []
        return rep

    def to_internal_value(self, data):
        # Accept `goals` as list from client, serialize as JSON string
        if isinstance(data.get("goals"), list):
            try:
                import json as _json
                data = dict(data)
                data["goals"] = _json.dumps(data.get("goals") or [])
            except Exception:
                pass
        return super().to_internal_value(data)
        
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


class AccountUpdateSerializer(serializers.ModelSerializer):
    """Serializer used for updating the authenticated user's login details.

    Allows changing username/email and password after verifying the current
    password. Frontend uses the email field as the username, so we mirror
    that behaviour here.
    """

    current_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "current_password"]
        extra_kwargs = {
            "username": {"required": False},
            "email": {"required": False},
            "password": {"write_only": True, "required": False},
        }

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        current_password = attrs.pop("current_password", None)

        if not user or not current_password or not user.check_password(current_password):
            raise serializers.ValidationError({"current_password": "Incorrect password"})

        return attrs

    def update(self, instance, validated_data):
        username = validated_data.get("username")
        email = validated_data.get("email")
        password = validated_data.get("password")

        if username:
            instance.username = username
            # If email not explicitly provided, keep username and email in sync
            if not email:
                instance.email = username

        if email:
            instance.email = email

        if password:
            instance.set_password(password)

        instance.save()
        return instance