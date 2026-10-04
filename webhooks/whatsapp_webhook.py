"""Signed receipt only. WhatsApp commands and paid AI are not enabled."""
import hashlib
import hmac
import json
import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import PlainTextResponse
from backend.security import RequestBudget

app = FastAPI()
app.add_middleware(RequestBudget)

@app.get('/')
def health_check():
    return {'status': 'Signed receipt only; commands are unavailable'}

@app.post('/webhook')
async def whatsapp_webhook(request: Request):
    secret = os.getenv('WHATSAPP_APP_SECRET')
    if not secret:
        raise HTTPException(503, 'Webhook signing is not configured.')
    raw = bytearray()
    async for chunk in request.stream():
        if len(raw) + len(chunk) > 64 * 1024:
            raise HTTPException(413, 'Webhook message is too large.')
        raw.extend(chunk)
    expected = 'sha256=' + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    signatures = request.headers.getlist('x-hub-signature-256')
    if len(signatures) != 1 or not hmac.compare_digest(signatures[0], expected):
        raise HTTPException(401, 'Invalid webhook signature.')
    try:
        event = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        raise HTTPException(400, 'Invalid webhook event.')
    if not isinstance(event, dict) or event.get('object') != 'whatsapp_business_account':
        raise HTTPException(400, 'Invalid webhook event.')
    # No authorized command adapter exists. Receipt must never invoke a provider,
    # write workspace records, or log personal message contents.
    return {'status': 'received', 'processed': False}

@app.get('/webhook')
async def verify_webhook(request: Request):
    configured = os.getenv('WHATSAPP_VERIFY_TOKEN')
    if not configured:
        raise HTTPException(503, 'Webhook verification is not configured.')
    params = request.query_params
    if params.get('hub.mode') != 'subscribe' or not hmac.compare_digest(params.get('hub.verify_token', ''), configured):
        raise HTTPException(403, 'Webhook verification failed.')
    challenge = params.get('hub.challenge', '')
    if not challenge or len(challenge) > 200:
        raise HTTPException(400, 'Invalid verification challenge.')
    return PlainTextResponse(challenge)
