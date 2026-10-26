import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (schemas, tables). */
const txt = (code: string) => "~~~text\n" + code.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 8 to 10 of "Shipping AI features": inference and cost, agents, tool servers. */
export const aiLessonsC: ConceptLesson[] = [
  // ─────────────────────────────── 8. LLM inference and cost ───────────────────────────────
  {
    id: "fnd-ai-8-inference",
    title: "LLM inference and cost",
    summary: "Tokens, context windows, batching, streaming and cold starts: why an answer takes the time and money it does.",
    minutes: 10,
    xp: 70,
    steps: [
      {
        kind: "explain",
        title: "Models read in tokens",
        body: P(
          "A language model does not see letters or words. Text is first cut into **tokens**: pieces that are usually a short common word, part of a longer word, a few digits or a punctuation mark. Everything is counted, limited and **priced** in tokens.",
          "Real tokenizers are learned from data; the toy one below follows the same spirit. Common short words are one token each, long or rare words break into several, numbers split into groups of digits, and other scripts cost more per character. Pick a sample, then edit the text.",
        ),
        widget: { type: "ai-tokens", props: {} },
      },
      {
        kind: "question",
        title: "Say more for less",
        body: "Write a message of **at least 60 characters** that costs **16 tokens or fewer**. (Hint: which words are cheap?)",
        widget: { type: "ai-tokens", props: { sample: "plain" } },
        question: { type: "widget", goal: { minChars: 60, maxTokens: 16 } },
        explanation: "Short, common words are one token each, so a sentence of 4 to 6 letter words costs about one token per word plus punctuation. Rare, long words, product codes and non-English text can cost 2 to 5 times as much per character. Budget by **tokens**, not characters or words.",
      },
      {
        kind: "explain",
        title: "One window for everything",
        body: P(
          "A model can only attend to a limited number of tokens at once: its **context window**. Everything shares it: the rules you give it, the conversation so far, the passages you retrieved, the user’s question, **and the answer it is about to write**.",
          "If the total is too large the request fails, or an old part is silently dropped. Even when it fits, more is not better: long prompts cost more, run slower, and models can overlook a detail buried in the middle. Below, the request is too big. Slide things until it fits.",
        ),
        widget: { type: "ai-budget", props: {} },
      },
      {
        kind: "question",
        title: "Make it fit",
        body: "The window is **8,192 tokens**. Trim until the request **fits**, still retrieving **at least 6 passages** and reserving **at least 1,000 tokens** for the answer.",
        widget: { type: "ai-budget", props: { window: 8192 } },
        question: { type: "widget", goal: { fits: true, window: 8192, minChunks: 6, minReserve: 1000 } },
        explanation: "Shorter passages, fewer chat turns kept (summarise old ones instead) and a sensible answer limit are the three levers. Picking a bigger window is the lazy one: it costs more per request and does not help the model find the one sentence that matters.",
      },
      {
        kind: "explain",
        title: "Prefill, decode and sharing the GPU",
        body: P(
          "Answering has two phases. **Prefill** reads the whole prompt in one go, which is fast because the GPU does it in parallel. **Decode** writes the answer **one token at a time**, and each new token needs a full pass over the model. Decode is the slow part, and it is limited by how fast the GPU can fetch the model’s weights from memory.",
          "That gives a trick: a decode step costs almost the same whether it serves one user or several, so the GPU can serve **a batch** of requests per step. More users per step means more total work per second and a lower cost per token, but each user waits slightly longer for each token.",
          "Slide the batch size. Notice how *per user* speed falls while *GPU total* and cost per million tokens improve.",
        ),
        widget: { type: "ai-infer", props: { hideStart: true, hideStreaming: true } },
      },
      {
        kind: "question",
        title: "Find the sweet spot",
        body: "Each user should get **at least 20 tokens per second** (about reading speed), and the cost must stay **at or under $3.00 per million tokens**. Choose the batch size.",
        widget: { type: "ai-infer", props: { minRate: 20, maxCost: 3, hideStart: true, hideStreaming: true } },
        question: { type: "widget", goal: { ok: true } },
        explanation: "Batches of **8 or 16** meet both. Below that, the GPU is under-used and tokens cost too much; at 32, each user’s tokens crawl. Real serving systems batch **continuously**: new requests join a batch whenever another finishes, so nobody waits for a full batch.",
      },
      {
        kind: "question",
        title: "What does streaming change?",
        body: "A chat app switches from waiting for the whole answer to **streaming** tokens as they are written. What actually gets faster?",
        question: {
          type: "choice",
          options: [
            "The first words appear much sooner; the total time to finish is the same",
            "The whole answer finishes about twice as fast",
            "The model uses fewer tokens",
            "The GPU does less work",
          ],
          answer: 0,
        },
        explanation: "Streaming changes what the user **sees**, not what the GPU **does**. With a 300-token answer, the first word arrives after prefill and one decode step instead of after all 300. People forgive a long answer they can already start reading, and they can stop it early.",
      },
      {
        kind: "question",
        title: "The first request of the morning",
        body: P(
          "To save money the service **scales to zero** when idle. The first request after a quiet spell finds no GPU running, so a machine must start and **load tens of gigabytes of weights** into GPU memory: a cold start.",
          "Add **Stream tokens** and a **cold start**, and require the first words to appear **within 3 seconds**. Find a setup that meets all three goals.",
        ),
        widget: { type: "ai-infer", props: { minRate: 20, maxCost: 3, maxFirstS: 3, startMode: "cold" } },
        question: { type: "widget", goal: { ok: true, cold: false, streaming: true } },
        explanation: "No amount of batching or streaming hides a 25-second load: only a **warm** instance does. The usual answers are a small number of always-on instances, scheduled pre-warming before busy hours, smaller or quantized models that load faster, and a queue with an honest “warming up” message for the rare cold request.",
      },
      {
        kind: "code",
        title: "Budget the month",
        body: P(
          "Providers price input and output tokens separately, per million. Write `daily_cost(requests, in_tokens, out_tokens, in_price, out_price)` where `requests` is the number of requests per day, the token counts are **per request**, and the prices are **dollars per million tokens**.",
          "For 30,000 requests of 1,500 tokens in and 300 tokens out, at $0.50 and $2.00 per million, the answer is **$40.50 a day**.",
        ),
        language: "python",
        starter: "def daily_cost(requests, in_tokens, out_tokens, in_price, out_price):\n    # cost of the input tokens plus cost of the output tokens, per million\n    return 0.0\n",
        solution:
          "def daily_cost(requests, in_tokens, out_tokens, in_price, out_price):\n    input_cost = requests * in_tokens * in_price / 1_000_000\n    output_cost = requests * out_tokens * out_price / 1_000_000\n    return input_cost + output_cost\n",
        tests: [
          { id: "worked", description: "the worked example is $40.50", assertionCode: `assert abs(daily_cost(30000, 1500, 300, 0.5, 2.0) - 40.5) < 1e-9, f"got {daily_cost(30000, 1500, 300, 0.5, 2.0)}"` },
          { id: "input", description: "input-only traffic", assertionCode: `assert abs(daily_cost(1000, 2000, 0, 1.0, 5.0) - 2.0) < 1e-9, f"got {daily_cost(1000, 2000, 0, 1.0, 5.0)}"` },
          { id: "output", description: "output costs more per token", assertionCode: `assert abs(daily_cost(1000, 0, 500, 1.0, 5.0) - 2.5) < 1e-9, f"got {daily_cost(1000, 0, 500, 1.0, 5.0)}"` },
          { id: "zero", description: "no traffic, no cost", assertionCode: `assert daily_cost(0, 1500, 300, 0.5, 2.0) == 0` },
        ],
        hints: ["Input cost = requests × in_tokens × in_price ÷ 1,000,000.", "Add the same formula for the output side."],
      },
      {
        kind: "recap",
        points: [
          "Models read and bill in **tokens**: short common words are cheap, rare strings, numbers and other scripts cost more.",
          "The **context window** holds rules, history, retrieved passages, the question *and* the answer. Budget it.",
          "**Prefill** reads the prompt in parallel; **decode** writes one token at a time. **Batching** shares each decode step: better cost, slower per user.",
          "**Streaming** improves the time to the first word, not the total time.",
          "A **cold start** (loading weights) can dwarf everything else; keep capacity warm where it matters, and watch cost as **input + output tokens × requests**.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 9. Agents and tool calling ───────────────────────────────
  {
    id: "fnd-ai-9-agents",
    title: "Agents and tool calling",
    summary: "The loop that lets a model act: propose, check, run, read the result. Guardrails, approval gates and why tool output is untrusted.",
    minutes: 10,
    xp: 80,
    steps: [
      {
        kind: "explain",
        title: "From answering to acting",
        body: P(
          "On its own a model only produces text. **Tool calling** lets it do things. You describe a menu of tools (look up an order, issue a refund, send an email) and when the model decides it needs one, it replies with a **structured request** instead of prose: *“call `lookup_order` with `order_id = 4417`”*.",
          "A program around the model, the **harness**, receives that request, decides whether to run it, runs it, and feeds the **result** back to the model. The model reads it and either asks for another tool or writes the final answer. That cycle is the **agent loop**.",
          "Here is a bike-repair help desk. A customer’s wheel arrived bent. Press Next and follow who does what.",
        ),
        widget: { type: "ai-agent", props: { scenario: "normal", approvals: true, fixed: ["scenario", "guardrail"] } },
      },
      {
        kind: "question",
        title: "Complete one run",
        body: "Follow the loop to the end. When the refund reaches the human gate, **approve** it.",
        widget: { type: "ai-agent", props: { scenario: "normal", approvals: true, guardrail: false, fixed: ["scenario", "guardrail"] } },
        question: { type: "widget", goal: { scenario: "normal", approvals: true, finished: true, refunded: true } },
        explanation: "Three roles, one loop: the model **proposes**, the harness **checks and runs**, a person **approves** the risky step. Reading an order is harmless, so it runs straight away. Moving money is not, so a human sees the order and the amount before anything happens.",
      },
      {
        kind: "question",
        title: "Who runs the tool?",
        body: P(
          "A tool is described to the model like this:",
          txt(`
name: issue_refund
description: Refund part or all of an order to the
  original payment method. Moves real money.
parameters:
  order_id: integer, required
  amount:   number in pounds, required,
            at most the order total
`),
          "When the model wants a refund, who actually calls the payment system?",
        ),
        question: {
          type: "choice",
          options: [
            "The harness, your code, after validating the request against the schema and your rules",
            "The model, directly, because it wrote the request",
            "The model provider’s servers",
            "The payment system, which reads the model’s text",
          ],
          answer: 0,
        },
        explanation: "The model only ever **writes text** that looks like a request. Whether a request becomes an action is decided by ordinary code you control. That is the best news in the whole design: every safeguard you would put in front of any other API (validation, permissions, limits, approvals, logs) works here too.",
      },
      {
        kind: "explain",
        title: "Guardrails around the loop",
        body: P(
          "A production agent is mostly **guardrails**. The ones worth having on day one:",
          "- **Validate** every request against the tool’s schema; reject unknown tools and out-of-range values.\n- **Allowlist per task**: a refund conversation does not need `send_email`.\n- **Limits**: a maximum number of steps, a spend cap per run, a timeout for every tool call.\n- **Retries with care**: back off between attempts, and give writes an **idempotency key** so a retry cannot happen twice.\n- **Human approval** for anything costly or irreversible.\n- **Tracing**: record every proposal, check, result and decision under one run id, so you can replay what happened.",
        ),
      },
      {
        kind: "question",
        title: "Charged twice",
        body: "`issue_refund` times out, so the harness retries it. The first attempt had actually succeeded, and the customer is refunded **twice**. What would have prevented this?",
        question: {
          type: "choice",
          options: [
            "Send an idempotency key with the refund, so the payment system recognises a repeat and returns the first result",
            "Never retry any tool call",
            "Ask the model to be more careful",
            "Use a longer timeout so the retry never happens",
          ],
          answer: 0,
        },
        explanation: "A timeout means “I don’t know whether it worked”, which is different from “it failed”. A unique key per intended action lets the server say “I already did that one”. Reads can be retried freely; **writes need a key** (or a check-then-act design) before any retry logic exists.",
      },
      {
        kind: "explain",
        title: "Tool output is untrusted",
        body: P(
          "Look at what comes back from `lookup_order`. The order has a **free-text note** that a customer, or anyone who can write to that field, controls. A model has no reliable way to tell *“text I was asked to read”* from *“instructions I should follow”*; to it, both are just words in the prompt.",
          "That is **prompt injection**: planted text that tries to steer the model. In the **poisoned** scenario the note contains a fake notice telling the assistant to email the customer list to a stranger. The model is fooled, which is why the defence cannot live inside the model. It lives in the **harness**: an allowlist for the task, a human approval for writes, and treating tool output as **data**, never as instructions.",
          "Turn both defences off and see what happens.",
        ),
        widget: { type: "ai-agent", props: { scenario: "poisoned", guardrail: false, approvals: false } },
      },
      {
        kind: "question",
        title: "See the damage",
        body: "With **both defences off**, run the poisoned order to the end and watch what the harness does with the model’s second request.",
        widget: { type: "ai-agent", props: { scenario: "poisoned", guardrail: false, approvals: false } },
        question: { type: "widget", goal: { scenario: "poisoned", guardrail: false, approvals: false, finished: true, leaked: true } },
        explanation: "The customer still got a cheerful refund message, and 212 email addresses went to a stranger. Nothing crashed and nothing looked wrong, which is what makes this class of bug dangerous. Both the model and the harness did what they were built to do.",
      },
      {
        kind: "question",
        title: "Stop the leak",
        body: "Turn on a defence (or both), run the poisoned order to the end, and make sure **nothing leaks**. If a human gate appears, decide wisely.",
        widget: { type: "ai-agent", props: { scenario: "poisoned", guardrail: false, approvals: false } },
        question: { type: "widget", goal: { scenario: "poisoned", finished: true, leaked: false } },
        explanation: "The **task allowlist** refuses `send_email` before anything runs. A **human gate** can also stop it, but only if the person reads the recipient and says no; approval fatigue is real, so don’t make it your only layer. Defence in depth: allowlist, approvals for the rest, and alerts when a blocked call is attempted.",
      },
      {
        kind: "code",
        title: "Write the permission check",
        body: P(
          "Write `check_call(call, policy, refund_limit=100)`. `call` looks like `{\"tool\": \"issue_refund\", \"args\": {\"amount\": 89.0}}`, and `policy` maps tool names to `\"allow\"`, `\"ask\"` or `\"deny\"`.",
          "Return `\"deny\"` for any tool that is not in the policy, and for `issue_refund` with an `amount` over the limit. Otherwise return the policy’s answer.",
        ),
        language: "python",
        starter: "def check_call(call, policy, refund_limit=100):\n    # unknown tool -> deny; refund over the limit -> deny; otherwise whatever the policy says\n    return \"allow\"\n",
        solution:
          "def check_call(call, policy, refund_limit=100):\n    tool = call[\"tool\"]\n    if tool not in policy:\n        return \"deny\"\n    if tool == \"issue_refund\" and call[\"args\"].get(\"amount\", 0) > refund_limit:\n        return \"deny\"\n    return policy[tool]\n",
        tests: [
          { id: "read", description: "a read tool is allowed", assertionCode: `policy = {"lookup_order": "allow", "issue_refund": "ask", "send_email": "deny"}\nassert check_call({"tool": "lookup_order", "args": {"order_id": 4417}}, policy) == "allow"` },
          { id: "ask", description: "a normal refund needs a person", assertionCode: `policy = {"lookup_order": "allow", "issue_refund": "ask", "send_email": "deny"}\nassert check_call({"tool": "issue_refund", "args": {"amount": 89.0}}, policy) == "ask"` },
          { id: "limit", description: "a refund over the limit is denied outright", assertionCode: `policy = {"lookup_order": "allow", "issue_refund": "ask", "send_email": "deny"}\nassert check_call({"tool": "issue_refund", "args": {"amount": 500.0}}, policy) == "deny"` },
          { id: "listed", description: "a listed deny stays deny", assertionCode: `policy = {"lookup_order": "allow", "issue_refund": "ask", "send_email": "deny"}\nassert check_call({"tool": "send_email", "args": {}}, policy) == "deny"` },
          { id: "unknown", description: "an unknown tool is denied by default", assertionCode: `policy = {"lookup_order": "allow", "issue_refund": "ask", "send_email": "deny"}\nassert check_call({"tool": "drop_database", "args": {}}, policy) == "deny"` },
        ],
        hints: ["Start with `tool = call[\"tool\"]` and `if tool not in policy: return \"deny\"`.", "Use `call[\"args\"].get(\"amount\", 0)` for the refund check, then `return policy[tool]`."],
      },
      {
        kind: "recap",
        points: [
          "The **agent loop**: the model *proposes* a tool call, the **harness** validates and runs it, the result goes back, repeat until a final answer.",
          "The model only writes text. Whether a request becomes an action is decided by **code you control**.",
          "Guardrails: schema validation, a per-task **allowlist**, step/spend/time limits, **idempotency keys** for writes, **human approval** for risky steps, full **tracing**.",
          "Anything a tool returns is **untrusted data**: injected text can fool the model, so defences must sit **outside** the model.",
          "Default to **deny**: unknown tools and over-limit arguments are refused.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 10. Tool servers and MCP ───────────────────────────────
  {
    id: "fnd-ai-10-mcp",
    title: "Tool servers and MCP",
    summary: "A standard way to plug internal systems into AI assistants: clients, servers, tools and resources, and how to expose them safely.",
    minutes: 11,
    xp: 80,
    steps: [
      {
        kind: "explain",
        title: "Plugging systems into assistants",
        body: P(
          "Your clinic has a booking system, a patient-notes database and an opening-hours page. You want AI assistants to be able to use them. If every assistant needs its own custom integration with every system, ten of each means a hundred integrations to build and secure.",
          "A **tool-server protocol** removes the multiplication. The best-known one is the **Model Context Protocol (MCP)**, an open standard introduced by Anthropic in 2024 and since adopted by many AI applications. You write **one server** for a system; any application that speaks the protocol can use it.",
          "The roles: the AI application the user sees is the **host**; inside it, a **client** keeps a connection to one **server**. The server is a small program that **announces what it offers**, and answers requests to use it, as JSON messages over a local pipe or over HTTP. Here is what a clinic-booking server announces. Tap through it.",
        ),
        widget: { type: "ai-mcp", props: { mode: "browse" } },
      },
      {
        kind: "question",
        title: "Read the menu",
        body: "Tap the tool that can **cancel many bookings in a single call**.",
        widget: { type: "ai-mcp", props: { mode: "browse" } },
        question: { type: "widget", goal: { selected: "cancel_booking" } },
        explanation: "`cancel_booking` accepts a `date` and cancels every booking that day. One innocent-looking call, 23 patients affected. When you design or review a server, read each tool as “what is the worst thing this could do if called with the wrong arguments?”",
      },
      {
        kind: "explain",
        title: "Tools, resources, prompts",
        body: P(
          "A server offers three kinds of thing:",
          "- **Tools**: actions with typed inputs, such as `book_slot`. The **model** decides when to call them.\n- **Resources**: readable data identified by an address, such as the opening-hours document. The **application** decides what to attach.\n- **Prompts**: reusable templates that a **user** chooses, like a “summarise this message for the nurse” command.",
          "Before a conversation begins, the client asks the server to **list** what it has, and gets names, descriptions and input schemas back. Those descriptions go into the model’s context so that it knows what exists, which means a server’s descriptions are text the model will read and act on. Remember that for the security part.",
        ),
      },
      {
        kind: "question",
        title: "Tool or resource?",
        body: "A clinic server could expose the following. Pick everything that should be a **tool** (an action the model can choose to take), not a resource.",
        question: {
          type: "choice",
          options: ["Book a slot for the signed-in patient", "The clinic’s opening-hours document", "Cancel a booking", "Last week’s staff announcements, as plain text"],
          answer: [0, 2],
        },
        explanation: "Booking and cancelling **change** something, so they are tools. Opening hours and announcements are **data to read**, which suits resources. Note that readable does not mean safe: the announcements were written by staff, so the model should treat that text as information, never as orders.",
      },
      {
        kind: "explain",
        title: "Designing tools a model can use",
        body: P(
          "Tools are an interface for a reader that is clever but literal and easily confused. What works:",
          "- **Task-shaped, not API-shaped**: `find_free_slots(date, doctor?)`, not twelve low-level calls the model must chain.\n- **Few and distinct**: a long menu of near-duplicates makes the model pick the wrong one.\n- **Clear names and descriptions** that say what the tool does, when to use it and when *not* to.\n- **Typed, narrow parameters**: enums, ranges, required fields. Validate again on the server.\n- **Small, structured results**: ten slots, not ten thousand rows.\n- **Errors that teach**: “no slots on that date; the next free day is Tuesday” beats a stack trace.\n- **Safe to repeat**: booking the same slot twice returns the same booking.\n- **Read and write kept apart**, so you can permit one without the other.",
          "And avoid the omnibus tool: `run_sql(query)` or `do_anything(instruction)` hands the model, and anyone who can influence it, every power at once.",
        ),
      },
      {
        kind: "question",
        title: "Pick the good designs",
        body: "Which of these are **well-designed** tools? Select all that apply.",
        question: {
          type: "choice",
          options: [
            "`run_query(sql: string)`: run any SQL against the clinic database",
            "`find_free_slots(date, doctor?)`: returns at most 10 slots, each with a `slot_id`",
            "`book_slot(slot_id)`: booking the same slot twice returns the same booking",
            "`do_everything(instruction: string)`: handles whatever the user asks",
          ],
          answer: [1, 2],
        },
        explanation: "`find_free_slots` and `book_slot` are narrow, typed, bounded and safe to repeat. The other two are skeleton keys: one hands over the whole database (including patient notes) to anyone who can steer the model, and the other has no meaningful boundary to secure.",
      },
      {
        kind: "explain",
        title: "Securing a tool server",
        body: P(
          "A tool server is an API that something **unpredictable** will call. Treat it as one, and then a bit more carefully:",
          "- **Authenticate the user, not just the app.** The assistant should act with the **signed-in person’s** permissions (remote servers typically use OAuth for this), never a shared all-powerful key. Otherwise any user can borrow the server’s full power by asking nicely.\n- **Authorize per tool**, and split read from write. Decide which tools are allowed, which need a person to approve, and which should not exist for this deployment at all.\n- **Check on the server** that the record belongs to the caller; never trust an id sent by the model.\n- **Keep tools small and separate**: a bulk-export tool in the same server as booking is an accident waiting for a prompt.\n- **Treat tool output and tool descriptions as untrusted text.** Resources, web pages and other users’ fields can carry injected instructions, and a third-party server can change a tool’s description after you approved it. Pin versions and review changes.\n- **Rate-limit and size-limit** calls and results.\n- **Log everything**: who, which tool, which arguments, what was decided, including refusals.",
        ),
      },
      {
        kind: "question",
        title: "Set the policy",
        body: P(
          "Seven requests arrive: some honest, some planted in a staff feed, one asking for another patient’s notes. Set a policy for each tool and decide whether the server should **check who is asking**.",
          "Goal: no harm gets through, every honest request still works, and a person is asked **at most twice** for routine things.",
        ),
        widget: { type: "ai-mcp", props: { mode: "policy" } },
        question: { type: "widget", goal: { safe: true, useful: true, maxAsks: 2 } },
        explanation: "The shape of a good policy: **allow** reads that are scoped to the caller, **ask** for destructive writes (the honest cancellation is approved, the bulk cancellation planted in the feed is not), **block** the backup export that no assistant needs, and have the **server enforce ownership** so another patient’s notes are refused whatever the model asks. Blocking everything is safe and useless; allowing everything is useful and unsafe.",
      },
      {
        kind: "code",
        title: "Write an audit entry",
        body: P(
          "Audit logs answer *who did what, when, and was it allowed*. Write `audit_entry(user, tool, args, decision, secret_keys)` that returns a dict with `user`, `tool`, `decision` and a **copy** of `args` in which every key listed in `secret_keys` has the value `\"***\"`.",
          "Log refusals and denials with the same care as successes, and keep secrets out of the log itself. The original `args` must not be changed.",
        ),
        language: "python",
        starter: "def audit_entry(user, tool, args, decision, secret_keys):\n    # copy args, replacing the values of secret_keys with \"***\"\n    return {}\n",
        solution:
          "def audit_entry(user, tool, args, decision, secret_keys):\n    safe_args = {k: (\"***\" if k in secret_keys else v) for k, v in args.items()}\n    return {\"user\": user, \"tool\": tool, \"args\": safe_args, \"decision\": decision}\n",
        tests: [
          {
            id: "redact",
            description: "secret values are hidden",
            assertionCode: `e = audit_entry("mira", "get_patient_notes", {"patient_id": "p-42", "reason": "checkup"}, "allowed", {"patient_id"})\nassert e == {"user": "mira", "tool": "get_patient_notes", "args": {"patient_id": "***", "reason": "checkup"}, "decision": "allowed"}, f"got {e}"`,
          },
          {
            id: "denied",
            description: "denials are recorded too",
            assertionCode: `e = audit_entry("mira", "export_all_patients", {}, "denied", set())\nassert e["decision"] == "denied" and e["args"] == {}, f"got {e}"`,
          },
          {
            id: "copy",
            description: "the original arguments are untouched",
            assertionCode: `args = {"token": "abc", "x": 1}\naudit_entry("u", "t", args, "allowed", {"token"})\nassert args == {"token": "abc", "x": 1}, "args must not be modified"`,
          },
        ],
        hints: ["Build a new dict with a comprehension: `{k: (\"***\" if k in secret_keys else v) for k, v in args.items()}`.", "Return `{\"user\": user, \"tool\": tool, \"args\": safe_args, \"decision\": decision}`."],
      },
      {
        kind: "recap",
        points: [
          "A **tool-server protocol** such as **MCP** lets any compatible assistant (client) use a system through one server instead of a custom integration for each pair.",
          "A server offers **tools** (actions, model-chosen), **resources** (readable data) and **prompts** (user-chosen templates), and announces them on request.",
          "Good tools are **small, typed, bounded, repeat-safe** and separate reads from writes. Avoid omnibus tools like `run_sql`.",
          "Secure them like any API, plus: act as the **signed-in user**, **authorize per tool**, check ownership **on the server**, treat tool output and descriptions as **untrusted**, and keep an **audit log** that includes refusals.",
        ],
      },
    ],
  },
];
