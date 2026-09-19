import secrets
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from typing import Literal
from database import db
from auth import require_owner
from models import Product, ProductInput, Booking, BookingInput, now

public = APIRouter(prefix='/api')
admin = APIRouter(prefix='/api/admin', dependencies=[Depends(require_owner)])

def object_id(value):
    if not ObjectId.is_valid(value):
        raise HTTPException(404, 'Record not found.')
    return ObjectId(value)

@public.get('/products')
async def public_products(response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return [Product.from_mongo(doc).model_dump() async for doc in db.products.find({'active': True}).sort('created_at', -1)]

@admin.get('/products')
async def admin_products(response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return [Product.from_mongo(doc).model_dump() async for doc in db.products.find().sort('created_at', -1)]

async def validate_media(source):
    if source.startswith('/api/media/'):
        if not await db.media.find_one({'_id': ObjectId(source.rsplit('/', 1)[1]), 'is_deleted': False}):
            raise HTTPException(422, 'Uploaded photo not found. Please upload again.')

@admin.post('/products', status_code=201)
async def add_product(payload: ProductInput):
    await validate_media(payload.image_url)
    product = Product(**payload.model_dump())
    await db.products.insert_one(product.to_mongo())
    return product.model_dump()

@admin.put('/products/{product_id}')
async def edit_product(product_id: str, payload: ProductInput):
    await validate_media(payload.image_url)
    updates = payload.model_dump()
    updates['updated_at'] = now()
    result = await db.products.update_one({'_id': object_id(product_id)}, {'$set': updates})
    if not result.matched_count:
        raise HTTPException(404, 'Product not found.')
    return Product.from_mongo(await db.products.find_one({'_id': object_id(product_id)})).model_dump()

@admin.delete('/products/{product_id}')
async def delete_product(product_id: str):
    result = await db.products.delete_one({'_id': object_id(product_id)})
    if not result.deleted_count:
        raise HTTPException(404, 'Product not found.')
    return {'deleted': True}

@public.post('/bookings', status_code=201)
async def add_booking(payload: BookingInput):
    booking = Booking(reference='NAJ-' + secrets.token_hex(4).upper(), **payload.model_dump())
    await db.vip_bookings.insert_one(booking.to_mongo())
    return booking.model_dump()

@admin.get('/bookings')
async def bookings(response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return [Booking.from_mongo(doc).model_dump() async for doc in db.vip_bookings.find().sort('created_at', -1)]

class BookingStatus(BaseModel):
    status: Literal['Pending', 'Confirmed']

@admin.patch('/bookings/{booking_id}')
async def update_booking(booking_id: str, payload: BookingStatus):
    result = await db.vip_bookings.update_one({'_id': object_id(booking_id)}, {'$set': {'status': payload.status}})
    if not result.matched_count:
        raise HTTPException(404, 'Appointment not found.')
    return {'status': payload.status}
