"""Release checks use synthetic credentials and disposable Git repositories only."""
import base64
import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('release_guard', Path(__file__).resolve().parents[1] / 'scripts/check-release-secrets.py')
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)


class ReleaseGuardTests(unittest.TestCase):
    def test_provider_keys_and_service_role_are_detected(self):
        for prefix, size in [('AIza', 35), ('sk-', 40), ('ghp_', 36), ('sb_secret_', 32), ('fc-', 32), ('github_pat_', 65)]:
            with self.subTest(prefix=prefix):
                self.assertTrue(guard.credential_literal(prefix + 'A' * size))
        def token(role):
            def encode(value):
                return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
            return encode({'alg': 'HS256'}) + '.' + encode({'role': role}) + '.' + 'A' * 32
        self.assertTrue(guard.credential_literal(token('service_role')))
        self.assertFalse(guard.credential_literal(token('anon')))
        self.assertFalse(guard.credential_literal('GEMINI_API_KEY=\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=\n'))

    def test_private_filenames_are_case_insensitive(self):
        for name in ['Gemini Settings.txt', 'GEMINI SETTINGS.TXT', 'backend.env', '.ENV.local', 'nested/secrets.env', 'archive.pfx', 'data.sqlite3']:
            self.assertTrue(guard.private_file(Path(name)), name)
        self.assertFalse(guard.private_file(Path('.env.example')))

    def test_shallow_clone_cannot_claim_a_full_history_check(self):
        with patch.object(guard.subprocess, 'check_output', return_value=b'true\n'):
            with self.assertRaisesRegex(RuntimeError, 'Full history is required'):
                guard.history_issues()

    def test_deleted_key_remains_detectable_and_private_alias_is_not_read(self):
        with tempfile.TemporaryDirectory(prefix='whistle-release-guard-') as directory:
            repo = Path(directory)
            def git(*args):
                return subprocess.check_output(['git', '-c', 'user.name=Release Test', '-c', 'user.email=release@example.invalid', *args], cwd=repo, stderr=subprocess.DEVNULL)
            git('init')
            (repo / 'source.py').write_text('key = "' + 'AIza' + 'A' * 35 + '"', encoding='utf-8')
            git('add', 'source.py')
            git('commit', '-m', 'Synthetic fixture')
            (repo / 'source.py').write_text('key = None', encoding='utf-8')
            git('add', 'source.py')
            git('commit', '-m', 'Remove synthetic key')
            with patch.object(guard, 'root', repo):
                issues, _, _ = guard.history_issues()
            self.assertIn(('source.py', 'credential-like literal in Git history; manual review needed'), issues)
            # Reusing a blob as a private file must still flag the private name.
            (repo / '.env').write_text('key = None', encoding='utf-8')
            git('add', '-f', '.env')
            git('commit', '-m', 'Private filename fixture')
            with patch.object(guard, 'root', repo), patch.object(guard, 'credential_literal', return_value=False) as checker:
                issues, inspected, _ = guard.history_issues()
            self.assertIn(('.env', 'private file exists in Git history; contents not inspected'), issues)
            self.assertEqual(checker.call_count, inspected)
            self.assertFalse(any(call.args[0] == 'key = None' for call in checker.call_args_list))


if __name__ == '__main__':
    unittest.main()
