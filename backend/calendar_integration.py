"""Selected Calendly intake for a single explicitly bound internal account.

No invitees, private meeting notes, scheduling writes, or automatic sharing.
Public SaaS multi-account use requires per-user OAuth, not this internal PAT.
"""
import hashlib
import hmac
import json
import os
import re
import time
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from backend.auth import SECRET_KEY, get_current_user
from backend.budgets import ProviderBudget, reserve_provider
from backend.workspace_api import writer, record, public_record
from backend.workspace_repository import get_repository
from backend.workspace_workflows import Meeting
from backend.workspace_schema import Interaction, now
from backend.stored_records import stored_company
from backend.industry_research import bounded_json, redact

router = APIRouter(prefix='/api/platform/calendly', tags=['Selected calendar intake'])
API = 'https://api.calendly.com'
SIGNING_KEY = hmac.new(SECRET_KEY.encode(), b'whistle:calendly:v1', hashlib.sha256).digest()


def account_scope(user):
    return ('cloud:' if getattr(user, 'supabase_token', None) else 'local:') + str(user.id)


def calendar_status(user):
    configured = bool(os.getenv('CALENDLY_ACCESS_TOKEN')) and bool(os.getenv('CALENDLY_ACCOUNT_SCOPE'))
    bound = configured and os.getenv('CALENDLY_ACCOUNT_SCOPE') == account_scope(user)
    provider_allowed = bool(getattr(user, 'supabase_token', None)) or os.getenv('AUTH_PROVIDER') != 'hybrid'
    allowed = bound and provider_allowed
    return {'available': allowed, 'state': 'Configured for this account' if allowed else 'Needs private account setup',
            'detail': 'Read-only selected-event import. Connection is checked when you load meetings. No invitation, attendance or founder reply is inferred.' if allowed else
                      'Use cloud sign-in in this hybrid preview, then bind Calendly to that cloud account. Local accounts cannot perform private-provider work.' if not provider_allowed else
                      'An operator must bind a private Calendly token to your Whistle account. Other accounts cannot read its meetings. Multi-user hosted Calendly needs per-user OAuth.',
            'account_scope': account_scope(user)}


def credential(user):
    if not calendar_status(user)['available']:
        raise HTTPException(422, 'Calendly is not configured for this account. No calendar was read.')
    return os.environ['CALENDLY_ACCESS_TOKEN']


def get_json(client, path, key, budget, params=None):
    reserve_provider(budget)
    try:
        return bounded_json(client, 'GET', API + path, headers={'Authorization': 'Bearer ' + key}, params=params)
    except httpx.HTTPStatusError as error:
        message = 'Calendly rejected access. Check private token scopes.' if error.response.status_code in (401, 403) else 'Calendly is temporarily unavailable or rate-limited.'
        raise HTTPException(502, message) from None
    except Exception:
        raise HTTPException(502, 'Calendly did not return a usable response. No company record was changed.') from None


def resource_id(uri, kind):
    match = re.fullmatch(r'https://api\.calendly\.com/' + kind + r'/([A-Za-z0-9-]{8,100})', uri or '')
    if not match:
        raise ValueError('Invalid provider identity')
    return match.group(1)


def event_summary(event, user_uri):
    resource_id(event.get('uri'), 'scheduled_events')
    if not any(member.get('user') == user_uri for member in event.get('event_memberships', []) if isinstance(member, dict)):
        raise ValueError('Event is outside the connected calendar')
    start = datetime.fromisoformat(event['start_time'].replace('Z', '+00:00'))
    end = datetime.fromisoformat(event['end_time'].replace('Z', '+00:00'))
    if start.tzinfo is None or end.tzinfo is None or event.get('status') not in ('active', 'canceled'):
        raise ValueError('Invalid meeting time or status')
    duration = (end - start).total_seconds() / 60
    if duration != int(duration) or not 15 <= duration <= 240:
        raise ValueError('Meeting duration is outside the supported range')
    title = event.get('name')
    if not isinstance(title, str) or not title.strip():
        raise ValueError('Missing event title')
    return {'uri': event['uri'], 'title': redact(title.strip())[:160], 'starts_at': start.astimezone(timezone.utc).isoformat(),
            'duration_minutes': int(duration), 'status': 'Cancelled' if event['status'] == 'canceled' else 'Planned'}


def sign_event(event, user):
    receipt = json.dumps({'event': event, 'owner': account_scope(user), 'expires': int(time.time()) + 600}, sort_keys=True, separators=(',', ':'))
    return {'receipt': receipt, 'signature': hmac.new(SIGNING_KEY, receipt.encode(), hashlib.sha256).hexdigest()}


def verify_event(payload, user):
    expected = hmac.new(SIGNING_KEY, payload.receipt.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, payload.signature):
        raise HTTPException(422, 'Meeting preview changed. Load Calendly again.')
    try:
        value = json.loads(payload.receipt)
        if value['owner'] != account_scope(user) or value['expires'] <= time.time():
            raise ValueError('Expired or unrelated preview')
        resource_id(value['event']['uri'], 'scheduled_events')
        return value['event']
    except (ValueError, KeyError, TypeError):
        raise HTTPException(422, 'Meeting preview expired or belongs to another account. Load Calendly again.') from None


class CalendarPreview(BaseModel):
    model_config = ConfigDict(extra='forbid')
    consent: bool = False


class CalendarImport(CalendarPreview):
    company_slug: str = Field(min_length=1, max_length=100)
    revision: int = Field(ge=1)
    receipt: str = Field(min_length=20, max_length=4000)
    signature: str = Field(pattern=r'^[a-f0-9]{64}$')


@router.get('/status')
def status(user=Depends(get_current_user)):
    return calendar_status(user)


@router.post('/preview')
def preview(payload: CalendarPreview, user=Depends(get_current_user)):
    writer(user)
    if not payload.consent:
        raise HTTPException(422, 'Confirm access to your selected Calendly calendar.')
    key = credential(user)
    budget = ProviderBudget(user)
    at = datetime.now(timezone.utc)
    with httpx.Client(timeout=8, follow_redirects=False) as client:
        try:
            user_uri = get_json(client, '/users/me', key, budget)['resource']['uri']
            resource_id(user_uri, 'users')
            body = get_json(client, '/scheduled_events', key, budget, {'user': user_uri, 'count': 20,
                'sort': 'start_time:desc', 'min_start_time': (at-timedelta(days=30)).isoformat(),
                'max_start_time': (at+timedelta(days=30)).isoformat()})
            rows = body['collection']
            if not isinstance(rows, list):
                raise ValueError('Invalid collection')
            events, skipped = [], 0
            for row in rows[:20]:
                try:
                    event = event_summary(row, user_uri)
                    if not at-timedelta(days=30) <= datetime.fromisoformat(event['starts_at']) <= at+timedelta(days=30):
                        raise ValueError('Meeting outside the preview window')
                    events.append({**event, **sign_event(event, user)})
                except (ValueError, KeyError, TypeError, AttributeError):
                    skipped += 1
            return {'checked_at': now(), 'events': events, 'skipped': skipped,
                    'has_more': bool(body.get('pagination', {}).get('next_page')),
                    'detail': 'Up to 20 meetings, 30 days before/after today. Select the company yourself. A booking does not establish attendance or a founder response.'}
        except HTTPException:
            raise
        except (ValueError, KeyError, TypeError, AttributeError):
            raise HTTPException(502, 'Calendly returned unsupported account or meeting data.') from None


@router.post('/import')
def import_meeting(payload: CalendarImport, user=Depends(get_current_user), repo=Depends(get_repository)):
    writer(user)
    if not payload.consent:
        raise HTTPException(422, 'Confirm permission to retain this selected meeting in the company record, including its deal access.')
    key = credential(user)
    row = record(repo, user, payload.company_slug)
    if getattr(row, 'can_write', True) is False:
        raise HTTPException(403, 'You have read-only access to this deal.')
    if row.revision != payload.revision:
        raise HTTPException(409, 'The company changed. Refresh before importing this meeting.')
    selected = verify_event(payload, user)
    event_id = resource_id(selected['uri'], 'scheduled_events')
    identity = 'CAL' + hashlib.sha256(selected['uri'].encode()).hexdigest()[:24]
    company = stored_company(row)
    if any(meeting.id == identity for meeting in company.meetings):
        return {'company': public_record(row), 'created': False, 'message': 'Already imported. Existing meeting notes were preserved.'}
    budget = ProviderBudget(user)
    with httpx.Client(timeout=8, follow_redirects=False) as client:
        try:
            user_uri = get_json(client, '/users/me', key, budget)['resource']['uri']
            resource_id(user_uri, 'users')
            current = event_summary(get_json(client, '/scheduled_events/' + event_id, key, budget)['resource'], user_uri)
        except HTTPException:
            raise
        except (ValueError, KeyError, TypeError, AttributeError):
            raise HTTPException(502, 'The meeting no longer has supported data in this calendar.') from None
    if current != selected:
        raise HTTPException(409, 'The Calendly meeting changed. Load its current preview before importing.')
    at = now()
    company.meetings.append(Meeting(id=identity, title=current['title'], kind='Follow-up', starts_at=current['starts_at'],
        duration_minutes=current['duration_minutes'], status=current['status'], owner=user.full_name, updated_at=at,
        agenda='Selected Calendly booking: ' + current['uri'] + '\nImported ' + at + '. Check company association and prepare an agenda. No attendance, transcript or founder reply was inferred.'))
    company.interactions.append(Interaction(id=identity, kind='Calendar import', note='Selected booking retained: ' + current['uri'], actor=user.full_name, at=at))
    repo.save(row, company.model_dump(mode='json'), payload.revision, 'selected_calendar_import')
    return {'company': public_record(repo.find(payload.company_slug)), 'created': True, 'message': 'Meeting imported. Review its agenda in the company record.'}
