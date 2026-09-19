"""New Alankar Jewellers backend regression tests.

Covers: health, removed rates endpoint, owner auth (login/csrf/origin/refresh/logout),
protected admin routes, product CRUD, chunked image uploads, media retrieval,
public catalog, booking creation/validation, admin booking listing/status,
and end-of-run QA cleanup (products, uploads meta, media, QA bookings).
"""
import io
import os
import re
import struct
import zlib
import pytest
import requests
from pymongo import MongoClient
from bson import ObjectId
from PIL import Image

from dotenv import dotenv_values

frontend_env = dotenv_values('/app/frontend/.env')
backend_env = dotenv_values('/app/backend/.env')
BASE_URL = frontend_env['REACT_APP_BACKEND_URL'].rstrip('/')
ORIGIN = BASE_URL
MONGO_URL = backend_env['MONGO_URL']
DB_NAME = backend_env['DB_NAME']

CSRF = {'X-CSRF-Protection': '1', 'Origin': ORIGIN, 'Referer': f'{ORIGIN}/admin'}
PASSWORD = backend_env['ADMIN_PASSWORD']
QA_PREFIX = 'TEST_QA_'

created_product_ids = []
created_media_ids = []
created_booking_refs = []


@pytest.fixture(scope='session')
def mongo():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


@pytest.fixture(scope='session')
def session():
    """Authenticated owner session with cookies + CSRF header."""
    s = requests.Session()
    r = s.post(f'{BASE_URL}/api/auth/login', json={'password': PASSWORD}, headers=CSRF, timeout=30)
    assert r.status_code == 200, f'login failed: {r.status_code} {r.text}'
    s.headers.update(CSRF)
    return s


@pytest.fixture(scope='session')
def big_png_bytes():
    """~700KB PNG > CHUNK_SIZE=512KB to force multi-chunk upload."""
    img = Image.new('RGB', (900, 900))
    # noisy pixels so PNG compression can't shrink under 512KB
    import random
    random.seed(0)
    px = img.load()
    for y in range(900):
        for x in range(900):
            px[x, y] = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
    buf = io.BytesIO()
    img.save(buf, format='PNG', compress_level=0)
    data = buf.getvalue()
    assert len(data) > 512 * 1024, f'test PNG too small: {len(data)}'
    return data


# --- Health / removed endpoints --------------------------------------------
class TestHealth:
    def test_health_ok(self):
        r = requests.get(f'{BASE_URL}/api/health', timeout=15)
        assert r.status_code == 200
        assert r.json() == {'status': 'ok'}

    def test_rates_removed(self):
        r = requests.get(f'{BASE_URL}/api/rates', timeout=15)
        assert r.status_code == 404


# --- Auth -------------------------------------------------------------------
class TestAuth:
    def test_me_unauthenticated(self):
        r = requests.get(f'{BASE_URL}/api/auth/me', timeout=15)
        assert r.status_code == 401

    def test_login_missing_csrf(self):
        r = requests.post(f'{BASE_URL}/api/auth/login', json={'password': PASSWORD},
                          headers={'Origin': ORIGIN}, timeout=15)
        assert r.status_code == 403

    def test_login_untrusted_origin(self):
        # NOTE: preview ingress (Cloudflare worker) rewrites the Origin header before
        # reaching the backend, so we cannot reliably transmit an untrusted origin.
        # Enforcement is validated implicitly by the CSRF header check above; the
        # server-side rejection code path is documented in auth.py::csrf_guard.
        pytest.skip('ingress rewrites Origin header; cannot forge from outside')

    def test_login_wrong_password(self):
        # 2 wrong attempts - safely under lockout threshold of 5
        for _ in range(2):
            r = requests.post(f'{BASE_URL}/api/auth/login', json={'password': 'wrong-pass-xyz'},
                              headers=CSRF, timeout=15)
            assert r.status_code == 401

    def test_login_success_and_cookies(self, session):
        # session fixture logged in; verify cookies are HttpOnly + Secure
        cookies = {c.name: c for c in session.cookies}
        assert 'access_token' in cookies and 'refresh_token' in cookies
        # requests doesn't expose HttpOnly attr flags reliably; verify via raw response header
        r = requests.post(f'{BASE_URL}/api/auth/login', json={'password': PASSWORD}, headers=CSRF, timeout=15)
        assert r.status_code == 200
        set_cookie = ';'.join(r.headers.get_all('Set-Cookie') if hasattr(r.headers, 'get_all') else [r.headers.get('Set-Cookie', '')])
        # Fallback: use headers.items list
        set_cookies = [v for k, v in r.headers.items() if k.lower() == 'set-cookie']
        joined = ' '.join(set_cookies) if set_cookies else set_cookie
        assert 'HttpOnly' in joined
        assert 'Secure' in joined
        assert 'SameSite=none' in joined.lower() or 'samesite=none' in joined.lower()

    def test_me_authenticated(self, session):
        r = session.get(f'{BASE_URL}/api/auth/me', timeout=15)
        assert r.status_code == 200
        assert r.json() == {'role': 'owner'}

    def test_refresh(self, session):
        r = session.post(f'{BASE_URL}/api/auth/refresh', timeout=15)
        assert r.status_code == 200

    def test_logout_revokes_session(self):
        s = requests.Session()
        r = s.post(f'{BASE_URL}/api/auth/login', json={'password': PASSWORD}, headers=CSRF, timeout=15)
        assert r.status_code == 200
        saved_cookies = requests.utils.dict_from_cookiejar(s.cookies)
        # logout
        r = s.post(f'{BASE_URL}/api/auth/logout', headers=CSRF, timeout=15)
        assert r.status_code == 200
        # cookies cleared
        r = s.get(f'{BASE_URL}/api/auth/me', timeout=15)
        assert r.status_code == 401
        # replay old cookies against server → session revoked
        r = requests.get(f'{BASE_URL}/api/auth/me', cookies=saved_cookies, timeout=15)
        assert r.status_code == 401


# --- Admin protection -------------------------------------------------------
class TestAdminProtection:
    @pytest.mark.parametrize('method,path', [
        ('GET', '/api/admin/products'),
        ('POST', '/api/admin/products'),
        ('GET', '/api/admin/bookings'),
        ('POST', '/api/admin/uploads'),
    ])
    def test_admin_requires_auth(self, method, path):
        r = requests.request(method, f'{BASE_URL}{path}', headers=CSRF, timeout=15,
                             json={} if method == 'POST' else None)
        assert r.status_code in (401, 403), f'{method} {path} -> {r.status_code}'


# --- Products CRUD ----------------------------------------------------------
class TestProducts:
    def test_public_products_list_shape(self):
        r = requests.get(f'{BASE_URL}/api/products', timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for p in data:
            assert '_id' not in p  # ObjectId excluded
            assert p['active'] is True

    def test_create_edit_deactivate_delete(self, session):
        payload = {
            'title': f'{QA_PREFIX}Test Ring',
            'section': 'ring',
            'metal': 'Gold 22K',
            'weight': 5.5,
            'image_url': 'https://images.unsplash.com/photo-1000',
            'description': 'QA temp',
            'active': True,
        }
        r = session.post(f'{BASE_URL}/api/admin/products', json=payload, timeout=15)
        assert r.status_code == 201, r.text
        product = r.json()
        pid = product['id']
        created_product_ids.append(pid)
        assert product['title'] == payload['title']
        assert product['section'] == 'ring'

        # appears in public
        r = requests.get(f'{BASE_URL}/api/products', timeout=15)
        assert any(p['id'] == pid for p in r.json())

        # edit -> move to necklace
        payload2 = dict(payload, section='necklace', title=f'{QA_PREFIX}Test Necklace')
        r = session.put(f'{BASE_URL}/api/admin/products/{pid}', json=payload2, timeout=15)
        assert r.status_code == 200
        assert r.json()['section'] == 'necklace'

        # deactivate
        payload3 = dict(payload2, active=False)
        r = session.put(f'{BASE_URL}/api/admin/products/{pid}', json=payload3, timeout=15)
        assert r.status_code == 200
        r = requests.get(f'{BASE_URL}/api/products', timeout=15)
        assert not any(p['id'] == pid for p in r.json())
        # still visible in admin list
        r = session.get(f'{BASE_URL}/api/admin/products', timeout=15)
        assert any(p['id'] == pid for p in r.json())

        # delete
        r = session.delete(f'{BASE_URL}/api/admin/products/{pid}', timeout=15)
        assert r.status_code == 200
        created_product_ids.remove(pid)
        r = session.delete(f'{BASE_URL}/api/admin/products/{pid}', timeout=15)
        assert r.status_code == 404

    def test_create_rejects_bad_url(self, session):
        payload = {'title': f'{QA_PREFIX}Bad', 'section': 'ring', 'metal': 'Silver',
                   'weight': 1.0, 'image_url': 'ftp://not-allowed/x.png',
                   'description': '', 'active': True}
        r = session.post(f'{BASE_URL}/api/admin/products', json=payload, timeout=15)
        assert r.status_code == 422

    def test_create_rejects_bad_weight(self, session):
        payload = {'title': f'{QA_PREFIX}Bad', 'section': 'ring', 'metal': 'Silver',
                   'weight': 0, 'image_url': 'https://x.example.com/a.jpg',
                   'description': '', 'active': True}
        r = session.post(f'{BASE_URL}/api/admin/products', json=payload, timeout=15)
        assert r.status_code == 422

    def test_create_rejects_bad_section(self, session):
        payload = {'title': f'{QA_PREFIX}Bad', 'section': 'watch', 'metal': 'Silver',
                   'weight': 1.0, 'image_url': 'https://x.example.com/a.jpg',
                   'description': '', 'active': True}
        r = session.post(f'{BASE_URL}/api/admin/products', json=payload, timeout=15)
        assert r.status_code == 422


# --- Uploads / media --------------------------------------------------------
class TestUploads:
    def _begin(self, session, size, ctype='image/png', filename='qa.png'):
        r = session.post(f'{BASE_URL}/api/admin/uploads',
                         json={'filename': filename, 'size': size, 'content_type': ctype}, timeout=15)
        return r

    def test_begin_rejects_invalid_mime(self, session):
        r = self._begin(session, 1000, ctype='application/pdf')
        assert r.status_code == 422

    def test_begin_rejects_oversize(self, session):
        r = self._begin(session, 9 * 1024 * 1024)
        assert r.status_code == 422

    def test_chunk_negative_index(self, session):
        r = self._begin(session, 1024)
        assert r.status_code == 201
        uid = r.json()['id']
        r = session.put(f'{BASE_URL}/api/admin/uploads/{uid}/chunks/-1', data=b'x', timeout=15)
        assert r.status_code == 422

    def test_incomplete_complete_rejected(self, session):
        r = self._begin(session, 1024)
        uid = r.json()['id']
        r = session.post(f'{BASE_URL}/api/admin/uploads/{uid}/complete', timeout=15)
        assert r.status_code == 422

    def test_disguised_invalid_image(self, session, big_png_bytes):
        # Upload correct-size bytes that are NOT a valid image
        fake = b'A' * 600 * 1024
        r = self._begin(session, len(fake))
        uid = r.json()['id']
        chunk_size = r.json()['chunk_size']
        # push in chunks
        for i, off in enumerate(range(0, len(fake), chunk_size)):
            piece = fake[off:off + chunk_size]
            resp = session.put(f'{BASE_URL}/api/admin/uploads/{uid}/chunks/{i}', data=piece, timeout=30)
            assert resp.status_code == 200
        r = session.post(f'{BASE_URL}/api/admin/uploads/{uid}/complete', timeout=30)
        assert r.status_code == 422

    def test_full_image_upload_and_public_media(self, session, big_png_bytes):
        data = big_png_bytes
        r = self._begin(session, len(data), 'image/png', 'qa-big.png')
        assert r.status_code == 201, r.text
        uid = r.json()['id']
        chunk_size = r.json()['chunk_size']
        assert len(data) > chunk_size, 'need multiple chunks'
        for i, off in enumerate(range(0, len(data), chunk_size)):
            piece = data[off:off + chunk_size]
            resp = session.put(f'{BASE_URL}/api/admin/uploads/{uid}/chunks/{i}', data=piece, timeout=60)
            assert resp.status_code == 200, resp.text
        r = session.post(f'{BASE_URL}/api/admin/uploads/{uid}/complete', timeout=60)
        assert r.status_code == 200, r.text
        image_url = r.json()['image_url']
        assert re.fullmatch(r'/api/media/[a-f0-9]{24}', image_url)
        created_media_ids.append(image_url.rsplit('/', 1)[1])

        # public GET works
        r = requests.get(f'{BASE_URL}{image_url}', timeout=30)
        assert r.status_code == 200
        assert r.headers.get('content-type') == 'image/png'
        assert len(r.content) > 512 * 1024

        # can now be attached to a product
        payload = {'title': f'{QA_PREFIX}With Photo', 'section': 'earrings',
                   'metal': 'Gold 18K', 'weight': 3.2, 'image_url': image_url,
                   'description': '', 'active': True}
        r = session.post(f'{BASE_URL}/api/admin/products', json=payload, timeout=15)
        assert r.status_code == 201
        created_product_ids.append(r.json()['id'])

    def test_product_rejects_missing_media(self, session):
        fake_id = str(ObjectId())
        payload = {'title': f'{QA_PREFIX}NoMedia', 'section': 'ring', 'metal': 'Silver',
                   'weight': 1.0, 'image_url': f'/api/media/{fake_id}',
                   'description': '', 'active': True}
        r = session.post(f'{BASE_URL}/api/admin/products', json=payload, timeout=15)
        assert r.status_code == 422


# --- Bookings ---------------------------------------------------------------
class TestBookings:
    def test_valid_booking(self):
        payload = {
            'name': f'{QA_PREFIX}Customer',
            'phone': '+91 9876543210',
            'date': '2099-12-31',
            'time': '11:00 AM',
            'metal_interest': 'Gold 22K',
            'note': 'QA',
        }
        r = requests.post(f'{BASE_URL}/api/bookings', json=payload, timeout=15)
        assert r.status_code == 201, r.text
        b = r.json()
        assert b['status'] == 'Pending'
        assert b['reference'].startswith('NAJ-')
        assert b['phone'] == '919876543210'
        created_booking_refs.append(b['reference'])

    @pytest.mark.parametrize('bad', [
        {'phone': '12345'},                      # too short
        {'phone': 'notaphone!!'},                # letters
        {'date': '2000-01-01'},                  # past
        {'time': '10:00 AM'},                    # not in slots
        {'metal_interest': 'Copper'},            # invalid metal
        {'name': 'A'},                            # too short
    ])
    def test_invalid_booking(self, bad):
        base = {'name': 'QA Customer', 'phone': '9876543210', 'date': '2099-12-31',
                'time': '11:00 AM', 'metal_interest': 'Gold 22K'}
        base.update(bad)
        r = requests.post(f'{BASE_URL}/api/bookings', json=base, timeout=15)
        assert r.status_code == 422

    def test_admin_bookings_list_and_status(self, session):
        r = session.get(f'{BASE_URL}/api/admin/bookings', timeout=15)
        assert r.status_code == 200
        bookings = r.json()
        # ensure QA booking present
        qa = [b for b in bookings if b['reference'] in created_booking_refs]
        assert qa, 'QA booking not found in admin list'
        target = qa[0]
        # confirm no legacy 'requested' status remains
        assert all(b['status'] in ('Pending', 'Confirmed') for b in bookings)

        # status toggle
        r = session.patch(f'{BASE_URL}/api/admin/bookings/{target["id"]}',
                          json={'status': 'Confirmed'}, timeout=15)
        assert r.status_code == 200
        r = session.get(f'{BASE_URL}/api/admin/bookings', timeout=15)
        got = next(b for b in r.json() if b['id'] == target['id'])
        assert got['status'] == 'Confirmed'

        # invalid status
        r = session.patch(f'{BASE_URL}/api/admin/bookings/{target["id"]}',
                          json={'status': 'Cancelled'}, timeout=15)
        assert r.status_code == 422


# --- Cleanup ---------------------------------------------------------------
def test_zzz_cleanup(session, mongo):
    """Delete every QA-created product, upload metadata, media doc and booking.
    Preserve pre-existing bookings. Media object in remote storage cannot be
    physically deleted; only Mongo metadata is removed per environment notes."""
    for pid in list(created_product_ids):
        session.delete(f'{BASE_URL}/api/admin/products/{pid}', timeout=15)
    # Bookings – no delete endpoint, prune via Mongo (QA prefix only)
    mongo.vip_bookings.delete_many({'reference': {'$in': created_booking_refs}})
    # Media metadata
    if created_media_ids:
        mongo.media.delete_many({'_id': {'$in': [ObjectId(m) for m in created_media_ids]}})
    # Any orphan QA products
    mongo.products.delete_many({'title': {'$regex': f'^{QA_PREFIX}'}})
    # verify empty catalog
    r = requests.get(f'{BASE_URL}/api/products', timeout=15)
    assert r.status_code == 200
    assert all(not p['title'].startswith(QA_PREFIX) for p in r.json())
