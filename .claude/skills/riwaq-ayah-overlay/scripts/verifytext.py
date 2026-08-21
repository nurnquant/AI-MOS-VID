#!/usr/bin/env python3
"""Prove every string that will appear on screen matches its source, exactly.

    python3 verifytext.py cards.json source.md

For sacred text "it looks right" is not a check. This compares codepoint by
codepoint, harakat included, and exits non-zero on any difference.
"""
import json, re, sys, unicodedata
from pathlib import Path


def main() -> int:
    cards = json.loads(Path(sys.argv[1]).read_text())
    src = Path(sys.argv[2]).read_text()

    # bolded runs are the Arabic; the paragraph under each is its translation
    ar = re.findall(r"\*\*(.+?)\*\*", src)
    en = [" ".join(m.split())
          for m in re.findall(r"\*\*.+?\*\*\n\n(.+?)(?:\n\n|\Z)", src, re.S)]

    ok = True
    print(f"  {len(cards)} cards against {Path(sys.argv[2]).name}")
    for i, c in enumerate(cards):
        for field, pool in (("ar", ar), ("en", en)):
            want = c.get(field, "")
            if not want:
                continue
            match = want in pool
            ok &= match
            marks = sum(1 for ch in want if unicodedata.combining(ch))
            print(f"   card {c['id']} {field}: {'IDENTICAL' if match else 'NOT IN SOURCE'}"
                  f"  ({len(want)} chars, {marks} harakat)")
            if not match:
                print(f"     on screen: {want!r}")
    print("\n ", "ALL TEXT MATCHES THE SOURCE" if ok else "MISMATCH — DO NOT SHIP")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
