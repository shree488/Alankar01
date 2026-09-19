
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

