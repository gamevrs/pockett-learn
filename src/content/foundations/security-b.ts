import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (tables, request lines). */
const txt = (code: string) => "~~~text\n" + code.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 5 to 7 of "Trust nothing by default": OAuth and OpenID Connect, access control, least privilege. */
export const securityLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 5. OAuth and OpenID Connect ───────────────────────────────
  {
    id: "fnd-sec-5-oauth",
    title: "OAuth and OpenID Connect",
    summary: "How one app gets limited, revocable access to another service without ever seeing your password. The code flow, PKCE and tokens.",
    minutes: 12,
    xp: 90,
    steps: [
      {
        kind: "explain",
        title: "Access without the password",
        body: P(
          "You use **RideVault** to record bike rides. A training-plan app called **SpokeLog** would like to read them. The old way: type your RideVault password into SpokeLog. That is a terrible deal. SpokeLog now holds a key to *everything*, it can never be told apart from you, you cannot cut it off without changing your password everywhere, and one breach at SpokeLog leaks your RideVault login.",
          "**OAuth 2.0** exists to replace that deal with a better one. It is a protocol for **delegated authorization**: you sign in at RideVault itself and tell RideVault, “let SpokeLog read my rides, nothing else”. SpokeLog receives a **token** that is limited in scope, limited in time, and revocable on its own.",
          "Notice what OAuth is about: *may this app do this on my behalf?* It is not, by itself, about *who you are*. We will come back to that.",
        ),
      },
      {
        kind: "question",
        title: "Who plays which role",
        body: "OAuth gives each party a name. Tap a card, then the role it plays: the **resource owner** (who owns the data), the **client** (the app asking), the **authorization server** (checks you and issues tokens) and the **resource server** (the API holding the data).",
        widget: {
          type: "pattern-sorter",
          props: {
            buckets: [
              { id: "owner", label: "Resource owner", hint: "owns the data" },
              { id: "client", label: "Client", hint: "wants access" },
              { id: "auth", label: "Authorization server", hint: "issues tokens" },
              { id: "api", label: "Resource server", hint: "holds the data" },
            ],
            items: [
              { id: "a", text: "You, the cyclist" },
              { id: "b", text: "SpokeLog, the training-plan app" },
              { id: "c", text: "RideVault's sign-in and consent service" },
              { id: "d", text: "RideVault's rides API" },
              { id: "e", text: "A second API that stores heart-rate data and accepts the same tokens" },
            ],
            answer: { a: "owner", b: "client", c: "auth", d: "api", e: "api" },
          },
        },
        question: { type: "widget", goal: { placed: { a: "owner", b: "client", c: "auth", d: "api", e: "api" } } },
        explanation: "You own the data; SpokeLog is the client; the sign-in service is the authorization server; and any API that accepts the tokens, including the heart-rate one, is a resource server. Often one company runs both servers, but they are separate jobs, which is why many APIs can share one sign-in service.",
      },
      {
        kind: "explain",
        title: "The authorization code flow",
        body: P(
          "The standard recipe is the **authorization code flow**. Four lanes: your *browser*, the *app*, the *authorization server*, and the *API*. Press **Next** and read what each message carries.",
          "Three things to watch for. **Your password only ever goes to the authorization server.** What comes back through the browser is a short-lived **code**, not a token. And the app swaps that code for tokens in a separate request that goes **directly** to the server (the *back channel*), never through the browser.",
          "The `state` value the app invents at the start comes back unchanged. It lets the app recognise that this return trip answers *its own* request, which blocks an attacker from pushing someone else's code at the callback.",
        ),
        widget: { type: "sec-oauth", props: {} },
      },
      {
        kind: "question",
        title: "Walk the whole flow",
        body: "Step all the way through, reading the detail box under the lanes at each message.",
        widget: { type: "sec-oauth", props: {} },
        question: { type: "widget", goal: { flow: "code", finished: true }, prompt: "Reach the end of the flow." },
        explanation: "SpokeLog ended up calling the API with a bearer token it was *given*, and at no point saw your password. Anyone who holds a **bearer token** can use it, hence the short lifetime, the narrow scope, and the habit of never logging it.",
      },
      {
        kind: "question",
        title: "A stolen code, and PKCE",
        body: P(
          "The code travels through the browser, which is exactly where a look-alike app on a phone or a snooping extension might copy it. If the server hands tokens to *whoever redeems the code first*, that attacker wins.",
          "**PKCE** (pronounced “pixie”, *Proof Key for Code Exchange*) fixes it. At the start the app makes a random secret, the **verifier**, and sends only its **hash**, the *challenge*. To redeem the code it must present the verifier; the server hashes it and compares. A stolen code is useless without it. Turn on **Interceptor** and watch the attack succeed, then add **PKCE** and run it again.",
        ),
        widget: { type: "sec-oauth", props: { toggles: ["pkce", "attacker"] } },
        question: { type: "widget", goal: { flow: "code", pkce: true, attacker: true, finished: true, blocked: true }, prompt: "Run it to the end with PKCE on and the interceptor active." },
        explanation: "With PKCE the interceptor presented a code but no verifier, and the hash comparison failed. PKCE started as a fix for mobile apps, which cannot keep a client secret. It is now recommended for every client, including server-side web apps, because it costs almost nothing and closes the code-interception hole.",
      },
      {
        kind: "code",
        title: "Make a code challenge",
        body: P(
          "Write `code_challenge(verifier)`: the SHA-256 hash of the verifier text, encoded as **base64url without the `=` padding**. (The same function checks a redemption: hash what arrives and compare it with the stored challenge.)",
          "`hashlib.sha256(text.encode()).digest()` gives the raw hash bytes, and `base64.urlsafe_b64encode(...)` encodes them. Then strip the trailing `=` characters.",
        ),
        language: "python",
        starter: "import base64, hashlib\n\n\ndef code_challenge(verifier):\n    digest = hashlib.sha256(verifier.encode()).digest()\n    return base64.urlsafe_b64encode(digest).decode()\n",
        solution:
          'import base64, hashlib\n\n\ndef code_challenge(verifier):\n    digest = hashlib.sha256(verifier.encode()).digest()\n    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()\n',
        tests: [
          {
            id: "vector",
            description: "matches the published example from the PKCE specification",
            assertionCode: `v = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"\nassert code_challenge(v) == "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM", f"got {code_challenge(v)!r}"`,
          },
          { id: "nopad", description: "has no = padding", assertionCode: `assert "=" not in code_challenge("abc"), "strip the = padding"` },
          { id: "len", description: "a SHA-256 challenge is 43 characters", assertionCode: `assert len(code_challenge("another-verifier-value")) == 43` },
          { id: "differ", description: "different verifiers give different challenges", assertionCode: `assert code_challenge("one") != code_challenge("two")` },
        ],
        hints: ["Without padding a 32-byte hash always becomes 43 characters. `rstrip(b\"=\")` removes the padding from the bytes before `.decode()`.", "`base64.urlsafe_b64encode(digest).rstrip(b\"=\").decode()`"],
      },
      {
        kind: "explain",
        title: "Scopes, and signing in with OpenID Connect",
        body: P(
          "A **scope** names a slice of access: `rides:read` is not `rides:write`, and neither is `profile:delete`. The consent screen shows them, and the token carries only what was granted. Ask for the minimum, because every extra scope is blast radius if the token leaks.",
          "OAuth alone does not tell the app *who just signed in*. **OpenID Connect (OIDC)** is a thin layer on top that does. The app adds the scope `openid` to its request and the response includes a second token, the **ID token**: a signed statement that says who authenticated, when, and for which app. It is meant to be read by the **app**, to start a session. The **access token** is meant for the **API**.",
          "Run the flow again with `openid` on and see the extra token arrive.",
        ),
        widget: { type: "sec-oauth", props: { openid: true } },
      },
      {
        kind: "question",
        title: "Which token goes where",
        body: "SpokeLog has received an **access token** and an **ID token**. It wants to (1) show your name and (2) fetch your rides. Which is right?",
        question: {
          type: "choice",
          options: [
            "Send the ID token to the rides API; read your name from the access token",
            "Read your name from the ID token, and send the access token to the rides API",
            "Send both tokens to the rides API on every call",
            "Use either: they are two names for the same thing",
          ],
          answer: 1,
        },
        explanation: "The ID token answers “who signed in?” for the app, and the access token answers “what may this bearer do?” for the API. Mixing them up is a real bug: an API that accepts ID tokens could be fooled into treating a sign-in proof for *another* app as permission to call it.",
      },
      {
        kind: "question",
        title: "Why the implicit flow retired",
        body: P(
          "Early browser apps could not keep secrets or make cross-site requests, so OAuth had a shortcut: the **implicit flow** returned the *access token directly* in the redirect, in the part of the URL after `#`. Try it, then turn on the interceptor and run it to the end.",
          "Reasons it was dropped: the token sits in the address bar and **browser history**, can leak through screenshots, referrer headers and any script on the page, and nothing ties it to the app that asked. Code + PKCE does the same job for single-page apps, with the token delivered over the back channel.",
        ),
        widget: { type: "sec-oauth", props: { flow: "implicit", toggles: ["attacker"], attacker: true } },
        question: { type: "widget", goal: { flow: "implicit", attacker: true, finished: true, breached: true }, prompt: "Run the implicit flow with the interceptor on." },
        explanation: "Because the token itself was in the URL, anyone who could see the URL could use it, and there was no PKCE-style proof to stop them. Modern guidance is simple: use the **authorization code flow with PKCE**, everywhere.",
      },
      {
        kind: "recap",
        points: [
          "**OAuth 2.0** is delegated authorization: an app gets a limited, expiring, revocable token instead of your password.",
          "The roles: **resource owner**, **client**, **authorization server**, **resource server**.",
          "The **code flow** returns a short-lived code through the browser and swaps it for tokens on a **back channel**. Check `state` on return.",
          "**PKCE** binds the code to the app that started the flow, so a stolen code is useless. Use it everywhere.",
          "**OpenID Connect** adds an **ID token** (who signed in, for the app). The **access token** is for the API. The implicit flow is retired.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 6. Broken access control ───────────────────────────────
  {
    id: "fnd-sec-6-access-control",
    title: "Broken access control",
    summary: "The most common serious flaw: a logged-in user changes an id and reads someone else's record. See it, fix it, and test for it.",
    minutes: 10,
    xp: 80,
    steps: [
      {
        kind: "explain",
        title: "Logged in is not the same as allowed",
        body: P(
          "Here is the bug that tops most lists of real-world web flaws. The server correctly checks *who you are*, then forgets to check whether *this record is yours*. Changing a number in the address bar is all it takes. It is called an **insecure direct object reference** (IDOR), and it is the poster child of **broken access control**.",
          "You are **Dana**, patient 41. The portal asks the server for `/appointments/<id>`. The server code, shown under the address bar, looks the id up and returns it. Change the id and watch what comes back.",
        ),
        widget: { type: "sec-idor", props: { mode: "none" } },
      },
      {
        kind: "question",
        title: "Read two strangers' bookings",
        body: "With no ownership check, read **two bookings that are not yours**. Use the id buttons.",
        widget: { type: "sec-idor", props: { mode: "none" } },
        question: { type: "widget", goal: { mode: "none", minLeaked: 2 }, prompt: "See at least two other patients' bookings." },
        explanation: "Ids on a clinic's booking table are just 118, 119, 120… and anyone who is logged in can try them all in a loop: a script reads every record in an afternoon. Notice also that *nothing broke*: the server did precisely what its code said, which is why scanners miss this bug. Only a person asking “whose is it?” finds it.",
      },
      {
        kind: "explain",
        title: "The fix: ask whose it is",
        body: P(
          "Put the owner into the question the database answers, so a foreign record behaves as if it did not exist:",
          txt(`
-- before
SELECT * FROM appointments WHERE id = :id;

-- after
SELECT * FROM appointments WHERE id = :id AND patient_id = :me;
`),
          "`:me` must come from the **verified session**, never from the request. If it came from a form field or the URL, the attacker would simply type someone else's number. Switch the server design to *Owner check* and try the same attack.",
        ),
        widget: { type: "sec-idor", props: { mode: "owner", modeToggle: true } },
      },
      {
        kind: "question",
        title: "Count what is yours",
        body: "With the **owner check** on, try the ids from **118 to 125** one after another (use the id buttons). How many of them return a booking to Dana?",
        widget: { type: "sec-idor", props: { mode: "owner", modeToggle: true }, live: true },
        question: { type: "number", answer: 3 },
        explanation: "Dana owns 118, 120 and 125, so exactly **three** answers come back; the other five are indistinguishable from ids that do not exist. That uniform answer is deliberate: a different message for “exists but not yours” would let an attacker map out which ids are real.",
      },
      {
        kind: "question",
        title: "403 or 404?",
        body: "For someone else's booking, which response gives away **less** to a person probing ids?",
        question: {
          type: "choice",
          options: [
            "403 Forbidden: it is honest about what happened",
            "404 Not Found: it looks exactly like an id that does not exist",
            "200 with an empty body",
            "500 Internal Server Error",
          ],
          answer: 1,
        },
        explanation: "A 403 confirms the record exists, which can itself be sensitive (is that person a patient here?). Answering 404 for “not yours” reveals nothing. Use 403 when the caller knows the thing exists and the information is harmless, such as a staff-only page. A fake 200 or a 500 would confuse your own monitoring.",
      },
      {
        kind: "question",
        title: "Make the ids unguessable",
        body: P(
          "A tempting shortcut: switch from `118` to long random ids and call it fixed. Switch to *Random ids* with no ownership check. Your own bookings work. A friend forwarded you a link to **their** booking by mistake: open it.",
        ),
        widget: { type: "sec-idor", props: { mode: "uuid", modeToggle: true } },
        question: { type: "widget", goal: { mode: "uuid", minLeaked: 1 }, prompt: "Open a booking that is not yours using only a forwarded link." },
        explanation: "Random ids stop *guessing*, which is a real improvement, but ids end up in logs, emails, browser history, support screenshots and forwarded links. An id is a **name**, never a **permission**. Use unguessable ids as a bonus layer if you like, and keep the ownership check anyway.",
      },
      {
        kind: "explain",
        title: "The same bug in other clothes",
        body: P(
          "Broken access control has several faces, all variations on “the server did not ask”:",
          "- **Horizontal escalation**: reading or changing another user's data at the same level (the IDOR you just saw).\n- **Vertical escalation**: a normal user reaching an admin function, e.g. typing `/admin/export` into the address bar (*forced browsing*), or calling `DELETE /staff/7` that the interface never shows.\n- **Mass assignment**: the API copies every field of the incoming JSON into the record, so `{\"name\": \"Dana\", \"role\": \"admin\"}` quietly promotes her.\n- **Links that never expire**: an invoice URL that works for anybody with the link, forever.",
          "The cure is a habit, not a library: every handler asks, before it does anything, *may this caller do this action to this object?*, and the answer comes from the server's own data.",
        ),
      },
      {
        kind: "question",
        title: "Spot the broken ones",
        body: "Which of these are **broken access control**? Pick all that apply.",
        question: {
          type: "choice",
          options: [
            "A patient sends PUT /profile with `{\"role\": \"admin\"}` and becomes an administrator",
            "A browser offers to remember a saved password",
            "A non-admin types /admin/export and downloads the patient list",
            "A shared invoice link opens for anyone who has it, a year later",
          ],
          answer: [0, 2, 3],
        },
        explanation: "Mass assignment, forced browsing and a never-expiring link all hand out something the server should have refused or limited. A password manager offering to save a password is the browser doing its job; whether passwords are *stored well* is a different question.",
      },
      {
        kind: "code",
        title: "Fetch only what is yours",
        body: P(
          "`db` maps appointment ids to records like `{\"patient_id\": 41, \"what\": \"Check-up\"}`. Write `get_appointment(db, user, appt_id)` that returns the record **only if the user may see it**, and `None` otherwise (including for ids that do not exist, so the two cases look the same).",
          "A user like `{\"id\": 41, \"role\": \"patient\"}` may see appointments whose `patient_id` equals their id. A user with role `\"receptionist\"` may see any appointment.",
        ),
        language: "python",
        starter: "def get_appointment(db, user, appt_id):\n    # returns the record even when it belongs to somebody else (the bug)\n    return db.get(appt_id)\n",
        solution:
          'def get_appointment(db, user, appt_id):\n    appt = db.get(appt_id)\n    if appt is None:\n        return None\n    if user["role"] == "receptionist":\n        return appt\n    if user["role"] == "patient" and appt["patient_id"] == user["id"]:\n        return appt\n    return None\n',
        tests: [
          { id: "own", description: "a patient gets their own booking", assertionCode: `db = {118: {"patient_id": 41, "what": "Check-up"}, 119: {"patient_id": 42, "what": "Physio"}}\nassert get_appointment(db, {"id": 41, "role": "patient"}, 118) == {"patient_id": 41, "what": "Check-up"}` },
          { id: "other", description: "a patient does not get someone else's", assertionCode: `db = {118: {"patient_id": 41, "what": "Check-up"}, 119: {"patient_id": 42, "what": "Physio"}}\nassert get_appointment(db, {"id": 41, "role": "patient"}, 119) is None, "ownership must be checked"` },
          { id: "staff", description: "a receptionist may see any booking", assertionCode: `db = {119: {"patient_id": 42, "what": "Physio"}}\nassert get_appointment(db, {"id": 7, "role": "receptionist"}, 119)["what"] == "Physio"` },
          { id: "missing", description: "unknown ids give None for everyone", assertionCode: `assert get_appointment({}, {"id": 41, "role": "patient"}, 5) is None and get_appointment({}, {"id": 7, "role": "receptionist"}, 5) is None` },
          { id: "role", description: "an unknown role gets nothing", assertionCode: `db = {118: {"patient_id": 41, "what": "Check-up"}}\nassert get_appointment(db, {"id": 41, "role": "visitor"}, 118) is None` },
        ],
        hints: ["Look the record up first, return `None` if it is missing, then decide who may see it.", "Return the record only for a receptionist, or for a patient whose `id` equals `appt[\"patient_id\"]`; fall through to `return None`."],
      },
      {
        kind: "recap",
        points: [
          "**Broken access control** is the server skipping the question “may *this caller* touch *this object*?”.",
          "The cure: include the **owner** in the lookup, with the user id taken from the **verified session**, and answer 404 for “not yours”.",
          "**Unguessable ids** are a bonus layer, not a lock.",
          "Watch for **forced browsing**, **mass assignment** and **links that never expire**. Test with two users: can A read B's data?",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Least privilege ───────────────────────────────
  {
    id: "fnd-sec-7-least-privilege",
    title: "Least privilege",
    summary: "Give every service, job and person only what they need, and an identity of their own, so one leak stays small.",
    minutes: 10,
    xp: 80,
    steps: [
      {
        kind: "explain",
        title: "Keys for the job",
        body: P(
          "Think of a school caretaker's key ring. It opens classrooms, the boiler room and the bike shed. It does not open the headteacher's safe or the exam-paper cupboard. Nobody planned this out of distrust; it just means a lost key ring is an inconvenience, not a disaster.",
          "**Least privilege** applies the same idea to software: every service, job and person gets exactly the permissions their work needs, and nothing more. The reason is arithmetic. Assume a credential will leak someday (a log line, a laptop, a bug). Whatever that credential can do is the **blast radius** of the leak, so shrink it in advance.",
        ),
      },
      {
        kind: "question",
        title: "Grant the minimum",
        body: P(
          "The **Reminder worker** texts patients the day before their visit. Its three jobs are listed. Switch on only the permissions that make all three jobs work. The red count shows permissions nobody needs.",
        ),
        widget: { type: "sec-perms", props: { services: ["reminder"] } },
        question: { type: "widget", goal: { minimal: true }, prompt: "Make every job work with nothing extra." },
        explanation: "Reading bookings, reading phone numbers and sending texts are three permissions. It does not need to *write* bookings, export patient lists or touch backups. Try `admin:*` once if you like: everything works, and the unneeded count jumps. That is what a leaked admin credential looks like.",
      },
      {
        kind: "explain",
        title: "A separate identity for each part",
        body: P(
          "Least privilege only works if services have **separate identities**. If the Reminder worker, the Booking API and the nightly report all share one “internal” API key, that key must carry the *union* of everything they all need, and a leak from the weakest of them hands over the lot. You also cannot tell from an audit log which service did something.",
          "How do services prove who they are to each other?",
          txt(`
Shared secret in env     simple, but copied everywhere and rarely rotated
Per-service API key      its own key and own permissions; easy to revoke
Signed service token     short-lived, issued to each workload automatically
mutual TLS               both sides show certificates; strong, more plumbing
`),
          "The principle matters more than the tool: **one identity per workload, short-lived where possible, scoped to its job.** Platforms increasingly give each running service a temporary credential for exactly this.",
        ),
      },
      {
        kind: "question",
        title: "Leak at the weakest point",
        body: "The Reminder worker logs its outbound credentials by mistake and the log leaks. Which setup keeps the damage smallest?",
        question: {
          type: "choice",
          options: [
            "All services share one internal key with full database access",
            "All services share one key, but it is rotated every year",
            "The worker has its own identity with read-bookings, read-patients and send-sms only",
            "The worker has its own identity, and it is a copy of the admin account",
          ],
          answer: 2,
        },
        explanation: "With a private, narrow identity the leak lets an attacker read bookings and send texts, which is bad, but cannot cancel appointments, export lists, wipe backups or impersonate other services. Rotating a shared full-access key helps only after the fact. The best fix is not a better password but a smaller one.",
      },
      {
        kind: "question",
        title: "The whole system",
        body: "Now configure all four services. Every job must work, and no service should hold a permission it does not use.",
        widget: { type: "sec-perms", props: {} },
        question: { type: "widget", goal: { minimal: true }, prompt: "Grant exactly what each service needs." },
        explanation: "The report job needs only to read bookings (it counts them); the backup job needs to snapshot and write the backups, and never to read patient details through the application; the API needs bookings read/write plus the patient's own contact details. When a permission feels hard to decide, deny it and wait for the job to complain. That is the safe direction to be wrong in.",
      },
      {
        kind: "explain",
        title: "Time, people and break-glass",
        body: P(
          "Least privilege has a time dimension too. Prefer **short-lived credentials** that expire on their own to ones you must remember to revoke. For people, prefer **just-in-time access**: an engineer requests production access for a reason, gets it for an hour, and the grant is logged, instead of holding admin rights permanently “just in case”.",
          "For real emergencies keep a **break-glass** account: a powerful credential, locked away, whose every use sets off alarms and requires a review afterwards. Standing admin rights for everyone remove the need for break-glass, and also remove the alarm.",
        ),
      },
      {
        kind: "question",
        title: "Standing or just in time",
        body: "An on-call engineer occasionally needs to look at production data to debug an outage. Which arrangement follows least privilege?",
        question: {
          type: "choice",
          options: [
            "Give the whole engineering team permanent production admin, so nobody ever waits",
            "Give nobody production access, ever",
            "Grant read access on request, for a limited time and with a logged reason, and review the log",
            "Share one production password in the team chat",
          ],
          answer: 2,
        },
        explanation: "Permanent access means every phished laptop is a production incident. No access at all just pushes people towards workarounds. Time-boxed, logged, reviewed access gives engineers what they need and gives you a trail to check.",
      },
      {
        kind: "code",
        title: "Work out the minimum",
        body: P(
          "Write `plan(services, job_needs)`. `services` maps a service name to the list of jobs it performs, and `job_needs` maps each job to the permissions it requires:",
          "`services = {\"reminder\": [\"find\", \"send\"], \"report\": [\"count\"]}`\n`job_needs = {\"find\": [\"bookings:read\"], \"send\": [\"sms:send\"], \"count\": [\"bookings:read\"]}`",
          "Return a dict mapping each service to the **sorted** list of permissions it needs: the union over its jobs, with no duplicates. For the example that is `{\"reminder\": [\"bookings:read\", \"sms:send\"], \"report\": [\"bookings:read\"]}`.",
        ),
        language: "python",
        starter: "def plan(services, job_needs):\n    # give every service the permissions of every job there is (too much!)\n    everything = sorted({p for perms in job_needs.values() for p in perms})\n    return {name: everything for name in services}\n",
        solution:
          "def plan(services, job_needs):\n    result = {}\n    for name, jobs in services.items():\n        needed = set()\n        for job in jobs:\n            needed.update(job_needs.get(job, []))\n        result[name] = sorted(needed)\n    return result\n",
        tests: [
          {
            id: "example",
            description: "the worked example",
            assertionCode: `services = {"reminder": ["find", "send"], "report": ["count"]}\nneeds = {"find": ["bookings:read"], "send": ["sms:send"], "count": ["bookings:read"]}\nassert plan(services, needs) == {"reminder": ["bookings:read", "sms:send"], "report": ["bookings:read"]}, f"got {plan(services, needs)!r}"`,
          },
          {
            id: "dups",
            description: "duplicates are merged",
            assertionCode: `assert plan({"api": ["a", "b"]}, {"a": ["x", "y"], "b": ["y", "x"]}) == {"api": ["x", "y"]}`,
          },
          { id: "empty", description: "a service with no jobs needs nothing", assertionCode: `assert plan({"idle": []}, {"a": ["x"]}) == {"idle": []}` },
        ],
        hints: ["Build a `set()` of permissions for each service by looping over its jobs.", "Use `sorted(needed)` for each service, so the lists are in a predictable order."],
      },
      {
        kind: "recap",
        points: [
          "**Least privilege**: grant only what the work needs, so a leaked credential has a small **blast radius**.",
          "Give each service **its own identity**, scoped to its job, so leaks stay local and the audit log can tell callers apart.",
          "Prefer **short-lived** credentials and **just-in-time** human access, with a logged reason.",
          "Keep a **break-glass** path for emergencies, and make every use loud.",
        ],
      },
    ],
  },
];
