"""Runs lesson cases through the real engine prelude. Input: JSON file path. Output: JSON on stdout."""
import json, sys

prelude = open(sys.argv[2], encoding="utf8").read()
cases = json.load(open(sys.argv[1], encoding="utf8"))
out = []
for case in cases:
    ns = {"__name__": "__main__"}
    exec(prelude, ns)
    run = json.loads(ns["_run_user"](case["source"]))
    entry = {"label": case["label"], "error": run["error"], "results": []}
    if not run["error"]:
        for t in case["tests"]:
            r = json.loads(ns["_run_test"](t["assertionCode"], run["stdout"]))
            entry["results"].append({"id": t["id"], "ok": r["ok"], "error": r.get("error")})
        # the scene snapshot must work too
        json.loads(ns["_snapshot"]())
    out.append(entry)
print(json.dumps(out))
