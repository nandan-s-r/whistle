"""Read private configuration outside the synced project, without logging values."""
import os
from pathlib import Path
from dotenv import dotenv_values, load_dotenv


def private_config_path():
    override = os.getenv('VC_SCOPE_PRIVATE_CONFIG')
    if override:
        return Path(override)
    local = os.getenv('LOCALAPPDATA') or os.getenv('XDG_CONFIG_HOME')
    return (Path(local) if local else Path.home() / '.config') / 'VC Scope OS' / 'backend.env'


def gemini_settings_path():
    local = os.getenv('LOCALAPPDATA') or os.getenv('XDG_CONFIG_HOME')
    return (Path(local) if local else Path.home() / '.config') / 'Whistle' / 'Gemini Settings.txt'


def load_runtime_config():
    # Explicit process settings always win, including rules-provider QA overrides.
    process_settings = set(os.environ)
    load_dotenv(private_config_path(), override=False)
    load_dotenv(Path(__file__).resolve().parents[1] / '.env', override=False)
    # The separate user-editable file changes only Gemini settings. An explicit
    # private-config override remains authoritative for custom/deployed runtimes.
    if not os.getenv('VC_SCOPE_PRIVATE_CONFIG'):
        settings = dotenv_values(gemini_settings_path(), interpolate=False)
        for name in ('WORKSPACE_PROVIDER', 'GEMINI_API_KEY', 'GEMINI_MODEL'):
            value = settings.get(name)
            if name not in process_settings and value is not None:
                os.environ[name] = value
