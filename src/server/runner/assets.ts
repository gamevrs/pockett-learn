/**
 * Files that provisioning installs inside the snapshot. They are embedded as strings (String.raw)
 * so they ship with the route bundle with no file tracing config.
 *
 * Rule for editing: no backticks and no dollar-brace sequence inside these strings (that would end
 * the literal or interpolate). Use $VAR, not braces, in bash; avoid dollar-quote interpolation in C#.
 */

/** Roslyn host: compiles one C# file to program.dll with debug info. Run with `dotnet Runner.dll Program.cs <outdir>`. */
export const RUNNER_CSPROJ = String.raw`<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
    <AssemblyName>Runner</AssemblyName>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <InvariantGlobalization>true</InvariantGlobalization>
    <TieredPGO>false</TieredPGO>
    <ConcurrentGarbageCollection>false</ConcurrentGarbageCollection>
    <SatelliteResourceLanguages>en</SatelliteResourceLanguages>
    <GenerateDocumentationFile>false</GenerateDocumentationFile>
    <TreatWarningsAsErrors>false</TreatWarningsAsErrors>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.CodeAnalysis.CSharp" Version="5.0.0" />
  </ItemGroup>
</Project>
`;

export const RUNNER_CS = String.raw`using System.Text;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.Emit;
using Microsoft.CodeAnalysis.Text;

// pockett C# host. usage: Runner <source.cs> [output-dir]
//
// Compiles the learner's single file in memory with Roslyn (no dotnet new / dotnet run) and writes
// program.dll, program.pdb and program.runtimeconfig.json to output-dir. The program is then run with
// plain "dotnet program.dll", so stdout, stderr, exit codes and stack traces (with line numbers, from
// the pdb) behave exactly as they do for a normal console app.
//
// Compiler errors are printed one per line as "Program.cs(12,5): error CS1002: ; expected" (the file
// name and line numbers are the learner's own: the source is compiled as-is, never wrapped) and the
// exit code is 1. Top-level statements and a classic "class Program { static void Main() }" both work.
internal static class Runner
{
    // What "dotnet new console" turns on by default, as a separate file so line numbers don't move.
    private const string ImplicitUsings =
        "global using global::System;\n" +
        "global using global::System.Collections.Generic;\n" +
        "global using global::System.IO;\n" +
        "global using global::System.Linq;\n" +
        "global using global::System.Net.Http;\n" +
        "global using global::System.Threading;\n" +
        "global using global::System.Threading.Tasks;\n";

    private const int MaxErrors = 25;

    private static int Main(string[] args)
    {
        if (args.Length < 1)
        {
            Console.Error.WriteLine("usage: Runner <source.cs> [output-dir]");
            return 64;
        }

        var sourcePath = args[0];
        var outDir = args.Length > 1 ? args[1] : ".";
        Directory.CreateDirectory(outDir);

        var parse = new CSharpParseOptions(LanguageVersion.Latest);
        var trees = new[]
        {
            CSharpSyntaxTree.ParseText(SourceText.From(File.ReadAllText(sourcePath), Encoding.UTF8), parse, Path.GetFileName(sourcePath)),
            CSharpSyntaxTree.ParseText(SourceText.From(ImplicitUsings, Encoding.UTF8), parse, "ImplicitUsings.g.cs"),
        };

        var options = new CSharpCompilationOptions(OutputKind.ConsoleApplication)
            .WithOptimizationLevel(OptimizationLevel.Debug)
            .WithAllowUnsafe(true)
            .WithNullableContextOptions(NullableContextOptions.Disable);
        var compilation = CSharpCompilation.Create("program", trees, FrameworkReferences(), options);

        var dllPath = Path.Combine(outDir, "program.dll");
        EmitResult result;
        using (var pe = File.Create(dllPath))
        using (var pdb = File.Create(Path.Combine(outDir, "program.pdb")))
        {
            result = compilation.Emit(pe, pdb, options: new EmitOptions(debugInformationFormat: DebugInformationFormat.PortablePdb, pdbFilePath: "program.pdb"));
        }

        if (!result.Success)
        {
            File.Delete(dllPath);
            var errors = result.Diagnostics.Where(d => d.Severity == DiagnosticSeverity.Error).ToList();
            foreach (var d in errors.Take(MaxErrors)) Console.WriteLine(d.ToString());
            if (errors.Count > MaxErrors) Console.WriteLine("... and " + (errors.Count - MaxErrors) + " more errors");
            if (errors.Count == 0) Console.WriteLine("Compilation failed.");
            return 1;
        }

        var v = Environment.Version;
        var tfm = "net" + v.Major + "." + v.Minor;
        File.WriteAllText(
            Path.Combine(outDir, "program.runtimeconfig.json"),
            "{\"runtimeOptions\":{\"tfm\":\"" + tfm + "\",\"framework\":{\"name\":\"Microsoft.NETCore.App\",\"version\":\"" + v.Major + "." + v.Minor + ".0\"}," +
            "\"configProperties\":{\"System.GC.Concurrent\":false,\"System.GC.HeapHardLimit\":268435456," +
            "\"System.Globalization.Invariant\":true,\"System.Runtime.TieredPGO\":false}}}");
        return 0;
    }

    // Compile against the shared framework this process is running on (implementation assemblies).
    private static List<MetadataReference> FrameworkReferences()
    {
        var dir = Path.GetDirectoryName(typeof(object).Assembly.Location)!;
        var refs = new List<MetadataReference>();
        foreach (var file in Directory.EnumerateFiles(dir, "*.dll").OrderBy(f => f, StringComparer.Ordinal))
        {
            var name = Path.GetFileName(file);
            var managed = name.StartsWith("System.", StringComparison.Ordinal) || name == "mscorlib.dll" || name == "netstandard.dll" || name == "Microsoft.CSharp.dll";
            if (managed && !name.EndsWith(".Native.dll", StringComparison.Ordinal)) refs.Add(MetadataReference.CreateFromFile(file));
        }
        return refs;
    }
}
`;

/**
 * Runs as root inside the single-use microVM. Compiles as pkbuild, runs as pkrun, and prints a report
 * that result.ts parses. usage: run.sh <csharp|cpp|go> <input-dir> <marker> <compile-secs> <run-secs> <max-output-bytes>
 */
export const RUN_SH = String.raw`#!/bin/bash
LANG_ID="$1"; IN="$2"; M="$3"; CT="$4"; RT="$5"; MAXOUT="$6"
[ -n "$CT" ] || CT=10
[ -n "$RT" ] || RT=3
[ -n "$MAXOUT" ] || MAXOUT=100000
FILE_KB=$(( MAXOUT / 1024 + 64 ))

case "$LANG_ID" in
  csharp) SRC=Program.cs ;;
  cpp) SRC=main.cpp ;;
  go) SRC=main.go ;;
  *) echo "unsupported language: $LANG_ID" >&2; exit 64 ;;
esac

B=$(mktemp -d /tmp/pk-build.XXXXXX)
S=$(mktemp -d /tmp/pk-run.XXXXXX)

cleanup() {
  pkill -9 -u pkrun 2>/dev/null
  pkill -9 -u pkbuild 2>/dev/null
  find /tmp /var/tmp /dev/shm -xdev \( -user pkrun -o -user pkbuild \) -delete 2>/dev/null
  rm -rf "$B" "$S"
}
trap cleanup EXIT

cp "$IN/$SRC" "$B/$SRC" || { echo "missing source file" >&2; exit 65; }
if [ -f "$IN/stdin.txt" ]; then cp "$IN/stdin.txt" "$S/stdin.txt"; else : > "$S/stdin.txt"; fi
chown -R pkbuild:pkbuild "$B"; chmod 755 "$B"
chown -R pkrun:pkrun "$S"; chmod 700 "$S"

PATHX=/usr/local/go/bin:/usr/local/bin:/usr/bin:/bin
# EnableWriteXorExecute=0: W^X double-maps JIT memory through a memfd, which "ulimit -f" caps, so CoreCLR
# would fail to start with "Out Of Memory". Turning it off also makes startup faster.
DOTNETENV="DOTNET_ROOT=/opt/dotnet DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1 DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1 DOTNET_TieredPGO=0 DOTNET_EnableDiagnostics=0 DOTNET_EnableWriteXorExecute=0"
BENV="setpriv --reuid=pkbuild --regid=pkbuild --clear-groups --no-new-privs env -i PATH=$PATHX HOME=/home/pkbuild TMPDIR=$B LANG=C.UTF-8 GOCACHE=/home/pkbuild/.cache/go-build GOPATH=/home/pkbuild/go CGO_ENABLED=0 GOTOOLCHAIN=local GOPROXY=off GOTELEMETRY=off $DOTNETENV"
RENV="setpriv --reuid=pkrun --regid=pkrun --clear-groups --no-new-privs env -i PATH=$PATHX HOME=$S TMPDIR=$S LANG=C.UTF-8 GOMEMLIMIT=512MiB $DOTNETENV"

kv() { printf '\n%s:%s=%s\n' "$M" "$1" "$2"; }
now_ms() { echo $(( $(date +%s%N) / 1000000 )); }

# ---- compile (as pkbuild) ----
case "$LANG_ID" in
  csharp) CCMD="dotnet /opt/pockett/runner/Runner.dll Program.cs $B" ;;
  cpp) CCMD="g++ -std=c++20 -O1 -pipe -I/opt/pockett/pch -o prog main.cpp" ;;
  go) CCMD="go build -o prog main.go" ;;
esac
T0=$(now_ms)
(
  ulimit -c 0; ulimit -f 65536; ulimit -u 1024
  cd "$B" || exit 1
  timeout -k 1 "$CT" $BENV $CCMD
) >"$B/compile.raw" 2>&1
CODE=$?
CMS=$(( $(now_ms) - T0 ))
CTO=0
if { [ "$CODE" -eq 124 ] || [ "$CODE" -eq 137 ]; } && [ "$CMS" -ge $(( CT * 1000 - 300 )) ]; then CTO=1; fi
if [ "$CODE" -eq 0 ] && [ "$LANG_ID" != csharp ] && [ ! -x "$B/prog" ]; then CODE=1; fi

kv compile_code "$CODE"
kv compile_timed_out "$CTO"
kv compile_ms "$CMS"
printf '%s:compile_begin\n' "$M"
head -c 20000 "$B/compile.raw"
printf '\n%s:compile_end\n' "$M"
[ "$CODE" -eq 0 ] || exit 0

# ---- run (as pkrun, no write access outside its scratch dir) ----
case "$LANG_ID" in
  csharp) RCMD="dotnet $B/program.dll"; VMEM="" ;;
  *) RCMD="$B/prog"; VMEM=1048576 ;;
esac
T1=$(now_ms)
(
  ulimit -c 0; ulimit -f "$FILE_KB"; ulimit -u 256; ulimit -n 256
  [ -z "$VMEM" ] || ulimit -v "$VMEM"
  cd "$S" || exit 1
  timeout -k 1 "$RT" $RENV $RCMD
) <"$S/stdin.txt" >"$S/stdout.txt" 2>"$S/stderr.txt"
RCODE=$?
RMS=$(( $(now_ms) - T1 ))
RTO=0
if { [ "$RCODE" -eq 124 ] || [ "$RCODE" -eq 137 ]; } && [ "$RMS" -ge $(( RT * 1000 - 300 )) ]; then RTO=1; fi

kv run_code "$RCODE"
kv timed_out "$RTO"
kv run_ms "$RMS"
kv stdout_bytes "$(stat -c %s "$S/stdout.txt")"
kv stderr_bytes "$(stat -c %s "$S/stderr.txt")"
printf '%s:stdout_begin\n' "$M"
head -c "$MAXOUT" "$S/stdout.txt"
printf '\n%s:stdout_end\n' "$M"
printf '%s:stderr_begin\n' "$M"
head -c 20000 "$S/stderr.txt"
printf '\n%s:stderr_end\n' "$M"
exit 0
`;

/** Best-effort precompiled header so "#include <bits/stdc++.h>" (very common in contest-style C++) doesn't cost seconds. */
export const PCH_SH = String.raw`#!/bin/bash
mkdir -p /opt/pockett/pch/bits
SRC=$(echo '#include <bits/stdc++.h>' | g++ -std=c++20 -x c++ -H -fsyntax-only - 2>&1 | grep -m1 'bits/stdc++.h' | sed 's/^\.* //')
[ -f "$SRC" ] || { echo "stdc++.h not found; skipping precompiled header"; exit 0; }
cp "$SRC" /opt/pockett/pch/bits/stdc++.h
g++ -std=c++20 -O1 -pipe -x c++-header /opt/pockett/pch/bits/stdc++.h -o /opt/pockett/pch/bits/stdc++.h.gch || { rm -f /opt/pockett/pch/bits/stdc++.h.gch; echo "pch build failed; continuing without"; }
exit 0
`;
