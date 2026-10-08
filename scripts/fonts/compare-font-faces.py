"""Compare the @font-face rules a deployed site serves with app/fonts.css (or with another deployed site).

usage: compare-fonts.py <A> <B>     each = https://host/path (a page; its CSS is fetched) or a local fonts.css path
Every face is reduced to (family, style, weight, display, unicode-range as code-point intervals, sha256 of the file),
so only real differences remain: URL spelling and CSS formatting are normalised away.
"""
import hashlib, os, re, sys, urllib.request, urllib.parse

UA = {"User-Agent": "Mozilla/5.0 fonts-compare"}

def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()

def intervals(value):
    out = []
    for part in value.split(","):
        p = part.strip().upper().removeprefix("U+")
        if "?" in p:
            out.append((int(p.replace("?", "0"), 16), int(p.replace("?", "F"), 16)))
        else:
            a, _, b = p.partition("-")
            out.append((int(a, 16), int(b or a, 16)))
    out.sort()
    merged = []
    for a, b in out:
        if merged and a <= merged[-1][1] + 1:
            merged[-1] = (merged[-1][0], max(merged[-1][1], b))
        else:
            merged.append((a, b))
    return tuple(merged)

def faces(css, resolve):
    out, cache = [], {}
    for body in re.findall(r"@font-face\s*\{([^}]*)\}", css):
        props = {}
        for decl in body.split(";"):
            k, sep, v = decl.partition(":")
            if sep:
                props[k.strip().lower()] = v.strip()
        fam = props.get("font-family", "").strip("'\"")
        src = props.get("src", "")
        m = re.search(r"url\(([^)]+)\)", src)
        if m:
            ref = m.group(1).strip("'\"")
            if ref not in cache:
                cache[ref] = hashlib.sha256(resolve(ref)).hexdigest()[:16]
            src_id = "file:" + cache[ref]
        else:
            src_id = re.sub(r"['\"\s]", "", src)
        metrics = tuple((k, re.sub(r"^0+(?=\d)|(?<=\d)\.0+(?=%)", "", props[k]).replace("0.0%", "0%"))
                        for k in ("ascent-override", "descent-override", "line-gap-override", "size-adjust") if k in props)
        out.append((fam, props.get("font-style", ""), " ".join(props.get("font-weight", "").split()), props.get("font-display", ""),
                    intervals(props["unicode-range"]) if "unicode-range" in props else (), src_id, metrics))
    return out

def variables(css):
    found = {}
    for name, value in re.findall(r"(--font-(?:sora|jetbrains|geist-mono))\s*:\s*([^;}]+)", css):
        found[name] = re.sub(r"['\"]", "", re.sub(r"\s*,\s*", ", ", value.strip()))
    return found

def load(target):
    if target.startswith("http"):
        html = fetch(target).decode("utf-8", "replace")
        sheets = sorted(set(re.findall(r'href="(/_next/static/[^"]+\.css)[^"]*"', html)))
        origin = "{0.scheme}://{0.netloc}".format(urllib.parse.urlparse(target))
        f, v = [], {}
        for s in sheets:
            css = fetch(origin + s).decode("utf-8", "replace")
            base = origin + s
            f += faces(css, lambda ref, base=base: fetch(urllib.parse.urljoin(base, ref)))
            v.update(variables(css))
        return f, v, len(sheets)
    css = open(target, encoding="utf-8").read()
    root = os.path.join(os.path.dirname(os.path.abspath(target)), "..", "public")
    return faces(css, lambda ref: open(os.path.join(root, ref.lstrip("/")), "rb").read()), variables(css), 1

a, va, na = load(sys.argv[1])
b, vb, nb = load(sys.argv[2])
sa, sb = set(a), set(b)
print(f"A {sys.argv[1]}: {len(a)} faces ({len(sa)} distinct) in {na} stylesheet(s)")
print(f"B {sys.argv[2]}: {len(b)} faces ({len(sb)} distinct) in {nb} stylesheet(s)")
print(f"only in A: {len(sa - sb)}   only in B: {len(sb - sa)}   in both: {len(sa & sb)}")
for label, diff in (("A", sa - sb), ("B", sb - sa)):
    for face in sorted(diff, key=str)[:12]:
        print(f"  only {label}: {face[0]} | {face[1]} | {face[2]} | {face[3]} | ranges={len(face[4])} | {face[5]} | {face[6]}")
print("variables A:", va)
print("variables B:", vb)
print("variables equal:", va == vb)
sys.exit(0 if sa == sb and va == vb and a else 1)
