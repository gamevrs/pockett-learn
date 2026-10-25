"""Runs lesson cases through the real engine prelude. Input: JSON file path. Output: JSON on stdout."""
import contextlib, io, json, sys

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
            # tests may call learner functions that print; keep that out of our JSON output
            with contextlib.redirect_stdout(io.StringIO()):
                r = json.loads(ns["_run_test"](t["assertionCode"], run["stdout"]))
            entry["results"].append({"id": t["id"], "ok": r["ok"], "error": r.get("error")})
        # the scene snapshot must work too
        json.loads(ns["_snapshot"]())
    out.append(entry)
print(json.dumps(out))
