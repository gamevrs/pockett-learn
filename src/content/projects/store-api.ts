import type { Project } from "@/engine/types";
import { chapter1 } from "./store-api/ch1.ts";
import { chapter2 } from "./store-api/ch2.ts";
import { chapter3 } from "./store-api/ch3.ts";
import { chapter4 } from "./store-api/ch4.ts";

/**
 * Pocket Store API: build the backend of an online shop in Python, from the first route to an
 * authenticated, validated, paginated CRUD service on a real SQLite database.
 *
 * Real servers can't run in a browser tab, so the scene plays the HTTP client: it builds request
 * dicts and calls the learner's `handle(request)` hook, which must return {status, headers, body}.
 * The scene reads (all optional, all via hooks):
 *   handle(request)  the whole API            reset_db()      rebuild the database
 *   list_products()  the Database tab         recent_errors() server-side error log
 *   run_tests()      the Tests tab
 * Authoring notes live in store-api/shared.ts.
 */
export const storeApi: Project = {
  slug: "store-api",
  language: "python",
  packages: ["sqlite3", "hashlib"],
  prerequisites: ["smart-home", "cargo-control"],
  title: "Pocket Store API",
  tagline: "Build a REST API with CRUD, SQLite, auth and tests.",
  pitch:
    "Write the backend of an online shop from nothing: your own tiny Flask-style router, a real SQLite database, safe queries, validation, central error handling, pagination, passwords and tokens, roles, transactional checkout and a test suite. A live storefront, an API console and a request log run on your code, so you see every status code you return.",
  emoji: "🛒",
  difficulty: "Professional",
  hours: 8,
  sceneId: "store-api",
  accent: { from: "#a78bfa", to: "#7c3aed" },
  controls: ["Console: send any request", "Click a log row to replay it", "Shop, cart and admin run on your API"],
  skills: [
    "HTTP & REST",
    "routing & middleware",
    "SQLite",
    "SQL injection",
    "CRUD",
    "validation",
    "error handling",
    "pagination",
    "authentication",
    "roles",
    "transactions",
    "testing",
    "OpenAPI",
  ],
  features: [
    { id: "store-console", title: "API console", blurb: "Send real requests to your handle() and read the status, headers and body.", emoji: "⌨️" },
    { id: "store-routes", title: "Router", blurb: "Your router answers 404 and 405 and unlocks a request collection to try.", emoji: "🧭" },
    { id: "store-errors", title: "Error shield", blurb: "Crashes become safe 500s and the server log shows what really happened.", emoji: "🛡️" },
    { id: "store-db", title: "Database", blurb: "The Database tab shows your SQLite products table, live.", emoji: "🗄️" },
    { id: "store-catalogue", title: "Storefront", blurb: "The shop grid and product pages load from GET /products.", emoji: "🛍️" },
    { id: "store-search", title: "Search & filters", blurb: "Search box, category chips and a price filter drive your query string.", emoji: "🔎" },
    { id: "store-paging", title: "Sorting & pages", blurb: "Sort menu and pager use your page, per_page and sort parameters.", emoji: "📑" },
    { id: "store-create", title: "Add products", blurb: "The admin form creates products through POST.", emoji: "➕" },
    { id: "store-modify", title: "Edit & delete", blurb: "Admin edit, price tweaks and delete use PUT, PATCH and DELETE.", emoji: "✏️" },
    { id: "store-auth", title: "Accounts", blurb: "Register and sign in; the session shows who the API thinks you are.", emoji: "🔑" },
    { id: "store-roles", title: "Roles", blurb: "Anonymous gets 401, customers get 403, only admins manage products.", emoji: "🔐" },
    { id: "store-orders", title: "Cart & orders", blurb: "Checkout runs one transaction; your orders appear in the Orders screen.", emoji: "🧾" },
    { id: "store-tests", title: "Test suite", blurb: "Run your own tests against the live API from the Tests tab.", emoji: "✅" },
    { id: "store-ship", title: "Docs & retries", blurb: "Idempotent checkout, a generated OpenAPI Docs tab and API-Version headers.", emoji: "🚀" },
  ],
  chapters: [
    {
      id: "wire",
      title: "On the wire",
      blurb: "HTTP, your own router and middleware, and one place for errors.",
      lessons: chapter1,
    },
    {
      id: "catalogue",
      title: "The catalogue",
      blurb: "A real SQLite database, read endpoints, injection-proof search, paging and sorting.",
      lessons: chapter2,
    },
    {
      id: "writes",
      title: "Writes & security",
      blurb: "Create, update and delete with validation, then accounts, tokens and roles.",
      lessons: chapter3,
    },
    {
      id: "production",
      title: "Orders & production",
      blurb: "Transactions, a test client and safety net, idempotency, docs and versioning.",
      lessons: chapter4,
    },
  ],
};
