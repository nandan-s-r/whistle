"""Connection status, supervised jobs, private files, and scoped knowledge search."""
import os
from uuid import uuid4,UUID
from urllib.parse import quote
from fastapi import APIRouter,Depends,HTTPException,Request
from starlette.datastructures import UploadFile
from pydantic import BaseModel,Field
from backend.auth import get_current_user
from backend.workspace_repository import get_repository
from backend.workspace_api import writer,Action,act
from backend.supabase_gateway import Gateway
from backend.ingestion import JobRequest,embed
from backend.job_store import JobStore
from backend.budgets import ProviderBudget
from backend.workspace_schema import now
from backend.stored_records import stored_company
from backend.platform_capabilities import task_capabilities

router=APIRouter(prefix='/api/platform',tags=['Workspace platform'])
TASKS=('Challenge this claim','Find the weakest assumption','Draft customer-reference questions','Identify conflicting evidence','Explain what changed')


@router.get('/connections')
def connections(user=Depends(get_current_user)):
    from backend.calendar_integration import calendar_status
    from backend.industry_research import research_capabilities
    from backend.fund_repository import cloud_funds_enabled
    cloud=bool(getattr(user,'supabase_token',None))
    research=research_capabilities(user)
    capabilities=task_capabilities(user)
    def configured(name): return bool(os.getenv(name))
    return {'mode':'Supabase workspace' if cloud else 'Local workspace', 'checked_at':now(), 'check_scope':'Configuration only; live delivery is confirmed by individual workflow results.', 'tasks':capabilities, 'connections':[
        {'name':'Supabase Auth, RLS & Storage','state':'Cloud session active' if cloud else 'Cloud sign-in available', 'detail':'Authenticated cloud identity. File access and multi-user row isolation still require live workflow checks.' if cloud else 'Sign in with Supabase to use the separate cloud workspace. Local records remain in this workspace.'},
        {'name':'Gemini research','state':'Configured · untested' if research['gemini']['selectable'] else 'Cloud sign-in required' if configured('GEMINI_API_KEY') and os.getenv('AUTH_PROVIDER')=='hybrid' and not cloud else 'Needs setup','detail':research['gemini']['detail']+' Cited drafts require analyst approval.'},
        {'name':'Knowledge search · pgvector','state':'Configured · untested' if capabilities['index_evidence']['selectable'] else 'Needs setup','detail':capabilities['index_evidence']['detail']+' Search returns 768-dimensional semantic matches, not verified facts.'},
        {'name':'Firecrawl web ingestion','state':'Configured · untested' if research['firecrawl']['selectable'] else 'Cloud sign-in required' if configured('FIRECRAWL_API_KEY') and os.getenv('AUTH_PROVIDER')=='hybrid' and not cloud else 'Needs runtime key','detail':research['firecrawl']['detail']+' Captures stay unreviewed; app credits are not established by the chat connector.'},
        {'name':'Apollo people data','state':'Not connected to app','detail':'The last chat connector check returned API_INACCESSIBLE on its Free plan. This is not an app runtime connection. No email or phone enrichment ran.'},
        {'name':'Crunchbase · Dealroom · Tracxn','state':'Needs licensed access','detail':'No licensed funding feed is connected. Authorized source files can be stored privately; funding facts still need claim review.'},
        {'name':'LinkedIn','state':'Manual authorized sources','detail':'Use public profile links and authorized exports. No account scraping or automatic outreach.'},
        {'name':'Product Hunt sourcing','state':'Public feed available','detail':'Discover → Deal sourcing reads the official public launch feed. Limited coverage; launch text does not verify customer adoption. Full API commercial access requires provider permission.'},
        {'name':'GitHub discovery','state':'Public API available','detail':'Industry-topic search in Discover. Recent public projects and stars are research leads, not verified founders or customer adoption.'},
        {'name':'Calendly meetings', **{k:v for k,v in calendar_status(user).items() if k in ('state','detail')}},
        {'name':'Team deal access','state':'Available locally' if not cloud else 'Configured · untested' if cloud_funds_enabled() else 'Needs hosted setup','detail':'Library → Fund access manages existing members and individual deal permissions. Personal records are not shared automatically. Hosted two-user acceptance remains required.'},
        {'name':'X customer signals','state':'Configured · untested' if configured('X_BEARER_TOKEN') and (cloud or os.getenv('AUTH_PROVIDER')!='hybrid') else 'Cloud sign-in required' if configured('X_BEARER_TOKEN') else 'Needs access','detail':'Official recent-search API for a selected candidate; entitlement and successful delivery are unverified. Unreviewed posts require author and customer-relationship checks. No browser-account scraping.'},
        {'name':'Zapier','state':'Not connected','detail':'Authenticated workspace APIs exist, but no Zapier automation or scoped integration credential is connected.'},
        {'name':'Background jobs','state':'Worker configuration only' if capabilities['worker']['selectable'] else 'Needs worker setup','detail':capabilities['worker']['detail']+' Persisted jobs use leases, retries and cancellation. Worker delivery needs a completed job.'},
        {'name':'Sentry','state':'Configured · untested' if configured('SENTRY_DSN') else 'Needs DSN','detail':'Backend error sanitization excludes research, request bodies, tokens and personal fields. Delivery to Sentry is unverified.'},
        {'name':'PostHog','state':'Frontend configuration','detail':'Optional curated workflow events. Autocapture, replay, page URLs and personal identification are disabled.'},
        {'name':'News feeds','state':'Needs provider selection','detail':'Use captured public news URLs now. A dedicated licensed news-search feed is not connected.'},
        {'name':'GitHub checks & Docker','state':'Prepared locally','detail':'Build, API, database-policy and Playwright checks are defined. No workflow run or deployment has been claimed.'},
    ]}


@router.get('/jobs')
def jobs(user=Depends(get_current_user)):
    return JobStore(user).list()


@router.post('/jobs')
def queue(payload:JobRequest,user=Depends(get_current_user),repo=Depends(get_repository)):
    writer(user)
    company=repo.find(payload.company_slug)
    if not company: raise HTTPException(404,'Company not found in your workspace.')
    if getattr(company,'fund_record',False):
        raise HTTPException(503,'Fund background processing is not enabled yet. Review the shared record directly.')
    capability=task_capabilities(user)[payload.kind]
    if not capability['selectable']:
        raise HTTPException(422,capability['detail'])
    if payload.kind=='web_capture' and (not payload.url or not os.getenv('FIRECRAWL_API_KEY')):
        raise HTTPException(422,'Add a Firecrawl key in private settings and enter a public source URL.')
    if payload.kind=='research_draft' and payload.task not in TASKS:
        raise HTTPException(422,'Select an available supervised research task.')
    if payload.kind=='index_evidence' and (not hasattr(user,'supabase_token') or not os.getenv('GEMINI_API_KEY')):
        raise HTTPException(422,'Indexing requires Supabase sign-in and a Gemini embedding key.')
    if hasattr(user,'supabase_token') and not os.getenv('SUPABASE_SERVICE_ROLE_KEY'):
        raise HTTPException(503,'The private cloud worker key is missing. Your company record was not changed.')
    store=JobStore(user)
    row=store.create(company,payload.kind,{'url':payload.url,'task':payload.task,'company_slug':payload.company_slug})
    if os.getenv('JOB_WORKER_MODE')=='celery':
        try:
            from backend.celery_app import run_job
            run_job.delay(row['id'])
        except Exception:
            # The scheduler will find the persisted job even if broker delivery failed.
            pass
    return row


@router.post('/jobs/{jid}/cancel')
def cancel(jid:str,user=Depends(get_current_user)):
    writer(user);store=JobStore(user);row=store.get(jid)
    if not row: raise HTTPException(404,'Job not found in your workspace.')
    if row['state'] in ('Succeeded','Failed','Cancelled'):
        raise HTTPException(409,'This job has already finished.')
    store.change(jid,{'cancelled':True})
    return {'message':'Cancellation requested. Pending results will be discarded.'}


class DraftAcceptance(BaseModel):
    revision:int=Field(ge=1)


@router.post('/jobs/{jid}/save-draft')
def save_draft(jid:str,payload:DraftAcceptance,user=Depends(get_current_user),repo=Depends(get_repository)):
    writer(user);job=JobStore(user).get(jid)
    if not job or job['state']!='Succeeded' or job['kind']!='research_draft':
        raise HTTPException(422,'Select a completed research draft.')
    company=next((c for c in repo.companies() if (c.id if hasattr(user,'supabase_token') else c.slug)==job['company_id']),None)
    if not company: raise HTTPException(404,'Company unavailable.')
    if payload.revision!=company.revision or job['company_revision']!=company.revision:
        raise HTTPException(409,'The company changed since this research ran. Review its current evidence and queue a new draft.')
    from backend.workspace_schema import Company,AIRun
    data=stored_company(company)
    if any(r.id==jid for r in data.ai_runs): raise HTTPException(409,'This draft is already saved.')
    result=job['result']
    data.ai_runs.append(AIRun(id=jid,task=job['payload']['task'],provider=result['provider'],model=result['model'],
        source_ids=result['source_ids'],steps=['Read scoped sources','Draft questions','Await analyst review'],draft=result['draft'],status='Draft',created_at=now()))
    repo.save(company,data.model_dump(mode='json'),payload.revision,'save_job_draft')
    return {'message':'Draft saved for review. No claims have been changed.'}


class KnowledgeQuery(BaseModel):
    query:str=Field(min_length=3,max_length=1000)


@router.post('/knowledge/search')
def knowledge(payload:KnowledgeQuery,user=Depends(get_current_user)):
    capability=task_capabilities(user)['knowledge_search']
    if not capability['selectable']: raise HTTPException(422,capability['detail'])
    try: values,model=embed(payload.query,'RETRIEVAL_QUERY',ProviderBudget(user))
    except HTTPException: raise
    except Exception: raise HTTPException(502,'The embedding provider is unavailable or not configured.')
    return {'matches':Gateway(user.supabase_token).request('POST','/rest/v1/rpc/vc_match_evidence',data={'query_embedding':values,'match_count':8}),
            'method':'Semantic similarity over your indexed source excerpts. Similarity does not verify a claim.'}


@router.post('/files')
async def upload(request:Request,user=Depends(get_current_user)):
    writer(user)
    if not hasattr(user,'supabase_token'): raise HTTPException(422,'Private file storage requires Supabase sign-in.')
    # Authenticate first, then bound the entire multipart envelope before parsing.
    from backend.security import FILE_BYTES,FILE_REQUEST_BYTES
    body=bytearray()
    async for chunk in request.stream():
        if len(body)+len(chunk)>FILE_REQUEST_BYTES: raise HTTPException(413,'Upload exceeds the file size limit.')
        body.extend(chunk)
    request._body=bytes(body)
    del body
    async with request.form(max_files=1,max_fields=0) as form:
        file=form.get('file')
        if not isinstance(file,UploadFile) or len(form.multi_items())!=1:
            raise HTTPException(422,'Upload exactly one file in the file field.')
        data=await file.read(FILE_BYTES+1)
        if not data or len(data)>FILE_BYTES: raise HTTPException(422,'Upload a non-empty PDF or text file up to 20 MB.')
        name=(file.filename or 'Evidence file')[:200]
        if file.content_type=='application/pdf' and data.startswith(b'%PDF-'): suffix='pdf';mime='application/pdf'
        elif file.content_type=='text/plain':
            try: data.decode('utf-8')
            except UnicodeDecodeError: raise HTTPException(422,'Text files must use UTF-8.')
            suffix='txt';mime='text/plain'
        else: raise HTTPException(422,'Supported formats are PDF and UTF-8 plain text.')
    path=f'{user.id}/{uuid4()}.{suffix}'
    Gateway(user.supabase_token).request('POST','/storage/v1/object/vc-evidence/'+path,
        content=data,headers={'Content-Type':mime,'x-upsert':'false'})
    return {'path':path,'name':name,'state':'Stored privately; not verified'}


@router.get('/files')
def files(user=Depends(get_current_user)):
    if not hasattr(user,'supabase_token'): return []
    rows=Gateway(user.supabase_token).request('POST','/storage/v1/object/list/vc-evidence',data={'prefix':user.id+'/', 'limit':50,'sortBy':{'column':'created_at','order':'desc'}})
    return [{**row,'path':user.id+'/'+row['name']} for row in rows if row.get('id')]


class FileLink(BaseModel):
    path:str=Field(max_length=120)


@router.post('/files/link')
def link(payload:FileLink,user=Depends(get_current_user)):
    if not hasattr(user,'supabase_token') or not payload.path.startswith(user.id+'/') or '..' in payload.path:
        raise HTTPException(404,'File not found in your workspace.')
    data=Gateway(user.supabase_token).request('POST','/storage/v1/object/sign/vc-evidence/'+quote(payload.path,safe='/'),data={'expiresIn':60})
    return {'url':os.environ['SUPABASE_URL'].rstrip('/')+'/storage/v1'+data['signedURL'],'expires_in':60}
