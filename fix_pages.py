import os, re

BASE = "http://127.0.0.1:8000"
FRONTEND = r"C:\Users\srnan\OneDrive\Desktop\vc assist\antigravity\frontend\src\app\(dashboard)"

fixes = {
    "comps/page.tsx":     [("fetch('/api/comps')",       f"fetch('{BASE}/api/comps')")],
    "founders/page.tsx":  [("fetch('/api/founders')",    f"fetch('{BASE}/api/founders')")],
    "meetings/page.tsx":  [("fetch('/api/meetings')",    f"fetch('{BASE}/api/meetings')")],
    "score/page.tsx":     [("fetch('/api/scores')",      f"fetch('{BASE}/api/scores')")],
    "risk/page.tsx":      [("fetch('/api/portfolio')",   f"fetch('{BASE}/api/portfolio')"),
                           ("alert(`Risk response protocol dispatched to ${a.startup_name} team.`)",
                            "console.log('Intervention dispatched')")],
    "graph/page.tsx":     [("fetch('/api/graph-data')",  f"fetch('{BASE}/api/graph-data')")],
    "source/page.tsx":    [('alert("Scrapers triggered. Scan logs streaming...")', 'console.log("Crawlers triggered")'),
                           ('alert("Screening logic initialized. Document compilation requested.")', 'console.log("Screening")')]
}

for filename, replacements in fixes.items():
    path = os.path.join(FRONTEND, filename)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    original = content
    for old, new in replacements:
        content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    changed = "FIXED" if content != original else "NO CHANGE"
    print(f"{changed}: {filename}")

print("\nAll done!")
