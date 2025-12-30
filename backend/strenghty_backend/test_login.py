import json
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

url = 'http://127.0.0.1:8000/api/auth/login/'
payload = json.dumps({"username": "testuser", "password": "testpass"}).encode('utf-8')
req = Request(url, data=payload, headers={"Content-Type": "application/json"}, method='POST')
try:
    with urlopen(req, timeout=5) as resp:
        body = resp.read().decode('utf-8')
        print('STATUS', resp.status)
        print('BODY', body)
except HTTPError as e:
    print('HTTPError', e.code)
    try:
        print(e.read().decode('utf-8'))
    except:
        pass
except URLError as e:
    print('URLError', e.reason)
except Exception as e:
    print('ERROR', e)
