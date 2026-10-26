import type { RunResponse, RunnerLanguage } from "./config.ts";

/**
 * Known programs with known outcomes. Used three ways: to warm the toolchain caches while the snapshot
 * is built, to self-test a fresh snapshot, and by scripts/runner/smoke.mjs against a deployment.
 * Expected line numbers are the learner-visible ones (files are never wrapped).
 */

export interface Sample {
  id: "hello" | "compile-error" | "infinite-loop" | "runtime-error" | "stdin";
  language: RunnerLanguage;
  source: string;
  stdin?: string;
  expect: {
    stdoutIncludes?: string;
    compileError?: boolean;
    /** Line the compiler / stack trace must point at. */
    line?: number;
    timedOut?: boolean;
    nonZeroExit?: boolean;
    stderrIncludes?: string;
  };
}

const HELLO = "Hello, pockett!";

export const SAMPLES: Sample[] = [
  // ---- C# ----
  { id: "hello", language: "csharp", source: `Console.WriteLine("${HELLO}");\n`, expect: { stdoutIncludes: HELLO } },
  {
    id: "hello",
    language: "csharp",
    source: `using System;\nusing System.Linq;\n\nclass Program\n{\n    static void Main()\n    {\n        Console.WriteLine("${HELLO} " + new[] { 1, 2, 3 }.Sum());\n    }\n}\n`,
    expect: { stdoutIncludes: `${HELLO} 6` },
  },
  {
    id: "stdin",
    language: "csharp",
    source: `var name = Console.ReadLine();\nConsole.WriteLine("Hi " + name);\n`,
    stdin: "Ada\n",
    expect: { stdoutIncludes: "Hi Ada" },
  },
  { id: "compile-error", language: "csharp", source: `using System;\n\nint x = "not a number";\nConsole.WriteLine(x);\n`, expect: { compileError: true, line: 3 } },
  { id: "infinite-loop", language: "csharp", source: `while (true) { }\n`, expect: { timedOut: true } },
  {
    id: "runtime-error",
    language: "csharp",
    source: `int zero = 0;\nConsole.WriteLine("before");\nConsole.WriteLine(10 / zero);\n`,
    expect: { nonZeroExit: true, stdoutIncludes: "before", stderrIncludes: "DivideByZeroException", line: 3 },
  },

  // ---- C++ ----
  { id: "hello", language: "cpp", source: `#include <iostream>\nint main() {\n    std::cout << "${HELLO}" << std::endl;\n    return 0;\n}\n`, expect: { stdoutIncludes: HELLO } },
  {
    id: "stdin",
    language: "cpp",
    source: `#include <iostream>\n#include <string>\nint main() {\n    std::string name;\n    std::getline(std::cin, name);\n    std::cout << "Hi " << name << std::endl;\n}\n`,
    stdin: "Ada\n",
    expect: { stdoutIncludes: "Hi Ada" },
  },
  {
    id: "compile-error",
    language: "cpp",
    source: `#include <iostream>\nint main() {\n    int x = 5;\n    std::cout << y << std::endl;\n}\n`,
    expect: { compileError: true, line: 4 },
  },
  { id: "infinite-loop", language: "cpp", source: `int main() {\n    volatile int i = 0;\n    while (true) { i = i + 1; }\n}\n`, expect: { timedOut: true } },
  {
    id: "runtime-error",
    language: "cpp",
    source: `#include <iostream>\n#include <stdexcept>\nint main() {\n    std::cout << "before" << std::endl;\n    throw std::runtime_error("boom");\n}\n`,
    expect: { nonZeroExit: true, stdoutIncludes: "before", stderrIncludes: "boom" },
  },

  // ---- Go ----
  { id: "hello", language: "go", source: `package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("${HELLO}")\n}\n`, expect: { stdoutIncludes: HELLO } },
  {
    id: "stdin",
    language: "go",
    source: `package main\n\nimport (\n\t"bufio"\n\t"fmt"\n\t"os"\n)\n\nfunc main() {\n\tr := bufio.NewReader(os.Stdin)\n\tname, _ := r.ReadString('\\n')\n\tfmt.Print("Hi ", name)\n}\n`,
    stdin: "Ada\n",
    expect: { stdoutIncludes: "Hi Ada" },
  },
  {
    id: "compile-error",
    language: "go",
    source: `package main\n\nimport "fmt"\n\nfunc main() {\n\tx := 5\n\tfmt.Println("hi")\n}\n`,
    expect: { compileError: true, line: 6 },
  },
  { id: "infinite-loop", language: "go", source: `package main\n\nfunc main() {\n\tfor {\n\t}\n}\n`, expect: { timedOut: true } },
  {
    id: "runtime-error",
    language: "go",
    source: `package main\n\nimport "fmt"\n\nfunc main() {\n\ta := []int{1, 2, 3}\n\ti := 5\n\tfmt.Println("before")\n\tfmt.Println(a[i])\n}\n`,
    expect: { nonZeroExit: true, stdoutIncludes: "before", stderrIncludes: "index out of range", line: 9 },
  },

  // ---- Rust ----
  { id: "hello", language: "rust", source: `fn main() {\n    println!("${HELLO}");\n}\n`, expect: { stdoutIncludes: HELLO } },
  {
    id: "stdin",
    language: "rust",
    source: `use std::io;\n\nfn main() {\n    let mut name = String::new();\n    io::stdin().read_line(&mut name).unwrap();\n    println!("Hi {}", name.trim());\n}\n`,
    stdin: "Ada\n",
    expect: { stdoutIncludes: "Hi Ada" },
  },
  {
    id: "compile-error",
    language: "rust",
    source: `fn main() {\n    let x: i32 = "five";\n    println!("{x}");\n}\n`,
    expect: { compileError: true, line: 2 },
  },
  { id: "infinite-loop", language: "rust", source: `fn main() {\n    loop {}\n}\n`, expect: { timedOut: true } },
  {
    id: "runtime-error",
    language: "rust",
    source: `fn main() {\n    let v = vec![1, 2, 3];\n    let i = 5;\n    println!("before");\n    println!("{}", v[i]);\n}\n`,
    expect: { nonZeroExit: true, stdoutIncludes: "before", stderrIncludes: "index out of bounds", line: 5 },
  },
];

/** Bigger programs whose only job is to pull toolchain caches (std packages, headers, assemblies) into the snapshot. */
export const WARMUP: Record<RunnerLanguage, string> = {
  csharp: `using System.Text;\nusing System.Text.Json;\nusing System.Text.RegularExpressions;\nusing System.Collections.Concurrent;\n\nvar sb = new StringBuilder();\nvar words = new ConcurrentDictionary<string, int>();\nforeach (var w in "the quick brown fox".Split(' ')) words[w] = w.Length;\nsb.Append(JsonSerializer.Serialize(words.OrderBy(kv => kv.Key).ToDictionary(kv => kv.Key, kv => kv.Value)));\nConsole.WriteLine(Regex.Replace(sb.ToString(), "[0-9]+", "#"));\nawait Task.Delay(1);\n`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    vector<int> v{3, 1, 2};\n    sort(v.begin(), v.end());\n    map<string, int> m{{"a", 1}};\n    cout << v[0] << m["a"] << endl;\n}\n`,
  go: `package main\n\nimport (\n\t"bufio"\n\t"bytes"\n\t"container/heap"\n\t"container/list"\n\t"context"\n\t"encoding/json"\n\t"errors"\n\t"fmt"\n\t"io"\n\t"math"\n\t"math/rand"\n\t"os"\n\t"regexp"\n\t"sort"\n\t"strconv"\n\t"strings"\n\t"sync"\n\t"sync/atomic"\n\t"time"\n\t"unicode"\n)\n\nvar _ = heap.Init\nvar _ = list.New\nvar _ = context.Background\nvar _ = errors.New\nvar _ = io.EOF\nvar _ = rand.Intn\nvar _ = regexp.MustCompile\nvar _ = time.Now\nvar _ = unicode.IsLetter\nvar _ atomic.Int64\nvar _ sync.Mutex\n\nfunc main() {\n\tw := bufio.NewWriter(os.Stdout)\n\tdefer w.Flush()\n\tb, _ := json.Marshal(map[string]int{"n": int(math.Sqrt(16))})\n\tvar buf bytes.Buffer\n\tbuf.Write(b)\n\ts := []string{"b", "a"}\n\tsort.Strings(s)\n\tfmt.Fprintln(w, strings.ToUpper(buf.String()), strconv.Itoa(len(s)))\n}\n`,
  rust: `use std::cell::RefCell;\nuse std::collections::{BTreeMap, HashMap, HashSet, VecDeque};\nuse std::fmt;\nuse std::io::{self, BufRead, Read, Write};\nuse std::rc::Rc;\n\nstruct P(i32);\nimpl fmt::Display for P {\n    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {\n        write!(f, "P({})", self.0)\n    }\n}\n\nfn main() {\n    let mut m: HashMap<String, i32> = HashMap::new();\n    m.insert("a".to_string(), 1);\n    let b: BTreeMap<i32, i32> = (0..3).map(|i| (i, i * i)).collect();\n    let s: HashSet<i32> = b.values().cloned().collect();\n    let mut q: VecDeque<i32> = VecDeque::new();\n    q.push_back(1);\n    let shared = Rc::new(RefCell::new(P(2)));\n    let mut line = String::new();\n    let _ = io::stdin().lock().read_line(&mut line);\n    let mut rest = String::new();\n    let _ = io::stdin().read_to_string(&mut rest);\n    let out = io::stdout();\n    writeln!(out.lock(), "{} {} {} {}", m["a"], s.len(), q.len(), shared.borrow()).unwrap();\n}\n`,
};

/** Returns a list of problems (empty when the response matches what the sample expects). */
export function checkSample(sample: Sample, res: Pick<RunResponse, "stdout" | "stderr" | "exitCode" | "compileError"> & { timedOut?: boolean }): string[] {
  const problems: string[] = [];
  const e = sample.expect;
  const lineOf = (text: string) => {
    const m = /:(\d+):\d+:/.exec(text) ?? /-->\s+\S+?:(\d+):\d+/.exec(text) ?? /\((\d+),\d+\)/.exec(text) ?? /:line (\d+)/.exec(text) ?? /\.go:(\d+)\b/.exec(text);
    return m ? Number(m[1]) : null;
  };
  if (e.compileError) {
    if (!res.compileError) problems.push("expected a compile error, got none");
    else if (e.line !== undefined && lineOf(res.compileError) !== e.line) problems.push(`compile error should point at line ${e.line}, got: ${res.compileError.split("\n")[0]}`);
  } else if (res.compileError) {
    problems.push(`unexpected compile error: ${res.compileError.split("\n")[0]}`);
  }
  if (e.timedOut) {
    if (!res.timedOut && res.exitCode !== 137) problems.push("expected the program to be stopped for running too long");
  } else if (!e.compileError) {
    if (e.nonZeroExit) {
      if (!res.exitCode) problems.push("expected a non-zero exit code");
      if (e.line !== undefined && lineOf(res.stderr) !== e.line) problems.push(`stack trace should point at line ${e.line}, got: ${res.stderr.split("\n").slice(0, 3).join(" | ")}`);
    } else if (res.exitCode !== 0) {
      problems.push(`expected exit code 0, got ${res.exitCode}: ${res.stderr.split("\n")[0]}`);
    }
  }
  if (e.stdoutIncludes && !res.stdout.includes(e.stdoutIncludes)) problems.push(`stdout should include "${e.stdoutIncludes}", got "${res.stdout.slice(0, 80)}"`);
  if (e.stderrIncludes && !res.stderr.includes(e.stderrIncludes)) problems.push(`stderr should include "${e.stderrIncludes}", got "${res.stderr.slice(0, 120)}"`);
  return problems;
}
