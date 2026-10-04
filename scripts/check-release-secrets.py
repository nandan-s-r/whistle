"""Report filenames only. Never open private settings, databases or key files."""
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
patterns = [re.compile(p) for p in (
    r'AIza[0-9A-Za-z_-]{35}', r'sk-[A-Za-z0-9_-]{32,}',
    r'gh[pousr]_[A-Za-z0-9]{30,}', r'sb_secret_[A-Za-z0-9_-]{20,}',
    r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
)]


def files(*arguments):
    return subprocess.check_output(['git', 'ls-files', '-z', *arguments], cwd=root).decode().split('\0')


def private_file(path):
    return (path.name in ('backend.env', 'Gemini Settings.txt')
            or path.name == '.env' or (path.name.startswith('.env.') and path.name != '.env.example')
            or path.suffix.lower() in ('.db', '.sqlite', '.sqlite3', '.pem', '.key'))


def main():
    tracked = {name for name in files() if name}
    candidates = tracked | {name for name in files('--others', '--exclude-standard') if name}
    issues, inspected = [], 0
    for name in sorted(candidates):
        path = root / name
        if private_file(path):
            if name in tracked: issues.append((name, 'private file is tracked; contents not inspected'))
            continue
        if path.suffix.lower() not in ('.py', '.js', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.yml', '.yaml', '.toml', '.md', '.txt', '.sql'):
            continue
        if not path.is_file() or path.stat().st_size > 2_000_000: continue
        text = path.read_text(encoding='utf-8', errors='replace'); inspected += 1
        if any(pattern.search(text) for pattern in patterns): issues.append((name, 'credential-like literal; manual review needed'))
    print(f'Inspected {inspected} source/document files; flagged {len(issues)} filenames. Private settings were not opened.')
    for name, reason in issues: print(f'{name}: {reason}')
    return 1 if issues else 0


if __name__ == '__main__':
    raise SystemExit(main())
