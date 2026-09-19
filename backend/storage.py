import io
import os
import uuid
import logging
from datetime import timedelta
import requests
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool
from database import db
from auth import require_owner
from catalog import object_id
from models import Upload, Media, now

router = APIRouter(prefix='/api')
STORAGE_URL = os.environ.get('INTEGRATION_PROXY_URL', 'https://integrations.emergentagent.com').rstrip('/') + '/objstore/api/v1/storage'
storage_key = None
CHUNK_SIZE = 512 * 1024
MAX_SIZE = 8 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 20000000


def init_storage(force=False):
    global storage_key
    if storage_key and not force:
        return storage_key
    key = os.environ.get('EMERGENT_LLM_KEY', 'placeholder')
    if not key or key == 'placeholder':
        return None
    response = requests.post(f'{STORAGE_URL}/init', json={'emergent_key': key}, timeout=30)
    response.raise_for_status()
    storage_key = response.json()['storage_key']
    return storage_key


def storage_request(method, path, data=None, content_type=None):
    headers = {'X-Storage-Key': init_storage()}
    if content_type:
        headers['Content-Type'] = content_type
    response = requests.request(method, f'{STORAGE_URL}/objects/{path}', headers=headers, data=data, timeout=60)
    if response.status_code == 404:
        headers['X-Storage-Key'] = init_storage(force=True)
        response = requests.request(method, f'{STORAGE_URL}/objects/{path}', headers=headers, data=data, timeout=60)
    response.raise_for_status()
    return response

class UploadInput(BaseModel):
    filename: str = Field(min_length=1, max_length=200)
    size: int = Field(gt=0, le=MAX_SIZE)
    content_type: str

@router.post('/admin/uploads', status_code=201)
async def begin_upload(payload: UploadInput, session=Depends(require_owner)):
    if payload.content_type not in ('image/jpeg', 'image/png', 'image/webp'):
        raise HTTPException(422, 'Please choose a JPG, PNG or WebP image (up to 8 MB).')
    upload = Upload(session_id=session.id, **payload.model_dump(), expires_at=now() + timedelta(hours=1))
    await db.uploads.insert_one(upload.to_mongo())
    return {'id': upload.id, 'chunk_size': CHUNK_SIZE}

async def get_upload(upload_id, session):
    raw = await db.uploads.find_one({'_id': object_id(upload_id), 'session_id': session.id, 'expires_at': {'$gt': now()}})
    if not raw:
        raise HTTPException(404, 'Upload expired. Please select your photo again.')
    return Upload.from_mongo(raw)

@router.put('/admin/uploads/{upload_id}/chunks/{index}')
async def upload_chunk(upload_id: str, index: int, request: Request, session=Depends(require_owner)):
    if index < 0:
        raise HTTPException(422, 'Invalid chunk index.')
    upload = await get_upload(upload_id, session)
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > CHUNK_SIZE:
            raise HTTPException(413, 'Upload chunk is too large.')
    if index < len(upload.chunks) and upload.chunks[index] == bytes(data):
        return {'received': upload.received}
    if index != len(upload.chunks) or not data or upload.received + len(data) > upload.size:
        raise HTTPException(422, 'Invalid upload chunk. Please retry the photo upload.')
    result = await db.uploads.update_one({'_id': ObjectId(upload.id), 'received': upload.received}, {'$push': {'chunks': bytes(data)}, '$inc': {'received': len(data)}})
    if not result.modified_count:
        raise HTTPException(409, 'Upload already in progress. Please retry.')
    return {'received': upload.received + len(data)}


def validate_image(data):
    try:
        with Image.open(io.BytesIO(data)) as image:
            kind = image.format
            if kind not in ('JPEG', 'PNG', 'WEBP'):
                raise ValueError()
            if image.width * image.height > 20000000:
                raise ValueError()
            image.verify()
        return {'JPEG': ('jpg', 'image/jpeg'), 'PNG': ('png', 'image/png'), 'WEBP': ('webp', 'image/webp')}[kind]
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(422, 'Invalid image. Use a JPG, PNG or WebP photo under 20 megapixels.')

@router.post('/admin/uploads/{upload_id}/complete')
async def complete_upload(upload_id: str, session=Depends(require_owner)):
    upload = await get_upload(upload_id, session)
    if upload.received != upload.size:
        raise HTTPException(422, 'Upload is incomplete.')
    data = b''.join(upload.chunks)
    ext, content_type = await run_in_threadpool(validate_image, data)
    path = f"{os.environ.get('STORAGE_APP_NAME', 'new-alankar-jewellers')}/uploads/{session.owner_id}/{uuid.uuid4()}.{ext}"
    try:
        result = await run_in_threadpool(storage_request, 'PUT', path, data, content_type)
        result = result.json()
    except requests.RequestException:
        logging.exception('Jewellery photo storage failed')
        raise HTTPException(502, 'Photo storage is unavailable. Retry or use a direct image URL.')
    media = Media(storage_path=result['path'], original_filename=upload.filename, content_type=content_type, size=upload.size)
    await db.media.insert_one(media.to_mongo())
    await db.uploads.delete_one({'_id': ObjectId(upload.id)})
    return {'image_url': f'/api/media/{media.id}'}

@router.get('/media/{media_id}')
async def read_media(media_id: str):
    record = await db.media.find_one({'_id': object_id(media_id), 'is_deleted': False})
    if not record:
        raise HTTPException(404, 'Image not found.')
    media = Media.from_mongo(record)
    try:
        result = await run_in_threadpool(storage_request, 'GET', media.storage_path)
    except requests.RequestException:
        raise HTTPException(502, 'Image temporarily unavailable.')
    return Response(result.content, media_type=media.content_type, headers={'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff'})
