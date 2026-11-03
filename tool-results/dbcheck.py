import os, json, urllib.request

URL = os.environ["DATABASE_URL"].replace("libsql://", "https://") + "/v2/pipeline"
TOKEN = os.environ["DATABASE_AUTH_TOKEN"]

def run(requests):
    body = json.dumps({"requests": requests}).encode()
    req = urllib.request.Request(URL, data=body, headers={
        "Authorization": "Bearer " + TOKEN,
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def q(sql):
    res = run([{"type": "execute", "stmt": {"sql": sql}}, {"type": "close"}])
    result = res["results"][0]["response"]["result"]
    rows = result.get("rows") or []
    cols = [c["name"] for c in result["cols"]]
    out = []
    for row in rows:
        d = {}
        for name, cell in zip(cols, row):
            d[name] = cell["value"] if cell else None
        out.append(d)
    return out

def one(sql):
    rows = q(sql)
    return rows[0] if rows else {}

print("== counts ==")
print("habits:", one("SELECT COUNT(*) c FROM habits").get("c"))
print("transactions:", one("SELECT COUNT(*) c FROM transactions").get("c"))
print("budgets:", one("SELECT COUNT(*) c FROM budgets").get("c"))

print()
print("== transaksi >= 2026-10-28 (data baru?) ==")
recent = q("SELECT title, category, type, amount, transaction_date, updated_at FROM transactions WHERE transaction_date >= '2026-10-28' ORDER BY transaction_date DESC LIMIT 12")
if not recent:
    print("  (tidak ada)")
for r in recent:
    print("  ", json.dumps(r, ensure_ascii=False))

print()
print("== kategori kasar tersisa? ==")
rows = q("SELECT category, COUNT(*) n FROM transactions GROUP BY category")
coarse = [r for r in rows if r["category"] in ("Makanan", "Lifestyle", "Transportasi", "Tagihan", "Freelance", "Kesehatan")]
print("  ", coarse if coarse else "TIDAK ADA — restore masih utuh")

print()
print("== budgets ==")
for r in q("SELECT category, monthly_limit FROM budgets ORDER BY category"):
    print("  ", r["category"], r["monthly_limit"])

print()
print("== checkins >= 2026-10-28 ==")
recent_ci = q("SELECT completed_on, COUNT(*) n FROM habit_checkins WHERE completed_on >= '2026-10-28' GROUP BY completed_on ORDER BY completed_on DESC LIMIT 8")
if not recent_ci:
    print("  (tidak ada)")
for r in recent_ci:
    print("  ", r["completed_on"], "->", r["n"], "habit")

print()
print("== updated_at terakhir ==")
print("  transactions:", one("SELECT MAX(updated_at) m FROM transactions").get("m"))
print("  habits:", one("SELECT MAX(updated_at) m FROM habits").get("m"))
print("  budgets:", one("SELECT MAX(updated_at) m FROM budgets").get("m"))
