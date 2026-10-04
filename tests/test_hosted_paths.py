"""Hosted scratch files must never require writes to the deployed bundle."""
import os
import runpy
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


class HostedPathTests(unittest.TestCase):
    def settings(self, vercel):
        with patch.dict(os.environ, {"VERCEL": vercel}, clear=True), \
                patch("dotenv.load_dotenv"), patch("os.makedirs") as mkdir:
            values = runpy.run_path(str(Path(__file__).parents[1] / "config/settings.py"))
        return values, mkdir.call_args_list

    def test_vercel_writes_only_temporary_files(self):
        values, calls = self.settings("1")
        expected = Path(tempfile.gettempdir()) / "whistle"
        self.assertEqual(Path(values["RUNTIME_DIR"]), expected)
        for call in calls:
            self.assertEqual(Path(call.args[0]).parent, expected)
        self.assertEqual(values["DATABASE_URL"], "sqlite:///" + str(expected / "antigravity.db").replace("\\", "/"))

    def test_local_paths_remain_compatible(self):
        values, _ = self.settings("")
        self.assertEqual(Path(values["RUNTIME_DIR"]), Path(__file__).resolve().parents[1])
        self.assertEqual(values["DATABASE_URL"], "sqlite:///./antigravity.db")
