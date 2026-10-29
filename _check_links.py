from html.parser import HTMLParser
from pathlib import Path
import re

files = ["index.html", "careers.html", "disclaimer.html"]
ids = {}

for f in files:
    src = Path(f).read_text(encoding="utf-8")
    found = re.findall(r'\sid="([^"]+)"', src)
    ids[f] = set(found)
    dupes = sorted({i for i in found if found.count(i) > 1})
    if dupes:
        print(f, "DUPLICATE IDS", dupes)


class P(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        for a in ("href", "src"):
            if a in d:
                self.refs.append((tag, a, d[a]))


bad = []
for f in files:
    p = P()
    p.feed(Path(f).read_text(encoding="utf-8"))
    for tag, attr, ref in p.refs:
        if not ref or ref.startswith(("http://", "https://", "mailto:", "tel:", "data:", "javascript:")):
            continue
        path, _, frag = ref.partition("#")
        target = f if not path else path
        if not Path(target).exists():
            bad.append((f, tag, attr, ref, "missing file"))
            continue
        if frag:
            if target not in ids:
                ids[target] = set(re.findall(r'\sid="([^"]+)"', Path(target).read_text(encoding="utf-8")))
            if frag not in ids[target]:
                bad.append((f, tag, attr, ref, "missing anchor #" + frag))

print("broken refs:", len(bad))
for b in bad:
    print("  ", b)
print("ids per page:", {k: len(v) for k, v in ids.items()})
