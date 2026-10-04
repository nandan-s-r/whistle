"""User-scoped Supabase calls. Workspace requests never use a service key."""
import os
from types import SimpleNamespace
from uuid import UUID
from urllib.parse import urlsplit
import httpx
from fastapi import HTTPException


def enabled():
    return os.getenv("AUTH_PROVIDER", "local") == "supabase"


def configuration():
    base = os.getenv("SUPABASE_URL", "").rstrip("/")
    key = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
    parsed = urlsplit(base)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.query or parsed.fragment:
        raise HTTPException(503, "Supabase has not been configured safely.")
    if not key:
        raise HTTPException(503, "Supabase's publishable key is missing.")
    return base, key


class Gateway:
    def __init__(self, token):
        self.token = token

    def request(self, method, path, *, params=None, data=None, content=None, headers=None):
        base, key = configuration()
        request_headers = {"apikey": key, "Authorization": "Bearer " + self.token}
        request_headers.update(headers or {})
        try:
            with httpx.Client(timeout=25, follow_redirects=False) as client:
                response = client.request(method, base + path, params=params, json=data,
                                          content=content, headers=request_headers)
        except httpx.HTTPError:
            raise HTTPException(503, "Supabase is unavailable. Please retry.")
        if response.status_code >= 400:
            code = response.status_code
            if code in (401,403):
                raise HTTPException(code, "Your session or permissions do not allow this action.")
            if code == 409:
                raise HTTPException(409, "This record already exists or changed. Refresh before retrying.")
            if code == 429:
                raise HTTPException(429, "The work allowance is used up. Retry after the current limit resets.")
            raise HTTPException(502, "Supabase could not complete this request. No private response was logged.")
        return response.json() if response.content else None


def authenticate(token):
    profile = Gateway(token).request("GET", "/auth/v1/user")
    try:
        uid = str(UUID(profile["id"]))
    except (KeyError, ValueError, TypeError):
        raise HTTPException(401, "Invalid Supabase identity.")
    # user_metadata is display data only. App metadata is provisioned by an administrator.
    role = profile.get("app_metadata", {}).get("workspace_role", "analyst")
    if role not in ("analyst", "partner", "admin", "viewer"):
        role = "viewer"
    return SimpleNamespace(id=uid, email=profile.get("email", ""),
                           full_name=profile.get("user_metadata", {}).get("full_name") or "Analyst",
                           role=role, is_active=True, outreach_identity=None, supabase_token=token)
