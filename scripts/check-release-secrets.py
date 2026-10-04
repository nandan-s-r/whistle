"""Report filenames only. Never open private settings, databases or key files."""
import argparse
import base64
import io
import json
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
patterns = [re.compile(p) for p in (
    r'AIza[0-9A-Za-z_-]{35}', r'sk-[A-Za-z0-9_-]{32,}',
    r'gh[pousr]_[A-Za-z0-9]{30,}', r'sb_secret_[A-Za-z0-9_-]{20,}',
    r'github_pat_[A-Za-z0-9_]{60,}', r'fc-[A-Za-z0-9_-]{24,}',
    r'xox[baprs]-[A-Za-z0-9-]{20,}', r'(?:AKIA|ASIA)[A-Z0-9]{16}',
    r'[rs]k_(?:live|test)_[A-Za-z0-9]{20,}',
    r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
)]
text_extensions = {'.py', '.js', '.ts', '.tsx', '.mjs', '.cjs', '.json',
                   '.yml', '.yaml', '.toml', '.md', '.txt', '.sql', '.html',
                   '.css', '.svg', '.sh', '.ps1', '.ini', '.cfg', '.conf'}


def credential_literal(text):
    if any(pattern.search(text) for pattern in patterns):
        return True
    # Older Supabase service-role credentials are JWTs, unlike public anon keys.
    for token in re.findall(r'eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}', text):
        payload = token.split('.')[1]
        if len(payload) > 16384:
            continue
        try:
            value = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
            if isinstance(value, dict) and value.get('role') == 'service_role':
                return True
        except (ValueError, UnicodeError):
            pass
    return False


def files(*arguments):
    return subprocess.check_output(['git', 'ls-files', '-z', *arguments], cwd=root).decode().split('\0')


def private_file(path):
    name = path.name.casefold()
    return (name in ('backend.env', 'gemini settings.txt')
            or name == '.env' or (name.startswith('.env.') and name != '.env.example')
            or path.suffix.lower() in ('.env', '.db', '.sqlite', '.sqlite3', '.pem', '.key', '.p12', '.pfx'))


def history_issues():
    """Read eligible Git source blobs only; never print matches or private contents."""
    if subprocess.check_output(['git', 'rev-parse', '--is-shallow-repository'], cwd=root).strip() == b'true':
        raise RuntimeError('Full history is required. Fetch all commits before using --history.')
    objects = {}
    issues = []
    private_objects = set()
    commits = subprocess.check_output(['git', 'rev-list', '--all'], cwd=root).decode().splitlines()
    # Inspect every tree: a blob reused under two names must not hide a private filename.
    for commit in commits:
        entries = subprocess.check_output(['git', 'ls-tree', '-rz', '--full-tree', commit], cwd=root).decode().split('\0')
        for entry in filter(None, entries):
            metadata, name = entry.split('\t', 1)
            _, kind, oid = metadata.split()
            if kind != 'blob':
                continue
            path = Path(name)
            if private_file(path):
                private_objects.add(oid)
                issues.append((name, 'private file exists in Git history; contents not inspected'))
            elif path.suffix.lower() in text_extensions or path.name in ('Dockerfile', '.gitignore', '.dockerignore') or '.githooks' in path.parts:
                objects.setdefault(oid, name)
    objects = {oid: name for oid, name in objects.items() if oid not in private_objects}
    if not objects:
        return issues, 0, 0
    request = ('\n'.join(objects) + '\n').encode()
    metadata = subprocess.check_output(['git', 'cat-file', '--batch-check'], input=request, cwd=root).decode().splitlines()
    eligible = [row.split()[0] for row in metadata if row.split()[1] == 'blob' and int(row.split()[2]) <= 2_000_000]
    skipped = sum(row.split()[1] == 'blob' and int(row.split()[2]) > 2_000_000 for row in metadata)
    if not eligible:
        return issues, 0, skipped
    stream = io.BytesIO(subprocess.check_output(['git', 'cat-file', '--batch'], input=('\n'.join(eligible) + '\n').encode(), cwd=root))
    for oid in eligible:
        header = stream.readline().split()
        if header[:2] != [oid.encode(), b'blob']:
            raise RuntimeError('Unexpected Git object response; history check did not complete.')
        content = stream.read(int(header[2]))
        if stream.read(1) != b'\n':
            raise RuntimeError('Incomplete Git object response; history check did not complete.')
        if credential_literal(content.decode('utf-8', errors='replace')):
            issues.append((objects[oid], 'credential-like literal in Git history; manual review needed'))
    return issues, len(eligible), skipped


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--history', action='store_true', help='Also check all reachable commits; requires a full clone.')
    args = parser.parse_args()
    tracked = {name for name in files() if name}
    candidates = tracked | {name for name in files('--others', '--exclude-standard') if name}
    issues, inspected = [], 0
    for name in sorted(candidates):
        path = root / name
        if private_file(path):
            if name in tracked: issues.append((name, 'private file is tracked; contents not inspected'))
            continue
        if path.suffix.lower() not in text_extensions and '.githooks' not in path.parts:
            continue
        if not path.is_file() or path.stat().st_size > 2_000_000: continue
        text = path.read_text(encoding='utf-8', errors='replace'); inspected += 1
        if credential_literal(text): issues.append((name, 'credential-like literal; manual review needed'))
    if args.history:
        try:
            historical, count, skipped = history_issues()
        except (RuntimeError, subprocess.CalledProcessError) as error:
            print(f'History check failed: {error}')
            return 1
        issues.extend(historical)
        print(f'Inspected {count} unique source/document blobs across Git history; {skipped} oversized blobs skipped.')
    issues = sorted(set(issues))
    print(f'Inspected {inspected} source/document files; flagged {len(issues)} filenames. Private settings were not opened.')
    for name, reason in issues: print(f'{name}: {reason}')
    return 1 if issues else 0


if __name__ == '__main__':
    raise SystemExit(main())
