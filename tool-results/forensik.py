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

print("== FORENSIK: transaction terbaru by updated_at ==")
for r in q("SELECT id, title, category, type, amount, transaction_date, created_at, updated_at FROM transactions ORDER BY updated_at DESC LIMIT 5"):
    print("  ", json.dumps(r, ensure_ascii=False))

print()
print("== budgets + updated_at ==")
for r in q("SELECT category, monthly_limit, updated_at FROM budgets ORDER BY updated_at DESC"):
    print("  ", r["category"], r["monthly_limit"], "| updated:", r["updated_at"])

print()
print("== habits count & updated_at terbaru ==")
print("  count:", one("SELECT COUNT(*) c FROM habits").get("c"))
for r in q("SELECT id, title, updated_at FROM habits ORDER BY updated_at DESC LIMIT 6"):
    print("  ", r["title"], "| updated:", r["updated_at"])

print()
print("== habit_checkins terbaru ==")
for r in q("SELECT completed_on, COUNT(*) n FROM habit_checkins GROUP BY completed_on ORDER BY completed_on DESC LIMIT 5"):
    print("  ", r["completed_on"], "->", r["n"])

print()
print("== kategori distribusi sekarang ==")
for r in q("SELECT category, COUNT(*) n FROM transactions GROUP BY category ORDER BY n DESC"):
    print("  ", r["category"], r["n"])
