"""Generated migration for Profile model.

This migration was created to add the `Profile` model which persists
per-user onboarding data on the server. If you prefer to generate
this file locally via `makemigrations`, you can replace it with your
own migration output. Apply with `python manage.py migrate`.
"""

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('workouts', '0007_cardioset'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Profile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('goals', models.TextField(blank=True, help_text='JSON-encoded list of goal ids')),
                ('age', models.PositiveIntegerField(blank=True, null=True)),
                ('height', models.DecimalField(blank=True, null=True, max_digits=6, decimal_places=2)),
                ('height_unit', models.CharField(default='cm', max_length=4)),
                ('current_weight', models.DecimalField(blank=True, null=True, max_digits=6, decimal_places=2)),
                ('goal_weight', models.DecimalField(blank=True, null=True, max_digits=6, decimal_places=2)),
                ('experience', models.CharField(blank=True, max_length=50)),
                ('monthly_workouts', models.PositiveIntegerField(blank=True, null=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='profile', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
