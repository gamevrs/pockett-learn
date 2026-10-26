/**
 * Every GraphQL operation the scene sends. Presets appear in the Explorer once their lesson's
 * feature is unlocked; the client app and the labs build on the same text.
 */

export interface Preset {
  id: string;
  label: string;
  /** Feature id that unlocks it. */
  feature: string;
  query: string;
  variables?: Record<string, unknown>;
  /** One line telling a newcomer what to look for. */
  note: string;
}

const q = (s: string) => s.trim();

export const PRESETS: Preset[] = [
  {
    id: "hello",
    label: "Hello",
    feature: "gql-explorer",
    note: "Ask for exactly three fields and nothing else.",
    query: q(`
query Hello {
  shopName
  tagline
  openingHours
}`),
  },
  {
    id: "home",
    label: "Home",
    feature: "gql-catalogue",
    note: "Two top-level fields answered in one round trip.",
    query: q(`
query Home {
  categories { id name }
  newArrivals { id name priceCents inStock }
}`),
  },
  {
    id: "by-category",
    label: "Variables + fragment",
    feature: "gql-variables",
    note: "Aliases name each result; the fragment is reused; $category comes from the variables pane.",
    variables: { category: "audio" },
    query: q(`
query ProductsInCategory($category: String, $limit: Int = 4) {
  cheap: products(category: $category, limit: $limit) {
    ...ProductCard
  }
  desk: products(category: "desk", limit: 2) {
    ...ProductCard
  }
}

fragment ProductCard on Product {
  id
  name
  priceCents
}`),
  },
  {
    id: "search",
    label: "Search (union)",
    feature: "gql-search",
    note: "A union can return different types; __typename tells them apart.",
    variables: { term: "desk" },
    query: q(`
query Search($term: String!) {
  search(term: $term) {
    __typename
    ... on Product { id name priceCents }
    ... on Category { id name }
  }
}`),
  },
  {
    id: "accounts",
    label: "Accounts (interface)",
    feature: "gql-search",
    note: "Customer and Admin share the Account interface; fragments pick type-specific fields.",
    query: q(`
query Accounts {
  users {
    __typename
    id
    name
    ... on Customer { orderCount }
    ... on Admin { permissions }
  }
}`),
  },
  {
    id: "product-page",
    label: "Product page",
    feature: "gql-product",
    note: "One request walks product, category, reviews and each review's author.",
    variables: { id: "1" },
    query: q(`
query ProductPage($id: ID!) {
  product(id: $id) {
    id
    name
    description
    priceCents
    inStock
    averageRating
    category { name }
    reviews { rating body author { name } }
  }
}`),
  },
  {
    id: "whoami",
    label: "Who am I?",
    feature: "gql-identity",
    note: "Switch identity above and run again: the context decides what me returns.",
    query: q(`
query WhoAmI {
  me {
    __typename
    id
    name
    email
    role
    ... on Customer { orders { id status } }
  }
}`),
  },
  {
    id: "n1-categories",
    label: "Categories (N+1?)",
    feature: "gql-plan",
    note: "Sixteen products, each with a category. Watch the Plan panel count the SQL.",
    query: q(`
query CatalogueWithCategories {
  products(limit: 16) {
    name
    category { name }
  }
}`),
  },
  {
    id: "n1-reviews",
    label: "Reviews (N+1?)",
    feature: "gql-plan",
    note: "Reviews per product and an author per review: two levels of N+1.",
    query: q(`
query ReviewsWithAuthors {
  products(limit: 16) {
    name
    reviews { rating author { name } }
  }
}`),
  },
  {
    id: "add-review",
    label: "Add review",
    feature: "gql-mutations",
    note: "A mutation with one input object. Change rating to 9 to see a userError.",
    variables: { input: { productId: "2", rating: 5, body: "Loud for its size." } },
    query: q(`
mutation AddReview($input: ReviewInput!) {
  createReview(input: $input) {
    review { id rating body author { name } }
    userErrors { field message }
  }
}`),
  },
  {
    id: "place-order",
    label: "Place order",
    feature: "gql-mutations",
    note: "Changes data. Use Reset data in the Client app to start again.",
    variables: { input: { lines: [{ productId: "2", quantity: 1 }] } },
    query: q(`
mutation PlaceOrder($input: PlaceOrderInput!) {
  placeOrder(input: $input) {
    order { id status totalCents }
    userErrors { field message }
  }
}`),
  },
  {
    id: "flaky",
    label: "Flaky field",
    feature: "gql-errors",
    note: "shippingEstimate is nullable: one product fails, the rest of the data still arrives.",
    query: q(`
query Flaky {
  products(limit: 10) {
    id
    name
    shippingEstimate
  }
}`),
  },
  {
    id: "flaky-nonnull",
    label: "Non-null failure",
    feature: "gql-errors",
    note: "warehouse is String!, so its failure nulls the whole product.",
    query: q(`
query FlakyNonNull {
  product(id: 5) {
    name
    warehouse
  }
}`),
  },
  {
    id: "browse",
    label: "Cursor page",
    feature: "gql-browse",
    note: "Copy endCursor into $after to fetch the next page.",
    variables: { first: 6, sort: "PRICE_DESC" },
    query: q(`
query Browse($first: Int, $after: String, $filter: ProductFilter, $sort: ProductSort) {
  productsConnection(first: $first, after: $after, filter: $filter, sort: $sort) {
    totalCount
    pageInfo { hasNextPage endCursor }
    edges {
      cursor
      node { id name priceCents category { name } }
    }
  }
}`),
  },
  {
    id: "my-orders",
    label: "My orders",
    feature: "gql-orders",
    note: "Needs an identity. Anonymous callers get an UNAUTHENTICATED error.",
    query: q(`
query MyOrders {
  orders {
    id
    status
    createdAt
    totalCents
    items { quantity product { name } }
  }
}`),
  },
  {
    id: "admin",
    label: "Admin data",
    feature: "gql-orders",
    note: "Only an admin may read every user and order; others get FORBIDDEN.",
    query: q(`
query AdminUsers {
  users { __typename id name email role }
  allOrders { id status totalCents }
}`),
  },
];

/** Feature id -> where it lives; used for locked placeholders. */
export const FEATURE_INFO: Record<string, { title: string; lesson: number; need: string }> = {
  "gql-explorer": { title: "Explorer", lesson: 1, need: "execute(request) and a schema" },
  "gql-catalogue": { title: "Catalogue", lesson: 2, need: "categories and newArrivals fields" },
  "gql-variables": { title: "Variables & operations", lesson: 3, need: "field arguments and variables" },
  "gql-search": { title: "Search & accounts", lesson: 4, need: "a union and an interface" },
  "gql-product": { title: "Product page", lesson: 5, need: "nested resolvers (category, reviews, author)" },
  "gql-identity": { title: "Identity", lesson: 5, need: "a context with the current user" },
  "gql-plan": { title: "Query plan", lesson: 6, need: "extensions.stats from execute()" },
  "gql-batching": { title: "N+1 lab", lesson: 7, need: "a batching loader" },
  "gql-mutations": { title: "Mutations", lesson: 8, need: "createReview and placeOrder" },
  "gql-errors": { title: "Error inspector", lesson: 9, need: "structured errors and a server log" },
  "gql-browse": { title: "Browse", lesson: 10, need: "productsConnection with filter, sort and cursors" },
  "gql-orders": { title: "Orders & admin", lesson: 11, need: "authorization in resolvers" },
  "gql-limits": { title: "Abuse lab", lesson: 12, need: "depth and complexity limits" },
  "gql-docs": { title: "Docs browser", lesson: 13, need: "introspection and set_introspection()" },
  "gql-ship": { title: "Tests & REST", lesson: 14, need: "run_tests() and compare_rest()" },
};

// ───────────────────────── client app operations ─────────────────────────

export const HOME_QUERY = q(`
query Home {
  categories { id name }
  newArrivals { id name priceCents inStock }
}`);

export function productPageQuery(opts: { reviews: boolean; shipping: boolean; warehouse: boolean; rating: boolean }): string {
  const lines = ["id", "name", "description", "priceCents", "inStock", "category { name }"];
  if (opts.rating) lines.push("averageRating");
  if (opts.reviews) lines.push("reviews { id rating body createdAt author { name } }");
  if (opts.shipping) lines.push("shippingEstimate");
  if (opts.warehouse) lines.push("warehouse");
  return `query ProductPage($id: ID!) {\n  product(id: $id) {\n${lines.map((l) => `    ${l}`).join("\n")}\n  }\n}`;
}

export const SEARCH_QUERY = q(`
query Search($term: String!) {
  search(term: $term) {
    __typename
    ... on Product { id name priceCents }
    ... on Category { id name }
  }
}`);

export const ACCOUNTS_QUERY = PRESETS.find((p) => p.id === "accounts")!.query;

export const BROWSE_QUERY = PRESETS.find((p) => p.id === "browse")!.query;

export const MY_ORDERS_QUERY = PRESETS.find((p) => p.id === "my-orders")!.query;

export const ADMIN_QUERY = PRESETS.find((p) => p.id === "admin")!.query;

export const WHOAMI_QUERY = q(`
query Me {
  me { id name role }
}`);

export const ADD_REVIEW_MUTATION = PRESETS.find((p) => p.id === "add-review")!.query;

export const PLACE_ORDER_MUTATION = PRESETS.find((p) => p.id === "place-order")!.query;

// ───────────────────────── abuse lab ─────────────────────────

export interface AbuseCase {
  id: string;
  label: string;
  why: string;
  /** True when a well-defended server should refuse it. */
  hostile: boolean;
  build: () => string;
  /** Short shape description shown next to the button. */
  shape: string;
}

function aliasBomb(n: number): string {
  const fields = Array.from({ length: n }, (_, i) => `  a${i + 1}: products(limit: 50) { name category { name } }`).join("\n");
  return `query AliasBomb {\n${fields}\n}`;
}

export const ABUSE: AbuseCase[] = [
  {
    id: "deep",
    label: "Deep cycle",
    hostile: true,
    shape: "depth 8",
    why: "categories → products → category → products … the graph has cycles, so a client can ask for any depth.",
    build: () =>
      q(`
query DeepCycle {
  categories { products { category { products { category { products { category { products { name } } } } } } } }
}`),
  },
  {
    id: "alias",
    label: "Alias bomb",
    hostile: true,
    shape: "60 aliases × 50 rows",
    why: "Aliases let one request repeat an expensive field as many times as it likes.",
    build: () => aliasBomb(60),
  },
  {
    id: "huge",
    label: "Huge page",
    hostile: true,
    shape: "limit: 100000",
    why: "An unbounded list argument is a request for the whole table.",
    build: () => q(`query HugePage {\n  products(limit: 100000) { id }\n}`),
  },
  {
    id: "legit",
    label: "Legit heavy query",
    hostile: false,
    shape: "depth 4",
    why: "A real screen can be deep and wide. Good limits stop abuse without breaking this.",
    build: () =>
      q(`
query LegitHeavy {
  products(limit: 16) {
    name
    category { name }
    reviews { rating author { name } }
  }
}`),
  },
];

// ───────────────────────── introspection ─────────────────────────

/**
 * The Docs browser reads the schema the way real docs tools do: first only the type names (cheap), then the
 * details of a few types per request. A single giant introspection query is slow in a pure-Python server, and a
 * hook call has a short time limit.
 */
export const INTROSPECTION_HEAD = q(`
query IntrospectionHead {
  __schema {
    queryType { name }
    mutationType { name }
    types { name }
  }
}`);

export const INTROSPECTION_CHUNK = 7;

const INTROSPECTION_FRAGMENTS = `
fragment FullType on __Type {
  kind
  name
  description
  fields(includeDeprecated: true) {
    name
    description
    args { ...InputValue }
    type { ...TypeRef }
    isDeprecated
    deprecationReason
  }
  inputFields { ...InputValue }
  interfaces { ...TypeRef }
  enumValues(includeDeprecated: true) {
    name
    description
    isDeprecated
    deprecationReason
  }
  possibleTypes { ...TypeRef }
}

fragment InputValue on __InputValue {
  name
  description
  type { ...TypeRef }
  defaultValue
}

fragment TypeRef on __Type {
  kind
  name
  ofType {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
        }
      }
    }
  }
}`;

/** One request describing several types, e.g. t0: __type(name: "Product") { ...FullType } */
export function introspectionTypesQuery(names: string[]): string {
  const fields = names.map((n, i) => `  t${i}: __type(name: ${JSON.stringify(n)}) { ...FullType }`).join("\n");
  return `query IntrospectionTypes {\n${fields}\n}\n${INTROSPECTION_FRAGMENTS}`;
}

/** Operation names found in a document, in order. */
export function operationNames(query: string): string[] {
  const names: string[] = [];
  const stripped = query.replace(/#[^\n]*/g, "").replace(/"(?:[^"\\]|\\.)*"/g, '""');
  for (const m of stripped.matchAll(/(?:^|[\s}])(?:query|mutation|subscription)\s+([A-Za-z_]\w*)/g)) names.push(m[1]);
  return names;
}
