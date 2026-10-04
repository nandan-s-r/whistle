"""Configuration checks only; never probe providers or disclose private settings."""
import os
import re

from backend.workspace_provider import provider_status


def task_capabilities(user):
    cloud = bool(getattr(user, 'supabase_token', None))
    provider_allowed = cloud or os.getenv('AUTH_PROVIDER') != 'hybrid'
    database = os.getenv('JOB_DATABASE', 'local')
    mode = os.getenv('JOB_WORKER_MODE', 'embedded')
    worker_reason = ''
    if mode not in ('embedded', 'external', 'celery'):
        worker_reason = 'Choose a supported background worker mode.'
    elif cloud != (database == 'supabase'):
        worker_reason = 'The background worker targets a different workspace. Its database must match this account.'
    elif cloud and not os.getenv('SUPABASE_SERVICE_ROLE_KEY'):
        worker_reason = 'The private cloud worker key is missing.'
    elif mode == 'embedded' and (os.getenv('ENVIRONMENT') == 'production' or os.getenv('AUTH_PROVIDER') == 'supabase'):
        worker_reason = 'This deployment needs a separately started external or Celery worker.'
    status = provider_status()
    research_reason = worker_reason
    if not research_reason and status['external_access'] and not provider_allowed:
        research_reason = 'Use cloud sign-in for provider research in this hybrid preview.'
    if not research_reason and status['provider'] == 'Gemini' and not re.fullmatch(r'[A-Za-z0-9._-]+', status['model']):
        research_reason = 'Configure a valid Gemini model identifier.'
    capture_reason = worker_reason or (
        'Add a private Firecrawl runtime key; the chat connector does not supply one.' if not os.getenv('FIRECRAWL_API_KEY') else
        'Use cloud sign-in for Firecrawl in this hybrid preview.' if not provider_allowed else '')
    embedding_reason = (
        'Use cloud sign-in for knowledge search.' if not cloud else
        'Configure the private Gemini embedding key and supported embedding model.' if not os.getenv('GEMINI_API_KEY') or os.getenv('GEMINI_EMBEDDING_MODEL', 'gemini-embedding-001') != 'gemini-embedding-001' else '')
    index_reason = worker_reason or embedding_reason
    return {
        'research_draft': {'selectable': not research_reason, 'detail': research_reason or ('Rules-based draft; no external model call.' if not status['external_access'] else 'Provider configuration is present. Successful delivery is not yet confirmed.')},
        'web_capture': {'selectable': not capture_reason, 'detail': capture_reason or 'Runtime key present. Provider entitlement and credits are checked when capture runs.'},
        'index_evidence': {'selectable': not index_reason, 'detail': index_reason or 'Worker and embedding configuration present; this does not establish that any evidence has been indexed.'},
        'knowledge_search': {'selectable': not embedding_reason, 'detail': embedding_reason or 'Embedding configuration present; search needs previously indexed sources.'},
        'worker': {'selectable': not worker_reason, 'detail': worker_reason or f'{mode.capitalize()} worker configuration; no heartbeat or successful job is established by this check.'},
    }
