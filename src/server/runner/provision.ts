import { Sandbox } from "@vercel/sandbox";
import { PCH_SH, RUNNER_CS, RUNNER_CSPROJ, RUN_SH } from "./assets.ts";
import { LANGUAGES, SNAPSHOT_PATHS } from "./config.ts";
import type { RunnerLanguage } from "./config.ts";
import { execOnSandbox, runFresh } from "./execute.ts";
import { SAMPLES, WARMUP, checkSample } from "./samples.ts";

/**
 * Builds the toolchain snapshot the runner starts every sandbox from:
 *   .NET SDK 10 (LTS) -> a pre-built, ReadyToRun Roslyn host (/opt/pockett/runner), then the SDK is
 *   removed and only the runtime stays; g++; Go; two unprivileged users; /opt/pockett/run.sh; and
 *   warm caches (Go std build cache, C++ precompiled bits/stdc++.h) filled by compiling and running
 *   a program in each language. Then it self-tests the snapshot by running SAMPLES through the same
 *   code path /api/run uses.
 *
 * Used by POST /api/run/setup and scripts/runner/build-snapshot.mjs.
 */

export interface StepReport {
  name: string;
  ms: number;
}

export interface SelfTestRow {
  language: RunnerLanguage;
  sample: string;
  ok: boolean;
  problems: string[];
  createMs: number;
  totalMs: number;
}

export interface SetupReport {
  ok: boolean;
  snapshotId: string;
  baseImage: string;
  steps: StepReport[];
  selfTest: SelfTestRow[];
  latency: { createMsMedian: number; helloTotalMsMedian: Record<string, number> };
  totalMs: number;
}

export const BASE_IMAGE = process.env.RUNNER_BASE_IMAGE || "vercel/sandbox/ubuntu:latest";

const SETUP_DIR = "pk-setup";

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function tail(text: string, max = 3500): string {
  return text.length > max ? `...${text.slice(-max)}` : text;
}

const RID = String.raw`case "$(uname -m)" in x86_64) RID=linux-x64; GOARCH=amd64 ;; aarch64) RID=linux-arm64; GOARCH=arm64 ;; *) echo "unsupported architecture $(uname -m)"; exit 1 ;; esac`;

function stepScripts(cwd: string): { name: string; script: string; timeoutMs: number }[] {
  const min = 60_000;
  return [
    {
      name: "system packages (g++, curl, util-linux, procps)",
      timeoutMs: 6 * min,
      script: String.raw`export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends g++ libc6-dev curl ca-certificates tar gzip xz-utils procps util-linux coreutils findutils
apt-get install -y --no-install-recommends libssl3t64 || apt-get install -y --no-install-recommends libssl3 || true
# .NET needs ICU unless it runs in invariant mode; install whichever libicuNN this release ships (best effort)
ICU=$(apt-cache search --names-only '^libicu[0-9]+$' | awk '{print $1}' | sort -V | tail -n 1)
[ -n "$ICU" ] && apt-get install -y --no-install-recommends "$ICU" || true
g++ --version | head -n 1
setpriv --version | head -n 1`,
    },
    {
      name: "users and directories",
      timeoutMs: min,
      script: `for u in pkbuild pkrun; do id -u "$u" >/dev/null 2>&1 || useradd --create-home --shell /usr/sbin/nologin "$u"; done
mkdir -p /opt/pockett/pch '${cwd}'
chmod 755 /opt/pockett
chmod 777 '${cwd}'
id pkbuild; id pkrun`,
    },
    {
      name: ".NET SDK 10 (LTS)",
      timeoutMs: 8 * min,
      script: String.raw`curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
bash /tmp/dotnet-install.sh --channel 10.0 --install-dir /opt/dotnet --no-path
ln -sf /opt/dotnet/dotnet /usr/local/bin/dotnet
# learner code runs in invariant-globalization mode (run.sh); build steps do too, so ICU is never required
DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1 /opt/dotnet/dotnet --version`,
    },
    {
      name: "Go (latest stable)",
      timeoutMs: 5 * min,
      script: `${RID}
V=$(curl -fsSL 'https://go.dev/VERSION?m=text' | head -n 1)
echo "installing $V"
curl -fsSL "https://go.dev/dl/$V.linux-$GOARCH.tar.gz" | tar -C /usr/local -xzf -
/usr/local/go/bin/go version`,
    },
    {
      name: "Roslyn host (ReadyToRun publish)",
      timeoutMs: 10 * min,
      script: `${RID}
export HOME=/root DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1 DOTNET_ROOT=/opt/dotnet DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1 PATH=/opt/dotnet:$PATH
cd '${cwd}/${SETUP_DIR}'
if ! dotnet publish Runner.csproj -c Release -r "$RID" --self-contained false -p:PublishReadyToRun=true -o /opt/pockett/runner; then
  echo "ReadyToRun publish failed, falling back to plain IL (slower first compile)"
  rm -rf obj bin /opt/pockett/runner
  dotnet publish Runner.csproj -c Release --self-contained false -o /opt/pockett/runner
fi
ls /opt/pockett/runner | head -n 30`,
    },
    {
      name: "install run.sh and C++ precompiled header",
      timeoutMs: 5 * min,
      script: `cd '${cwd}/${SETUP_DIR}'
install -m 755 run.sh ${SNAPSHOT_PATHS.runScript}
bash -n ${SNAPSHOT_PATHS.runScript}
bash pch.sh`,
    },
    {
      name: "trim image (keep the .NET runtime, drop SDK and caches)",
      timeoutMs: 3 * min,
      script: `rm -rf /opt/dotnet/sdk /opt/dotnet/packs /opt/dotnet/templates /root/.nuget /root/.dotnet /root/.local '${cwd}/${SETUP_DIR}' /tmp/* /var/tmp/*
apt-get clean
rm -rf /var/lib/apt/lists/*
chmod -R a+rX /opt/dotnet /opt/pockett /usr/local/go
du -sh /opt/dotnet /opt/pockett /usr/local/go 2>/dev/null || true`,
    },
  ];
}

export async function buildSnapshot(log: (line: string) => void = () => {}): Promise<SetupReport> {
  const started = performance.now();
  const steps: StepReport[] = [];
  const say = (line: string) => log(`[${Math.round((performance.now() - started) / 1000)}s] ${line}`);

  say(`creating setup sandbox from ${BASE_IMAGE}`);
  const sandbox = await Sandbox.create({
    image: BASE_IMAGE,
    resources: { vcpus: 4 },
    timeout: 20 * 60_000,
    persistent: false,
    // Installing toolchains needs the network. Only this build sandbox has it; run sandboxes are deny-all.
    networkPolicy: "allow-all",
  });

  try {
    const cwd = sandbox.cwd || "/vercel/sandbox";
    await sandbox.mkDir(SETUP_DIR);
    await sandbox.writeFiles([
      { path: `${SETUP_DIR}/Runner.csproj`, content: Buffer.from(RUNNER_CSPROJ, "utf8") },
      { path: `${SETUP_DIR}/Runner.cs`, content: Buffer.from(RUNNER_CS, "utf8") },
      { path: `${SETUP_DIR}/run.sh`, content: Buffer.from(RUN_SH, "utf8") },
      { path: `${SETUP_DIR}/pch.sh`, content: Buffer.from(PCH_SH, "utf8") },
    ]);

    for (const step of stepScripts(cwd)) {
      say(`step: ${step.name}`);
      const t = performance.now();
      const done = await sandbox.runCommand({ cmd: "bash", args: ["-euo", "pipefail", "-c", step.script], sudo: true, timeoutMs: step.timeoutMs });
      if (done.exitCode !== 0) {
        const output = await done.output("both");
        throw new Error(`Setup step "${step.name}" failed (exit ${done.exitCode}):\n${tail(output)}`);
      }
      steps.push({ name: step.name, ms: Math.round(performance.now() - t) });
    }

    // Warm toolchain caches by really compiling and running a program per language.
    for (const language of Object.keys(LANGUAGES) as RunnerLanguage[]) {
      say(`warming ${language}`);
      const t = performance.now();
      const result = await execOnSandbox(sandbox, { language, source: WARMUP[language], stdin: "" });
      if (result.compileError || result.exitCode !== 0) {
        throw new Error(`Warm-up program for ${language} failed:\n${tail(result.compileError ?? result.stderr)}`);
      }
      steps.push({ name: `warm ${language}`, ms: Math.round(performance.now() - t) });
    }
    const final = await sandbox.runCommand({ cmd: "bash", args: ["-c", `rm -rf /tmp/* /var/tmp/*; rm -f '${cwd}'/Program.cs '${cwd}'/main.cpp '${cwd}'/main.go '${cwd}'/stdin.txt; chown -R pkbuild:pkbuild /home/pkbuild; sync`], sudo: true, timeoutMs: 2 * 60_000 });
    if (final.exitCode !== 0) throw new Error(`Final cleanup failed:\n${tail(await final.output("both"))}`);

    say("saving snapshot (never expires)");
    const t = performance.now();
    const snapshot = await sandbox.snapshot({ expiration: 0 });
    steps.push({ name: "snapshot", ms: Math.round(performance.now() - t) });
    const snapshotId = snapshot.snapshotId;
    say(`snapshot ${snapshotId} saved; self-testing from it`);

    // Self-test through the exact path /api/run uses: fresh sandbox, deny-all network.
    const selfTest: SelfTestRow[] = [];
    for (const sample of SAMPLES) {
      try {
        const { result, timings } = await runFresh(snapshotId, { language: sample.language, source: sample.source, stdin: sample.stdin ?? "" });
        const problems = checkSample(sample, result);
        selfTest.push({ language: sample.language, sample: sample.id, ok: problems.length === 0, problems, createMs: timings.createMs, totalMs: timings.totalMs });
      } catch (err) {
        selfTest.push({ language: sample.language, sample: sample.id, ok: false, problems: [err instanceof Error ? err.message : String(err)], createMs: 0, totalMs: 0 });
      }
    }
    const hello: Record<string, number> = {};
    for (const language of Object.keys(LANGUAGES) as RunnerLanguage[]) {
      hello[language] = median(selfTest.filter((r) => r.language === language && r.sample === "hello" && r.ok).map((r) => r.totalMs));
    }
    const report: SetupReport = {
      ok: selfTest.every((r) => r.ok),
      snapshotId,
      baseImage: BASE_IMAGE,
      steps,
      selfTest,
      latency: { createMsMedian: median(selfTest.filter((r) => r.ok).map((r) => r.createMs)), helloTotalMsMedian: hello },
      totalMs: Math.round(performance.now() - started),
    };
    say(report.ok ? "self-test passed" : "self-test FAILED, see report");
    return report;
  } finally {
    // snapshot() already stopped it on success; this covers every failure path. Safe to call twice.
    await sandbox.stop().catch(() => undefined);
  }
}
