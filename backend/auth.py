import os
from datetime import timedelta
from urllib.parse import urlsplit
import bcrypt
import jwt
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool
from database import db
from models import Owner, Session, LoginAttempt, now

router = APIRouter(prefix='/api/auth')
raw_trusted = os.environ.get('CSRF_TRUSTED_ORIGINS', os.environ.get('CORS_ORIGINS', os.environ.get('FRONTEND_URL', 'http://localhost:3000')))
TRUSTED_ORIGINS = {value.strip().rstrip('/') for value in raw_trusted.split(',') if value.strip()}
SECRET = os.environ.get('JWT_SECRET', 'fallback_jwt_secret_dev_12345')

async def csrf_guard(request: Request):
    if request.method not in ('GET', 'HEAD', 'OPTIONS'):
        if request.headers.get('X-CSRF-Protection') != '1':
            raise HTTPException(403, 'Missing request protection.')
        origin = request.headers.get('origin')
        if origin and origin not in TRUSTED_ORIGINS:
            raise HTTPException(403, 'Untrusted origin.')
        referer = request.headers.get('referer')
        if referer:
            parsed = urlsplit(referer)
            if f'{parsed.scheme}://{parsed.netloc}' not in TRUSTED_ORIGINS:
                raise HTTPException(403, 'Untrusted referring site.')

async def seed_owner():
    await db.users.create_index('role', unique=True)
    await db.sessions.create_index('expires_at', expireAfterSeconds=0)
    await db.login_attempts.create_index('identifier', unique=True)
    await db.login_attempts.create_index('expires_at', expireAfterSeconds=0)
    password = os.environ.get('ADMIN_PASSWORD', 'admin@alankar').encode()
    existing = await db.users.find_one({'role': 'owner'})
    if not existing or not bcrypt.checkpw(password, existing['password_hash'].encode()):
        hashed = await run_in_threadpool(bcrypt.hashpw, password, bcrypt.gensalt())
        if existing:
            await db.users.update_one({'_id': existing['_id']}, {'$set': {'password_hash': hashed.decode()}})
            await db.sessions.delete_many({'owner_id': str(existing['_id'])})
        else:
            await db.users.insert_one(Owner(password_hash=hashed.decode()).to_mongo())

async def decode_session(request: Request, kind='access'):
    token = request.cookies.get(f'{kind}_token')
    if not token and kind == 'access':
        auth_header = request.headers.get('authorization') or request.headers.get('Authorization') or ''
        if auth_header.startswith('Bearer '):
            token = auth_header[7:].strip()
    if not token:
        raise HTTPException(401, 'Please log in.')
    try:
        claims = jwt.decode(token, SECRET, algorithms=['HS256'], options={'require': ['exp', 'sub', 'sid', 'type']})
        if claims['type'] != kind or not ObjectId.is_valid(claims['sid']) or not ObjectId.is_valid(claims['sub']):
            raise ValueError()
        raw = await db.sessions.find_one({'_id': ObjectId(claims['sid']), '$or': [{'owner_id': claims['sub']}, {'customer_id': claims['sub']}], 'expires_at': {'$gt': now()}})
        if not raw:
            raise ValueError()
        # Verify user still exists
        user = await db.users.find_one({'_id': ObjectId(claims['sub'])})
        if not user:
            raise ValueError()
        session_obj = Session.from_mongo(raw)
        session_obj._user_role = user.get('role', 'customer')
        return session_obj
    except (jwt.InvalidTokenError, ValueError, KeyError):
        raise HTTPException(401, 'Session expired. Please log in again.')

async def require_owner(request: Request, _=Depends(csrf_guard)):
    session = await decode_session(request)
    if not getattr(session, '_user_role', None) == 'owner':
        raise HTTPException(403, 'Owner access required.')
    return session

async def require_customer(request: Request, _=Depends(csrf_guard)):
    session = await decode_session(request)
    if not getattr(session, '_user_role', None) in ('customer', 'owner'):
        raise HTTPException(403, 'Customer access required.')
    return session

def set_tokens(response: Response, session: Session, include_refresh=True, request: Request = None):
    tokens = {}
    is_secure = True
    if request:
        proto = request.headers.get('x-forwarded-proto', '')
        is_secure = request.url.scheme == 'https' or proto == 'https' or 'onrender.com' in str(request.base_url)
    samesite = 'none' if is_secure else 'lax'
    for kind, lifetime in [('access', 900), ('refresh', 604800)]:
        if kind == 'refresh' and not include_refresh:
            continue
        expiry = min(now() + timedelta(seconds=lifetime), session.expires_at)
        sub = session.owner_id if session.owner_id else session.customer_id
        token = jwt.encode({'sub': sub, 'sid': session.id, 'type': kind, 'exp': expiry}, SECRET, algorithm='HS256')
        tokens[f'{kind}_token'] = token
        response.set_cookie(f'{kind}_token', token, httponly=True, secure=is_secure, samesite=samesite, max_age=max(0, int((expiry - now()).total_seconds())), path='/api')
    response.headers['Cache-Control'] = 'no-store'
    return tokens

class LoginInput(BaseModel):
    password: str = Field(min_length=1, max_length=72)

@router.post('/login', dependencies=[Depends(csrf_guard)])
async def login(payload: LoginInput, request: Request, response: Response):
    identifier = request.client.host
    record = await db.login_attempts.find_one({'identifier': identifier, 'expires_at': {'$gt': now()}})
    if record and record['count'] >= 5:
        raise HTTPException(429, 'Too many attempts. Please try again in 15 minutes.')
    if not record:
        await db.login_attempts.delete_many({'identifier': identifier, 'expires_at': {'$lte': now()}})
    raw_owner = await db.users.find_one({'role': 'owner'})
    owner = Owner.from_mongo(raw_owner)
    valid = await run_in_threadpool(bcrypt.checkpw, payload.password.encode(), owner.password_hash.encode())
    if not valid:
        attempt = LoginAttempt(identifier=identifier, expires_at=now() + timedelta(minutes=15)).to_mongo()
        attempt.pop('count')
        await db.login_attempts.update_one({'identifier': identifier}, {'$inc': {'count': 1}, '$setOnInsert': attempt}, upsert=True)
        raise HTTPException(401, 'Incorrect password. Please try again.')
    await db.login_attempts.delete_many({'identifier': identifier})
    session = Session(owner_id=owner.id, expires_at=now() + timedelta(days=7))
    await db.sessions.insert_one(session.to_mongo())
    tokens = set_tokens(response, session, request=request)
    return {'role': 'owner', 'access_token': tokens.get('access_token')}

@router.get('/me')
async def me(response: Response, session=Depends(require_owner)):
    response.headers['Cache-Control'] = 'no-store'
    return {'role': 'owner'}

@router.post('/refresh', dependencies=[Depends(csrf_guard)])
async def refresh(request: Request, response: Response):
    session = await decode_session(request, 'refresh')
    tokens = set_tokens(response, session, include_refresh=False, request=request)
    return {'role': 'owner', 'access_token': tokens.get('access_token')}

@router.post('/logout', dependencies=[Depends(csrf_guard)])
async def logout(request: Request, response: Response):
    for kind in ('refresh', 'access'):
        try:
            session = await decode_session(request, kind)
            await db.sessions.delete_one({'_id': ObjectId(session.id)})
        except HTTPException:
            pass
    for name in ('access_token', 'refresh_token'):
        response.delete_cookie(name, path='/api', secure=True, httponly=True, samesite='none')
    response.headers['Cache-Control'] = 'no-store'
    return {'locked': True}

import secrets
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from fastapi.responses import RedirectResponse
from models import Customer

GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

@router.get('/google/login')
async def google_login(request: Request):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return RedirectResponse(f'{FRONTEND_URL}/?error=google_not_configured')
    
    redirect_uri = str(request.url_for('google_callback'))
    if redirect_uri.startswith('http://') and 'localhost' not in redirect_uri:
        redirect_uri = redirect_uri.replace('http://', 'https://')
        
    state = secrets.token_urlsafe(16)
    url = f'https://accounts.google.com/o/oauth2/v2/auth?client_id={GOOGLE_CLIENT_ID}&redirect_uri={redirect_uri}&response_type=code&scope=openid%20email%20profile&state={state}'
    
    response = RedirectResponse(url)
    response.set_cookie('oauth_state', state, max_age=600, httponly=True, secure=False, samesite='lax')
    return response

@router.get('/google/callback')
async def google_callback(request: Request, response: Response, code: str = None, state: str = None, error: str = None):
    if error or not code:
        return RedirectResponse(f'{FRONTEND_URL}/?error=google_auth_failed')
    
    saved_state = request.cookies.get('oauth_state')
    if not saved_state or saved_state != state:
        return RedirectResponse(f'{FRONTEND_URL}/?error=invalid_state')
        
    redirect_uri = str(request.url_for('google_callback'))
    if redirect_uri.startswith('http://') and 'localhost' not in redirect_uri:
        redirect_uri = redirect_uri.replace('http://', 'https://')
        
    token_url = 'https://oauth2.googleapis.com/token'
    data = {
        'code': code,
        'client_id': GOOGLE_CLIENT_ID,
        'client_secret': GOOGLE_CLIENT_SECRET,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code',
    }
    
    try:
        r = await run_in_threadpool(requests.post, token_url, data=data)
        r.raise_for_status()
        tokens = r.json()
        id_token_jwt = tokens.get('id_token')
        
        idinfo = await run_in_threadpool(id_token.verify_oauth2_token, id_token_jwt, google_requests.Request(), GOOGLE_CLIENT_ID)
        
        email = idinfo.get('email')
        name = idinfo.get('name', '')
        avatar = idinfo.get('picture', '')
        google_id = idinfo.get('sub')
        
        if not email:
            raise ValueError('No email provided by Google')
            
        raw_user = await db.users.find_one({'email': email})
        if raw_user:
            user = Customer.from_mongo(raw_user)
            await db.users.update_one({'_id': ObjectId(user.id)}, {'$set': {'name': name, 'avatar': avatar, 'google_id': google_id}})
        else:
            user = Customer(email=email, name=name, avatar=avatar, google_id=google_id)
            await db.users.insert_one(user.to_mongo())
            
        session = Session(customer_id=user.id, expires_at=now() + timedelta(days=30))
        await db.sessions.insert_one(session.to_mongo())
        
        final_response = RedirectResponse(f'{FRONTEND_URL}/?google_auth_success=1')
        set_tokens(final_response, session)
        final_response.delete_cookie('oauth_state')
        return final_response
        
    except Exception as e:
        print(f'Google Auth Error: {e}')
        return RedirectResponse(f'{FRONTEND_URL}/?error=google_auth_failed')

@router.get('/me/customer')
async def me_customer(request: Request, session=Depends(require_customer)):
    user_id = session.customer_id or session.owner_id
    raw_user = await db.users.find_one({'_id': ObjectId(user_id)})
    if not raw_user:
        raise HTTPException(404, 'User not found')
    return {'id': str(raw_user['_id']), 'name': raw_user.get('name', 'Owner'), 'email': raw_user.get('email', ''), 'avatar': raw_user.get('avatar', ''), 'role': raw_user.get('role', 'owner')}


class OTPRequestPayload(BaseModel):
    phone: str = Field(min_length=10, max_length=15)

class OTPVerifyPayload(BaseModel):
    phone: str = Field(min_length=10, max_length=15)
    otp: str = Field(min_length=6, max_length=6)

import re

@router.post('/request-otp')
async def request_otp(payload: OTPRequestPayload):
    phone = re.sub(r'\D', '', payload.phone)
    if len(phone) == 12 and phone.startswith('91'):
        phone = phone[2:]
    if len(phone) != 10:
        raise HTTPException(400, '????? ????? ?????? ???? ????')
        
    identifier = phone
    
    record = await db.login_attempts.find_one({'identifier': f'otp_{identifier}', 'expires_at': {'$gt': now()}})
    if record and record.get('count', 0) >= 3:
        raise HTTPException(429, '??? ??????? ????. ????? ???? ?????? ?????? ??????? ???.')
        
    SMS_PROVIDER_API_KEY = os.environ.get('SMS_PROVIDER_API_KEY')
    if not SMS_PROVIDER_API_KEY:
        raise HTTPException(501, 'sms_not_configured')

    otp = str(secrets.randbelow(900000) + 100000)
    hashed = await run_in_threadpool(bcrypt.hashpw, otp.encode(), bcrypt.gensalt())
    
    await db.otp_requests.update_one(
        {'phone': phone},
        {'$set': {'hashed_otp': hashed.decode(), 'expires_at': now() + timedelta(minutes=5), 'attempts': 0}},
        upsert=True
    )
    
    attempt = LoginAttempt(identifier=f'otp_{identifier}', expires_at=now() + timedelta(hours=1)).to_mongo()
    attempt.pop('count', None)
    await db.login_attempts.update_one({'identifier': f'otp_{identifier}'}, {'$inc': {'count': 1}, '$setOnInsert': attempt}, upsert=True)
    
    url = 'https://www.fast2sms.com/dev/bulkV2'
    payload = {
        'variables_values': otp,
        'route': 'otp',
        'numbers': phone
    }
    headers = {
        'authorization': SMS_PROVIDER_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    r = await run_in_threadpool(requests.post, url, data=payload, headers=headers)
    if r.status_code != 200:
        print('Fast2SMS Error:', r.text)
        raise HTTPException(500, 'sms_not_configured')
    
    return {'message': 'OTP Sent'}

@router.post('/verify-otp')
async def verify_otp(payload: OTPVerifyPayload, response: Response):
    phone = re.sub(r'\D', '', payload.phone)
    if len(phone) == 12 and phone.startswith('91'):
        phone = phone[2:]
        
    record = await db.otp_requests.find_one({'phone': phone})
    if not record or record['expires_at'] < now():
        raise HTTPException(400, 'OTP Expired')
        
    if record.get('attempts', 0) >= 5:
        await db.otp_requests.delete_one({'phone': phone})
        raise HTTPException(429, 'Too many attempts')
        
    valid = await run_in_threadpool(bcrypt.checkpw, payload.otp.encode(), record['hashed_otp'].encode())
    if not valid:
        await db.otp_requests.update_one({'phone': phone}, {'$inc': {'attempts': 1}})
        raise HTTPException(400, 'OTP Incorrect')
        
    await db.otp_requests.delete_one({'phone': phone})
    
    raw_user = await db.users.find_one({'phone': phone})
    if raw_user:
        user = Customer.from_mongo(raw_user)
    else:
        user = Customer(phone=phone, name='VIP Customer', email='')
        await db.users.insert_one(user.to_mongo())
        
    session = Session(customer_id=user.id, expires_at=now() + timedelta(days=30))
    await db.sessions.insert_one(session.to_mongo())
    set_tokens(response, session)
    
    return {'id': str(user.id), 'name': user.name, 'phone': phone, 'role': 'customer'}

