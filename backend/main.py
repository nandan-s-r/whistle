"""Production workspace entry point; legacy tools are excluded."""
import os
from contextlib import asynccontextmanager
from backend.config import load_runtime_config
load_runtime_config()
from backend.security import RequestBudget, require_production_auth, validation_feedback
require_production_auth()
from fastapi import FastAPI,Depends
from fastapi.middleware.cors import CORSMiddleware
from backend.auth import get_current_user
from backend.workspace_api import router as workspace_router
from backend.platform_api import router as platform_router
from backend.observability import initialize_monitoring

initialize_monitoring()

@asynccontextmanager
async def lifespan(app):
    if os.getenv('AUTH_PROVIDER','local') != 'supabase':
        from database.db import engine
        from database.models import Base
        Base.metadata.create_all(engine)
    yield

app=FastAPI(title='Whistle investment workspace',lifespan=lifespan)
from fastapi.exceptions import RequestValidationError
app.add_exception_handler(RequestValidationError, validation_feedback)
app.include_router(workspace_router)
from backend.fund_api import router as fund_router
app.include_router(fund_router)
app.include_router(platform_router)
from backend.calendar_integration import router as calendar_router
app.include_router(calendar_router)
from backend.sourcing_api import router as sourcing_router
app.include_router(sourcing_router)
app.add_middleware(CORSMiddleware,allow_origins=[os.getenv('FRONTEND_URL','http://localhost:3000')],
                   allow_methods=['GET','POST'],allow_headers=['Authorization','Content-Type'])
app.add_middleware(RequestBudget)

@app.get('/health')
def health(): return {'status':'ok','service':'vc-scope-workspace'}

@app.get('/api/auth/me')
def me(user=Depends(get_current_user)):
    return {'email':user.email,'name':user.full_name,'role':user.role,'outreach_identity':None}

@app.middleware('http')
async def headers(request,call_next):
    response=await call_next(request)
    response.headers['Cache-Control']='private, no-store'
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['Referrer-Policy']='no-referrer'
    return response
