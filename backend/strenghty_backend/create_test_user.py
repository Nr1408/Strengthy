import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','strenghty_backend.settings')
django.setup()
from django.contrib.auth.models import User
username = 'testuser'
password = 'testpass'
email = 'test@example.com'
if not User.objects.filter(username=username).exists():
    User.objects.create_user(username, email, password)
    print('created user', username)
else:
    print('user exists', username)
