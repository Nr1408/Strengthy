from django.contrib.auth import get_user_model
from workouts.models import Workout, Exercise
from rest_framework.test import APIClient
from django.utils import timezone
import traceback

User = get_user_model()

print('Starting repro script')
try:
    # Create a test user
    username = 'repro_user'
    email = 'repro@example.com'
    password = 'testpassword123'
    user, created = User.objects.get_or_create(username=username, defaults={'email': email})
    if created:
        user.set_password(password)
        user.save()
        print('Created test user')
    else:
        print('Using existing test user')

    # Create a workout and exercise for this user
    w, _ = Workout.objects.get_or_create(owner=user, date=timezone.now().date(), defaults={'name': 'Repro Workout'})
    e, _ = Exercise.objects.get_or_create(owner=user, name='Repro Exercise', defaults={'muscle_group': 'OTHER'})

    client = APIClient()
    client.force_authenticate(user)

    payload = {
        'workout': w.id,
        'exercise': e.id,
        'reps': 5,
        'half_reps': 1,
        'weight': 100,
        'unit': 'lbs',
    }

    print('Posting payload:', payload)
    resp = client.post('/api/sets/', payload, format='json')
    print('Response status:', resp.status_code)
    try:
        print('Response data:', resp.data)
    except Exception:
        print('Response text unknown')

except Exception as exc:
    print('Exception during repro:')
    traceback.print_exc()

print('Done')
