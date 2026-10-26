import type { Project } from "@/engine/types";
import { chapter1 } from "./js-api/ch1.ts";
import { chapter2 } from "./js-api/ch2.ts";
import { chapter3 } from "./js-api/ch3.ts";
import { chapter4 } from "./js-api/ch4.ts";
import { chapter5 } from "./js-api/ch5.ts";

/**
 * Dockline: build the HTTP API of a city bike-share network in plain JavaScript, from a request
 * object and a middleware pipeline to auth, idempotency, rate limits, caching, retries, circuit
 * breakers, graceful shutdown and a tiny query endpoint.
 *
 * The scene (src/scenes/js-api) is the operations control room: it fires plain-object requests at the
 * learner's handle(raw) and draws what comes back. Hooks it reads (all optional, only when the
 * feature is unlocked; see the scene's header comment for shapes):
 *   handle(raw) -> { status, headers, body, trace }     listMiddleware()    listRoutes()
 *   recentLogs(n)                                       breakerState()
 *   lifecycleState(), shutdown(), restart()             runSuite()          parseGraph(source)
 * Authoring notes live in js-api/shared.ts. The JavaScript runtime is async with a fake clock and a
 * simulated network: see src/engine/runtimes/javascript/sandbox.ts. Signing uses the runtime's
 * synchronous hmacSha256(key, message) helper (crypto-shim.ts).
 */
export const jsApi: Project = {
  slug: "js-api",
  language: "javascript",
  prerequisites: ["event-arena"],
  title: "Dockline",
  tagline: "Build a bike-share API: routing, auth, caching, retries and more.",
  pitch:
    "Every bike unlock, station map and fleet dashboard in a bike-share city goes through one HTTP API, and you are building it from nothing in plain JavaScript. Write a request pipeline and router, a repository, validation and consistent error documents, pagination, signed tokens and access rules, idempotent rentals, rate limits, ETag caching, outbound calls with timeouts, backoff and a circuit breaker, graceful shutdown, table-driven tests and a tiny query endpoint. The control room fires live traffic at your code, and every panel lights up as the matching lesson passes.",
  emoji: "🚲",
  difficulty: "Professional",
  hours: 8,
  sceneId: "js-api",
  accent: { from: "#38bdf8", to: "#0369a1" },
  controls: ["Pause, resume and speed up the traffic", "Send a burst to watch rate limits bite", "Break the upstream and watch the breaker open", "Shut the server down and watch in-flight work drain", "Log in as a rider, a mechanic or an admin", "Edit a query and run it"],
  skills: [
    "HTTP semantics",
    "middleware",
    "routing",
    "structured logging",
    "repository pattern",
    "validation",
    "problem details",
    "pagination",
    "HMAC tokens",
    "authorization",
    "idempotency",
    "rate limiting",
    "HTTP caching",
    "retries & backoff",
    "circuit breaker",
    "graceful shutdown",
    "API testing",
    "GraphQL basics",
  ],
  features: [
    { id: "api-wire", title: "Request log", blurb: "Every request in, every response out, with its status and timing.", emoji: "📜" },
    { id: "api-pipeline", title: "Middleware lanes", blurb: "One lane per middleware; watch each request travel the chain.", emoji: "🛤️" },
    { id: "api-routes", title: "Route map", blurb: "Every route you register, with hit counters and misses flagged.", emoji: "🗺️" },
    { id: "api-logs", title: "Structured log", blurb: "One JSON line per request, plus p50, p95 and p99 latency.", emoji: "🪵" },
    { id: "api-stations", title: "Station board", blurb: "The city map with live bike counts from your repository.", emoji: "🚏" },
    { id: "api-validation", title: "Bad-request inspector", blurb: "Invalid input comes back as field-level errors.", emoji: "🔎" },
    { id: "api-problems", title: "Error dashboard", blurb: "Every failure as a consistent problem document, tallied by class.", emoji: "🚨" },
    { id: "api-paging", title: "List explorer", blurb: "Walk stations by offset and bikes by cursor, with filters and sorting.", emoji: "📚" },
    { id: "api-auth", title: "Rider tokens", blurb: "Log in, read the signed token, try to forge it.", emoji: "🔑" },
    { id: "api-authz", title: "Access guard", blurb: "A matrix of who may do what, tested for real.", emoji: "🛡️" },
    { id: "api-idempotency", title: "Idempotency ledger", blurb: "Double taps and retries never rent a bike twice.", emoji: "🔁" },
    { id: "api-ratelimit", title: "Rate-limit buckets", blurb: "A token bucket per client, with 429 and Retry-After.", emoji: "🪣" },
    { id: "api-cache", title: "Cache & 304", blurb: "ETags turn repeat reads into tiny 304 answers.", emoji: "🗃️" },
    { id: "api-retry", title: "Retries & backoff", blurb: "Outbound calls with timeouts, jittered backoff and a retry budget.", emoji: "🔄" },
    { id: "api-breaker", title: "Circuit breaker", blurb: "A broken upstream trips the breaker and the API serves a fallback.", emoji: "⚡" },
    { id: "api-shutdown", title: "Graceful shutdown", blurb: "Stop accepting, drain in-flight requests, close resources in order.", emoji: "🛑" },
    { id: "api-tests", title: "Test lab", blurb: "A table-driven suite of API checks run as a grid.", emoji: "🧪" },
    { id: "api-graph-query", title: "Query parser", blurb: "A graph query text turned into a tree of fields.", emoji: "🌳" },
    { id: "api-graph", title: "Graph console", blurb: "Ask for exactly the fields you want from one endpoint.", emoji: "🕸️" },
  ],
  chapters: [
    {
      id: "pipeline",
      title: "Requests and routing",
      blurb: "Request and response objects, a middleware pipeline, a router and structured logs: the front door.",
      lessons: chapter1,
    },
    {
      id: "resources",
      title: "Resources and rules",
      blurb: "A repository and CRUD, validation, problem-details errors, and lists you can filter, sort and page.",
      lessons: chapter2,
    },
    {
      id: "guard",
      title: "Guarding the API",
      blurb: "Signed tokens, roles and ownership, idempotent writes and a rate limiter.",
      lessons: chapter3,
    },
    {
      id: "resilience",
      title: "Speed and resilience",
      blurb: "HTTP caching, calling upstreams safely, a circuit breaker and graceful shutdown.",
      lessons: chapter4,
    },
    {
      id: "proof",
      title: "Proof and the graph endpoint",
      blurb: "Table-driven API tests, then a small query language parsed and executed over the same data.",
      lessons: chapter5,
    },
  ],
};
