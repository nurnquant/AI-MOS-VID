#!/usr/bin/env python3
"""Manage the numbered production tree (see PRODUCTION-STANDARD.md).

    python3 scripts/social/productions.py                       # regenerate INDEX.md
    python3 scripts/social/productions.py --new "Title" --type video
    python3 scripts/social/productions.py --set 0022 --status published

registry.json is the source of truth; INDEX.md is generated from it plus a scan
of what is actually on disk.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import json
import re
import shutil
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PROD = REPO / "productions"
REG = PROD / "registry.json"

MEDIA = {".mp4", ".mov", ".png", ".jpg", ".jpeg", ".webp", ".wav", ".m4a"}
# extend this list as new channels are added; registry entries pick it up on next run
PLATFORMS = ["facebook", "instagram", "pinterest", "x", "tiktok", "youtube"]
PLAT_LABEL = {"facebook": "Facebook", "instagram": "Instagram", "pinterest": "Pinterest",
              "x": "X", "tiktok": "TikTok", "youtube": "YouTube"}
STATUS_ICON = {
    "requested": "·", "in-progress": "~", "delivered": "✓",
    "published": "★", "parked": "!",
}
# finishing treatments — full spec in library/STYLES.md. The user names the
# style; never guess one. Add a number here when a new style is written up.
STYLES = {
    1: "Cinematic Reverent",
    2: "Quiet Observational",
    3: "Dua Teaching",
    4: "Animated Nasheed",
    5: "Image Post",
    # 6 was drafted as the animated sing-along and not chosen; never reuse it
    7: "Photoreal Sing-Along",
}


def style_label(n) -> str:
    if not n:
        return "unstyled"
    return f"Style {n} — {STYLES.get(int(n), 'unknown')}"


def load() -> dict:
    reg = json.loads(REG.read_text())
    for e in reg.get("productions", []):
        e.setdefault("ratings", {"editor": None, "visitors": None})
        e["ratings"].setdefault("editor", None)
        e["ratings"].setdefault("visitors", None)
        e.setdefault("style", None)
    return reg


def stars(v) -> str:
    """1-5 -> filled/empty stars; None -> em dash."""
    if not v:
        return "—"
    v = int(v)
    return "\u2605" * v + "\u2606" * (5 - v)


def save(reg: dict) -> None:
    REG.write_text(json.dumps(reg, indent=2, ensure_ascii=False) + "\n")


def slugify(text: str) -> str:
    s = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    s = re.sub(r"[\s_]+", "-", s.strip())
    return re.sub(r"-{2,}", "-", s).strip("-").lower()


def deliverables(folder: Path) -> list[str]:
    out = folder / "OUTPUT"
    if not out.is_dir():
        return []
    return sorted(f.name for f in out.iterdir()
                  if f.is_file() and f.suffix.lower() in MEDIA)


def read_title(brief: Path, fallback: str) -> str:
    """Title from the first '# heading' or 'TITLE:' line, else the filename."""
    lines = brief.read_text(errors="replace").lstrip().splitlines()
    for line in lines[:5]:
        t = line.strip()
        if t.startswith("#"):
            return t.lstrip("# ").strip()
        if t.upper().startswith("TITLE"):
            return t.split(":", 1)[-1].strip().strip('"')
    # No heading. Only the FIRST line can be a title, and only if it is short:
    # a one-line brief named 0026.md otherwise became "0026-0026", while
    # scanning for any short line picked prose out of the middle of 0027.
    for line in lines:
        t = line.strip().lstrip("*_-# ").rstrip("*_ ")
        if not t:
            continue
        if len(t) <= 80 and not t.endswith(":"):
            return t
        break
    return fallback


def guess_type(media: list[Path]) -> str:
    """Supplied media means finishing work, not generation."""
    if not media:
        return "video"
    exts = {m.suffix.lower() for m in media}
    if exts <= IMAGE_EXT:
        return "image-set"
    return "watermark"          # supplied video/audio to finish


def intake_scan(inbox: Path) -> list[dict]:
    """
    Work out what is waiting in inbox/. Three shapes are accepted:

      inbox/my idea.md                 brief alone            -> generate from scratch
      inbox/clip.mp4                   media alone            -> finishing job, request stubbed
      inbox/clip.mp4 + inbox/clip.md   same basename, paired  -> finishing job with a brief
      inbox/thank-you-allah/           folder: any mix        -> ONE production

    A subfolder always becomes a single production, which is how several clips
    that belong together (three nasheed verses, say) stay in one job.
    """
    jobs: list[dict] = []
    if not inbox.is_dir():
        return jobs

    for d in sorted(p for p in inbox.iterdir() if p.is_dir()):
        files = sorted(f for f in d.rglob("*") if f.is_file())
        briefs = [f for f in files if f.suffix.lower() == ".md"]
        media = [f for f in files if f.suffix.lower() in MEDIA]
        if not briefs and not media:
            continue
        brief = briefs[0] if briefs else None
        jobs.append({
            "label": f"{d.name}/",
            "dir": d,
            "brief": brief,
            "media": media,
            "type": guess_type(media),
            "title": read_title(brief, d.name) if brief else d.name,
        })

    loose = sorted(f for f in inbox.iterdir()
                   if f.is_file() and f.name != "README.md")
    briefs = [f for f in loose if f.suffix.lower() == ".md"]
    media = [f for f in loose if f.suffix.lower() in MEDIA]
    paired: set[Path] = set()

    for m in media:                                   # media + same-name brief
        mate = next((b for b in briefs if b.stem == m.stem), None)
        if mate:
            paired.add(mate)
        jobs.append({
            "label": m.name, "dir": None, "brief": mate, "media": [m],
            "type": guess_type([m]),
            "title": read_title(mate, m.stem) if mate else m.stem,
        })

    for b in briefs:                                  # briefs with no media
        if b in paired:
            continue
        jobs.append({
            "label": b.name, "dir": None, "brief": b, "media": [],
            "type": "video", "title": read_title(b, b.stem),
        })

    return jobs


def index(reg: dict) -> str:
    L: list[str] = []
    a = L.append
    a("# Productions — Index")
    a("")
    a("Generated by `scripts/social/productions.py`. Standard:")
    a("[PRODUCTION-STANDARD.md](../PRODUCTION-STANDARD.md)")
    a("")
    a("Every row is one request. Open the folder to find `00-REQUEST.md`")
    a("(what was asked) and `OUTPUT/` (what was delivered).")
    a("")
    a("Legend: `·` requested · `~` in progress · `✓` delivered · `★` published · `!` parked")
    a("")
    a("Style numbers are the finishing treatment — see")
    a("[library/STYLES.md](../library/STYLES.md). You name the style in the")
    a("request; it is never assumed.")
    a("")
    a("| # | Title | Type | Style | Status | Deliverables | Folder |")
    a("| --- | --- | --- | --- | --- | --- | --- |")

    counts: dict[str, int] = {}
    for p in reg["productions"]:
        folder = REPO / p["folder"]
        files = deliverables(folder)
        counts[p["status"]] = counts.get(p["status"], 0) + 1
        icon = STATUS_ICON.get(p["status"], "?")
        n = len(files)
        first = files[0] if files else "—"
        if n > 1:
            first = f"{first} _(+{n - 1})_"
        sty = f"{p['style']}" if p.get("style") else "—"
        a(f"| `{p['id']}` | {p['title']} | {p['type']} | {sty} | {icon} {p['status']} "
          f"| {first} | [{p['folder'].split('/')[-1]}]({p['folder'].split('/')[-1]}/) |")

    total = len(reg["productions"])
    a("")
    summary = " · ".join(f"{v} {k}" for k, v in sorted(counts.items()))
    a(f"**{total} productions** — {summary}")
    a("")
    a(f"Next free number: **{reg['_next_id']:04d}**")
    a("")
    a("## Adding a request")
    a("")
    a("```bash")
    a('python3 scripts/social/productions.py --new "Your Title" --type video')
    a("```")
    a("")
    a("Or drop a brief in `inbox/` and run `--intake`.")
    a("")
    a("## Not productions")
    a("")
    a("Reference and planning material lives in [`library/`](../library/) —")
    a("brand identity system, the 49-post social package, the pillars program,")
    a("and reusable voice samples.")
    return "\n".join(L) + "\n"


VIDEO_EXT = {".mp4", ".mov"}
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp"}


def assets(folder: Path) -> dict:
    """Collect what a production actually has on disk."""
    out = folder / "OUTPUT"
    vids: list[str] = []
    imgs: list[str] = []
    docs: list[str] = []
    if out.is_dir():
        for f in sorted(out.rglob("*")):
            if not f.is_file():
                continue
            rel = f.relative_to(folder.parent).as_posix()
            ext = f.suffix.lower()
            if ext in VIDEO_EXT:
                vids.append(rel)
            elif ext in IMAGE_EXT:
                imgs.append(rel)
            elif ext == ".md":
                docs.append(rel)
    req = folder / "00-REQUEST.md"
    notes = folder / "01-NOTES.md"
    return {
        "videos": vids,
        "images": imgs,
        "docs": docs,
        "request": req.relative_to(folder.parent).as_posix() if req.exists() else None,
        "notes": notes.relative_to(folder.parent).as_posix() if notes.exists() else None,
    }


def html(reg: dict) -> str:
    from html import escape
    from urllib.parse import quote

    cards: list[str] = []
    counts: dict[str, int] = {}
    n_vid = n_img = 0

    for p in reg["productions"]:
        folder = REPO / p["folder"]
        a = assets(folder)
        counts[p["status"]] = counts.get(p["status"], 0) + 1
        n_vid += len(a["videos"])
        n_img += len(a["images"])
        base = p["folder"].split("/")[-1]

        media = ""
        if a["videos"]:
            v = quote(a["videos"][0])
            media = f'<video class="prev" controls preload="metadata" src="{v}"></video>'
        elif a["images"]:
            i = quote(a["images"][0])
            media = f'<a href="{i}"><img class="prev" loading="lazy" src="{i}" alt=""></a>'
        else:
            media = '<div class="prev empty">no output yet</div>'

        links = [f'<a class="btn" href="{quote(base)}/">folder</a>']
        if a["request"]:
            links.append(f'<a class="btn" href="{quote(a["request"])}">request</a>')
        cap = [d for d in a["docs"] if d.endswith("CAPTION.md")]
        if cap:
            links.append(f'<a class="btn" href="{quote(cap[0])}">caption</a>')
        if a["notes"]:
            links.append(f'<a class="btn" href="{quote(a["notes"])}">notes</a>')

        plats = p.get("platforms") or {}
        chips = "".join(
            f'<span class="chip {"on" if plats.get(k) else "off"}"'
            f' title="{PLAT_LABEL[k]}: {plats.get(k) or "not published"}">'
            f'{PLAT_LABEL[k]}</span>'
            for k in reg.get("_platforms", PLATFORMS))

        r = p.get("ratings") or {}
        ed, vi = r.get("editor"), r.get("visitors")
        published = any(plats.values())
        rate_rows = (
            f'<div class="rate"><span class="rl">editor</span>'
            f'<span class="rv r{ed or 0}" title="delivery quality, 1-5">'
            f'{stars(ed)}</span></div>'
            + (f'<div class="rate"><span class="rl">visitors</span>'
               f'<span class="rv r{vi or 0}" title="engagement in first 24h, 1-5">'
               f'{stars(vi)}</span></div>' if published else ""))

        cost = p.get("cost") or {}
        dts = p.get("dates") or {}
        st = p.get("style")
        rows = [
            ("Style", escape(style_label(st))),
            ("Model", escape(str(p.get("model") or "—"))),
            ("Cost", f'{cost.get("credits", 0)} cr · ${cost.get("usd", 0):.2f}'
                     if cost.get("credits") or cost.get("usd") else "local only — no credits"),
            ("Requested", dts.get("requested") or "—"),
            ("Produced", dts.get("produced") or "—"),
            ("First published", dts.get("published") or "—"),
            ("Editor rating", f"{stars(ed)} {ed}/5" if ed else "not rated"),
            ("Visitor reactions",
             (f"{stars(vi)} {vi}/5" if vi else ("not rated" if published
              else "n/a — not published"))),
        ]
        pub_rows = "".join(
            f"<tr><td>{PLAT_LABEL[k]}</td><td>{escape(str(v))}</td></tr>"
            for k, v in plats.items() if v)
        detail = ("<details class='det'><summary>details</summary><table>"
                  + "".join(f"<tr><td>{k}</td><td>{v}</td></tr>" for k, v in rows)
                  + (f"<tr><th colspan=2>Published</th></tr>{pub_rows}" if pub_rows else "")
                  + "</table></details>")

        extra = ""
        rest = a["videos"][1:] + a["images"][1:]
        if rest:
            items = "".join(
                f'<li><a href="{quote(r)}">{escape(r.split("/")[-1])}</a></li>' for r in rest)
            extra = (f'<details><summary>{len(rest)} more file'
                     f'{"s" if len(rest) != 1 else ""}</summary><ul>{items}</ul></details>')

        style_pill = (
            f'<a class="pill sty" href="../library/STYLES.md"'
            f' title="{escape(style_label(st))}">style {st}</a>'
            if st else '<span class="pill sty off" title="no style recorded">unstyled</span>')

        cards.append(f"""<article class="card" data-status="{p['status']}" data-type="{p['type']}"
   data-ed="{ed or 0}" data-vi="{vi or 0}" data-produced="{0 if p['status']=='requested' else 1}"
   data-style="{st or 0}"
   data-search="{escape((p['id'] + ' ' + p['title'] + ' ' + p['type'] + ' ' + p['status']
                         + ' ' + style_label(st)).lower())}">
  <header><span class="num">{p['id']}</span>
    <h2>{escape(p['title'])}</h2></header>
  {media}
  <div class="meta"><span class="pill t-{p['type']}">{p['type']}</span>
    <span class="pill s-{p['status']}">{p['status']}</span>{style_pill}</div>
  <div class="rates">{rate_rows}</div>
  <div class="chips">{chips}</div>
  <nav>{''.join(links)}</nav>
  {detail}
  {extra}
</article>""")

    summary = " · ".join(f"{v} {k}" for k, v in sorted(counts.items()))
    tot_cr = sum((p.get("cost") or {}).get("credits", 0) for p in reg["productions"])
    tot_usd = sum((p.get("cost") or {}).get("usd", 0.0) for p in reg["productions"])
    eds = [(p.get("ratings") or {}).get("editor") for p in reg["productions"]]
    vis = [(p.get("ratings") or {}).get("visitors") for p in reg["productions"]]
    eds = [x for x in eds if x]
    vis = [x for x in vis if x]
    avg = ""
    if eds:
        avg += f" · editor avg <strong>{sum(eds)/len(eds):.1f}</strong>/5 ({len(eds)} rated)"
    if vis:
        avg += f" · visitors avg <strong>{sum(vis)/len(vis):.1f}</strong>/5 ({len(vis)} rated)"
    types = sorted({p["type"] for p in reg["productions"]})
    tbtns = "".join(f'<button data-f="type" data-v="{t}">{t}</button>' for t in types)

    # per-style visitor average — the point of recording styles at all
    used = sorted({p["style"] for p in reg["productions"] if p.get("style")})
    stbtns = "".join(
        f'<button data-f="style" data-v="{n}" title="{STYLES.get(n, "?")}">'
        f'style {n}</button>' for n in used)
    if any(not p.get("style") for p in reg["productions"]):
        stbtns += '<button data-f="style" data-v="0">unstyled</button>'
    srows = ""
    for n in used:
        grp = [p for p in reg["productions"] if p.get("style") == n]
        gv = [(p.get("ratings") or {}).get("visitors") for p in grp]
        gv = [x for x in gv if x]
        ge = [(p.get("ratings") or {}).get("editor") for p in grp]
        ge = [x for x in ge if x]
        srows += (
            f"<tr><td>Style {n} — {STYLES.get(n, '?')}</td>"
            f"<td>{len(grp)}</td>"
            f"<td>{f'{sum(ge)/len(ge):.1f}' if ge else '—'}</td>"
            f"<td>{f'{sum(gv)/len(gv):.1f}' if gv else '—'}</td></tr>")
    styleboard = (
        '<details class="board"><summary>style performance</summary>'
        '<table><tr><th>Style</th><th>Used</th><th>Editor</th><th>Visitors</th></tr>'
        f'{srows}</table>'
        '<p>Averages only — small samples. Full spec: '
        '<a href="../library/STYLES.md">library/STYLES.md</a></p></details>'
        if srows else "")
    sbtns = "".join(f'<button data-f="status" data-v="{s}">{s}</button>'
                    for s in ["published", "delivered", "in-progress", "requested", "parked"]
                    if s in counts)

    return f"""<title>Riwaq Productions</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{{--bg:#f6f4ee;--fg:#1b2a24;--dim:#5d6b64;--card:#fff;--line:#dfdbd0;
--emerald:#0f5132;--gold:#9a7b32;--goldbg:#f3e9d2}}
@media(prefers-color-scheme:dark){{:root:not([data-theme=light]){{--bg:#0e1512;--fg:#e8e4d8;
--dim:#9aa8a0;--card:#16211c;--line:#26332c;--emerald:#7fc9a4;--gold:#deb876;--goldbg:#2a2415}}}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--fg);
font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}}
header.top{{padding:26px 22px 14px;max-width:1400px;margin:0 auto}}
h1{{margin:0 0 4px;font-size:1.5rem;letter-spacing:-.01em}}
.sub{{color:var(--dim);font-size:.87rem}}
.controls{{position:sticky;top:0;z-index:5;background:var(--bg);
border-bottom:1px solid var(--line);padding:12px 22px}}
.controls .inner{{max-width:1400px;margin:0 auto;display:flex;gap:10px;
flex-wrap:wrap;align-items:center}}
input[type=search]{{flex:1 1 240px;min-width:200px;padding:9px 12px;border-radius:9px;
border:1px solid var(--line);background:var(--card);color:var(--fg);font-size:.92rem}}
button{{padding:7px 13px;border-radius:20px;border:1px solid var(--line);
background:var(--card);color:var(--dim);cursor:pointer;font-size:.82rem}}
button:hover{{color:var(--fg)}}
button.on{{background:var(--emerald);border-color:var(--emerald);color:#fff}}
@media(prefers-color-scheme:dark){{button.on{{color:#0e1512}}}}
main{{max-width:1400px;margin:0 auto;padding:20px 22px 60px;
display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(290px,1fr))}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:14px;
padding:14px;display:flex;flex-direction:column;gap:10px}}
.card.hide{{display:none}}
.card header{{display:flex;gap:9px;align-items:baseline}}
.num{{font:600 .74rem/1 ui-monospace,SFMono-Regular,monospace;color:var(--gold);
background:var(--goldbg);padding:4px 7px;border-radius:5px;flex:none}}
.card h2{{margin:0;font-size:.98rem;font-weight:600;line-height:1.3}}
.prev{{width:100%;aspect-ratio:9/16;max-height:300px;object-fit:cover;
border-radius:9px;background:#000;display:block}}
.prev.empty{{aspect-ratio:16/9;max-height:90px;display:grid;place-items:center;
background:transparent;border:1px dashed var(--line);color:var(--dim);font-size:.8rem}}
img.prev{{aspect-ratio:auto;object-fit:contain;background:transparent}}
.meta{{display:flex;gap:6px;flex-wrap:wrap}}
.pill{{font-size:.71rem;padding:3px 8px;border-radius:11px;border:1px solid var(--line);
color:var(--dim);text-transform:lowercase}}
.s-published{{background:var(--emerald);border-color:var(--emerald);color:#fff}}
@media(prefers-color-scheme:dark){{.s-published{{color:#0e1512}}}}
.s-delivered{{border-color:var(--gold);color:var(--gold)}}
.pill.sty{{background:var(--goldbg);border-color:var(--gold);color:var(--gold);
font-weight:600;text-decoration:none}}
.pill.sty.off{{background:transparent;border-color:var(--line);color:var(--dim);
font-weight:400}}
.refs{{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap}}
.refs a{{font-size:.74rem;padding:4px 10px;border-radius:20px;border:1px solid var(--line);
color:var(--dim);text-decoration:none}}
.refs a:hover{{color:var(--emerald);border-color:var(--emerald)}}
.board{{margin-top:12px;font-size:.8rem;color:var(--dim)}}
.board summary{{cursor:pointer;color:var(--emerald);font-weight:600}}
.board table{{border-collapse:collapse;margin-top:8px;font-size:.76rem}}
.board th{{text-align:left;color:var(--gold);font-size:.72rem;padding:2px 14px 4px 0}}
.board td{{padding:3px 14px 3px 0;border-top:1px solid var(--line)}}
.board p{{margin:8px 0 0;font-size:.72rem}}
.board a{{color:var(--emerald)}}
nav{{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto}}
a.btn{{font-size:.78rem;padding:5px 10px;border-radius:7px;border:1px solid var(--line);
color:var(--fg);text-decoration:none}}
a.btn:hover{{border-color:var(--emerald);color:var(--emerald)}}
.rates{{display:flex;flex-direction:column;gap:2px}}
.rate{{display:flex;align-items:center;gap:7px;font-size:.72rem}}
.rl{{color:var(--dim);width:48px;flex:none}}
.rv{{letter-spacing:1px;color:var(--line)}}
.rv.r1,.rv.r2{{color:#c2564a}}
.rv.r3{{color:var(--gold)}}
.rv.r4,.rv.r5{{color:var(--emerald)}}
.chips{{display:flex;gap:4px;flex-wrap:wrap}}
.chip{{font-size:.63rem;padding:2px 6px;border-radius:4px;border:1px solid var(--line);
color:var(--dim);opacity:.4;cursor:default}}
.chip.on{{opacity:1;background:var(--goldbg);border-color:var(--gold);color:var(--gold);
font-weight:600}}
details{{font-size:.8rem;color:var(--dim)}}
details.det summary{{cursor:pointer;color:var(--emerald);font-weight:600}}
details.det table{{width:100%;border-collapse:collapse;margin-top:7px;font-size:.76rem}}
details.det td{{padding:3px 0;vertical-align:top;border-bottom:1px solid var(--line)}}
details.det td:first-child{{color:var(--dim);width:42%;padding-right:8px}}
details.det th{{text-align:left;padding:7px 0 2px;color:var(--gold);font-size:.72rem}}
details ul{{margin:6px 0 0;padding-left:18px}}
details a{{color:var(--fg)}}
#none{{grid-column:1/-1;text-align:center;color:var(--dim);padding:40px;display:none}}
</style>

<header class="top">
  <h1>Riwaq Al Ilm — Productions</h1>
  <div class="sub">{len(reg['productions'])} productions · {n_vid} videos ·
    {n_img} images · {summary}<br>
    total spend <strong>{tot_cr} credits · ${tot_usd:.2f}</strong> ·
    next number <strong>{reg['_next_id']:04d}</strong>{avg}</div>
  <div class="refs"><a href="../library/STYLES.md">styles</a>
    <a href="../CONNECTIONS.md">connections</a>
    <a href="../PRODUCTION-STANDARD.md">standard</a>
    <a href="INDEX.md">index.md</a></div>
  {styleboard}
</header>

<div class="controls"><div class="inner">
  <input type="search" id="q" placeholder="Search title, number, type…" autocomplete="off">
  <button class="on" data-f="all" data-v="">all</button>
  <button data-f="rated" data-v="editor">rated by me</button>
  <button data-f="unrated" data-v="editor">needs my rating</button>
  {sbtns}{tbtns}{stbtns}
</div></div>

<main id="grid">
{''.join(cards)}
<p id="none">Nothing matches.</p>
</main>

<script>
const cards=[...document.querySelectorAll('.card')],q=document.getElementById('q'),
      none=document.getElementById('none'),btns=[...document.querySelectorAll('button')];
let f={{key:'all',val:''}};
function apply(){{
  const t=q.value.trim().toLowerCase();let n=0;
  cards.forEach(c=>{{
    let okF;
    if(f.key==='all') okF=true;
    else if(f.key==='rated') okF=c.dataset.ed!=='0';
    else if(f.key==='unrated') okF=c.dataset.ed==='0'&&c.dataset.produced==='1';
    else okF=c.dataset[f.key]===f.val;
    const okQ=!t||c.dataset.search.includes(t);
    const show=okF&&okQ;c.classList.toggle('hide',!show);if(show)n++;
  }});
  none.style.display=n?'none':'block';
}}
q.addEventListener('input',apply);
btns.forEach(b=>b.addEventListener('click',()=>{{
  btns.forEach(x=>x.classList.remove('on'));b.classList.add('on');
  f={{key:b.dataset.f,val:b.dataset.v}};apply();
}}));
document.addEventListener('keydown',e=>{{
  if(e.key==='/'&&document.activeElement!==q){{e.preventDefault();q.focus();}}
}});
</script>
"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--new", metavar="TITLE")
    ap.add_argument("--type", default="video",
                    choices=["video", "image-set", "watermark", "program"])
    ap.add_argument("--intake", action="store_true",
                    help="turn every brief in inbox/ into a numbered production")
    ap.add_argument("--publish", metavar="ID",
                    help="record that a production went live")
    ap.add_argument("--on", metavar="LIST",
                    help="comma-separated platforms: " + ",".join(PLATFORMS))
    ap.add_argument("--date", metavar="YYYY-MM-DD",
                    help="publish date, or 'scheduled' (default: today)")
    ap.add_argument("--rate", metavar="ID", help="attach ratings to a production")
    ap.add_argument("--editor", type=int, choices=[1, 2, 3, 4, 5],
                    help="your rating of the delivery, 1-5")
    ap.add_argument("--visitors", type=int, choices=[1, 2, 3, 4, 5],
                    help="engagement in the first 24h after publishing, 1-5")
    ap.add_argument("--set", metavar="ID")
    ap.add_argument("--status",
                    choices=["requested", "in-progress", "delivered",
                             "published", "parked"])
    ap.add_argument("--style", type=int, choices=list(STYLES),
                    help="finishing style (see library/STYLES.md); use with "
                         "--set ID or --new. Never guessed — the user names it")
    ap.add_argument("--rename", metavar="ID",
                    help="give a production a proper title; renames its folder, "
                         "updates the registry, and moves files with git when tracked")
    ap.add_argument("--title", metavar="TEXT", help="the new title, use with --rename")
    ap.add_argument("--styles", action="store_true",
                    help="list the style catalogue and exit")
    args = ap.parse_args()

    if args.styles:
        print("Finishing styles — full spec in library/STYLES.md\n")
        for n, name in STYLES.items():
            print(f"  {n}  {name}")
        print("\nThe style is named in the request. It is never assumed.")
        return 0

    reg = load()

    if args.intake:
        jobs = intake_scan(REPO / "inbox")
        if not jobs:
            print("inbox/ is empty — nothing waiting")
        for job in jobs:
            num = reg["_next_id"]
            slug = slugify(job["title"])[:48] or f"job-{num:04d}"
            folder = PROD / f"{num:04d}-{slug}"
            for sub in ("OUTPUT", "work", "source"):
                (folder / sub).mkdir(parents=True, exist_ok=True)

            if job["brief"]:
                shutil.move(str(job["brief"]), folder / "00-REQUEST.md")
            # bytes stay untouched, but the NAME is sanitised — spaces and
            # quotes in supplied filenames have broken globbing before
            moved: list[str] = []
            for m in job["media"]:
                safe = (slugify(m.stem)[:60] or "source") + m.suffix.lower()
                dest = folder / "source" / safe
                n = 2
                while dest.exists():
                    dest = folder / "source" / f"{Path(safe).stem}-{n}{m.suffix.lower()}"
                    n += 1
                shutil.move(str(m), dest)
                moved.append(f"- `source/{dest.name}`"
                             + (f"  (was `{m.name}`)" if dest.name != m.name else ""))
            if not job["brief"]:
                # media with no brief: stub the request so it is never blank
                listed = "\n".join(moved)
                (folder / "00-REQUEST.md").write_text(
                    f"# {job['title']}\n\n_Production {num:04d} · type: "
                    f"{job['type']}_\n\n## Supplied media\n\n{listed}\n\n"
                    "## Request\n\n<!-- what should be done to these files:\n"
                    "     watermark? end card? captions? trim? which style? -->\n")
            if job["dir"] and job["dir"].is_dir() and not any(job["dir"].iterdir()):
                job["dir"].rmdir()

            reg["productions"].append({
                "id": f"{num:04d}", "slug": slug, "title": job["title"],
                "type": job["type"], "status": "requested",
                "folder": f"productions/{num:04d}-{slug}",
                "style": None,
            })
            reg["_next_id"] = num + 1
            print(f"intake: {job['label']}  ->  {folder.relative_to(REPO)}")
            print(f"  type {job['type']}"
                  + (f", {len(job['media'])} file(s) in source/" if job["media"] else "")
                  + ("" if job["brief"] else ", request stubbed — needs your brief"))
            print(f"  style not set — ask before producing "
                  f"(--set {num:04d} --style N)")
        if jobs:
            save(reg)

    if args.new:
        num = reg["_next_id"]
        slug = slugify(args.new)
        folder = PROD / f"{num:04d}-{slug}"
        for sub in ("OUTPUT", "work", "source"):
            (folder / sub).mkdir(parents=True, exist_ok=True)
        req = folder / "00-REQUEST.md"
        if not req.exists():
            req.write_text(
                f"# {args.new}\n\n_Production {num:04d} · type: {args.type}_\n\n"
                "## Request\n\n<!-- your brief goes here -->\n")
        reg["productions"].append({
            "id": f"{num:04d}", "slug": slug, "title": args.new,
            "type": args.type, "status": "requested",
            "folder": f"productions/{num:04d}-{slug}",
            "style": args.style,
        })
        reg["_next_id"] = num + 1
        save(reg)
        print(f"created {folder.relative_to(REPO)}")
        print(f"  write the brief -> {req.relative_to(REPO)}")
        if args.style is None:
            print("  no style set — name one before production "
                  "(--styles to list, --set ID --style N)")
        else:
            print(f"  {style_label(args.style)}")

    if args.publish:
        if not args.on:
            print("--publish needs --on facebook,instagram,..."); return 2
        when = args.date or _dt.date.today().isoformat()
        want = [x.strip().lower() for x in args.on.split(",") if x.strip()]
        bad = [x for x in want if x not in PLATFORMS]
        if bad:
            print(f"unknown platform(s): {', '.join(bad)}")
            print(f"known: {', '.join(PLATFORMS)}"); return 2
        for e in reg["productions"]:
            if e["id"] == args.publish:
                e.setdefault("platforms", {k: None for k in PLATFORMS})
                for k in want:
                    e["platforms"][k] = when
                real = [v for v in e["platforms"].values() if v and v != "scheduled"]
                if real:
                    e.setdefault("dates", {})["published"] = min(real)
                e["status"] = "published"
                save(reg)
                live = ", ".join(k for k, v in e["platforms"].items() if v)
                print(f"{args.publish} {e['title']}")
                print(f"  now recorded on: {live}")
                break
        else:
            print(f"no production {args.publish}"); return 1

    if args.rate:
        if args.editor is None and args.visitors is None:
            print("--rate needs --editor N and/or --visitors N (1-5)"); return 2
        for e in reg["productions"]:
            if e["id"] == args.rate:
                e.setdefault("ratings", {"editor": None, "visitors": None})
                if args.editor is not None:
                    e["ratings"]["editor"] = args.editor
                if args.visitors is not None:
                    if not any((e.get("platforms") or {}).values()):
                        print(f"note: {args.rate} is not marked published — "
                              "visitor reactions measure the first 24h after publishing")
                    e["ratings"]["visitors"] = args.visitors
                save(reg)
                rt = e["ratings"]
                print(f"{args.rate} {e['title']}")
                print(f"  editor   {stars(rt['editor'])} "
                      f"{rt['editor'] or '-'}/5")
                print(f"  visitors {stars(rt['visitors'])} "
                      f"{rt['visitors'] or '-'}/5")
                break
        else:
            print(f"no production {args.rate}"); return 1

    if args.rename:
        if not args.title:
            print('--rename needs --title "New Title"'); return 2
        for e in reg["productions"]:
            if e["id"] == args.rename:
                slug = slugify(args.title)[:48]
                old = REPO / e["folder"]
                new = PROD / f"{e['id']}-{slug}"
                if old.resolve() != new.resolve():
                    if new.exists():
                        print(f"refusing: {new.relative_to(REPO)} already exists"); return 1
                    tracked = subprocess.run(
                        ["git", "ls-files", "--error-unmatch", str(old)],
                        cwd=REPO, capture_output=True).returncode == 0
                    if tracked:
                        subprocess.run(["git", "mv", str(old), str(new)], cwd=REPO, check=True)
                    else:
                        shutil.move(str(old), str(new))
                e["title"] = args.title
                e["slug"] = slug
                e["folder"] = f"productions/{e['id']}-{slug}"
                save(reg)
                print(f"{e['id']} -> {args.title}")
                print(f"  {e['folder']}")
                break
        else:
            print(f"no production {args.rename}"); return 1

    if args.set:
        if not args.status and args.style is None:
            print("--set needs --status and/or --style"); return 2
        for p in reg["productions"]:
            if p["id"] == args.set:
                if args.status:
                    p["status"] = args.status
                    print(f"{args.set} -> {args.status}")
                if args.style is not None:
                    p["style"] = args.style
                    print(f"{args.set} -> {style_label(args.style)}")
                save(reg)
                break
        else:
            print(f"no production {args.set}"); return 1

    (PROD / "INDEX.md").write_text(index(reg))
    (PROD / "index.html").write_text(html(reg))
    print(f"wrote productions/INDEX.md + index.html ({len(reg['productions'])} productions)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
