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

KEEP = {"Dating", "Hutang", "Kopi"}  # weeklyBudgets asli user dari backup V1
print("== sebelum ==")
for r in q("SELECT category, monthly_limit FROM budgets ORDER BY category"):
    tag = "KEEP" if r["category"] in KEEP else "DELETE"
    print("  ", tag, r["category"], r["monthly_limit"])

res = run([
    {"type": "execute", "stmt": {"sql": "DELETE FROM budgets WHERE category NOT IN ('Dating','Hutang','Kopi')"}},
    {"type": "close"},
])
errs = [x for x in res["results"] if x.get("type") == "error"]
print("delete ok:", not errs, errs if errs else "")

print("== sesudah ==")
for r in q("SELECT category, monthly_limit FROM budgets ORDER BY category"):
    print("  ", r["category"], r["monthly_limit"])

print()
print("== verifikasi data user asli tetap utuh ==")
print("  total tx:", len(q("SELECT id FROM transactions")))
print("  'Kopi Indomaret Point' ada:", len(q("SELECT id FROM transactions WHERE title='Kopi Indomaret Point'")))
print("  checkin Nov2+Nov3:", len(q("SELECT 1 FROM habit_checkins WHERE completed_on >= '2026-11-02'")))
print("  habits:", len(q("SELECT id FROM habits")))
print("  finance_categories:", len(q("SELECT id FROM finance_categories")))
