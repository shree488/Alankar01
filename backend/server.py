from database import client, db
import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from starlette.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from auth import router as auth_router, seed_owner
from catalog import public, admin
from storage import router as storage_router, init_storage

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app):
    await seed_owner()
    await db.products.create_index([('active', 1), ('created_at', -1)])
    await db.uploads.create_index('expires_at', expireAfterSeconds=0)
    await db.vip_bookings.update_many({'status': 'requested'}, {'$set': {'status': 'Pending'}})
    try:
        await run_in_threadpool(init_storage)
        logging.info('Object storage ready')
    except Exception:
        logging.exception('Object storage initialization failed; uploads will retry initialization')
    yield
    client.close()

app = FastAPI(lifespan=lifespan)
cors_origins = [o.strip().rstrip('/') for o in os.environ.get('CORS_ORIGINS', os.environ.get('FRONTEND_URL', 'http://localhost:3000')).split(',') if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=cors_origins, allow_credentials=True, allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], allow_headers=['Content-Type', 'X-CSRF-Protection'])

@app.middleware('http')
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    if request.url.path.startswith(('/api/auth', '/api/admin')):
        response.headers['Cache-Control'] = 'no-store'
    return response

@app.get('/api/health')
async def health():
    await db.command('ping')
    return {'status': 'ok'}

app.include_router(auth_router)
app.include_router(public)
app.include_router(admin)
app.include_router(storage_router)
