"""Token migration boundaries with synthetic keys and identities only."""
import base64
import hashlib
import hmac
import json
import time
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

import jwt
from fastapi import HTTPException
from backend.auth import get_current_user

KEY = 'synthetic-token-compatibility-key-at-least-32-bytes'


def old_hs256_token(claims):
    # Standard JWT bytes, independent of either token library. Existing local
    # sessions use this same wire format and must survive the package change.
    def part(value):
        return base64.urlsafe_b64encode(json.dumps(value, separators=(',', ':')).encode()).rstrip(b'=')
    body = part({'alg': 'HS256', 'typ': 'JWT'}) + b'.' + part(claims)
    signature = base64.urlsafe_b64encode(hmac.new(KEY.encode(), body, hashlib.sha256).digest()).rstrip(b'=')
    return (body + b'.' + signature).decode()


class TokenCompatibilityTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict('os.environ', {'AUTH_PROVIDER': 'local'})
        self.env.start(); self.addCleanup(self.env.stop)
        self.key = patch('backend.auth.SECRET_KEY', KEY)
        self.key.start(); self.addCleanup(self.key.stop)
        self.user = SimpleNamespace(email='fixture@example.invalid', is_active=True, hashed_password='unused')
        self.db = Mock()
        self.db.query.return_value.filter.return_value.first.return_value = self.user

    def test_existing_wire_format_is_accepted_without_reissuing_credentials(self):
        token = old_hs256_token({'sub': self.user.email, 'exp': int(time.time()) + 300})
        self.assertIs(get_current_user(token, self.db), self.user)

    def test_invalid_expiry_signature_algorithm_and_audience_are_denied(self):
        claims = {'sub': self.user.email, 'exp': int(time.time()) + 300}
        tokens = [old_hs256_token({**claims, 'exp': 1}),
                  old_hs256_token({**claims, 'nbf': int(time.time()) + 3600}),
                  old_hs256_token({**claims, 'aud': 'another-application'}),
                  jwt.encode(claims, KEY + 'wrong', algorithm='HS256'),
                  jwt.encode(claims, KEY, algorithm='HS384'), 'malformed']
        for token in tokens:
            with self.subTest(token_kind=tokens.index(token)), self.assertRaises(HTTPException) as error:
                get_current_user(token, self.db)
            self.assertEqual(error.exception.status_code, 401)
        self.db.query.assert_not_called()

    def test_hybrid_issuer_is_only_a_hint_and_cloud_provider_still_authenticates(self):
        base = 'https://synthetic-project.supabase.co'
        token = jwt.encode({'iss': base + '/auth/v1', 'sub': 'synthetic-cloud-user'}, KEY + 'untrusted', algorithm='HS256')
        with patch.dict('os.environ', {'AUTH_PROVIDER': 'hybrid', 'SUPABASE_URL': base}), \
                patch('backend.supabase_gateway.authenticate', side_effect=HTTPException(401, 'Denied')) as cloud:
            with self.assertRaises(HTTPException) as error:
                get_current_user(token, self.db)
            self.assertEqual(error.exception.status_code, 401)
            cloud.assert_called_once_with(token)
        self.db.query.assert_not_called()
