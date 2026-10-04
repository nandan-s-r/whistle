"""Bounded public discovery. Candidates remain research leads, never investment scores."""
import hashlib
import hmac
import json
import os
import re
import time
from datetime import datetime, timezone
from html import unescape
from urllib.parse import urlsplit, urlunsplit
from xml.etree import ElementTree

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field

from backend.budgets import reserve_provider
from backend.ingestion import public_url
from backend.auth import SECRET_KEY

FEED_URL = 'https://www.producthunt.com/feed?category=undefined'
MAX_BYTES = 2 * 1024 * 1024
SIGNING_KEY = hmac.new(SECRET_KEY.encode(), b'whistle:sourcing-receipt:v1', hashlib.sha256).digest()
FOCUSES = {
    'AI chips and semiconductor infrastructure': ('semiconductor', 'chip', 'chips', 'silicon', 'accelerator', 'accelerators', 'fpga', 'asic', 'chiplet', 'hbm', 'photonic', 'hardware inference'),
    'AI and developer tools': ('ai', 'agent', 'agents', 'developer', 'developers', 'api', 'apis', 'mcp', 'sdk', 'inference'),
    'India B2B SaaS': ('saas', 'b2b', 'enterprise', 'business', 'workflow', 'crm', 'sales', 'teams'),
}


class SourcingRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    focus: str = Field(default='AI chips and semiconductor infrastructure')
    keywords: str = Field(default='', max_length=160)
    days: int = Field(default=30, ge=1, le=90)


def plain(value):
    return re.sub(r'\s+', ' ', unescape(re.sub(r'<[^>]+>', ' ', value or ''))).strip()


def clean_url(value):
    parsed = urlsplit(value or '')
    if parsed.scheme != 'https':
        raise ValueError('HTTPS reference required')
    clean = urlunsplit((parsed.scheme, parsed.netloc, parsed.path, '', ''))
    return public_url(clean)


def dated(value):
    try:
        stamp = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return stamp.astimezone(timezone.utc).isoformat() if stamp.tzinfo else None
    except (ValueError, AttributeError):
        return None


def words(value):
    return set(re.findall(r'[\w]+', value.casefold()))


def matched(text, focus):
    tokens = words(text)
    return [term for term in FOCUSES[focus] if (term in tokens if ' ' not in term else term in text.casefold())]


def parse_feed(data, request, at, *, terms=None):
    if len(data) > MAX_BYTES or b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():
        raise ValueError('Feed exceeds the safe XML boundary')
    root = ElementTree.fromstring(data)
    ns = {'a': 'http://www.w3.org/2005/Atom'}
    if root.tag != '{http://www.w3.org/2005/Atom}feed':
        raise ValueError('Expected the official Atom feed')
    candidates, seen = [], set()
    entries = root.findall('a:entry', ns)
    for entry in entries[:100]:
        title = plain(entry.findtext('a:title', '', ns))[:160]
        # The first paragraph is the launch description; navigation/author names are not fit evidence.
        content = entry.findtext('a:content', '', ns)
        paragraph = re.search(r'<p[^>]*>(.*?)</p>', content, re.S | re.I)
        summary = plain(paragraph.group(1) if paragraph else content)[:600]
        published = dated(entry.findtext('a:published', '', ns))
        if not title or not summary or not published:
            continue
        age = datetime.fromisoformat(at) - datetime.fromisoformat(published)
        if age.total_seconds() < -300 or age.days > request.days:
            continue
        try:
            link = entry.find('a:link[@rel="alternate"]', ns)
            url = clean_url(link.get('href', '') if link is not None else '')
            if urlsplit(url).hostname not in ('www.producthunt.com', 'producthunt.com') or not urlsplit(url).path.startswith(('/products/', '/posts/')):
                continue
        except ValueError:
            continue
        text = title + ' ' + summary
        reasons = matched(text, request.focus) if terms is None else [term for term in terms if (term in words(text) if ' ' not in term else term in text.casefold())]
        extra = words(request.keywords)
        if not reasons or (extra and not extra.issubset(words(title + ' ' + summary))):
            continue
        if url in seen:
            continue
        seen.add(url)
        candidates.append({
            'id': hashlib.sha256(url.encode()).hexdigest()[:16], 'name': title, 'domain': '',
            'summary': summary, 'origin': 'Product Hunt feed', 'captured_at': at,
            'published_at': published, 'focus': request.focus,
            'fit': 'Text match; company mandate not assessed',
            'reasons': ['Launch description mentions: ' + ', '.join(reasons)],
            'gaps': ['Company website and founder identity', 'Geography and funding stage', 'Customer adoption, repeat orders and economics'],
            'sources': [{'title': title + ' · Product Hunt launch', 'url': url, 'excerpt': summary,
                         'published_on': published[:10], 'relationship': 'Launch listing; author relationship unknown'}],
        })
    return candidates[:20], min(len(entries), 100)


def fetch_feed(request, budget, at, *, terms=None, timeout_seconds=20):
    reserve_provider(budget)
    with httpx.Client(timeout=httpx.Timeout(timeout_seconds, connect=5), follow_redirects=False) as client:
        with client.stream('GET', FEED_URL, headers={'Accept': 'application/atom+xml', 'User-Agent': 'WhistleResearch/1.0'}) as response:
            response.raise_for_status()
            data = bytearray()
            for part in response.iter_bytes():
                data.extend(part)
                if len(data) > MAX_BYTES:
                    raise ValueError('Feed response too large')
    return parse_feed(bytes(data), request, at, terms=terms)


def snapshot(request):
    # Small attributed research notes from a bounded 4 October review, not a live feed or endorsements.
    if request.focus != 'AI chips and semiconductor infrastructure':
        return []
    path = os.path.join(os.path.dirname(__file__), 'assets', 'semiconductor_sourcing.json')
    with open(path, encoding='utf-8') as handle:
        items = json.load(handle)
    extra = words(request.keywords)
    return [item for item in items if not extra or extra.issubset(words(item['name'] + ' ' + item['summary']))]


def sign_candidate(candidate, owner):
    envelope = {'owner': str(owner), 'expires': int(time.time()) + 3600, 'candidate': candidate}
    payload = json.dumps(envelope, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    signature = hmac.new(SIGNING_KEY, payload.encode(), hashlib.sha256).hexdigest()
    return {**candidate, 'receipt': payload, 'signature': signature}


def verify_candidate(receipt, signature, owner):
    expected = hmac.new(SIGNING_KEY, receipt.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(422, 'This sourcing result changed or expired. Run sourcing again before saving.')
    try:
        envelope = json.loads(receipt)
        if envelope['owner'] != str(owner) or envelope['expires'] < time.time():
            raise ValueError('Receipt not valid for this account')
        return envelope['candidate']
    except (KeyError, ValueError, TypeError):
        raise HTTPException(422, 'Run sourcing again in this account before saving the candidate.')


def source_run(request, owner, budget, live=True):
    if request.focus not in FOCUSES:
        raise HTTPException(422, 'Choose an available thesis.')
    at = datetime.now(timezone.utc).isoformat()
    candidates = snapshot(request)
    statuses = [{'name': 'Semiconductor research notes', 'state': 'Dated snapshot', 'detail': 'Collected 4 October 2026; launch recency does not apply to these notes. Open sources to check for newer information.'}]
    if live:
        try:
            feed, count = fetch_feed(request, budget, at)
            candidates.extend(feed)
            statuses.append({'name': 'Product Hunt', 'state': 'Fetched', 'detail': f'{count} feed entries inspected; {len(feed)} text matches. Latest feed only, not the full Product Hunt database.'})
        except HTTPException:
            raise
        except Exception:
            statuses.append({'name': 'Product Hunt', 'state': 'Unavailable', 'detail': 'The public feed could not be read. Retry later; no launch results were invented.'})
    else:
        statuses.append({'name': 'Product Hunt', 'state': 'Not run', 'detail': 'Run sourcing to inspect the official public feed.'})
    statuses.extend([
        {'name': 'X customer posts', 'state': 'Configured' if os.getenv('X_BEARER_TOKEN') else 'Needs access', 'detail': 'Official recent-search API. Check signals for a selected company; posts are unverified, not proof of a customer relationship.'},
        {'name': 'LinkedIn', 'state': 'Authorized notes', 'detail': 'Review selected post links and excerpts you are authorized to retain. Automated account scraping is not connected.'},
    ])
    return {'checked_at': at, 'focus': request.focus, 'candidates': [sign_candidate(c, owner) for c in candidates], 'sources': statuses,
            'method': 'Rules-based text matching and dated research notes. No investment score, independent corroboration, India location or funding availability is inferred.'}


class SignalInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    url: str = Field(max_length=2000)
    excerpt: str = Field(min_length=20, max_length=2000)
    relationship: str = Field(default='Unknown', pattern='^(Unknown|Customer-reported|Company or maker|Partner|Independent reviewer)$')


def assess_signal(item):
    url = clean_url(item.url)
    text = plain(item.excerpt)
    tokens = words(text)
    duplicate_key = hashlib.sha256(text.casefold().encode()).hexdigest()
    promotional = item.relationship in ('Company or maker', 'Partner')
    negative = bool(tokens.intersection({'not', 'never', 'stopped', 'quit', 'failed', 'unusable', 'broken', 'disappointed', 'cancelled'}))
    usage = bool(re.search(r'\b(using|deployed|deploying|production|renewed|renewing|paying|purchased|reordered|every day|daily)\b', text, re.I))
    if promotional:
        category, question = 'Interested-party statement', 'Can a named customer confirm this separately, with scope and deployment date?'
    elif negative:
        category, question = 'Possible complaint or mixed evidence', 'What failed, for which workload, and did the customer continue using the product?'
    elif usage:
        category, question = 'Possible usage signal', 'Confirm the author is a customer, the deployment scale, repeat use and commercial relationship.'
    else:
        category, question = 'Discussion or praise', 'Does this person actually use or pay for the product, rather than like the launch?'
    return {'url': url, 'excerpt': text[:2000], 'relationship': item.relationship, 'category': category,
            'question': question, 'duplicate_key': duplicate_key, 'state': 'Unreviewed',
            'independence': 'Not established; repeated excerpts are collapsed, distinct authors are not automatically independent.'}


def search_x(candidate, budget):
    key = os.getenv('X_BEARER_TOKEN')
    if not key:
        raise HTTPException(422, 'X recent search needs a private X_BEARER_TOKEN and API access. You can review authorized excerpts now.')
    name = ' '.join(re.findall(r'[\w.-]+', candidate['name']))[:100]
    reserve_provider(budget)
    try:
        with httpx.Client(timeout=httpx.Timeout(20, connect=5), follow_redirects=False) as client:
            response = client.get('https://api.x.com/2/tweets/search/recent', headers={'Authorization': 'Bearer ' + key},
                                  params={'query': '"' + name + '" -is:retweet', 'max_results': 10, 'tweet.fields': 'created_at'})
            response.raise_for_status()
            body = response.json()
        output, seen = [], set()
        for post in body.get('data', [])[:10]:
            if not re.fullmatch(r'[0-9]{1,30}', str(post.get('id', ''))):
                continue
            if len(plain(post.get('text', ''))) < 20:
                continue
            item = assess_signal(SignalInput(url='https://x.com/i/status/' + post['id'], excerpt=post['text'][:2000]))
            if item['duplicate_key'] in seen:
                continue
            seen.add(item['duplicate_key'])
            output.append({**item, 'published_at': dated(post.get('created_at')), 'method': 'X official recent-search API'})
        return {'signals': output, 'checked_at': datetime.now(timezone.utc).isoformat(), 'coverage': 'At most 10 matching recent posts; not an exhaustive customer survey.'}
    except Exception:
        raise HTTPException(502, 'X search could not complete. Check API access or retry later. No customer signals were invented.')
