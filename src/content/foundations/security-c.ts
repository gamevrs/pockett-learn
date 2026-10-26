import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (tables, request lines). */
const txt = (code: string) => "~~~text\n" + code.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 8 to 10 of "Trust nothing by default": secrets and dependencies, a map of web vulnerabilities, tenants and audit logs. */
export const securityLessonsC: ConceptLesson[] = [
  // ─────────────────────────────── 8. Secrets and dependencies ───────────────────────────────
  {
    id: "fnd-sec-8-secrets",
    title: "Secrets and dependencies",
    summary: "What you must never write down in the open, how to rotate it, and how to trust the code you did not write.",
    minutes: 12,
    xp: 90,
    steps: [
      {
        kind: "explain",
        title: "Things that must stay unknown",
        body: P(
          "A **secret** is anything that grants access and is not meant to be known by everyone: API keys, database passwords, signing keys, private keys, tokens, password-reset links, session ids. Its power comes entirely from *staying unknown*, so the question is never “is it encrypted?” but “who can see it, in how many copies, for how long?”",
          "Secrets escape in boring ways: pasted into **source code**, printed into **logs**, put into **URLs** (which land in logs and browser history), baked into **images**, shared in **chat**, left in **screenshots**, or shown in **error pages**. The nastiest is source code, because git remembers everything: a secret committed once is in every clone, fork and backup, even after you delete the line.",
        ),
      },
      {
        kind: "question",
        title: "Leak hunt",
        body: "Four files from the clinic's repository. Tap **every line that leaks a secret**. Careful: public identifiers, placeholders and hashes only look alarming.",
        widget: { type: "sec-secrets", props: {} },
        question: { type: "widget", goal: { exact: true }, prompt: "Flag exactly the lines that leak secrets." },
        explanation: "The live keys, the database password inside a URL, the bearer token and reset token in the logs, the key baked into the image and the private key copied into it, and the key pasted into the docs: all leaks. The client id, the environment lookup, the commit hash, the placeholder and the deliberately public key are fine. Telling apart *a name for a secret* from *the secret itself* is half the skill.",
      },
      {
        kind: "explain",
        title: "Where secrets should live",
        body: P(
          "The code should ask for a secret by **name** and receive the value at runtime from outside the repository.",
          txt(`
Environment variable    easy; set by the platform at start-up. Visible to
                        anything inside the process, and sometimes in crash
                        dumps and debug pages. Fine for small setups.
Mounted file            the platform drops the value in a file the app reads.
                        Lets you update without rebuilding.
Secrets manager / vault a service that stores values encrypted, checks WHO is
                        asking, logs every read, and can issue short-lived
                        credentials on demand. Best when it is worth the work.
`),
          "One more rule: **anything shipped to a browser or a phone app is public.** Whatever is in your JavaScript bundle can be read by every visitor. That is fine for a deliberately public key, such as one that can only display a map, and never fine for a key that can charge cards or read patient data. Those calls must go through your server.",
        ),
      },
      {
        kind: "question",
        title: "Delete it in the next commit",
        body: "A developer pushes a commit containing a live API key, notices a minute later, and pushes another commit that removes the line. Is the key safe now?",
        question: {
          type: "choice",
          options: [
            "Yes: the latest version of the file no longer contains it",
            "Yes, as long as the repository is private",
            "No: treat it as leaked. Revoke or rotate it first; cleaning the history is optional tidying afterwards",
            "No, but a force-push that rewrites history makes it fully safe",
          ],
          answer: 2,
        },
        explanation: "The key lives in the earlier commit, in every clone and fork made since, in CI caches and in chat previews. A private repo is still readable by everyone with access, forever. Rewriting history is worth doing but cannot recall copies that already exist. The only real fix is to make the key worthless: **revoke it**, issue a new one, and then clean up.",
      },
      {
        kind: "explain",
        title: "Rotation: change it before it leaks",
        body: P(
          "**Rotation** means replacing a secret on a schedule, and immediately after any suspicion. It shrinks the window in which a leaked value is useful: a key that dies in 90 days cannot be exploited in year three, and teams that rotate regularly have *practised* the procedure, which matters when you are rotating in a panic.",
          "The trick is to avoid downtime. Never swap a password in one step, because while the services restart some will hold the old value and some the new. Instead run an **overlap**: the database accepts both for a while, you roll the new one out, then you retire the old one. Best of all, use credentials that are **short-lived by design**, which makes rotation automatic.",
        ),
      },
      {
        kind: "question",
        title: "Rotate without downtime",
        body: "Put the steps for replacing a database password in the safe order.",
        question: {
          type: "order",
          items: [
            "Create a second credential; the database now accepts both old and new",
            "Deploy every service with the new credential",
            "Check the logs to confirm nothing still uses the old one",
            "Revoke the old credential",
          ],
        },
        explanation: "Overlap first, switch over second, verify third, retire last. If you revoked the old credential before every service had moved, whichever services still held it would fail, and you would have caused the outage you were trying to avoid.",
      },
      {
        kind: "code",
        title: "Scrub the logs",
        body: P(
          "Logs are copied everywhere, so sensitive values must never reach them. Write `redact(line)` to replace secret values in a log line with `***`:",
          "- for `password`, `token`, `api_key` or `secret` followed by `=`, replace the value (everything up to a space or `&`) with `***`, keeping the name and `=` exactly as written. Match the name in any capitalisation.\n- after the word `Bearer` (any capitalisation), replace the token with `***`.",
          "Lines without secrets must come back **unchanged**. `re.sub` with a group reference like `r\"\\1=***\"` keeps what you matched.",
        ),
        language: "python",
        starter: "import re\n\n\ndef redact(line):\n    return line\n",
        solution:
          'import re\n\n\ndef redact(line):\n    line = re.sub(r"(?i)\\b(password|token|api_key|secret)=[^\\s&]+", r"\\1=***", line)\n    line = re.sub(r"(?i)(bearer\\s+)\\S+", r"\\1***", line)\n    return line\n',
        tests: [
          { id: "pw", description: "masks a password value", assertionCode: `assert redact("login ok user=dana password=hunter2 ip=203.0.113.9") == "login ok user=dana password=*** ip=203.0.113.9", f"got {redact('login ok user=dana password=hunter2 ip=203.0.113.9')!r}"` },
          { id: "url", description: "masks a key inside a URL and keeps the rest", assertionCode: `assert redact("GET /export?api_key=live_8c1f&format=csv") == "GET /export?api_key=***&format=csv", f"got {redact('GET /export?api_key=live_8c1f&format=csv')!r}"` },
          { id: "bearer", description: "masks a bearer token", assertionCode: `assert redact("Authorization: Bearer eyJabc.def.ghi") == "Authorization: Bearer ***", f"got {redact('Authorization: Bearer eyJabc.def.ghi')!r}"` },
          { id: "case", description: "ignores capitalisation but keeps the name as written", assertionCode: `assert redact("TOKEN=abc123 Secret=zzz") == "TOKEN=*** Secret=***", f"got {redact('TOKEN=abc123 Secret=zzz')!r}"` },
          { id: "clean", description: "leaves ordinary lines alone", assertionCode: `line = "booking created id=118 patient=41"\nassert redact(line) == line` },
        ],
        hints: ["Use `re.sub(r\"(?i)\\b(password|token|api_key|secret)=[^\\s&]+\", r\"\\1=***\", line)`.", "Do the same idea for Bearer: `r\"(?i)(bearer\\s+)\\S+\"` replaced by `r\"\\1***\"`."],
      },
      {
        kind: "explain",
        title: "The code you did not write",
        body: P(
          "A typical app is mostly other people's code: dozens of packages that pull in hundreds more. Every one is trust you extended. The ways it goes wrong: a maintainer's account is **hijacked** and a malicious release published; a package name is a **typo-squat** (`pocket-dates` and `pocket-datse`); an old version has a **known vulnerability**; a package is **abandoned**; or a registry mirror serves **tampered files**.",
          "The defences are mostly about *not changing by accident*: commit a **lockfile** so every build installs exactly the versions you tested, install from it in CI instead of resolving fresh, keep **integrity hashes** so altered files are refused, let a bot propose updates as reviewable pull requests, scan for known vulnerabilities, and prefer fewer, well-maintained dependencies. Do the same for base images: pin them by digest.",
          "Four days, three ways of installing one package. Tap a day under each policy to see what a build that day would ship.",
        ),
        widget: { type: "sec-supply", props: {} },
      },
      {
        kind: "question",
        title: "Find the bad builds",
        body: "Across the three policies and four days, three builds end up running the malicious code. Find all of them.",
        widget: { type: "sec-supply", props: {} },
        question: { type: "widget", goal: { compromised: 3 }, prompt: "Tap until you have found every build that ships bad code." },
        explanation: "Resolving fresh each time got burned on Tuesday and Wednesday, and a lockfile **without** integrity hashes got burned on Wednesday, when the right version number came with the wrong files. Only the locked build with fingerprints stayed clean every day, and its Wednesday failure was a feature: a loud stop beats a silent compromise. The price of all this stability is that updates now happen on purpose, so schedule them.",
      },
      {
        kind: "recap",
        points: [
          "A **secret** works only while it is unknown. Keep it out of code, logs, URLs, images and chat.",
          "Code asks for secrets **by name**; values arrive at runtime from env vars, files or a **secrets manager**. Anything shipped to a client is public.",
          "A committed secret is a leaked secret: **revoke first**, clean up later.",
          "**Rotate** with an overlap so nothing breaks, or use short-lived credentials so rotation is automatic.",
          "Pin dependencies with a **lockfile and integrity hashes**, install from the lockfile, and update deliberately.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 9. A map of web vulnerabilities ───────────────────────────────
  {
    id: "fnd-sec-9-vulns",
    title: "A map of web vulnerabilities",
    summary: "Injection, XSS, CSRF and SSRF: one recurring mistake (data treated as instructions) in four costumes.",
    minutes: 12,
    xp: 90,
    steps: [
      {
        kind: "explain",
        title: "Data that became code",
        body: P(
          "Most famous web attacks share one root: a program builds a **command** out of text, mixes in text from a stranger, and the receiver cannot tell which part was supposed to be which. Whatever the stranger typed has become *part of the instructions*. That is **injection**.",
          "A school library lets pupils look up a shelf. The program glues the typed name into a query string. Try the sensible inputs first, then the odd ones (tap the examples). The widget is a small mock of a real database, with the same rules.",
        ),
        widget: { type: "sec-inject", props: { kind: "sql", fixToggle: false } },
      },
      {
        kind: "question",
        title: "See the staff-only titles",
        body: "Two titles are marked staff-only and the query filters them out with `hidden = 0`. You control only the text in the box. Make the catalogue show them.",
        widget: { type: "sec-inject", props: { kind: "sql", fixToggle: false } },
        question: { type: "widget", goal: { kind: "sql", safe: false, outcome: "hidden" }, prompt: "Get the staff-only titles to appear." },
        explanation: "The quote ended the value early, `OR 1=1` made the condition always true, and `--` turned the rest of the query, including the `hidden = 0` check, into a comment. Look at the query the program built: the part you typed is no longer a shelf name, it is **SQL**. Even an innocent apostrophe (try O'Brien) breaks the page, which shows the flaw hurts honest users too.",
      },
      {
        kind: "question",
        title: "Keep data and code apart",
        body: P(
          "The cure is **parameterised queries**: send the query with a placeholder (`?`) and the values separately. The database compiles the query *first*, so no value can ever change its shape. Switch to **Pass as a parameter** and run the attack again.",
        ),
        widget: { type: "sec-inject", props: { kind: "sql", input: "' OR 1=1 --" } },
        question: { type: "widget", goal: { kind: "sql", safe: true, blocked: true }, prompt: "Turn the fix on with the attack still in the box." },
        explanation: "With parameters the whole input is treated as one shelf name, a very odd one, so no shelf matches and nothing is found. Parameters are not a sanitising trick; they are a different kind of message in which values *cannot* be code. Every mainstream database library supports them, and so do ORMs, which use them for you.",
      },
      {
        kind: "question",
        title: "Not a real fix",
        body: "A teammate proposes how to stop injection. Which one does **not** reliably work?",
        question: {
          type: "choice",
          options: [
            "Pass user values as query parameters",
            "Search the input for words like DROP, SELECT and OR, and reject the request",
            "Use an ORM that builds parameterised queries for you",
            "For a sort column that cannot be a parameter, accept only names from a fixed list",
          ],
          answer: 1,
        },
        explanation: "Blocklists lose: attackers write `dRoP`, use comments to split words, or find a construct nobody listed, while honest people named Orson or writing about “selection” get rejected. Separate data from code instead. Where a value truly cannot be a parameter (a column name), allow only items from a fixed list. Pockett's *Form Forge* project practises validating and cleaning input, which is worth doing for friendly errors and tidy data, but never as the only defence against injection.",
      },
      {
        kind: "explain",
        title: "The same mistake in HTML: XSS",
        body: P(
          "Now move the idea from the database to the browser. A comment box inserts what visitors type straight into the page. If someone types HTML, the browser cannot tell it from the page's own markup, and a `<script>` tag runs **on your site, with the visitor's login**. This is **cross-site scripting** (XSS).",
          "The cure is the same shape: keep data as data. **Escape output** for the place it lands (in HTML, `<` becomes `&lt;`), so the browser shows the characters instead of obeying them. Modern frameworks do this by default; the danger is the escape hatches (`innerHTML`, `dangerouslySetInnerHTML`, raw template output). A Content Security Policy header adds a second layer by limiting which scripts may run.",
        ),
        widget: { type: "sec-inject", props: { kind: "html" } },
      },
      {
        kind: "question",
        title: "Neutralise the script",
        body: "Put the script comment in the box, then switch the page to **Escape as text**.",
        widget: { type: "sec-inject", props: { kind: "html", input: "<script>steal(document.cookie)</script>" } },
        question: { type: "widget", goal: { kind: "html", safe: true, blocked: true }, prompt: "Escape the output while the script is in the box." },
        explanation: "The escaped version shows the angle brackets as plain characters, so the browser never sees a script tag. Remember that escaping depends on context: HTML text, an HTML attribute, a URL and a block of JavaScript each have different rules, which is a good reason to lean on your framework instead of writing escapes by hand.",
      },
      {
        kind: "explain",
        title: "Two more: CSRF and SSRF",
        body: P(
          "**CSRF** (cross-site request forgery) abuses the browser's helpfulness. Cookies go along with *every* request to their site, whoever caused it. A page on another site can make your browser submit a form to your bank or clinic, and the request arrives logged in. Defences: `SameSite` cookies, an **anti-CSRF token** the attacker's page cannot know, checking the `Origin` header, and never changing data on a `GET`.",
          "**SSRF** (server-side request forgery) turns the tables. A feature makes the *server* fetch a URL the user supplied: link previews, webhooks, “import from URL”, PDF renderers. An attacker supplies an *internal* address, and the server, which sits inside your network, obliges: `http://localhost:8080/admin`, an internal dashboard, or a cloud platform's metadata address at `169.254.169.254` that can hand out credentials. Defences: allow only specific destinations, block private, loopback and link-local addresses (after resolving DNS), do not follow redirects blindly, and fetch from a locked-down network.",
        ),
      },
      {
        kind: "question",
        title: "Name that attack",
        body: "Tap a scenario, then the category it belongs to.",
        widget: {
          type: "pattern-sorter",
          props: {
            buckets: [
              { id: "inject", label: "Injection", hint: "data becomes a command" },
              { id: "xss", label: "XSS", hint: "data becomes page code" },
              { id: "csrf", label: "CSRF", hint: "the browser is tricked" },
              { id: "ssrf", label: "SSRF", hint: "the server is tricked" },
              { id: "bac", label: "Broken access control", hint: "the check is missing" },
            ],
            items: [
              { id: "a", text: "A link-preview feature fetches http://169.254.169.254/ and shows the result" },
              { id: "b", text: "A hidden form on a quiz site posts to /cancel using the visitor's session cookie" },
              { id: "c", text: "A shelf name of ' OR 1=1 -- reveals hidden rows" },
              { id: "d", text: "A book review containing a script tag runs for every later visitor" },
              { id: "e", text: "Changing /invoices/301 to /invoices/302 shows another customer's invoice" },
              { id: "f", text: "An uploaded file called `; rm -rf /` ends up inside a shell command" },
              { id: "g", text: "A profile-picture URL makes the server call an internal admin service" },
              { id: "h", text: "An emailed link makes your logged-in browser cancel a booking" },
            ],
            answer: { a: "ssrf", b: "csrf", c: "inject", d: "xss", e: "bac", f: "inject", g: "ssrf", h: "csrf" },
          },
        },
        question: { type: "widget", goal: { placed: { a: "ssrf", b: "csrf", c: "inject", d: "xss", e: "bac", f: "inject", g: "ssrf", h: "csrf" } } },
        explanation: "The question to ask is **who is being fooled**: the interpreter (injection), the visitor's browser running page code (XSS), the visitor's browser sending a request they did not intend (CSRF), or your own server making a request it should not (SSRF). The missing ownership check from the last lesson belongs on this map too.",
      },
      {
        kind: "code",
        title: "A guard for fetches",
        body: P(
          "A feature downloads images from URLs that users paste. Write `fetch_ok(url, allowed_hosts)` returning `True` only when **all** of these hold:",
          "- the scheme is `https`\n- the host name, lower-cased, is exactly one of `allowed_hosts`\n- the port is the default (`443`) or not given",
          "Use `urllib.parse.urlsplit`; its `hostname` ignores any `user@` prefix, and an allowlist beats trying to list everything dangerous. Return `False` for anything that fails to parse.",
        ),
        language: "python",
        starter: "from urllib.parse import urlsplit\n\n\ndef fetch_ok(url, allowed_hosts):\n    return url.startswith(\"https://\")\n",
        solution:
          'from urllib.parse import urlsplit\n\n\ndef fetch_ok(url, allowed_hosts):\n    try:\n        u = urlsplit(url)\n        port = u.port\n    except ValueError:\n        return False\n    if u.scheme != "https":\n        return False\n    if port not in (None, 443):\n        return False\n    return (u.hostname or "").lower() in allowed_hosts\n',
        tests: [
          { id: "ok", description: "an allowed https host passes (any capitalisation)", assertionCode: `H = {"images.example.com"}\nassert fetch_ok("https://images.example.com/a.png", H) is True and fetch_ok("https://IMAGES.example.com/a.png", H) is True` },
          { id: "http", description: "plain http is refused", assertionCode: `assert fetch_ok("http://images.example.com/a.png", {"images.example.com"}) is False` },
          { id: "meta", description: "the cloud metadata address is refused", assertionCode: `assert fetch_ok("https://169.254.169.254/latest/meta-data/", {"images.example.com"}) is False and fetch_ok("https://localhost/admin", {"images.example.com"}) is False` },
          { id: "userinfo", description: "user@host tricks do not fool it", assertionCode: `H = {"images.example.com"}\nassert fetch_ok("https://images.example.com@evil.example/x", H) is False, "the real host is evil.example"` },
          { id: "suffix", description: "look-alike host names are refused", assertionCode: `assert fetch_ok("https://images.example.com.evil.example/x", {"images.example.com"}) is False` },
          { id: "port", description: "an unusual port is refused", assertionCode: `H = {"images.example.com"}\nassert fetch_ok("https://images.example.com:8443/a.png", H) is False and fetch_ok("https://images.example.com:443/a.png", H) is True` },
        ],
        hints: ["Compare `u.hostname.lower()` with `in allowed_hosts`, an exact match, not `endswith` or `startswith`.", "Check `u.scheme == \"https\"` and `u.port in (None, 443)`; wrap `urlsplit(...)` and `u.port` in `try/except ValueError`."],
      },
      {
        kind: "recap",
        points: [
          "**Injection**: untrusted text became part of a command. Fix it by keeping data and code apart, with **parameterised queries**, not blocklists.",
          "**XSS**: untrusted text became part of a page. **Escape output** for its context, and treat raw-HTML escape hatches with suspicion.",
          "**CSRF**: the browser attaches cookies to forged requests. Use **SameSite**, anti-CSRF tokens and `Origin` checks.",
          "**SSRF**: your server fetches an attacker's URL. **Allowlist** destinations and block internal addresses.",
          "Ask of every input: *who is being fooled, and where does this text end up?*",
        ],
      },
    ],
  },

  // ─────────────────────────────── 10. Tenants and audit trails ───────────────────────────────
  {
    id: "fnd-sec-10-tenants-audit",
    title: "Tenants and audit trails",
    summary: "Many customers in one system without leaking between them, and a record of who did what that cannot quietly be rewritten.",
    minutes: 13,
    xp: 100,
    steps: [
      {
        kind: "explain",
        title: "Many clinics, one system",
        body: P(
          "Dovetail does not serve one clinic. Hundreds of clinics, called **tenants**, share one platform. The worst bug such a system can have is not downtime: it is **clinic A seeing clinic B's patients**. That ends companies.",
          "There are three common ways to separate tenants, trading isolation against cost:",
          txt(`
Database per tenant     strongest wall, highest cost, hardest to run
                        thousands of databases and migrations
Schema per tenant       one database, a set of tables each; a middle path
Shared tables           one set of tables, every row has tenant_id
                        cheapest and most flexible, but ONE forgotten
                        WHERE clause leaks everything
`),
          "Most SaaS products start with shared tables, so this lesson is about making that safe. In the next step you get eight real-looking queries from the code base, run as **Elm Street Clinic**. Run them, look at whose rows come back, and label each *Safe* or *Leaks*.",
        ),
      },
      {
        kind: "question",
        title: "Safe or leaky?",
        body: "Run the queries (or run them all) and label each. Remember that **writes**, **counts** and **joins** can leak too.",
        widget: { type: "sec-tenant", props: { mode: "classify" } },
        question: { type: "widget", goal: { allCorrect: true }, prompt: "Label all eight queries correctly." },
        explanation: "Only two of the reads and one of the writes carried the tenant condition on every table they touched. The sneaky ones: the **count** (you learned how big a competitor is), the **update by id alone** (one clinic could cancel another's booking), and the **join** that filtered invoices but not patients, where per-tenant ids collided. A query is safe only if *every* table it touches is tied to the caller's tenant.",
      },
      {
        kind: "explain",
        title: "Make the database enforce it",
        body: P(
          "Relying on every developer to remember `WHERE tenant_id = ...` for ever is a wager you will eventually lose. Add a second lock at the data layer: **row-level security** (RLS). You attach a policy to each table (“a row is visible only when its `tenant_id` equals the tenant of the current connection”), and the database applies it to *every* query, even ones that forgot. Run the same eight queries with the policy off and then on.",
          "Where does the tenant id come from? **From the verified session or token**, set per connection or per request by the code that authenticated the user, **never** from a URL, form field or JSON body the client controls.",
        ),
        widget: { type: "sec-tenant", props: { mode: "rls" } },
      },
      {
        kind: "question",
        title: "Close the leaks",
        body: "Run all eight queries with row-level security **on**.",
        widget: { type: "sec-tenant", props: { mode: "rls" } },
        question: { type: "widget", goal: { rls: true, ranAll: true, leaks: 0 }, prompt: "Switch the policy on and run every query." },
        explanation: "With the policy in place every query is confined to Elm Street, including the careless ones, and the count even becomes correct. Treat RLS as a safety net, not a replacement: keep the tenant condition in the code too, so a bad migration or a privileged maintenance connection (which can bypass policies) does not reopen the hole.",
      },
      {
        kind: "question",
        title: "Beyond the tables",
        body: "Tenant boundaries must hold outside the main tables as well. Which of these need the tenant built into them? Pick all that apply.",
        question: {
          type: "choice",
          options: [
            "Cache keys, such as `patients:list` (which could serve one clinic's list to another)",
            "File paths in object storage for uploaded documents",
            "Search index queries and vector search filters",
            "The text of the HTTP 404 page",
          ],
          answer: [0, 1, 2],
        },
        explanation: "Caches, file storage, search indexes, queues and background jobs all store tenant data and are all places where a forgotten scope leaks. `tenant:12:patients:list` as a cache key, `tenants/12/` in a storage path, a mandatory filter in every search. A generic 404 page contains nothing tenant-specific.",
      },
      {
        kind: "explain",
        title: "A record of who did what",
        body: P(
          "Prevention fails sometimes, and then someone asks: *who looked at that record? Who turned off that user's second factor? When?* An **audit log** answers. Each entry records **who** (the actor, and on whose behalf), **what** (the action and its target), **when** (UTC), **where from** (IP, device), **whether it worked** (and denials, too), plus a request id to tie it to other logs.",
          "It is not the application's debug log. It is smaller, deliberate and permanent, it never contains secrets or full medical details, and very few people can read it. It also needs **tamper evidence**: if an attacker reaches the log, the first thing they will do is edit it.",
          "A neat trick is to **chain** the entries. Each stores a hash of its own content *plus the previous entry's hash*, so changing one entry changes its hash, which no longer matches the next entry's `prev`, and so on. Edit one and verify the chain.",
        ),
        widget: { type: "sec-audit", props: {} },
      },
      {
        kind: "question",
        title: "Catch the edit",
        body: "Someone doctored the log. Tamper with **entry #3**, then verify the chain and see where it breaks.",
        widget: { type: "sec-audit", props: {} },
        question: { type: "widget", goal: { detected: true, firstBad: 3 }, prompt: "Tamper with entry 3 and verify." },
        explanation: "The chain broke at exactly the edited entry: its stored hash no longer matched its content. Every later entry is still linked to that old hash, so a reviewer knows where the log stops being trustworthy and can compare with other sources such as backups.",
      },
      {
        kind: "question",
        title: "Can the attacker cover their tracks?",
        body: P(
          "A careful attacker who can write to the log can **recompute every hash after the edit**, so the chain is consistent again. Switch on *Attacker recomputes later hashes*, tamper with an entry and verify: the chain looks fine. Then switch on *Newest hash kept in a separate store* and verify again.",
        ),
        widget: { type: "sec-audit", props: { advanced: true } },
        question: { type: "widget", goal: { covered: true, anchored: true, detected: true }, prompt: "Catch the attacker even though they recomputed the chain." },
        explanation: "A chain only proves *internal consistency*. To catch a full rewrite, something the attacker cannot reach must remember the real newest hash: a separate account that can only append, write-once storage, a periodic signature, or a hash published somewhere public. Then the rewritten log disagrees with the anchor. The same principle protects any log: **the thing that writes it must not be able to erase it.**",
      },
      {
        kind: "code",
        title: "Verify a chain",
        body: P(
          "Entries are dicts `{\"data\": ..., \"prev\": ..., \"hash\": ...}`. The first entry's `prev` is `GENESIS`, and every `hash` is `entry_hash(prev, data)`. `entry_hash` and `build_chain` are given.",
          "Write `first_bad(chain)` returning the **index of the first entry that does not check out**, or `-1` if the whole chain is sound. An entry is bad if its `prev` is not the previous entry's `hash` (or `GENESIS` for the first), or if its `hash` does not match its own content.",
        ),
        language: "python",
        starter: String.raw`import hashlib

GENESIS = "0" * 64


def entry_hash(prev, data):
    return hashlib.sha256((prev + "|" + data).encode()).hexdigest()


def build_chain(items):
    chain, prev = [], GENESIS
    for data in items:
        h = entry_hash(prev, data)
        chain.append({"data": data, "prev": prev, "hash": h})
        prev = h
    return chain


def first_bad(chain):
    # index of the first entry that does not check out, or -1
    return -1
`,
        solution:
          'import hashlib\n\nGENESIS = "0" * 64\n\n\ndef entry_hash(prev, data):\n    return hashlib.sha256((prev + "|" + data).encode()).hexdigest()\n\n\ndef build_chain(items):\n    chain, prev = [], GENESIS\n    for data in items:\n        h = entry_hash(prev, data)\n        chain.append({"data": data, "prev": prev, "hash": h})\n        prev = h\n    return chain\n\n\ndef first_bad(chain):\n    prev = GENESIS\n    for i, e in enumerate(chain):\n        if e["prev"] != prev or entry_hash(e["prev"], e["data"]) != e["hash"]:\n            return i\n        prev = e["hash"]\n    return -1\n',
        tests: [
          { id: "clean", description: "an untouched chain is sound", assertionCode: `c = build_chain(["login dana", "view 118", "export list", "logout"])\nassert first_bad(c) == -1, f"got {first_bad(c)}"` },
          { id: "edit", description: "an edited entry is found", assertionCode: `c = build_chain(["login dana", "view 118", "export list", "logout"])\nc[2]["data"] = "nothing happened"\nassert first_bad(c) == 2, f"got {first_bad(c)}"` },
          { id: "relink", description: "a broken link is found", assertionCode: `c = build_chain(["a", "b", "c", "d"])\nc[3]["prev"] = "x" * 64\nassert first_bad(c) == 3, f"got {first_bad(c)}"` },
          { id: "delete", description: "a deleted entry is noticed", assertionCode: `c = build_chain(["a", "b", "c", "d"])\ndel c[1]\nassert first_bad(c) == 1, f"got {first_bad(c)}"` },
          { id: "empty", description: "an empty chain is sound", assertionCode: `assert first_bad([]) == -1` },
        ],
        hints: ["Walk the entries with `enumerate`, remembering the previous entry's hash (start from `GENESIS`).", "An entry is bad when `e[\"prev\"] != prev` or `entry_hash(e[\"prev\"], e[\"data\"]) != e[\"hash\"]`; return its index `i`."],
      },
      {
        kind: "recap",
        points: [
          "In a multi-tenant system, **every table every query touches** must be tied to the caller's tenant: reads, writes, counts and joins.",
          "Take the tenant from the **verified session**, never from the request. Enforce it twice: in code and with **row-level security**.",
          "Caches, file paths, search indexes and queues need the tenant in their keys too.",
          "An **audit log** records who, what, when, where and whether it worked. Keep it separate from debug logs and free of secrets.",
          "**Chain** entries to make edits visible, and keep the newest hash **somewhere the writer cannot reach** to catch a full rewrite.",
        ],
      },
    ],
  },
];
