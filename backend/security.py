"""Shared request and deployment boundaries for both API entry points."""
import os
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse

FILE_BYTES = 20 * 1024 * 1024
FILE_REQUEST_BYTES = FILE_BYTES + 64 * 1024
JSON_REQUEST_BYTES = 1024 * 1024


async def validation_feedback(request, exception):
    # Submitted values can contain credentials or non-finite numbers. Return
    # field-level feedback without reflecting those values into a response.
    errors = [{'loc': list(error['loc']), 'msg': error['msg'], 'type': error['type']}
              for error in exception.errors()]
    return JSONResponse({'detail': errors}, status_code=422)


def require_production_auth():
    if os.getenv('ENVIRONMENT') == 'production' and os.getenv('AUTH_PROVIDER') != 'supabase':
        raise RuntimeError('Production requires AUTH_PROVIDER=supabase; local accounts are development only.')


class RequestBudget:
    """Count actual bytes, including chunked bodies, before a parser sees them."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)
        limit = FILE_REQUEST_BYTES if scope['path'].rstrip('/') == '/api/platform/files' else JSON_REQUEST_BYTES
        lengths = [v for k, v in scope.get('headers', []) if k.lower() == b'content-length']
        if lengths:
            try:
                valid = len(lengths) == 1 and 0 <= int(lengths[0]) <= limit
            except ValueError:
                valid = False
            if not valid:
                return await JSONResponse({'detail': 'Request exceeds the upload or message size limit.'}, status_code=413)(scope, receive, send)
        used = 0
        async def bounded_receive():
            nonlocal used
            message = await receive()
            if message['type'] == 'http.request':
                used += len(message.get('body', b''))
                if used > limit:
                    raise HTTPException(413, 'Request exceeds the upload or message size limit.')
            return message
        await self.app(scope, bounded_receive, send)


class WorkspaceRoutesOnly:
    """Legacy tables have no reliable tenant ownership and must never be served."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] == 'http':
            path = scope['path'].rstrip('/')
            local_auth = {'/api/auth/login', '/api/auth/signup', '/api/auth/me', '/api/auth/me/identity'}
            allowed = (path == '/health' or path == '/api/auth/me' and scope['method'] == 'GET'
                       or any(path == prefix or path.startswith(prefix + '/') for prefix in ('/api/workspace', '/api/platform'))
                       or os.getenv('ENVIRONMENT') != 'production' and os.getenv('AUTH_PROVIDER') != 'supabase' and path in local_auth)
            if not allowed:
                return await JSONResponse({'detail': 'This legacy endpoint is retired. Use the private investment workspace.'}, status_code=404)(scope, receive, send)
        await self.app(scope, receive, send)
