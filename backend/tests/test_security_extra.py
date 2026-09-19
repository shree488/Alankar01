"""Extra security tests hitting backend directly on localhost:8001 (bypasses ingress
rewrite so we can validate untrusted Origin/Referer server-side; and can exercise
brute-force lockout without locking out the ingress edge IP)."""
import time
import requests
import pytest
from dotenv import dotenv_values
from pymongo import MongoClient

backend_env = dotenv_values('/app/backend/.env')
INTERNAL = 'http://127.0.0.1:8001'
PASSWORD = backend_env['ADMIN_PASSWORD']
MONGO_URL = backend_env['MONGO_URL']
DB_NAME = backend_env['DB_NAME']
TRUSTED = backend_env['CSRF_TRUSTED_ORIGINS'].split(',')[0].strip().rstrip('/')

CSRF_OK = {'X-CSRF-Protection': '1', 'Origin': TRUSTED, 'Referer': f'{TRUSTED}/admin'}


@pytest.fixture(scope='module')
def mongo():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


class TestOriginRefererGuard:
    def test_untrusted_origin_rejected(self):
        r = requests.post(f'{INTERNAL}/api/auth/login',
                          json={'password': PASSWORD},
                          headers={'X-CSRF-Protection': '1', 'Origin': 'https://evil.example.com'},
                          timeout=10)
        assert r.status_code == 403
        assert 'origin' in r.json().get('detail', '').lower()

    def test_untrusted_referer_rejected(self):
        r = requests.post(f'{INTERNAL}/api/auth/login',
                          json={'password': PASSWORD},
                          headers={'X-CSRF-Protection': '1',
                                   'Origin': TRUSTED,
                                   'Referer': 'https://evil.example.com/admin'},
                          timeout=10)
        assert r.status_code == 403
        assert 'refer' in r.json().get('detail', '').lower()

    def test_missing_csrf_header_rejected(self):
        r = requests.post(f'{INTERNAL}/api/auth/login',
                          json={'password': PASSWORD},
                          headers={'Origin': TRUSTED},
                          timeout=10)
        assert r.status_code == 403

    def test_trusted_origin_no_referer_ok(self):
        # A real browser sometimes omits Referer; login should still succeed if Origin trusted.
        r = requests.post(f'{INTERNAL}/api/auth/login',
                          json={'password': PASSWORD},
                          headers={'X-CSRF-Protection': '1', 'Origin': TRUSTED},
                          timeout=10)
        assert r.status_code == 200


class TestBruteForceLockout:
    """Verifies 5-wrong-attempt / 15-minute lockout. Uses INTERNAL loopback so the
    identifier is 127.0.0.1 and does not affect the ingress/edge IP that carries
    real browser traffic. Cleans up the login_attempts row afterward."""

    def test_lockout_after_5_wrong_then_cleanup(self, mongo):
        # ensure clean slate
        mongo.login_attempts.delete_many({'identifier': '127.0.0.1'})
        try:
            for i in range(5):
                r = requests.post(f'{INTERNAL}/api/auth/login',
                                  json={'password': f'wrong-{i}'},
                                  headers=CSRF_OK, timeout=10)
                assert r.status_code == 401, f'attempt {i}: {r.status_code} {r.text}'

            # 6th wrong -> locked (even with correct password now)
            r = requests.post(f'{INTERNAL}/api/auth/login',
                              json={'password': PASSWORD},
                              headers=CSRF_OK, timeout=10)
            assert r.status_code == 429
            assert '15' in r.json().get('detail', '')

            # DB row present with count>=5 and TTL
            row = mongo.login_attempts.find_one({'identifier': '127.0.0.1'})
            assert row and row['count'] >= 5 and row['expires_at']
        finally:
            # cleanup so we don't leave a lockout in place
            mongo.login_attempts.delete_many({'identifier': '127.0.0.1'})

        # After cleanup a correct password succeeds
        r = requests.post(f'{INTERNAL}/api/auth/login',
                          json={'password': PASSWORD},
                          headers=CSRF_OK, timeout=10)
        assert r.status_code == 200
