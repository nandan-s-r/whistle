import os
import secrets
from hashlib import sha256
from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database.db import get_db
from database.models import User

# Load secret key from environment or use a fallback at runtime
jwt_secret_env = os.getenv("JWT_SECRET")
if not jwt_secret_env:
    if os.getenv("ENVIRONMENT") == "production" and os.getenv("AUTH_PROVIDER") != "supabase":
        raise RuntimeError("JWT_SECRET must be configured in production")
    SECRET_KEY = secrets.token_urlsafe(48)
    print("Development JWT secret generated; sessions expire when the server restarts.")
else:
    SECRET_KEY = jwt_secret_env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# OAuth2 scheme for extracting token from Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")
RETIRED_LOCAL_IDENTITIES = frozenset(('admin@sr.capital','test@vc.os'))


def retired_credential(user):
    # This public former fixture password is used only to reject unsafe upgrades.
    return user.email.lower() in RETIRED_LOCAL_IDENTITIES and verify_password('Password123!',user.hashed_password)


def credential_version(user):
    return sha256(user.hashed_password.encode()).hexdigest()

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from backend.supabase_gateway import enabled, authenticate
    if enabled():
        return authenticate(token)
    if os.getenv("AUTH_PROVIDER") == "hybrid":
        try:
            # Routing hint only; Supabase verifies the selected cloud token.
            issuer = jwt.decode(token, options={"verify_signature": False}).get("iss")
        except jwt.InvalidTokenError:
            issuer = None
        if issuer == os.getenv("SUPABASE_URL", "").rstrip("/") + "/auth/v1":
            return authenticate(token)
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.InvalidTokenError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if user is None or not user.is_active:
        raise credentials_exception
    version=payload.get('credential_version')
    if (version is not None or user.email.lower() in RETIRED_LOCAL_IDENTITIES) and version!=credential_version(user):
        raise credentials_exception
    return user
