from datetime import datetime, timezone, date as Date
from typing import Annotated, Literal
from urllib.parse import urlparse
from bson import ObjectId
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator
import re

PyObjectId = Annotated[str, BeforeValidator(str)]

def now():
    return datetime.now(timezone.utc)

class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias='_id')

    def to_mongo(self):
        doc = self.model_dump(by_alias=True)
        doc['_id'] = ObjectId(self.id)
        return doc

    @classmethod
    def from_mongo(cls, doc):
        return cls.model_validate(doc)

Section = Literal['ring', 'necklace', 'bangles', 'mangalsutra', 'earrings', 'chain', 'silver_jewelry', 'rani_haar', 'other']
Metal = Literal['Gold 24K', 'Gold 22K', 'Gold 18K', 'Silver', 'Platinum']
TIME_SLOTS = ['11:00 AM', '12:30 PM', '02:00 PM', '03:30 PM', '05:00 PM', '06:30 PM', '07:30 PM']

class ProductInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')
    title: str = Field(min_length=2, max_length=120)
    section: Section
    metal: Metal
    weight: float = Field(gt=0, le=100000, allow_inf_nan=False)
    image_url: str = Field(min_length=1, max_length=2048)
    description: str = Field(max_length=2000)
    active: bool = True

    @field_validator('image_url')
    @classmethod
    def image_source(cls, value):
        if re.fullmatch(r'/api/media/[a-f0-9]{24}', value):
            return value
        parsed = urlparse(value)
        if parsed.scheme not in ('https', 'http') or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError('Use a direct HTTPS/HTTP image URL or upload a photo.')
        return value

class Product(BaseDocument, ProductInput):
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)

class BookingInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str = Field(min_length=2, max_length=80)
    phone: str
    date: str
    time: str
    metal_interest: Metal
    consultation_type: str = 'In-Store Appointment'
    note: str = Field(default='', max_length=1000)

    @field_validator('phone')
    @classmethod
    def phone_valid(cls, value):
        if not re.fullmatch(r'[+\d\s()-]+', value):
            raise ValueError('Enter a valid phone number.')
        digits = re.sub(r'\D', '', value)
        if len(digits) == 10:
            return digits
        if len(digits) == 12 and digits.startswith('91'):
            return digits
        raise ValueError('Enter a 10-digit Indian phone number, optionally with +91.')

    @field_validator('date')
    @classmethod
    def date_valid(cls, value):
        from zoneinfo import ZoneInfo
        parsed = Date.fromisoformat(value)
        if parsed < datetime.now(ZoneInfo('Asia/Kolkata')).date():
            raise ValueError('Please select today or a future date.')
        return value

    @field_validator('time')
    @classmethod
    def time_valid(cls, value):
        if value not in TIME_SLOTS:
            raise ValueError('Please select an available time slot.')
        return value

class Booking(BaseDocument):
    reference: str
    name: str
    phone: str
    date: str
    time: str
    metal_interest: str
    consultation_type: str = 'In-Store Appointment'
    note: str = ''
    status: Literal['Pending', 'Confirmed'] = 'Pending'
    created_at: datetime = Field(default_factory=now)

class Owner(BaseDocument):
    role: str = 'owner'
    password_hash: str

class Customer(BaseDocument):
    role: str = 'customer'
    email: str | None = None
    name: str | None = None
    phone: str | None = None
    avatar: str | None = None
    google_id: str | None = None

class Session(BaseDocument):
    owner_id: PyObjectId | None = None
    customer_id: PyObjectId | None = None
    expires_at: datetime

class LoginAttempt(BaseDocument):
    identifier: str
    count: int = 0
    expires_at: datetime

class Media(BaseDocument):
    storage_path: str
    original_filename: str
    content_type: str
    size: int
    is_deleted: bool = False
    created_at: datetime = Field(default_factory=now)

class Upload(BaseDocument):
    session_id: PyObjectId
    filename: str
    size: int
    content_type: str
    chunks: list[bytes] = Field(default_factory=list)
    received: int = 0
    expires_at: datetime
