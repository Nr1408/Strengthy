"""Add WorkoutSet.half_reps for partial rep tracking.

Stores a small integer count (0..5) representing the number of half-reps
logged in addition to the integer `reps` field.
"""

from django.db import migrations, models
from django.core.validators import MaxValueValidator


class Migration(migrations.Migration):

    dependencies = [
        ("workouts", "0009_set_number_default"),
    ]

    operations = [
        migrations.AddField(
            model_name="workoutset",
            name="half_reps",
            field=models.PositiveSmallIntegerField(default=0, validators=[MaxValueValidator(5)]),
        ),
    ]
