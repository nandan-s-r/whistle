"""Bounded public source capture and evidence embeddings. Results always need review."""
import hashlib
import ipaddress
import os
import re
import math
from urllib.parse import urlsplit
import httpx
from pydantic import BaseModel, Field, field_validator
from backend.budgets import reserve_provider

TASKS=('Challenge this claim','Find the weakest assumption','Draft customer-reference questions','Identify conflicting evidence','Explain what changed')


def public_url(value):
    parsed=urlsplit(value)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.port not in (None,443):
        raise ValueError('Use a public HTTPS source URL without credentials, query parameters or fragments.')
    host=parsed.hostname.lower()
    if host in ('localhost','metadata.google.internal') or '.' not in host or host.endswith(('.local','.internal','.localhost','.test','.example','.invalid')):
        raise ValueError('A public source is required.')
    try:
        address=ipaddress.ip_address(host)
    except ValueError:
        address=None
    if address and not address.is_global:
        raise ValueError('Private network addresses cannot be captured.')
    return value


class JobRequest(BaseModel):
    company_slug: str = Field(min_length=1,max_length=120)
    kind: str
    url: str | None = Field(default=None,max_length=2000)
    task: str = Field(default='Challenge this claim',max_length=100)

    @field_validator('task')
    @classmethod
    def task_valid(cls,value):
        if value not in TASKS: raise ValueError('Unknown supervised research task')
        return value

    @field_validator('kind')
    @classmethod
    def kind_valid(cls,value):
        if value not in ('web_capture','research_draft','index_evidence'):
            raise ValueError('Unknown ingestion task')
        return value

    @field_validator('url')
    @classmethod
    def url_valid(cls,value):
        return public_url(value) if value else None


def capture_web(url,budget=None):
    public_url(url)
    key=os.getenv('FIRECRAWL_API_KEY')
    if not key:
        raise ValueError('Firecrawl needs a private API key before web capture can run.')
    reserve_provider(budget)
    with httpx.Client(timeout=70,follow_redirects=False) as client:
        response=client.post('https://api.firecrawl.dev/v2/scrape',headers={'Authorization':'Bearer '+key},
                             json={'url':url,'formats':['markdown'],'onlyMainContent':True,'maxAge':0})
        response.raise_for_status()
        body=response.json()
    if not body.get('success') or not body.get('data',{}).get('markdown'):
        raise ValueError('No readable source was returned.')
    data=body['data'];content=data['markdown'][:12000]
    return {'title':data.get('metadata',{}).get('title') or url,'url':url,'excerpt':content,
            'method':'Firecrawl public-page capture','content_hash':hashlib.sha256(content.encode()).hexdigest(),
            'review_required':True,'state':'Unreviewed source'}


def embed(text, task_type,budget=None):
    key=os.getenv('GEMINI_API_KEY')
    model=os.getenv('GEMINI_EMBEDDING_MODEL','gemini-embedding-001')
    if not key or model != 'gemini-embedding-001':
        raise ValueError('Gemini embeddings need a private key and model identifier.')
    reserve_provider(budget)
    with httpx.Client(timeout=45,follow_redirects=False) as client:
        response=client.post(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent',
            headers={'x-goog-api-key':key},json={'model':'models/'+model,'content':{'parts':[{'text':text[:12000]}]},
                'taskType':task_type,'outputDimensionality':768})
        response.raise_for_status()
        values=response.json()['embedding']['values']
    if len(values)!=768 or any(not isinstance(v,(float,int)) or not math.isfinite(v) for v in values):
        raise ValueError('Embedding dimensions do not match the knowledge index.')
    return values,model
