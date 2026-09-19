
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

