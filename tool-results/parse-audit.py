#!/usr/bin/env python3
"""Parse output agent-browser eval audit. Pakai: python3 parse-audit.py <file>"""
import json
import sys

raw = open(sys.argv[1]).read().strip()
# agent-browser eval membungkus hasil dalam JSON string — parse dua lapis bila perlu
d = json.loads(raw)
if isinstance(d, str):
    d = json.loads(d)

print("hOverflow:", d["hOverflow"], "| scrollW:", d["scrollWidth"], "| offenders:", len(d["offenders"]))
for o in d["offenders"][:8]:
    print("  CUT:", o)
for t in d["smallTaps"][:8]:
    print("  TAP:", t)
for t in d["tinyTexts"][:8]:
    print("  TXT:", t)
print("footer:", d["footer"])
print("version:", d["version"])
