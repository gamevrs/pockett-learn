"""Runs lesson cases through the real engine prelude. Input: JSON file path. Output: JSON on stdout."""
import contextlib, importlib, importlib.metadata, io, json, site, sys

# The runner is started with -I (no user site), but "micropip:" packages are pip-installed with
# --user by validate-content.mjs, so make that directory importable (after the stdlib).
try:
    if site.getusersitepackages() not in sys.path:
        sys.path.append(site.getusersitepackages())
except Exception:
    pass


def missing_package(pkg):
    """Why `pkg` is not available locally, or None. "micropip:name==1.2.3" needs that exact version."""
    if pkg.startswith("micropip:"):
        spec = pkg[len("micropip:"):]
        name, _, wanted = spec.partition("==")
        try:
            have = importlib.metadata.version(name)
        except Exception:
            return spec + " (not installed; run: python -m pip install --user " + spec + ")"
        if wanted and have != wanted:
            return spec + " (found " + have + "; run: python -m pip install --user " + spec + ")"
        return None
    try:
        importlib.import_module(pkg)
    except Exception:
        return pkg
    return None


prelude = open(sys.argv[2], encoding="utf8").read()
cases = json.load(open(sys.argv[1], encoding="utf8"))
out = []
for case in cases:
    # Pyodide packages (Project.packages) must be importable here too; if one is not, warn and skip
    # the case instead of reporting a bogus failure.
    missing = [m for m in (missing_package(p) for p in case.get("packages") or []) if m]
    if missing:
        out.append({"label": case["label"], "skipped": True, "warn": "package(s) not importable in local Python: " + ", ".join(missing) + "; not validated", "results": []})
        continue
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
