"""Set a default for CardioSet.set_number to avoid NOT NULL insertion errors.

This migration alters the `set_number` field to have a default of 1. The
serializer still computes the correct next set number, but this DB-level
default prevents IntegrityError if a save occurs without the field present.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workouts', '0008_profile'),
    ]

    operations = [
        migrations.AlterField(
            model_name='cardioset',
            name='set_number',
            field=models.PositiveIntegerField(default=1),
        ),
    ]
