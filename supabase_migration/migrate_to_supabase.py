#!/usr/bin/env python3
"""
Migration helper: move data from Django (local `db.sqlite3`) into Supabase Postgres via the REST API.

Usage:
  Set environment variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE` before running.
  From repo root (activate your venv):

    python supabase_migration/migrate_to_supabase.py --create-users

Options:
  --create-users   Create Supabase auth users from Django users (generates random password).
  --skip-users     Assume Supabase users already exist and provide a JSON mapping file `user_id_map.json`.

Notes:
  - This script uses the Supabase service role key. Keep it secret and run locally or on a secure server.
  - It inserts parent rows first and records ID mappings so child rows reference the correct new ids.
  - Test on a staging Supabase project first.
"""

import os
import sys
import json
import random
import string
import time
from typing import Dict, Any

import requests

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'strenghty_backend.settings')
import django
django.setup()

from django.contrib.auth import get_user_model
from workouts.models import Exercise, Workout, WorkoutSet, CardioSet, Profile, PasswordResetCode

User = get_user_model()

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SERVICE_ROLE = os.environ.get('SUPABASE_SERVICE_ROLE')

if not SUPABASE_URL or not SERVICE_ROLE:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE must be set in the environment.")
    sys.exit(1)

HEADERS = {
    'apikey': SERVICE_ROLE,
    'Authorization': f'Bearer {SERVICE_ROLE}',
    'Content-Type': 'application/json',
}

# Small helpers

def randpass(n=20):
    alphabet = string.ascii_letters + string.digits + "!#$%&*()"
    return ''.join(random.choice(alphabet) for _ in range(n))


def post_rest(table: str, payload: Any, prefer_return=False):
    url = SUPABASE_URL.rstrip('/') + f'/rest/v1/{table}'
    headers = dict(HEADERS)
    if prefer_return:
        headers['Prefer'] = 'return=representation'
    r = requests.post(url, headers=headers, data=json.dumps(payload))
    if not r.ok:
        print(f'ERROR inserting into {table}:', r.status_code, r.text)
        raise SystemExit(1)
    return r.json()


def create_supabase_user(email: str, password: str = None):
    """Create a Supabase Auth user via the Admin API. Returns the user object (including `id`)."""
    url = SUPABASE_URL.rstrip('/') + '/auth/v1/admin/users'
    pwd = password or randpass()
    body = {
        'email': email,
        'password': pwd,
        'email_confirm': True,
    }
    r = requests.post(url, headers={'apikey': SERVICE_ROLE, 'Authorization': f'Bearer {SERVICE_ROLE}', 'Content-Type': 'application/json'}, data=json.dumps(body))
    if not r.ok:
        print('Failed creating supabase user', email, r.status_code, r.text)
        raise SystemExit(1)
    return r.json()


def main():
    args = sys.argv[1:]
    create_users = '--create-users' in args
    skip_users = '--skip-users' in args

    user_map: Dict[int, str] = {}

    # 1) Users
    if create_users:
        print('Creating Supabase Auth users for Django users...')
        for u in User.objects.all():
            email = getattr(u, 'email', None) or f'user{u.id}@example.invalid'
            print('Creating user', u.id, email)
            su = create_supabase_user(email)
            # supabase returns id in `id`
            user_map[u.id] = su.get('id')
            time.sleep(0.05)
        # dump mapping so you can reuse
        with open('supabase_user_id_map.json', 'w') as f:
            json.dump(user_map, f)
        print('Wrote supabase_user_id_map.json')
    elif skip_users:
        # expect a mapping file; tolerate empty or invalid JSON by creating an empty mapping
        try:
            with open('supabase_user_id_map.json', 'r', encoding='utf8') as f:
                try:
                    user_map = json.load(f)
                except (json.JSONDecodeError, ValueError):
                    print('Warning: supabase_user_id_map.json is empty or invalid; using empty mapping')
                    user_map = {}
        except FileNotFoundError:
            print('supabase_user_id_map.json not found; creating empty mapping')
            user_map = {}
            with open('supabase_user_id_map.json', 'w', encoding='utf8') as f:
                json.dump(user_map, f)
        print('Loaded mapping for', len(user_map), 'users')
    else:
        print('No user creation requested. You must ensure Supabase users exist and provide `supabase_user_id_map.json` mapping.')
        if not os.path.exists('supabase_user_id_map.json'):
            print('File supabase_user_id_map.json not found. Exiting.')
            sys.exit(1)
        with open('supabase_user_id_map.json', 'r') as f:
            user_map = json.load(f)

    # 2) Profiles -> insert with user_id = mapped uuid
    print('Migrating profiles...')
    profile_map = {}
    for p in Profile.objects.all():
        uid = user_map.get(p.user_id) if hasattr(p, 'user_id') else None
        if uid is None:
            uid = user_map.get(p.user.id) if hasattr(p, 'user') else None
        payload = {
            'user_id': uid,
            'goals': json.dumps(p.goals) if isinstance(p.goals, str) else (p.goals or []),
            'age': p.age,
            'height': str(p.height) if p.height is not None else None,
            'height_unit': p.height_unit,
            'current_weight': str(p.current_weight) if p.current_weight is not None else None,
            'goal_weight': str(p.goal_weight) if p.goal_weight is not None else None,
            'experience': p.experience,
            'monthly_workouts': p.monthly_workouts,
            'created_at': p.created_at.isoformat() if p.created_at else None,
            'updated_at': p.updated_at.isoformat() if p.updated_at else None,
        }
        resp = post_rest('profiles', [payload], prefer_return=True)
        # resp is an array
        profile_map[p.id] = resp[0].get('id')

    print('Migrating exercises...')
    exercise_map = {}
    for e in Exercise.objects.all():
        owner_uuid = user_map.get(e.owner_id) if hasattr(e, 'owner_id') else user_map.get(e.owner.id)
        payload = {
            'owner_id': owner_uuid,
            'name': e.name,
            'muscle_group': e.muscle_group,
            'description': e.description,
            'custom': e.custom,
            'created_at': e.created_at.isoformat() if e.created_at else None,
            'updated_at': e.created_at.isoformat() if e.created_at else None,
        }
        resp = post_rest('exercises', [payload], prefer_return=True)
        exercise_map[e.id] = resp[0].get('id')

    print('Migrating workouts...')
    workout_map = {}
    for w in Workout.objects.all():
        owner_uuid = user_map.get(w.owner_id) if hasattr(w, 'owner_id') else user_map.get(w.owner.id)
        payload = {
            'owner_id': owner_uuid,
            'name': w.name,
            'date': w.date.isoformat() if w.date else None,
            'notes': w.notes,
            'created_at': w.created_at.isoformat() if w.created_at else None,
            'updated_at': w.updated_at.isoformat() if w.updated_at else None,
            'ended_at': w.ended_at.isoformat() if w.ended_at else None,
        }
        resp = post_rest('workouts', [payload], prefer_return=True)
        workout_map[w.id] = resp[0].get('id')

    print('Migrating workout_sets...')
    set_map = {}
    for s in WorkoutSet.objects.all():
        w_new = workout_map.get(s.workout_id)
        e_new = exercise_map.get(s.exercise_id)
        payload = {
            'workout_id': w_new,
            'exercise_id': e_new,
            'set_number': s.set_number,
            'reps': s.reps,
            'half_reps': s.half_reps,
            'weight': str(s.weight) if s.weight is not None else None,
            'unit': s.unit,
            'is_pr': s.is_pr,
            'is_abs_weight_pr': s.is_abs_weight_pr,
            'is_e1rm_pr': s.is_e1rm_pr,
            'is_volume_pr': s.is_volume_pr,
            'is_rep_pr': s.is_rep_pr,
            'set_type': s.set_type,
            'rpe': str(s.rpe) if s.rpe is not None else None,
            'created_at': s.created_at.isoformat() if s.created_at else None,
        }
        resp = post_rest('workout_sets', [payload], prefer_return=True)
        set_map[s.id] = resp[0].get('id')

    print('Migrating cardio_sets...')
    cardio_map = {}
    for c in CardioSet.objects.all():
        w_new = workout_map.get(c.workout_id)
        e_new = exercise_map.get(c.exercise_id)
        payload = {
            'workout_id': w_new,
            'exercise_id': e_new,
            'set_number': c.set_number,
            'mode': c.mode,
            'duration_seconds': c.duration_seconds,
            'distance_meters': str(c.distance_meters) if c.distance_meters is not None else None,
            'floors': c.floors,
            'level': str(c.level) if c.level is not None else None,
            'split_seconds': str(c.split_seconds) if c.split_seconds is not None else None,
            'spm': str(c.spm) if c.spm is not None else None,
            'is_pr': c.is_pr,
            'is_distance_pr': c.is_distance_pr,
            'is_pace_pr': c.is_pace_pr,
            'is_ascent_pr': c.is_ascent_pr,
            'is_intensity_pr': c.is_intensity_pr,
            'is_split_pr': c.is_split_pr,
            'created_at': c.created_at.isoformat() if c.created_at else None,
        }
        resp = post_rest('cardio_sets', [payload], prefer_return=True)
        cardio_map[c.id] = resp[0].get('id')

    print('Migrating password_reset_codes...')
    for p in PasswordResetCode.objects.all():
        uid = user_map.get(p.user_id) if hasattr(p, 'user_id') else user_map.get(p.user.id)
        payload = {
            'user_id': uid,
            'code': p.code,
            'is_used': p.is_used,
            'created_at': p.created_at.isoformat() if p.created_at else None,
        }
        post_rest('password_reset_codes', [payload], prefer_return=False)

    print('Migration complete.')


if __name__ == '__main__':
    main()
