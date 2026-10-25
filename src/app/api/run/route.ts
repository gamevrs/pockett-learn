/**
 * Proxy to the sandboxed code runner for compiled languages (C#, C++, Go).
 *
 * RUNNER_URL points at a Piston-compatible service (https://github.com/engineer-man/piston), e.g.
 * a small self-hosted container. RUNNER_TOKEN, if set, is sent as the Authorization header.
 * The browser never talks to the runner directly, so its address and token stay private.
 */

const PISTON_LANGUAGE: Record<string, { language: string; file: string }> = {
  csharp: { language: "csharp.net", file: "Program.cs" },
  cpp: { language: "c++", file: "main.cpp" },
  go: { language: "go", file: "main.go" },
};

const MAX_SOURCE = 64 * 1024;

interface PistonStage {
  stdout?: string;
  stderr?: string;
  code?: number | null;
  signal?: string | null;
}

export async function POST(request: Request) {
  const runner = process.env.RUNNER_URL;
  if (!runner) {
    return Response.json({ error: "The code runner for this language isn't set up yet." }, { status: 503 });
  }

  let body: { language?: string; source?: string; stdin?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const target = PISTON_LANGUAGE[body.language ?? ""];
  if (!target || typeof body.source !== "string") {
    return Response.json({ error: "Unsupported language." }, { status: 400 });
  }
  if (body.source.length > MAX_SOURCE) {
    return Response.json({ error: "That program is too large to run." }, { status: 413 });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.RUNNER_TOKEN) headers.Authorization = process.env.RUNNER_TOKEN;

  let res: Response;
  try {
    res = await fetch(`${runner.replace(/\/$/, "")}/api/v2/execute`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        language: target.language,
        version: "*",
        files: [{ name: target.file, content: body.source }],
        stdin: typeof body.stdin === "string" ? body.stdin.slice(0, MAX_SOURCE) : "",
        compile_timeout: 10_000,
        run_timeout: 3_000,
        run_memory_limit: 256 * 1024 * 1024,
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return Response.json({ error: "The code runner didn't respond. Try again in a moment." }, { status: 502 });
  }
  if (!res.ok) {
    return Response.json({ error: `The code runner returned an error (${res.status}).` }, { status: 502 });
  }

  const data = (await res.json()) as { compile?: PistonStage; run?: PistonStage };
  const compileFailed = data.compile && data.compile.code !== 0 && data.compile.code !== undefined && data.compile.code !== null;
  const timedOut = data.run?.signal === "SIGKILL";
  return Response.json({
    stdout: (data.run?.stdout ?? "").slice(0, 100_000),
    stderr: timedOut ? "Your program ran for too long and was stopped. Is there a loop that never ends?" : (data.run?.stderr ?? "").slice(0, 20_000),
    exitCode: timedOut ? 137 : (data.run?.code ?? null),
    compileError: compileFailed ? (data.compile?.stderr || data.compile?.stdout || "Compilation failed.") : null,
  });
}
