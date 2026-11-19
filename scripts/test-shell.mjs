// Checks the simulated shell behind the unix-terminal widget (src/learn/widgets/unix/shell.ts and text-tools.ts)
// against what bash + GNU coreutils/sed/gawk print for the classic one-liners Shell lessons teach.
//   node scripts/test-shell.mjs
// Plain TypeScript loaded through Node's type stripping plus the repo's resolve hook (scripts/ts-alias-hooks.mjs).
process.env.NODE_NO_WARNINGS = "1";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.join(HERE, "ts-alias-hooks.mjs")).href);
const unix = (f) => import(pathToFileURL(path.join(HERE, "..", "src", "learn", "widgets", "unix", f)).href);
const { createShell, run, shellState, BASE_TIME } = await unix("shell.ts");
const { checkTerminal } = await unix("goals.ts");

let passed = 0;
const failures = [];

const WORDS = "the day is sunny the the\nthe sunny is is\n";
const PHONES = "987-123-4567\n123 456 7890\n(123) 456-7890\n";
const TWELVE = Array.from({ length: 12 }, (_, i) => `Line ${i + 1}`).join("\n") + "\n";
const TABLE = "name age\nalice 21\nryan 30\n";
const CSV = "id,name,score\n1,ada,90\n2,linus,75\n3,grace,90\n4,alan,60\n";
const FRUIT = "apple\nbanana\napple\ncherry\nbanana\napple\n";

const FILES = {
  "~/words.txt": WORDS,
  "~/file.txt": PHONES,
  "~/twelve.txt": TWELVE,
  "~/five.txt": "1\n2\n3\n4\n5\n",
  "~/table.txt": TABLE,
  "~/scores.csv": CSV,
  "~/fruit.txt": FRUIT,
  "~/nums.txt": "10\n9\n100\n-3\n",
  "~/text.txt": "Hello, World! Hello again.\nfoo bar foo\n",
};

/** Run command lines one after another in a fresh shell; returns the last line's output (stdout + stderr) and the shell. */
function shell(lines, files = FILES) {
  let sh = createShell({ files });
  let output = "";
  for (const line of [].concat(lines)) {
    const r = run(sh, line, BASE_TIME);
    sh = r.shell;
    output = r.out.map((s) => s.text).join("");
  }
  return { sh, output: output.replace(/\n$/, "") };
}

function t(name, lines, expected, { files, code } = {}) {
  let got;
  try {
    const r = shell(lines, files);
    got = r.output;
    if (code !== undefined && r.sh.lastCode !== code) {
      failures.push(`${name}\n    exit status ${r.sh.lastCode}, expected ${code}\n    output: ${JSON.stringify(got)}`);
      return;
    }
  } catch (e) {
    failures.push(`${name}\n    threw ${e.stack}`);
    return;
  }
  const want = expected instanceof RegExp ? expected : String(expected);
  const ok = want instanceof RegExp ? want.test(got) : got === want;
  if (ok) passed++;
  else failures.push(`${name}\n    command:  ${[].concat(lines).join(" ⏎ ")}\n    expected: ${JSON.stringify(String(want))}\n    got:      ${JSON.stringify(got)}`);
}

// ── LeetCode shell problems ──
t("word frequency (192)", "cat words.txt | tr -s ' ' '\\n' | sort | uniq -c | sort -rn | awk '{print $2, $1}'", "the 4\nis 3\nsunny 2\nday 1");
t("word frequency with sort -r", "cat words.txt | tr -s ' ' '\\n' | sort | uniq -c | sort -r | awk '{ print $2, $1 }'", "the 4\nis 3\nsunny 2\nday 1");
t("word frequency, awk arrays", "awk '{ for (i = 1; i <= NF; i++) n[$i]++ } END { for (w in n) print w, n[w] }' words.txt | sort -k2,2nr", "the 4\nis 3\nsunny 2\nday 1");
t("valid phone numbers, grep -E (193)", "grep -E '^(\\([0-9]{3}\\) |[0-9]{3}-)[0-9]{3}-[0-9]{4}$' file.txt", "987-123-4567\n(123) 456-7890");
t("valid phone numbers, basic grep", "grep '^\\(([0-9]\\{3\\}) \\|[0-9]\\{3\\}-\\)[0-9]\\{3\\}-[0-9]\\{4\\}$' file.txt", "987-123-4567\n(123) 456-7890");
t("valid phone numbers, sed -n -E", "sed -n -E '/^([0-9]{3}-|\\([0-9]{3}\\) )[0-9]{3}-[0-9]{4}$/p' file.txt", "987-123-4567\n(123) 456-7890");
t("valid phone numbers, awk", "awk '/^([0-9]{3}-|\\([0-9]{3}\\) )[0-9]{3}-[0-9]{4}$/' file.txt", "987-123-4567\n(123) 456-7890");
t("transpose (194), awk arrays", "awk '{ for (i = 1; i <= NF; i++) { if (NR == 1) s[i] = $i; else s[i] = s[i] \" \" $i } } END { for (i = 1; s[i] != \"\"; i++) print s[i] }' table.txt", "name alice ryan\nage 21 30");
t("transpose, ternary and NF in END", "awk '{ for (i = 1; i <= NF; i++) a[i] = (NR == 1 ? $i : a[i] \" \" $i) } END { for (i = 1; i <= NF; i++) print a[i] }' table.txt", "name alice ryan\nage 21 30");
t(
  "transpose, multi-line program",
  "awk '\n{\n    for (i = 1; i <= NF; i++) {\n        if (NR == 1) {\n            s[i] = $i;\n        } else {\n            s[i] = s[i] \" \" $i;\n        }\n    }\n}\nEND {\n    for (i = 1; s[i] != \"\"; i++) {\n        print s[i];\n    }\n}' table.txt",
  "name alice ryan\nage 21 30",
);
t("if / else on separate lines", "awk '{\n  if ($1 > 5)\n    print \"big\", $1\n  else\n    print \"small\", $1\n}' nums.txt", "big 10\nbig 9\nbig 100\nsmall -3");
t("transpose, cut + paste", ["cut -d' ' -f1 table.txt | paste -sd' '"], "name alice ryan");
t("tenth line (195), sed", "sed -n '10p' twelve.txt", "Line 10");
t("tenth line, awk", "awk 'NR==10' twelve.txt", "Line 10");
t("tenth line, tail + head", "tail -n +10 twelve.txt | head -n 1", "Line 10");
t("tenth line, short file prints nothing", "sed -n '10p' five.txt", "");
t("tenth line, awk with exit", "awk 'NR == 10 { print; exit }' twelve.txt", "Line 10");

// ── awk ──
t("awk sum a column", "awk -F, 'NR > 1 { s += $3 } END { print s }' scores.csv", "315");
t("awk average with printf", "awk -F, 'NR > 1 { s += $3; n++ } END { printf \"%.2f\\n\", s / n }' scores.csv", "78.75");
t("awk NF", "awk '{ print NF }' words.txt", "6\n4");
t("awk printf widths", "awk 'BEGIN { printf \"%5.2f|%-4s|%03d|%x|%c|%e\\n\", 3.14159, \"ab\", 7, 255, 65, 1234.5 }'", " 3.14|ab  |007|ff|A|1.234500e+03");
t("awk %g and OFMT", "awk 'BEGIN { print 1/3, 0.1 + 0.2, 1e6, 1234567.5, 100/4 }'", "0.333333 0.3 1000000 1.23457e+06 25");
t("awk numeric fields compare as numbers", "awk '$1 > 9' nums.txt", "10\n100");
t("awk string vs number", "awk '$1 >= \"9\"' nums.txt", "9");
t("awk dedupe !seen[$0]++", "awk '!seen[$0]++' fruit.txt", "apple\nbanana\ncherry");
t("awk count by key", "awk '{ c[$1]++ } END { for (k in c) print k, c[k] }' fruit.txt | sort", "apple 3\nbanana 2\ncherry 1");
t("awk assign a field rebuilds $0", "echo 'a b c' | awk '{ $2 = \"\"; print }'", "a  c");
t("awk OFS", "echo 'a b c' | awk 'BEGIN { OFS = \"-\" } { $1 = $1; print }'", "a-b-c");
t("awk NF assignment", "echo 'a b c d' | awk '{ NF = 2; print }'", "a b");
t("awk $NF and $(NF-1)", "echo 'a b c d' | awk '{ print $NF, $(NF-1) }'", "d c");
t("awk substr toupper", "echo 'hello world' | awk '{ print toupper(substr($1, 1, 1)) substr($1, 2), length($2) }'", "Hello 5");
t("awk split", "awk 'BEGIN { n = split(\"a:b:c\", parts, \":\"); print n, parts[3] }'", "3 c");
t("awk gsub and &", "echo 'foo boo' | awk '{ n = gsub(/o+/, \"[&]\"); print n, $0 }'", "2 f[oo] b[oo]");
t("awk sub on a field", "echo 'a-b-c x' | awk '{ sub(/-/, \"+\", $1); print }'", "a+b-c x");
t("awk match RSTART RLENGTH", "echo 'abc123def' | awk '{ if (match($0, /[0-9]+/)) print RSTART, RLENGTH, substr($0, RSTART, RLENGTH) }'", "4 3 123");
t("awk index", "awk 'BEGIN { print index(\"banana\", \"nan\") }'", "3");
t("awk recursive function", "awk 'function fact(n) { return n <= 1 ? 1 : n * fact(n - 1) } BEGIN { print fact(10) }'", "3628800");
t("awk function with local array", "awk 'function sum(arr, n,   i, s) { for (i = 1; i <= n; i++) s += arr[i]; return s } BEGIN { a[1] = 2; a[2] = 3; print sum(a, 2) }'", "5");
t("awk while, do, break, continue", "awk 'BEGIN { i = 0; while (1) { i++; if (i % 2) continue; if (i > 6) break; printf \"%d \", i }; do { j++ } while (j < 3); print j }'", "2 4 6 3");
t("awk for(;;) with C-style loop", "awk 'BEGIN { for (i = 3; i > 0; i--) s = s i; print s }'", "321");
t("awk multi-dimensional arrays", "awk '{ for (i = 1; i <= NF; i++) m[NR, i] = $i } END { print m[2, 1], m[3, 2]; print ((3, 2) in m) ? \"yes\" : \"no\" }' table.txt", "alice 30\nyes");
t("awk delete and length(arr)", "awk 'BEGIN { a[1]; a[2]; a[3]; delete a[2]; print length(a); delete a; print length(a) }'", "2\n0");
t("awk -v and string concat", "awk -v name=Ada 'BEGIN { print \"Hi, \" name \"!\" }'", "Hi, Ada!");
t("awk range pattern", "awk '/Line 3$/,/Line 5$/' twelve.txt", "Line 3\nLine 4\nLine 5");
t("awk NR==FNR join", "awk 'NR == FNR { keep[$1]; next } $1 in keep' five.txt nums.txt", "");
t("awk regex match operator", "awk -F, '$2 ~ /^a/ { print $2 }' scores.csv", "ada\nalan");
t("awk !~ and &&", "awk -F, 'NR > 1 && $2 !~ /a/ { print $2 }' scores.csv", "linus");
t("awk printf without newline and ORS", "printf '1\\n2\\n3\\n' | awk 'BEGIN { ORS = \",\" } { print $1 * 2 }'", "2,4,6,");
t("awk tab separator", "printf 'a\\tb c\\td\\n' | awk -F'\\t' '{ print $2 }'", "b c");
t("awk regex separator", "echo 'a1b22c' | awk -F'[0-9]+' '{ print $1 $2 $3 }'", "abc");
t("awk uninitialised is 0 and empty", "awk 'BEGIN { print x + 1, \"[\" x \"]\" }'", "1 []");
t("awk exponent and modulo", "awk 'BEGIN { print 2^10, 2**3, -2^2, 7 % 3, int(-3.7) }'", "1024 8 -4 1 -3");
t("awk increment field", "echo '5 6' | awk '{ $1++; ++$2; print }'", "6 7");
t("awk printf with parens", "echo 'x' | awk '{ printf(\"%s-%s\\n\", $1, NR) }'", "x-1");
t("awk getline is reported", "awk 'BEGIN { getline line }'", /getline is not available/);
t("awk syntax error", "awk '{ print $1 '", /awk: line 1: syntax error/, { code: 2 });
t("awk division by zero", "awk 'BEGIN { print 1/0 }'", /division by zero/, { code: 2 });
t("awk reads standard input with no files", "cat five.txt | awk '{ s += $1 } END { print s }'", "15");
t("awk BEGIN only does not wait for input", "awk 'BEGIN { print \"hi\" }'", "hi");
t("awk exit code", ["awk 'BEGIN { exit 3 }'", "echo $?"], "3");

// ── sed ──
t("sed substitute global", "echo 'cat cat cat' | sed 's/cat/dog/g'", "dog dog dog");
t("sed substitute first only", "echo 'cat cat cat' | sed 's/cat/dog/'", "dog cat cat");
t("sed nth occurrence", "echo 'cat cat cat' | sed 's/cat/dog/2'", "cat dog cat");
t("sed line range", "sed -n '2,4p' five.txt", "2\n3\n4");
t("sed last line", "sed -n '$p' five.txt", "5");
t("sed delete first line", "sed '1d' five.txt", "2\n3\n4\n5");
t("sed delete range", "sed '2,4d' five.txt", "1\n5");
t("sed regex address", "sed -n '/^b/p' fruit.txt", "banana\nbanana");
t("sed negated address", "sed '/apple/!d' fruit.txt", "apple\napple\napple");
t("sed groups with -E", "echo 'hello world' | sed -E 's/([a-z]+) ([a-z]+)/\\2 \\1/'", "world hello");
t("sed groups in a basic regex", "echo 'hello world' | sed 's/\\([a-z]*\\) \\([a-z]*\\)/\\2 \\1/'", "world hello");
t("sed & and \\+", "echo 'a1 b22 c333' | sed 's/[0-9]\\+/<&>/g'", "a<1> b<22> c<333>");
t("sed multiple -e", "echo 'abc' | sed -e 's/a/A/' -e 's/b/B/'", "ABc");
t("sed ; separated", "echo 'abc' | sed 's/a/A/;s/c/C/'", "AbC");
t("sed quit", "sed '2q' five.txt", "1\n2");
t("sed = line numbers", "sed -n '$=' twelve.txt", "12");
t("sed tac with hold space", "sed -n '1!G;h;$p' five.txt", "5\n4\n3\n2\n1");
t("sed custom delimiter", "echo '/usr/local/bin' | sed 's|/usr/local|/opt|'", "/opt/bin");
t("sed case-insensitive flag", "echo 'Hello HELLO' | sed 's/hello/hi/gI'", "hi hi");
t("sed y command", "echo 'hello' | sed 'y/abcdefghij/ABCDEFGHIJ/'", "HEllo");
t("sed append and insert", "printf 'a\\nb\\n' | sed -e '1i start' -e '$a end'", "start\na\nb\nend");
t("sed with POSIX class", "echo 'ab12cd' | sed 's/[[:digit:]]//g'", "abcd");
t("sed step address", "sed -n '1~2p' five.txt", "1\n3\n5");
t("sed in place", ["sed -i 's/apple/pear/g' fruit.txt", "grep -c pear fruit.txt"], "3");
t("sed print with s///p and -n", "printf 'ab\\ncd\\n' | sed -n 's/c/C/p'", "Cd");
t("sed upper-case with \\U", "echo 'make me loud' | sed -E 's/(loud)/\\U\\1/'", "make me LOUD");
t("sed unterminated s", "sed 's/a/b' five.txt", /unterminated `s' command/, { code: 1 });
t("sed unknown command", "sed 'k' five.txt", /unknown command: `k'/, { code: 1 });

// ── tr ──
t("tr upper-case", "echo hello | tr a-z A-Z", "HELLO");
t("tr classes", "echo 'Hello World' | tr '[:lower:]' '[:upper:]'", "HELLO WORLD");
t("tr delete digits", "echo 'a1b2c3' | tr -d '0-9'", "abc");
t("tr squeeze", "echo 'aaabbbccc  d' | tr -s 'a-c '", "abc d");
t("tr complement squeeze into words", "echo 'Hello, World! Hi.' | tr -cs 'A-Za-z' '\\n'", "Hello\nWorld\nHi");
t("tr newline to space", "printf '1\\n2\\n3\\n' | tr '\\n' ' '", "1 2 3 ");
t("tr short set2 repeats its last character", "echo 'abcd' | tr 'abcd' 'xy'", "xyyy");
t("tr missing operand", "echo a | tr a", /tr: missing operand after 'a'/, { code: 1 });

// ── cut, paste, sort, uniq, head, tail, wc ──
t("cut a field", "cut -d, -f2 scores.csv", "name\nada\nlinus\ngrace\nalan");
t("cut field list", "cut -d, -f1,3 scores.csv | head -n 2", "id,score\n1,90");
t("cut field range to end", "echo 'a:b:c:d' | cut -d: -f2-", "b:c:d");
t("cut characters", "echo 'abcdef' | cut -c1-3", "abc");
t("cut needs a list", "cut five.txt", /you must specify a list/, { code: 1 });
t("paste side by side", "paste five.txt five.txt | head -n 2", "1\t1\n2\t2");
t("paste serial with +", "seq 5 | paste -sd+", "1+2+3+4+5");
t("sort -t -k -n", "tail -n +2 scores.csv | sort -t, -k3 -n | head -n 1", "4,alan,60");
t("sort -k2,2nr then name", "tail -n +2 scores.csv | sort -t, -k3,3nr -k2,2 | cut -d, -f2", "ada\ngrace\nlinus\nalan");
t("sort -n with negatives", "sort -n nums.txt", "-3\n9\n10\n100");
t("sort -rn", "sort -rn nums.txt", "100\n10\n9\n-3");
t("sort -u", "sort -u fruit.txt", "apple\nbanana\ncherry");
// en_US collation (what a Linux box ships with) skips the "-" when comparing, as GNU sort does there
t("sort plain strings", "sort nums.txt", "10\n100\n-3\n9");
t("uniq -c", "sort fruit.txt | uniq -c", "      3 apple\n      2 banana\n      1 cherry");
t("uniq -d", "sort fruit.txt | uniq -d", "apple\nbanana");
t("uniq -u", "sort fruit.txt | uniq -u", "cherry");
t("head -n", "head -n 2 five.txt", "1\n2");
t("head -3", "head -3 twelve.txt | tail -n 1", "Line 3");
t("tail -n", "tail -n 2 five.txt", "4\n5");
t("tail -n +K", "tail -n +4 five.txt", "4\n5");
t("wc -l with < redirection", "wc -l < twelve.txt", "12");
t("wc -w", "wc -w < words.txt", "10");
t("wc -c", "echo -n 'abc' | wc -c", "3");

// ── grep ──
t("grep -c", "grep -c apple fruit.txt", "3");
t("grep -o -E", "echo 'a1 b22 c333' | grep -o -E '[0-9]+'", "1\n22\n333");
t("grep -w", "printf 'foo\\nfoobar\\nbar foo\\n' | grep -w foo", "foo\nbar foo");
t("grep -v -n", "grep -vn apple fruit.txt", "2:banana\n4:cherry\n5:banana");
t("grep -i", "grep -i hello text.txt", "Hello, World! Hello again.");
t("grep POSIX class", "printf '12\\nab\\n3\\n' | grep -E '^[[:digit:]]+$'", "12\n3");
t("grep no match exits 1", ["grep zebra fruit.txt", "echo $?"], "1");

// ── seq, rev, tac, printf, xargs ──
t("seq 3", "seq 3", "1\n2\n3");
t("seq first step last", "seq 2 3 11", "2\n5\n8\n11");
t("seq -w", "seq -w 8 10", "08\n09\n10");
t("seq -s", "seq -s, 4", "1,2,3,4");
t("seq counting down", "seq 3 -1 1", "3\n2\n1");
t("rev", "echo 'abc' | rev", "cba");
t("tac", "tac five.txt | head -n 2", "5\n4");
t("printf reuses its format", "printf '%s-%s\\n' a b c d", "a-b\nc-d");
t("printf numbers", "printf '%05.1f %d%%\\n' 3.14159 42", "003.1 42%");
t("xargs default echo", "printf 'a\\nb\\n' | xargs", "a b");
t("xargs -n 1", "echo 1 2 3 | xargs -n 1 echo n", "n 1\nn 2\nn 3");
t("xargs -I", "printf 'x\\ny\\n' | xargs -I{} echo file:{}", "file:x\nfile:y");
t("xargs runs a command on files", "echo five.txt nums.txt | xargs wc -l", " 5 five.txt\n 4 nums.txt\n 9 total");
t("xargs quoting", "echo \"'a b' c\" | xargs -n 1", "a b\nc");

// ── existing behaviour still holds ──
t("echo, redirect and cat", ["echo hi > a.txt", "cat a.txt"], "hi");
t("append and wc", ["echo one > b.txt", "echo two >> b.txt", "wc -l b.txt"], "2 b.txt");
t("pipes and &&", "grep -q apple fruit.txt && echo found || echo missing", "found");
t("ls", ["mkdir demo", "touch demo/x demo/y", "ls demo"], "x  y");
t("cd and pwd", ["mkdir -p a/b", "cd a/b", "pwd"], "/home/ada/a/b");
t("command not found", "frobnicate", "bash: frobnicate: command not found", { code: 127 });
t("tools exist in /usr/bin", "which awk sed tr cut xargs paste rev seq", "/usr/bin/awk\n/usr/bin/sed\n/usr/bin/tr\n/usr/bin/cut\n/usr/bin/xargs\n/usr/bin/paste\n/usr/bin/rev\n/usr/bin/seq");
t("--help works for new tools", "awk --help", /Usage: awk/);

// ── goals: output and outputMatches ──
{
  const goal = (lines, g) => {
    const r = shell(lines);
    return checkTerminal(shellState(r.sh, BASE_TIME), g);
  };
  const cases = [
    ["output goal passes", goal("sed -n '10p' twelve.txt", { output: "Line 10" }), true],
    ["output goal ignores trailing newline and spaces", goal("awk '{print $1 \"  \"}' five.txt", { output: "1\n2\n3\n4\n5\n" }), true],
    ["output goal fails on a different output", goal("sed -n '9p' twelve.txt", { output: "Line 10" }), false],
    ["outputMatches regex", goal("cat words.txt | tr -s ' ' '\\n' | sort | uniq -c | sort -rn | awk '{print $2, $1}'", { outputMatches: "^the 4\\nis 3" }), true],
    ["outputMatches fails", goal("echo nope", { outputMatches: "^yes$" }), false],
    ["output + lastCommand", goal("awk 'NR==10' twelve.txt", { output: "Line 10", lastCommand: "^awk" }), true],
  ];
  for (const [name, got, want] of cases) {
    if (got === want) passed++;
    else failures.push(`${name}: expected ${want}, got ${got}`);
  }
}

if (failures.length) {
  console.log(failures.map((f) => "FAIL " + f).join("\n"));
  console.log(`\n${passed} passed, ${failures.length} failed`);
  process.exit(1);
}
console.log(`${passed} shell checks passed`);
