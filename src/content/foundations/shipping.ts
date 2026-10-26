import type { Module } from "../../learn/types.ts";

/** Fenced plain-text block (config, logs, output) for lesson prose. */
const text = (s: string) => "```text\n" + s.trim() + "\n```";
const py = (s: string) => "```python\n" + s.trim() + "\n```";

/**
 * Module: getting code to production. From "it passes on my laptop" to a change running safely for
 * everyone: artifacts, CI/CD, containers, signals, orchestration, probes, deploy strategies,
 * feature flags, serverless and rollbacks.
 */
export const shippingModule: Module = {
  id: "shipping",
  part: "systems",
  title: "Getting code to production",
  blurb: "Build artifacts, CI/CD, containers, graceful shutdown, Kubernetes basics, health probes, zero-downtime deploys, feature flags, serverless and rollbacks.",
  icon: "rocket",
  lessons: [
    // ─────────────────────────────── 1. Artifacts ───────────────────────────────
    {
      id: "fnd-ship-1-artifact",
      title: "From commit to artifact",
      summary: "What a build produces, why you build once, and how the same bytes travel from staging to production.",
      minutes: 7,
      xp: 40,
      steps: [
        {
          kind: "explain",
          title: "Source is not what runs",
          body: "The repository holds **source**: text files that a person can read. Production never runs those files directly. It runs something that was *made from* them: a compiled program, a bundle of JavaScript, a zip of a serverless function, a container image.\n\nThat made thing is a **build artifact**, and the step that makes it is the **build**. A build takes three inputs, source code, the dependencies it names, and the build settings, and produces one sealed output.\n\nThink of a recipe card and a boxed dinner. The card says how to cook; the box is what actually leaves the kitchen. Customers never receive the card, and the kitchen does not cook a second time at the doorstep.",
        },
        {
          kind: "question",
          title: "Spot the artifact",
          body: "A team ships a delivery-tracking service. Which of these is the **build artifact**?",
          question: {
            type: "choice",
            options: [
              "The folder of source files on a developer's laptop",
              "The sealed output of a build, which can be started on a server without being built again",
              "The list of tests that ran against the change",
              "The branch the change was merged from",
            ],
            answer: 1,
          },
          explanation: "An artifact is the *output* of the build: complete, sealed and startable as it is. Source, branches and test lists are inputs or by-products. If a server has to build the code before it can run it, you are shipping a recipe, not a meal.",
        },
        {
          kind: "explain",
          title: "Name it by what is inside",
          body: "Artifacts need names, and the obvious names are traps. A label such as `latest` or `prod` is just a sticker: tomorrow someone can peel it off one artifact and stick it on another, and nothing in the name tells you.\n\nSo registries also give every artifact a **digest**: a fingerprint calculated from its exact contents. Change a single byte and the digest changes completely. The same digest always means the same bytes.\n\n" +
            text(`
delivery-api:latest                      <- a sticker, can move
delivery-api@sha256:9c1e07ab...          <- a fingerprint, cannot lie
`) +
            "\nTwo habits follow. **Never overwrite** a published artifact: publish a new one. And when you ask \"what is running?\", the answer is a digest, not a label.",
        },
        {
          kind: "question",
          title: "The moving sticker",
          body: "This morning the tag `prod` pointed at `sha256:aa11`. Now it points at `sha256:bb22`. What can you say for certain?",
          question: {
            type: "choice",
            options: [
              "The tag now refers to different contents",
              "Nothing changed, a tag always means the same thing",
              "The old artifact was edited in place",
              "The registry lost the old artifact",
            ],
            answer: 0,
          },
          explanation: "A digest identifies contents, so a different digest means different contents. The tag is only a pointer that was moved. The old artifact `sha256:aa11` still exists unchanged, which is exactly why you can point back at it when something goes wrong.",
        },
        {
          kind: "explain",
          title: "Build once, promote",
          body: "Here is the discipline that makes releases trustworthy: **build the artifact once, and move that same artifact through every environment.** Staging runs it, the full tests run against it, and if it passes, production is told to run *those exact bytes*.\n\nThat is **promotion**: nothing is rebuilt on the way. Step through it below, then flip to the alternative where each environment builds from source on its own.",
          widget: { type: "ship-promote", props: {} },
        },
        {
          kind: "question",
          title: "See the drift",
          body: "Switch to **Rebuild per environment** and press Next until it finishes. Watch the digests.",
          widget: { type: "ship-promote", props: { mode: "promote" } },
          question: { type: "widget", goal: { mode: "rebuild", finished: true, sameBytes: false } },
          explanation: "Staging and production built from the same commit but resolved a dependency an hour apart, so they ran different code. The tests proved something about staging's build and nothing about production's. Building once removes the whole category of \"it was fine in staging\".",
        },
        {
          kind: "question",
          title: "But production needs different settings",
          body: "The database address, credentials and log level are different in production. A teammate wants to build a separate production artifact. What is the better fix?",
          question: {
            type: "choice",
            options: [
              "Build one artifact and hand each environment its settings when the program starts",
              "Keep two copies of the build script and edit both by hand",
              "Deploy the staging artifact, then edit the files on the production server",
              "Skip staging and build straight for production",
            ],
            answer: 0,
          },
          explanation: "Anything that differs by environment is **configuration**, and it travels separately from the artifact (environment variables, mounted files, a config service). The artifact stays identical everywhere, so what you tested is what you run.",
        },
        {
          kind: "question",
          title: "Put the journey in order",
          body: "Order a change's journey the disciplined way.",
          question: {
            type: "order",
            items: [
              "A change is merged to the main branch",
              "CI builds one artifact and stores it under its digest",
              "Tests run against that artifact",
              "The artifact is deployed to staging and checked",
              "The same artifact is promoted to production",
            ],
          },
          explanation: "The build happens exactly once, before any testing, so every later step is about the same bytes. Promotion is just \"run that digest over there\".",
        },
        {
          kind: "recap",
          points: [
            "An **artifact** is the sealed output of a build: the thing you ship, not the recipe.",
            "Identify artifacts by **digest** (a fingerprint of the contents), not by movable labels like `latest`.",
            "**Build once, promote** the same artifact through every environment, so tests describe what really runs.",
            "Environment differences live in **configuration** passed at start-up, never in a different build.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 2. CI / CD ───────────────────────────────
    {
      id: "fnd-ship-2-ci",
      title: "Continuous integration and delivery",
      summary: "Tests on every change, fast feedback, flaky tests, and the difference between delivery and deployment.",
      minutes: 9,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "Merge small, check always",
          body: "Imagine two cooks who each rewrite the same recipe in secret for a month, then try to merge their versions on the last day. Almost every line conflicts, and nobody remembers why they changed what they changed.\n\n**Continuous integration** (CI) is the opposite habit: everyone merges small changes into the shared branch many times a day, and a server checks *every* change automatically. On each push it starts from a clean machine, builds the code and runs the tests. If anything fails, the change is blocked and its author hears about it within minutes, while the details are still in their head.\n\nThe set of automated stages is the **pipeline**. Its design matters more than it looks: the order and layout decide how soon a mistake is reported.",
        },
        {
          kind: "explain",
          title: "Fast failures first",
          body: "This pipeline has five stages, each with a real cost in time. Choose a stage to break, then change the layout: *as written*, *cheapest first*, or *in parallel*. Look at how long the developer waits to hear \"broken\".",
          widget: { type: "ship-pipeline", props: { broken: "lint" } },
        },
        {
          kind: "question",
          title: "The slow, late news",
          body: "The end-to-end tests are the stage that breaks. Find the layout that reports it **soonest**.",
          widget: { type: "ship-pipeline", props: { broken: "e2e", lockBroken: true, layout: "written" } },
          question: { type: "widget", goal: { broken: "e2e", maxFeedback: 300 } },
          explanation: "Running independent stages **in parallel** means the end-to-end tests start as soon as the build finishes instead of waiting behind everything else: 60 s + 240 s = 5 minutes. As a rule, put cheap checks first, and run what doesn't depend on each other side by side.",
        },
        {
          kind: "explain",
          title: "Flaky tests",
          body: "A **flaky** test sometimes fails for no reason connected to the code: it races a timer, shares a database with another test, or waits for a network call. Rerun it and it passes.\n\nOne flaky test seems harmless. But a pipeline is green only if *every* test passes, so small chances multiply. Turn up the dial and watch twenty-four runs of the **same unchanged commit**.",
          widget: { type: "ship-flaky", props: { tests: 40, rate: 2, retries: 0 } },
        },
        {
          kind: "question",
          title: "Do the sum",
          body: "A suite has **40 tests**, and each one flakes 2% of the time, independently. About what percentage of runs on unchanged code are fully green?",
          question: { type: "number", answer: 45, tolerance: 4, unit: "%" },
          explanation: "Each test passes 98% of the time, and all 40 must pass: 0.98 to the power 40 is about **0.45**. A 2% flake rate looks tiny per test and still makes more than half the runs red. People learn to ignore red builds, which is how real failures slip through.",
        },
        {
          kind: "question",
          title: "What to do about it",
          body: "A test failed on CI, passed when rerun, and no code changed. A teammate says \"just rerun it\". What is the best long-term response?",
          question: {
            type: "choice",
            options: [
              "Rerun it and move on without telling anyone",
              "Delete the test so it can't fail again",
              "Quarantine it: stop it blocking merges, record it, and fix the cause soon",
              "Add ten automatic retries to every test",
            ],
            answer: 2,
          },
          explanation: "**Quarantine** keeps the pipeline trustworthy while the problem gets an owner. Silent reruns teach everyone to ignore failures; deleting loses coverage; blanket retries hide real intermittent bugs in the product itself and slow every run.",
        },
        {
          kind: "code",
          title: "Catch a flaky test",
          body: "You have the history of CI runs as `(commit, test, passed)` tuples. A test is **flaky** if on the *same commit* it both passed and failed. Finish `find_flaky(runs)` so it returns the sorted list of flaky test names.\n\n" +
            py(`
runs = [
    ("a1", "test_login", True),
    ("a1", "test_login", False),   # same commit, different result
    ("a1", "test_export", True),
    ("b2", "test_export", False),  # different commit: a real change
]
find_flaky(runs)   # ["test_login"]
`),
          language: "python",
          starter: `def find_flaky(runs):
    results = {}   # (commit, test) -> set of outcomes seen
    for commit, test, passed in runs:
        pass  # TODO: remember every outcome seen for this commit and test
    # TODO: return the sorted test names that saw both True and False on one commit
    return []
`,
          solution: `def find_flaky(runs):
    results = {}
    for commit, test, passed in runs:
        results.setdefault((commit, test), set()).add(passed)
    flaky = {test for (commit, test), seen in results.items() if len(seen) == 2}
    return sorted(flaky)
`,
          tests: [
            {
              id: "t1",
              description: "Finds a test that both passed and failed on one commit",
              assertionCode: `_r = find_flaky([("a1", "test_login", True), ("a1", "test_login", False), ("a1", "test_export", True)])\nassert _r == ["test_login"], f"Expected ['test_login'], got {_r}"`,
            },
            {
              id: "t2",
              description: "A pass on one commit and a fail on another is not flaky",
              assertionCode: `_r = find_flaky([("a1", "test_export", True), ("b2", "test_export", False)])\nassert _r == [], f"Different commits are a real change, not a flake. Got {_r}"`,
            },
            {
              id: "t3",
              description: "Returns each name once, sorted",
              assertionCode: `_runs = [("c", "z_test", True), ("c", "z_test", False), ("c", "z_test", True), ("d", "a_test", False), ("d", "a_test", True)]\n_r = find_flaky(_runs)\nassert _r == ["a_test", "z_test"], f"Expected ['a_test', 'z_test'], got {_r}"`,
            },
            { id: "t4", description: "No runs, no flakes", assertionCode: `assert find_flaky([]) == [], "An empty history has no flaky tests"` },
          ],
          hints: ["Group by the pair `(commit, test)`; a `set` keeps each distinct outcome once.", "A flake is a group whose set has both `True` and `False`, i.e. length 2."],
        },
        {
          kind: "explain",
          title: "Delivery, then deployment",
          body: "CI answers \"is this change sound?\". The next question is \"can we ship it?\", and there are two levels:\n\n- **Continuous delivery**: every change that passes the pipeline is *ready* to release. Someone presses a button (or approves) to send it to production.\n- **Continuous deployment**: there is no button. Every change that passes goes to production automatically.\n\nThe difference is a human decision, not tooling. Continuous deployment is demanding: it only works when the tests, the health checks and the rollback path are trustworthy enough that a robot may make the call at 3 a.m.",
        },
        {
          kind: "question",
          title: "Which is which?",
          body: "A library-booking team's pipeline builds, tests and deploys every merged change to production by itself, with no approval step. What is that called?",
          question: {
            type: "choice",
            options: [
              "Continuous integration only",
              "Continuous delivery",
              "Continuous deployment",
              "A nightly batch release",
            ],
            answer: 2,
          },
          explanation: "No human gate between \"passed\" and \"live\" is **continuous deployment**. If a person still approved the release, it would be continuous delivery: always releasable, released on demand.",
        },
        {
          kind: "recap",
          points: [
            "**CI** merges small changes often and checks each one on a clean machine, so breakage is found within minutes.",
            "Put **cheap, fast checks first** and run independent stages **in parallel**; the layout decides how soon a mistake is reported.",
            "**Flaky tests** compound: many tiny failure chances multiply. Quarantine, record and fix them; don't ignore red builds.",
            "**Delivery** = always releasable, a person decides. **Deployment** = every passing change ships automatically.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 3. Containers ───────────────────────────────
    {
      id: "fnd-ship-3-containers",
      title: "Containers and images",
      summary: "Images versus containers, layers and the build cache, small images, and configuration through the environment.",
      minutes: 9,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "The end of \"works on my machine\"",
          body: "A program rarely depends on its own code alone. It needs a particular language version, system libraries, fonts, a timezone database, environment variables. Two machines that differ in any of these can behave differently, which is where \"works on my machine\" comes from.\n\nA **container** packages the program *together with* its whole filesystem of libraries and tools, then runs it in a bubble where it can only see that filesystem. The package is called an **image**: a read-only template. Start it and you get a **container**: a running process built from the image, with a thin writable layer on top.\n\nSo: the image is the sealed tin, the container is a tin that has been opened and is being served. Start the same image three times and you have three containers and still one image.",
        },
        {
          kind: "question",
          title: "One image, three starts",
          body: "You start the same image on three servers. What do you now have?",
          question: {
            type: "choice",
            options: [
              "Three images and three containers",
              "One image and three containers",
              "One image and one container shared by all three",
              "Three images and one container",
            ],
            answer: 1,
          },
          explanation: "The image is the unchanging template, so there is still just one. Each start creates a separate container with its own process and writable layer. That is why containers can be thrown away and recreated freely: the image is the source of truth.",
        },
        {
          kind: "explain",
          title: "Not a small virtual machine",
          body: "A virtual machine runs a whole operating system on pretend hardware. A container does not: it shares the **host's kernel** and uses kernel features to hide everything else. Namespaces give the process its own view of processes, network and filesystem, and control groups cap how much CPU and memory it may use.\n\nThat is why containers start in a fraction of a second and cost almost nothing to run beside each other. The price is weaker isolation than a VM, because every container on a host trusts the same kernel.",
        },
        {
          kind: "explain",
          title: "Images are stacks of layers",
          body: "Each instruction in a build file creates a **layer**: a snapshot of the files that instruction changed. The layers stack to form the image.\n\nBuilds are fast because layers are **cached**. A layer is reused only if its own inputs are unchanged *and every layer above it was reused too*. The moment one layer must be rebuilt, everything below it rebuilds as well.\n\nEdit the code and rebuild with each ordering. Watch which layers rebuild, and how long the build takes.",
          widget: { type: "ship-layers", props: { order: "copy-first" } },
        },
        {
          kind: "question",
          title: "Make code edits cheap",
          body: "Right now a one-line code edit costs a 42-second rebuild. Reorder the Dockerfile, edit the app code, rebuild, and get that build under **five seconds**.",
          widget: { type: "ship-layers", props: { order: "copy-first" } },
          question: { type: "widget", goal: { edit: "code", maxSecs: 5 } },
          explanation: "Dependencies change rarely, code changes constantly. Copy only the dependency list, install, and *then* copy the source: an edit now invalidates only the last cheap layer, and the 40-second install is served from cache.",
        },
        {
          kind: "question",
          title: "Why everything rebuilt",
          body: "A Dockerfile has `COPY . /app` on line 2 and `RUN pip install -r requirements.txt` on line 3. Editing any source file makes line 3 rerun. Why?",
          question: {
            type: "choice",
            options: [
              "Pip always ignores its cache",
              "Line 2's inputs changed, and a changed layer invalidates every layer after it",
              "Docker rebuilds the whole file whenever any file changes, regardless of order",
              "The requirements file is edited by the copy",
            ],
            answer: 1,
          },
          explanation: "A layer's cache key includes everything beneath it. Line 2 now holds different files, so line 3 sits on a different foundation and can't reuse its old result, even though the dependency list never changed.",
        },
        {
          kind: "explain",
          title: "Keep images small",
          body: "Every megabyte is pulled again each time a fresh server starts, and every installed package is something to keep patched and a thing an attacker could use. Two big levers:\n\n- **Choose a smaller base.** A full operating-system image carries hundreds of tools your service never calls; slim and minimal bases carry only what the runtime needs (a minimal one often has no shell at all).\n- **Use a multi-stage build.** Compile in one stage that has compilers and headers, then copy only the finished program into a clean final stage. The build tools stay behind and never ship.\n\nTry the combinations.",
          widget: { type: "ship-size", props: {} },
        },
        {
          kind: "question",
          title: "Under 100 MB",
          body: "Shrink the image to **under 100 MB**.",
          widget: { type: "ship-size", props: {} },
          question: { type: "widget", goal: { maxMb: 100 } },
          explanation: "Only the minimal runtime *and* a multi-stage build get there: 28 MB of base plus 45 MB of app. A slim base alone still ships 520 MB of compilers if the build tools are left in the final image.",
        },
        {
          kind: "explain",
          title: "One image, many environments",
          body: "Because an image is built once and promoted, it must not contain anything specific to one environment. Differences arrive **when the container starts**, mostly as **environment variables**:\n\n" +
            text(`
docker run \\
  -e PORT=8080 \\
  -e LOG_LEVEL=info \\
  -e DATABASE_URL=postgres://db.internal/loans \\
  delivery-api@sha256:9c1e07
`) +
            "\nThe program reads them at start-up and fails fast with a clear message if a required one is missing. **Secrets** (passwords, API keys) follow the same rule, and then some: never write them into a layer. Layers can be listed and unpacked by anyone who can pull the image, and they remain in the history even if a later line deletes the file.",
        },
        {
          kind: "code",
          title: "Read the environment",
          body: "Write `load_config(env)`, where `env` is a dictionary of environment variables (all values are strings).\n\n- `PORT`: an integer, default `8080`\n- `LOG_LEVEL`: default `\"info\"`\n- `DEBUG`: true only when the value is `\"1\"` or `\"true\"` (any capitalisation)\n- `DATABASE_URL`: **required**. If it is missing, raise `ValueError(\"DATABASE_URL is required\")`.\n\nReturn a dictionary with the keys `port`, `log_level`, `debug` and `database_url`.",
          language: "python",
          starter: `def load_config(env):
    # TODO: raise ValueError if DATABASE_URL is missing
    return {
        "port": 8080,
        "log_level": "info",
        "debug": False,
        "database_url": None,
    }
`,
          solution: `def load_config(env):
    if "DATABASE_URL" not in env:
        raise ValueError("DATABASE_URL is required")
    return {
        "port": int(env.get("PORT", "8080")),
        "log_level": env.get("LOG_LEVEL", "info"),
        "debug": env.get("DEBUG", "").lower() in ("1", "true"),
        "database_url": env["DATABASE_URL"],
    }
`,
          tests: [
            {
              id: "t1",
              description: "Uses the defaults when only the database is given",
              assertionCode: `_c = load_config({"DATABASE_URL": "postgres://db/x"})\nassert _c == {"port": 8080, "log_level": "info", "debug": False, "database_url": "postgres://db/x"}, f"Got {_c}"`,
            },
            {
              id: "t2",
              description: "Converts PORT to an int and reads LOG_LEVEL",
              assertionCode: `_c = load_config({"DATABASE_URL": "u", "PORT": "9000", "LOG_LEVEL": "debug"})\nassert _c["port"] == 9000 and isinstance(_c["port"], int), f"port should be the int 9000, got {_c['port']!r}"\nassert _c["log_level"] == "debug", f"log_level should be 'debug', got {_c['log_level']!r}"`,
            },
            {
              id: "t3",
              description: "DEBUG is true for \"1\" and \"True\", false otherwise",
              assertionCode: `assert load_config({"DATABASE_URL": "u", "DEBUG": "1"})["debug"] is True, "DEBUG=1 should be true"\nassert load_config({"DATABASE_URL": "u", "DEBUG": "True"})["debug"] is True, "DEBUG=True should be true"\nassert load_config({"DATABASE_URL": "u", "DEBUG": "no"})["debug"] is False, "DEBUG=no should be false"`,
            },
            {
              id: "t4",
              description: "A missing DATABASE_URL raises ValueError",
              assertionCode: `try:\n    load_config({"PORT": "80"})\n    _raised = False\nexcept ValueError as e:\n    _raised = "DATABASE_URL" in str(e)\nassert _raised, "A missing DATABASE_URL should raise ValueError mentioning DATABASE_URL"`,
            },
          ],
          hints: ["`env.get(\"PORT\", \"8080\")` gives the default when the key is missing; wrap it in `int(...)`.", "For DEBUG compare the lower-cased value with `(\"1\", \"true\")`."],
        },
        {
          kind: "recap",
          points: [
            "An **image** is a read-only template; a **container** is a running instance of it. Containers share the host's kernel, which makes them light but less isolated than VMs.",
            "Each instruction is a **layer**, and the cache is reused only while every layer above is unchanged: put slow, rarely-changing steps first.",
            "Small bases and **multi-stage builds** make images faster to pull and leave less to patch.",
            "Configuration and secrets arrive through the **environment** at start-up; the image stays identical everywhere and secrets never go in a layer.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 4. Signals and graceful shutdown ───────────────────────────────
    {
      id: "fnd-ship-4-shutdown",
      title: "Signals and graceful shutdown",
      summary: "SIGTERM versus SIGKILL, and how to stop a server without dropping the requests it is serving.",
      minutes: 9,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "Being asked to leave",
          body: "In production, processes are stopped all the time, on purpose: a deploy replaces old instances, an autoscaler removes surplus ones, a machine is drained for maintenance. None of those is a crash. The platform *asks* your process to stop.\n\nThe operating system's way of asking is a **signal**: a tiny message delivered to a process. Two matter most:\n\n- **SIGTERM** (terminate): \"please finish up and exit.\" A program can **catch** it, run its own code, then exit by itself.\n- **SIGKILL**: \"you are being removed, now.\" It cannot be caught, ignored or delayed. The kernel simply ends the process.\n\n(Ctrl-C in a terminal sends a third one, SIGINT, which behaves like a polite SIGTERM.)\n\nA platform stops things in two beats: send SIGTERM, wait a **grace period** (30 seconds is a common default), and if the process is still alive, send SIGKILL.",
        },
        {
          kind: "question",
          title: "Which one can you catch?",
          body: "You want your program to flush its logs before it exits during a deploy. Which signal can it react to?",
          question: {
            type: "choice",
            options: [
              "SIGKILL, because it is the strongest",
              "SIGTERM, because it is a request the program is allowed to handle",
              "Both can be handled the same way",
              "Neither: a program never learns it is being stopped",
            ],
            answer: 1,
          },
          explanation: "SIGTERM is a request, so there is code you can run in response. SIGKILL is enforcement: the process gets no chance to run anything. That is exactly why a polite stop comes first, and SIGKILL is only the deadline.",
        },
        {
          kind: "explain",
          title: "What the default does to your users",
          body: "Picture a delivery-tracking server that has six requests halfway through when a deploy sends SIGTERM. Many languages' default reaction is to end the process immediately. Every request in flight is dropped (the customer sees an error), and requests that arrive a moment later find nobody home.\n\nPlay with the three behaviours below and the grace period. The bars are requests; red crosses are casualties.",
          widget: { type: "ship-shutdown", props: { mode: "exit", grace: 30 } },
        },
        {
          kind: "question",
          title: "Ignoring the signal",
          body: "A program installs a handler that does nothing, so it ignores SIGTERM. With a **30 second** grace period, what happens to it?",
          widget: { type: "ship-shutdown", props: { mode: "ignore", grace: 30 }, after: true },
          question: {
            type: "choice",
            options: [
              "It carries on accepting new work until SIGKILL ends it at 30 seconds, cutting off whatever is running",
              "It quietly finishes everything and exits when idle",
              "The platform notices and waits longer",
              "It exits immediately anyway, because SIGTERM can't be ignored",
            ],
            answer: 0,
          },
          explanation: "Ignoring SIGTERM changes nothing except removing the polite exit. The program serves new customers right up to the deadline, then SIGKILL cuts everyone off at once. Worst of both worlds. (Answering unlocked the widget so you can check.)",
        },
        {
          kind: "explain",
          title: "Graceful shutdown in four moves",
          body: "A **graceful shutdown** turns SIGTERM into an orderly retirement:\n\n1. **Stop taking new work.** Close the listening socket and start failing the readiness check so the load balancer sends new requests elsewhere.\n2. **Finish what is in flight.** Let current requests run to completion (with an upper bound).\n3. **Release resources.** Flush buffered logs and metrics, finish writes, close database connections, acknowledge or hand back queued jobs.\n4. **Exit** with status 0.\n\nThe grace period has to be longer than your slowest legitimate request *plus* cleanup, or SIGKILL still cuts someone off.\n\nTwo practical traps. Load balancers take a few seconds to notice an instance is leaving, so many services pause briefly after SIGTERM before they stop listening. And in a container your program is process number 1: if the start command is a shell script, the shell may receive the signal and never pass it on. Use `exec` in the script (or an exec-style command) so the signal reaches your program.",
        },
        {
          kind: "question",
          title: "Retire without casualties",
          body: "The slowest request has 16 seconds left. Choose how the program reacts and set the grace period so that **nothing is cut off and the process exits before SIGKILL**.",
          widget: { type: "ship-shutdown", props: { mode: "exit", grace: 10 } },
          question: { type: "widget", goal: { clean: true } },
          explanation: "Draining plus a grace period of at least 17 seconds (16 s for the slowest request, 1 s to close connections) is the combination that works. Too short a grace period and SIGKILL still cuts off the stragglers; too eager an exit loses everyone.",
        },
        {
          kind: "question",
          title: "The 40-second export",
          body: "Your service has a report export that takes up to 40 seconds. The platform's grace period is 30 seconds. What happens on every deploy?",
          question: {
            type: "choice",
            options: [
              "Exports running at that moment are killed halfway through",
              "SIGTERM waits for as long as any request needs",
              "The platform waits 40 seconds automatically",
              "The export finishes, because SIGKILL can be caught",
            ],
            answer: 0,
          },
          explanation: "The platform enforces the deadline you configured, not the one your code needs. Either raise the grace period above the longest request, or (usually better) move long work into a background job that can resume after a restart.",
        },
        {
          kind: "code",
          title: "Write the drain logic",
          body: "Finish this tiny `Server`. It must:\n\n- `accept(request_id)`: record the request as in flight and return `True`, **unless** the server is draining, in which case return `False` and record nothing.\n- `finish(request_id)`: remove a request from the in-flight set.\n- `on_sigterm()`: start draining.\n- `can_exit()`: `True` only when the server is draining **and** nothing is in flight.",
          language: "python",
          starter: `class Server:
    def __init__(self):
        self.draining = False
        self.inflight = set()

    def accept(self, request_id):
        # TODO: refuse while draining, otherwise remember the request
        return False

    def finish(self, request_id):
        pass

    def on_sigterm(self):
        pass

    def can_exit(self):
        return False
`,
          solution: `class Server:
    def __init__(self):
        self.draining = False
        self.inflight = set()

    def accept(self, request_id):
        if self.draining:
            return False
        self.inflight.add(request_id)
        return True

    def finish(self, request_id):
        self.inflight.discard(request_id)

    def on_sigterm(self):
        self.draining = True

    def can_exit(self):
        return self.draining and not self.inflight
`,
          tests: [
            {
              id: "t1",
              description: "Accepts requests while running",
              assertionCode: `_s = Server()\nassert _s.accept("a") is True, "A running server should accept a request"\nassert "a" in _s.inflight, "An accepted request should be in flight"`,
            },
            {
              id: "t2",
              description: "Refuses new requests after SIGTERM",
              assertionCode: `_s = Server()\n_s.on_sigterm()\nassert _s.accept("b") is False, "A draining server must refuse new requests"\nassert "b" not in _s.inflight, "A refused request must not be recorded"`,
            },
            {
              id: "t3",
              description: "Cannot exit until in-flight requests finish",
              assertionCode: `_s = Server()\n_s.accept("a")\n_s.on_sigterm()\nassert _s.can_exit() is False, "Request 'a' is still running"\n_s.finish("a")\nassert _s.can_exit() is True, "Nothing in flight and draining: safe to exit"`,
            },
            {
              id: "t4",
              description: "A server that was never told to stop does not exit, even if idle",
              assertionCode: `_s = Server()\nassert _s.can_exit() is False, "Without SIGTERM the server should keep running"`,
            },
          ],
          hints: ["`can_exit` is two conditions joined with `and`: draining, and the in-flight set is empty.", "`set.discard(x)` removes `x` if present and never raises."],
        },
        {
          kind: "recap",
          points: [
            "A platform stops a process by sending **SIGTERM** (a request you can handle), then **SIGKILL** (unstoppable) after the **grace period**.",
            "Ignoring or not handling SIGTERM drops in-flight requests or keeps accepting work until the kill.",
            "**Graceful shutdown**: stop accepting, finish in-flight work, release resources, exit.",
            "Size the grace period for your slowest request plus cleanup, and make sure the signal actually reaches your program (use `exec`).",
          ],
        },
      ],
    },

    // ─────────────────────────────── 5. Orchestration ───────────────────────────────
    {
      id: "fnd-ship-5-orchestration",
      title: "Orchestration: pods, deployments, services",
      summary: "Declare how many copies you want, and let a control loop keep it true. Kubernetes' core ideas, no cluster needed.",
      minutes: 9,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "Too many moving parts for a person",
          body: "One container on one server is easy to reason about. A real product has dozens of services, each wanting several copies, across many machines, with machines failing and traffic rising and falling. Nobody can keep that straight by hand.\n\nAn **orchestrator** does it for you. You describe what you *want*; the orchestrator keeps making reality match. **Kubernetes** is the most widely used one, and its vocabulary shows up everywhere, so we will learn the core ideas with a toy cluster.",
        },
        {
          kind: "explain",
          title: "Desired state and the control loop",
          body: "Imagine a rule taped inside a library wall: *\"Always keep three copies of the exam guide on the shelf.\"* Each morning the librarian counts. Two on the shelf? Fetch another. Four? Put one back. The rule is the **desired state**. The count is the **actual state**. The librarian's morning round is a **control loop**.\n\nOrchestrators work exactly like that. You never say \"start a container now\"; you say \"I want three\". Then a loop runs forever: *observe, compare, act*. If a machine dies at 2 a.m., nobody is paged to start a replacement: the next pass of the loop sees two, wants three, and creates one.",
        },
        {
          kind: "explain",
          title: "Meet the cast",
          body: "Four words cover most of it:\n\n- **Node**: one machine in the cluster.\n- **Pod**: the smallest thing Kubernetes runs: one container (sometimes a few tightly coupled ones) with its own network address. Pods are disposable.\n- **Deployment**: the declaration \"run N identical pods from this image, and update them safely.\" It is the thing you edit.\n- **Service**: a stable address in front of a changing set of pods. It sends traffic only to pods that are ready.\n\nBelow, the cluster wants 3 replicas. Tap a pod to crash it, take a machine down, change the replica count, and press **Next tick** to let the control loop take one pass.",
          widget: { type: "ship-cluster", props: { desired: 3 } },
        },
        {
          kind: "question",
          title: "Break it, let it heal",
          body: "Crash a pod, or take a machine down. Then let the loop run until the cluster is back to what you asked for.",
          widget: { type: "ship-cluster", props: { desired: 3 } },
          question: { type: "widget", goal: { converged: true, hadFailure: true, minTicks: 1 } },
          explanation: "Notice what *you* did after the failure: nothing. The controller saw fewer pods than desired, created replacements, the scheduler placed them on healthy machines, and the Service only included them once they were ready. Healing is the normal path, not an emergency procedure.",
        },
        {
          kind: "question",
          title: "Why a Service?",
          body: "Clients could call a pod's own IP address directly. Why does the Service exist?",
          question: {
            type: "choice",
            options: [
              "Pods are replaced all the time and each new pod has a new address, so clients need one stable address in front of them",
              "Pods cannot receive network traffic at all",
              "It makes containers run faster",
              "It stores the application's data",
            ],
            answer: 0,
          },
          explanation: "Pods come and go (deploys, crashes, scaling), and each replacement is a new pod with a new address. The Service is the fixed doorway that tracks which pods are currently ready and spreads requests across them.",
        },
        {
          kind: "question",
          title: "Three replicas, two dead",
          body: "A Deployment says `replicas: 3`. A machine failure kills two of the pods at once. What must an engineer do to get back to three?",
          question: {
            type: "choice",
            options: [
              "Nothing: the control loop notices two are missing and creates two replacements",
              "Manually start two new containers on a healthy machine",
              "Edit replicas to 5 so the missing two are covered",
              "Restart the whole cluster",
            ],
            answer: 0,
          },
          explanation: "The Deployment still says 3 and only 1 is running, so the difference is 2 and the loop creates 2. Hand-starting containers would fight the controller: it would see extras and delete them. You change the *declaration*, never the individual pods.",
        },
        {
          kind: "explain",
          title: "Updates and throwaway pods",
          body: "To ship a new version you edit the Deployment's image. It then starts pods with the new image and retires old ones gradually, within limits you set: how many extra pods may exist during the switch (*surge*) and how many may be missing (*unavailable*). If the new version misbehaves, going back means re-applying the previous declaration.\n\nOne rule makes this all workable: **pods are cattle, not pets**. Any pod can vanish at any moment and be replaced by a blank one. So a pod's local disk, in-memory sessions and uploaded files are all temporary. Anything that must survive lives outside: in a database, an object store or a mounted volume.",
        },
        {
          kind: "question",
          title: "The photo folder",
          body: "A service saves members' uploaded photos into a folder inside its own container. Which problem will you hit?",
          question: {
            type: "choice",
            options: [
              "Photos disappear whenever the pod is replaced, and pods other than the one that stored a photo can't see it",
              "Nothing: containers keep their files forever",
              "Kubernetes refuses to start pods that write files",
              "Photos are visible to every pod automatically",
            ],
            answer: 0,
          },
          explanation: "The writable layer belongs to one container and dies with it, and a second replica has its own separate folder. Store uploads in shared storage (an object store, or a volume that outlives pods).",
        },
        {
          kind: "code",
          title: "Be the controller",
          body: "Write `reconcile(desired, running)`. `running` is the list of pod names that exist. Return the list of actions the controller must take:\n\n- fewer pods than desired: one `\"create\"` per missing pod\n- more pods than desired: `\"delete NAME\"` for each extra pod, taking them from the **end** of the list\n- exactly right: an empty list",
          language: "python",
          starter: `def reconcile(desired, running):
    actions = []
    # TODO: compare len(running) with desired
    return actions
`,
          solution: `def reconcile(desired, running):
    actions = []
    if len(running) < desired:
        actions = ["create"] * (desired - len(running))
    elif len(running) > desired:
        actions = ["delete " + name for name in running[desired:]]
    return actions
`,
          tests: [
            { id: "t1", description: "Creates the missing pods", assertionCode: `assert reconcile(3, ["web-1", "web-2"]) == ["create"], "One pod missing: one create"\nassert reconcile(2, []) == ["create", "create"], "Two pods missing: two creates"` },
            { id: "t2", description: "Deletes the extra pods from the end", assertionCode: `_r = reconcile(2, ["a", "b", "c", "d"])\nassert _r == ["delete c", "delete d"], f"Expected ['delete c', 'delete d'], got {_r}"` },
            { id: "t3", description: "Does nothing when actual matches desired", assertionCode: `assert reconcile(2, ["a", "b"]) == [], "Nothing to do when counts match"\nassert reconcile(0, []) == [], "Zero wanted, zero running"` },
          ],
          hints: ["Compare `len(running)` with `desired` in an `if` / `elif`.", "The extras are `running[desired:]`; `[\"create\"] * 2` makes a list of two creates."],
        },
        {
          kind: "recap",
          points: [
            "You declare **desired state**; a **control loop** keeps observing, comparing and acting until actual matches it.",
            "**Node** = machine, **pod** = disposable unit running your container, **Deployment** = \"N identical pods, updated safely\", **Service** = stable address for ready pods.",
            "Never fix individual pods; change the declaration. Failures are handled by the same loop as everything else.",
            "Pods are throwaway, so keep durable state outside them.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 6. Probes ───────────────────────────────
    {
      id: "fnd-ship-6-probes",
      title: "Health probes",
      summary: "Liveness, readiness and startup probes, and the outages each misconfiguration causes.",
      minutes: 9,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "Running is not working",
          body: "From the outside, a process that is alive can still be useless: stuck in a deadlock, out of memory, or simply still loading a big map file. The orchestrator can see that the process exists, but not whether it is *any good*. So it asks, by calling a health endpoint (or opening a port, or running a command) on a schedule. Those questions are **probes**, and there are three kinds with three different consequences:\n\n- **Liveness**: \"Are you stuck beyond recovery?\" If it keeps failing, the container is **restarted**.\n- **Readiness**: \"Can you take traffic right now?\" If it fails, the pod is **removed from the load balancer** but left alone.\n- **Startup**: \"Have you finished booting?\" Until it passes, the other probes are held off.\n\nThe distinction is the whole game. Restart is a heavy hammer; \"stop sending me requests for a bit\" is a gentle one.",
        },
        {
          kind: "question",
          title: "Busy, not broken",
          body: "A pod is healthy but has 500 jobs queued and cannot keep up. You want it to stop receiving *new* requests until it catches up, without restarting it. Which probe should start failing?",
          question: {
            type: "choice",
            options: ["Liveness", "Readiness", "Startup", "None: restart is the only tool"],
            answer: 1,
          },
          explanation: "Readiness is the pressure valve: failing it takes the pod out of rotation without killing it, and when the queue drains the next probe passes and traffic returns. A failing liveness probe would restart a pod that was merely busy, throwing away its queue and making things worse.",
        },
        {
          kind: "explain",
          title: "The slow starter",
          body: "Here is a route-planning service that needs **45 seconds** to load its map data before it can answer. It joins a service that already has a healthy older pod. Its liveness probe starts after 10 s and restarts the container after 3 misses in a row, checking every 10 s. Run the defaults and read the three timelines: the container, whether the pod is in the load balancer, and the failed requests.",
          widget: { type: "ship-probes", props: {} },
        },
        {
          kind: "question",
          title: "When does the axe fall?",
          body: "Liveness: first check at **10 s**, every **10 s**, restart after **3** failures in a row. The app needs 45 s to start. At what second of its life is the container restarted?",
          question: { type: "number", answer: 30, unit: "s" },
          explanation: "Checks run at 10 s, 20 s and 30 s. The app is still loading at all three, so the third consecutive failure lands at **30 s**, fifteen seconds before it would have been ready. The restart wipes the progress, the cycle repeats, and it never gets there: a **crash loop**.",
        },
        {
          kind: "question",
          title: "Start cleanly",
          body: "Configure the probes so the app starts **without any restarts** and **without any failed requests**.",
          widget: { type: "ship-probes", props: {} },
          question: { type: "widget", goal: { maxRestarts: 0, maxFailed: 0 } },
          explanation: "Two fixes working together. Liveness must not judge the app before it can possibly be up (a long enough delay, or better, a **startup probe** that holds liveness off until boot is done). And **readiness** keeps the pod out of the load balancer until it answers, so users only hit the older, healthy pod meanwhile.",
        },
        {
          kind: "explain",
          title: "Probes that look too far",
          body: "It is tempting to make the health endpoint thorough: check the database, the cache, the payment provider. Resist, especially in liveness. A dependency being down is not a reason to restart *your* process: the restart cannot fix it, and every pod runs the same check, so they all fail together.\n\nRules of thumb:\n\n- **Liveness** checks only the process itself (can it run a trivial handler at all?).\n- **Readiness** checks things that are local to this pod (finished loading, not overloaded, not draining). Be very cautious about shared dependencies, because they take *all* pods out at once.\n- Probe endpoints should be cheap and must not themselves overload the dependency.\n\nTry it: the database disappears for 20 seconds. Sixty percent of requests need it; forty percent (cached menus) do not.",
          widget: { type: "ship-probe-deps", props: {} },
        },
        {
          kind: "question",
          title: "Predict the blast radius",
          body: "A team puts a database check into every pod's **readiness** probe. The database blips for 20 seconds. Three pods, one shared database. What do users see?",
          widget: { type: "ship-probe-deps", props: { where: "readiness" }, after: true },
          question: {
            type: "choice",
            options: [
              "Only requests that need the database fail; the rest keep working",
              "All three pods leave the load balancer together, so every request fails, even ones that never touched the database",
              "Pods restart one at a time and users barely notice",
              "Nothing: readiness checks never affect traffic",
            ],
            answer: 1,
          },
          explanation: "Every pod asks the same question and gets the same answer, so the entire fleet goes unready at the same instant and the Service has no endpoints. A check meant to protect users turned a partial degradation into a total outage. (The widget is open now: compare all three placements.)",
        },
        {
          kind: "code",
          title: "Write the two answers",
          body: "Write `probe_results(app)` returning `{\"live\": ..., \"ready\": ...}` from a dictionary describing the pod:\n\n- **live** is `True` unless the event loop is stuck: `app[\"loop_lag_ms\"] >= 5000`.\n- **ready** is `True` only if the app has `loaded`, is **not** `draining`, and its `queue_depth` is below 100.\n\nThe dictionary also has a `db_ok` key. Do **not** use it: dependencies stay out of both probes.",
          language: "python",
          starter: `def probe_results(app):
    live = True
    ready = True
    # TODO: live is False when the event loop lags by 5000 ms or more
    # TODO: ready needs loaded, not draining, and queue_depth below 100
    return {"live": live, "ready": ready}
`,
          solution: `def probe_results(app):
    live = app["loop_lag_ms"] < 5000
    ready = app["loaded"] and not app["draining"] and app["queue_depth"] < 100
    return {"live": live, "ready": ready}
`,
          tests: [
            {
              id: "t1",
              description: "A healthy pod is live and ready",
              assertionCode: `_a = {"loop_lag_ms": 20, "loaded": True, "draining": False, "queue_depth": 3, "db_ok": True}\nassert probe_results(_a) == {"live": True, "ready": True}, f"Got {probe_results(_a)}"`,
            },
            {
              id: "t2",
              description: "Still loading: alive but not ready",
              assertionCode: `_a = {"loop_lag_ms": 20, "loaded": False, "draining": False, "queue_depth": 0, "db_ok": True}\nassert probe_results(_a) == {"live": True, "ready": False}, f"Got {probe_results(_a)}"`,
            },
            {
              id: "t3",
              description: "Draining or overloaded: not ready, but not restarted",
              assertionCode: `_d = {"loop_lag_ms": 20, "loaded": True, "draining": True, "queue_depth": 0, "db_ok": True}\n_q = {"loop_lag_ms": 20, "loaded": True, "draining": False, "queue_depth": 500, "db_ok": True}\nassert probe_results(_d) == {"live": True, "ready": False}, f"draining: {probe_results(_d)}"\nassert probe_results(_q) == {"live": True, "ready": False}, f"overloaded: {probe_results(_q)}"`,
            },
            {
              id: "t4",
              description: "A stuck event loop is not live",
              assertionCode: `_a = {"loop_lag_ms": 8000, "loaded": True, "draining": False, "queue_depth": 0, "db_ok": True}\nassert probe_results(_a)["live"] is False, "A loop that lags 8 s is stuck"`,
            },
            {
              id: "t5",
              description: "The database being down does not change either answer",
              assertionCode: `_a = {"loop_lag_ms": 20, "loaded": True, "draining": False, "queue_depth": 3, "db_ok": False}\nassert probe_results(_a) == {"live": True, "ready": True}, "db_ok must not be part of liveness or readiness"`,
            },
          ],
          hints: ["`live` is one comparison: `app[\"loop_lag_ms\"] < 5000`.", "`ready` is three conditions joined with `and`; remember `not app[\"draining\"]`."],
        },
        {
          kind: "recap",
          points: [
            "**Liveness** failing = restart. **Readiness** failing = out of the load balancer. **Startup** holds the others off while the app boots.",
            "A liveness probe that fires before the app can possibly be up creates a **crash loop**; use a startup probe or a long enough delay.",
            "Readiness keeps traffic away from pods that are loading, overloaded or draining.",
            "Don't put shared dependencies in probes: every pod fails together and a blip becomes an outage, or a restart storm.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 7. Zero-downtime deploys ───────────────────────────────
    {
      id: "fnd-ship-7-deploys",
      title: "Zero-downtime deploys",
      summary: "Rolling, blue-green and canary releases, error-rate gates, and why database changes must work with two versions at once.",
      minutes: 10,
      xp: 55,
      steps: [
        {
          kind: "explain",
          title: "Replacing an engine in flight",
          body: "The simplest deploy is: stop the old version, start the new one. For the minute in between, nobody is home. That is fine for a hobby site and unacceptable for anything people rely on.\n\nSo real deploys keep the old version serving while the new one comes in. The three common patterns differ in *how* traffic moves over:\n\n- **Rolling**: replace instances a few at a time. At every moment some run the old version and some the new.\n- **Blue-green**: build a complete second fleet (\"green\") beside the live one (\"blue\"), test it, then flip the router so everyone moves at once.\n- **Canary**: send a small slice of real traffic, say 5%, to the new version first; widen in stages while watching the numbers. (Miners took canaries underground to detect gas before it reached people.)\n\nStep through each. The new version below is healthy for now.",
          widget: { type: "ship-rollout", props: { bug: false, gate: false } },
        },
        {
          kind: "question",
          title: "Least damage from a bad release",
          body: "Version 2 has a bug that fails 8% of the requests it serves, and the **automatic gate** halts the rollout when version 2's own error rate passes 2%. Pick the strategy that lets **fewer than 10 requests** fail. Run each to the end.",
          widget: { type: "ship-rollout", props: { bug: true, gate: true, lockBug: true, strategy: "rolling" } },
          question: { type: "widget", goal: { finished: true, aborted: true, maxBad: 9 } },
          explanation: "A **canary** exposes only 5% of traffic before the gate trips: about 4 failed requests. A rolling deploy had already moved 20% (16 failures) by the first check, and blue-green sent everyone to the bad version at once (80). The strategy sets the *blast radius*; the gate decides how long it lasts.",
        },
        {
          kind: "explain",
          title: "Trade-offs",
          body: "No pattern wins everywhere:\n\n- **Rolling** needs little extra capacity and is the default in most orchestrators, but rollback is slow (you roll the rollout backwards) and old and new coexist the whole time.\n- **Blue-green** gives an instant, tidy switch and an instant way back while blue stands by, but you pay for two full fleets, and every user meets the new version at once.\n- **Canary** has the smallest blast radius, but it needs good metrics and enough traffic in the slice to tell \"bad\" from \"noise\": 5% of a quiet service might be only a handful of requests.\n\nAll three share one demand that is easy to forget: **for a while, two versions of your code run at the same time**, against the same database.",
        },
        {
          kind: "question",
          title: "Choose for the situation",
          body: "A change to payment confirmation must not hit every customer if it is wrong, and the team cannot afford to double its servers. Which strategy fits best?",
          question: {
            type: "choice",
            options: [
              "Blue-green, because the instant switch protects everyone",
              "Canary: a small slice first, little extra capacity, widen only while the numbers stay good",
              "Stop the old version and start the new one in the quiet hours",
              "Rolling with no health checks, since it is the default",
            ],
            answer: 1,
          },
          explanation: "The constraints are \"limit exposure\" and \"no doubling\". Canary gives the smallest blast radius with about one extra instance. Blue-green moves everyone at once and costs a second fleet; stopping and restarting is downtime by design.",
        },
        {
          kind: "explain",
          title: "Two versions, one database",
          body: "Renaming a column sounds trivial: `due_date` becomes `return_by`. But during any deploy, the old app (which says `due_date`) and the new app (which says `return_by`) are alive together. Whichever order you do it in, one of them breaks.\n\nThe safe method is **expand and contract** (also called parallel change): never *replace* something in one step. First **expand** the database so it supports both old and new. Move the application over in compatible steps. Only when nothing uses the old shape do you **contract** and remove it.\n\nTry the three plans. A cross marks any running version that would fail at that step.",
          widget: { type: "ship-schema", props: { plan: "migrate-first" } },
        },
        {
          kind: "question",
          title: "A rename nobody notices",
          body: "Pick the plan where every running version works at every step, and follow it to the end.",
          widget: { type: "ship-schema", props: { plan: "migrate-first" } },
          question: { type: "widget", goal: { plan: "expand", finished: true, broke: false } },
          explanation: "Each step of expand and contract is compatible with the step before and after it, so a deploy can be paused or rolled back anywhere. The one-shot rename \"works\" only if nobody serves a request during the rollout.",
        },
        {
          kind: "question",
          title: "In order",
          body: "Put the expand-and-contract steps for renaming a column in order.",
          question: {
            type: "order",
            items: [
              "Add the new column, empty and optional",
              "Deploy code that writes both columns",
              "Backfill old rows into the new column",
              "Deploy code that reads the new column",
              "Drop the old column",
            ],
          },
          explanation: "Add first, so nothing breaks. Dual-write, so new rows are complete. Backfill, so old rows are too. Only then switch reads. Dropping is last because it is the one step you cannot take back.",
        },
        {
          kind: "question",
          title: "Rolling back mid-way",
          body: "After you deploy code that **reads the new column** (it still writes both), a bug turns up and you roll that deploy back to the previous version, which reads the old column. Is the data still correct?",
          question: {
            type: "choice",
            options: [
              "Yes, because the new version kept writing the old column too",
              "No, the old column stopped being updated the moment the new version deployed",
              "Only if you restore a database backup first",
              "No, rollbacks always lose data",
            ],
            answer: 0,
          },
          explanation: "Dual-writing is what buys you the safe way back. The old column was kept up to date the whole time, so the previous version finds exactly the data it expects. If the new code had stopped writing it, rolling back would serve stale values.",
        },
        {
          kind: "recap",
          points: [
            "**Rolling** replaces instances gradually; **blue-green** flips a router between two full fleets; **canary** widens a small slice of traffic in stages.",
            "A health or error-rate **gate** is what turns a staged rollout into a safe one: it limits the blast radius by stopping early.",
            "During any rollout, **old and new code run together**, so every change must be compatible with both.",
            "Change databases by **expand, migrate, contract**: add, dual-write, backfill, switch reads, and only then drop.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 8. Feature flags ───────────────────────────────
    {
      id: "fnd-ship-8-flags",
      title: "Feature flags",
      summary: "Separating deploy from release: gradual rollouts with stable bucketing, kill switches, and keeping flag debt in check.",
      minutes: 9,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "Deploy is not release",
          body: "Two words that sound alike are separate decisions:\n\n- **Deploy**: put new code on the servers.\n- **Release**: let users actually experience the new behaviour.\n\nA **feature flag** is what pulls them apart. The new code ships wrapped in an `if` whose answer comes from configuration that can change while the program runs:\n\n" +
            py(`
if flags.is_enabled("new-renewal-flow", member):
    return renew_v2(member, book)
return renew_v1(member, book)
`) +
            "\nNow a risky change can be deployed on Tuesday, switched on for staff on Wednesday, for 5% of members on Thursday, and for everyone next week, with no new deploy at any step. Switching it *off* is just as quick.",
        },
        {
          kind: "explain",
          title: "Turn the dial",
          body: "A library's new renewal flow sits behind a flag. Slide the rollout and watch members light up. Then press the kill switch.",
          widget: { type: "ship-flags", props: { percent: 0, basic: true } },
        },
        {
          kind: "question",
          title: "Exactly twenty",
          body: "Roll the new flow out to **exactly 20** of the 100 members.",
          widget: { type: "ship-flags", props: { percent: 0, basic: true } },
          question: { type: "widget", goal: { enabled: 20, killed: false } },
          explanation: "A 20% rollout enables 20 of every 100 members. You choose the exposure, and it can be 1% for a first look or 50% to compare two behaviours at scale.",
        },
        {
          kind: "question",
          title: "The fines are doubling",
          body: "The new flow starts charging some members twice. Roll it back for **everyone, right now**, without deploying.",
          widget: { type: "ship-flags", props: { percent: 60, basic: true } },
          question: { type: "widget", goal: { killed: true, enabled: 0 } },
          explanation: "That is the kill switch: a flag flipped off takes effect in seconds, because the code that checks it is already running. No build, no pipeline, no rollout to wait for. This is the single biggest safety win of flags.",
        },
        {
          kind: "explain",
          title: "Stable bucketing",
          body: "How should the flag decide *which* 20% of members? Not by a coin flip on each request: then a member would see the new flow on one page and the old flow on the next, and you could never tell whether the new flow was better.\n\nInstead, hash the flag's name together with the member's id into a number from 0 to 99, and enable the flag when that number is below the rollout percentage:\n\n" +
            text(`
bucket = hash("new-renewal-flow" + ":" + member_id) mod 100
enabled = bucket < percent
`) +
            "\nThe same member always lands in the same bucket, so they get the same answer on every visit. Raising 20% to 40% keeps everyone who already had it and adds more: nobody loses the feature. Including the flag name in the hash means each flag shuffles members differently, so the same unlucky people are not always the first to try everything.",
        },
        {
          kind: "question",
          title: "Re-rolling the dice",
          body: "A flag set to 50% decides with a fresh coin flip on every page load. Roughly how many of 100 members will have a **different** answer after everyone reloads once?",
          widget: { type: "ship-flags", props: { percent: 50, sticky: false }, after: true },
          question: { type: "number", answer: 50, tolerance: 12 },
          explanation: "For each member, the chance the new flip differs from the old one is 2 x 0.5 x 0.5 = 50%, so about half of everyone flips. (Try it in the widget that just unlocked: it is set to re-roll, and switching on \"Same answer on every visit\" makes the red outlines vanish.)",
        },
        {
          kind: "explain",
          title: "Flags have a life cycle",
          body: "Flags come in different lengths:\n\n- **Release flags** guard a new feature during rollout. They should be *short-lived*: once it is at 100% and stable, delete the flag and the old code path.\n- **Kill switches** are permanent safety valves for risky dependencies (\"turn off the recommendations panel\").\n- **Experiments** compare variants for a fixed time, then end.\n- **Permission flags** control who gets a paid or beta capability, and may live forever by design.\n\nThe danger is **flag debt**. Every flag doubles the number of ways the program can behave: ten flags means over a thousand combinations, and nobody has tested most of them. Old flags also hide dead code that confuses the next reader. Healthy teams give each flag an owner and a removal date when it is created.",
        },
        {
          kind: "question",
          title: "Eight months at 100%",
          body: "The `checkout-v2` flag has been on for every user for eight months, and nobody has touched the old checkout code since. What should happen?",
          question: {
            type: "choice",
            options: [
              "Leave it: it's harmless and might be handy someday",
              "Delete the flag and the old code path, so there is only one behaviour left to understand",
              "Turn it off again to see what breaks",
              "Rename the flag so it looks newer",
            ],
            answer: 1,
          },
          explanation: "A finished release flag is clutter with risk attached: someone might flip it, the old path is untested, and every reader must work out which branch is real. Removing it is the last step of the release.",
        },
        {
          kind: "code",
          title: "Write the flag check",
          body: "Write `is_enabled(flag, user_id)` using stable bucketing. The `flag` dictionary has `name`, `percent` (0 to 100), `killed` (bool) and `allow` (a list of user ids who always get it).\n\n1. If the flag is `killed`, return `False` (even for allow-listed users).\n2. If the user is in `allow`, return `True`.\n3. Otherwise compute `bucket(flag[\"name\"], user_id)` and enable when it is **below** `percent`.\n\nThe `bucket` helper is written for you. It uses `zlib.crc32`, a fast hash.",
          language: "python",
          starter: `import zlib

def bucket(flag_name, user_id):
    return zlib.crc32((flag_name + ":" + user_id).encode()) % 100

def is_enabled(flag, user_id):
    # TODO: killed first, then the allow list, then the percentage
    return False
`,
          solution: `import zlib

def bucket(flag_name, user_id):
    return zlib.crc32((flag_name + ":" + user_id).encode()) % 100

def is_enabled(flag, user_id):
    if flag["killed"]:
        return False
    if user_id in flag["allow"]:
        return True
    return bucket(flag["name"], user_id) < flag["percent"]
`,
          tests: [
            {
              id: "t1",
              description: "0% enables nobody, 100% enables everybody",
              assertionCode: `_users = [f"m{i}" for i in range(200)]\n_zero = {"name": "f", "percent": 0, "killed": False, "allow": []}\n_all = {"name": "f", "percent": 100, "killed": False, "allow": []}\nassert not any(is_enabled(_zero, u) for u in _users), "0% should enable nobody"\nassert all(is_enabled(_all, u) for u in _users), "100% should enable everybody"`,
            },
            {
              id: "t2",
              description: "The same user always gets the same answer",
              assertionCode: `_f = {"name": "renewal", "percent": 30, "killed": False, "allow": []}\nfor _u in ["m1", "m2", "m3", "m4", "m5", "m6"]:\n    assert is_enabled(_f, _u) == is_enabled(_f, _u), "A user's answer must not change between calls"`,
            },
            {
              id: "t3",
              description: "Raising the percentage only adds users, never removes them",
              assertionCode: `_users = [f"m{i}" for i in range(300)]\n_low = {"name": "renewal", "percent": 10, "killed": False, "allow": []}\n_high = {"name": "renewal", "percent": 40, "killed": False, "allow": []}\nfor _u in _users:\n    if is_enabled(_low, _u):\n        assert is_enabled(_high, _u), f"{_u} had the flag at 10% and must still have it at 40%"`,
            },
            {
              id: "t4",
              description: "A 25% rollout lands near 25% of 1000 users",
              assertionCode: `_f = {"name": "renewal", "percent": 25, "killed": False, "allow": []}\n_n = sum(is_enabled(_f, f"m{i}") for i in range(1000))\nassert 200 <= _n <= 300, f"Expected roughly 250 of 1000 users, got {_n}"`,
            },
            {
              id: "t5",
              description: "The allow list wins over the percentage, the kill switch wins over everything",
              assertionCode: `_f = {"name": "renewal", "percent": 0, "killed": False, "allow": ["staff1"]}\nassert is_enabled(_f, "staff1") is True, "Allow-listed users always get it"\n_k = {"name": "renewal", "percent": 100, "killed": True, "allow": ["staff1"]}\nassert is_enabled(_k, "staff1") is False and is_enabled(_k, "m9") is False, "A killed flag is off for everyone"`,
            },
          ],
          hints: ["Check `flag[\"killed\"]` first and return early.", "The last line is one comparison: `bucket(...) < flag[\"percent\"]`."],
        },
        {
          kind: "recap",
          points: [
            "**Deploy** moves code; **release** changes what users see. A flag separates the two.",
            "Gradual rollouts, targeting groups and an instant **kill switch** are the payoff.",
            "Use **stable bucketing** (hash of flag name + user id) so each user gets a consistent answer and rollouts only grow.",
            "Flags are **debt**: give each an owner and an end date, and delete release flags once they are at 100%.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 9. Serverless ───────────────────────────────
    {
      id: "fnd-ship-9-serverless",
      title: "Serverless and cold starts",
      summary: "Functions that run on demand, what a cold start is made of, and when serverless is the right shape.",
      minutes: 8,
      xp: 45,
      steps: [
        {
          kind: "explain",
          title: "Functions on demand",
          body: "In the **serverless** model you hand the platform a function and an event to trigger it (an HTTP request, a file upload, a timer). You do not provision machines. The platform starts an **instance** of your function when work arrives, runs it, keeps it around for a little while in case more comes, and eventually throws it away. When nothing is happening there are zero instances and you pay nothing. (Servers still exist; you just don't manage them.)\n\nThe typical rules: **one request at a time per instance**, so a burst of 20 simultaneous requests needs 20 instances, and the platform may freeze an instance after a short idle period.",
        },
        {
          kind: "question",
          title: "Who waits?",
          body: "A function has been idle for ten minutes. Then one request arrives. Compared with a function that served a request a second ago, what is different?",
          question: {
            type: "choice",
            options: [
              "Nothing: all requests cost the same",
              "This request must wait while the platform fetches the code, starts the runtime and runs initialisation: a cold start",
              "This request is rejected until the platform warms up",
              "This request runs faster because the server is rested",
            ],
            answer: 1,
          },
          explanation: "With no warm instance available, the platform builds one first. That extra delay, paid by whichever request arrives, is the **cold start**. Subsequent requests reuse the now-warm instance and skip it.",
        },
        {
          kind: "explain",
          title: "Watch a function warm up and cool down",
          body: "Eighteen requests arrive over two minutes: a small burst, a trickle, a long quiet gap, a bigger burst, and two stragglers. Amber is waiting for a cold start; lime is the actual work. Change the runtime, the package size, how long the platform keeps idle instances warm, and how many instances you pay to keep ready.",
          widget: { type: "ship-coldstart", props: {} },
        },
        {
          kind: "question",
          title: "No request over 400 ms",
          body: "With the typical Node app, some requests wait over half a second. Adjust the settings so the **slowest request is 400 ms or less**.",
          widget: { type: "ship-coldstart", props: { runtime: "node", packageMb: 60, minWarm: 0 } },
          question: { type: "widget", goal: { maxWorst: 400 } },
          explanation: "You can attack the cold start itself (a smaller package or a lighter runtime shortens every start) or avoid it by paying for instances kept warm. Notice that warm instances only cover requests up to that count: the burst of six needs six.",
        },
        {
          kind: "explain",
          title: "What goes into a cold start",
          body: "A cold start is the sum of several steps:\n\n1. The platform finds capacity and downloads your **package**. Bigger packages take longer.\n2. It starts the **runtime** (a compiled binary starts in milliseconds; a heavy framework can take seconds).\n3. Your **initialisation code** runs: imports, reading config, opening connections, loading models.\n4. Only then does the **handler** run for the request.\n\nYou control 1 and 3 the most. Keep dependencies lean, import heavy libraries lazily if only some requests need them, and avoid doing slow work at start-up that you could do later or once.\n\nThere is a flip side that is a feature: anything created **outside** the handler (at module level) is built once per instance and reused by every warm request on it. That is the right place for a database client or a loaded configuration.",
        },
        {
          kind: "question",
          title: "Where does the connection go?",
          body: "A function queries a database on every request. Where should the connection be created for the best performance on warm requests?",
          question: {
            type: "choice",
            options: [
              "Inside the handler, so each request opens its own",
              "At module level, outside the handler, so a warm instance reuses it (and put a connection pooler in front of the database, since every instance holds one)",
              "In a new thread started per request",
              "Never: functions can't talk to databases",
            ],
            answer: 1,
          },
          explanation: "Reusing the connection avoids a slow handshake on every request. The catch to remember: a burst of 200 instances is 200 open connections, and databases have limits, which is why pooling proxies are common companions to serverless.",
        },
        {
          kind: "question",
          title: "Good fit?",
          body: "Pick every workload where serverless is a strong fit.",
          question: {
            type: "choice",
            options: [
              "Making thumbnails whenever a member uploads a photo (bursty, event-driven)",
              "A webhook receiver that gets 50 calls on a busy day and none most days",
              "Transcoding a six-hour video in one go",
              "A matching engine that must answer in 5 ms, every time, around the clock",
            ],
            answer: [0, 1],
          },
          explanation: "Serverless shines for spiky, unpredictable or event-driven work where idle time is common and cold starts do not matter. It fits badly when a single job runs longer than platform time limits, when tail latency must be tiny and consistent, or when traffic is a steady flood where always-on servers are cheaper.",
        },
        {
          kind: "code",
          title: "Count the cold starts",
          body: "A function has one instance, and the platform discards it after it has been idle for more than `idle_timeout` seconds. Given the sorted request times in seconds (assume each request is instant), write `count_cold_starts(arrivals, idle_timeout)`. The first request is always cold. Any later request is cold if more than `idle_timeout` seconds passed since the previous one.\n\n" +
            py(`
count_cold_starts([0, 5, 12], 30)         # 1: only the first
count_cold_starts([0, 5, 100, 104], 30)   # 2: first, and after the long gap
`),
          language: "python",
          starter: `def count_cold_starts(arrivals, idle_timeout):
    cold = 0
    previous = None
    for t in arrivals:
        # TODO: count a cold start for the first request,
        # or when the gap since the previous one exceeds idle_timeout
        previous = t
    return cold
`,
          solution: `def count_cold_starts(arrivals, idle_timeout):
    cold = 0
    previous = None
    for t in arrivals:
        if previous is None or t - previous > idle_timeout:
            cold += 1
        previous = t
    return cold
`,
          tests: [
            { id: "t1", description: "Only the first request is cold when requests keep coming", assertionCode: `assert count_cold_starts([0, 5, 12], 30) == 1, "Only the first request should be cold"` },
            { id: "t2", description: "A long gap cools the instance", assertionCode: `assert count_cold_starts([0, 5, 100, 104], 30) == 2, "The request after a 95 s gap is cold too"` },
            { id: "t3", description: "A gap exactly equal to the timeout is still warm", assertionCode: `assert count_cold_starts([0, 30], 30) == 1, "30 s idle with a 30 s timeout is not more than the timeout"` },
            { id: "t4", description: "No requests, no cold starts", assertionCode: `assert count_cold_starts([], 30) == 0, "An empty list has no cold starts"` },
          ],
          hints: ["`previous is None` is true only for the very first request.", "Compare `t - previous > idle_timeout` (strictly greater)."],
        },
        {
          kind: "recap",
          points: [
            "**Serverless** runs your function on demand, scales instances with concurrent requests, and can scale to zero.",
            "A **cold start** (fetch package, start runtime, run init) is paid by the request that finds no warm instance, most visibly after quiet periods and in bursts.",
            "Shorten it with small packages, light runtimes and lean initialisation; avoid it with warm instances you pay to keep ready.",
            "Create reusable clients **outside** the handler, and choose serverless for spiky, event-driven work rather than long jobs or tight, constant latency.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 10. Rollbacks and release safety ───────────────────────────────
    {
      id: "fnd-ship-10-rollback",
      title: "Rollbacks and release safety",
      summary: "Mitigate first, diagnose later: how to get back to safety fast, and the habits that make releases boring.",
      minutes: 8,
      xp: 45,
      steps: [
        {
          kind: "explain",
          title: "The way back is part of the release",
          body: "Every release can go wrong, so every release needs a rehearsed way back. You have three levers, from fastest to slowest:\n\n1. **Turn the flag off.** Seconds. Works only if the change was behind a flag.\n2. **Roll back.** Redeploy the previous known-good artifact. Minutes. This is why artifacts are immutable and kept: the old one is still there, byte for byte.\n3. **Roll forward.** Write and ship a fix. Slowest, and the right choice only when going back is impossible or the fix is trivial.\n\nWhen users are being hurt, the aim is to **stop the harm first** and understand it afterwards. Investigating live while the error rate is climbing is how a ten-minute problem becomes a two-hour one.",
        },
        {
          kind: "question",
          title: "When back is not safe",
          body: "Rolling back is only safe if the old version still works with the world as the new version left it. Which of these makes a rollback **unsafe**? Pick all that apply.",
          question: {
            type: "choice",
            options: [
              "The new release ran a migration that dropped a column the old version reads",
              "The new version writes records in a format the old version cannot parse",
              "The new release only changed the text on a button",
              "The new version added an optional database column that the old version simply ignores",
            ],
            answer: [0, 1],
          },
          explanation: "Anything the new version *destroyed* (dropped data) or *changed irreversibly* (data the old code cannot read) is a one-way door. Additive, ignorable changes keep the door open. This is the same compatibility rule as expand and contract, seen from the other side.",
        },
        {
          kind: "question",
          title: "First things first",
          body: "A deploy goes out at 14:00 and the error rate starts climbing at 14:03. Put the response in a sensible order.",
          question: {
            type: "order",
            items: [
              "An alert fires: errors are above the threshold",
              "Pause the rollout and flip the feature flag off",
              "Roll back to the previous artifact if the errors continue",
              "Check that error rates and latency return to normal",
              "Investigate the root cause",
              "Write a blameless review and follow up",
            ],
          },
          explanation: "Detect, stop the damage with the fastest lever, escalate to a rollback if needed, **verify** that it worked (never assume), and only then dig for causes. The review comes last and is about the system, not about whoever pushed the button.",
        },
        {
          kind: "explain",
          title: "Habits that make releases boring",
          body: "Teams that ship constantly are not braver; they have arranged for failures to be small and cheap:\n\n- **Small changes.** A release of one change has one suspect. A release of forty has forty, and a rollback throws away thirty-nine good ones.\n- **Automatic gates.** Health checks, smoke tests and canary analysis catch most problems before a human is involved.\n- **Visible releases.** Mark deploys on your graphs so \"errors began when version 214 went out\" is a glance, not a debate.\n- **Observable by default.** You cannot decide to roll back if you cannot see the harm. (The next module is about exactly that.)\n- **Practised rollbacks.** A rollback tried only during a crisis is untested code. Run it regularly, when nothing is on fire.\n- **Clear ownership.** Someone has the authority and the runbook to pull the lever without asking for permission.",
        },
        {
          kind: "question",
          title: "Why small releases?",
          body: "Which best explains why releasing small changes often is *less* risky than releasing a big batch rarely?",
          question: {
            type: "choice",
            options: [
              "Small releases cannot contain bugs",
              "When something breaks, there are fewer suspects, the diff is easy to read, and rolling back discards little",
              "Big batches are tested less because the pipeline is slower",
              "Users prefer many tiny updates",
            ],
            answer: 1,
          },
          explanation: "Bugs are as likely per change, but a small release makes each failure cheap to *locate* and cheap to *undo*. Risk comes from not knowing which of many changes is responsible.",
        },
        {
          kind: "question",
          title: "Is the canary big enough?",
          body: "Total traffic is **8,000 requests per minute**. A canary takes **5%** of it and is watched for **10 minutes**. How many requests does the canary see in total?",
          question: { type: "number", answer: 4000 },
          explanation: "8,000 x 0.05 = 400 per minute, times 10 minutes = **4,000**. Enough to tell a 2% error rate (about 80 failures) from a 0.1% baseline (about 4). On a service with 200 requests a minute, the same canary would see only 100 requests and could not tell noise from a bug: size the slice and the wait to your traffic.",
        },
        {
          kind: "code",
          title: "Choose the rollback target",
          body: "Releases are listed oldest to newest, and the last one is the current (bad) release. Write `rollback_target(releases)` returning the **version string** of the most recent release *before the current one* that is marked `healthy`, or `None` if there isn't one.\n\n" +
            py(`
releases = [
    {"version": "v41", "healthy": True},
    {"version": "v42", "healthy": False},   # shipped, then found broken
    {"version": "v43", "healthy": True},
    {"version": "v44", "healthy": True},    # current: now misbehaving
]
rollback_target(releases)   # "v43"
`),
          language: "python",
          starter: `def rollback_target(releases):
    # TODO: look at the releases before the last one, newest first,
    # and return the version of the first one that is healthy
    return None
`,
          solution: `def rollback_target(releases):
    for release in reversed(releases[:-1]):
        if release["healthy"]:
            return release["version"]
    return None
`,
          tests: [
            {
              id: "t1",
              description: "Goes back one release when the previous one was healthy",
              assertionCode: `_r = [{"version": "v1", "healthy": True}, {"version": "v2", "healthy": True}, {"version": "v3", "healthy": True}]\nassert rollback_target(_r) == "v2", f"Expected v2, got {rollback_target(_r)}"`,
            },
            {
              id: "t2",
              description: "Skips releases that were marked unhealthy",
              assertionCode: `_r = [{"version": "v41", "healthy": True}, {"version": "v42", "healthy": False}, {"version": "v43", "healthy": False}, {"version": "v44", "healthy": True}]\nassert rollback_target(_r) == "v41", f"Expected v41, got {rollback_target(_r)}"`,
            },
            { id: "t3", description: "Never returns the current release", assertionCode: `_r = [{"version": "v1", "healthy": False}, {"version": "v2", "healthy": True}]\nassert rollback_target(_r) is None, "The only healthy release is the current one: nowhere to go back to"` },
            { id: "t4", description: "A single release has nothing to roll back to", assertionCode: `assert rollback_target([{"version": "v1", "healthy": True}]) is None, "First release ever: no earlier version"\nassert rollback_target([]) is None, "No releases at all"` },
          ],
          hints: ["`releases[:-1]` is everything except the current release; `reversed(...)` walks newest first.", "Return as soon as you find a healthy one; if the loop ends, return `None`."],
        },
        {
          kind: "recap",
          points: [
            "Your levers, fastest first: **flag off**, **roll back** to the previous artifact, **roll forward** with a fix. Stop the harm first, diagnose afterwards.",
            "A rollback is safe only if the old version still works with the data the new one left behind: additive changes keep the door open, destructive ones close it.",
            "Small, frequent releases with **automatic gates**, **visible deploy markers** and **practised rollbacks** make failure small and cheap.",
            "Size a canary to your traffic: it must see enough requests to tell a bug from noise.",
          ],
        },
      ],
    },
  ],
};
