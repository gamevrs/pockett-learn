"""Generate exact code traces for the "trace" widget by running each program in CPython.

  python gentrace.py specs.py <programs.ts>      -> rewrites the TRACES block in programs.ts
  python gentrace.py specs.py --list NAME         -> prints the steps of one program (to place notes)

Step semantics (matches the widget): step k = "line L just ran"; its state is the state AFTER it.
"""
import io, json, sys, types

MAX_STEPS = 80


def run(src, inline=False):
    code = compile(src, "<prog>", "exec")
    out = io.StringIO()
    events = []  # dicts: kind, line, snap, outlen, caller_line
    keep = []  # keep heap objects alive so id() stays unique
    heap_ids = {}

    def heap_id(o):
        if id(o) not in heap_ids:
            heap_ids[id(o)] = len(heap_ids) + 1
            keep.append(o)
        return heap_ids[id(o)]

    def enc(v, heap, depth=0):
        if isinstance(v, bool):
            return v
        if v is None:
            return None
        if isinstance(v, int):
            return v
        if isinstance(v, float):
            return {"py": repr(v)}
        if isinstance(v, str):
            return v
        if isinstance(v, types.FunctionType):
            return {"fn": v.__name__}
        if isinstance(v, (list, tuple, dict)):
            prim = lambda x: x is None or isinstance(x, (bool, int, float, str))
            if inline and isinstance(v, list) and all(prim(x) for x in v):
                return [enc(x, heap) for x in v]
            hid = heap_id(v)
            if hid not in heap:
                heap[hid] = None  # placeholder (cycles)
                if isinstance(v, dict):
                    heap[hid] = {"id": hid, "kind": "dict", "entries": [[enc(k, heap), enc(x, heap)] for k, x in v.items()]}
                else:
                    heap[hid] = {"id": hid, "kind": "tuple" if isinstance(v, tuple) else "list", "items": [enc(x, heap) for x in v]}
            return {"ref": hid}
        return {"py": repr(v)}

    def visible(name, v):
        return not name.startswith("__") and not isinstance(v, (types.ModuleType, type, types.BuiltinFunctionType))

    def snapshot(frame, ret=None, has_ret=False):
        chain = []
        f = frame
        while f is not None and f.f_code.co_filename == "<prog>":
            chain.append(f)
            f = f.f_back
        chain.reverse()
        heap = {}
        frames = []
        for i, fr in enumerate(chain):
            is_mod = fr.f_code.co_name == "<module>"
            src_vars = fr.f_globals if is_mod else fr.f_locals
            vs = {k: enc(v, heap) for k, v in list(src_vars.items()) if visible(k, v)}
            entry = {"name": "global" if is_mod else fr.f_code.co_name, "vars": vs}
            if has_ret and i == len(chain) - 1:
                entry["ret"] = enc(ret, heap)
            frames.append(entry)
        return {"frames": frames, "heap": [heap[k] for k in sorted(heap)]}

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != "<prog>":
            return tracer
        if event == "line":
            events.append({"kind": "line", "line": frame.f_lineno, "snap": snapshot(frame), "outlen": len(out.getvalue())})
        elif event == "call":
            events.append({"kind": "call", "snap": snapshot(frame), "outlen": len(out.getvalue())})
        elif event == "return" and frame.f_code.co_name != "<module>":
            events.append({"kind": "return", "snap": snapshot(frame, arg, True), "outlen": len(out.getvalue()), "caller_line": frame.f_back.f_lineno})
        return tracer

    g = {"__name__": "__main__"}
    old = sys.stdout
    sys.stdout = out
    sys.settrace(tracer)
    try:
        exec(code, g)
    finally:
        sys.settrace(None)
        sys.stdout = old
    # final state: globals only
    heap = {}
    final = {"frames": [{"name": "global", "vars": {k: enc(v, heap) for k, v in g.items() if visible(k, v)}}], "heap": []}
    final["heap"] = [heap[k] for k in sorted(heap)]
    events.append({"kind": "end", "snap": final, "outlen": len(out.getvalue())})

    text = out.getvalue()
    steps = []
    for i, ev in enumerate(events[:-1]):
        nxt = events[i + 1]
        printed = text[ev["outlen"]:nxt["outlen"]]
        if ev["kind"] == "line":
            steps.append({"line": ev["line"], "snap": nxt["snap"], "out": printed})
        elif ev["kind"] == "return":
            steps.append({"line": ev["caller_line"], "snap": nxt["snap"], "out": printed, "returned": True})
        else:  # call: output between call and first line is impossible; ignore
            pass
    return steps, text


def compact(steps, use_frames):
    res = []
    prev_vars = prev_heap = None
    for s in steps:
        st = {"line": s["line"]}
        snap = s["snap"]
        if use_frames:
            vars_ = snap["frames"]
        else:
            vars_ = snap["frames"][0]["vars"]
        if vars_ != prev_vars:
            st["frames" if use_frames else "vars"] = vars_
            prev_vars = vars_
        if snap["heap"] != prev_heap:
            st["heap"] = snap["heap"]
            prev_heap = snap["heap"]
        if s["out"]:
            st["out"] = s["out"]
        res.append(st)
    return res


def build(spec):
    src = spec["code"].strip("\n") + "\n"
    steps, text = run(src, spec.get("inline", False))
    use_frames = spec.get("frames", any(len(s["snap"]["frames"]) > 1 for s in steps))
    if len(steps) > MAX_STEPS:
        raise SystemExit(f"{spec['name']}: {len(steps)} steps (max {MAX_STEPS})")
    c = compact(steps, use_frames)
    for k, note in spec.get("notes", {}).items():
        c[k - 1]["note"] = note
    return src.rstrip("\n"), c, text, steps


def main():
    specs_ns = {}
    exec(open(sys.argv[1], encoding="utf8").read(), specs_ns)
    specs = specs_ns["SPECS"]
    if sys.argv[2] == "--list":
        spec = next(s for s in specs if s["name"] == sys.argv[3])
        src, c, text, raw = build(spec)
        lines = src.split("\n")
        for i, s in enumerate(raw, 1):
            print(f"{i:3}: L{s['line']:<3} {lines[s['line'] - 1].strip():40} out={s['out']!r}")
        print("OUTPUT:", repr(text))
        return
    parts = []
    for spec in specs:
        src, c, text, _ = build(spec)
        parts.append(f"  {json.dumps(spec['name'])}: {{\n    code: {json.dumps(src, ensure_ascii=False)},\n    steps: {json.dumps(c, ensure_ascii=False)},\n  }},")
        print(f"{spec['name']}: {len(c)} steps, output {text!r}", file=sys.stderr)
    block = "// <traces> generated by gentrace.py from real CPython runs; do not edit by hand\nconst TRACES: Record<string, { code: string; steps: unknown[] }> = {\n" + "\n".join(parts) + "\n};\n// </traces>"
    path = sys.argv[2]
    ts = open(path, encoding="utf8").read()
    a = ts.index("// <traces>")
    b = ts.index("// </traces>") + len("// </traces>")
    ts = ts[:a] + block + ts[b:]
    open(path, "w", encoding="utf8", newline="\n").write(ts)


if __name__ == "__main__":
    main()
