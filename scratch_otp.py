
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
    
    # Placeholder for real SMS provider integration
    print(f'SMS PROVIDER REQUEST -> Sending OTP {otp} to {phone}')
    
    return {'message': 'OTP ?????? ???'}

@router.post('/verify-otp')
async def verify_otp(payload: OTPVerifyPayload, response: Response):
    phone = re.sub(r'\D', '', payload.phone)
    if len(phone) == 12 and phone.startswith('91'):
        phone = phone[2:]
        
    record = await db.otp_requests.find_one({'phone': phone})
    if not record or record['expires_at'] < now():
        raise HTTPException(400, 'OTP ???????? ???? ???. ???? OTP ?????.')
        
    if record.get('attempts', 0) >= 5:
        await db.otp_requests.delete_one({'phone': phone})
        raise HTTPException(429, '??? ??????? ????. ????? ???? ?????? ?????? ??????? ???.')
        
    valid = await run_in_threadpool(bcrypt.checkpw, payload.otp.encode(), record['hashed_otp'].encode())
    if not valid:
        await db.otp_requests.update_one({'phone': phone}, {'$inc': {'attempts': 1}})
        raise HTTPException(400, 'OTP ?????? ???.')
        
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

