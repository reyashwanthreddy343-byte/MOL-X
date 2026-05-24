import urllib.request, json

data = json.dumps({"seed_smiles": ["CCO", "c1ccccc1", "CC(=O)O"]}).encode()
req = urllib.request.Request(
    "http://127.0.0.1:8000/pareto",
    data=data,
    headers={"Content-Type": "application/json"}
)
try:
    resp = urllib.request.urlopen(req, timeout=30)
    d = json.loads(resp.read())
    print("SUCCESS!")
    print("front_size:", d.get("front_size"))
    print("generations_run:", d.get("generations_run"))
    print("top_candidates count:", len(d.get("top_candidates", [])))
    print("metrics keys:", list(d.get("metrics", {}).keys()))
    if d.get("top_candidates"):
        print("first candidate:", json.dumps(d["top_candidates"][0], indent=2))
except Exception as e:
    print("ERROR:", e)
    import traceback; traceback.print_exc()
