import type { Lesson } from "@/engine/types";
import { py, T, DB_CODE } from "./shared.ts";

/** Chapter 1: Describe the graph. What GraphQL is, a schema, queries, and abstract types. */
export const chapter1: Lesson[] = [
  // ───────────────────────────────────────── 1. one endpoint, one question
  {
    id: "graphql-gateway-1-hello",
    title: "One endpoint, one question",
    minutes: 25,
    xp: 100,
    concepts: ["GraphQL", "over-fetching", "schema", "graphql-core", "parse / validate / execute"],
    learn: `### The problem

The shop's mobile app has a product screen. It shows a name, a price, the category's name and the latest reviews with their authors' names. With the REST API from *Pocket Store API* that is a small tour:

- \`GET /products/7\` returns **every** column (SKU, stock, internal ids) although the screen shows three.
- \`GET /categories/2\` for the category name.
- \`GET /products/7/reviews\` for the reviews, then one \`GET /users/4\` for **each** author.

Two classic complaints come out of this. **Under-fetching**: one request is not enough, so the phone makes four to eight round trips over a slow network. **Over-fetching**: each answer carries fields the screen never shows. You can patch it with a custom endpoint per screen (\`/product-page/7\`), but then every new screen waits for the backend team, the web app and the mobile app want different shapes, and the endpoint list grows forever.

### The idea

GraphQL turns the deal around: the **client describes the shape it wants** and the server returns exactly that shape.

~~~graphql
{
  product(id: 7) {
    name
    priceCents
    category { name }
    reviews { rating author { name } }
  }
}
~~~

~~~json
{
  "data": {
    "product": {
      "name": "Studio Headphones",
      "priceCents": 12900,
      "category": { "name": "Audio" },
      "reviews": [ { "rating": 5, "author": { "name": "Sam Carter" } } ]
    }
  }
}
~~~

The answer mirrors the question, one request, nothing extra. Four ideas make that work:

- **One endpoint.** Every request is the same call (usually \`POST /graphql\`) with a JSON body: \`{"query": "...", "variables": {...}, "operationName": "..."}\`. We model it as one function, \`execute(request)\`.
- **A typed schema.** The server publishes a contract: which types exist and which fields each has. A query that asks for something outside it is rejected *before* anything runs.
- **Queries mirror responses.** Fields you ask for are the fields you get, in the shape you asked.
- **Resolvers.** Behind every field sits a small function that knows how to produce that field's value. You write those starting in lesson 2.

### The library: graphql-core

**graphql-core** is the Python port of \`graphql-js\`, the reference implementation. Strawberry, Ariadne and Graphene are friendly layers on top of it, so everything you learn here transfers. In this course you use it directly. Two functions matter today:

~~~python
from graphql import build_schema, graphql_sync

schema = build_schema("type Query { hello: String! }")
result = graphql_sync(schema, "{ hello }", root_value={"hello": "world"})
result.data      # {'hello': 'world'}
result.formatted # {'data': {'hello': 'world'}}   <- JSON-ready, with 'errors' when there are some
~~~

\`build_schema\` reads **SDL** (the Schema Definition Language) and returns a schema object. \`graphql_sync\` runs a query against it. Because it is *sync*, it fits our hooks: no event loop needed. (Async servers use \`graphql\` and \`await\`. The ideas are identical.)

### What happens inside a request

\`graphql_sync\` bundles three phases that you will separate later:

1. **Parse**: the text becomes a syntax tree. A missing brace fails here.
2. **Validate**: the tree is checked against the schema: does every field exist, are arguments the right type? A typo such as \`shopNam\` fails here, *before any code runs*.
3. **Execute**: resolvers run and the result is assembled.

### SDL in thirty seconds

~~~graphql
type Query {
  shopName: String!        # String, never null
  tagline: String          # String, may be null
  openingHours: [String!]! # a list that is never null, holding strings that are never null
}
~~~

\`Query\` is the **root type**: its fields are the entry points a client can ask for. \`!\` means "never null". Lesson 2 goes through types properly.

### The response shape

A response is a dict with up to three keys: \`data\` (the result, shaped like the query), \`errors\` (a list of problems, each with a message, and often a \`path\` and \`locations\`) and \`extensions\` (anything else you want to add). HTTP-wise GraphQL usually answers **200** even when \`errors\` is present, because a request can partly succeed. Clients must look inside the body, not at the status.

### Honest trade-offs

GraphQL is not a free upgrade. In return for flexible clients you take on:

- **Caching is harder.** REST gets URL-based HTTP caching almost for free; a POST to one URL is not cacheable by default.
- **Cost is unbounded.** A client can write a huge query. You will defend against that in lesson 12.
- **The N+1 problem** (lesson 7) appears as soon as you resolve nested fields naively.
- **More moving parts** than a plain route: a schema, resolvers, tooling. Simple CRUD does not need it. The last lesson puts REST and GraphQL side by side.

### Common mistakes

- Expecting an error status code. A failed GraphQL request still returns a body with \`errors\`, so check the body.
- Returning \`None\` for a field declared \`String!\`. That breaks the promise the schema made.
- Letting \`execute\` raise. A gateway should *always* answer with a JSON-able dict, even for garbage input.`,
    mission: `The mobile team is tired of chaining five REST calls to paint one screen. You are building the **gateway** in front of the shop, speaking GraphQL: one endpoint that answers exactly the question a client asks.

Start small: a schema with three fields, a function \`execute(request)\` that runs a query and returns \`{"data": ..., "errors": ...}\`. As soon as you Run, the **Explorer** lights up and you can type real queries against your own code.`,
    tasks: [
      "TYPE_DEFS: SDL for a Query type with shopName (String!), tagline (String) and openingHours ([String!]!)",
      "schema = build_schema(TYPE_DEFS), plus a ROOT dict holding the values of those three fields",
      "execute(request): run request[\"query\"] with graphql_sync (pass the variables and operationName along) and return result.formatted",
      "A missing or blank query must produce an errors response, never an exception",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 1: one endpoint, one question.
# The shop's mobile app will send GraphQL requests to execute(). Build the smallest possible gateway.
from graphql import build_schema, graphql_sync

# 1) The contract, in GraphQL's schema language (SDL). Query is the root type.
TYPE_DEFS = """
type Query {
  # shopName: String!  tagline: String  openingHours: [String!]!
}
"""

# 2) Turn the text into a schema object, and say what the three fields are.
schema = None
ROOT = {}


def execute(request):
    """The whole gateway: a request dict in, a {"data": ..., "errors": ...} dict out.

    request looks like {"query": "{ shopName }", "variables": None, "operationName": None, "headers": {}}.
    Never raise: bad input becomes {"data": None, "errors": [{"message": ...}]}.
    """
    ...
`,
    solutionAdd: py`from graphql import build_schema, graphql_sync

TYPE_DEFS = """
type Query {
  shopName: String!
  tagline: String
  openingHours: [String!]!
}
"""

schema = build_schema(TYPE_DEFS)

ROOT = {
    "shopName": "Pocket Store",
    "tagline": "Small things for big desks",
    "openingHours": ["Mon-Fri 9-17", "Sat 10-14"],
}


def execute(request):
    """The whole gateway: a request dict in, a {"data": ..., "errors": ...} dict out."""
    query = request.get("query") if isinstance(request, dict) else None
    if not isinstance(query, str) or not query.strip():
        return {"data": None, "errors": [{"message": "The request must include a non-empty query string."}]}
    result = graphql_sync(
        schema,
        query,
        root_value=ROOT,
        variable_values=request.get("variables"),
        operation_name=request.get("operationName"),
    )
    return result.formatted`,
    explanation:
      "build_schema turns SDL into a schema object and graphql_sync runs the three phases (parse, validate, execute) against it. The default resolver reads each root field from ROOT by name, which is enough for a hello-world. result.formatted is the JSON-ready response: data shaped like the query, plus an errors list when something went wrong. Because execute() guards its input and hands every failure back as data, clients (and the Explorer) always get something they can render.",
    hints: [
      { id: "h1", title: "Writing the SDL", content: "Replace the commented line inside type Query with real fields, one per line: shopName: String!, then tagline: String, then openingHours: [String!]!. Delete the leading # signs." },
      { id: "h2", title: "Schema and root value", content: 'schema = build_schema(TYPE_DEFS). ROOT is a dict with the same three keys: {"shopName": "Pocket Store", "tagline": "Small things for big desks", "openingHours": ["Mon-Fri 9-17", "Sat 10-14"]}. The default resolver looks fields up by name in this dict.' },
      { id: "h3", title: "The execute function", content: 'Check query = request.get("query") first (a str that is not blank), otherwise return {"data": None, "errors": [{"message": ...}]}. Then: result = graphql_sync(schema, query, root_value=ROOT, variable_values=request.get("variables"), operation_name=request.get("operationName")); return result.formatted' },
    ],
    tests: [
      {
        id: "t1",
        description: "schema is a built GraphQL schema with a Query root type",
        assertionCode: T(py`from graphql import GraphQLSchema
assert isinstance(schema, GraphQLSchema), "schema should be the result of build_schema(TYPE_DEFS), got " + type(schema).__name__
assert schema.query_type is not None and schema.query_type.name == "Query", "The schema needs a root type named Query"
fields = schema.query_type.fields
for name in ("shopName", "tagline", "openingHours"):
    assert name in fields, "type Query is missing the field " + name
assert str(fields["shopName"].type) == "String!", "shopName should be String! (never null), got " + str(fields["shopName"].type)
assert str(fields["tagline"].type) == "String", "tagline should be a nullable String"
assert str(fields["openingHours"].type) == "[String!]!", "openingHours should be [String!]!, got " + str(fields["openingHours"].type)`),
      },
      {
        id: "t2",
        description: "A query returns data shaped exactly like the question",
        assertionCode: T(py`r = _gql("{ shopName }")
assert r == {"data": {"shopName": "Pocket Store"}}, "Expected exactly {'data': {'shopName': 'Pocket Store'}}, got " + repr(r)
r = _gql("{ tagline openingHours }")
assert r == {"data": {"tagline": "Small things for big desks", "openingHours": ["Mon-Fri 9-17", "Sat 10-14"]}}, "Asking for two fields should return exactly those two fields, got " + repr(r)`),
      },
      {
        id: "t3",
        description: "Syntax errors and unknown fields come back as errors, not exceptions",
        assertionCode: T(py`r = _gql("{ shopNam }")
assert r.get("errors"), "Asking for a field that is not in the schema should produce an errors list"
assert "shopNam" in r["errors"][0]["message"], "The error message should name the unknown field, got: " + r["errors"][0]["message"]
assert not r.get("data"), "A query that fails validation returns no data"
r = _gql("{ shopName")
assert r.get("errors"), "A syntax error (missing brace) should produce an errors list"
assert r["errors"][0].get("locations"), "Syntax errors should say where they are (locations)"`),
      },
      {
        id: "t4",
        description: "A missing, blank or non-string query is an errors response",
        assertionCode: T(py`for bad in ({}, {"query": ""}, {"query": "   "}, {"query": None}, {"query": 42}):
    r = execute(bad)
    assert isinstance(r, dict) and r.get("errors"), "execute(" + repr(bad) + ") should return an errors response instead of crashing, got " + repr(r)
    assert isinstance(r["errors"][0].get("message"), str), "Each error needs a message string"`),
      },
      {
        id: "t5",
        description: "variables and operationName are passed to GraphQL",
        assertionCode: T(py`two = "query A { shopName } query B { tagline }"
r = _gql(two, operation_name="B")
assert r == {"data": {"tagline": "Small things for big desks"}}, "operationName B should run only operation B, got " + repr(r)
r = _gql(two)
assert r.get("errors") and "operation" in r["errors"][0]["message"].lower(), "With two operations and no operationName GraphQL asks which one to run; execute should return that error"
r = _gql("query Q($x: Boolean!) { shopName @include(if: $x) tagline }", variables={"x": False})
assert r == {"data": {"tagline": "Small things for big desks"}}, "Variables must reach graphql_sync (variable_values=...), got " + repr(r)`),
      },
      {
        id: "t6",
        description: "Fields hold what the schema promises",
        assertionCode: T(py`r = _gql("{ openingHours }")
hours = _data(r)["openingHours"]
assert isinstance(hours, list) and len(hours) == 2 and all(isinstance(h, str) for h in hours), "openingHours should be a list of two strings"
d = _data(_gql("{ shopName tagline }"))
assert list(d.keys()) == ["shopName", "tagline"], "Keys come back in the order the query asked for them, got " + repr(list(d.keys()))`),
      },
    ],
    unlocks: ["gql-explorer"],
    checks: [
      {
        prompt: "The product screen needs only `name` and `priceCents`. A client sends `{ product(id: 7) { name priceCents } }`. What does the response `data` contain?",
        question: {
          type: "choice",
          options: [
            "Only `name` and `priceCents` for product 7, nested under `product`",
            "Every field of product 7, because the server decides the shape",
            "Only the keys, with no values, until the client asks again",
            "An error, because GraphQL cannot skip fields",
          ],
          answer: 0,
        },
        explanation:
          "The query is a description of the answer you want, and the server returns exactly that shape. Skipping fields is the whole point: it removes over-fetching without a new endpoint.",
      },
      {
        prompt: "A GraphQL query asks for a field that does not exist, and the server returns `200` with an `errors` list. Is that a bug?",
        question: {
          type: "choice",
          options: [
            "No. GraphQL reports problems inside the body, so clients must read `errors`, not just the status",
            "Yes. It should return 404 like REST does for a missing resource",
            "Yes. Errors may only appear together with a 500",
            "No, but only because validation errors are silently ignored",
          ],
          answer: 0,
        },
        explanation:
          "Because one request can contain many fields, some of which succeed, the transport status says only \"the server answered\". Success or failure of each field is described in the body. (Your execute() models the body; a real HTTP wrapper would add the status.)",
      },
      {
        prompt: "Which of these is a genuine cost of choosing GraphQL over plain REST routes?",
        question: {
          type: "choice",
          options: [
            "A single POST endpoint is not cacheable by URL, so caching needs more thought",
            "Clients can no longer choose which fields they receive",
            "There is no way to describe types, so tooling cannot help",
            "It only works with a single database table",
          ],
          answer: 0,
        },
        explanation:
          "Flexible queries mean one URL carries many different questions, so HTTP caches cannot key on the URL alone. (The other options describe the opposite of what GraphQL offers.)",
      },
    ],
  },

  // ───────────────────────────────────────── 2. types
  {
    id: "graphql-gateway-2-types",
    title: "Model the shop: types and resolvers",
    minutes: 40,
    xp: 160,
    concepts: ["object types", "scalars", "non-null", "lists", "resolvers", "extend type", "SQLite"],
    learn: `### Everything is a type

A GraphQL schema is a set of **types**. The ones you write most are *object types*: a name and a list of fields, each with its own type.

~~~graphql
type Category {
  id: ID!
  slug: String!
  name: String!
}

type Product {
  id: ID!
  name: String!
  priceCents: Int!
  inStock: Boolean!
}
~~~

### The five built-in scalars

A **scalar** is a leaf value. GraphQL ships with \`Int\` (32-bit), \`Float\`, \`String\`, \`Boolean\` and \`ID\`. \`ID\` is serialized as a **string** even if your database key is an integer, and clients should treat it as opaque: that is why \`id: 3\` in the database arrives as \`"3"\` in the response. You can define custom scalars (\`DateTime\`, \`JSON\`) when you need them. **Never use Float for money**: store whole cents, which is why we have \`priceCents: Int!\`.

### Non-null and lists

By default every field may be \`null\`. Add \`!\` to promise it never is. This is the most important design decision in a schema, because breaking the promise causes an error (lesson 9 shows how it spreads). Lists add a second place to put the \`!\`:

- \`[Product]\` the list may be null, items may be null
- \`[Product!]\` the list may be null, items never are
- \`[Product]!\` the list is always there, items may be null (rarely what you want)
- \`[Product!]!\` the list is always there and every item is real. **This is the usual choice.** An empty list is fine: it is just \`[]\`.

A good habit: **nullable by default, \`!\` when you are sure** and when a missing value would be a bug rather than a normal situation.

### Query: the entry points

\`Query\` is a type like any other, and its fields are the entry points:

~~~graphql
type Query {
  categories: [Category!]!
  product(id: ID!): Product       # nullable: an unknown id gives null, not an error
}
~~~

\`product(id: ID!)\` has an **argument** (lesson 3 covers arguments in depth). It returns a nullable \`Product\` because "no such product" is a normal outcome.

### Growing a schema with \`extend\`

Our schema grows lesson by lesson, so we will add to \`TYPE_DEFS\` instead of editing earlier text. SDL has a keyword for that:

~~~graphql
extend type Query {
  newArrivals: [Product!]!
}
~~~

\`extend type\` adds fields to a type declared elsewhere. Big teams use it to let each module own its slice of the \`Query\` type.

### Resolvers: the function behind a field

A schema says what exists. A **resolver** says how to get a value. It is called as \`resolver(parent, info, **arguments)\`:

~~~python
def resolve_product(parent, info, id):
    return fetch_one(DB, "SELECT * FROM products WHERE id = ?", (id,))
~~~

- \`parent\` is the value the *enclosing* field returned. For fields on \`Query\` it is the \`root_value\`.
- \`info\` carries the context of this call (field name, path, the request context…). Lesson 5 explores it.
- the keyword arguments are the field's arguments.

If a field has **no** resolver, graphql-core's *default resolver* reads \`parent[field_name]\` from a dict (or the attribute of an object). That is why the lesson 1 fields worked from \`ROOT\`.

### camelCase on the wire, snake_case in Python

GraphQL convention is camelCase (\`priceCents\`), Python and SQL use snake_case (\`price_cents\`). The default resolver will not translate, so we install our own default that tries the exact key first and then the snake_case version. One small function at the boundary means no resolver ever has to rename keys by hand.

### Binding resolvers: a registry

Each lesson will add resolvers and extend the SDL, then rebuild the schema. So we keep resolvers in a **registry** keyed by type and field, and a function that attaches them to a freshly built schema:

~~~python
RESOLVERS = {}                      # {"Query": {"product": fn}, "Product": {"inStock": fn}}

def resolver(type_name, field_name):    # a decorator
    def register(fn):
        RESOLVERS.setdefault(type_name, {})[field_name] = fn
        return fn
    return register

@resolver("Query", "product")
def resolve_product(parent, info, id): ...
~~~

\`bind_resolvers\` loops over the schema's object types and sets \`field.resolve\` from the registry (or the default). This is, in miniature, what Ariadne's \`make_executable_schema\` does. Registering the same field twice simply replaces the earlier function, which later lessons will use to upgrade resolvers.

### Fields do not have to be columns

\`inStock\` is not in the database; it is \`stock > 0\`. A resolver can compute anything, which is how you decouple the public schema from the storage layout.

### Common mistakes

- Returning a \`sqlite3.Row\` from a resolver: the default resolver cannot read it. Convert rows to dicts.
- Marking a field \`!\` and then returning \`None\` for it in some rows.
- Building SQL with an f-string around an argument. Arguments are user input: always use \`?\` placeholders.
- Using \`Float\` for money.`,
    mission: `A gateway that only knows a shop name is not much use. The mobile app needs categories and products.

Below is the shop's **SQLite database** (provided; read it, don't change it): categories, products, users, reviews and orders, with helpers to fetch rows as dicts. Model \`Category\` and \`Product\`, wire resolvers that read the database, and rebuild the schema. The Explorer then returns real products and the client app's **Home** screen comes alive.`,
    tasks: [
      "Extend TYPE_DEFS with type Category and type Product (id, sku, name, description, priceCents, stock, inStock), and extend type Query with categories, product(id: ID!) and newArrivals",
      "Registry: RESOLVERS, a resolver(type_name, field_name) decorator and bind_resolvers(schema, resolvers), plus make_schema() that builds, binds and returns the schema",
      "default_resolver(source, info, **args): exact key first, then the snake_case key, calling functions; used for every field that has no registered resolver",
      "Resolvers: Query.categories, Query.product, Query.newArrivals (the 4 newest by id), Product.inStock; then schema = make_schema()",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 2: model the shop.
#
# PROVIDED (read it, do not change it): the shop's SQLite database, the same tables as the
# Pocket Store API project plus users, reviews and orders. Helpers: fetch_all / fetch_one return
# plain dicts. DB is the live connection; reset_db() rebuilds it from the seed.
${DB_CODE}


# ── your code starts here ──
import re
from graphql import GraphQLObjectType

# 1) Describe Category and Product, and add the entry points to Query (extend type Query).
TYPE_DEFS += """
"""

# 2) A registry of resolvers, a decorator to fill it, and the function that attaches them.
RESOLVERS = {}  # {"Query": {"product": function}, "Product": {...}}


def resolver(type_name, field_name):
    """Decorator: register a function as the resolver of TypeName.fieldName."""
    ...


def snake(name):
    """'priceCents' -> 'price_cents'"""
    ...


def default_resolver(source, info, **args):
    """For fields without a registered resolver: read source[field] (exact key, then snake_case)."""
    ...


def bind_resolvers(schema, resolvers):
    """Set field.resolve on every field of every object type (not the __introspection types)."""
    ...


def make_schema():
    """Build a fresh schema from TYPE_DEFS and attach the resolvers."""
    ...


# 3) The resolvers. Use placeholders (?) for every value that comes from a client.
def product_rows(info, tail="", params=()):
    """Products as dicts: SELECT products.* FROM products <tail>. tail is SQL written in code, never user input."""
    ...


# @resolver("Query", "categories") ... @resolver("Query", "product") ... newArrivals ... Product.inStock

schema = make_schema()
`,
    solutionAdd: py`${DB_CODE}


import re
from graphql import GraphQLObjectType

TYPE_DEFS += """
type Category {
  id: ID!
  slug: String!
  name: String!
}

type Product {
  id: ID!
  sku: String!
  name: String!
  description: String!
  priceCents: Int!
  stock: Int!
  inStock: Boolean!
}

extend type Query {
  categories: [Category!]!
  product(id: ID!): Product
  newArrivals: [Product!]!
}
"""

RESOLVERS = {}  # {"Query": {"product": function}, "Product": {...}}


def resolver(type_name, field_name):
    """Decorator: register a function as the resolver of TypeName.fieldName."""

    def register(fn):
        RESOLVERS.setdefault(type_name, {})[field_name] = fn
        return fn

    return register


def snake(name):
    """'priceCents' -> 'price_cents'"""
    return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()


def default_resolver(source, info, **args):
    """For fields without a registered resolver: read source[field] (exact key, then snake_case)."""
    for key in (info.field_name, snake(info.field_name)):
        if isinstance(source, dict):
            if key in source:
                value = source[key]
                break
        elif hasattr(source, key):
            value = getattr(source, key)
            break
    else:
        return None
    return value(info, **args) if callable(value) else value


def bind_resolvers(schema, resolvers):
    """Set field.resolve on every field of every object type (not the __introspection types)."""
    for type_name, graphql_type in schema.type_map.items():
        if type_name.startswith("__") or not isinstance(graphql_type, GraphQLObjectType):
            continue
        for field_name, field in graphql_type.fields.items():
            field.resolve = resolvers.get(type_name, {}).get(field_name, default_resolver)


def make_schema():
    """Build a fresh schema from TYPE_DEFS and attach the resolvers."""
    new_schema = build_schema(TYPE_DEFS)
    bind_resolvers(new_schema, RESOLVERS)
    return new_schema


def product_rows(info, tail="", params=()):
    """Products as dicts: SELECT products.* FROM products <tail>. tail is SQL written in code, never user input."""
    return fetch_all(DB, "SELECT products.* FROM products " + tail, params)


@resolver("Query", "categories")
def resolve_categories(root, info):
    return fetch_all(DB, "SELECT * FROM categories ORDER BY id")


@resolver("Query", "product")
def resolve_product(root, info, id):
    return fetch_one(DB, "SELECT * FROM products WHERE id = ?", (id,))


@resolver("Query", "newArrivals")
def resolve_new_arrivals(root, info):
    return product_rows(info, "ORDER BY products.id DESC LIMIT 4")


@resolver("Product", "inStock")
def resolve_in_stock(product, info):
    return product["stock"] > 0


schema = make_schema()`,
    explanation:
      "The schema says what a client may ask; resolvers say how each field is produced. The registry keeps resolvers separate from the SDL so the schema can be rebuilt as it grows, and bind_resolvers attaches them to a fresh schema. The default resolver bridges naming styles (priceCents to price_cents), so only fields that need real logic get their own function. Note that product(id) returns None for an unknown id: the field is nullable, so 'not found' is just null, not an error. inStock shows that fields can be computed rather than stored.",
    hints: [
      { id: "h1", title: "The SDL", content: "type Category { id: ID! slug: String! name: String! } and type Product with id, sku, name, description (String!), priceCents, stock (Int!) and inStock (Boolean!). Then extend type Query { categories: [Category!]! product(id: ID!): Product newArrivals: [Product!]! }. product is nullable on purpose." },
      { id: "h2", title: "Registry and binding", content: "resolver() returns a function register(fn) that does RESOLVERS.setdefault(type_name, {})[field_name] = fn and returns fn. bind_resolvers loops over schema.type_map.items(); skip names starting with '__' and anything that is not a GraphQLObjectType; for each field set field.resolve = resolvers.get(type_name, {}).get(field_name, default_resolver). make_schema: build_schema(TYPE_DEFS), bind, return it." },
      { id: "h3", title: "default_resolver and snake", content: "snake: re.sub(r\"(?<!^)(?=[A-Z])\", \"_\", name).lower(). default_resolver: for key in (info.field_name, snake(info.field_name)): if source is a dict and key is in it, take that value; otherwise getattr for objects. If the value is callable call it as value(info, **args). Return None when nothing matches." },
      { id: "h4", title: "The resolvers", content: 'categories: fetch_all(DB, "SELECT * FROM categories ORDER BY id"). product: fetch_one(DB, "SELECT * FROM products WHERE id = ?", (id,)). newArrivals: product_rows(info, "ORDER BY products.id DESC LIMIT 4"). inStock: product["stock"] > 0. product_rows is fetch_all(DB, "SELECT products.* FROM products " + tail, params).' },
    ],
    tests: [
      {
        id: "t1",
        description: "The SDL models Category and Product with the right types",
        assertionCode: T(py`from graphql import GraphQLSchema
assert isinstance(schema, GraphQLSchema), "schema should be built with make_schema()"
P = schema.type_map.get("Product")
assert P is not None, "type Product is missing from the schema"
want = {"id": "ID!", "sku": "String!", "name": "String!", "description": "String!", "priceCents": "Int!", "stock": "Int!", "inStock": "Boolean!"}
for field, kind in want.items():
    assert field in P.fields, "Product is missing the field " + field
    assert str(P.fields[field].type) == kind, "Product." + field + " should be " + kind + ", got " + str(P.fields[field].type)
C = schema.type_map.get("Category")
assert C is not None and set(C.fields) >= {"id", "slug", "name"}, "type Category needs id, slug and name"
Q = schema.query_type.fields
assert str(Q["categories"].type) == "[Category!]!", "categories should be [Category!]!"
assert str(Q["product"].type) == "Product", "product should return a nullable Product (an unknown id is a normal outcome)"
assert str(Q["product"].args["id"].type) == "ID!", "product takes a required id: ID!"
assert str(Q["newArrivals"].type) == "[Product!]!", "newArrivals should be [Product!]!"
assert "shopName" in Q, "Extend Query, don't replace it: lesson 1's shopName must still exist"`),
      },
      {
        id: "t2",
        description: "categories lists the five categories from the database",
        assertionCode: T(py`_fresh()
d = _data(_gql("{ categories { id slug name } }"))
cats = d["categories"]
assert len(cats) == 5, "Expected 5 categories, got " + str(len(cats))
assert cats[0] == {"id": "1", "slug": "audio", "name": "Audio"}, "The first category should be {'id': '1', 'slug': 'audio', 'name': 'Audio'} (ID values are strings), got " + repr(cats[0])
assert [c["name"] for c in cats] == ["Audio", "Desk", "Lighting", "Bags", "Kitchen"], "Categories should come back ordered by id"`),
      },
      {
        id: "t3",
        description: "product(id) returns one product with camelCase fields",
        assertionCode: T(py`_fresh()
p = _data(_gql('{ product(id: 3) { id sku name priceCents stock inStock } }'))["product"]
assert p == {"id": "3", "sku": "AUD-003", "name": "Studio Headphones", "priceCents": 12900, "stock": 8, "inStock": True}, "product(id: 3) returned " + repr(p) + ". priceCents must read the price_cents column."
p = _data(_gql('{ product(id: 9) { name inStock } }'))["product"]
assert p == {"name": "Glow Cube", "inStock": False}, "Glow Cube has stock 0, so inStock must be False, got " + repr(p)`),
      },
      {
        id: "t4",
        description: "An unknown id is null, not an error",
        assertionCode: T(py`_fresh()
r = _gql("{ product(id: 999) { name } }")
assert r.get("errors") is None, "A missing product is a normal outcome and should not produce errors, got " + repr(r.get("errors"))
assert r["data"] == {"product": None}, "Expected {'product': None}, got " + repr(r["data"])
r = _gql('{ product(id: "abc") { name } }')
assert r["data"] == {"product": None}, "A non-numeric id just matches nothing, got " + repr(r)`),
      },
      {
        id: "t5",
        description: "newArrivals is the four newest products, newest first",
        assertionCode: T(py`_fresh()
d = _data(_gql("{ newArrivals { id name } }"))["newArrivals"]
assert [p["id"] for p in d] == ["16", "15", "14", "13"], "newArrivals should be ids 16, 15, 14, 13 (ORDER BY id DESC LIMIT 4), got " + repr([p["id"] for p in d])`),
      },
      {
        id: "t6",
        description: "bind_resolvers attaches registered functions and falls back to the default",
        assertionCode: T(py`from graphql import build_schema, graphql_sync
s = build_schema("type Query { a: Int! b: String }")
bind_resolvers(s, {"Query": {"a": lambda root, info: 7}})
r = graphql_sync(s, "{ a b }", root_value={"b": "from root"})
assert r.data == {"a": 7, "b": "from root"}, "Registered fields use their function, the rest use default_resolver, got " + repr(r.formatted)
r = graphql_sync(s, "{ __typename }")
assert r.data == {"__typename": "Query"}, "Introspection types must still work after binding"`),
      },
      {
        id: "t7",
        description: "resolver() registers the function and returns it unchanged",
        assertionCode: T(py`seen = RESOLVERS.get("Query", {}).get("zzTest")
assert seen is None
@resolver("Query", "zzTest")
def f(parent, info):
    return 1
assert RESOLVERS["Query"]["zzTest"] is f, "The decorator should store the function in RESOLVERS['Query']['zzTest']"
assert f(None, None) == 1, "The decorator must return the original function"
del RESOLVERS["Query"]["zzTest"]
assert snake("priceCents") == "price_cents" and snake("id") == "id" and snake("lineTotalCents") == "line_total_cents", "snake() should turn camelCase into snake_case"`),
      },
    ],
    unlocks: ["gql-catalogue"],
    checks: [
      {
        prompt: "`reviews: [Review!]!` and `reviews: [Review]` differ. Which statement is true about the first?",
        question: {
          type: "choice",
          options: [
            "The list is never null and no item inside it is null; an empty list `[]` is fine",
            "The list may be null but if present it has at least one item",
            "Every review must exist, so an empty list is an error",
            "Only the first item is guaranteed to be non-null",
          ],
          answer: 0,
        },
        explanation:
          "`!` after the item type means no null items; `!` after the brackets means the list itself is never null. \"No reviews yet\" is simply `[]`, which satisfies both promises.",
      },
      {
        prompt: "Why is `priceCents: Int!` a better design than `price: Float!` for a shop?",
        question: {
          type: "choice",
          options: [
            "Floats cannot represent most decimal amounts exactly, so money is stored as whole cents",
            "GraphQL does not support Float",
            "Int fields are faster to resolve",
            "Clients cannot parse decimals from JSON",
          ],
          answer: 0,
        },
        explanation:
          "0.1 + 0.2 is 0.30000000000000004 in floating point. Integers of the smallest unit are exact. The client formats them for display.",
      },
      {
        prompt: "Your resolver for `Query.product` gets `id` from the client. Which line is correct?",
        question: {
          type: "choice",
          options: [
            'fetch_one(DB, "SELECT * FROM products WHERE id = ?", (id,))',
            'fetch_one(DB, f"SELECT * FROM products WHERE id = {id}")',
            'fetch_one(DB, "SELECT * FROM products WHERE id = " + id)',
            'fetch_one(DB, "SELECT * FROM products WHERE id = %s" % id)',
          ],
          answer: 0,
        },
        explanation:
          "Arguments are user input. A placeholder sends the value separately from the SQL text, so it can never be read as SQL. The other three build the query by gluing strings together, which is SQL injection.",
      },
    ],
  },

  // ───────────────────────────────────────── 3. queries, arguments, variables
  {
    id: "graphql-gateway-3-queries",
    title: "Arguments, variables and the request pipeline",
    minutes: 40,
    xp: 170,
    concepts: ["arguments", "default values", "aliases", "fragments", "variables", "operation names", "parse / validate / execute"],
    learn: `### The query language, from the client's side

You wrote a gateway; now look at what clients can do with it. A request is a **document** with one or more **operations** (\`query\`, \`mutation\`, \`subscription\`) and optional **fragments**.

### Arguments

Fields take arguments, declared in the schema with a type and an optional default:

~~~graphql
extend type Query {
  products(category: String, limit: Int = 20, offset: Int = 0): [Product!]!
}
~~~

~~~graphql
{ products(category: "audio", limit: 2) { name } }
~~~

\`category\` is optional (nullable, no \`!\`); \`limit\` has a default. The resolver receives only what was given plus defaults: \`def resolve_products(root, info, category=None, limit=20, offset=0)\`. Declare the same defaults in Python so the function is safe to call directly in tests.

**Arguments are user input.** A client can send \`limit: 100000\`. Validate them in the resolver and raise a \`GraphQLError\` with a machine-readable code if they are out of range.

### Aliases

Two fields with the same name would collide in the response. An **alias** renames the result key:

~~~graphql
{
  cheap: products(limit: 1) { name }
  more:  products(limit: 2, offset: 1) { name }
}
~~~

The response has keys \`cheap\` and \`more\`. Aliases also let one request call the same field with different arguments.

### Fragments

A **fragment** is a reusable set of fields on a type:

~~~graphql
query { products(limit: 3) { ...ProductCard } }
fragment ProductCard on Product { id name priceCents }
~~~

UI components often own a fragment describing the data they need. The server expands them during validation, so resolvers never see them.

### Variables and operation names

Never glue values into the query text. Use **variables**: declare them on the operation with a type, use them with \`$\`, and send their values separately as JSON.

~~~graphql
query ProductsInCategory($category: String, $limit: Int = 4) {
  products(category: $category, limit: $limit) { name }
}
~~~

~~~json
{ "query": "...", "variables": { "category": "audio" }, "operationName": "ProductsInCategory" }
~~~

Benefits: no string-building bugs or injection through the query text; the query text stays constant, so it can be cached, logged and allow-listed; and the server type-checks variables against the declared types (\`$limit: Int\` rejects \`"x"\`).

An operation's **name** (\`ProductsInCategory\`) is optional for a single anonymous \`{ ... }\`, but name everything: logs, error reports and the *query plan* panel become readable. When a document contains **several** operations you must tell the server which to run with \`operationName\`.

### The pipeline: parse, validate, execute

In lesson 1 \`graphql_sync\` did everything. Now take the three steps apart, because the next lessons plug into them:

~~~python
document = parse(query)                                   # GraphQLSyntaxError if the text is malformed
errors = validate(schema, document, specified_rules)      # a list of GraphQLError, empty if fine
result = run_operation(schema, document, ...)             # graphql-core's execute()
~~~

\`specified_rules\` are the ~25 standard checks from the spec (known fields, correct argument types, no unused variables…). Validation happens **before any resolver runs**, which is the cheapest place to reject bad or abusive queries.

### Plug-in points

We will extend the pipeline without rewriting it, so \`execute\` reads four module-level plug-ins every time it runs:

- \`EXTRA_RULES\`: extra validation rules (lesson 12 adds query limits).
- \`MIDDLEWARE\`: functions wrapped around every resolver (lesson 6).
- \`build_context(request)\`: creates the per-request context object (lesson 5).
- \`RESPONSE_HOOKS\` and \`format_error\`: last chances to edit the response and each error (lessons 6 and 9).

They start empty or trivial; later lessons fill them in.

### Common mistakes

- Concatenating a value into the query string instead of using a variable.
- Forgetting that \`variables\` must be a JSON **object**: a string or list is a client bug your gateway should report cleanly.
- Sending several operations without \`operationName\`.
- Treating \`operationName: ""\` as a real name; it means "none".`,
    mission: `Clients now want to filter and page the catalogue and reuse the same query with different inputs. You will add field arguments with sensible limits, and rebuild \`execute\` as a proper **three-phase pipeline** with plug-in points that the rest of the project uses.

The Explorer then gets its **variables pane**, the operation picker and a library of saved operations, including one with fragments and aliases.`,
    tasks: [
      "Extend Query with products(category: String, limit: Int = 20, offset: Int = 0) and productBySku(sku: String!), with resolvers; limit must be 1..100 and offset 0 or more, otherwise raise a GraphQLError with extensions code BAD_USER_INPUT",
      "Create the plug-ins: EXTRA_RULES = [], MIDDLEWARE = [], RESPONSE_HOOKS = [], build_context(request) returning None, format_error(error) returning error.formatted",
      "Rewrite execute(request) as parse -> validate (specified_rules + EXTRA_RULES) -> run the operation (context from build_context, middleware, variables, operation name), then apply RESPONSE_HOOKS",
      "execute must never raise: syntax and validation errors, non-object variables and a blank operationName all become clean responses; finish with schema = make_schema()",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 3: arguments, variables and a three-phase pipeline.
from graphql import GraphQLError, parse, specified_rules, validate
from graphql import execute as run_operation  # graphql-core's executor; our own gateway is called execute()

# 1) Field arguments. Extend Query with products(...) and productBySku(...).
TYPE_DEFS += """
"""


def bad_input(message):
    """A client mistake: a GraphQLError with a machine-readable code in extensions."""
    return GraphQLError(message, extensions={"code": "BAD_USER_INPUT"})


# @resolver("Query", "products") ... @resolver("Query", "productBySku") ...


# 2) The plug-in points later lessons will fill in.
EXTRA_RULES = []
MIDDLEWARE = []
RESPONSE_HOOKS = []


def build_context(request):
    ...


def format_error(error):
    ...


# 3) The pipeline. This replaces the lesson 1 version: the last def execute wins.
def execute(request):
    """parse -> validate -> execute. Always return {"data": ..., "errors": [...]} and never raise."""
    ...


schema = make_schema()
`,
    solutionAdd: py`from graphql import GraphQLError, parse, specified_rules, validate
from graphql import execute as run_operation  # graphql-core's executor; our own gateway is called execute()

TYPE_DEFS += """
extend type Query {
  products(category: String, limit: Int = 20, offset: Int = 0): [Product!]!
  productBySku(sku: String!): Product
}
"""


def bad_input(message):
    """A client mistake: a GraphQLError with a machine-readable code in extensions."""
    return GraphQLError(message, extensions={"code": "BAD_USER_INPUT"})


@resolver("Query", "products")
def resolve_products(root, info, category=None, limit=20, offset=0):
    if not 1 <= limit <= 100:
        raise bad_input("limit must be between 1 and 100.")
    if offset < 0:
        raise bad_input("offset must be 0 or more.")
    if category is None:
        return product_rows(info, "ORDER BY products.id LIMIT ? OFFSET ?", (limit, offset))
    return product_rows(
        info,
        "JOIN categories ON categories.id = products.category_id WHERE categories.slug = ? ORDER BY products.id LIMIT ? OFFSET ?",
        (category, limit, offset),
    )


@resolver("Query", "productBySku")
def resolve_product_by_sku(root, info, sku):
    return fetch_one(DB, "SELECT * FROM products WHERE sku = ?", (sku,))


EXTRA_RULES = []  # extra validation rules (lesson 12)
MIDDLEWARE = []  # wrapped around every resolver (lesson 6)
RESPONSE_HOOKS = []  # functions (response, context) that may edit the response (lesson 6)


def build_context(request):
    return None  # lesson 5 builds a real per-request context here


def format_error(error):
    return error.formatted  # lesson 9 makes this safe for clients


def failure(errors):
    """A response for a request that never reached execution."""
    return {"data": None, "errors": [format_error(error) for error in errors]}


def execute(request):
    """parse -> validate -> execute. Always return {"data": ..., "errors": [...]} and never raise."""
    query = request.get("query") if isinstance(request, dict) else None
    if not isinstance(query, str) or not query.strip():
        return failure([GraphQLError("The request must include a non-empty query string.")])
    variables = request.get("variables")
    if variables is not None and not isinstance(variables, dict):
        return failure([GraphQLError("variables must be a JSON object.")])
    operation_name = request.get("operationName") or None  # "" means no name
    if operation_name is not None and not isinstance(operation_name, str):
        return failure([GraphQLError("operationName must be a string.")])

    try:
        document = parse(query)  # phase 1: syntax
    except GraphQLError as error:
        return failure([error])
    errors = validate(schema, document, list(specified_rules) + EXTRA_RULES)  # phase 2: against the schema
    if errors:
        return failure(errors)

    context = build_context(request)
    result = run_operation(  # phase 3: run the resolvers
        schema,
        document,
        root_value=ROOT,
        context_value=context,
        variable_values=variables,
        operation_name=operation_name,
        middleware=MIDDLEWARE or None,
    )
    response = {"data": result.data}
    if result.errors:
        response["errors"] = [format_error(error) for error in result.errors]
    for hook in RESPONSE_HOOKS:
        hook(response, context)
    return response


schema = make_schema()`,
    explanation:
      "Taking the three phases apart gives you a place to reject work early (validation costs no resolver calls) and a place for every cross-cutting concern: rules for limits, middleware for measuring, a context for per-request state, hooks for the response. Arguments are validated in resolvers because the schema can only check types, not business rules such as 'limit at most 100'. Variables travel separately from the query text, which keeps queries constant and injection-free, and a blank operationName is treated as none so sloppy clients still work.",
    hints: [
      { id: "h1", title: "Arguments", content: 'extend type Query { products(category: String, limit: Int = 20, offset: Int = 0): [Product!]!  productBySku(sku: String!): Product }. The products resolver signature is (root, info, category=None, limit=20, offset=0). Filter by category with JOIN categories ON categories.id = products.category_id WHERE categories.slug = ?; always pass values in the params tuple.' },
      { id: "h2", title: "Validate arguments", content: 'if not 1 <= limit <= 100: raise bad_input("limit must be between 1 and 100.") and the same idea for offset < 0. GraphQLError(message, extensions={"code": "BAD_USER_INPUT"}) is what bad_input builds.' },
      { id: "h3", title: "The pipeline", content: "document = parse(query) inside try/except GraphQLError; errors = validate(schema, document, list(specified_rules) + EXTRA_RULES); if errors return failure(errors). Then result = run_operation(schema, document, root_value=ROOT, context_value=build_context(request), variable_values=variables, operation_name=operation_name, middleware=MIDDLEWARE or None)." },
      { id: "h4", title: "Building the response", content: 'response = {"data": result.data}; if result.errors: response["errors"] = [format_error(e) for e in result.errors]; then for hook in RESPONSE_HOOKS: hook(response, context). A helper failure(errors) returns {"data": None, "errors": [format_error(e) for e in errors]}. Check variables is None or a dict, and use request.get("operationName") or None.' },
    ],
    tests: [
      {
        id: "t1",
        description: "products takes category, limit and offset (with defaults)",
        assertionCode: T(py`_fresh()
a = schema.query_type.fields["products"].args
assert set(a) == {"category", "limit", "offset"}, "products should take category, limit and offset, got " + repr(sorted(a))
assert str(a["limit"].type) == "Int" and a["limit"].default_value == 20, "limit: Int = 20"
assert a["offset"].default_value == 0, "offset: Int = 0"
assert str(a["category"].type) == "String", "category is optional"
ids = [p["id"] for p in _data(_gql("{ products { id } }"))["products"]]
assert len(ids) == 16, "With the default limit of 20 all 16 products fit, got " + str(len(ids))
ids = [p["id"] for p in _data(_gql("{ products(limit: 3) { id } }"))["products"]]
assert ids == ["1", "2", "3"], "limit: 3 should return the first three products, got " + repr(ids)
ids = [p["id"] for p in _data(_gql("{ products(limit: 5, offset: 14) { id } }"))["products"]]
assert ids == ["15", "16"], "offset: 14 should skip 14 products, got " + repr(ids)`),
      },
      {
        id: "t2",
        description: "Filtering by category slug; an unknown category is an empty list",
        assertionCode: T(py`_fresh()
names = [p["name"] for p in _data(_gql('{ products(category: "audio") { name } }'))["products"]]
assert names == ["Tide Earbuds", "Pocket Speaker", "Studio Headphones"], "The audio category has three products, got " + repr(names)
assert _data(_gql('{ products(category: "nope") { name } }'))["products"] == [], "An unknown category should give [], not an error"
p = _data(_gql('{ productBySku(sku: "KIT-003") { name } }'))["productBySku"]
assert p == {"name": "Burr Grinder"}, "productBySku should find KIT-003, got " + repr(p)
assert _data(_gql('{ productBySku(sku: "NOPE") { name } }'))["productBySku"] is None, "An unknown SKU is null"
r = _gql("""{ products(category: "x' OR '1'='1") { name } }""")
assert r.get("data") == {"products": []}, "A quote in an argument must be treated as plain text (use placeholders), got " + repr(r)`),
      },
      {
        id: "t3",
        description: "Out-of-range arguments produce BAD_USER_INPUT errors",
        assertionCode: T(py`_fresh()
for q in ("{ products(limit: 0) { id } }", "{ products(limit: 101) { id } }", "{ products(offset: -1) { id } }"):
    r = _gql(q)
    assert r.get("errors"), q + " should be rejected with an error"
    assert _codes(r) == ["BAD_USER_INPUT"], q + " should carry extensions code BAD_USER_INPUT, got " + repr(_codes(r))
    assert r["data"] is None, "products is [Product!]!, so a failed field makes data null, got " + repr(r["data"])
assert "limit" in _msgs(_gql("{ products(limit: 0) { id } }"))[0], "The message should say which argument is wrong"`),
      },
      {
        id: "t4",
        description: "Aliases, fragments and variables work end to end",
        assertionCode: T(py`_fresh()
q = """
query Shelf($category: String, $limit: Int = 2) {
  mine: products(category: $category, limit: $limit) { ...Card }
  other: products(category: "kitchen", limit: 1) { ...Card }
}
fragment Card on Product { id name }
"""
d = _data(_gql(q, variables={"category": "desk"}))
assert [p["id"] for p in d["mine"]] == ["4", "5"], "The default limit 2 applies when the variable is not sent, got " + repr(d["mine"])
assert d["other"] == [{"id": "14", "name": "Pour-over Kettle"}], "The alias 'other' should hold the kitchen product, got " + repr(d["other"])
d = _data(_gql(q, variables={"category": "desk", "limit": 1}))
assert len(d["mine"]) == 1, "An explicit variable overrides the default"
r = _gql("query Q($n: Int!) { products(limit: $n) { id } }")
assert r.get("errors") and "n" in r["errors"][0]["message"], "A missing required variable is an error that names it, got " + repr(r)
r = _gql("query Q($n: Int!) { products(limit: $n) { id } }", variables={"n": "three"})
assert r.get("errors"), "A variable of the wrong type is rejected before any resolver runs"`),
      },
      {
        id: "t5",
        description: "Operation names pick the operation; blank means none",
        assertionCode: T(py`_fresh()
two = "query First { shopName } query Second { tagline }"
assert _data(_gql(two, operation_name="Second")) == {"tagline": "Small things for big desks"}, "operationName should select the operation"
r = _gql(two)
assert r.get("errors") and "operation" in _msgs(r)[0].lower(), "Without operationName a two-operation document is an error"
r = _gql(two, operation_name="Third")
assert r.get("errors") and "Third" in _msgs(r)[0], "An unknown operation name is an error that names it"
assert _data(_gql("{ shopName }", operation_name="")) == {"shopName": "Pocket Store"}, "An empty operationName means 'no name' and must not break a single-operation document"`),
      },
      {
        id: "t6",
        description: "Bad requests are errors, never exceptions",
        assertionCode: T(py`for bad in (None, "text", 5, {}, {"query": "{ shopName }", "variables": "x=1"}, {"query": "{ shopName }", "variables": [1]}, {"query": "{ shopName }", "operationName": 5}):
    r = execute(bad)
    assert isinstance(r, dict) and r.get("errors"), "execute(" + repr(bad) + ") should return an errors response, got " + repr(r)
r = _gql("{ shopName")
assert r["data"] is None and r["errors"][0].get("locations"), "Syntax errors have locations and no data"
r = _gql("{ shopName nope }")
assert r["data"] is None and "nope" in _msgs(r)[0], "Validation errors name the problem and return no data"
r = execute({"query": "{ shopName }", "variables": {}})
assert r == {"data": {"shopName": "Pocket Store"}}, "An empty variables object is fine, got " + repr(r)`),
      },
      {
        id: "t7",
        description: "EXTRA_RULES, MIDDLEWARE and build_context are really used",
        assertionCode: T(py`from graphql.validation import ValidationRule
from graphql import GraphQLError
global build_context
class NoTagline(ValidationRule):
    def enter_field(self, node, *_):
        if node.name.value == "tagline":
            self.report_error(GraphQLError("tagline is banned today"))
seen = []
def spy(next_, root, info, **args):
    seen.append((info.field_name, info.context))
    return next_(root, info, **args)
old_context = build_context
EXTRA_RULES.append(NoTagline)
MIDDLEWARE.append(spy)
build_context = lambda request: {"marker": 42}
try:
    r = _gql("{ tagline }")
    assert r.get("errors") and "banned" in _msgs(r)[0], "A rule in EXTRA_RULES must be passed to validate()"
    r = _gql("{ shopName }")
    assert _data(r) == {"shopName": "Pocket Store"}
    assert seen and seen[0][0] == "shopName", "A function in MIDDLEWARE must wrap resolvers (pass middleware=... when executing)"
    assert seen[0][1] == {"marker": 42}, "build_context(request)'s result must reach resolvers as info.context (context_value=...)"
finally:
    EXTRA_RULES.remove(NoTagline)
    MIDDLEWARE.remove(spy)
    build_context = old_context
hooked = []
RESPONSE_HOOKS.append(lambda response, context: response.update({"extensions": {"hooked": True}}))
try:
    assert _gql("{ shopName }").get("extensions") == {"hooked": True}, "RESPONSE_HOOKS functions get (response, context) and may edit the response"
finally:
    RESPONSE_HOOKS.clear()`),
      },
    ],
    unlocks: ["gql-variables"],
    checks: [
      {
        prompt: "Why send `$category` as a **variable** instead of building the query string `\"{ products(category: \\\"\" + value + \"\\\") ... }\"`?",
        question: {
          type: "choice",
          options: [
            "The query text stays constant (cacheable, loggable) and values can't be mistaken for query syntax",
            "Variables make the resolver run faster",
            "GraphQL forbids string literals inside queries",
            "Variables are only needed for mutations",
          ],
          answer: 0,
        },
        explanation:
          "Gluing values into the text mixes data with syntax, the same flaw as SQL injection, and makes every request a unique string. Variables keep them apart, and the server validates their types.",
      },
      {
        prompt: "A document contains `query A { ... }` and `query B { ... }`. The client sends no `operationName`. What happens?",
        question: {
          type: "choice",
          options: [
            "An error: the server cannot guess which operation to run",
            "Both run and the results are merged",
            "The first one runs",
            "Only anonymous operations are allowed in a multi-operation document",
          ],
          answer: 0,
        },
        explanation:
          "One execution runs exactly one operation. With several defined, `operationName` is required. Naming your operations is also what makes logs and the query plan readable.",
      },
      {
        prompt: "At which phase is a query rejected for asking a field that does not exist, and why does that matter?",
        question: {
          type: "choice",
          options: [
            "Validation, before any resolver runs, so it costs no database work",
            "Execution, after the resolvers have run",
            "Parsing, because the text is malformed",
            "It is never rejected; unknown fields are ignored",
          ],
          answer: 0,
        },
        explanation:
          "The text is syntactically fine, so parsing passes. Validation compares the document with the schema and fails it, and nothing has executed yet. That is why validation is the best place for cheap, early defences (lesson 12).",
      },
    ],
  },

  // ───────────────────────────────────────── 4. enums, interfaces, unions
  {
    id: "graphql-gateway-4-abstract",
    title: "Enums, interfaces and unions",
    minutes: 40,
    xp: 170,
    concepts: ["enum", "interface", "union", "__typename", "inline fragments", "type resolution"],
    learn: `### Enums

An **enum** is a fixed set of named values. The schema documents them and validation enforces them:

~~~graphql
enum Role { ADMIN CUSTOMER }

extend type Query {
  users(role: Role): [Account!]!
}
~~~

A query writes enum values bare (\`users(role: ADMIN)\`). Writing \`"ADMIN"\` as a string literal is a validation error, while a *variable* of type \`Role\` carries the JSON string \`"ADMIN"\`. With \`build_schema\` the Python value of an enum is its name, so a resolver receives \`"ADMIN"\` and must **return** exactly one of the declared names. Our database stores the same upper-case words, so no translation is needed. (If yours stores \`admin\`, convert at the boundary or give the enum values explicit Python values.)

### Interfaces

An **interface** is a contract: "anything of this kind has at least these fields".

~~~graphql
interface Account {
  id: ID!
  name: String!
  email: String
  role: Role!
}

type Customer implements Account {
  id: ID!  name: String!  email: String  role: Role!
  orderCount: Int!
}

type Admin implements Account {
  id: ID!  name: String!  email: String  role: Role!
  permissions: [String!]!
}
~~~

\`users\` can now return a list of \`Account\`s that are really customers or admins. Each implementing type must repeat the interface's fields and may add its own. Interfaces express "is a kind of".

### Unions

A **union** is "one of these types", with **no shared fields** required:

~~~graphql
union SearchResult = Product | Category
~~~

A search box may find products and categories in the same list. Use an interface when the types share fields and you want to query those directly. Use a union when they are unrelated.

### Asking for abstract types: \`__typename\` and inline fragments

You cannot select \`name\` on a \`SearchResult\` (a union has no fields of its own), and on an interface you can select only the interface's fields. To reach type-specific fields use an **inline fragment**:

~~~graphql
{
  search(term: "desk") {
    __typename
    ... on Product  { id name priceCents }
    ... on Category { id name }
  }
}
~~~

\`__typename\` is a meta-field available on every object, returning the concrete type name. Clients use it to decide how to render each item, and caches use it as part of an identity.

### How does the server know the concrete type?

The executor must turn each returned value into a concrete object type before it can pick fields. That step is **type resolution**. graphql-core's default type resolver looks for a \`__typename\` key in a dict (or attribute on an object), so our resolvers tag what they return:

~~~python
return {**row, "__typename": "Customer"}
~~~

You can also give an interface or union its own \`resolve_type\` function; tagging is simply the least ceremony. If neither works you get an error such as "Abstract type must resolve to an Object type at runtime".

### Extending to add behaviour

Because our schema is cumulative, new types are appended to \`TYPE_DEFS\`. Each resolver you register belongs to a *concrete* type (\`Customer.orderCount\`), not to the interface.

### Searching safely

\`LIKE\` has its own special characters: \`%\` and \`_\`. If a user searches for \`50%\`, the unescaped pattern matches almost everything. Escape them (pick an escape character, say \`!\`, and say \`ESCAPE '!'\` in the SQL).

### Common mistakes

- Selecting a type-specific field without an inline fragment.
- Forgetting a field the interface demands on an implementing type (the schema fails to build).
- Returning a dict without \`__typename\` for an abstract field.
- Using a string literal where an enum value is required.`,
    mission: `The shop needs a **search box** that finds products *and* categories in one list, and an accounts screen that lists customers and admins with different details.

Add the \`Role\` enum, the \`Account\` interface with two implementations, the \`SearchResult\` union, and the resolvers that tag their results. The client app gets its search box and an accounts list.`,
    tasks: [
      "SDL: enum Role, interface Account (id, name, email, role), types Customer (orderCount) and Admin (permissions), union SearchResult = Product | Category",
      "Query.users(role: Role): a list of accounts, tagged with __typename (Admin or Customer), ordered by id",
      "Query.search(term: String!): matching categories then products (by name or description, case-insensitive), tagged; escape LIKE wildcards; a blank term gives []",
      "Customer.orderCount and Admin.permissions resolvers; rebuild the schema",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 4: enums, interfaces and unions.

# 1) Describe them in SDL (use TYPE_DEFS +=).
TYPE_DEFS += """
"""


def like_pattern(term):
    """Escape the LIKE wildcards in a user's search term: use '!' as the escape character."""
    ...


def tag_account(user):
    """Add the __typename GraphQL needs to pick Admin or Customer for a users row."""
    ...


# 2) Resolvers: Query.users, Query.search, Customer.orderCount, Admin.permissions.
# search SQL hint: ... WHERE lower(name) LIKE ? ESCAPE '!'


schema = make_schema()
`,
    solutionAdd: py`TYPE_DEFS += """
enum Role {
  ADMIN
  CUSTOMER
}

interface Account {
  id: ID!
  name: String!
  email: String
  role: Role!
}

type Customer implements Account {
  id: ID!
  name: String!
  email: String
  role: Role!
  orderCount: Int!
}

type Admin implements Account {
  id: ID!
  name: String!
  email: String
  role: Role!
  permissions: [String!]!
}

union SearchResult = Product | Category

extend type Query {
  users(role: Role): [Account!]!
  search(term: String!): [SearchResult!]!
}
"""


def like_pattern(term):
    """Escape the LIKE wildcards in a user's search term: use '!' as the escape character."""
    escaped = term.lower().replace("!", "!!").replace("%", "!%").replace("_", "!_")
    return "%" + escaped + "%"


def tag_account(user):
    """Add the __typename GraphQL needs to pick Admin or Customer for a users row."""
    return {**user, "__typename": "Admin" if user["role"] == "ADMIN" else "Customer"}


@resolver("Query", "users")
def resolve_users(root, info, role=None):
    if role is None:
        rows = fetch_all(DB, "SELECT * FROM users ORDER BY id")
    else:
        rows = fetch_all(DB, "SELECT * FROM users WHERE role = ? ORDER BY id", (role,))
    return [tag_account(row) for row in rows]


@resolver("Query", "search")
def resolve_search(root, info, term):
    if not term.strip():
        return []
    pattern = like_pattern(term.strip())
    categories = fetch_all(DB, "SELECT * FROM categories WHERE lower(name) LIKE ? ESCAPE '!' ORDER BY id", (pattern,))
    products = product_rows(
        info,
        "WHERE lower(products.name) LIKE ? ESCAPE '!' OR lower(products.description) LIKE ? ESCAPE '!' ORDER BY products.id",
        (pattern, pattern),
    )
    return [{**c, "__typename": "Category"} for c in categories] + [{**p, "__typename": "Product"} for p in products]


@resolver("Customer", "orderCount")
def resolve_order_count(user, info):
    return fetch_one(DB, "SELECT COUNT(*) AS n FROM orders WHERE user_id = ?", (user["id"],))["n"]


@resolver("Admin", "permissions")
def resolve_permissions(user, info):
    return ["products:write", "orders:read", "users:read"]


schema = make_schema()`,
    explanation:
      "Enums constrain a field to named values, interfaces share fields between types, unions group unrelated types. For all abstract types the executor needs the concrete object type, which graphql-core reads from a __typename key, so the resolvers tag their rows. Clients then use __typename and inline fragments to read type-specific fields. Escaping the LIKE wildcards matters because the search term is user input: '50%' must mean the text 50%, not 'anything'.",
    hints: [
      { id: "h1", title: "SDL", content: "enum Role { ADMIN CUSTOMER }. interface Account { id: ID! name: String! email: String role: Role! }. type Customer implements Account { id: ID! name: String! email: String role: Role! orderCount: Int! } and type Admin implements Account { same four fields, permissions: [String!]! }. union SearchResult = Product | Category. Then extend type Query { users(role: Role): [Account!]! search(term: String!): [SearchResult!]! }." },
      { id: "h2", title: "Tagging", content: 'tag_account: {**user, "__typename": "Admin" if user["role"] == "ADMIN" else "Customer"}. In search, tag categories with "Category" and products with "Product" the same way.' },
      { id: "h3", title: "Searching", content: 'like_pattern: escape the term with .replace("!", "!!").replace("%", "!%").replace("_", "!_"), lower-case it and wrap it in % signs. Query categories by lower(name) LIKE ? ESCAPE \'!\'; products by name OR description with product_rows(info, "WHERE ... ORDER BY products.id", (pattern, pattern)). Return categories first, then products.' },
      { id: "h4", title: "Counting orders", content: 'Customer.orderCount: fetch_one(DB, "SELECT COUNT(*) AS n FROM orders WHERE user_id = ?", (user["id"],))["n"]. Admin.permissions can return a constant list of strings.' },
    ],
    tests: [
      {
        id: "t1",
        description: "The abstract types are declared correctly",
        assertionCode: T(py`from graphql import GraphQLEnumType, GraphQLInterfaceType, GraphQLUnionType
role = schema.type_map.get("Role")
assert isinstance(role, GraphQLEnumType) and set(role.values) == {"ADMIN", "CUSTOMER"}, "enum Role { ADMIN CUSTOMER } is missing or wrong"
acc = schema.type_map.get("Account")
assert isinstance(acc, GraphQLInterfaceType), "Account should be an interface"
assert {t.name for t in schema.get_possible_types(acc)} == {"Customer", "Admin"}, "Customer and Admin should both implement Account"
union = schema.type_map.get("SearchResult")
assert isinstance(union, GraphQLUnionType), "SearchResult should be a union"
assert {t.name for t in union.types} == {"Product", "Category"}, "SearchResult = Product | Category"
assert str(schema.type_map["Customer"].fields["orderCount"].type) == "Int!", "Customer.orderCount: Int!"
assert str(schema.type_map["Admin"].fields["permissions"].type) == "[String!]!", "Admin.permissions: [String!]!"`),
      },
      {
        id: "t2",
        description: "users returns Customers and Admins and can filter by role enum",
        assertionCode: T(py`_fresh()
d = _data(_gql("{ users { __typename id name role } }"))["users"]
assert [u["__typename"] for u in d] == ["Admin", "Customer", "Customer", "Customer"], "Types by id should be Admin, Customer, Customer, Customer, got " + repr([u["__typename"] for u in d])
assert d[0] == {"__typename": "Admin", "id": "1", "name": "Ada Admin", "role": "ADMIN"}, "First user should be Ada Admin, got " + repr(d[0])
only = _data(_gql("{ users(role: ADMIN) { name } }"))["users"]
assert only == [{"name": "Ada Admin"}], "users(role: ADMIN) should return only Ada, got " + repr(only)
v = _data(_gql("query U($r: Role) { users(role: $r) { name } }", variables={"r": "CUSTOMER"}))["users"]
assert [u["name"] for u in v] == ["Sam Carter", "Priya Nair", "Leo Park"], "An enum variable arrives as the JSON string 'CUSTOMER', got " + repr(v)`),
      },
      {
        id: "t3",
        description: "Inline fragments reach type-specific fields",
        assertionCode: T(py`_fresh()
q = "{ users { name ... on Customer { orderCount } ... on Admin { permissions } } }"
d = _data(_gql(q))["users"]
assert d[0] == {"name": "Ada Admin", "permissions": ["products:write", "orders:read", "users:read"]}, "Admins expose permissions, got " + repr(d[0])
assert d[1] == {"name": "Sam Carter", "orderCount": 3}, "Sam has three orders, got " + repr(d[1])
assert d[3] == {"name": "Leo Park", "orderCount": 1}, "Leo has one order, got " + repr(d[3])`),
      },
      {
        id: "t4",
        description: "search returns a union of categories and products",
        assertionCode: T(py`_fresh()
d = _data(_gql('{ search(term: "desk") { __typename ... on Category { id name } ... on Product { id name } } }'))["search"]
assert [x["__typename"] for x in d] == ["Category", "Product", "Product"], "'desk' matches the Desk category and two products, got " + repr([x["__typename"] for x in d])
assert d[0] == {"__typename": "Category", "id": "2", "name": "Desk"}
assert [x["name"] for x in d[1:]] == ["Felt Desk Mat", "Arc Desk Lamp"], "Products come back ordered by id and match name OR description, got " + repr(d)
d = _data(_gql('{ search(term: "WALNUT") { ... on Product { name } } }'))["search"]
assert d == [{"name": "Walnut Laptop Stand"}], "Search is case-insensitive and also reads descriptions, got " + repr(d)`),
      },
      {
        id: "t5",
        description: "Search escapes wildcards and ignores blank terms",
        assertionCode: T(py`_fresh()
for term in ("%", "_", "   ", ""):
    d = _data(_gql("query S($t: String!) { search(term: $t) { __typename } }", variables={"t": term}))["search"]
    assert d == [], "Searching for " + repr(term) + " must not match everything (escape % and _, ignore blank), got " + str(len(d)) + " results"
d = _data(_gql('{ search(term: "ee") { ... on Product { name } } }'))["search"]
assert d == [{"name": "Cable Spool"}], "'ee' only appears in the Cable Spool description (Keeps), got " + repr(d)`),
      },
      {
        id: "t6",
        description: "Abstract fields need fragments, enums reject string literals",
        assertionCode: T(py`r = _gql('{ search(term: "a") { name } }')
assert r.get("errors") and "inline fragment" in _msgs(r)[0], "Selecting name directly on a union is a validation error that suggests an inline fragment, got " + repr(r)
r = _gql('{ users(role: "ADMIN") { name } }')
assert r.get("errors"), "An enum argument must be written bare (ADMIN), not as a string literal"
r = _gql("{ users(role: BOSS) { name } }")
assert r.get("errors"), "BOSS is not a Role value"
assert _data(_gql("{ users { __typename } }"))["users"][0] == {"__typename": "Admin"}`),
      },
    ],
    unlocks: ["gql-search"],
    checks: [
      {
        prompt: "When would you choose a **union** over an **interface**?",
        question: {
          type: "choice",
          options: [
            "When the possible types share no fields you want to query in common (a search returning Products and Categories)",
            "When every type has the same fields and you want to read them without fragments",
            "When you need a field to be non-null",
            "Unions and interfaces are interchangeable; there is no difference",
          ],
          answer: 0,
        },
        explanation:
          "An interface promises shared fields you can select directly. A union only says \"one of these\" and every field needs an inline fragment. Choose based on what the client wants to read in common.",
      },
      {
        prompt: "A resolver returns a plain dict for a field of type `Account`, and execution fails with \"Abstract type must resolve to an Object type\". What is the fix?",
        question: {
          type: "choice",
          options: [
            'Include "__typename": "Customer" (or "Admin") in the dict, or give the interface a resolve_type function',
            "Change the field's type to String",
            "Make the field nullable",
            "Return a list instead of a dict",
          ],
          answer: 0,
        },
        explanation:
          "The executor needs to know which concrete object type a value is before it can pick fields. graphql-core's default type resolver reads `__typename`, so tagging the value (or supplying `resolve_type`) answers the question.",
      },
    ],
  },
];

