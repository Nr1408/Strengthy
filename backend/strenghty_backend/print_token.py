import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'strenghty_backend.settings')
django.setup()
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
u = User.objects.get(username='testuser')
t, created = Token.objects.get_or_create(user=u)
print(t.key)
