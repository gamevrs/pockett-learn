import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (tables, request lines). */
const txt = (code: string) => "~~~text\n" + code.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 1 to 4 of "Trust nothing by default": threats, who and may-they, sessions and tokens, hardening the cookie. */
export const securityLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. Thinking like an attacker ───────────────────────────────
  {
    id: "fnd-sec-1-threats",
    title: "Thinking like an attacker",
    summary: "Threat modelling on one page: what is worth taking, who wants it, which doors exist, and where trust has to be earned.",
    minutes: 9,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "Security is a list of questions",
        body: P(
          "Nobody makes software secure by sprinkling in a feature called “security”. What works is asking, early and often, **what could go wrong here, and who would make it go wrong on purpose?** Doing that on paper before you build is called **threat modelling**, and it needs a whiteboard, not a certificate.",
          "Our running example is the booking system of **Dovetail Clinic**: patients book appointments from a phone, receptionists manage them from a laptop, and reminders go out as text messages. Some of that machinery is ours, and some is not. Tap each box and read what is valuable there and who might come for it.",
        ),
        widget: { type: "sec-threat", props: { mode: "explore" } },
      },
      {
        kind: "question",
        title: "Where the line runs",
        body: P(
          "Some data flows stay inside systems we run. Others cross the **trust boundary**: they arrive from, or leave towards, something we do not control. That is where input must be treated as a *claim*, not a fact.",
          "Tap every flow that crosses the dashed line.",
        ),
        widget: { type: "sec-threat", props: { mode: "boundary" } },
        question: { type: "widget", goal: { crossing: ["f1", "f2", "f3"] }, prompt: "Mark the flows that cross the boundary." },
        explanation: "The patient's phone, the staff laptop and the SMS provider all sit outside our control, so those three flows cross the line. The other three stay inside. Notice that the staff laptop is *ours* in the sense of belonging to the clinic, yet it still counts as outside: it can be lost, phished or left open. The boundary follows control, not ownership.",
      },
      {
        kind: "explain",
        title: "Four questions, one page",
        body: P(
          "A useful threat model fits on a page and answers four questions:",
          txt(`
1. What are we protecting?     patient records, bookings, staff accounts
2. Who might go after it?      curious patients, criminals, an angry ex-employee,
                               an honest person who makes a mistake
3. How could they get at it?   guess an id, phish a password, inject a query,
                               find an open backup bucket
4. How bad would that be?      one record? every record? the clinic's licence?
`),
          "Notice the fourth question. You will never close every door, so **impact** decides which doors get locked first. A flaw that exposes one appointment time is not in the same league as one that exposes the whole database.",
        ),
      },
      {
        kind: "question",
        title: "Believe the header?",
        body: "A request reaches the Booking API carrying the header `X-Role: admin`. When may the API believe it?",
        question: {
          type: "choice",
          options: [
            "Always: headers are part of the request, so they are trustworthy",
            "Never: the client wrote it, and clients can write anything",
            "Only if a component the API trusts set it after authenticating the caller, and ordinary clients cannot send that header themselves",
            "Only when the request arrived over HTTPS",
          ],
          answer: 2,
        },
        explanation: "Anything that crosses the trust boundary is something a stranger typed. A header is believable only when something the API trusts (say, a gateway that has checked the caller and strips any copy of the header the client sent) put it there. HTTPS protects the journey, not the honesty of the sender: an attacker's request is delivered securely too.",
      },
      {
        kind: "question",
        title: "Which door first?",
        body: P(
          "Score each threat by **likelihood × impact** (each from 1, rare or minor, to 5, constant or catastrophic) and fix the highest first. Put them in order, biggest risk at the top.",
        ),
        question: {
          type: "order",
          items: [
            "Phished receptionist password (likelihood 3, impact 5)",
            "Patient guesses another booking id (likelihood 4, impact 3)",
            "Injection flaw in the search box (likelihood 2, impact 5)",
            "Typo in a reminder text (likelihood 5, impact 1)",
            "Both backup regions fail at once (likelihood 1, impact 4)",
          ],
        },
        explanation: "15, 12, 10, 5 and 4. Risk scoring is rough on purpose: the point is to stop treating every worry as equal. The typo is by far the most likely and still ranks low because it costs almost nothing. The rare double-region failure ranks last, though some teams would still spend money on it if the impact were bigger.",
      },
      {
        kind: "explain",
        title: "Assume something will get in",
        body: P(
          "Attackers are not only strangers. Think also of a **curious employee**, a **tired administrator who types the command into the wrong terminal**, a **stolen laptop**, and a **bot** that tries ten thousand passwords overnight. Each takes a different door.",
          "Because you cannot close all of them, mature systems work in layers. **Prevent** what you can (authentication, validation), **limit the blast radius** of what you cannot (small permissions, separate credentials, encrypted backups), and **detect and recover** (logs, alerts, practised restores). This is called **defence in depth**: when one layer fails, the next is still standing.",
        ),
      },
      {
        kind: "question",
        title: "Contain, don't just prevent",
        body: "Which of these mainly **limit the damage after** someone gets in, rather than stopping the break-in? Pick all that apply.",
        question: {
          type: "choice",
          options: [
            "Each service uses its own database account with only the tables it needs",
            "Login is rate-limited to five attempts a minute",
            "Backups are encrypted with a key stored somewhere else",
            "Staff must use a second factor to sign in",
          ],
          answer: [0, 2],
        },
        explanation: "A narrow database account means a hijacked service can reach only its own tables, and an offsite key means a stolen backup is just noise. Rate limits and second factors are valuable, but they work to stop the intrusion in the first place. A real design needs both kinds.",
      },
      {
        kind: "code",
        title: "Rank the risks in code",
        body: P(
          "Turn the exercise into a function. `rank_threats(threats)` gets a list of `(name, likelihood, impact)` tuples and returns just the **names**, highest risk (`likelihood × impact`) first. When two risks tie, put the name that comes first alphabetically first.",
          "`sorted(items, key=...)` can sort by a tuple; use a minus sign to sort a number from high to low.",
        ),
        language: "python",
        starter: "def rank_threats(threats):\n    # threats: a list of (name, likelihood, impact)\n    return [t[0] for t in threats]\n",
        solution: "def rank_threats(threats):\n    ordered = sorted(threats, key=lambda t: (-t[1] * t[2], t[0]))\n    return [t[0] for t in ordered]\n",
        tests: [
          {
            id: "order",
            description: "highest likelihood × impact first",
            assertionCode: `assert rank_threats([("typo", 5, 1), ("phish", 3, 5), ("guess id", 4, 3)]) == ["phish", "guess id", "typo"], f"got {rank_threats([('typo', 5, 1), ('phish', 3, 5), ('guess id', 4, 3)])!r}"`,
          },
          {
            id: "ties",
            description: "ties are broken alphabetically",
            assertionCode: `assert rank_threats([("b", 2, 3), ("a", 3, 2), ("c", 1, 1)]) == ["a", "b", "c"], "6 and 6 tie: a before b, then c"`,
          },
          { id: "empty", description: "an empty list gives an empty list", assertionCode: `assert rank_threats([]) == []` },
        ],
        hints: ["Sort with `key=lambda t: (-t[1] * t[2], t[0])`: the minus puts big scores first, and the name breaks ties.", "Finish with `[t[0] for t in ordered]` to keep only the names."],
      },
      {
        kind: "recap",
        points: [
          "Threat modelling asks four questions: **what** is worth taking, **who** wants it, **how** they could get it, and **how bad** it would be.",
          "A **trust boundary** is where data arrives from something you do not control. Everything crossing it is a claim to check, never a fact.",
          "Rank risks by **likelihood × impact** and lock the biggest doors first.",
          "Work in layers: **prevent**, **limit the blast radius**, and **detect and recover**. Assume something will get through.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Who are you, and may you? ───────────────────────────────
  {
    id: "fnd-sec-2-authn-authz",
    title: "Who are you, and may you?",
    summary: "Authentication and authorization are different questions. Get the order, the status codes and the places to check right.",
    minutes: 10,
    xp: 70,
    steps: [
      {
        kind: "explain",
        title: "Two doors, two questions",
        body: P(
          "Every protected request faces two checks, and mixing them up is the root of a surprising number of breaches.",
          "**Authentication** (*authn*): **who are you?** The server needs evidence of an identity: a password, a code from your phone, a signed token.",
          "**Authorization** (*authz*): **are you allowed to do this?** Once the server knows who you are, it must still decide whether *this person* may do *this action* to *this thing*.",
          "The HTTP world has an unfortunate quirk here. The status **401** is named “Unauthorized” but really means *unauthenticated*: “I don't know who you are.” The status **403 Forbidden** means *unauthorized*: “I know who you are, and the answer is no.”",
        ),
      },
      {
        kind: "question",
        title: "Triage the requests",
        body: "Seven requests arrive at the Dovetail API. For each, choose the status code a correct server should answer with.",
        widget: { type: "sec-gate", props: {} },
        question: { type: "widget", goal: { allCorrect: true }, prompt: "Pick 200, 401 or 403 for every request." },
        explanation: "No identity means 401. Known identity but not permitted means 403. A public page needs neither. The tricky pair: Dana reading booking #119 is a *403*, not a 401, because the server knows exactly who she is. And an expired session is as good as none, so it is a 401.",
      },
      {
        kind: "explain",
        title: "Proving who you are",
        body: P(
          "Evidence of identity comes in three families: **something you know** (a password), **something you have** (a phone, a hardware key), **something you are** (a fingerprint). Combining two different families is **multi-factor authentication**, and it is why a stolen password alone is no longer enough.",
          "A server must never store passwords as they were typed. It keeps a **slow, salted hash** instead, and recomputes it at login. Pockett's *Pocket Store API* project builds exactly that, so this module does not repeat it; remember only that hashes turn a database leak from a catastrophe into a slog.",
          "How the server then *remembers* you after login is the topic of the next two lessons.",
        ),
      },
      {
        kind: "question",
        title: "The helpful error message",
        body: "A login form answers “**No account with that email**” when the email is unknown, and “**Wrong password**” when it is known. What is the problem?",
        question: {
          type: "choice",
          options: [
            "Nothing: clear errors help honest users fix mistakes",
            "It lets an attacker test a list of emails and learn which people have accounts (user enumeration)",
            "Passwords must be at least 8 characters, so the message is wrong",
            "It breaks HTTPS",
          ],
          answer: 1,
        },
        explanation: "Two different messages turn the login form into a lookup service for who is a patient here. Say the same thing every time (“Email or password is wrong”), and take care that the *timing* and the reset-password page do not give the game away either. Honest users can recover through the reset flow.",
      },
      {
        kind: "explain",
        title: "Deciding what you may do",
        body: P(
          "Authorization rules usually come in three flavours, and real systems mix them:",
          txt(`
Role-based        "Receptionists may cancel any booking."
                  Permission follows the job title.
Ownership-based   "A patient may read their own bookings."
                  Permission follows who owns the thing.
Attribute-based   "A doctor may open a chart only for a patient
                   booked with them today."
                  Permission follows facts about the user, the
                  thing and the situation.
`),
          "The more specific the rule, the less power leaks through the gaps.",
        ),
      },
      {
        kind: "question",
        title: "Name the rule",
        body: "Tap a rule, then the family it belongs to.",
        widget: {
          type: "pattern-sorter",
          props: {
            buckets: [
              { id: "role", label: "Role-based", hint: "the job title" },
              { id: "owner", label: "Ownership-based", hint: "whose it is" },
              { id: "attr", label: "Attribute-based", hint: "facts and context" },
            ],
            items: [
              { id: "a", text: "Billing staff may export invoices" },
              { id: "b", text: "A patient may edit their own profile" },
              { id: "c", text: "Chart access only from the clinic network between 08:00 and 18:00" },
              { id: "d", text: "Only managers may add new staff accounts" },
              { id: "e", text: "A user may delete a comment they wrote" },
              { id: "f", text: "A locum doctor may read charts only while their contract is active" },
            ],
            answer: { a: "role", b: "owner", c: "attr", d: "role", e: "owner", f: "attr" },
          },
        },
        question: { type: "widget", goal: { placed: { a: "role", b: "owner", c: "attr", d: "role", e: "owner", f: "attr" } } },
        explanation: "Job titles are roles; “my own” is ownership; conditions about time, place or contract status are attributes. Most bugs live in the ownership family: a role check passes (“yes, you are a patient”) and the code forgets to ask *whose* record it is. The access-control lesson goes after that bug.",
      },
      {
        kind: "question",
        title: "Hide the button?",
        body: "The mobile app only shows the **Cancel booking** button on the patient's own bookings. Is the cancel endpoint therefore protected?",
        question: {
          type: "choice",
          options: [
            "Yes: patients can't press a button they can't see",
            "No: anyone can send the request by hand, so the server must check every time",
            "Yes, if the button is hidden with JavaScript rather than CSS",
            "Only if the endpoint uses HTTPS",
          ],
          answer: 1,
        },
        explanation: "The client is the attacker's machine. Hiding a button is good design and gives zero protection. The rule is: **enforce on the server, on every request, for every action**, and treat the interface as a convenience for honest users.",
      },
      {
        kind: "code",
        title: "A tiny policy",
        body: P(
          "Write `check_access(user, action, resource)` that returns `True` or `False`. `user` is like `{\"id\": 41, \"role\": \"patient\"}` and `resource` is like `{\"owner_id\": 41}`. The rules:",
          "- action `\"read\"` or `\"cancel\"`: a **receptionist** may do it to any booking; a **patient** only when `resource[\"owner_id\"]` is their own id.\n- action `\"delete_user\"`: only the role `\"admin\"`.\n- Everything else is denied, including unknown roles and unknown actions.",
          "Start from “deny”, and write down only what is allowed.",
        ),
        language: "python",
        starter: "def check_access(user, action, resource):\n    # allow everything for now (that is the bug)\n    return True\n",
        solution:
          'def check_access(user, action, resource):\n    role = user.get("role")\n    if action in ("read", "cancel"):\n        if role == "receptionist":\n            return True\n        if role == "patient":\n            return resource.get("owner_id") == user.get("id")\n        return False\n    if action == "delete_user":\n        return role == "admin"\n    return False\n',
        tests: [
          { id: "own", description: "a patient may read their own booking", assertionCode: `assert check_access({"id": 41, "role": "patient"}, "read", {"owner_id": 41}) is True` },
          { id: "other", description: "a patient may not read someone else's booking", assertionCode: `assert check_access({"id": 41, "role": "patient"}, "read", {"owner_id": 42}) is False, "ownership must be checked"` },
          { id: "recep", description: "a receptionist may cancel any booking", assertionCode: `assert check_access({"id": 7, "role": "receptionist"}, "cancel", {"owner_id": 42}) is True` },
          { id: "admin", description: "only admins may delete users", assertionCode: `assert check_access({"id": 1, "role": "admin"}, "delete_user", {}) is True and check_access({"id": 7, "role": "receptionist"}, "delete_user", {}) is False and check_access({"id": 41, "role": "patient"}, "delete_user", {}) is False` },
          { id: "deny", description: "unknown actions and roles are denied", assertionCode: `assert check_access({"id": 1, "role": "admin"}, "launch_rocket", {}) is False and check_access({"id": 2, "role": "intern"}, "read", {"owner_id": 2}) is False` },
        ],
        hints: ["Return `False` at the end, so anything you did not list is refused.", "For a patient, the whole check is `resource.get(\"owner_id\") == user.get(\"id\")`."],
      },
      {
        kind: "recap",
        points: [
          "**Authentication** asks who you are; **authorization** asks whether you may. Always in that order.",
          "**401** means “I don't know who you are”; **403** means “I know, and no”.",
          "Store password **hashes**, use a second factor, and make login errors say the same thing every time.",
          "Rules can follow **roles**, **ownership** or **attributes**. Forgetting the ownership check is the classic bug.",
          "Enforce access on the **server**, on every request. A hidden button is not a lock.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Sessions and tokens ───────────────────────────────
  {
    id: "fnd-sec-3-sessions-tokens",
    title: "Sessions and tokens",
    summary: "Two ways to remember a logged-in user: a ticket the server looks up, or a signed note the server just checks.",
    minutes: 11,
    xp: 80,
    steps: [
      {
        kind: "explain",
        title: "HTTP forgets you every time",
        body: P(
          "You met this in the networking module: HTTP is stateless, so after you log in the server needs a way to recognise you on the next request. It does that with a **credential** that your browser sends again and again. There are two classic designs.",
          "A **server-side session** is a random *ticket number*. The server keeps a table of valid tickets and looks yours up on every request. The ticket itself means nothing; the table holds the meaning.",
          "A **signed token** is a small *note* that carries its own facts (“user dana, valid until 14:15”) plus a signature only the server can produce. The server keeps nothing: it checks the signature and trusts the note.",
          "Play with both. Use the switch, and try the buttons in any order.",
        ),
        widget: { type: "sec-session", props: { mode: "session" } },
      },
      {
        kind: "question",
        title: "Cut off a stolen ticket",
        body: P(
          "Credentials get copied: a log line, a shared screenshot, a malicious browser extension. With the **server session** design, do this: log in, let the attacker copy the credential, end Dana's access, then have the attacker send it.",
        ),
        widget: { type: "sec-session", props: { mode: "session", fixedMode: true } },
        question: { type: "widget", goal: { mode: "session", attackerAfterRevoke: true, attackerAccepted: false }, prompt: "Get the attacker refused after access is ended." },
        explanation: "Deleting the row ended every copy of that ticket at once, because the ticket was only ever a key to the server's table. Sessions are easy to revoke: log out everywhere, ban a user, respond to an incident. The price is that every request needs a lookup, and every server needs to reach that table.",
      },
      {
        kind: "question",
        title: "Now try it with a token",
        body: "Switch to the **signed token** design and repeat exactly the same story. Does ending Dana's access stop the attacker's copy?",
        widget: { type: "sec-session", props: { mode: "token", fixedMode: true } },
        question: { type: "widget", goal: { mode: "token", attackerAfterRevoke: true, attackerAccepted: true }, prompt: "Replay the story and see what the stolen token does." },
        explanation: "There was no row to delete. A self-contained token is valid by its own signature until it expires, and the server has no list of tokens to strike a name from. That is the central trade: tokens scale beautifully (any server holding the key can check one) but are hard to take back. The usual remedies are short lifetimes and a small deny-list, which you will meet in the next lesson.",
      },
      {
        kind: "explain",
        title: "How a signature works",
        body: P(
          "A token is usually three parts joined by dots. The **payload** holds the claims, and the **signature** is a keyed hash of the payload, made with a secret that only the servers know:",
          txt(`
payload    {"sub":"dana","exp":1700000900}      (base64-encoded)
signature  HMAC-SHA256( secret key, payload )
token      <payload> . <signature>
`),
          "To verify, the server recomputes the signature with its key and compares. If anyone changes a single character of the payload (“sub: admin”), the signatures no longer match. The payload is **encoded, not encrypted**: anyone holding the token can read it. A signature gives *tamper evidence*, never secrecy.",
        ),
      },
      {
        kind: "code",
        title: "Check a token",
        body: P(
          "`make_token` is given. Finish `read_token(token, secret, now)` so it returns the claims **only** if the token is genuine and not expired, and `None` otherwise (including for garbage that is not a token at all).",
          "Compare signatures with `hmac.compare_digest`, which takes the same time however many characters match. A claim called `exp` holds the expiry as a number of seconds; the token has expired when `now >= exp`.",
        ),
        language: "python",
        starter: String.raw`import base64, hashlib, hmac, json


def b64(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def unb64(text):
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def make_token(claims, secret):
    body = b64(json.dumps(claims, sort_keys=True).encode())
    sig = b64(hmac.new(secret.encode(), body.encode(), hashlib.sha256).digest())
    return body + "." + sig


def read_token(token, secret, now):
    # recompute the signature and compare; then check expiry
    body = token.split(".")[0]
    return json.loads(unb64(body))
`,
        solution:
          'import base64, hashlib, hmac, json\n\n\ndef b64(data):\n    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()\n\n\ndef unb64(text):\n    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))\n\n\ndef make_token(claims, secret):\n    body = b64(json.dumps(claims, sort_keys=True).encode())\n    sig = b64(hmac.new(secret.encode(), body.encode(), hashlib.sha256).digest())\n    return body + "." + sig\n\n\ndef read_token(token, secret, now):\n    try:\n        body, sig = token.split(".")\n        want = b64(hmac.new(secret.encode(), body.encode(), hashlib.sha256).digest())\n        if not hmac.compare_digest(sig, want):\n            return None\n        claims = json.loads(unb64(body))\n    except Exception:\n        return None\n    if now >= claims.get("exp", 0):\n        return None\n    return claims\n',
        tests: [
          { id: "good", description: "a genuine, unexpired token returns its claims", assertionCode: `t = make_token({"sub": "dana", "exp": 100}, "k1")\nassert read_token(t, "k1", 50) == {"sub": "dana", "exp": 100}, f"got {read_token(t, 'k1', 50)!r}"` },
          { id: "tamper", description: "changing the payload invalidates it", assertionCode: `import json\nt = make_token({"sub": "dana", "exp": 100}, "k1")\nbody, sig = t.split(".")\nforged = b64(json.dumps({"sub": "admin", "exp": 100}, sort_keys=True).encode()) + "." + sig\nassert read_token(forged, "k1", 50) is None, "a forged payload must be rejected"` },
          { id: "key", description: "a token signed with another key is rejected", assertionCode: `t = make_token({"sub": "dana", "exp": 100}, "other-key")\nassert read_token(t, "k1", 50) is None` },
          { id: "expired", description: "an expired token is rejected", assertionCode: `t = make_token({"sub": "dana", "exp": 100}, "k1")\nassert read_token(t, "k1", 100) is None and read_token(t, "k1", 500) is None, "now >= exp means expired"` },
          { id: "junk", description: "garbage returns None instead of crashing", assertionCode: `assert read_token("not-a-token", "k1", 0) is None and read_token("a.b.c", "k1", 0) is None and read_token("", "k1", 0) is None` },
        ],
        hints: ["Split into `body, sig = token.split(\".\")`, compute the expected signature the way `make_token` does, and compare with `hmac.compare_digest`.", "Wrap parsing in `try/except Exception` and return `None` in the handler, then finish with `if now >= claims.get(\"exp\", 0): return None`."],
      },
      {
        kind: "question",
        title: "Readable by anyone",
        body: "The token's payload is readable by whoever holds it. Which of these should **never** go inside it? Pick all that apply.",
        question: {
          type: "choice",
          options: ["The user's password", "The patient's medical diagnosis", "The user id", "The expiry time"],
          answer: [0, 1],
        },
        explanation: "Put only what the receiver needs to make a decision, and assume the browser, a proxy log and the user themselves can read it. A user id and an expiry are the point of a token. Passwords never belong in one, and private data that does not need to travel should stay in the database.",
      },
      {
        kind: "question",
        title: "Pick the better fit",
        body: P(
          "Neither design wins everywhere. Sessions are easy to revoke and cost a lookup; tokens need no lookup but are hard to revoke. Tap a situation, then the design that suits it better.",
        ),
        widget: {
          type: "pattern-sorter",
          props: {
            buckets: [
              { id: "session", label: "Server session", hint: "a ticket in a table" },
              { id: "token", label: "Signed token", hint: "a note with a signature" },
            ],
            items: [
              { id: "a", text: "A banking site that must log you out everywhere on one click" },
              { id: "b", text: "Ten small services that each need to verify a caller without calling a login service" },
              { id: "c", text: "A support tool where staff are suspended the moment HR says so" },
              { id: "d", text: "A short-lived pass (five minutes) given to a download link" },
            ],
            answer: { a: "session", b: "token", c: "session", d: "token" },
          },
        },
        question: { type: "widget", goal: { placed: { a: "session", b: "token", c: "session", d: "token" } } },
        explanation: "When instant revocation matters, use something you can delete. When many parties must verify with no shared database, or the credential lives for minutes, signatures win. Plenty of systems combine them: a short token for the API, backed by a revocable session that issues new ones.",
      },
      {
        kind: "recap",
        points: [
          "A **session** is a random ticket the server looks up. Easy to revoke, but every request needs the table.",
          "A **signed token** carries its own claims and a signature (an HMAC or a public-key signature). No lookup, but it stays valid until it expires.",
          "A signature proves **nobody changed the payload**; it does not hide it. Never put secrets in a token.",
          "Verify with a constant-time comparison, check the **expiry**, and reject anything malformed instead of crashing.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Hardening the session ───────────────────────────────
  {
    id: "fnd-sec-4-cookies",
    title: "Hardening the session",
    summary: "Cookie flags, expiry, rotation and revocation: the settings that decide whether a stolen session is a nuisance or a disaster.",
    minutes: 11,
    xp: 80,
    steps: [
      {
        kind: "explain",
        title: "The cookie is the key",
        body: P(
          "Whichever design you choose, the credential usually rides in a **cookie**, and the browser gives cookies special treatment: it attaches them automatically to every request to that site. That convenience is what makes them both useful and dangerous.",
          "A few small settings decide how much harm a leaked or abused cookie can do. Start with everything off and run the five attacks to see what an unprotected session suffers.",
        ),
        widget: { type: "sec-cookie", props: {} },
      },
      {
        kind: "question",
        title: "Close all five",
        body: "Turn on the settings until **every** attack is blocked. Run all five again to confirm.",
        widget: { type: "sec-cookie", props: {} },
        question: { type: "widget", goal: { allBlocked: true }, prompt: "Block all five attacks." },
        explanation: "Each attack falls to one decision: **HttpOnly** hides the cookie from scripts, **Secure** keeps it off plain http, **SameSite** (Lax or Strict) withholds it from cross-site requests, an **idle timeout** ends abandoned sessions, and a **fresh id at login** kills fixation. None of them is clever; the discipline is turning all of them on by default.",
      },
      {
        kind: "explain",
        title: "What each setting means",
        body: P(
          "- **HttpOnly**: JavaScript on the page cannot read the cookie. The browser still sends it with requests.\n- **Secure**: the cookie travels only over HTTPS.\n- **SameSite**: whether the cookie is sent on requests started from *another* site. `Lax` withholds it on cross-site form posts and background requests but allows a plain link click; `Strict` withholds it from every cross-site request; `None` sends it everywhere (and requires `Secure`).\n- **Expiry**: `Max-Age` or `Expires` bound how long the browser keeps it. A cookie with neither lives until the browser closes.\n- **Prefixes** like `__Host-` make the browser enforce Secure, a root path and no sharing with subdomains.",
          "SameSite is the main defence against **CSRF** (cross-site request forgery), where another site makes your browser submit a request you never meant to send. Modern sites also add anti-CSRF tokens for state-changing requests; see the web vulnerabilities lesson.",
        ),
      },
      {
        kind: "question",
        title: "Does HttpOnly stop XSS?",
        body: "A comment box on the clinic site has a cross-site scripting (XSS) flaw, but the session cookie is **HttpOnly**. What can the attacker's injected script still do?",
        question: {
          type: "choice",
          options: [
            "Nothing: HttpOnly neutralises XSS completely",
            "Read the cookie value and send it away",
            "Not read the cookie, but still make requests as the logged-in user from inside the page",
            "Only change the page's colours",
          ],
          answer: 2,
        },
        explanation: "HttpOnly prevents *stealing the cookie*, so the attacker cannot take the session away and use it later from their own machine. But the script runs inside your page, where the browser happily attaches the cookie to any request it makes, so it can act as the user while the tab is open. Fixing the XSS hole is the real cure; HttpOnly just shrinks the damage.",
      },
      {
        kind: "explain",
        title: "Lifetimes, rotation, revocation",
        body: P(
          "A session should not live forever. Two clocks run: an **idle timeout** (no activity for 30 minutes ends it) and an **absolute lifetime** (even a busy session ends after, say, eight hours and asks for a login again). Sensitive actions can demand a recent login on top.",
          "**Rotation** means issuing a **new** session id at moments that raise trust: at login, after a password change, when a second factor is completed, when a user's privileges increase. An id minted before those moments cannot then be reused by anyone who learned it earlier.",
          "**Revocation** is your emergency exit: log out everywhere, kill sessions when a password changes, disable a leaver's accounts. It must be fast, and the design from the last lesson decides how hard it is.",
        ),
      },
      {
        kind: "question",
        title: "When to mint a new id",
        body: "At which of these moments should the server issue a **fresh** session id? Pick all that apply.",
        question: {
          type: "choice",
          options: ["When the user logs in", "When the user changes their password", "When the user is promoted from receptionist to manager", "On every single request, so ids never repeat"],
          answer: [0, 1, 2],
        },
        explanation: "Each of the first three is a trust change, and any id that existed before it might be in someone else's hands. Rotating on every request sounds even safer but breaks tabs that make parallel requests, and it adds little beyond the three moments that matter.",
      },
      {
        kind: "explain",
        title: "Short tokens, long refresh",
        body: P(
          "Token designs often split the credential in two. The **access token** is short-lived (say 10 minutes) and sent to the API. The **refresh token** is long-lived and sent *only* to the login server, to fetch a new access token. If an access token leaks, it dies within minutes. The refresh token is the valuable one, so it is stored more carefully and is **rotated**: every time you use it, you receive a replacement and the old one stops working.",
          "That rotation enables clever theft detection. A refresh token should be used exactly once. If the *same old token appears again*, two parties hold it, one of them an attacker, and the safe response is to revoke the whole family of tokens and make everyone log in again.",
        ),
      },
      {
        kind: "question",
        title: "Spot the replay",
        body: P(
          "Dana's phone holds refresh token **R1**, and an attacker has quietly copied it. Dana's phone uses R1 and receives **R2**. A minute later the attacker presents **R1**. What should the server do?",
        ),
        question: {
          type: "choice",
          options: [
            "Accept it: R1 was valid once, and a retry is harmless",
            "Reject it quietly and carry on; Dana's R2 is still fine",
            "Treat the reuse as evidence of theft: revoke R2 and the rest of the family, and require a fresh login",
            "Hand the attacker a new token so they don't get suspicious",
          ],
          answer: 2,
        },
        explanation: "A one-time token showing up twice cannot be an innocent retry of a *used* credential: someone besides Dana has it. Rejecting only the replay leaves the attacker holding whatever else they copied. Killing the family costs Dana one login and ends the incident. (Servers allow a tiny grace window for genuine network retries.)",
      },
      {
        kind: "code",
        title: "Is this session alive?",
        body: P(
          "Write `is_session_valid(session, now, idle=1800, max_age=28800)`. `session` is a dict with `created` and `last_seen` (seconds), and `revoked` (a bool). `now` is also in seconds.",
          "A session is **dead** if it was revoked, **or** it has been idle for `idle` seconds or more, **or** it has existed for `max_age` seconds or more. Exactly equal counts as dead.",
        ),
        language: "python",
        starter: "def is_session_valid(session, now, idle=1800, max_age=28800):\n    # revoked, idle too long, or too old: not valid\n    return True\n",
        solution:
          "def is_session_valid(session, now, idle=1800, max_age=28800):\n    if session[\"revoked\"]:\n        return False\n    if now - session[\"last_seen\"] >= idle:\n        return False\n    if now - session[\"created\"] >= max_age:\n        return False\n    return True\n",
        tests: [
          { id: "fresh", description: "an active session is valid", assertionCode: `assert is_session_valid({"created": 0, "last_seen": 100, "revoked": False}, 200) is True` },
          { id: "revoked", description: "a revoked session is never valid", assertionCode: `assert is_session_valid({"created": 0, "last_seen": 100, "revoked": True}, 101) is False` },
          { id: "idle", description: "30 idle minutes (exactly) kills it", assertionCode: `s = {"created": 0, "last_seen": 1000, "revoked": False}\nassert is_session_valid(s, 2799) is True and is_session_valid(s, 2800) is False, "idle of exactly 1800 counts as dead"` },
          { id: "age", description: "an old busy session still expires", assertionCode: `s = {"created": 0, "last_seen": 28790, "revoked": False}\nassert is_session_valid(s, 28799) is True and is_session_valid(s, 28800) is False, "max_age of exactly 28800 counts as dead"` },
          { id: "custom", description: "the limits can be changed", assertionCode: `assert is_session_valid({"created": 0, "last_seen": 0, "revoked": False}, 60, idle=30) is False and is_session_valid({"created": 0, "last_seen": 0, "revoked": False}, 20, idle=30, max_age=100) is True` },
        ],
        hints: ["Check the three reasons to say no, one `if` each, and `return True` at the end.", "Idle time is `now - session[\"last_seen\"]`; age is `now - session[\"created\"]`. Both comparisons use `>=`."],
      },
      {
        kind: "recap",
        points: [
          "Set **HttpOnly**, **Secure** and **SameSite=Lax** (or Strict) on session cookies by default.",
          "Expire sessions two ways: an **idle timeout** and an **absolute lifetime**.",
          "**Rotate** the session id at login and whenever privileges or credentials change.",
          "Make **revocation** fast. Use short-lived access tokens plus rotating refresh tokens, and treat a reused refresh token as theft.",
        ],
      },
    ],
  },
];
