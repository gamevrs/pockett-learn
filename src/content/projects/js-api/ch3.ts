import type { Lesson } from "@/engine/types";
import { js, md, T } from "./shared.ts";

/** Chapter 3: Guarding the API. Signed tokens, roles and ownership, idempotent writes and a rate limiter. */
export const chapter3: Lesson[] = [
  // ───────────────────────────────────────── 9. Signed tokens
  {
    id: "js-api-9-tokens",
    title: "Signed bearer tokens",
    minutes: 45,
    xp: 210,
    concepts: ["authentication", "HMAC", "JWT structure", "token expiry", "constant-time comparison", "401 and WWW-Authenticate"],
    learn: md`### Who is asking?

So far anyone can call anything. Authentication answers "who are you?"; the next lesson uses the answer to decide "what may you do?". A request proves its identity with a **credential**. For an API called by apps, the usual credential is a **bearer token**: a string the client received at login and sends with every request,

~~~
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
~~~

"Bearer" means whoever holds the token is treated as its owner, so tokens must be short-lived and carried only over encrypted connections.

### Why signed tokens

The server could store a random token per login and look it up each time (a *session*). Or it can issue a **self-contained** token: a small JSON object of claims (who, role, when it expires) plus a **signature** only the server can produce. Anyone can read the claims, nobody can change them without breaking the signature, and verifying needs no database. That is the idea behind JSON Web Tokens (JWT). A token has three base64url parts joined by dots:

~~~
header.payload.signature
{"alg":"HS256","typ":"JWT"}.{"sub":"u-ana","role":"rider","iat":1768500000,"exp":1768500900}.<32 bytes>
~~~

The signature is an **HMAC-SHA-256**: a keyed hash of ¦header.payload¦ using a secret that exists only on the server. Without the key an attacker cannot compute a valid signature for edited claims. (Reading the payload is easy, so never put secrets in it.)

### Verification, in the right order

Treat the whole token as hostile until the signature checks out.

1. **Shape**: exactly three non-empty parts, otherwise *malformed*.
2. **Algorithm**: the header is attacker-controlled. Accept only ¦HS256¦. Libraries that obeyed a header saying ¦"alg": "none"¦ (no signature at all) were once a famous hole.
3. **Signature**: recompute it and compare. Use a **constant-time comparison**: ¦===¦ stops at the first differing character, so the time it takes leaks how many leading characters were right, letting an attacker guess a signature piece by piece. A constant-time compare looks at every byte and combines the differences with ¦|¦ and ¦^¦.
4. **Only now** parse the payload and check ¦exp¦ (expiry) against the clock. The clock is ¦Date.now()¦ in seconds; in tests you move it with ¦sim.tick¦.

You are given the primitive: ¦hmacSha256(key, message)¦ returns the 32 signature bytes, as a ¦Uint8Array¦. Your ¦bytesToBase64Url¦ from lesson 8 turns them into text.

### Short lives

A stolen token works until it expires, so keep that short (here 15 minutes). Real systems pair it with a longer-lived refresh credential and a revocation story; stateless tokens trade easy revocation for speed, which is worth saying out loud in design reviews.

### Passwords and PINs are never stored

Riders unlock bikes with a PIN. The database stores only a **hash** of it, so a leaked table does not reveal PINs. (A 4-digit PIN is a teaching device; real passwords need a deliberately slow hash such as scrypt or argon2 and per-user salts. Our fast keyed hash is not enough for real passwords.) Login compares hashes in constant time, answers the *same* error whether the rider id or the PIN was wrong (otherwise attackers can enumerate valid ids), and still does the hash work for unknown riders so timing does not give the game away.

### 401, not 403

A missing or bad credential is **401 Unauthorized** with a ¦WWW-Authenticate: Bearer realm="dockline", error="invalid_token"¦ header telling the client how to authenticate. (403 is for "I know who you are and the answer is still no" - next lesson.) A request with *no* credentials is simply anonymous: some routes are public, so rejecting happens later, in the route's own policy.

### Common mistakes

- Comparing signatures with ¦===¦.
- Trusting the ¦alg¦ in the header or the payload before verifying.
- No expiry, or expiry checked in milliseconds against seconds.
- Putting the signing secret in the repository. In real life it comes from the environment or a secret manager and is rotated.
- Different messages for "no such user" and "wrong password".`,
    mission: md`Riders will unlock bikes from the app, mechanics will mark bikes for service, and the operations lead will manage stations. They all need to prove who they are, and nobody should be able to claim to be someone else by editing a token.

Build the token signer and verifier, the middleware that reads the ¦Authorization¦ header, and the login route. In the control room, rider cards log in against your API and show the decoded token; a Tamper button proves a forged one is rejected.`,
    tasks: [
      "safeEqual(a, b): constant-time string comparison",
      "signToken(claims, { secret, ttlSeconds, now }) and verifyToken(token, { secret, now }) with TokenError reasons (malformed, unsupported_alg, bad_signature, expired)",
      "authenticate middleware: Bearer parsing, req.user, 401 with WWW-Authenticate; no header means anonymous",
      "POST /auth/token: validate, constant-time PIN check, one error for every kind of failure, returns { token, tokenType, expiresIn }",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 9: who is calling?

// ── given: secrets and riders ──
// In a real deployment these come from the environment / a secret manager, never from the source file.
const TOKEN_SECRET = "dockline-signing-key-for-practice-only";
const PIN_PEPPER = "dockline-pin-pepper-for-practice-only";
const TOKEN_TTL_SECONDS = 900;

const toHex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
// Practice only: real passwords need a slow hash (scrypt, argon2). hmacSha256 returns the 32 raw bytes.
const hashPin = (pin) => toHex(hmacSha256(PIN_PEPPER, String(pin)));

const riderRecord = (id, name, role, pin) => ({ id, name, role, pinHash: hashPin(pin) });
db.riders = new Repository(
  "riders",
  [
    riderRecord("u-ana", "Ana Whitlock", "rider", "4821"),
    riderRecord("u-ben", "Ben Okafor", "rider", "7390"),
    riderRecord("u-mia", "Mia Tanaka", "mechanic", "1156"),
    riderRecord("u-root", "Rae Calder", "admin", "9034"),
  ],
  { nextNumber: 5, makeId: (n) => "u-" + n },
);

// ── constant-time comparison ──
// true only when both strings are identical. Do NOT return early: look at every byte of the longer one
// (UTF-8 bytes via TextEncoder), accumulate differences with | and ^, and fold the length difference in too.
function safeEqual(a, b) {
  // TODO
}

// ── tokens ──
class TokenError extends Error {
  constructor(reason) {
    super(¦Token rejected: \${reason}¦);
    this.name = "TokenError";
    this.reason = reason; // "malformed" | "unsupported_alg" | "bad_signature" | "expired"
  }
}

// header.payload.signature, each part base64url (bytesToBase64Url / textToBase64Url from lesson 8).
//   header    {"alg":"HS256","typ":"JWT"}
//   payload   { ...claims, iat: <seconds now>, exp: iat + ttlSeconds }       (now = Date.now() by default, in ms)
//   signature bytesToBase64Url(hmacSha256(secret, header + "." + payload))
function signToken(claims, options = {}) {
  // TODO: options.secret (TOKEN_SECRET), options.ttlSeconds (TOKEN_TTL_SECONDS), options.now (Date.now())
}

// Return the payload object, or throw new TokenError(reason). Check in this order:
//   not a string, or not exactly three non-empty parts          -> "malformed"
//   header is not valid JSON or its alg is not "HS256"          -> "unsupported_alg"  (invalid header JSON -> "malformed")
//   signature differs from the recomputed one (safeEqual)       -> "bad_signature"
//   payload is not valid JSON                                    -> "malformed"
//   payload.exp is not a number, or now >= exp * 1000            -> "expired"
function verifyToken(token, options = {}) {
  // TODO: options.secret, options.now (ms)
}

// ── the middleware ──
// A 401 with a WWW-Authenticate header. error is "invalid_token" or "invalid_request"; description is a short phrase.
function unauthorized(error, message, description) {
  return new HttpError(401, message, {
    code: error,
    headers: { "www-authenticate": ¦Bearer realm="dockline", error="\${error}", error_description="\${description}"¦ },
  });
}

// Reads "Authorization: Bearer <token>".
//   - no header at all                  -> anonymous: leave req.user = null and carry on
//   - not the form "Bearer <token>"     -> throw unauthorized("invalid_request", "Use the Bearer scheme: Authorization: Bearer <token>", "malformed header")
//   - TokenError "expired"              -> throw unauthorized("invalid_token", "The access token has expired", "token expired")
//   - any other TokenError              -> throw unauthorized("invalid_token", "The access token is not valid", "token invalid")
//   - good token                        -> req.user = { id: payload.sub, role: payload.role, name: payload.name }
function authenticate(req, res, next) {
  // TODO
}

// TODO: app.use(authenticate);

// ── login ──
const loginSchema = {
  riderId: { type: "string", required: true, max: 40 },
  pin: { type: "string", required: true, pattern: /^\d{4}$/ },
};
const INVALID_LOGIN = () => new HttpError(401, "Rider id or PIN is wrong", { code: "invalid_credentials" });
const DUMMY_HASH = hashPin("0000");

// POST /auth/token with body { riderId, pin } (validated with loginSchema, input from req.valid):
//   look the rider up; compare hashPin(pin) with the stored hash using safeEqual; if the rider does not exist, compare against DUMMY_HASH anyway
//   wrong id and wrong PIN throw the SAME INVALID_LOGIN()
//   success: 200 { token: signToken({ sub: rider.id, role: rider.role, name: rider.name }), tokenType: "Bearer", expiresIn: TOKEN_TTL_SECONDS }
router.post("/auth/token", async function login(req, res) {
  // TODO
});

// TODO: router.before("POST", "/auth/token", validateBody(loginSchema));
`,
    solutionAdd: js`const TOKEN_SECRET = "dockline-signing-key-for-practice-only";
const PIN_PEPPER = "dockline-pin-pepper-for-practice-only";
const TOKEN_TTL_SECONDS = 900;

const toHex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
const hashPin = (pin) => toHex(hmacSha256(PIN_PEPPER, String(pin)));

const riderRecord = (id, name, role, pin) => ({ id, name, role, pinHash: hashPin(pin) });
db.riders = new Repository(
  "riders",
  [
    riderRecord("u-ana", "Ana Whitlock", "rider", "4821"),
    riderRecord("u-ben", "Ben Okafor", "rider", "7390"),
    riderRecord("u-mia", "Mia Tanaka", "mechanic", "1156"),
    riderRecord("u-root", "Rae Calder", "admin", "9034"),
  ],
  { nextNumber: 5, makeId: (n) => "u-" + n },
);

function safeEqual(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  let diff = x.length ^ y.length;
  const longest = Math.max(x.length, y.length);
  for (let i = 0; i < longest; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

class TokenError extends Error {
  constructor(reason) {
    super(¦Token rejected: \${reason}¦);
    this.name = "TokenError";
    this.reason = reason;
  }
}

function signToken(claims, options = {}) {
  const secret = options.secret ?? TOKEN_SECRET;
  const ttl = options.ttlSeconds ?? TOKEN_TTL_SECONDS;
  const iat = Math.floor((options.now ?? Date.now()) / 1000);
  const header = textToBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = textToBase64Url(JSON.stringify({ ...claims, iat, exp: iat + ttl }));
  const signature = bytesToBase64Url(hmacSha256(secret, ¦\${header}.\${payload}¦));
  return ¦\${header}.\${payload}.\${signature}¦;
}

function verifyToken(token, options = {}) {
  const secret = options.secret ?? TOKEN_SECRET;
  const now = options.now ?? Date.now();
  if (typeof token !== "string") throw new TokenError("malformed");
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((p) => p === "")) throw new TokenError("malformed");
  const [header, payload, signature] = parts;
  let head;
  try {
    head = JSON.parse(base64UrlToText(header));
  } catch {
    throw new TokenError("malformed");
  }
  if (head?.alg !== "HS256") throw new TokenError("unsupported_alg");
  const expected = bytesToBase64Url(hmacSha256(secret, ¦\${header}.\${payload}¦));
  if (!safeEqual(signature, expected)) throw new TokenError("bad_signature");
  let claims;
  try {
    claims = JSON.parse(base64UrlToText(payload));
  } catch {
    throw new TokenError("malformed");
  }
  if (typeof claims?.exp !== "number" || now >= claims.exp * 1000) throw new TokenError("expired");
  return claims;
}

function unauthorized(error, message, description) {
  return new HttpError(401, message, {
    code: error,
    headers: { "www-authenticate": ¦Bearer realm="dockline", error="\${error}", error_description="\${description}"¦ },
  });
}

function authenticate(req, res, next) {
  const header = req.header("authorization");
  if (header === undefined) return next();
  const match = /^Bearer (\S+)$/.exec(header);
  if (!match) throw unauthorized("invalid_request", "Use the Bearer scheme: Authorization: Bearer <token>", "malformed header");
  let claims;
  try {
    claims = verifyToken(match[1]);
  } catch (err) {
    if (!(err instanceof TokenError)) throw err;
    if (err.reason === "expired") throw unauthorized("invalid_token", "The access token has expired", "token expired");
    throw unauthorized("invalid_token", "The access token is not valid", "token invalid");
  }
  req.user = { id: claims.sub, role: claims.role, name: claims.name };
  return next();
}

app.use(authenticate);

const loginSchema = {
  riderId: { type: "string", required: true, max: 40 },
  pin: { type: "string", required: true, pattern: /^\d{4}$/ },
};
const INVALID_LOGIN = () => new HttpError(401, "Rider id or PIN is wrong", { code: "invalid_credentials" });
const DUMMY_HASH = hashPin("0000");

router.post("/auth/token", async function login(req, res) {
  const { riderId, pin } = req.valid;
  const rider = await db.riders.get(riderId);
  const matches = safeEqual(hashPin(pin), rider ? rider.pinHash : DUMMY_HASH);
  if (!rider || !matches) throw INVALID_LOGIN();
  res.json({ token: signToken({ sub: rider.id, role: rider.role, name: rider.name }), tokenType: "Bearer", expiresIn: TOKEN_TTL_SECONDS });
});

router.before("POST", "/auth/token", validateBody(loginSchema));`,
    explanation:
      "safeEqual never exits early: it XORs every byte pair (padding the shorter side with zeros) and folds the length difference into the same accumulator, so its running time does not depend on where the strings first differ. signToken builds header.payload with iat and exp in seconds and signs it with the runtime's synchronous HMAC; verifyToken is deliberately ordered, checking shape, then the (untrusted) algorithm, then the signature with safeEqual, and only then parsing the payload and testing expiry. authenticate turns the header into req.user, or into a 401 with WWW-Authenticate, and treats a missing header as anonymous. The login route always hashes, always compares, and throws one identical error for unknown riders and wrong PINs.",
    hints: [
      { id: "h1", title: "safeEqual", content: "Encode both strings with new TextEncoder().encode(String(x)). let diff = x.length ^ y.length; then for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0); return diff === 0. No break, no early return." },
      { id: "h2", title: "Sign and verify", content: "header = textToBase64Url(JSON.stringify({ alg: \"HS256\", typ: \"JWT\" })), payload = textToBase64Url(JSON.stringify({ ...claims, iat, exp: iat + ttl })), signature = bytesToBase64Url(hmacSha256(secret, header + \".\" + payload)). verifyToken recomputes the signature from the first two parts of the token and compares with safeEqual BEFORE it parses the payload. Remember exp is in seconds: compare now >= exp * 1000." },
      { id: "h3", title: "authenticate and login", content: "const match = /^Bearer (\\S+)$/.exec(header). Wrap verifyToken in try/catch and map TokenError reasons to the two 401s. For login: const rider = await db.riders.get(riderId); const ok = safeEqual(hashPin(pin), rider ? rider.pinHash : DUMMY_HASH); if (!rider || !ok) throw INVALID_LOGIN()." },
    ],
    tests: [
      {
        id: "t1",
        description: "safeEqual compares exactly",
        assertionCode: T(js`assertEqual(safeEqual("abc", "abc"), true);
assertEqual(safeEqual("", ""), true);
assertEqual(safeEqual("abc", "abd"), false, "same length, last differs");
assertEqual(safeEqual("abc", "xbc"), false, "first differs");
assertEqual(safeEqual("abc", "abcd"), false, "different lengths");
assertEqual(safeEqual("abcd", "abc"), false);
assertEqual(safeEqual("é", "é"), true);
assertEqual(safeEqual("é", "e"), false);
assertEqual(safeEqual(12, "12"), true, "values are compared as text");
assertEqual(hashPin("4821").length, 64, "the PIN hash is 64 hex characters");
assertEqual(hashPin("4821"), hashPin("4821"));
assert(hashPin("4821") !== hashPin("4822"), "different PINs hash differently");`),
      },
      {
        id: "t2",
        description: "signToken builds a real HS256 token",
        assertionCode: T(js`const now = 1_768_500_000_000;
const token = signToken({ sub: "u-ana", role: "rider" }, { secret: "s3cret", now });
const parts = token.split(".");
assertEqual(parts.length, 3, "header.payload.signature");
assert(parts.every((p) => /^[A-Za-z0-9_-]+$/.test(p)), "base64url parts");
assertEqual(JSON.parse(base64UrlToText(parts[0])), { alg: "HS256", typ: "JWT" });
assertEqual(JSON.parse(base64UrlToText(parts[1])), { sub: "u-ana", role: "rider", iat: 1_768_500_000, exp: 1_768_500_900 }, "iat and exp are in SECONDS; default lifetime 15 minutes");
assertEqual(parts[2], bytesToBase64Url(hmacSha256("s3cret", parts[0] + "." + parts[1])), "the signature is the HMAC of header.payload");
const short = signToken({ sub: "x" }, { secret: "k", now, ttlSeconds: 60 });
assertEqual(JSON.parse(base64UrlToText(short.split(".")[1])).exp, 1_768_500_060, "ttlSeconds is respected");
const dflt = signToken({ sub: "x" });
assertEqual(verifyToken(dflt).sub, "x", "defaults: TOKEN_SECRET and the current clock");`),
      },
      {
        id: "t3",
        description: "verifyToken accepts good tokens and explains rejections",
        assertionCode: T(js`const now = 1_768_500_000_000;
const good = signToken({ sub: "u-ana", role: "rider" }, { secret: "k", now });
assertEqual(verifyToken(good, { secret: "k", now: now + 1000 }).sub, "u-ana");
const reason = (token, opts = { secret: "k", now }) => { const err = assertThrows(() => verifyToken(token, opts), "TokenError"); assert(err instanceof TokenError); return err.reason; };
assertEqual(reason(good, { secret: "other", now }), "bad_signature", "wrong secret");
const [h, p, s] = good.split(".");
const evilPayload = textToBase64Url(JSON.stringify({ sub: "u-root", role: "admin", iat: 1_768_500_000, exp: 1_768_500_900 }));
assertEqual(reason(h + "." + evilPayload + "." + s), "bad_signature", "edited claims break the signature");
assertEqual(reason(h + "." + p + "." + s.slice(0, -1) + (s.endsWith("A") ? "B" : "A")), "bad_signature", "a flipped signature character");
assertEqual(reason(good, { secret: "k", now: now + 900_000 }), "expired", "exactly at exp the token is expired");
assertEqual(verifyToken(good, { secret: "k", now: now + 899_999 }).sub, "u-ana", "one millisecond before is fine");
for (const junk of ["", "abc", "a.b", "a.b.c.d", "..", "a..c", null, undefined, 42, {}]) assertEqual(reason(junk), "malformed", "junk " + JSON.stringify(junk));
const none = textToBase64Url(JSON.stringify({ alg: "none", typ: "JWT" })) + "." + evilPayload + ".";
assertEqual(reason(none), "malformed", "alg none with an empty signature");
const none2 = textToBase64Url(JSON.stringify({ alg: "none", typ: "JWT" })) + "." + evilPayload + ".x";
assertEqual(reason(none2), "unsupported_alg", "the algorithm in the header is never obeyed");
const hs512 = textToBase64Url(JSON.stringify({ alg: "HS512" })) + "." + p + "." + s;
assertEqual(reason(hs512), "unsupported_alg");
const noExp = (() => { const hh = textToBase64Url(JSON.stringify({ alg: "HS256" })); const pp = textToBase64Url(JSON.stringify({ sub: "x" })); return hh + "." + pp + "." + bytesToBase64Url(hmacSha256("k", hh + "." + pp)); })();
assertEqual(reason(noExp), "expired", "a token without exp is not accepted");`),
      },
      {
        id: "t4",
        description: "authenticate: anonymous, valid, expired and malformed credentials",
        assertionCode: T(js`const run = async (headers) => { const req = new HttpRequest({ url: "/", headers }); let called = false; await authenticate(req, new HttpResponse(), () => { called = true; }); return { req, called }; };
const anon = await run({});
assertEqual([anon.req.user, anon.called], [null, true], "no header: anonymous, carry on");
const token = signToken({ sub: "u-ben", role: "rider", name: "Ben Okafor" });
const ok = await run({ Authorization: "Bearer " + token });
assertEqual(ok.req.user, { id: "u-ben", role: "rider", name: "Ben Okafor" });
assertEqual(ok.called, true);
const grab = (headers) => assertThrows(() => authenticate(new HttpRequest({ url: "/", headers }), new HttpResponse(), () => {}), "HttpError");
const forged = grab({ authorization: "Bearer " + token.slice(0, -2) + "xx" });
assertEqual([forged.status, forged.code], [401, "invalid_token"]);
assert(forged.headers["www-authenticate"].startsWith('Bearer realm="dockline"') && forged.headers["www-authenticate"].includes('error="invalid_token"'), "WWW-Authenticate tells the client how to authenticate: " + forged.headers["www-authenticate"]);
const scheme = grab({ authorization: "Basic dXNlcjpwYXNz" });
assertEqual([scheme.status, scheme.code], [401, "invalid_request"]);
assertEqual(grab({ authorization: "Bearer" }).code, "invalid_request", "no token after the scheme");
assertEqual(grab({ authorization: "Bearer a b" }).code, "invalid_request", "extra words");
const short = signToken({ sub: "u-ana" }, { ttlSeconds: 5 });
await sim.tick(6000);
const expired = grab({ authorization: "Bearer " + short });
assertEqual([expired.code, expired.message], ["invalid_token", "The access token has expired"], "the clock moved on, so the token expired");
assert(expired.headers["www-authenticate"].includes("expired"));`),
      },
      {
        id: "t5",
        description: "POST /auth/token: login succeeds, failures are indistinguishable",
        assertionCode: T(js`db.reset();
const ok = await call("POST", "/auth/token", { body: { riderId: "u-ana", pin: "4821" } });
assertEqual(ok.status, 200);
assertEqual([ok.body.tokenType, ok.body.expiresIn], ["Bearer", 900]);
const claims = verifyToken(ok.body.token);
assertEqual([claims.sub, claims.role, claims.name], ["u-ana", "rider", "Ana Whitlock"], "the token carries id, role and name");
assert(!JSON.stringify(ok).includes("pinHash") && !JSON.stringify(ok).includes(hashPin("4821")), "the PIN hash never leaves the server");
const admin = await call("POST", "/auth/token", { body: { riderId: "u-root", pin: "9034" } });
assertEqual(verifyToken(admin.body.token).role, "admin");
const wrongPin = await call("POST", "/auth/token", { body: { riderId: "u-ana", pin: "0000" } });
const noRider = await call("POST", "/auth/token", { body: { riderId: "u-ghost", pin: "4821" } });
assertEqual([wrongPin.status, noRider.status], [401, 401]);
assertEqual(wrongPin.body.detail, noRider.body.detail, "unknown rider and wrong PIN say exactly the same thing");
assertEqual(wrongPin.body.type, noRider.body.type);
const bad = await call("POST", "/auth/token", { body: { riderId: "u-ana", pin: "12ab" } });
assertEqual(bad.status, 400, "a PIN that is not four digits is rejected before any lookup");
assertEqual(bad.body.errors[0].field, "pin");
assertEqual((await call("POST", "/auth/token", { body: { riderId: "u-ana", pin: "4821", admin: true } })).status, 400, "extra fields are refused");`),
      },
      {
        id: "t6",
        description: "The real app: tokens are accepted, forged ones are not, and tokens expire",
        assertionCode: T(js`db.reset();
const token = await tokenFor("u-mia");
const authed = await call("GET", "/stations/st-01", { headers: { authorization: "Bearer " + token } });
assertEqual(authed.status, 200, "a valid token is accepted");
assert(authed.trace.includes("authenticate"), "authenticate is part of the pipeline");
assertEqual((await call("GET", "/stations/st-01")).status, 200, "reads without a token still work: public routes stay public");
const forged = await call("GET", "/stations/st-01", { headers: { authorization: "Bearer " + token.slice(0, -3) + "abc" } });
assertEqual(forged.status, 401, "presenting a bad credential is an error even on a public route");
assertEqual(forged.headers["content-type"], "application/problem+json");
assert(forged.headers["www-authenticate"].includes("invalid_token"));
assertEqual(forged.body.type, "https://dockline.example/problems/invalid-token");
const idx = listMiddleware();
assert(idx.indexOf("jsonBody") < idx.indexOf("authenticate"), "authenticate sits after the body parser: " + idx.join(", "));
await sim.tick(901_000);
const late = await call("GET", "/stations/st-01", { headers: { authorization: "Bearer " + token } });
assertEqual(late.status, 401, "15 minutes later the same token is rejected");
assert(late.headers["www-authenticate"].includes("expired"));`),
      },
    ],
    unlocks: ["api-auth"],
    checks: [
      {
        prompt: md`Why is the signature compared with a constant-time function instead of ¦===¦?`,
        question: {
          type: "choice",
          options: [
            "===  does not work on strings",
            "An early-exit comparison takes slightly longer the more leading characters match, which lets an attacker recover a valid signature by measuring response times",
            "Constant-time comparisons are faster",
            "Because tokens are binary",
          ],
          answer: 1,
        },
        explanation: md`Timing is a side channel. Any comparison of secrets (signatures, password hashes, API keys) should take the same time whatever the input.`,
      },
      {
        prompt: md`The login endpoint answers "no such rider" for unknown ids and "wrong PIN" for known ones. What is the problem?`,
        question: {
          type: "choice",
          options: [
            "Nothing, it is more helpful",
            "An attacker can test which rider ids exist (user enumeration) and focus guessing on those",
            "It uses too many status codes",
            "It breaks idempotency",
          ],
          answer: 1,
        },
        explanation: md`One message, one status, and the same amount of work for both failures. Helpful errors belong on the validation path, not on the credential check.`,
      },
    ],
  },

  // ───────────────────────────────────────── 10. Authorization
  {
    id: "js-api-10-access",
    title: "Roles, ownership and rentals",
    minutes: 50,
    xp: 230,
    concepts: ["authorization", "RBAC", "IDOR", "403 vs 404", "ownership checks", "atomic claims", "least privilege"],
    learn: md`### Authentication is not permission

The token says *who*. Authorization decides *what that person may do*, and it is a separate decision made on **every** request for **every** resource. There are two layers.

### Layer 1: roles (RBAC)

Role-based access control assigns each user a role (¦rider¦, ¦mechanic¦, ¦admin¦) and each operation a set of roles allowed to perform it. It is coarse and cheap, and it can be checked **before** touching any data:

- **Read stations and bikes**: rider, mechanic and admin.
- **Change a station**: mechanic and admin.
- **Create or delete a station**: admin only.
- **Rent a bike, see your own rentals**: rider, mechanic and admin.
- **See every rental**: admin only.

Apply the **principle of least privilege**: grant the least that works, and default to deny. A forgotten guard on a new route should fail closed, which is one reason policies are attached in a single readable list with ¦router.before¦.

The status codes matter: **401** if there is no valid identity, **403 Forbidden** if there is one and the role is not enough. Check authentication first; an anonymous caller who gets 403 learns nothing about whether they could log in.

### Layer 2: ownership (object-level authorization)

A role cannot say "Ana may see *her* rentals but not Ben's". That needs a check on the specific object. Forgetting it is the number one API vulnerability, known as **BOLA** or **IDOR** (insecure direct object reference): the route ¦GET /rentals/rt-1002¦ checks the caller is logged in, loads the rental by id, and returns it, so anyone can read anyone's rentals just by trying ids.

The fix is mechanical: after loading an object, ask "may *this user* access *this object*?" in the same place you load it. For a list, filter first (¦riderId === user.id¦); for a single object, check after loading.

### 403 or 404 for someone else's object?

If Ben requests Ana's rental and you answer 403, you confirmed it exists. Answer **404 exactly as for a rental that does not exist** (same status, same wording apart from the id) and you reveal nothing. Rules of thumb: use 403 when existence is public knowledge (the station list) and 404 when existence is itself private (someone's rental history).

### Never take ownership from the client

When Ana rents a bike, the rental's ¦riderId¦ comes from ¦req.user.id¦, never from the body. The schema accepts only ¦bikeId¦; a body with ¦riderId¦ is rejected as an unknown field. The same applies to roles, prices, timestamps and anything else the client has no business setting.

### Business rules and races

Renting a bike is not just a write: the bike must exist, be **available**, and the rider must not already hold another rental. And two riders can reach for the same bike in the same millisecond. Lesson 5's ¦updateWhere¦ solves it: *claim* the bike with a compare-and-set (¦status === "available"¦ becomes ¦"rented"¦). Exactly one claim wins; the loser gets a clean 409 instead of a double-booked bike. Returning a bike checks the rental belongs to the caller, has not already ended, and that the destination station exists and has room.

### Common mistakes

- Roles checked in the UI only.
- Filtering by owner on the list route but not on the detail route.
- 403 for foreign objects when existence should stay private.
- Trusting ¦riderId¦ (or ¦role¦) from the body or from a header like ¦x-user-id¦.
- Authorization code scattered through handlers instead of one policy list.`,
    mission: md`Dockline now knows who is calling. Time to decide what each person may do, and to open the rental flow: riders unlock a bike, ride, and dock it somewhere else.

Add the role guards, then the rentals routes with ownership checks. Ana must never read Ben's trips, and two riders grabbing the same bike must not both succeed. The control room's access matrix runs these checks against your API for real.`,
    tasks: [
      "requireAuth and requireRole(...roles) middleware (401 vs 403)",
      "attach role policies to the station write routes with router.before",
      "startRental and finishRental service functions with business rules and an atomic bike claim",
      "rentals routes: GET /rentals (own, admin sees all, cursor paging), GET /rentals/:id (foreign ids look like missing ones), POST /rentals, POST /rentals/:id/return",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 10: what may each caller do?

// 401 when there is no identity (req.user is null). Keep the www-authenticate header of lesson 9: ¦Bearer realm="dockline"¦.
function requireAuth(req, res, next) {
  // TODO: throw new HttpError(401, "Authentication is required", { code: "unauthenticated", headers: { "www-authenticate": ... } })
}

// requireRole("admin", "mechanic") -> a middleware NAMED requireRole.
//   no identity -> the same 401 as requireAuth; a role that is not listed -> HttpError 403, code "forbidden",
//   message ¦This action needs one of the roles: admin, mechanic¦
function requireRole(...roles) {
  // TODO
}

// TODO: policies for the station routes (the last one attached is the first to run, so authorisation comes before validation):
//   POST /stations, DELETE /stations/:id        admin only
//   PUT /stations/:id, PATCH /stations/:id       mechanic or admin

// ── rentals: validation shapes and helpers ──
const rentalSchema = { bikeId: { type: "string", required: true, max: 20 } };
const returnSchema = { stationId: { type: "string", required: true, max: 20 } };
const RENTAL_QUERY = { cursor: true, filters: {}, defaultLimit: 10, maxLimit: 50 };

const rentalNotFound = (id) => new HttpError(404, ¦Rental \${id} does not exist¦, { code: "not_found" });
// Admins may see every rental; everyone else only their own.
const canAccessRental = (user, rental) => user.role === "admin" || rental.riderId === user.id;

// Start a rental for user. Rules, in order:
//   - the bike must exist: HttpError 404, code "bike_not_found"
//   - the user must not already have a rental with returnedAt === null: 409, code "rental_in_progress"
//   - claim the bike atomically: db.bikes.updateWhere(bikeId, (b) => b.status === "available", { status: "rented", stationId: null });
//     null (not available) -> 409, code "bike_unavailable"
//   - create the rental { riderId: user.id, bikeId, fromStationId: <the bike's station before the claim>, toStationId: null,
//     startedAt: new Date().toISOString(), returnedAt: null } and return it
async function startRental(user, bikeId) {
  // TODO
}

// End a rental. Rules, in order:
//   - the rental must exist AND be accessible to the user (rentalNotFound otherwise, for both cases)
//   - returnedAt must still be null: 409, code "already_returned"
//   - the station must exist: 404, code "station_not_found"
//   - the station must have room: bikes docked there (stationId === id) must be fewer than its capacity, else 409, code "station_full"
//   - dock the bike (stationId = the station, status "available"), set the rental's toStationId and returnedAt, return the updated rental
async function finishRental(user, rentalId, stationId) {
  // TODO
}

// 200 { items, next }: the caller's rentals (all of them for an admin), paged with the cursor helpers of lesson 8.
router.get("/rentals", async function listRentals(req, res) {
  // TODO: parseListQuery(req.query, RENTAL_QUERY), filter by canAccessRental, paginateAfter
});

// 200 with the rental; a missing rental AND someone else's rental both throw rentalNotFound.
router.get("/rentals/:id", async function getRental(req, res) {
  // TODO
});

// 201 with the new rental and a location header.
router.post("/rentals", async function createRental(req, res) {
  // TODO: input is req.valid
});

// 200 with the finished rental.
router.post("/rentals/:id/return", async function returnRental(req, res) {
  // TODO
});

// TODO: attach policies and validation to the four rentals routes: requireAuth on all of them,
//   validateBody(rentalSchema) for POST /rentals, validateBody(returnSchema) for the return route.
`,
    solutionAdd: js`function requireAuth(req, res, next) {
  if (!req.user) {
    throw new HttpError(401, "Authentication is required", { code: "unauthenticated", headers: { "www-authenticate": 'Bearer realm="dockline"' } });
  }
  return next();
}

function requireRole(...roles) {
  return function requireRole(req, res, next) {
    if (!req.user) {
      throw new HttpError(401, "Authentication is required", { code: "unauthenticated", headers: { "www-authenticate": 'Bearer realm="dockline"' } });
    }
    if (!roles.includes(req.user.role)) {
      throw new HttpError(403, ¦This action needs one of the roles: \${roles.join(", ")}¦, { code: "forbidden" });
    }
    return next();
  };
}

router.before("POST", "/stations", requireRole("admin"));
router.before("DELETE", "/stations/:id", requireRole("admin"));
router.before("PUT", "/stations/:id", requireRole("mechanic", "admin"));
router.before("PATCH", "/stations/:id", requireRole("mechanic", "admin"));

const rentalSchema = { bikeId: { type: "string", required: true, max: 20 } };
const returnSchema = { stationId: { type: "string", required: true, max: 20 } };
const RENTAL_QUERY = { cursor: true, filters: {}, defaultLimit: 10, maxLimit: 50 };

const rentalNotFound = (id) => new HttpError(404, ¦Rental \${id} does not exist¦, { code: "not_found" });
const canAccessRental = (user, rental) => user.role === "admin" || rental.riderId === user.id;

async function startRental(user, bikeId) {
  const bike = await db.bikes.get(bikeId);
  if (!bike) throw new HttpError(404, ¦Bike \${bikeId} does not exist¦, { code: "bike_not_found" });
  const mine = (await db.rentals.list()).filter((r) => r.riderId === user.id && r.returnedAt === null);
  if (mine.length > 0) throw new HttpError(409, "Finish your current rental before starting another", { code: "rental_in_progress" });
  const claimed = await db.bikes.updateWhere(bikeId, (b) => b.status === "available", { status: "rented", stationId: null });
  if (!claimed) throw new HttpError(409, ¦Bike \${bikeId} is not available¦, { code: "bike_unavailable" });
  return db.rentals.create({
    riderId: user.id,
    bikeId,
    fromStationId: bike.stationId,
    toStationId: null,
    startedAt: new Date().toISOString(),
    returnedAt: null,
  });
}

async function finishRental(user, rentalId, stationId) {
  const rental = await db.rentals.get(rentalId);
  if (!rental || !canAccessRental(user, rental)) throw rentalNotFound(rentalId);
  if (rental.returnedAt !== null) throw new HttpError(409, "This rental has already ended", { code: "already_returned" });
  const dock = await db.stations.get(stationId);
  if (!dock) throw new HttpError(404, ¦Station \${stationId} does not exist¦, { code: "station_not_found" });
  const docked = (await db.bikes.list()).filter((b) => b.stationId === stationId);
  if (docked.length >= dock.capacity) throw new HttpError(409, ¦Station \${stationId} is full¦, { code: "station_full" });
  await db.bikes.update(rental.bikeId, { stationId, status: "available" });
  return db.rentals.update(rentalId, { toStationId: stationId, returnedAt: new Date().toISOString() });
}

router.get("/rentals", async function listRentals(req, res) {
  const q = parseListQuery(req.query, RENTAL_QUERY);
  const visible = (await db.rentals.list()).filter((r) => canAccessRental(req.user, r));
  res.json(paginateAfter(visible, { afterId: q.after === undefined ? undefined : decodeCursor(q.after), limit: q.limit }));
});

router.get("/rentals/:id", async function getRental(req, res) {
  const found = await db.rentals.get(req.params.id);
  if (!found || !canAccessRental(req.user, found)) throw rentalNotFound(req.params.id);
  res.json(found);
});

router.post("/rentals", async function createRental(req, res) {
  const created = await startRental(req.user, req.valid.bikeId);
  res.status(201).set("location", ¦/rentals/\${created.id}¦).json(created);
});

router.post("/rentals/:id/return", async function returnRental(req, res) {
  res.json(await finishRental(req.user, req.params.id, req.valid.stationId));
});

router.before("GET", "/rentals", requireAuth);
router.before("GET", "/rentals/:id", requireAuth);
router.before("POST", "/rentals", validateBody(rentalSchema));
router.before("POST", "/rentals", requireAuth);
router.before("POST", "/rentals/:id/return", validateBody(returnSchema));
router.before("POST", "/rentals/:id/return", requireAuth);`,
    explanation:
      "requireRole closes over the allowed roles and returns a middleware that separates 'no identity' (401) from 'wrong role' (403). Because router.before puts the newest attachment first, attaching validation before the role check makes the run order auth, then validation. The service functions hold the business rules: startRental claims the bike with updateWhere so only one of two simultaneous riders wins, and takes riderId from the authenticated user; finishRental treats a rental the caller may not see exactly like a missing one, so existence is not leaked. The list route filters by canAccessRental before paging, and the detail route checks the same predicate after loading.",
    hints: [
      { id: "h1", title: "Roles", content: "requireRole(...roles) returns function requireRole(req, res, next): if (!req.user) throw the 401 (same as requireAuth); if (!roles.includes(req.user.role)) throw new HttpError(403, \"This action needs one of the roles: \" + roles.join(\", \"), { code: \"forbidden\" }); return next(). Attach with router.before(\"POST\", \"/stations\", requireRole(\"admin\")) and so on." },
      { id: "h2", title: "startRental", content: "const bike = await db.bikes.get(bikeId) -> 404 bike_not_found. Active rentals: (await db.rentals.list()).filter(r => r.riderId === user.id && r.returnedAt === null) -> 409 rental_in_progress. const claimed = await db.bikes.updateWhere(bikeId, b => b.status === \"available\", { status: \"rented\", stationId: null }); if (!claimed) 409 bike_unavailable. Then db.rentals.create({ riderId: user.id, bikeId, fromStationId: bike.stationId, ... })." },
      { id: "h3", title: "Ownership", content: "In getRental and finishRental: const r = await db.rentals.get(id); if (!r || !canAccessRental(req.user, r)) throw rentalNotFound(id) - the SAME error for 'missing' and 'not yours'. In listRentals, filter the full list with canAccessRental BEFORE calling paginateAfter. Attach requireAuth with router.before for each rentals route; for POST routes attach validateBody first, then requireAuth." },
    ],
    tests: [
      {
        id: "t1",
        description: "requireAuth and requireRole: 401 vs 403",
        assertionCode: T(js`const mkReq = (user) => { const req = new HttpRequest({ url: "/" }); req.user = user; return req; };
const run = (mw, user) => { let called = false; mw(mkReq(user), new HttpResponse(), () => { called = true; }); return called; };
const anon = assertThrows(() => requireAuth(mkReq(null), new HttpResponse(), () => {}), "HttpError");
assertEqual([anon.status, anon.code], [401, "unauthenticated"]);
assert(anon.headers["www-authenticate"].startsWith("Bearer"), "401 carries WWW-Authenticate");
assertEqual(run(requireAuth, { id: "u-ana", role: "rider" }), true);
const admin = requireRole("admin");
assertEqual(admin.name, "requireRole");
assertEqual(run(admin, { id: "u-root", role: "admin" }), true);
const denied = assertThrows(() => admin(mkReq({ id: "u-ana", role: "rider" }), new HttpResponse(), () => {}), "roles: admin");
assertEqual([denied.status, denied.code], [403, "forbidden"], "known user, wrong role: 403");
const noone = assertThrows(() => admin(mkReq(null), new HttpResponse(), () => {}), "HttpError");
assertEqual(noone.status, 401, "no identity at all: 401, not 403");
assertEqual(run(requireRole("mechanic", "admin"), { id: "u-mia", role: "mechanic" }), true, "several roles");
assertThrows(() => requireRole("mechanic", "admin")(mkReq({ id: "x", role: "rider" }), new HttpResponse(), () => {}), "mechanic, admin");`),
      },
      {
        id: "t2",
        description: "Station writes need the right role, checked before validation",
        assertionCode: T(js`db.reset();
const body = { name: "Canal Steps", zone: "old-town", capacity: 9 };
const anon = await call("POST", "/stations", { body });
assertEqual(anon.status, 401);
assertEqual((await call("POST", "/stations", { body: {} })).status, 401, "anonymous callers learn nothing about the schema: 401 comes before 400");
assertEqual((await call("POST", "/stations", { body, as: "u-ana" })).status, 403, "a rider cannot create stations");
assertEqual((await call("POST", "/stations", { body, as: "u-mia" })).status, 403, "neither can a mechanic");
assertEqual((await call("POST", "/stations", { body: {}, as: "u-ana" })).status, 403, "403 comes before 400 too");
const created = await call("POST", "/stations", { body, as: "u-root" });
assertEqual(created.status, 201, "an admin can");
const id = created.body.id;
assertEqual((await call("PATCH", "/stations/" + id, { body: { capacity: 10 }, as: "u-ana" })).status, 403);
assertEqual((await call("PATCH", "/stations/" + id, { body: { capacity: 10 }, as: "u-mia" })).status, 200, "a mechanic can patch");
assertEqual((await call("PUT", "/stations/" + id, { body: { ...body, capacity: 11 }, as: "u-mia" })).status, 200, "and replace");
assertEqual((await call("DELETE", "/stations/" + id, { as: "u-mia" })).status, 403, "but not delete");
assertEqual((await call("DELETE", "/stations/" + id, { as: "u-root" })).status, 204);
assertEqual((await call("GET", "/stations/st-01", { as: "u-ana" })).status, 200, "reads stay open to everyone");
const forbidden = await call("DELETE", "/stations/st-01", { as: "u-ana" });
assertEqual(forbidden.body.type, "https://dockline.example/problems/forbidden");`),
      },
      {
        id: "t3",
        description: "GET /rentals shows only your own (admins see all) and pages by cursor",
        assertionCode: T(js`db.reset();
assertEqual((await call("GET", "/rentals")).status, 401, "rentals are private");
const ana = await call("GET", "/rentals", { as: "u-ana" });
assertEqual(ana.status, 200);
assertEqual(ana.body.items.map((r) => r.id), ["rt-1001", "rt-1003", "rt-1006"], "only Ana's three trips");
assertEqual(ana.body.next, null);
const ben = await call("GET", "/rentals", { as: "u-ben" });
assertEqual(ben.body.items.map((r) => r.id), ["rt-1002", "rt-1005", "rt-1007"]);
const mia = await call("GET", "/rentals", { as: "u-mia" });
assertEqual(mia.body.items.map((r) => r.id), ["rt-1004"], "a mechanic is not an admin: own trips only");
const root = await call("GET", "/rentals?limit=3", { as: "u-root" });
assertEqual(root.body.items.length, 3);
assert(typeof root.body.next === "string", "more pages");
const rest = await call("GET", "/rentals?limit=10&after=" + root.body.next, { as: "u-root" });
assertEqual(rest.body.items.map((r) => r.id), ["rt-1004", "rt-1005", "rt-1006", "rt-1007"], "an admin sees everything, paged");
assertEqual((await call("GET", "/rentals?limit=0", { as: "u-ana" })).status, 400);`),
      },
      {
        id: "t4",
        description: "GET /rentals/:id: someone else's rental looks exactly like a missing one",
        assertionCode: T(js`db.reset();
assertEqual((await call("GET", "/rentals/rt-1001")).status, 401);
const own = await call("GET", "/rentals/rt-1001", { as: "u-ana" });
assertEqual([own.status, own.body.riderId], [200, "u-ana"]);
const foreign = await call("GET", "/rentals/rt-1001", { as: "u-ben" });
const missing = await call("GET", "/rentals/rt-9999", { as: "u-ben" });
assertEqual([foreign.status, missing.status], [404, 404], "no 403: the rental's existence stays private");
assertEqual(foreign.body.detail.replace("rt-1001", "ID"), missing.body.detail.replace("rt-9999", "ID"), "same wording, so an attacker cannot tell the two apart");
assertEqual(foreign.body.type, missing.body.type);
assertEqual((await call("GET", "/rentals/rt-1001", { as: "u-root" })).status, 200, "an admin may read any rental");
assertEqual((await call("GET", "/rentals/rt-1004", { as: "u-mia" })).status, 200, "a mechanic reads their own");
assertEqual((await call("GET", "/rentals/rt-1001", { as: "u-mia" })).status, 404, "but not other people's");`),
      },
      {
        id: "t5",
        description: "POST /rentals: rules, ownership from the token and mass assignment",
        assertionCode: T(js`db.reset();
const body = { bikeId: "bk-109" };
assertEqual((await call("POST", "/rentals", { body })).status, 401);
const spoof = await call("POST", "/rentals", { body: { bikeId: "bk-109", riderId: "u-root" }, as: "u-ana" });
assertEqual(spoof.status, 400, "riderId from the client is an unknown field");
assertEqual((await call("POST", "/rentals", { body: {}, as: "u-ana" })).body.errors[0].field, "bikeId");
const ok = await call("POST", "/rentals", { body, as: "u-ana" });
assertEqual(ok.status, 201);
assertEqual([ok.body.id, ok.body.riderId, ok.body.bikeId, ok.body.fromStationId, ok.body.toStationId, ok.body.returnedAt], ["rt-1008", "u-ana", "bk-109", "st-03", null, null]);
assert(typeof ok.body.startedAt === "string" && ok.headers.location === "/rentals/rt-1008", "timestamp and Location");
const bikes = (await call("GET", "/bikes?status=rented")).body.items;
assertEqual(bikes.map((b) => [b.id, b.stationId]), [["bk-109", null]], "the bike left its dock");
const again = await call("POST", "/rentals", { body: { bikeId: "bk-110" }, as: "u-ana" });
assertEqual([again.status, again.body.type], [409, "https://dockline.example/problems/rental-in-progress"], "one rental at a time");
const taken = await call("POST", "/rentals", { body, as: "u-ben" });
assertEqual([taken.status, taken.body.type], [409, "https://dockline.example/problems/bike-unavailable"]);
assertEqual((await call("POST", "/rentals", { body: { bikeId: "bk-107" }, as: "u-ben" })).status, 409, "a bike in service cannot be rented");
assertEqual((await call("POST", "/rentals", { body: { bikeId: "bk-999" }, as: "u-ben" })).status, 404, "unknown bike");`),
      },
      {
        id: "t6",
        description: "Two riders racing for one bike: exactly one wins",
        assertionCode: T(js`db.reset();
const [a, b] = [await tokenFor("u-ana"), await tokenFor("u-ben")];
const send = (token) => handle({ method: "POST", url: "/rentals", headers: { authorization: "Bearer " + token }, body: { bikeId: "bk-112" }, ip: "10.7.7." + token.length });
const results = await Promise.all([send(a), send(b)]);
assertEqual(results.map((r) => r.status).sort(), [201, 409], "one 201 and one 409, never two 201s");
const rentals = (await db.rentals.list()).filter((r) => r.bikeId === "bk-112");
assertEqual(rentals.length, 1, "one rental record for the bike");
const bike = await db.bikes.get("bk-112");
assertEqual(bike.status, "rented");`),
      },
      {
        id: "t7",
        description: "POST /rentals/:id/return: ownership, state and capacity",
        assertionCode: T(js`db.reset();
const started = await call("POST", "/rentals", { body: { bikeId: "bk-109" }, as: "u-ana" });
const id = started.body.id;
assertEqual((await call("POST", "/rentals/" + id + "/return", { body: { stationId: "st-06" } })).status, 401);
assertEqual((await call("POST", "/rentals/" + id + "/return", { body: { stationId: "st-06" }, as: "u-ben" })).status, 404, "someone else's rental looks missing");
assertEqual((await call("POST", "/rentals/" + id + "/return", { body: { stationId: "st-99" }, as: "u-ana" })).body.type, "https://dockline.example/problems/station-not-found");
assertEqual((await call("POST", "/rentals/" + id + "/return", { body: {}, as: "u-ana" })).status, 400);
await db.stations.update("st-04", { capacity: 2 });
const full = await call("POST", "/rentals/" + id + "/return", { body: { stationId: "st-04" }, as: "u-ana" });
assertEqual([full.status, full.body.type], [409, "https://dockline.example/problems/station-full"], "st-04 already holds two bikes and now has room for two");
const done = await call("POST", "/rentals/" + id + "/return", { body: { stationId: "st-06" }, as: "u-ana" });
assertEqual(done.status, 200);
assertEqual([done.body.toStationId, typeof done.body.returnedAt], ["st-06", "string"]);
const bike = await db.bikes.get("bk-109");
assertEqual([bike.stationId, bike.status], ["st-06", "available"], "the bike is docked and available again");
const twice = await call("POST", "/rentals/" + id + "/return", { body: { stationId: "st-06" }, as: "u-ana" });
assertEqual([twice.status, twice.body.type], [409, "https://dockline.example/problems/already-returned"]);
assertEqual((await call("POST", "/rentals", { body: { bikeId: "bk-110" }, as: "u-ana" })).status, 201, "Ana can rent again after returning");`),
      },
    ],
    unlocks: ["api-authz"],
    checks: [
      {
        prompt: md`Route ¦GET /rentals/:id¦ checks that the caller is logged in, loads the rental and returns it. Ben requests Ana's rental id. What is this vulnerability called?`,
        question: { type: "choice", options: ["SQL injection", "IDOR / BOLA (broken object-level authorization)", "Cross-site scripting", "Denial of service"], answer: 1 },
        explanation: md`Authentication was fine; the missing piece is the per-object check "does this rental belong to this caller?". It is the most common serious API bug because every list, detail and update route needs it.`,
      },
      {
        prompt: md`Why answer 404 (not 403) when Ben asks for Ana's rental?`,
        question: {
          type: "choice",
          options: [
            "403 is not a real status code",
            "A 403 confirms that the rental exists; a 404 identical to the missing case reveals nothing about other riders' activity",
            "Because 404 is faster to compute",
            "Because Ben is an admin",
          ],
          answer: 1,
        },
        explanation: md`Where existence is itself private information, forbidden and non-existent should be indistinguishable.`,
      },
    ],
  },

  // ───────────────────────────────────────── 11. Idempotency
  {
    id: "js-api-11-idempotency",
    title: "Idempotency keys for safe retries",
    minutes: 45,
    xp: 220,
    concepts: ["idempotency", "replay", "request fingerprints", "in-flight requests", "TTL", "409 vs 422"],
    learn: md`### The double tap problem

A rider taps "Unlock" on a bad connection. The request reaches the server, the rental is created, but the response is lost. The app shows a spinner, times out and the rider taps again. Or the app's HTTP layer **automatically retries** because it never saw an answer. Without protection the server cannot tell "a new request" from "the same request again", and the rider now owns two rentals (or gets charged twice).

GET, PUT and DELETE are idempotent by design; POST is not. An **idempotency key** makes a POST safe to repeat:

1. The client invents a unique key per *logical operation* (a random UUID) and sends it as ¦Idempotency-Key: 7c1d9a2e-...¦. Retrying sends the **same** key.
2. The server remembers, per key, what it did and what it answered.
3. When the same key arrives again, the server **replays the stored response** (marked with ¦x-idempotent-replay: true¦) instead of executing again.

### The cases you must handle

- **Key never seen**: run the request normally and remember the result.
- **Same key, same body, original finished**: **replay** the saved status, body and ¦Location¦.
- **Same key, different body**: **422**. The key is being reused for a different request, which is a client bug, not a retry.
- **Same key, original still running**: **409** with ¦Retry-After¦. Do not run it twice in parallel, and do not guess an answer yet.
- **Key too old**: treated as new (keys expire, here after 24 hours).
- **No key at all**: **400** for endpoints that require one (renting a bike).

Comparing bodies needs a **fingerprint**: a canonical form of the body where key order does not matter (¦{a:1,b:2}¦ equals ¦{b:2,a:1}¦). Sort object keys recursively and stringify.

### Scoping the key

Two different riders may use the same key text. Scope every stored record by **who** (the user id, or the client address when anonymous), **what** (the path) and the key itself. Otherwise Ana's key could replay Ben's response: a data leak.

### What to remember, and what not to

Store only **successful** results (2xx). If the original attempt failed with a validation error, a conflict, or a 500, release the key: a retry should run again, because the world may have changed (the bike was freed) or the failure was a fluke. Remembering a 500 would turn a transient fault into a permanent one.

### Concurrency again

The check "have I seen this key?" and the marking "I am working on it" must happen in one synchronous step, **before** the first await. Then two simultaneous copies of the same request see "in flight" and one waits (409) while the other works, the same compare-and-set idea as the bike claim.

### Where it plugs in

A global middleware watches POSTs that carry the header; a tiny per-route guard (¦requireIdempotencyKey¦) makes the header mandatory for ¦POST /rentals¦. Memory is bounded by a TTL; a real deployment stores records in a shared database so every server instance sees them.

### Common mistakes

- Deduplicating by body alone (two riders legitimately renting the same bike one after another would collide).
- Caching failures.
- Check-then-act with an await in between.
- Keys that are guessable or reused across operations.`,
    mission: md`Mobile networks drop responses constantly. Support is drowning in tickets from riders with two active rentals after one tap. From now on a retried unlock returns the same rental, a reused key with a different bike is refused, and two simultaneous copies of one request cannot both run.

Add the idempotency layer in front of the rentals route. The control room's ledger shows each key, its status and which responses were replays; its Double tap button fires the same request twice at once.`,
    tasks: [
      "canonicalJson(value): stable stringify (sorted keys) used as the body fingerprint",
      "class IdempotencyStore with begin / complete / release / sweep and a TTL",
      "idempotency middleware: scope by user + path + key, replay, 422 on a different body, 409 while in flight, store only 2xx",
      "requireIdempotencyKey guard for POST /rentals (400 when missing, but never before authentication)",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 11: make POSTs safe to repeat.

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

// A string that is identical for equal data whatever the key order:
//   canonicalJson({ b: 1, a: [2, { d: 4, c: 3 }] }) === '{"a":[2,{"c":3,"d":4}],"b":1}'
// Arrays keep their order; undefined and null both become null at the top level.
function canonicalJson(value) {
  // TODO
}

class IdempotencyStore {
  // Records live in a Map by scope. A record is { fingerprint, state: "in_flight" | "done", createdAt, response }.
  constructor(options = {}) {
    // TODO: options.ttlMs defaults to IDEMPOTENCY_TTL_MS
  }

  // Look the scope up (an expired record counts as not there, and is deleted). Return one of
  //   { state: "new" }       nothing stored: ALSO store { state: "in_flight", fingerprint, createdAt: now } before returning
  //   { state: "mismatch" }  stored with a different fingerprint
  //   { state: "in_flight" } stored with the same fingerprint, still running
  //   { state: "replay", response }  stored and done
  // This must be fully synchronous (no await anywhere).
  begin(scope, fingerprint, now) {
    // TODO
  }

  // Mark the scope done and keep { status, headers, body } as its response.
  complete(scope, response) {
    // TODO
  }

  // Forget the scope (the attempt failed).
  release(scope) {
    // TODO
  }

  // Drop every expired record; return how many were dropped.
  sweep(now) {
    // TODO
  }

  get size() {
    // TODO
  }
}

// Global middleware factory. Only POST requests that carry an Idempotency-Key header are affected; everything else goes straight to next().
//   bad key (not KEY_PATTERN)  -> 400, code "invalid_idempotency_key"
//   scope = req.user.id (or req.ip when anonymous) + "|" + req.path + "|" + key
//   mismatch  -> 422, code "idempotency_key_reuse"
//   in_flight -> 409, code "request_in_progress", header retry-after: "1"
//   replay    -> set the stored status, headers and body on res, plus the header x-idempotent-replay: "true"; do NOT call next()
//   new       -> await next(); a 2xx result is stored with store.complete (status, the location header if any, a copy of res.payload); anything else store.release
// The middleware function must be named idempotency.
function idempotency(store = new IdempotencyStore()) {
  // TODO
}

// Guard for routes that REQUIRE a key: 400, code "idempotency_key_required". An unauthenticated caller is passed on (req.user is null)
// so the auth guard answers with 401 first.
function requireIdempotencyKey(req, res, next) {
  // TODO
}

const idempotencyStore = new IdempotencyStore();
// TODO: app.use(idempotency(idempotencyStore));        (after authenticate, because the scope uses req.user)
// TODO: router.before("POST", "/rentals", requireIdempotencyKey);
`,
    solutionAdd: js`const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

function canonicalJson(value) {
  if (Array.isArray(value)) return ¦[\${value.map(canonicalJson).join(",")}]¦;
  if (value && typeof value === "object") {
    return ¦{\${Object.keys(value).sort().map((key) => ¦\${JSON.stringify(key)}:\${canonicalJson(value[key])}¦).join(",")}}¦;
  }
  return JSON.stringify(value ?? null);
}

class IdempotencyStore {
  #records = new Map();
  #ttlMs;

  constructor(options = {}) {
    this.#ttlMs = options.ttlMs ?? IDEMPOTENCY_TTL_MS;
  }

  begin(scope, fingerprint, now) {
    const record = this.#records.get(scope);
    if (record && now - record.createdAt >= this.#ttlMs) this.#records.delete(scope);
    else if (record) {
      if (record.fingerprint !== fingerprint) return { state: "mismatch" };
      return record.state === "done" ? { state: "replay", response: record.response } : { state: "in_flight" };
    }
    this.#records.set(scope, { fingerprint, state: "in_flight", createdAt: now });
    return { state: "new" };
  }

  complete(scope, response) {
    const record = this.#records.get(scope);
    if (record) {
      record.state = "done";
      record.response = response;
    }
  }

  release(scope) {
    this.#records.delete(scope);
  }

  sweep(now) {
    let dropped = 0;
    for (const [scope, record] of this.#records) {
      if (now - record.createdAt >= this.#ttlMs) {
        this.#records.delete(scope);
        dropped++;
      }
    }
    return dropped;
  }

  get size() {
    return this.#records.size;
  }
}

function idempotency(store = new IdempotencyStore()) {
  return async function idempotency(req, res, next) {
    const key = req.header("idempotency-key");
    if (req.method !== "POST" || key === undefined) return next();
    if (!KEY_PATTERN.test(key)) {
      throw new HttpError(400, "Idempotency-Key must be 8 to 64 characters: letters, digits, - or _", { code: "invalid_idempotency_key" });
    }
    const scope = ¦\${req.user?.id ?? req.ip}|\${req.path}|\${key}¦;
    const outcome = store.begin(scope, canonicalJson(req.body), Date.now());
    if (outcome.state === "mismatch") {
      throw new HttpError(422, "This Idempotency-Key was already used with a different request body", { code: "idempotency_key_reuse" });
    }
    if (outcome.state === "in_flight") {
      throw new HttpError(409, "A request with this Idempotency-Key is still being processed", { code: "request_in_progress", headers: { "retry-after": "1" } });
    }
    if (outcome.state === "replay") {
      const saved = outcome.response;
      res.status(saved.status);
      for (const [name, value] of Object.entries(saved.headers)) res.set(name, value);
      res.json(structuredClone(saved.body));
      res.set("x-idempotent-replay", "true");
      return;
    }
    try {
      await next();
    } catch (err) {
      store.release(scope);
      throw err;
    }
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const headers = res.get("location") ? { location: res.get("location") } : {};
      store.complete(scope, { status: res.statusCode, headers, body: structuredClone(res.payload ?? null) });
    } else {
      store.release(scope);
    }
  };
}

function requireIdempotencyKey(req, res, next) {
  if (req.user && req.header("idempotency-key") === undefined) {
    throw new HttpError(400, "This request needs an Idempotency-Key header", { code: "idempotency_key_required" });
  }
  return next();
}

const idempotencyStore = new IdempotencyStore();
app.use(idempotency(idempotencyStore));
router.before("POST", "/rentals", requireIdempotencyKey);`,
    explanation:
      "canonicalJson sorts keys recursively so equal data produces equal text. IdempotencyStore.begin is one synchronous step that reads the scope and, when it is new, records 'in flight' before returning, so two simultaneous requests cannot both be 'new'. The middleware scopes keys by user, path and key, maps each state to its answer, replays saved responses without running the route, and only keeps 2xx results; failures release the key so a retry really re-runs. requireIdempotencyKey is a route-level guard so only endpoints that need the header insist on it, and it stays quiet for anonymous callers so authentication errors come first.",
    hints: [
      { id: "h1", title: "canonicalJson", content: "Arrays: \"[\" + value.map(canonicalJson).join(\",\") + \"]\". Objects: sort Object.keys, map each key to JSON.stringify(key) + \":\" + canonicalJson(value[key]), join with commas inside braces. Everything else: JSON.stringify(value ?? null)." },
      { id: "h2", title: "begin", content: "const record = this.#records.get(scope). If it exists and now - record.createdAt >= ttl, delete it and fall through to 'new'. If it exists and is fresh: different fingerprint -> { state: \"mismatch\" }; state \"done\" -> { state: \"replay\", response }; else { state: \"in_flight\" }. For 'new', set the in_flight record and return { state: \"new\" } - all before any await." },
      { id: "h3", title: "The middleware", content: "return async function idempotency(req, res, next) { ... }. Skip unless req.method === \"POST\" and the header exists. After await next(), if res.statusCode is 200..299 call store.complete(scope, { status, headers: location ? { location } : {}, body: structuredClone(res.payload ?? null) }), otherwise store.release(scope). The replay path sets status, headers, res.json(copy of body) and then x-idempotent-replay." },
    ],
    tests: [
      {
        id: "t1",
        description: "canonicalJson ignores key order",
        assertionCode: T(js`assertEqual(canonicalJson({ b: 1, a: [2, { d: 4, c: 3 }] }), '{"a":[2,{"c":3,"d":4}],"b":1}');
assertEqual(canonicalJson({ a: 1, b: 2 }), canonicalJson({ b: 2, a: 1 }), "same data, different key order");
assert(canonicalJson({ a: [1, 2] }) !== canonicalJson({ a: [2, 1] }), "array order matters");
assert(canonicalJson({ a: "1" }) !== canonicalJson({ a: 1 }), "types matter");
assertEqual([canonicalJson(null), canonicalJson(undefined), canonicalJson("x"), canonicalJson(5)], ["null", "null", '"x"', "5"]);`),
      },
      {
        id: "t2",
        description: "IdempotencyStore: new, in flight, replay, mismatch, release and expiry",
        assertionCode: T(js`const store = new IdempotencyStore({ ttlMs: 1000 });
assertEqual(store.begin("k", "f1", 0), { state: "new" });
assertEqual(store.size, 1, "a new key is recorded straight away");
assertEqual(store.begin("k", "f1", 10), { state: "in_flight" }, "the same request again while the first runs");
assertEqual(store.begin("k", "other", 10), { state: "mismatch" }, "a different fingerprint");
store.complete("k", { status: 201, headers: {}, body: { id: 1 } });
assertEqual(store.begin("k", "f1", 20), { state: "replay", response: { status: 201, headers: {}, body: { id: 1 } } });
assertEqual(store.begin("k", "other", 20), { state: "mismatch" }, "still a mismatch after completion");
assertEqual(store.begin("k", "f1", 999).state, "replay", "one millisecond before the TTL");
assertEqual(store.begin("k", "f1", 1000), { state: "new" }, "at the TTL the record is gone: new again");
store.release("k");
assertEqual(store.size, 0, "release forgets the key");
assertEqual(store.begin("k", "f1", 2000), { state: "new" });
store.begin("a", "f", 2000); store.begin("b", "f", 2500);
assertEqual(store.sweep(3200), 2, "sweep drops expired records (k and a at 2000, but not b at 2500)");
assertEqual(store.size, 1);
const fresh = new IdempotencyStore();
assertEqual(fresh.begin("x", "f", 0).state, "new");
assertEqual(fresh.begin("x", "f", IDEMPOTENCY_TTL_MS - 1).state, "in_flight", "the default TTL is 24 hours");`),
      },
      {
        id: "t3",
        description: "Rentals need an Idempotency-Key, and the header is checked after authentication",
        assertionCode: T(js`db.reset();
const body = { bikeId: "bk-109" };
assertEqual((await call("POST", "/rentals", { body })).status, 401, "anonymous without a key: 401 first");
const missing = await call("POST", "/rentals", { body, as: "u-ana" });
assertEqual([missing.status, missing.body.type], [400, "https://dockline.example/problems/idempotency-key-required"]);
const bad = await call("POST", "/rentals", { body, as: "u-ana", headers: { "idempotency-key": "short" } });
assertEqual([bad.status, bad.body.type], [400, "https://dockline.example/problems/invalid-idempotency-key"]);
assertEqual((await db.rentals.list()).length, 7, "nothing was created by the rejected attempts");
const ok = await call("POST", "/rentals", { body, as: "u-ana", headers: { "idempotency-key": "t3-unlock-0001" } });
assertEqual(ok.status, 201);
assertEqual(ok.headers["x-idempotent-replay"], undefined, "the first execution is not a replay");
assert(listMiddleware().indexOf("authenticate") < listMiddleware().indexOf("idempotency"), "idempotency runs after authenticate");`),
      },
      {
        id: "t4",
        description: "A retry replays the original response and does not rent twice",
        assertionCode: T(js`db.reset();
const token = await tokenFor("u-ana");
const send = (body, key = "t4-unlock-0001", t = token) => handle({ method: "POST", url: "/rentals", headers: { authorization: "Bearer " + t, "idempotency-key": key }, body, ip: "10.5.5.5" });
const first = await send({ bikeId: "bk-109" });
assertEqual(first.status, 201);
const second = await send({ bikeId: "bk-109" });
assertEqual(second.status, 201, "the replay has the original status");
assertEqual(second.body, first.body, "and the original body: the same rental id");
assertEqual(second.headers["x-idempotent-replay"], "true", "marked as a replay");
assertEqual(second.headers.location, first.headers.location, "Location is replayed too");
assertEqual((await db.rentals.list()).filter((r) => r.riderId === "u-ana").length, 4, "Ana has exactly one new rental, not two");
const reordered = await send({ bikeId: "bk-109" }, "t4-unlock-0001");
assertEqual(reordered.headers["x-idempotent-replay"], "true", "still a replay on the third try");
const hijack = await send({ bikeId: "bk-110" });
assertEqual([hijack.status, hijack.body.type], [422, "https://dockline.example/problems/idempotency-key-reuse"], "same key, different bike: refused");
const ben = await tokenFor("u-ben");
const bens = await send({ bikeId: "bk-110" }, "t4-unlock-0001", ben);
assertEqual(bens.status, 201, "another rider may use the same key text: keys are scoped per user");
assert(!bens.headers["x-idempotent-replay"] && bens.body.riderId === "u-ben", "and never sees Ana's response");`),
      },
      {
        id: "t5",
        description: "Failures are not remembered: a retry runs again",
        assertionCode: T(js`db.reset();
const token = await tokenFor("u-ben");
const send = () => handle({ method: "POST", url: "/rentals", headers: { authorization: "Bearer " + token, "idempotency-key": "retry-after-fail-1" }, body: { bikeId: "bk-107" }, ip: "10.5.5.6" });
const failed = await send();
assertEqual(failed.status, 409, "bk-107 is in service");
await db.bikes.update("bk-107", { status: "available" });
const retry = await send();
assertEqual(retry.status, 201, "the same key now succeeds because the 409 was not stored");
assertEqual(retry.headers["x-idempotent-replay"], undefined);
const bad = await handle({ method: "POST", url: "/rentals", headers: { authorization: "Bearer " + token, "idempotency-key": "validation-fail-1" }, body: { nope: 1 }, ip: "10.5.5.6" });
assertEqual(bad.status, 400);
const fixed = await handle({ method: "POST", url: "/rentals", headers: { authorization: "Bearer " + await tokenFor("u-ana"), "idempotency-key": "validation-fail-1" }, body: { bikeId: "bk-110" }, ip: "10.5.5.6" });
assertEqual(fixed.status, 201, "a validation failure is not remembered either (different user here, but the first key was released)");`),
      },
      {
        id: "t6",
        description: "Two simultaneous copies: one runs, the other is told to wait",
        assertionCode: T(js`db.reset();
const token = await tokenFor("u-ana");
const send = () => handle({ method: "POST", url: "/rentals", headers: { authorization: "Bearer " + token, "idempotency-key": "double-tap-0001" }, body: { bikeId: "bk-114" }, ip: "10.5.5.7" });
const [a, b] = await Promise.all([send(), send()]);
const statuses = [a.status, b.status].sort();
assertEqual(statuses, [201, 409], "one executes, one is rejected as in progress");
const loser = a.status === 409 ? a : b;
assertEqual(loser.body.type, "https://dockline.example/problems/request-in-progress");
assertEqual(loser.headers["retry-after"], "1", "and told when to try again");
assertEqual((await db.rentals.list()).filter((r) => r.bikeId === "bk-114").length, 1, "only one rental exists");
const later = await send();
assertEqual([later.status, later.headers["x-idempotent-replay"]], [201, "true"], "once the first finished, a retry replays it");`),
      },
    ],
    unlocks: ["api-idempotency"],
    checks: [
      {
        prompt: md`A client reuses the key ¦unlock-42¦ for a request to rent ¦bk-110¦ after already using it for ¦bk-109¦. What should the server answer?`,
        question: { type: "choice", options: ["Replay the bk-109 response", "Execute the new request", "An error: the key was already used with a different request (422)", "200 with an empty body"], answer: 2 },
        explanation: md`A retry repeats the *same* request. A different body under the same key means the client is confused (or malicious). Replaying the old answer would silently ignore what they asked for, and executing it would break the promise of the key.`,
      },
      {
        prompt: md`Why is it important that ¦begin¦ both checks for the key and records "in flight" without any ¦await¦ between?`,
        question: {
          type: "choice",
          options: [
            "To save memory",
            "So two simultaneous copies cannot both see 'new key' before either has recorded itself, which would run the operation twice",
            "Because Maps cannot be used asynchronously",
            "Because await is slow",
          ],
          answer: 1,
        },
        explanation: md`Same idea as the compare-and-set on the bike: the check and the claim must be indivisible, and in JavaScript a synchronous stretch of code is indivisible.`,
      },
    ],
  },

  // ───────────────────────────────────────── 12. Rate limiting
  {
    id: "js-api-12-ratelimit",
    title: "Rate limiting with token buckets",
    minutes: 45,
    xp: 220,
    concepts: ["token bucket", "burst vs sustained rate", "429 and Retry-After", "client identity", "memory bounds", "request cost"],
    learn: md`### Fairness and survival

Every shared service needs a way to say "enough". A buggy app in a retry loop, a scraper, a single enthusiastic dashboard: any of them can use up the capacity everyone else needs. **Rate limiting** gives each client a budget and answers **429 Too Many Requests** when it is spent, protecting the service (and the bill) and keeping one client from starving the rest.

### The token bucket

The most common algorithm is also the easiest to picture. Each client has a **bucket** that holds up to ¦capacity¦ tokens and is refilled at ¦refillPerSec¦ tokens per second. Each request removes a token (its **cost**). If the bucket has enough tokens the request proceeds; if not, it is rejected.

- **capacity** is the allowed **burst**: a client that has been quiet for a while can send ¦capacity¦ requests at once.
- **refill rate** is the sustained average.

With capacity 12 and refill 3 per second, a client may fire 12 requests instantly, then about 3 per second forever. Compare with a "N requests per minute" counter, which allows a doubled burst across a window boundary and punishes the first request after the reset.

### Lazy refill

Nothing needs to run in the background. Store ¦tokens¦ and the time of the last update; when a request arrives, add ¦(now - last) / 1000 * refillPerSec¦ tokens (capped at capacity) and then take. The clock is ¦Date.now()¦ passed in as an argument, so tests can feed exact times. When a request is refused, you can tell the client exactly how long to wait: the missing tokens divided by the refill rate. That becomes the ¦Retry-After¦ header (whole seconds, rounded **up**, at least 1).

### Telling clients what is going on

Well-behaved clients adapt if you give them numbers: ¦ratelimit-limit¦ (the capacity) and ¦ratelimit-remaining¦ on every response, ¦retry-after¦ on the 429. Clients that ignore them are the ones the limiter exists for.

### Who is a client?

You need a key: the IP address, the API key, the user id. Each has a failure mode. An address is shared by a whole office (limit too tight) or rotated by an attacker (limit too loose); a user id only exists after authentication, which means unauthenticated floods are not limited. Our limiter sits **before** authentication and keys by address, so a flood of bad tokens is stopped by 429 before it costs any work. A real system layers several limits (per address, per user, per endpoint).

### Not every request costs the same

A health check should not consume budget. A write or a graph query costs more than a read. Let the key and the cost be functions of the request, and let some paths be skipped.

### Do not leak memory

A bucket per key grows without bound if attackers send from endless addresses. A bucket that has refilled to full is indistinguishable from a brand-new one, so it can simply be **deleted**. Sweep periodically, and also when the map exceeds a hard cap.

### In production

Counters live in a shared store (so every server instance sees the same budget), the limiter often sits at the edge or gateway, and limits are tuned from real traffic. The algorithm is the same.

### Common mistakes

- A fixed window counter with a double-burst at the boundary.
- A retry-after of 0 or in milliseconds.
- Limiting after expensive work (authentication, parsing) instead of before.
- Keying by something the client chooses freely (a header they can rotate).
- Never forgetting idle clients.`,
    mission: md`A partner's script hammered ¦GET /stations¦ three hundred times a second last night and the kiosks slowed to a crawl. Give every client address a bucket: bursts are fine, floods are not, and honest clients get a clear instruction when to come back.

Build the bucket, the limiter and the middleware, and slot it in front of authentication. The control room shows a gauge per client and a Burst button that tries to drain one.`,
    tasks: [
      "class TokenBucket with take(now, cost): lazy refill, remaining, retryAfterMs",
      "class RateLimiter: one bucket per key, sweep() of full buckets, a hard cap on the number of buckets",
      "rateLimit(options) middleware: key and cost functions, skip, ratelimit-* headers, 429 with retry-after",
      "register it before authenticate; keep /health out of the budget",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 12: a budget for every client.

class TokenBucket {
  // A full bucket: tokens = capacity, last update at now.
  constructor({ capacity, refillPerSec }, now) {
    // TODO
  }

  // Refill lazily (add (now - last) / 1000 * refillPerSec tokens, never above capacity), then try to take 'cost' tokens
  // (a cost above capacity counts as capacity). Return
  //   { allowed: true,  remaining: <whole tokens left, rounded down>, retryAfterMs: 0 }
  //   { allowed: false, remaining: <whole tokens, rounded down>,       retryAfterMs: <ms until enough tokens, rounded UP> }
  // A rejected request takes nothing.
  take(now, cost = 1) {
    // TODO
  }

  // Tokens after refilling up to 'now' (does not take anything).
  peek(now) {
    // TODO
  }
}

class RateLimiter {
  // options: { capacity, refillPerSec, maxBuckets = 10000 }
  constructor(options) {
    // TODO
  }

  // The bucket for 'key' (created full on first use) tried with 'cost'. Result: the bucket's answer plus limit: capacity.
  // When there are more than maxBuckets buckets, sweep first.
  check(key, cost, now) {
    // TODO
  }

  // Delete the buckets that have refilled to full (nothing is lost: a new bucket starts full). Return how many.
  sweep(now) {
    // TODO
  }

  get size() {
    // TODO
  }
}

// Reads are cheap, writes cost three. Health checks are free.
const defaultCost = (req) => (req.method === "GET" || req.method === "HEAD" ? 1 : 3);
const defaultSkip = (req) => req.path.startsWith("/health");

// Middleware factory, options { capacity = 12, refillPerSec = 3, key = (req) => req.ip, cost = defaultCost, skip = defaultSkip }.
//   skipped requests go straight to next()
//   every other response gets ratelimit-limit and ratelimit-remaining headers (as strings)
//   a refused request: HttpError 429, code "rate_limited", message "Too many requests; slow down",
//     headers { "retry-after": <whole seconds, rounded up, at least 1> }
//   sweep the limiter every 100 calls
//   the middleware function is named rateLimit and exposes the limiter as middleware.limiter
function rateLimit(options = {}) {
  // TODO
}

// TODO: app.use(rateLimit(), { before: "authenticate" });
`,
    solutionAdd: js`class TokenBucket {
  #capacity;
  #refillPerSec;
  #tokens;
  #last;

  constructor({ capacity, refillPerSec }, now) {
    this.#capacity = capacity;
    this.#refillPerSec = refillPerSec;
    this.#tokens = capacity;
    this.#last = now;
  }

  #refill(now) {
    const elapsed = Math.max(0, now - this.#last);
    this.#tokens = Math.min(this.#capacity, this.#tokens + (elapsed / 1000) * this.#refillPerSec);
    this.#last = now;
  }

  take(now, cost = 1) {
    this.#refill(now);
    const needed = Math.min(cost, this.#capacity);
    if (this.#tokens >= needed) {
      this.#tokens -= needed;
      return { allowed: true, remaining: Math.floor(this.#tokens), retryAfterMs: 0 };
    }
    const retryAfterMs = Math.ceil(((needed - this.#tokens) / this.#refillPerSec) * 1000);
    return { allowed: false, remaining: Math.floor(this.#tokens), retryAfterMs };
  }

  peek(now) {
    this.#refill(now);
    return this.#tokens;
  }
}

class RateLimiter {
  #buckets = new Map();
  #options;

  constructor(options) {
    this.#options = { maxBuckets: 10000, ...options };
  }

  check(key, cost, now) {
    if (this.#buckets.size > this.#options.maxBuckets) this.sweep(now);
    let bucket = this.#buckets.get(key);
    if (!bucket) {
      bucket = new TokenBucket(this.#options, now);
      this.#buckets.set(key, bucket);
    }
    return { ...bucket.take(now, cost), limit: this.#options.capacity };
  }

  sweep(now) {
    let dropped = 0;
    for (const [key, bucket] of this.#buckets) {
      if (bucket.peek(now) >= this.#options.capacity) {
        this.#buckets.delete(key);
        dropped++;
      }
    }
    return dropped;
  }

  get size() {
    return this.#buckets.size;
  }
}

const defaultCost = (req) => (req.method === "GET" || req.method === "HEAD" ? 1 : 3);
const defaultSkip = (req) => req.path.startsWith("/health");

function rateLimit(options = {}) {
  const { capacity = 12, refillPerSec = 3, key = (req) => req.ip, cost = defaultCost, skip = defaultSkip } = options;
  const limiter = new RateLimiter({ capacity, refillPerSec });
  let calls = 0;
  function rateLimit(req, res, next) {
    if (skip(req)) return next();
    if (++calls % 100 === 0) limiter.sweep(Date.now());
    const result = limiter.check(key(req), cost(req), Date.now());
    res.set("ratelimit-limit", String(result.limit));
    res.set("ratelimit-remaining", String(result.remaining));
    if (!result.allowed) {
      throw new HttpError(429, "Too many requests; slow down", {
        code: "rate_limited",
        headers: { "retry-after": String(Math.max(1, Math.ceil(result.retryAfterMs / 1000))) },
      });
    }
    return next();
  }
  rateLimit.limiter = limiter;
  return rateLimit;
}

app.use(rateLimit(), { before: "authenticate" });`,
    explanation:
      "The bucket stores a token count and a timestamp; each take first adds the tokens earned since the last look (capped at capacity), then either removes the cost or reports exactly how many milliseconds until enough tokens exist, rounded up so the client never retries too early. The limiter keeps one bucket per key and deletes buckets that have refilled completely, which is safe because a fresh bucket starts full. The middleware runs before authentication so floods are refused cheaply, always reports the budget in headers, and converts a refusal into a 429 whose Retry-After is whole seconds, at least one.",
    hints: [
      { id: "h1", title: "TokenBucket", content: "Keep tokens and last. #refill(now): tokens = Math.min(capacity, tokens + (now - last) / 1000 * refillPerSec); last = now. take: refill, const needed = Math.min(cost, capacity); if (tokens >= needed) { tokens -= needed; allowed } else retryAfterMs = Math.ceil((needed - tokens) / refillPerSec * 1000). remaining is Math.floor(tokens) in both cases." },
      { id: "h2", title: "RateLimiter", content: "Map key -> TokenBucket. check(): if size > maxBuckets, sweep(now); get-or-create a bucket (new TokenBucket(options, now)), then return { ...bucket.take(now, cost), limit: capacity }. sweep deletes the buckets whose peek(now) >= capacity and counts them." },
      { id: "h3", title: "Middleware", content: "Define an inner function rateLimit(req, res, next) that returns next() for skipped requests, sets the two headers, and throws the 429 HttpError with headers { \"retry-after\": String(Math.max(1, Math.ceil(retryAfterMs / 1000))) } when !allowed. Attach the limiter: rateLimit.limiter = limiter, return rateLimit. Register with app.use(rateLimit(), { before: \"authenticate\" })." },
    ],
    tests: [
      {
        id: "t1",
        description: "TokenBucket: bursts, refill and retry times",
        assertionCode: T(js`const bucket = new TokenBucket({ capacity: 5, refillPerSec: 2 }, 0);
const first = bucket.take(0);
assertEqual(first, { allowed: true, remaining: 4, retryAfterMs: 0 });
for (let i = 0; i < 4; i++) bucket.take(0);
const empty = bucket.take(0);
assertEqual([empty.allowed, empty.remaining], [false, 0], "the sixth request in the same instant is refused");
assertEqual(empty.retryAfterMs, 500, "one token at 2 per second takes half a second");
assertEqual(bucket.take(100).retryAfterMs, 400, "100 ms later it needs 400 ms more (a refusal takes nothing)");
assertEqual(bucket.take(500).allowed, true, "after half a second one token is available");
assertEqual(bucket.take(500).allowed, false);
const rested = bucket.take(100_000);
assertEqual([rested.allowed, rested.remaining], [true, 4], "a long rest refills to capacity, not beyond");
assertEqual(Math.round(bucket.peek(100_000) * 10) / 10, 4, "peek reports the tokens without taking");`),
      },
      {
        id: "t2",
        description: "TokenBucket: costs and rounding",
        assertionCode: T(js`const bucket = new TokenBucket({ capacity: 10, refillPerSec: 1 }, 0);
const pricey = bucket.take(0, 4);
assertEqual([pricey.allowed, pricey.remaining], [true, 6]);
assertEqual(bucket.take(0, 7).retryAfterMs, 1000, "needs 7, has 6: one more token = 1 s");
assertEqual(bucket.take(0, 6).remaining, 0, "a rejected request took nothing, so exactly 6 were left");
const small = new TokenBucket({ capacity: 5, refillPerSec: 3 }, 0);
small.take(0, 5);
assertEqual(small.take(0, 1).retryAfterMs, 334, "1/3 s rounds UP to 334 ms so the client never returns too early");
const huge = new TokenBucket({ capacity: 3, refillPerSec: 1 }, 0);
assertEqual(huge.take(0, 100).allowed, true, "a cost above capacity is treated as capacity so it is not impossible forever");
const fractional = new TokenBucket({ capacity: 3, refillPerSec: 1 }, 0);
fractional.take(0, 3);
assertEqual(fractional.take(1500, 1).remaining, 0, "1.5 tokens earned, 1 taken, 0.5 left rounds down to 0");`),
      },
      {
        id: "t3",
        description: "RateLimiter: separate buckets per key, sweeping and the hard cap",
        assertionCode: T(js`const limiter = new RateLimiter({ capacity: 2, refillPerSec: 1 });
assertEqual(limiter.check("a", 1, 0), { allowed: true, remaining: 1, retryAfterMs: 0, limit: 2 });
limiter.check("a", 1, 0);
assertEqual(limiter.check("a", 1, 0).allowed, false, "a is spent");
assertEqual(limiter.check("b", 1, 0).allowed, true, "b has its own bucket");
assertEqual(limiter.size, 2);
assertEqual(limiter.sweep(0), 0, "nothing has refilled yet");
assertEqual(limiter.sweep(10_000), 2, "after a long time both buckets are full again and can be dropped");
assertEqual(limiter.size, 0);
const capped = new RateLimiter({ capacity: 1, refillPerSec: 1000, maxBuckets: 3 });
for (let i = 0; i < 50; i++) capped.check("k" + i, 1, i * 10);
assert(capped.size <= 4, "idle buckets are swept once the cap is exceeded, size " + capped.size);`),
      },
      {
        id: "t4",
        description: "rateLimit middleware: headers, 429, skip, key and cost",
        assertionCode: T(js`const mw = rateLimit({ capacity: 3, refillPerSec: 1 });
assertEqual(mw.name, "rateLimit");
assert(mw.limiter instanceof RateLimiter, "the limiter is exposed for inspection");
const run = (req) => { const res = new HttpResponse(); let called = false; mw(req, res, () => { called = true; }); return { res, called }; };
const mk = (ip, method = "GET", url = "/stations") => new HttpRequest({ method, url, ip });
const a = run(mk("1.1.1.1"));
assertEqual([a.called, a.res.get("ratelimit-limit"), a.res.get("ratelimit-remaining")], [true, "3", "2"], "headers are strings");
run(mk("1.1.1.1")); run(mk("1.1.1.1"));
const err = assertThrows(() => mw(mk("1.1.1.1"), new HttpResponse(), () => {}), "slow down");
assertEqual([err.status, err.code], [429, "rate_limited"]);
assertEqual(err.headers["retry-after"], "1", "whole seconds, at least 1");
assertEqual(run(mk("2.2.2.2")).called, true, "other addresses have their own budget");
for (let i = 0; i < 10; i++) assertEqual(run(mk("1.1.1.1", "GET", "/health/live")).called, true, "health checks are free");
const post = new HttpResponse();
mw(mk("3.3.3.3", "POST", "/rentals"), post, () => {});
assertEqual(post.get("ratelimit-remaining"), "0", "a write costs three tokens of three");
const keyed = rateLimit({ capacity: 1, refillPerSec: 1, key: (req) => req.header("x-api-key") ?? "none", cost: () => 1 });
const k1 = new HttpRequest({ url: "/", headers: { "x-api-key": "A" }, ip: "same" });
const k2 = new HttpRequest({ url: "/", headers: { "x-api-key": "B" }, ip: "same" });
keyed(k1, new HttpResponse(), () => {});
keyed(k2, new HttpResponse(), () => {});
assertThrows(() => keyed(k1, new HttpResponse(), () => {}), "HttpError");`),
      },
      {
        id: "t5",
        description: "The real app: a client that bursts is refused, then allowed again as tokens return",
        assertionCode: T(js`const ip = "10.77.0.1";
const statuses = [];
const remaining = [];
for (let i = 0; i < 14; i++) {
  const r = await handle({ method: "GET", url: "/stations/st-01", ip });
  statuses.push(r.status);
  remaining.push(r.headers["ratelimit-remaining"]);
}
assertEqual(statuses.slice(0, 12), Array(12).fill(200), "a burst of 12 is allowed");
assertEqual(statuses.slice(12), [429, 429], "the 13th and 14th are refused");
assertEqual(remaining.slice(0, 3), ["11", "10", "9"]);
const refused = await handle({ method: "GET", url: "/stations/st-01", ip });
assertEqual(refused.headers["content-type"], "application/problem+json");
assertEqual([refused.headers["ratelimit-limit"], refused.headers["ratelimit-remaining"], refused.headers["retry-after"]], ["12", "0", "1"]);
assertEqual(refused.body.type, "https://dockline.example/problems/rate-limited");
const other = await handle({ method: "GET", url: "/stations/st-01", ip: "10.77.0.2" });
assertEqual(other.status, 200, "another client is unaffected");
await sim.tick(1000);
const back = await handle({ method: "GET", url: "/stations/st-01", ip });
assertEqual(back.status, 200, "a second later three tokens came back");
assertEqual(back.headers["ratelimit-remaining"], "2");`),
      },
      {
        id: "t6",
        description: "The limiter sits before authentication, so floods of bad tokens are cut off",
        assertionCode: T(js`const names = listMiddleware();
assert(names.indexOf("rateLimit") !== -1 && names.indexOf("rateLimit") < names.indexOf("authenticate"), "rateLimit before authenticate: " + names.join(", "));
const ip = "10.77.0.9";
const outcomes = [];
for (let i = 0; i < 14; i++) outcomes.push((await handle({ method: "GET", url: "/stations", headers: { authorization: "Bearer not.a.token" }, ip })).status);
assertEqual(outcomes.slice(0, 12), Array(12).fill(401), "bad tokens are rejected while the budget lasts");
assertEqual(outcomes.slice(12), [429, 429], "then the limiter answers before any token work happens");
for (let i = 0; i < 30; i++) assertEqual((await handle({ method: "GET", url: "/health/live", ip })).status, 200, "health checks never spend the budget");
db.reset();
const writes = [];
for (let i = 0; i < 5; i++) writes.push((await handle({ method: "POST", url: "/auth/token", body: { riderId: "u-ghost", pin: "1234" }, ip: "10.77.0.10" })).status);
assertEqual(writes, [401, 401, 401, 401, 429], "login attempts cost three tokens each: four fit in the bucket of twelve");`),
      },
    ],
    unlocks: ["api-ratelimit"],
    checks: [
      {
        prompt: md`A bucket has capacity 12 and refills 3 tokens per second. A client has been silent for a minute. What is the largest burst it can send, and what is its sustained rate?`,
        question: { type: "choice", options: ["3 at once, then 12 per second", "12 at once, then 3 per second", "36 at once, then 3 per second", "12 per second always"], answer: 1 },
        explanation: md`Capacity is the burst size; the refill rate is what a continuous sender can sustain. Tuning them separately is the strength of the token bucket over a flat "per minute" count.`,
      },
      {
        prompt: md`Why can a bucket that has refilled to full be deleted without changing any client's behaviour?`,
        question: {
          type: "choice",
          options: [
            "Full buckets are always wrong",
            "A brand-new bucket starts full, so a deleted full bucket and a recreated one are indistinguishable",
            "Because clients must log in again",
            "It cannot be deleted; that would be a bug",
          ],
          answer: 1,
        },
        explanation: md`Deleting idle state is only safe when the state carries no information. A full bucket means "no history", which is exactly what a new bucket means.`,
      },
    ],
  },
];
