import type { Chapter } from "@/engine/types";
import { TYPES_DIVIDER } from "../../../engine/compose.ts";
import { cs, js, md } from "./util.ts";

/**
 * Chapter 3: Trust and fairness. Sign tokens, authorize the caller and the resource, throttle bursts, make retries safe and let clients cache.
 */

export const chapter3: Chapter = {
  id: "trust-and-fairness",
  title: "Trust and fairness",
  blurb: "Sign tokens, authorize the caller and the resource, throttle bursts, make retries safe and let clients cache.",
  lessons: [
    // ───────────────────────── 8 ─────────────────────────
    {
      id: "csharp-api-8-auth",
      title: "Signed tokens, policies and ownership",
      minutes: 65,
      xp: 320,
      concepts: ["authentication vs authorization", "HMAC-signed tokens", "claims & expiry", "constant-time comparison", "401 vs 403", "authorization policies", "resource-based checks", "IDOR"],
      learn: md`### Three different questions

Security code goes wrong when these are mixed up:

1. **Authentication**: *who is this?* Establish an identity from something the caller presents.
2. **Authorization**: *may they do this?* Compare the identity to a rule about the endpoint.
3. **Resource authorization**: *may they do this to this particular thing?* Compare the identity to the *data*.

The failures differ too. No identity (or a bad credential) is **401 Unauthorized**, which really means "unauthenticated". A known identity that is not allowed is **403 Forbidden**. And the third question is where the most common API vulnerability lives.

### A signed token

The caller presents a token in \`Authorization: Bearer <token>\`. Ours has two dot-separated parts, both Base64Url text:

~~~text
eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys
 \_________ payload (JSON claims) _________________/ \_____________ signature ______________/
~~~

The payload carries **claims**: \`sub\` (the member id), \`role\`, and \`exp\` (expiry, in our clock's milliseconds). The signature is an **HMAC-SHA256** of the payload text using a secret only the server knows. To verify, recompute the HMAC over the payload you received and compare.

What this does and does not give you:

- It proves **integrity**: change one character of the payload (say \`role\` from \`member\` to \`admin\`) and the signature no longer matches.
- It is **not encryption**. Anyone can Base64-decode the payload and read it. Never put anything secret in claims.
- It is **stateless**: no database lookup per request, which is why it scales, and also why you cannot easily revoke one token before it expires. Short lifetimes are the mitigation.

### Verifying properly

Order matters and every step is a way to be fooled:

1. Split on \`.\`: exactly two parts, or the token is **malformed**.
2. Recompute the signature and compare with \`CryptographicOperations.FixedTimeEquals\`. A normal \`==\` on strings returns as soon as it finds a difference, so an attacker who can measure response time can guess a signature byte by byte. Constant-time comparison removes the signal.
3. Only **after** the signature is valid, parse the payload and trust its claims. Parsing untrusted data first is how parsers get attacked, and a forged payload with a valid-looking structure should never reach your logic.
4. Check \`exp\` against your clock: **expired**.

Return *why* it failed (\`malformed\`, \`bad signature\`, \`expired\`) to your own logs and to the \`WWW-Authenticate\` challenge header, which tells a well-behaved client what to do next. For the response body keep it terse.

### Authorization by policy

A **policy** is a named rule over the user: \`member\` (anyone signed in), \`staff\` (role is staff or admin). Endpoints carry the policy they need as **metadata** (\`new Authorize("staff")\`), the mechanism from lesson 2. The authorization middleware runs *after* routing, reads the matched endpoint's metadata, and for every requirement either lets the request through, answers **401** if there is no user, or **403** if there is one who fails the policy. One place, applied uniformly, instead of an \`if\` in every handler that someone forgets.

Two supporting pieces make the user available everywhere. The authentication middleware stores the \`Principal\` in \`ctx.Items\` and in a **scoped** \`UserAccessor\`; \`ICurrentUser\` is then registered as a scoped service whose factory reads the accessor, so any class in the request can simply ask for \`ICurrentUser\` in its constructor.

### The vulnerability policies cannot fix: IDOR

A policy such as "members may read bookings" says nothing about *whose* booking. If \`GET /bookings/{id}\` loads any booking by id and returns it, then member 4 can request \`/bookings/1\` and read member 3's name. That is an **insecure direct object reference**, one of the most frequent real-world API holes, and it appears whenever authorization stops at the endpoint instead of continuing to the data.

The robust fix is to put the ownership rule where the data is loaded. Our \`OwnedBookings\` **decorates** the repository: it is a \`BookingRepository\` whose \`Get(id)\` returns the booking only when it belongs to the current user (or the user is staff). Because the controller asks the container for \`BookingRepository\`, and lesson 8's module registers \`OwnedBookings\` in its place, the controller needs no change at all and *every* code path that loads a booking is protected, including update.

Notice the answer for someone else's booking: **404, not 403**. A 403 confirms that booking 1 exists, which lets an attacker enumerate ids. A foreign booking should be indistinguishable from a missing one.

### Common mistakes

- Comparing signatures with \`==\`.
- Reading claims before verifying the signature.
- Putting roles in a token and never expiring it.
- Answering 403 when the resource belongs to somebody else.
- Checking ownership in the controller of one endpoint and forgetting the next.
- Using one global secret forever. Production tokens carry a key id so secrets can be rotated.`,
      mission: md`Until now everyone was "member 3". The booking site is about to go public, and security review has one question per endpoint: *who is allowed to call this, and whose data can they see?*

You will write the token service, the authentication and authorization middleware, two policies, and the ownership rule that closes the hole where any member can read any booking. The recording replays ten requests as different people: the owner, another member, a staff member, nobody, an expired token, a forged one and a member poking at a staff-only route. When this lesson passes, the **Access decisions** panel lights up.`,
      tasks: [
        "Write TokenService.Issue: payload = Base64Url(JSON { sub, role, exp }), token = payload + \".\" + Base64Url(HMACSHA256(secret, payload)); and Verify(token) returning (Principal, null) or (null, \"malformed\" | \"bad signature\" | \"expired\") — compare signatures with CryptographicOperations.FixedTimeEquals and parse the payload only after the signature is valid",
        "Write UseAuthentication: no Authorization header means Principal.Anonymous; a bad Bearer token throws HttpException(401, \"invalid token: <reason>\") after setting WWW-Authenticate: Bearer error=\"invalid_token\", error_description=\"<reason>\"; a good one is stored in ctx.Items[\"user\"] and in the scoped UserAccessor",
        "Write UseAuthorization (read the matched endpoint's Authorize metadata: 401 when anonymous, 403 when a policy fails; policies member and staff) and RequireAuthorization(prefix, policy) which adds Authorize metadata to every endpoint under a path prefix",
        "Write OwnedBookings.Get: return the booking only for its owner or for staff, otherwise null. Register the four modules from the starter comment",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 8. Four modules; the harness then replays the "auth" section as different people.
//  Platform.Add("identity", Phase.Auth, api => {
//      var tokens = new TokenService("crux-signing-secret", api.Clock);  api.Parts["tokens"] = tokens;
//      UserAccessor (Scoped); ICurrentUser (Scoped, factory p => p.Get<UserAccessor>().User);
//      BookingRepository replaced by OwnedBookings (Add<BookingRepository, OwnedBookings>(Lifetime.Scoped)); api.App.UseAuthentication(tokens); });
//  Platform.Add("authorization", Phase.Authorize, api => api.App.UseAuthorization());
//  Platform.Add("staff-tools", Phase.Endpoints, api => MapGet("/staff/slots/{slotId:int}/bookings", (int slotId, BookingRepository repo) => repo.ForSlot(slotId)).With(new Authorize("staff")));
//  Platform.Add("policies", Phase.Policies, api => api.App.RequireAuthorization("/bookings", "member"));
var secure = Platform.Build();
var tokenService = secure.Part<TokenService>("tokens");
var minted = tokenService.Verify(tokenService.Issue(new Principal(7, "member", secure.Clock.Now + 60000)));
Board.Show("minted", new { minted.User.MemberId, minted.User.Role, ttlMs = minted.User.Expires - secure.Clock.Now });
await secure.Replay("auth");

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── Principal, TokenService (Issue / Verify: payload.signature, HMAC-SHA256, constant-time compare, expiry),
// Authorize, UserAccessor, OwnedBookings (someone else's booking looks like a missing one) and the three AuthExtensions.
record Principal(int MemberId, string Role, long Expires = 0) : ICurrentUser
{
    public static readonly Principal Anonymous = new(0, "anonymous");
}

class TokenService(string secret, Clock clock)
{
    public string Issue(Principal p) => throw new NotImplementedException();
    public (Principal User, string Error) Verify(string token) => throw new NotImplementedException();
}

record Authorize(string Policy);
class UserAccessor { public Principal User { get; set; } = Principal.Anonymous; }

class OwnedBookings(DbContext db, ICurrentUser user) : BookingRepository(db)
{
}

static class AuthExtensions
{
    public static App UseAuthentication(this App app, TokenService tokens) => throw new NotImplementedException();
    public static App UseAuthorization(this App app) => throw new NotImplementedException();
    public static void RequireAuthorization(this App app, string prefix, string policy) => throw new NotImplementedException();
}`,
      solutionAdd: cs`// 8. authentication and authorization
Platform.Add("identity", Phase.Auth, api =>
{
    var tokens = new TokenService("crux-signing-secret", api.Clock);
    api.Parts["tokens"] = tokens;
    api.Services.Add<UserAccessor>(Lifetime.Scoped);
    api.Services.Add<ICurrentUser>(Lifetime.Scoped, p => p.Get<UserAccessor>().User);
    api.Services.Add<BookingRepository, OwnedBookings>(Lifetime.Scoped);
    api.App.UseAuthentication(tokens);
});
Platform.Add("authorization", Phase.Authorize, api => api.App.UseAuthorization());
Platform.Add("staff-tools", Phase.Endpoints, api => api.App.MapGet("/staff/slots/{slotId:int}/bookings", (int slotId, BookingRepository repo) => repo.ForSlot(slotId)).With(new Authorize("staff")));
Platform.Add("policies", Phase.Policies, api => api.App.RequireAuthorization("/bookings", "member"));
var secure = Platform.Build();
var tokenService = secure.Part<TokenService>("tokens");
var minted = tokenService.Verify(tokenService.Issue(new Principal(7, "member", secure.Clock.Now + 60000)));
Board.Show("minted", new { minted.User.MemberId, minted.User.Role, ttlMs = minted.User.Expires - secure.Clock.Now });
await secure.Replay("auth");

${TYPES_DIVIDER}
record Principal(int MemberId, string Role, long Expires = 0) : ICurrentUser
{
    public static readonly Principal Anonymous = new(0, "anonymous");
}

class TokenService(string secret, Clock clock)
{
    string Sign(string payload) => Base64Url.EncodeToString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(payload)));

    public string Issue(Principal p)
    {
        var payload = Base64Url.EncodeToString(JsonSerializer.SerializeToUtf8Bytes(new { sub = p.MemberId, role = p.Role, exp = p.Expires }));
        return payload + "." + Sign(payload);
    }

    public (Principal User, string Error) Verify(string token)
    {
        var parts = token.Split('.');
        if (parts.Length != 2) return (null, "malformed");
        if (!CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(Sign(parts[0])), Encoding.ASCII.GetBytes(parts[1]))) return (null, "bad signature");
        try
        {
            var c = JsonSerializer.Deserialize<JsonElement>(Base64Url.DecodeFromChars(parts[0]));
            var expires = c.GetProperty("exp").GetInt64();
            return expires <= clock.Now ? (null, "expired") : (new Principal(c.GetProperty("sub").GetInt32(), c.GetProperty("role").GetString(), expires), null);
        }
        catch (Exception e) when (e is FormatException or JsonException or KeyNotFoundException) { return (null, "malformed"); }
    }
}

record Authorize(string Policy);
class UserAccessor { public Principal User { get; set; } = Principal.Anonymous; }

// Someone else's booking looks exactly like a booking that does not exist.
class OwnedBookings(DbContext db, ICurrentUser user) : BookingRepository(db)
{
    public override Booking Get(int id) => base.Get(id) is { } b && (b.MemberId == user.MemberId || user.Role is "staff" or "admin") ? b : null;
}

static class AuthExtensions
{
    static readonly Dictionary<string, Func<Principal, bool>> Policies = new()
    {
        ["member"] = u => u != Principal.Anonymous,
        ["staff"] = u => u.Role is "staff" or "admin",
    };

    public static App UseAuthentication(this App app, TokenService tokens) => app.Use("authentication", async (ctx, next) =>
    {
        var user = Principal.Anonymous;
        if (ctx.Request.Header("Authorization") is { } header)
        {
            var (principal, error) = header.StartsWith("Bearer ") ? tokens.Verify(header[7..]) : (null, "unsupported scheme");
            if (principal == null)
            {
                ctx.Response.Headers["WWW-Authenticate"] = $"Bearer error=\"invalid_token\", error_description=\"{error}\"";
                throw new HttpException(401, "invalid token: " + error);
            }
            user = principal;
        }
        ctx.Items["user"] = user;
        ctx.Services().Get<UserAccessor>().User = user;
        await next(ctx);
    });

    public static App UseAuthorization(this App app) => app.Use("authorization", async (ctx, next) =>
    {
        var user = (Principal)ctx.Items["user"];
        foreach (var rule in ((RouteMatch)ctx.Items["route"]).Endpoint?.Metadata.OfType<Authorize>() ?? [])
        {
            if (user == Principal.Anonymous) throw new HttpException(401, "sign in required");
            if (!Policies[rule.Policy](user)) throw new HttpException(403, $"policy '{rule.Policy}' not satisfied");
        }
        await next(ctx);
    });

    public static void RequireAuthorization(this App app, string prefix, string policy)
    {
        foreach (var e in app.Router.Endpoints.Where(e => e.Template.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))) e.With(new Authorize(policy));
    }
}`,
      explanation:
        "Issue signs the Base64Url payload with HMAC-SHA256. Verify splits the token, recomputes the signature and compares it in constant time before it parses anything, then checks the expiry against the platform clock, returning a reason string for each failure. UseAuthentication runs early in the pipeline: with no header the caller is Anonymous, with a bad token it throws a 401 whose WWW-Authenticate header carries the reason, and with a good token the Principal is stored in Items and in the scoped UserAccessor that ICurrentUser reads from. UseAuthorization runs after routing so it can read the matched endpoint's metadata; RequireAuthorization attaches a policy to every endpoint under a prefix. OwnedBookings is registered in place of BookingRepository, so the same controller now returns 404 for someone else's booking and the foreign booking cannot be told apart from a missing one.",
      hints: [
        { id: "h1", title: "Signing and verifying", content: "string Sign(string payload) => Base64Url.EncodeToString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(payload))); (System.Buffers.Text.Base64Url is built in.) Issue: var payload = Base64Url.EncodeToString(JsonSerializer.SerializeToUtf8Bytes(new { sub = p.MemberId, role = p.Role, exp = p.Expires })); return payload + \".\" + Sign(payload); Verify: split on '.', require 2 parts; FixedTimeEquals(Encoding.ASCII.GetBytes(Sign(parts[0])), Encoding.ASCII.GetBytes(parts[1])) else (null, \"bad signature\"); then JsonSerializer.Deserialize<JsonElement>(Base64Url.DecodeFromChars(parts[0])) in a try/catch for FormatException/JsonException/KeyNotFoundException -> \"malformed\"; exp <= clock.Now -> \"expired\"." },
        { id: "h2", title: "The two middleware", content: "Authentication: var user = Principal.Anonymous; if (ctx.Request.Header(\"Authorization\") is { } header) { var (principal, error) = header.StartsWith(\"Bearer \") ? tokens.Verify(header[7..]) : (null, \"unsupported scheme\"); if (principal == null) { set the WWW-Authenticate header; throw new HttpException(401, \"invalid token: \" + error); } user = principal; } ctx.Items[\"user\"] = user; ctx.Services().Get<UserAccessor>().User = user; await next(ctx). Authorization: foreach (var rule in ((RouteMatch)ctx.Items[\"route\"]).Endpoint?.Metadata.OfType<Authorize>() ?? []) { if (user == Principal.Anonymous) throw new HttpException(401, \"sign in required\"); if (!Policies[rule.Policy](user)) throw new HttpException(403, ...); }" },
        { id: "h3", title: "Policies, ownership and registration", content: "static readonly Dictionary<string, Func<Principal, bool>> Policies = new() { [\"member\"] = u => u != Principal.Anonymous, [\"staff\"] = u => u.Role is \"staff\" or \"admin\" }; RequireAuthorization: foreach (var e in app.Router.Endpoints.Where(e => e.Template.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))) e.With(new Authorize(policy)); OwnedBookings: public override Booking Get(int id) => base.Get(id) is { } b && (b.MemberId == user.MemberId || user.Role is \"staff\" or \"admin\") ? b : null; Use Phase.Auth for identity, Phase.Authorize for authorization and Phase.Policies for the prefix rules (they must run after the endpoints exist)." },
      ],
      tests: [
        {
          id: "t1",
          description: "a token you issue verifies back to the same claims",
          assertionCode: js`
assert(Array.isArray(scene.auth) && scene.auth.length >= 10 && scene.minted, "Register the modules and replay: await secure.Replay(\"auth\") after sending Board.Show(\"minted\", ...).");
assert(scene.minted, "The harness sends Board.Show(\"minted\", ...) after Issue + Verify.");
assertEqual([scene.minted.memberId, scene.minted.role, scene.minted.ttlMs], [7, "member", 60000], "member id, role and remaining lifetime");`,
        },
        {
          id: "t2",
          description: "the signed-in member flows into ICurrentUser",
          assertionCode: js`
assert(Array.isArray(scene.auth) && scene.auth.length >= 10 && scene.minted, "Register the modules and replay: await secure.Replay(\"auth\") after sending Board.Show(\"minted\", ...).");
assert(Array.isArray(scene.auth), "Replay the section with secure.Replay(\"auth\").");
const created = scene.auth[0];
assertEqual(created.status, 201, "POST /bookings with a valid token");
assertEqual(JSON.parse(created.body).memberId, 3, "the booking belongs to the member named in the token, not to a hard-coded user");`,
        },
        {
          id: "t3",
          description: "an owner can read their own booking",
          assertionCode: js`assert(Array.isArray(scene.auth) && scene.auth.length >= 10 && scene.minted, "Register the modules and replay: await secure.Replay(\"auth\") after sending Board.Show(\"minted\", ...).");
assertEqual(scene.auth[1].status, 200, "GET /bookings/1 as its owner");`,
        },
        {
          id: "t4",
          description: "another member gets 404, not 403 (no IDOR, no id enumeration)",
          assertionCode: js`
assert(Array.isArray(scene.auth) && scene.auth.length >= 10 && scene.minted, "Register the modules and replay: await secure.Replay(\"auth\") after sending Board.Show(\"minted\", ...).");
const other = scene.auth[2];
assertEqual(other.status, 404, "member 4 reading member 3's booking must look like a missing booking");
assertEqual(JSON.parse(other.body).title, "Not Found", "a normal not-found problem");`,
        },
        {
          id: "t5",
          description: "staff can read any booking",
          assertionCode: js`assert(Array.isArray(scene.auth) && scene.auth.length >= 10 && scene.minted, "Register the modules and replay: await secure.Replay(\"auth\") after sending Board.Show(\"minted\", ...).");
assertEqual(scene.auth[3].status, 200, "GET /bookings/1 as staff");`,
        },
        {
          id: "t6",
          description: "no credentials on a protected endpoint is a 401",
          assertionCode: js`
assert(Array.isArray(scene.auth) && scene.auth.length >= 10 && scene.minted, "Register the modules and replay: await secure.Replay(\"auth\") after sending Board.Show(\"minted\", ...).");
const anon = scene.auth[4];
assertEqual(anon.status, 401, "GET /bookings/1 without a token");
assertEqual(JSON.parse(anon.body).title, "Unauthorized", "problem title");`,
        },
        {
          id: "t7",
          description: "expired and forged tokens are rejected, each with its own reason",
          assertionCode: js`
assert(Array.isArray(scene.auth) && scene.auth.length >= 10 && scene.minted, "Register the modules and replay: await secure.Replay(\"auth\") after sending Board.Show(\"minted\", ...).");
const expired = scene.auth[5];
assertEqual(expired.status, 401, "expired token");
assert((expired.headers["WWW-Authenticate"] ?? "").includes("expired"), "WWW-Authenticate should say why: " + expired.headers["WWW-Authenticate"]);
const forged = scene.auth[6];
assertEqual(forged.status, 401, "token with a tampered payload");
assert((forged.headers["WWW-Authenticate"] ?? "").includes("signature"), "the forged token fails the signature check: " + forged.headers["WWW-Authenticate"]);`,
        },
        {
          id: "t8",
          description: "a policy on an endpoint: members get 403, staff get through",
          assertionCode: js`
assert(Array.isArray(scene.auth) && scene.auth.length >= 10 && scene.minted, "Register the modules and replay: await secure.Replay(\"auth\") after sending Board.Show(\"minted\", ...).");
assertEqual(scene.auth[7].status, 403, "member on /staff/slots/31/bookings");
const staff = scene.auth[8];
assertEqual(staff.status, 200, "staff on /staff/slots/31/bookings");
assertEqual(JSON.parse(staff.body).length, 1, "the slot has one booking");`,
        },
        {
          id: "t9",
          description: "endpoints without a requirement stay public",
          assertionCode: js`assert(Array.isArray(scene.auth) && scene.auth.length >= 10 && scene.minted, "Register the modules and replay: await secure.Replay(\"auth\") after sending Board.Show(\"minted\", ...).");
assertEqual(scene.auth[9].status, 200, "GET /gyms/2 needs no token");`,
        },
      ],
      unlocks: ["ca-auth"],
      checks: [
        {
          prompt: "An attacker changes `\"role\":\"member\"` to `\"role\":\"admin\"` in the payload of a token and sends it unchanged otherwise. What stops them?",
          question: {
            type: "choice",
            options: [
              "The signature no longer matches the payload, so verification fails before the claims are trusted",
              "The payload is encrypted, so they cannot read it",
              "The server looks the user up in a database on every request",
              "Nothing: the role claim is trusted",
            ],
            answer: 0,
          },
          explanation: "The HMAC covers the exact payload text. Without the server's secret the attacker cannot produce a matching signature for a modified payload. (The payload itself is readable: signing gives integrity, not secrecy.)",
        },
        {
          prompt: "Member 4 requests member 3's booking. Which response is best, and why?",
          question: {
            type: "choice",
            options: [
              "404, so a foreign booking is indistinguishable from a missing one",
              "403, because the member is forbidden",
              "401, because the member is wrong",
              "200 with the sensitive fields removed",
            ],
            answer: 0,
          },
          explanation: "A 403 confirms that booking 1 exists and belongs to someone else, which helps an attacker enumerate ids. A 404 reveals nothing. Staff, who are allowed to see everything, still get the booking.",
        },
        {
          prompt: "Why compare signatures with `CryptographicOperations.FixedTimeEquals` instead of `==`?",
          question: {
            type: "choice",
            options: [
              "`==` stops at the first difference, so response timing can leak how many leading bytes were right",
              "`==` does not work on byte arrays",
              "FixedTimeEquals is faster",
              "It decodes Base64 automatically",
            ],
            answer: 0,
          },
          explanation: "A short-circuiting comparison finishes sooner when the first bytes differ than when many bytes match. Measuring that difference many times lets an attacker recover a valid signature one byte at a time. A constant-time compare always looks at every byte.",
        },
      ],
    },
    // ───────────────────────── 9 ─────────────────────────
    {
      id: "csharp-api-9-ratelimit",
      title: "Rate limiting with a token bucket",
      minutes: 40,
      xp: 220,
      concepts: ["token bucket", "429 Too Many Requests", "Retry-After", "limiter keys", "injected clock", "fairness"],
      learn: md`### Why limit anything

Every API has a capacity, and one badly behaved caller can spend all of it. A scraper hitting \`/gyms\` forty times a second, a mobile client stuck in a retry loop, a script with a typo that books the same slot in a tight loop: none of them is an attack, and all of them take the site away from everyone else. A **rate limiter** turns "whoever is loudest wins" into "everyone gets a fair share".

It also protects what is behind you (a database, an email provider with its own quotas) and puts a ceiling on the damage a stolen token can do.

### Choosing an algorithm

- **Fixed window**: "100 requests per minute", counted per calendar minute. Simple, but a caller can send 100 requests at 12:00:59 and 100 more at 12:01:00: double the intended rate across the boundary.
- **Sliding window**: remembers each request's timestamp; precise and memory hungry.
- **Token bucket**: a bucket holds up to \`capacity\` tokens and refills continuously at \`rate\` tokens per second; each request takes one token; an empty bucket means "not now". It allows short **bursts** up to the capacity (a page that fires five calls at once is fine) while enforcing the long-run average. This is the one we build, and the most common choice for APIs.

### The math

Do not run a timer that adds tokens. Compute the refill **lazily**, when a request arrives:

~~~csharp
tokens = Math.Min(capacity, tokens + elapsedMs / 1000.0 * perSecond);   // top up for the time that passed
if (tokens >= 1) { tokens -= 1; allowed }                               // spend one
else retryAfter = Math.Ceiling((1 - tokens) / perSecond);               // seconds until one whole token exists
~~~

Two details decide whether your limiter is *correct* or merely plausible:

1. **Keep the fraction.** After 100 ms at one token per second the bucket has gained 0.1 of a token. Truncating to a whole number loses that every time and makes the limiter stricter than configured. Store tokens as a \`double\`.
2. **Update the timestamp on every look, including rejected requests.** The refill is computed from the last time you looked. If you only update on success, a rejected request's elapsed time is counted twice on the next call.

### What goes in the response

A rejected request gets **429 Too Many Requests** and a **\`Retry-After\`** header with the number of whole seconds to wait (round *up*, or the client will retry a hair too early and be rejected again). Successful responses can carry \`X-RateLimit-Remaining\` so well-behaved clients can pace themselves without ever hitting the wall.

Throw the 429 as an \`HttpException\`: the problem-details middleware outside it turns it into a document, and the headers you already set stay on the response.

### Who is "the client"?

The limiter needs a **key**. A signed-in member is the best key: \`user:3\`. For anonymous callers fall back to something about the connection; ours reads an \`X-Client\` header. In production that would be the client address, taken carefully from the *last trusted proxy's* \`X-Forwarded-For\` entry, because a header the client controls is a header the client can change to dodge the limit.

That is also why the middleware sits **after authentication** in the pipeline: it needs the identity. Probes must not be throttled: orchestrators call \`/health/*\` constantly, so skip them.

### Production notes

- **Time is a dependency.** The limiter reads \`clock.Now\`, never \`DateTime.UtcNow\`. That makes the whole thing testable: you can say "advance 1.4 seconds" and assert exactly.
- **An in-memory limiter is per instance.** Behind a load balancer with four instances, "5 per second" becomes up to 20. Shared limits need a shared store (and accept some approximation).
- **Buckets are memory.** Evict buckets that have been full for a while, or an attacker with a million keys becomes your memory problem.
- **Clients should back off with jitter**, not hammer at exactly the \`Retry-After\` instant (lesson 14).

### Common mistakes

- Resetting the bucket to full on every tick instead of refilling proportionally.
- Counting rejected requests against the caller.
- Using wall-clock time inside the algorithm.
- Limiting by a spoofable header without saying so.
- Forgetting that health checks are traffic.`,
      mission: md`A scraper discovered \`GET /gyms\` and polls it hundreds of times a minute. Members' pages slow down, and the email provider is already complaining about the volume of booking confirmations. The product owner's brief fits on a sticky note: *"Bursts are fine, floods are not, and tell people how long to wait."*

You will build a token-bucket limiter on the platform's deterministic clock and slot it into the pipeline. The recording replays twelve requests from two clients: a burst of seven, a second client who must be unaffected, and a later group after enough time has passed for the bucket to refill. When this lesson passes, the **Rate limits** panel shows each client's bucket.`,
      tasks: [
        "Write RateLimiter.Take(key): create a full bucket on first sight, refill by elapsed milliseconds times perSecond / 1000 (keep the fraction, cap at capacity), update the timestamp, take one token when tokens >= 1; return (allowed, retryAfterSeconds rounded up, whole tokens remaining)",
        "Write UseRateLimit: skip paths under /health; key = \"user:<id>\" for a signed-in member, otherwise \"client:<X-Client header or unknown>\"; when not allowed set Retry-After and throw HttpException(429, ...); otherwise set X-RateLimit-Remaining and call next",
        "Register the \"rate-limit\" module at Phase.Limit (capacity 5, one token per second, the limiter also stored in api.Parts[\"limiter\"]) and run the harness",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 9. A token bucket per client: 5 tokens, one more every second. Register the module, then the harness replays "ratelimit".
//  Platform.Add("rate-limit", Phase.Limit, api => { var limiter = new RateLimiter(capacity: 5, perSecond: 1, api.Clock);
//      api.Parts["limiter"] = limiter;  api.App.UseRateLimit(limiter); });
var throttled = Platform.Build();
await throttled.Replay("ratelimit");
Board.Show("buckets", throttled.Part<RateLimiter>("limiter").Buckets.Select(b => new { key = b.Key, tokens = Math.Round(b.Value.Tokens, 2) }));

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── Take(key): top up for the elapsed time (keep the fraction), cap at capacity, take one if >= 1.
// The middleware keys by signed-in member, else X-Client; answers 429 + Retry-After (whole seconds, rounded up); skips /health.
class RateLimiter(int capacity, double perSecond, Clock clock)
{
    public Dictionary<string, (double Tokens, long Stamp)> Buckets { get; } = new();
    public (bool Allowed, int RetryAfter, int Remaining) Take(string key) => throw new NotImplementedException();
}

static class RateLimitExtensions
{
    public static App UseRateLimit(this App app, RateLimiter limiter) => throw new NotImplementedException();
}`,
      solutionAdd: cs`// 9. rate limiting
Platform.Add("rate-limit", Phase.Limit, api =>
{
    var limiter = new RateLimiter(capacity: 5, perSecond: 1, api.Clock);
    api.Parts["limiter"] = limiter;
    api.App.UseRateLimit(limiter);
});
var throttled = Platform.Build();
await throttled.Replay("ratelimit");
Board.Show("buckets", throttled.Part<RateLimiter>("limiter").Buckets.Select(b => new { key = b.Key, tokens = Math.Round(b.Value.Tokens, 2) }));

${TYPES_DIVIDER}
class RateLimiter(int capacity, double perSecond, Clock clock)
{
    public Dictionary<string, (double Tokens, long Stamp)> Buckets { get; } = new();

    // Tops the bucket up for the time that has passed, then takes one token if there is one.
    public (bool Allowed, int RetryAfter, int Remaining) Take(string key)
    {
        var (tokens, stamp) = Buckets.GetValueOrDefault(key, (capacity, clock.Now));
        tokens = Math.Min(capacity, tokens + (clock.Now - stamp) / 1000.0 * perSecond);
        var allowed = tokens >= 1;
        Buckets[key] = (allowed ? tokens - 1 : tokens, clock.Now);
        return (allowed, allowed ? 0 : (int)Math.Ceiling((1 - tokens) / perSecond), allowed ? (int)(tokens - 1) : 0);
    }
}

static class RateLimitExtensions
{
    public static App UseRateLimit(this App app, RateLimiter limiter) => app.Use("rate-limit", async (ctx, next) =>
    {
        if (ctx.Request.Path.StartsWith("/health")) { await next(ctx); return; }
        var key = ctx.Items.GetValueOrDefault("user") is Principal { MemberId: > 0 } p ? "user:" + p.MemberId : "client:" + (ctx.Request.Header("X-Client") ?? "unknown");
        var (allowed, retryAfter, remaining) = limiter.Take(key);
        if (!allowed)
        {
            ctx.Response.Headers["Retry-After"] = retryAfter.ToString();
            throw new HttpException(429, $"rate limit exceeded, retry in {retryAfter}s");
        }
        ctx.Response.Headers["X-RateLimit-Remaining"] = remaining.ToString();
        await next(ctx);
    });
}`,
      explanation:
        "Take reads the bucket (or starts a full one), adds elapsed milliseconds times the refill rate, caps the result at the capacity, stores the new timestamp even when the request is refused, and spends a whole token only if one is available. The fraction is kept, so after 100 ms the bucket really has 0.1 more of a token; that is why the allowed count after the pause in the recording is exactly two. A refusal reports Retry-After as the whole seconds until one token exists, rounded up. The middleware sits after authentication so it can key by member, skips health probes, and signals the refusal by throwing HttpException(429), which the problem-details middleware outside it renders while keeping the headers already set.",
      hints: [
        { id: "h1", title: "Take", content: "var (tokens, stamp) = Buckets.GetValueOrDefault(key, (capacity, clock.Now)); tokens = Math.Min(capacity, tokens + (clock.Now - stamp) / 1000.0 * perSecond); var allowed = tokens >= 1; Buckets[key] = (allowed ? tokens - 1 : tokens, clock.Now); return (allowed, allowed ? 0 : (int)Math.Ceiling((1 - tokens) / perSecond), allowed ? (int)(tokens - 1) : 0);  (capacity is an int; the tuple default (capacity, clock.Now) converts to (double, long).)" },
        { id: "h2", title: "The middleware", content: "app.Use(\"rate-limit\", async (ctx, next) => { if (ctx.Request.Path.StartsWith(\"/health\")) { await next(ctx); return; } var key = ctx.Items.GetValueOrDefault(\"user\") is Principal { MemberId: > 0 } p ? \"user:\" + p.MemberId : \"client:\" + (ctx.Request.Header(\"X-Client\") ?? \"unknown\"); var (allowed, retryAfter, remaining) = limiter.Take(key); if (!allowed) { ctx.Response.Headers[\"Retry-After\"] = retryAfter.ToString(); throw new HttpException(429, ...); } ctx.Response.Headers[\"X-RateLimit-Remaining\"] = remaining.ToString(); await next(ctx); });" },
        { id: "h3", title: "Why the numbers come out this way", content: "Client a sends seven requests in 600 ms with a bucket of 5 and a refill of 1 per second. Each request also refills 0.1 of a token, so the fifth request leaves about 0.4 and the sixth and seventh are refused with Retry-After: 1. After the long pause the bucket holds 2.0 tokens, so exactly two requests pass before the next refusals. If your count is off by one, check that you keep the fractional part and that you update the timestamp on refused requests too." },
      ],
      tests: [
        {
          id: "t1",
          description: "a burst up to the bucket size is allowed and the remaining count falls",
          assertionCode: js`
assert(Array.isArray(scene.ratelimit) && scene.ratelimit.length >= 12, "Register the module and replay: await throttled.Replay(\"ratelimit\").");
assert(Array.isArray(scene.ratelimit), "Replay the section with throttled.Replay(\"ratelimit\").");
const first = scene.ratelimit.slice(0, 5);
assertEqual(first.map((e) => e.status), [200, 200, 200, 200, 200], "five requests fit in a bucket of five");
assertEqual(first.map((e) => e.headers["X-RateLimit-Remaining"]), ["4", "3", "2", "1", "0"], "X-RateLimit-Remaining counts down");`,
        },
        {
          id: "t2",
          description: "the sixth request is a 429 with Retry-After and a problem document",
          assertionCode: js`
assert(Array.isArray(scene.ratelimit) && scene.ratelimit.length >= 12, "Register the module and replay: await throttled.Replay(\"ratelimit\").");
const sixth = scene.ratelimit[5];
assertEqual(sixth.status, 429, "sixth request in the burst");
assertEqual(sixth.headers["Retry-After"], "1", "wait one whole second (rounded up)");
assertEqual(JSON.parse(sixth.body).title, "Too Many Requests", "problem title");
assertEqual(scene.ratelimit[6].status, 429, "the seventh is refused too");`,
        },
        {
          id: "t3",
          description: "each client has its own bucket",
          assertionCode: js`
assert(Array.isArray(scene.ratelimit) && scene.ratelimit.length >= 12, "Register the module and replay: await throttled.Replay(\"ratelimit\").");
const b = scene.ratelimit[7];
assertEqual(b.status, 200, "client b is not affected by client a's flood");
assertEqual(b.headers["X-RateLimit-Remaining"], "4", "client b starts with a full bucket");`,
        },
        {
          id: "t4",
          description: "the bucket refills with time, keeping fractions of a token",
          assertionCode: js`
assert(Array.isArray(scene.ratelimit) && scene.ratelimit.length >= 12, "Register the module and replay: await throttled.Replay(\"ratelimit\").");
const later = scene.ratelimit.slice(8, 12).map((e) => e.status);
assertEqual(later, [200, 200, 429, 429], "after about 1.4 s the bucket holds 2 tokens: two requests pass, then refusals resume");`,
        },
        {
          id: "t5",
          description: "the buckets are keyed per client and hold fractional tokens",
          assertionCode: js`
assert(Array.isArray(scene.ratelimit) && scene.ratelimit.length >= 12, "Register the module and replay: await throttled.Replay(\"ratelimit\").");
assert(Array.isArray(scene.buckets), "Send the buckets with Board.Show(\"buckets\", ...).");
const a = scene.buckets.find((x) => x.key === "client:a");
const b = scene.buckets.find((x) => x.key === "client:b");
assert(a && b, "expected buckets client:a and client:b, got " + JSON.stringify(scene.buckets));
assert(Math.abs(a.tokens - 0.3) < 0.06, "client a should hold about 0.3 tokens, got " + a.tokens);
assert(Math.abs(b.tokens - 4) < 0.06, "client b should hold about 4 tokens, got " + b.tokens);`,
        },
      ],
      unlocks: ["ca-ratelimit"],
      checks: [
        {
          prompt: "A bucket holds 5 tokens and refills 1 per second. A client is idle for 20 seconds, then sends 8 requests at once. How many succeed?",
          question: { type: "number", answer: 5 },
          explanation: "The bucket is capped at its capacity of 5, so idle time cannot build up a larger burst. The first 5 requests spend the tokens; the other 3 are refused until more tokens trickle in.",
        },
        {
          prompt: "Why does the limiter read the platform's `Clock` instead of `DateTime.UtcNow`?",
          question: {
            type: "choice",
            options: [
              "So tests can advance time exactly and assert exact outcomes",
              "Because DateTime.UtcNow is not thread safe",
              "To avoid time zones",
              "Because the Clock is faster",
            ],
            answer: 0,
          },
          explanation: "Time is an input like any other. With an injected clock a test can say \"1.4 seconds pass\" and the result is the same every run. With wall-clock time the same test is flaky and slow.",
        },
        {
          prompt: "Four instances of the API sit behind a load balancer, each with an in-memory limiter of 5 requests per second. What limit can one client actually reach?",
          question: {
            type: "choice",
            options: ["Up to 20 per second", "Exactly 5 per second", "About 1.25 per second", "Unlimited"],
            answer: 0,
          },
          explanation: "Each instance counts only the requests it sees, so a client that is spread across instances gets up to the sum of the limits. A shared limit needs a shared store.",
        },
      ],
    },
    // ───────────────────────── 10 ─────────────────────────
    {
      id: "csharp-api-10-idempotency",
      title: "Idempotency keys for POST",
      minutes: 45,
      xp: 240,
      concepts: ["idempotency", "Idempotency-Key", "request fingerprint", "replay", "in-flight detection", "TTL", "retry safety"],
      learn: md`### The double-booking problem

A member taps **Book** on a train with bad signal. The request reaches the server, the booking is created, the response is lost on the way back. The app times out and retries. Now the member has two bookings and a smaller wallet. Neither side did anything wrong: networks lose *responses* as often as requests, and a client cannot tell the difference between "it never arrived" and "it worked but I never heard". Retrying is the right thing to do, as long as retrying is **safe**.

\`GET\`, \`PUT\` and \`DELETE\` are idempotent by definition. \`POST\` is not. An **idempotency key** makes it so: the client invents a unique key for each *logical operation* (say a UUID generated when the user taps Book) and sends it in an \`Idempotency-Key\` header on every attempt of that operation. The server promises: *whatever the first attempt did, the later attempts get the same answer, and nothing happens twice.*

### What the server must remember

For each key it stores a **fingerprint** of the request (a SHA-256 hash of method, path and body) and, once finished, the **response** (status, body and the headers that matter, such as \`Location\`). When a request with a key arrives there are four cases:

| Situation | Answer |
| --- | --- |
| never seen (or expired) | **Fresh**: record the key, run the endpoint |
| seen, same fingerprint, finished | **Replay**: return the stored response and mark it \`Idempotent-Replayed: true\`; do not run the endpoint |
| seen, **different** fingerprint | **Mismatch**: the client reused a key for another request, which is a bug on their side: **422** |
| seen, same fingerprint, still running | **InFlight**: a duplicate arrived before the first finished: **409** |

The fingerprint check matters: without it, reusing a key for a *different* booking would silently return the first booking's response, and the user would believe the second one worked.

### Reserve first, work second

\`Begin\` must **record the key before** the endpoint runs, not after. Otherwise two simultaneous duplicates both see "never seen", both run, and you have the double booking again with extra steps. The in-flight entry (a key with no saved response yet) is how the second duplicate learns to wait or back off. In real systems this reservation is a unique-constraint insert in the same database transaction as the work; our in-memory version shows the logic.

### What to remember, and what to forget

Only **definitive** outcomes should be replayed. If the first attempt ended in a validation error or a crash, the client is *supposed* to fix something and try again with the same key, and replaying the old failure would trap them. So: **2xx** responses are saved with \`Complete\`; anything else (a 4xx problem, a 5xx, an exception) \`Abandon\`s the key so the next attempt runs afresh. Choose this deliberately: some APIs replay client errors too, to make retries cheaper. What matters is that you decide and document it.

Keys expire. A time-to-live bounds memory and bounds how long a stale key can surprise someone; 24 hours is common, ours is five virtual seconds so the recording can show expiry.

### Scope the key to the caller

Two members can legitimately generate the same key. The ledger key is \`owner:key\`, where the owner is the signed-in member (or the client address when anonymous). Without the owner prefix, member B could replay member A's response, including A's booking details, just by guessing a key. This is also why the middleware sits **after authentication**.

### Where it fits

The idempotency middleware runs after authentication (owner known) and authorization, inside the problems middleware (so exceptions still become responses), and before the endpoint. It only acts on \`POST\` with the header; everything else passes straight through. The module's phase puts it there.

### Failure windows you cannot close here

If the server crashes *after* creating the booking but *before* saving the key's response, a retry will create a second booking. The real fix is to write the idempotency record in the **same transaction** as the booking, which is the same idea as the outbox in lesson 15.

### Common mistakes

- Saving the response but not the fingerprint, so key reuse goes unnoticed.
- Saving the key after the work.
- Replaying 5xx responses forever.
- A global key space shared by all users.
- Treating the header as mandatory: it is optional; no key, no protection, normal behaviour.`,
      mission: md`Support is fielding one complaint more than any other: "I was charged for two sessions." The app retries when the response is slow, and the booking endpoint happily books again each time. The mobile team has agreed to send an \`Idempotency-Key\` header, a fresh UUID per tap. Your job is the server half.

You will write a ledger and a middleware. The recording replays eight booking requests: a first attempt, its retry, a retry with a different body under the same key, a request with no key, another member using the same key, a failing request and its retry, and a retry after the key expired. When this lesson passes, the **Idempotency ledger** lights up.`,
      tasks: [
        "Write IdempotencyLedger.Begin(key, fingerprint): an unexpired entry gives Mismatch (different fingerprint), InFlight (no saved response yet) or Replay (with the saved response); otherwise record a new entry expiring after ttlMs and return Fresh. Write Complete (save status, body and a copy of the headers) and Abandon (forget the key)",
        "Write UseIdempotency: only for POST with an Idempotency-Key header; ledger key = \"<user:id or X-Client>:<key>\"; fingerprint = SHA-256 hex of method + path + body; Mismatch is HttpException(422), InFlight is HttpException(409); Replay restores status, body and headers and adds Idempotent-Replayed: true without calling next; Fresh calls next, then saves 2xx responses with Complete and forgets everything else (including when next throws)",
        "Register the \"idempotency\" module at Phase.Idempotency (ttl 5000 ms, stored in api.Parts[\"ledger\"]) and run the harness",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 10. A POST with an Idempotency-Key must book once, however many times the client retries it.
//  Platform.Add("idempotency", Phase.Idempotency, api => { var ledger = new IdempotencyLedger(api.Clock, ttlMs: 5000);
//      api.Parts["ledger"] = ledger;  api.App.UseIdempotency(ledger); });
var once = Platform.Build();
await once.Replay("idempotency");
var probe = new IdempotencyLedger(once.Clock, 5000);
Board.Show("ledger", new
{
    stored = once.Part<IdempotencyLedger>("ledger").Entries.Keys,
    bookings = new DbContext(once.Part<Database>("db")).Set<Booking>().Count(),
    concurrent = new[] { probe.Begin("a:k-1", "fp").Kind.ToString(), probe.Begin("a:k-1", "fp").Kind.ToString() },
});

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── Begin(key, fingerprint) decides Fresh / Replay / Mismatch / InFlight (entries expire after ttlMs);
// Complete saves the response, Abandon forgets the key. The middleware keys by member (or X-Client), fingerprints method + path + body,
// replays saved answers (plus Idempotent-Replayed: true), and remembers only 2xx outcomes.
enum LedgerKind { Fresh, Replay, Mismatch, InFlight }
record Saved(int Status, string Body, Dictionary<string, string> Headers);

class IdempotencyLedger(Clock clock, long ttlMs)
{
    public Dictionary<string, (string Fingerprint, long Expires, Saved Saved)> Entries { get; } = new();
    public (LedgerKind Kind, Saved Saved) Begin(string key, string fingerprint) => throw new NotImplementedException();
    public void Complete(string key, Response r) => throw new NotImplementedException();
    public void Abandon(string key) => throw new NotImplementedException();
}

static class IdempotencyExtensions
{
    public static App UseIdempotency(this App app, IdempotencyLedger ledger) => throw new NotImplementedException();
}`,
      solutionAdd: cs`// 10. idempotency keys
Platform.Add("idempotency", Phase.Idempotency, api =>
{
    var ledger = new IdempotencyLedger(api.Clock, ttlMs: 5000);
    api.Parts["ledger"] = ledger;
    api.App.UseIdempotency(ledger);
});
var once = Platform.Build();
await once.Replay("idempotency");
var probe = new IdempotencyLedger(once.Clock, 5000);
Board.Show("ledger", new
{
    stored = once.Part<IdempotencyLedger>("ledger").Entries.Keys,
    bookings = new DbContext(once.Part<Database>("db")).Set<Booking>().Count(),
    concurrent = new[] { probe.Begin("a:k-1", "fp").Kind.ToString(), probe.Begin("a:k-1", "fp").Kind.ToString() },
});

${TYPES_DIVIDER}
enum LedgerKind { Fresh, Replay, Mismatch, InFlight }
record Saved(int Status, string Body, Dictionary<string, string> Headers);

class IdempotencyLedger(Clock clock, long ttlMs)
{
    public Dictionary<string, (string Fingerprint, long Expires, Saved Saved)> Entries { get; } = new();

    public (LedgerKind Kind, Saved Saved) Begin(string key, string fingerprint)
    {
        if (Entries.TryGetValue(key, out var e) && e.Expires > clock.Now)
            return (e.Fingerprint != fingerprint ? LedgerKind.Mismatch : e.Saved == null ? LedgerKind.InFlight : LedgerKind.Replay, e.Saved);
        Entries[key] = (fingerprint, clock.Now + ttlMs, null);
        return (LedgerKind.Fresh, null);
    }

    public void Complete(string key, Response r) => Entries[key] = (Entries[key].Fingerprint, Entries[key].Expires, new Saved(r.Status, r.Body, new(r.Headers)));
    public void Abandon(string key) => Entries.Remove(key);
}

static class IdempotencyExtensions
{
    public static App UseIdempotency(this App app, IdempotencyLedger ledger) => app.Use("idempotency", async (ctx, next) =>
    {
        var request = ctx.Request;
        if (request.Method != "POST" || request.Header("Idempotency-Key") is not { } supplied) { await next(ctx); return; }
        var owner = ctx.Items.GetValueOrDefault("user") is Principal { MemberId: > 0 } p ? "user:" + p.MemberId : request.Header("X-Client") ?? "anon";
        var key = $"{owner}:{supplied}";
        var (kind, saved) = ledger.Begin(key, Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(request.Method + request.Path + request.Body))));
        if (kind == LedgerKind.Mismatch) throw new HttpException(422, "this Idempotency-Key was already used for a different request");
        if (kind == LedgerKind.InFlight) throw new HttpException(409, "a request with this Idempotency-Key is still being processed");
        if (kind == LedgerKind.Replay)
        {
            (ctx.Response.Status, ctx.Response.Body) = (saved.Status, saved.Body);
            foreach (var h in saved.Headers) ctx.Response.Headers[h.Key] = h.Value;
            ctx.Response.Headers["Idempotent-Replayed"] = "true";
            return;
        }
        try { await next(ctx); }
        catch { ledger.Abandon(key); throw; }
        if (ctx.Response.Status is >= 200 and < 300) ledger.Complete(key, ctx.Response); else ledger.Abandon(key);
    });
}`,
      explanation:
        "Begin reserves the key before the endpoint runs: a missing or expired entry becomes a new in-flight entry (no saved response yet) and the caller proceeds as Fresh. A second request that finds an entry sees one of three things: a different fingerprint (the client reused the key for another request, 422), the same fingerprint with no saved response (still running, 409) or the same fingerprint with a saved response (replay). The middleware only handles POSTs with the header, scopes the key by member so two people can use the same key, calls the endpoint for Fresh requests and saves the response only if it was a 2xx; failures and exceptions abandon the key so the client can fix the request and try again. Replays restore the status, body and saved headers (including Location) and add Idempotent-Replayed.",
      hints: [
        { id: "h1", title: "Begin", content: "if (Entries.TryGetValue(key, out var e) && e.Expires > clock.Now) return (e.Fingerprint != fingerprint ? LedgerKind.Mismatch : e.Saved == null ? LedgerKind.InFlight : LedgerKind.Replay, e.Saved); Entries[key] = (fingerprint, clock.Now + ttlMs, null); return (LedgerKind.Fresh, null);  Complete: Entries[key] = (Entries[key].Fingerprint, Entries[key].Expires, new Saved(r.Status, r.Body, new(r.Headers))); Abandon: Entries.Remove(key)." },
        { id: "h2", title: "The middleware", content: "if (request.Method != \"POST\" || request.Header(\"Idempotency-Key\") is not { } supplied) { await next(ctx); return; } var owner = ctx.Items.GetValueOrDefault(\"user\") is Principal { MemberId: > 0 } p ? \"user:\" + p.MemberId : request.Header(\"X-Client\") ?? \"anon\"; var key = $\"{owner}:{supplied}\"; var (kind, saved) = ledger.Begin(key, Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(request.Method + request.Path + request.Body)))); then handle Mismatch (422), InFlight (409), Replay (copy status, body and every saved header, add Idempotent-Replayed, return)." },
        { id: "h3", title: "Fresh requests", content: "try { await next(ctx); } catch { ledger.Abandon(key); throw; } if (ctx.Response.Status is >= 200 and < 300) ledger.Complete(key, ctx.Response); else ledger.Abandon(key);  Because the problems middleware sits outside yours, a 404 or 422 thrown by the endpoint arrives here as an exception: that is the catch branch." },
      ],
      tests: [
        {
          id: "t1",
          description: "the first attempt runs the endpoint",
          assertionCode: js`
assert(Array.isArray(scene.idempotency) && scene.idempotency.length >= 8 && scene.ledger, "Register the module and replay: await once.Replay(\"idempotency\").");
assert(Array.isArray(scene.idempotency), "Replay the section with once.Replay(\"idempotency\").");
const first = scene.idempotency[0];
assertEqual(first.status, 201, "first POST with key k-100");
assertEqual(first.headers["Location"], "/bookings/1", "Location of the new booking");
assert(!("Idempotent-Replayed" in first.headers), "a fresh request is not marked as a replay");`,
        },
        {
          id: "t2",
          description: "a retry gets the identical answer, marked as a replay, and the endpoint does not run",
          assertionCode: js`
assert(Array.isArray(scene.idempotency) && scene.idempotency.length >= 8 && scene.ledger, "Register the module and replay: await once.Replay(\"idempotency\").");
const [first, retry] = scene.idempotency;
assertEqual(retry.status, first.status, "same status");
assertEqual(retry.body, first.body, "same body");
assertEqual(retry.headers["Location"], first.headers["Location"], "same Location");
assertEqual(retry.headers["Idempotent-Replayed"], "true", "Idempotent-Replayed header");
assertEqual(scene.ledger.bookings, 4, "bookings 1 (once), 2, 3 and 4: the retry created nothing");`,
        },
        {
          id: "t3",
          description: "reusing a key for a different request is a 422",
          assertionCode: js`
assert(Array.isArray(scene.idempotency) && scene.idempotency.length >= 8 && scene.ledger, "Register the module and replay: await once.Replay(\"idempotency\").");
const mismatch = scene.idempotency[2];
assertEqual(mismatch.status, 422, "k-100 with a different body");
assertEqual(JSON.parse(mismatch.body).title, "Unprocessable Entity", "problem title");`,
        },
        {
          id: "t4",
          description: "requests without a key behave normally",
          assertionCode: js`
assert(Array.isArray(scene.idempotency) && scene.idempotency.length >= 8 && scene.ledger, "Register the module and replay: await once.Replay(\"idempotency\").");
const plain = scene.idempotency[3];
assertEqual(plain.status, 201, "POST without Idempotency-Key");
assertEqual(JSON.parse(plain.body).id, 2, "a second, separate booking");`,
        },
        {
          id: "t5",
          description: "keys are scoped to the caller: another member can use the same key",
          assertionCode: js`
assert(Array.isArray(scene.idempotency) && scene.idempotency.length >= 8 && scene.ledger, "Register the module and replay: await once.Replay(\"idempotency\").");
const other = scene.idempotency[4];
assertEqual(other.status, 201, "noor's k-100 is a different operation from mika's k-100");
assertEqual(JSON.parse(other.body).id, 3, "a third booking, and not a replay of mika's");
assert(!("Idempotent-Replayed" in other.headers), "not a replay");
assert(scene.ledger.stored.includes("user:3:k-100") && scene.ledger.stored.includes("user:4:k-100"), "ledger keys carry the owner: " + JSON.stringify(scene.ledger.stored));`,
        },
        {
          id: "t6",
          description: "failures are not remembered: the retry runs again",
          assertionCode: js`
assert(Array.isArray(scene.idempotency) && scene.idempotency.length >= 8 && scene.ledger, "Register the module and replay: await once.Replay(\"idempotency\").");
const [fail, retry] = [scene.idempotency[5], scene.idempotency[6]];
assertEqual([fail.status, retry.status], [404, 404], "slot 99 does not exist, both times");
assert(!("Idempotent-Replayed" in retry.headers), "the second 404 is a fresh answer, not a replay");
assert(!scene.ledger.stored.some((k) => k.endsWith("k-101")), "an abandoned key must not stay in the ledger");`,
        },
        {
          id: "t7",
          description: "keys expire after the time to live",
          assertionCode: js`
assert(Array.isArray(scene.idempotency) && scene.idempotency.length >= 8 && scene.ledger, "Register the module and replay: await once.Replay(\"idempotency\").");
const late = scene.idempotency[7];
assertEqual(late.status, 201, "k-100 six seconds later");
assert(!("Idempotent-Replayed" in late.headers), "the old entry expired, so this runs again");
assertEqual(JSON.parse(late.body).id, 4, "a new booking");`,
        },
        {
          id: "t8",
          description: "a duplicate that arrives while the first is still running is told so",
          assertionCode: js`assert(Array.isArray(scene.idempotency) && scene.idempotency.length >= 8 && scene.ledger, "Register the module and replay: await once.Replay(\"idempotency\").");
assertEqual(scene.ledger.concurrent, ["Fresh", "InFlight"], "two Begin calls for the same key with no Complete in between");`,
        },
      ],
      unlocks: ["ca-idempotency"],
      checks: [
        {
          prompt: "The first attempt of a booking returned `500` because the database was briefly down. The client retries with the same key. What should the server do?",
          question: {
            type: "choice",
            options: [
              "Run the endpoint again, because a failed attempt must not be remembered",
              "Replay the 500, so the client sees consistent behaviour",
              "Return 409 because the key is in use",
              "Return 422 because the key was already used",
            ],
            answer: 0,
          },
          explanation: "The point of retrying is to get a success. Only definitive outcomes are saved; a server error abandons the key so the next attempt really runs.",
        },
        {
          prompt: "Why is the idempotency key stored together with a fingerprint of the request?",
          question: {
            type: "choice",
            options: [
              "To notice a client that reuses one key for a different request",
              "To make lookups faster",
              "To compress the stored response",
              "To encrypt the key",
            ],
            answer: 0,
          },
          explanation: "Without the fingerprint, a reused key would replay the first operation's response for a different request and the user would believe the second action succeeded.",
        },
        {
          prompt: "Why must `Begin` record the key *before* the endpoint runs?",
          question: {
            type: "choice",
            options: [
              "Otherwise two simultaneous duplicates both see \"never seen\" and both run",
              "Because the endpoint needs the key",
              "So the response can be compressed",
              "It does not matter; recording afterwards is equivalent",
            ],
            answer: 0,
          },
          explanation: "Check-then-act is a race. Reserving the key first turns the second duplicate into an `InFlight` conflict instead of a second execution.",
        },
      ],
    },
    // ───────────────────────── 11 ─────────────────────────
    {
      id: "csharp-api-11-caching",
      title: "ETags and Cache-Control",
      minutes: 40,
      xp: 220,
      concepts: ["HTTP caching", "ETag", "If-None-Match", "304 Not Modified", "Cache-Control", "public vs private", "validators"],
      learn: md`### The cheapest request is the one you don't answer

The slot list for a gym changes a few times a day and is requested thousands of times. Re-sending the same 2 KB of JSON each time wastes bandwidth, battery and your CPU. HTTP has two cooperating mechanisms to avoid it.

**Freshness** says *"you may reuse this without asking for N seconds."* The \`Cache-Control: max-age=30\` header tells browsers, proxies and CDNs that for 30 seconds they need not contact you at all.

**Validation** says *"you have a copy; ask me whether it is still current."* The response carries a **validator**, an \`ETag\`, which is an opaque label for *this version of the representation*. The client stores it. Next time it asks with \`If-None-Match: "<etag>"\`. If the label is still current, the server answers **304 Not Modified** with no body, and the client reuses its copy. If not, it gets a normal \`200\` with the new body and a new \`ETag\`.

The two combine: fresh copies are used without any request, stale copies are *revalidated* with a tiny request, and only really changed data travels in full.

### Making an ETag

An ETag must change whenever the representation changes and stay the same otherwise. The simplest honest recipe is a **hash of the response body**: same bytes, same tag. We use the first 16 hex digits of SHA-256, lower-case, in double quotes (the quotes are part of the value):

~~~text
ETag: "5ecb304f0a2cc6c5"
~~~

Because it is derived from the content, any number of server instances produce the same tag with no coordination. (A cheaper variant uses a row version or a "last modified" counter, so you can answer 304 **without building the body** at all; our version-column from lesson 7 would make an excellent ETag for \`GET /bookings/{id}\`.)

### Matching If-None-Match

The header may carry **several** tags separated by commas, each possibly **weak** (\`W/"abc"\`, meaning "semantically the same, not byte-identical", which is what compressing proxies produce), or the single wildcard \`*\` ("if you have *anything* for this URL"). For \`If-None-Match\` the comparison is a *weak* one, so strip the \`W/\` prefix before comparing. Any match means 304.

A 304 response:

- has **no body** and no \`Content-Type\`;
- still carries the \`ETag\` (and \`Cache-Control\`), so the client can refresh its stored metadata.

Only \`GET\` (and \`HEAD\`) responses with status **200** get validators. Never put an ETag on a \`POST\` result, an error, or a response that was already a 304. And if the endpoint has already chosen its own \`Cache-Control\` (the health probes in lesson 13 say \`no-store\`), the middleware leaves the response alone: a more specific decision beats the default.

### public, private and the privacy trap

\`Cache-Control: public\` allows shared caches (CDNs, corporate proxies) to store the response and hand it to *other people*. \`private\` restricts storage to the one user's own browser. A slot list is the same for everyone, so \`public\` is fine. Anything **personalised** (a response to a request carrying an \`Authorization\` header) must be \`private\`, or \`no-store\`, otherwise a shared cache may serve member 3's bookings to member 4. Our middleware makes that choice from the request: authorization header present means \`private\`.

For sensitive responses, \`Cache-Control: no-store\` forbids storage altogether; the health endpoints in lesson 13 use it.

### What a 304 does not save

The server still ran the endpoint to produce the body it hashed. Validation saves **bandwidth and client work**, not server work. To save server work too you need either freshness (the client does not ask) or cheap validators computed before building the body.

### Where it sits in the pipeline

The ETag middleware wraps the endpoint: it calls \`next\`, then inspects the finished response. That is the "after" half of the onion from lesson 3. It runs inside authentication (so it can see who asked) and outside the endpoint.

### Common mistakes

- Hashing something that changes per request (timestamps, request ids) so the tag never matches.
- Comparing the header as one string instead of splitting on commas.
- Forgetting the weak prefix \`W/\`, so proxies that re-compress your response break revalidation.
- \`public\` on personalised data.
- Serving a body with a 304.`,
      mission: md`The gym pages are the busiest on the site and almost never change; yet every visit downloads the whole slot list again. The mobile app team has asked for conditional requests, and the operations team has asked that nothing personal is ever stored by a shared cache.

You will write an ETag middleware. The recording replays nine requests: a first read, revalidations with a plain tag, with a weak tag in a list and with \`*\`, a staff member closing a slot (which changes the list), a revalidation with the now-stale tag, one with the new tag, an authenticated read, and a different resource. When this lesson passes, the **Cache validators** panel lights up.`,
      tasks: [
        "Write UseEtag(maxAgeSeconds): run next, then for a GET that answered 200 and has no Cache-Control yet set ETag to a quoted, lower-case, 16-hex-digit prefix of SHA-256 over the response body, and Cache-Control to \"private\" (when the request has an Authorization header) or \"public\", followed by \", max-age=<seconds>\"",
        "Handle If-None-Match: split on commas, trim, drop any W/ prefix; if \"*\" or the current ETag is listed, answer 304 with an empty body and without Content-Type (keep the ETag and Cache-Control)",
        "Register the \"etag\" module (Phase.Cache) and the \"maintenance\" module from the starter comment, then run the harness",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 11. Let clients ask "has this changed?" Two modules, then the harness replays "caching".
//  Platform.Add("etag", Phase.Cache, api => api.App.UseEtag(maxAgeSeconds: 30));
//  Platform.Add("maintenance", Phase.Endpoints, api => MapPost("/gyms/{id:int}/close-slot/{slotId:int}",
//      (int slotId, Catalog catalog) => { catalog.Slots.RemoveAll(s => s.Id == slotId); return Results.Ok(new { closed = slotId }); }).With(new Authorize("staff")));
await Platform.Build().Replay("caching");

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── UseEtag: after the pipeline runs, for a 200 GET without its own Cache-Control set ETag = "<first 16 lower-case hex digits of SHA-256(body)>" in quotes
// and Cache-Control = (private if the request had an Authorization header, else public) + ", max-age=<n>".
// If If-None-Match lists the ETag (weak W/ prefix ignored, or "*"), answer 304 with an empty body and no Content-Type.
static class CacheExtensions
{
    public static App UseEtag(this App app, int maxAgeSeconds) => throw new NotImplementedException();
}`,
      solutionAdd: cs`// 11. ETags and caching
Platform.Add("etag", Phase.Cache, api => api.App.UseEtag(maxAgeSeconds: 30));
Platform.Add("maintenance", Phase.Endpoints, api => api.App.MapPost("/gyms/{id:int}/close-slot/{slotId:int}", (int slotId, Catalog catalog) => { catalog.Slots.RemoveAll(s => s.Id == slotId); return Results.Ok(new { closed = slotId }); }).With(new Authorize("staff")));
await Platform.Build().Replay("caching");

${TYPES_DIVIDER}
static class CacheExtensions
{
    public static App UseEtag(this App app, int maxAgeSeconds) => app.Use("etag", async (ctx, next) =>
    {
        await next(ctx);
        var response = ctx.Response;
        if (ctx.Request.Method != "GET" || response.Status != 200 || response.Headers.ContainsKey("Cache-Control")) return;
        var etag = "\"" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(response.Body)))[..16].ToLowerInvariant() + "\"";
        response.Headers["ETag"] = etag;
        response.Headers["Cache-Control"] = (ctx.Request.Header("Authorization") != null ? "private" : "public") + ", max-age=" + maxAgeSeconds;
        var offered = ctx.Request.Header("If-None-Match")?.Split(',').Select(t => t.Trim().Replace("W/", "")).ToList();
        if (offered != null && (offered.Contains("*") || offered.Contains(etag)))
        {
            (response.Status, response.Body) = (304, "");
            response.Headers.Remove("Content-Type");
        }
    });
}`,
      explanation:
        "The middleware lets the endpoint run first, then looks at the finished response. For a 200 GET it hashes the body with SHA-256 and uses the first 16 hex digits, lower-cased and quoted, as the ETag, so identical bodies always get identical tags on any server. Cache-Control says public for anonymous requests and private when an Authorization header was sent, so shared caches never store personalised answers. If-None-Match is split on commas, weak prefixes are removed, and either a wildcard or a match turns the response into a 304 with no body and no Content-Type but with the validator still attached. After a slot is closed the body changes, the hash changes, and the old tag no longer matches, so the client gets a full 200 again.",
      hints: [
        { id: "h1", title: "The tag", content: "await next(ctx); var response = ctx.Response; if (ctx.Request.Method != \"GET\" || response.Status != 200 || response.Headers.ContainsKey(\"Cache-Control\")) return; var etag = \"\\\"\" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(response.Body)))[..16].ToLowerInvariant() + \"\\\"\"; response.Headers[\"ETag\"] = etag; response.Headers[\"Cache-Control\"] = (ctx.Request.Header(\"Authorization\") != null ? \"private\" : \"public\") + \", max-age=\" + maxAgeSeconds;  Convert.ToHexString gives upper-case, hence ToLowerInvariant()." },
        { id: "h2", title: "Matching", content: "var offered = ctx.Request.Header(\"If-None-Match\")?.Split(',').Select(t => t.Trim().Replace(\"W/\", \"\")).ToList(); if (offered != null && (offered.Contains(\"*\") || offered.Contains(etag))) { response.Status = 304; response.Body = \"\"; response.Headers.Remove(\"Content-Type\"); }" },
        { id: "h3", title: "Modules", content: "Platform.Add(\"etag\", Phase.Cache, api => api.App.UseEtag(maxAgeSeconds: 30)); The maintenance endpoint is a minimal POST that removes a slot from the catalog and returns Results.Ok(new { closed = slotId }); add .With(new Authorize(\"staff\")) so only staff can call it. Phase.Cache is after authorization and idempotency and before the endpoints, so the middleware wraps the handler." },
      ],
      tests: [
        {
          id: "t1",
          description: "a GET answer carries a content-derived ETag and a public max-age",
          assertionCode: js`
assert(Array.isArray(scene.caching) && scene.caching.length >= 9, "Register the modules and replay: await Platform.Build().Replay(\"caching\").");
assert(Array.isArray(scene.caching), "Replay the section with Platform.Build().Replay(\"caching\").");
const first = scene.caching[0];
assertEqual(first.status, 200, "first read");
assert(/^"[0-9a-f]{16}"$/.test(first.headers["ETag"] ?? ""), "ETag must be 16 lower-case hex digits in double quotes, got " + first.headers["ETag"]);
assertEqual(first.headers["Cache-Control"], "public, max-age=30", "anonymous reads are public");`,
        },
        {
          id: "t2",
          description: "revalidating with the current tag gives a bodyless 304 that keeps the validator",
          assertionCode: js`
assert(Array.isArray(scene.caching) && scene.caching.length >= 9, "Register the modules and replay: await Platform.Build().Replay(\"caching\").");
const [first, again] = scene.caching;
assertEqual(again.status, 304, "If-None-Match with the current ETag");
assertEqual(again.body, "", "a 304 has no body");
assertEqual(again.headers["ETag"], first.headers["ETag"], "the ETag is repeated on the 304");
assert(!("Content-Type" in again.headers), "a 304 has no Content-Type");`,
        },
        {
          id: "t3",
          description: "weak tags, lists of tags and the wildcard all match",
          assertionCode: js`
assert(Array.isArray(scene.caching) && scene.caching.length >= 9, "Register the modules and replay: await Platform.Build().Replay(\"caching\").");
assertEqual(scene.caching[2].status, 304, 'If-None-Match: "nope", W/"<current>"');
assertEqual(scene.caching[3].status, 304, "If-None-Match: *");`,
        },
        {
          id: "t4",
          description: "when the data changes the old tag stops matching and a new tag appears",
          assertionCode: js`
assert(Array.isArray(scene.caching) && scene.caching.length >= 9, "Register the modules and replay: await Platform.Build().Replay(\"caching\").");
assertEqual(scene.caching[4].status, 200, "staff closes slot 12");
const [first, , , , , changed] = scene.caching;
assertEqual(changed.status, 200, "the stale tag no longer matches, so the full answer is sent");
assert(changed.headers["ETag"] !== first.headers["ETag"], "the body changed, so the ETag must change");
assertEqual(JSON.parse(changed.body).length, 1, "only slot 11 is left");`,
        },
        {
          id: "t5",
          description: "the new tag revalidates successfully",
          assertionCode: js`
assert(Array.isArray(scene.caching) && scene.caching.length >= 9, "Register the modules and replay: await Platform.Build().Replay(\"caching\").");
const [, , , , , changed, again] = scene.caching;
assertEqual(again.status, 304, "If-None-Match with the new tag");
assertEqual(again.headers["ETag"], changed.headers["ETag"], "same tag");`,
        },
        {
          id: "t6",
          description: "personalised requests are never marked public",
          assertionCode: js`
assert(Array.isArray(scene.caching) && scene.caching.length >= 9, "Register the modules and replay: await Platform.Build().Replay(\"caching\").");
const mine = scene.caching[7];
assertEqual(mine.status, 200, "authenticated read");
assertEqual(mine.headers["Cache-Control"], "private, max-age=30", "a request with an Authorization header must be private");`,
        },
        {
          id: "t7",
          description: "only successful GETs get validators",
          assertionCode: js`
assert(Array.isArray(scene.caching) && scene.caching.length >= 9, "Register the modules and replay: await Platform.Build().Replay(\"caching\").");
assert(!("ETag" in scene.caching[4].headers), "the POST that closed the slot must not carry an ETag");
assert(/^"[0-9a-f]{16}"$/.test(scene.caching[8].headers["ETag"] ?? ""), "another resource gets its own tag");`,
        },
      ],
      unlocks: ["ca-cache"],
      checks: [
        {
          prompt: "Which response saves the **server** the most work?",
          question: {
            type: "choice",
            options: [
              "A fresh cached copy that the client reuses without contacting the server at all",
              "A 304 produced after the endpoint built and hashed the full body",
              "A 200 with gzip compression",
              "Any 304",
            ],
            answer: 0,
          },
          explanation: "Freshness avoids the request entirely. A 304 from our middleware still ran the whole endpoint; it only saves bandwidth. Cheaper validators (a row version) can skip building the body too.",
        },
        {
          prompt: "A response to a request with an `Authorization` header is sent with `Cache-Control: public`. What is the risk?",
          question: {
            type: "choice",
            options: [
              "A shared cache (CDN or proxy) may store it and serve one member's data to another",
              "The browser will not store it",
              "The ETag becomes invalid",
              "The response is compressed twice",
            ],
            answer: 0,
          },
          explanation: "`public` invites shared caches to keep the response. Personalised answers need `private` (only that user's browser) or `no-store`.",
        },
        {
          prompt: "`If-None-Match: W/\"abc\", \"def\"` arrives and the current tag is `\"abc\"`. What is the answer?",
          question: { type: "choice", options: ["304", "200", "412", "400"], answer: 0 },
          explanation: "The header is a comma-separated list, and the comparison for `If-None-Match` is weak, so `W/\"abc\"` matches `\"abc\"`. Any match means the client's copy is current.",
        },
      ],
    },
  ],
};
