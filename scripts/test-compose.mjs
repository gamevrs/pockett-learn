// Unit tests for src/engine/compose.ts (main() composition for C++/Go/Rust, TYPES_DIVIDER for C#).
//   node scripts/test-compose.mjs
process.env.NODE_NO_WARNINGS = "1";
import assert from "node:assert/strict";
import { MAIN_DIVIDER, TYPES_DIVIDER, appendSource, countMainOpeners, isMainShaped } from "../src/engine/compose.ts";

let n = 0;
const check = (name, fn) => {
  fn();
  n++;
  console.log("ok  ", name);
};
const lines = (...l) => l.join("\n") + "\n";
const noPileUp = (s) => assert.ok(!/\n[ \t]*\n[ \t]*\n/.test(s), `3+ consecutive newlines in:\n${s}`);

const CPP = lines("#include <iostream>", "", "int main() {", "    std::cout << \"hi\\n\";", "}");
const GO = lines("package main", "", "import \"fmt\"", "", "func main() {", "\tfmt.Println(\"hi\")", "}");
const RUST = lines("fn main() {", "    println!(\"hi\");", "}");

check("main-shaped detection", () => {
  assert.ok(isMainShaped(CPP));
  assert.ok(isMainShaped(GO));
  assert.ok(isMainShaped(RUST));
  assert.ok(isMainShaped(lines("int main(int argc, char** argv) {", "    return 0;", "}")));
  assert.ok(!isMainShaped("x = 1\nprint(x)\n"));
  assert.ok(!isMainShaped(lines("int main() {", "    return 0;"))); // unclosed
  assert.ok(!isMainShaped(lines("fn main() {", "}", "", "fn later() {}"))); // main is not last
  assert.ok(!isMainShaped(lines("#include <x>", "int main() {")));
  assert.equal(countMainOpeners(CPP), 1);
});

check("C++: body-only add goes at the end of main, indented, one blank line between", () => {
  const out = appendSource(CPP, "// ✏️ YOUR TURN\nint x = 5;\nstd::cout << x;\n");
  assert.equal(out, lines("#include <iostream>", "", "int main() {", "    std::cout << \"hi\\n\";", "", "    // ✏️ YOUR TURN", "    int x = 5;", "    std::cout << x;", "}"));
  noPileUp(out);
});

check("C++: decl-only add lands before main with one blank line around it", () => {
  const out = appendSource(CPP, lines("int square(int v) {", "    return v * v;", "}", "", MAIN_DIVIDER));
  assert.equal(out, lines("#include <iostream>", "", "int square(int v) {", "    return v * v;", "}", "", "int main() {", "    std::cout << \"hi\\n\";", "}"));
  assert.ok(!out.includes(MAIN_DIVIDER));
});

check("Go: decl + body add", () => {
  const out = appendSource(GO, lines("type Dog struct{ Name string }", "", MAIN_DIVIDER, "d := Dog{\"Rex\"}", "fmt.Println(d.Name)"));
  assert.equal(out, lines("package main", "", "import \"fmt\"", "", "type Dog struct{ Name string }", "", "func main() {", "\tfmt.Println(\"hi\")", "", "\td := Dog{\"Rex\"}", "\tfmt.Println(d.Name)", "}"));
  assert.ok(isMainShaped(out));
  noPileUp(out);
});

check("Rust: already-indented body is left alone; several lessons stack up", () => {
  let out = appendSource(RUST, lines("    let a = 1;", "    println!(\"{a}\");"));
  out = appendSource(out, lines("struct P { x: i32 }", MAIN_DIVIDER, "let p = P { x: 2 };"));
  out = appendSource(out, lines(MAIN_DIVIDER, "println!(\"{}\", p.x);"));
  assert.equal(out, lines("struct P { x: i32 }", "", "fn main() {", "    println!(\"hi\");", "", "    let a = 1;", "    println!(\"{a}\");", "", "    let p = P { x: 2 };", "", "    println!(\"{}\", p.x);", "}"));
  noPileUp(out);
});

check("nested braces in the body do not confuse the scanner", () => {
  const base = lines("fn main() {", "    for i in 0..3 {", "        if i == 1 {", "            println!(\"one\");", "        }", "    }", "}");
  assert.ok(isMainShaped(base));
  const out = appendSource(base, "let done = true;\n");
  assert.equal(out, lines("fn main() {", "    for i in 0..3 {", "        if i == 1 {", "            println!(\"one\");", "        }", "    }", "", "    let done = true;", "}"));
});

check("braces in strings, chars, comments and raw strings are ignored", () => {
  const base = lines(
    "fn main() {",
    "    println!(\"closing } and opening {\");",
    "    let c = '}';",
    "    let esc = \"quote \\\" }\";",
    "    // a stray } in a comment",
    "    /* and { another */",
    "    let raw = r#\"} {\"#;",
    "}",
  );
  assert.ok(isMainShaped(base));
  const out = appendSource(base, "let z = 1;\n");
  assert.ok(out.endsWith("    let z = 1;\n}\n"));
  const cpp = lines("int main() {", "    const char* s = \"}\";", "    char q = '\\'';", "    auto r = R\"x(} {)x\";", "}");
  assert.ok(isMainShaped(cpp));
  const go = lines("func main() {", "\ts := `}`", "\t_ = s", "}");
  assert.ok(isMainShaped(go));
  const life = lines("fn main() {", "    let r: &'static str = \"}\";", "}");
  assert.ok(isMainShaped(life));
});

check("a string with } in the ADDED text stays in main", () => {
  const out = appendSource(CPP, "std::cout << \"}\";\n");
  assert.ok(out.endsWith("    std::cout << \"}\";\n}\n"));
});

check("empty main gets no leading blank line", () => {
  assert.equal(appendSource(lines("fn main() {", "}"), "let a = 1;\n"), lines("fn main() {", "    let a = 1;", "}"));
});

check("divider with nothing below only adds declarations; nothing is lost on repeat", () => {
  const out = appendSource(appendSource(RUST, lines("fn a() {}", MAIN_DIVIDER)), lines("fn b() {}", "", MAIN_DIVIDER, ""));
  assert.equal(out, lines("fn a() {}", "", "fn b() {}", "", "fn main() {", "    println!(\"hi\");", "}"));
});

check("not main-shaped: behaves like plain append (Python)", () => {
  assert.equal(appendSource("x = 1\n", "y = 2\n"), "x = 1\n\ny = 2\n");
});

check("not main-shaped: learner deleted main, add is appended after", () => {
  const out = appendSource("fn helper() {}\n", "let a = 1;\n");
  assert.equal(out, "fn helper() {}\n\nlet a = 1;\n");
});

check("C# TYPES_DIVIDER composition is unchanged", () => {
  const base = lines("Console.WriteLine(1);", "", TYPES_DIVIDER, "", "class A {}");
  assert.equal(appendSource(base, lines("Console.WriteLine(2);", "", TYPES_DIVIDER, "", "class B {}")), lines("Console.WriteLine(1);", "", "Console.WriteLine(2);", "", TYPES_DIVIDER, "", "class A {}", "", "class B {}"));
  assert.equal(appendSource("a\n", "b\n"), "a\n\nb\n");
  assert.equal(appendSource("a\n", lines("b", TYPES_DIVIDER, "class C {}")), lines("a", "", "b", "", TYPES_DIVIDER, "", "class C {}"));
});

console.log(`\n${n} compose checks passed`);
