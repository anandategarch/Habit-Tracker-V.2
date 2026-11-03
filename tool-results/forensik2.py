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

print("== transaksi terbaru by created_at (bukan updated_at!) ==")
for r in q("SELECT id, title, category, type, amount, transaction_date, created_at FROM transactions ORDER BY created_at DESC LIMIT 5"):
    print("  ", json.dumps(r, ensure_ascii=False))

print()
print("== backup vs DB: kategori Kopi semua ==")
bk = json.load(open("/tmp/rutina-backup-2026-11-03.json"))["data"]["transactions"]
bk_kopi_ids = {t["id"] for t in bk if t["category"] == "Kopi"}
db_kopi = q("SELECT id, title, transaction_date, created_at FROM transactions WHERE category='Kopi'")
db_kopi_ids = {r["id"] for r in db_kopi}
extra = db_kopi_ids - bk_kopi_ids
print("  backup Kopi:", len(bk_kopi_ids), "| DB Kopi:", len(db_kopi_ids), "| extra:", extra)
for r in db_kopi:
    if r["id"] in extra:
        print("  >>> TRANSAKSI BARU:", json.dumps(r, ensure_ascii=False))

print()
print("== checkin Nov 2-3: habit apa saja ==")
for r in q("""SELECT c.habit_id, c.completed_on, h.title FROM habit_checkins c
             JOIN habits h ON h.id = c.habit_id WHERE c.completed_on >= '2026-11-02' ORDER BY c.completed_on"""):
    print("  ", r["completed_on"], "->", r["title"])

print()
print("== finance_categories masih 27? ==")
print("  ", len(q("SELECT id FROM finance_categories")))

print()
print("== updated_at massal terakhir (kapan PUT terjadi) ==")
for r in q("SELECT MAX(updated_at) m FROM transactions"):
    print("  tx:", r["m"])
