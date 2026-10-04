import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from backend.config import load_runtime_config


class RuntimeConfigTests(unittest.TestCase):
    def load_fixture(self, folder, initial, settings):
        private = Path(folder) / 'backend.env'
        private.write_text('WORKSPACE_PROVIDER=rules\nGEMINI_API_KEY=old-test-value\nJWT_SECRET=private-test-value\n', encoding='utf-8')
        editable = Path(folder) / 'Gemini Settings.txt'
        editable.write_text(settings, encoding='utf-8')
        with patch.dict(os.environ, initial, clear=True), \
             patch('backend.config.private_config_path', return_value=private), \
             patch('backend.config.gemini_settings_path', return_value=editable):
            load_runtime_config()
            return {name: os.getenv(name) for name in ('WORKSPACE_PROVIDER', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'JWT_SECRET')}

    def test_separate_editor_overrides_only_gemini_settings(self):
        with tempfile.TemporaryDirectory() as folder:
            result = self.load_fixture(folder, {}, 'WORKSPACE_PROVIDER=gemini\nGEMINI_API_KEY=new-test-value\nGEMINI_MODEL=test-model\nJWT_SECRET=must-not-override\n')
        self.assertEqual(result, dict(WORKSPACE_PROVIDER='gemini', GEMINI_API_KEY='new-test-value', GEMINI_MODEL='test-model', JWT_SECRET='private-test-value'))

    def test_explicit_process_and_custom_config_remain_authoritative(self):
        settings = 'WORKSPACE_PROVIDER=gemini\nGEMINI_API_KEY=new-test-value\nGEMINI_MODEL=test-model\n'
        with tempfile.TemporaryDirectory() as folder:
            result = self.load_fixture(folder, {'WORKSPACE_PROVIDER':'rules', 'GEMINI_MODEL':'process-model'}, settings)
            self.assertEqual(result['WORKSPACE_PROVIDER'], 'rules')
            self.assertEqual(result['GEMINI_MODEL'], 'process-model')
            custom = self.load_fixture(folder, {'VC_SCOPE_PRIVATE_CONFIG':'explicit-config'}, settings)
            self.assertEqual(custom['WORKSPACE_PROVIDER'], 'rules')
            self.assertEqual(custom['GEMINI_API_KEY'], 'old-test-value')

    def test_empty_key_is_not_a_placeholder_credential(self):
        with tempfile.TemporaryDirectory() as folder:
            result = self.load_fixture(folder, {}, 'WORKSPACE_PROVIDER=gemini\nGEMINI_API_KEY=\nGEMINI_MODEL=test-model\n')
        self.assertEqual(result['GEMINI_API_KEY'], '')


if __name__ == '__main__':
    unittest.main()
