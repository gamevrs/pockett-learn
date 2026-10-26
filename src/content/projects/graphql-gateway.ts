import type { Project } from "@/engine/types";
import { chapter1 } from "./graphql-gateway/ch1.ts";
import { chapter2 } from "./graphql-gateway/ch2.ts";
import { chapter3 } from "./graphql-gateway/ch3.ts";
import { chapter4 } from "./graphql-gateway/ch4.ts";

/**
 * GraphQL Gateway: put a GraphQL API in front of the Pocket Store shop, using the real library
 * (graphql-core 3, the reference implementation that Strawberry, Ariadne and Graphene build on).
 *
 * The scene plays a GraphQL client: it builds {query, variables, operationName, headers} requests and
 * calls the learner's `execute(request)` hook, which must return {data, errors, extensions}.
 * Hooks the scene reads (all optional, all via program.call):
 *   execute(request)       the gateway                reset_db()            rebuild the database
 *   recent_errors()        server-side error log      set_introspection(b)  toggle introspection
 *   run_tests()            the Tests tab              compare_rest(id)      REST vs GraphQL numbers
 * From lesson 6 the response carries extensions.stats = {resolvers, sql, queries, ms} for the Plan panel.
 * Authoring notes live in graphql-gateway/shared.ts.
 */
export const graphqlGateway: Project = {
  slug: "graphql-gateway",
  language: "python",
  // graphql-core is pure Python; Pyodide installs it from PyPI with micropip (exact version pinned).
  packages: ["sqlite3", "micropip:graphql-core==3.2.13"],
  prerequisites: ["store-api"],
  title: "GraphQL Gateway",
  tagline: "Put a typed GraphQL API in front of the shop with graphql-core.",
  pitch:
    "Mobile and web clients want exactly the fields they ask for, in one round trip. Build a GraphQL gateway on the shop's SQLite database with the real library (graphql-core, the engine under Strawberry, Ariadne and Graphene): a schema in SDL, resolvers and context, mutations with structured errors, a DataLoader that kills the N+1 problem, cursor pagination, field-level authorization, query depth and cost limits, introspection and tests. A GraphiQL-style explorer, a live query plan and a client app all run on your code.",
  emoji: "🕸️",
  difficulty: "Professional",
  hours: 10,
  sceneId: "graphql-gateway",
  accent: { from: "#f472b6", to: "#be185d" },
  controls: ["Explorer: write and run any query", "Plan: resolver calls and SQL per request", "Client app: shop, orders and admin"],
  skills: [
    "GraphQL",
    "SDL",
    "resolvers",
    "context",
    "queries & variables",
    "mutations",
    "error handling",
    "N+1 & DataLoader",
    "pagination",
    "authorization",
    "query limits",
    "introspection",
    "testing",
  ],
  features: [
    { id: "gql-explorer", title: "Explorer", blurb: "Write a query, run it against your execute() and read the JSON, with errors highlighted.", emoji: "🔭" },
    { id: "gql-catalogue", title: "Home screen", blurb: "The client app's home screen loads categories and new arrivals from your schema.", emoji: "🏠" },
    { id: "gql-variables", title: "Variables & operations", blurb: "A variables pane, an operation picker and saved operations with fragments and aliases.", emoji: "🧩" },
    { id: "gql-search", title: "Search & accounts", blurb: "A search box backed by a union, and an accounts list backed by an interface.", emoji: "🔎" },
    { id: "gql-product", title: "Product page", blurb: "One query paints a whole product page: category, rating and reviews with authors.", emoji: "🛍️" },
    { id: "gql-identity", title: "Sign in as", blurb: "Pick who is calling; your context decides who the API thinks you are.", emoji: "🪪" },
    { id: "gql-plan", title: "Query plan", blurb: "See resolver calls and SQL statements for every request, grouped to expose repeats.", emoji: "📊" },
    { id: "gql-batching", title: "N+1 lab", blurb: "Run the catalogue query and watch SQL drop from 17 statements to 2.", emoji: "⚡" },
    { id: "gql-mutations", title: "Reviews & orders", blurb: "Write reviews and place orders from the client app through your mutations.", emoji: "✍️" },
    { id: "gql-errors", title: "Error inspector", blurb: "Error codes, masked internals, partial data and a server log you can read.", emoji: "🚨" },
    { id: "gql-browse", title: "Browse & paginate", blurb: "Filters, sorting and a cursor-based Load more button.", emoji: "📑" },
    { id: "gql-orders", title: "Orders & admin", blurb: "Order history for the signed-in user and an admin screen with field-level access.", emoji: "🧾" },
    { id: "gql-limits", title: "Abuse lab", blurb: "Fire hostile queries at your gateway and watch the limits reject them.", emoji: "🛡️" },
    { id: "gql-docs", title: "Docs browser", blurb: "Browse your schema through introspection, and flip production mode on and off.", emoji: "📚" },
    { id: "gql-ship", title: "Tests & REST", blurb: "Run your test suite and compare the same screen over REST and GraphQL.", emoji: "🚀" },
  ],
  chapters: [
    {
      id: "graph",
      title: "Describe the graph",
      blurb: "What GraphQL is, a typed schema, queries with variables, and abstract types.",
      lessons: chapter1,
    },
    {
      id: "resolvers",
      title: "Resolvers & performance",
      blurb: "The resolver chain, a request context, a query plan, and the N+1 fix.",
      lessons: chapter2,
    },
    {
      id: "writes",
      title: "Writes, errors & lists",
      blurb: "Mutations with input validation, errors you can design, and cursor pagination.",
      lessons: chapter3,
    },
    {
      id: "production",
      title: "Production",
      blurb: "Authorization, query limits, introspection, tests and the REST comparison.",
      lessons: chapter4,
    },
  ],
};
