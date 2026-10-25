"use client";

import React, { useState } from "react";
import { Check, ChevronDown, CircleSlash, TriangleAlert } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { CODE_SURFACE, CPane, Label } from "./shared";

type StageId = "source" | "preprocess" | "compile" | "assemble" | "link" | "run";
type Variant = "ok" | "header" | "syntax" | "link";

export interface PipelineProps {
  /**
   * ok: everything builds · header: a misspelled #include (preprocessor fails) · syntax: a missing semicolon
   * (compiler fails) · link: a function declared but never defined (linker fails).
   */
  variant?: Variant;
  /** explore: open each stage to see what it makes · pick: read the error and tap the stage that reported it. */
  mode?: "explore" | "pick";
  label?: string;
}

export interface PipelineState {
  stage: StageId | null;
  /** How many different stages have been opened. */
  seen: number;
}

const SOURCES: Record<Variant, string> = {
  ok: `#include <stdio.h>
#define TIMES 3

int main(void) {
    // say hi three times
    for (int i = 0; i < TIMES; i++)
        printf("hi %d\\n", i);
    return 0;
}`,
  header: `#include <stdoi.h>

int main(void) {
    printf("hi\\n");
    return 0;
}`,
  syntax: `#include <stdio.h>

int main(void) {
    printf("hi\\n")
    return 0;
}`,
  link: `#include <stdio.h>
int square(int n);  // declared, never defined

int main(void) {
    printf("%d\\n", square(7));
    return 0;
}`,
};

const FAILS: Record<Variant, StageId | null> = { ok: null, header: "preprocess", syntax: "compile", link: "link" };

const ERRORS: Record<Variant, string> = {
  ok: "",
  header: "hello.c:1:10: fatal error: stdoi.h: No such file or directory",
  syntax: "hello.c:4:19: error: expected ';' before 'return'",
  link: "/usr/bin/ld: /tmp/cc3xQ1.o: in function `main':\nhello.c:(.text+0xe): undefined reference to `square'\ncollect2: error: ld returned 1 exit status",
};

interface Stage {
  id: StageId;
  name: string;
  makes: string;
  cmd: string;
  what: string;
  out: (v: Variant) => string;
}

const STAGES: Stage[] = [
  { id: "source", name: "Source code", makes: "hello.c", cmd: "(you write this)", what: "Plain text that people can read. The CPU can't run it.", out: (v) => SOURCES[v] },
  {
    id: "preprocess",
    name: "Preprocessor",
    makes: "hello.i",
    cmd: "gcc -E hello.c -o hello.i",
    what: "Handles every line starting with #. It pastes in the header files, replaces macros like TIMES with their text, and strips comments. The result is still C.",
    out: (v) =>
      v === "link"
        ? `/* ...hundreds of lines pasted from stdio.h... */\nint printf(const char *format, ...);\n\nint square(int n);\n\nint main(void) {\n    printf("%d\\n", square(7));\n    return 0;\n}`
        : `/* ...hundreds of lines pasted from stdio.h... */\nint printf(const char *format, ...);\n\nint main(void) {\n\n    for (int i = 0; i < 3; i++)\n        printf("hi %d\\n", i);\n    return 0;\n}`,
  },
  {
    id: "compile",
    name: "Compiler",
    makes: "hello.s",
    cmd: "gcc -S hello.i -o hello.s",
    what: "Checks the grammar and the types, then translates the C into assembly for this CPU. Most of the error messages you'll meet come from here.",
    out: (v) =>
      v === "link"
        ? `main:\n    push  rbp\n    mov   rbp, rsp\n    mov   edi, 7\n    call  square      ; just a name for now\n    mov   esi, eax\n    lea   rdi, .LC0   ; "%d\\n"\n    call  printf\n    mov   eax, 0\n    pop   rbp\n    ret`
        : `main:\n    push  rbp\n    mov   rbp, rsp\n    sub   rsp, 16\n    mov   DWORD PTR [rbp-4], 0    ; i = 0\n.L3:\n    cmp   DWORD PTR [rbp-4], 2\n    jg    .L2                    ; i > 2? leave the loop\n    mov   esi, DWORD PTR [rbp-4]\n    lea   rdi, .LC0              ; "hi %d\\n"\n    call  printf\n    add   DWORD PTR [rbp-4], 1   ; i++\n    jmp   .L3\n.L2:\n    mov   eax, 0                 ; return 0\n    leave\n    ret`,
  },
  {
    id: "assemble",
    name: "Assembler",
    makes: "hello.o",
    cmd: "gcc -c hello.s -o hello.o",
    what: "Turns each assembly instruction into its machine-code bytes. The result is an object file: real machine code, but with holes where other code (like printf) will go.",
    out: (v) =>
      `machine code (first bytes of main):\n55 48 89 E5 48 83 EC 10 C7 45 FC 00 00 00 00 ...\n\nsymbols:\n  main      defined here\n  printf    missing: needs a definition from somewhere else${v === "link" ? "\n  square    missing: needs a definition from somewhere else" : ""}`,
  },
  {
    id: "link",
    name: "Linker",
    makes: "hello",
    cmd: "gcc hello.o -o hello",
    what: "Joins your object files with the libraries they use (printf lives in the C standard library) and fills in every hole with a real address. Out comes one executable file.",
    out: () => `hello.o  +  C standard library (libc)\n        ↓\nhello: an executable\n  main    at 0x1139\n  printf  found in libc, address filled in`,
  },
  { id: "run", name: "Run it", makes: "output", cmd: "./hello", what: "The operating system loads the executable into memory and the CPU starts running main.", out: () => `hi 0\nhi 1\nhi 2` },
];

/** source → preprocessor → compiler → assembler → linker → executable, with what each stage makes. */
export function Pipeline({ props, onChange, revealed, status }: WidgetProps<PipelineProps>) {
  const variant = props.variant ?? "ok";
  const mode = props.mode ?? "explore";
  const fails = FAILS[variant];
  const failIdx = fails ? STAGES.findIndex((s) => s.id === fails) : -1;
  const [open, setOpen] = useState<StageId | null>(mode === "explore" ? "source" : null);
  const [seen, setSeen] = useState<StageId[]>(mode === "explore" ? ["source"] : []);
  const locked = Boolean(revealed);
  const showOutcome = mode === "explore" || revealed || status === "correct";

  const tap = (id: StageId) => {
    if (locked && mode === "pick") return;
    const next = mode === "explore" && open === id ? null : id;
    const s = seen.includes(id) ? seen : [...seen, id];
    setOpen(next);
    setSeen(s);
    onChange?.({ stage: mode === "pick" ? id : next, seen: s.length } satisfies PipelineState);
  };

  return (
    <div className="w-full min-w-0">
      {props.label && <p className="mb-3 text-center text-xs font-medium text-ink-3">{props.label}</p>}

      {mode === "pick" && (
        <div className="mb-4 grid gap-3">
          <CPane code={SOURCES[variant]} title="hello.c" />
          <div className={`${CODE_SURFACE} p-3`}>
            <p className="mb-1 flex items-center gap-1.5 font-mono text-[11px] text-white/55">
              <span className="text-[#a3e635]">$</span> gcc hello.c -o hello
            </p>
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[0.78rem] leading-relaxed text-[#fca5a5]">{ERRORS[variant]}</pre>
          </div>
          <Label className="!mb-0 text-center">Which stage stopped the build?</Label>
        </div>
      )}

      <ol className="grid gap-1.5">
        {STAGES.map((s, i) => {
          const isOpen = mode === "explore" && open === s.id;
          const picked = mode === "pick" && open === s.id;
          const failed = showOutcome && i === failIdx;
          const skipped = showOutcome && failIdx >= 0 && i > failIdx;
          const isAnswer = mode === "pick" && status === "revealed" && i === failIdx;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => tap(s.id)}
                disabled={(locked && mode === "pick") || (mode === "explore" && skipped)}
                aria-expanded={mode === "explore" ? isOpen : undefined}
                aria-pressed={mode === "pick" ? picked : undefined}
                className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                  picked ? (status === "wrong" ? "border-[var(--bad)] bg-surface" : "border-[var(--brand)] bg-tint") : isAnswer ? "border-[var(--brand)] bg-tint" : isOpen ? "border-[var(--brand)] bg-surface" : "border-line bg-surface hover:border-[var(--line-strong)]"
                } ${skipped ? "opacity-45" : ""} disabled:cursor-default`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold ${
                    failed ? "bg-[var(--bad)] text-white" : isOpen || picked || isAnswer ? "bg-primary text-primary-ink" : "bg-surface-2 text-ink-2"
                  }`}
                >
                  {failed ? <TriangleAlert className="h-3.5 w-3.5" /> : skipped ? <CircleSlash className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{s.name}</span>
                  <span className="block font-mono text-[0.7rem] text-ink-3">
                    {failed ? "stopped here with an error" : skipped ? "never ran" : i === 0 ? s.makes : `makes ${s.makes}`}
                  </span>
                </span>
                {mode === "explore" && !skipped && <ChevronDown className={`h-4 w-4 shrink-0 text-ink-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />}
                {mode === "pick" && picked && status === "correct" && <Check className="h-4 w-4 text-brand" />}
              </button>
              {isOpen && (
                <div className="mt-1.5 grid gap-2 pl-3 sm:pl-10">
                  <p className="text-sm leading-snug text-ink-2">{s.what}</p>
                  {i > 0 && (
                    <p className="font-mono text-[0.75rem] text-ink-3">
                      <span className="text-brand">$</span> {s.cmd}
                    </p>
                  )}
                  {failed ? (
                    <pre className={`${CODE_SURFACE} overflow-x-auto whitespace-pre-wrap p-3 font-mono text-[0.78rem] leading-relaxed text-[#fca5a5]`}>{ERRORS[variant]}</pre>
                  ) : s.id === "source" || s.id === "preprocess" ? (
                    <CPane code={s.out(variant)} title={s.makes} />
                  ) : (
                    <pre className={`${CODE_SURFACE} overflow-x-auto p-3 font-mono text-[0.75rem] leading-relaxed`}>
                      <span className="mb-1 block text-[11px] text-white/45">{s.makes}{s.id === "compile" ? " (simplified)" : ""}</span>
                      {s.out(variant)}
                    </pre>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {mode === "explore" && (
        <p className="mt-3 text-center text-xs text-ink-3">
          Opened {seen.length} of {failIdx >= 0 ? failIdx + 1 : STAGES.length} stages
        </p>
      )}
    </div>
  );
}

export function checkPipeline(state: unknown, goal: Record<string, unknown>) {
  const s = state as PipelineState | undefined;
  if (!s) return false;
  if (typeof goal.stage === "string" && s.stage !== goal.stage) return false;
  if (typeof goal.seen === "number" && s.seen < goal.seen) return false;
  return true;
}
