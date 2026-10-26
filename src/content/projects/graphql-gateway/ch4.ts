import type { Lesson } from "@/engine/types";
import { py, T } from "./shared.ts";

/** Chapter 4: Production. Authorization, query limits, introspection, tests and the REST comparison. */
export const chapter4: Lesson[] = [
  // ───────────────────────────────────────── 11. authorization
  {
    id: "graphql-gateway-11-authz",
    title: "Authorization in resolvers",
    minutes: 40,
    xp: 200,
    concepts: ["authorization", "roles", "ownership", "field-level access", "UNAUTHENTICATED vs FORBIDDEN", "guards"],
    learn: `### Authentication versus authorization

Lesson 5 established **who** is calling (authentication). Now decide **what they may do** (authorization). In a REST API you could protect a URL. A GraphQL API has one URL and a graph of fields, so the checks live closer to the data: in **resolvers**.

Three levels, from coarse to fine:

1. **Operation-level**: only signed-in users may place orders; only admins may list every user (\`Query.users\`, \`Query.allOrders\`).
2. **Ownership**: a customer may read *their own* orders. \`orders\` must return only the caller's; \`order(id)\` must not reveal anyone else's.
3. **Field-level**: a user's \`email\` is visible to the user themselves and to admins, but not to other customers who merely see them as the author of a review.

Field-level rules are why GraphQL authorization cannot be a URL filter: the *same* \`Account\` object is reachable through many paths (\`me\`, \`users\`, \`review.author\`), and the rule has to follow the field wherever it appears.

### Which error to use

- Not signed in at all: **\`UNAUTHENTICATED\`**. The client's reaction is "show the login screen".
- Signed in but not allowed: **\`FORBIDDEN\`**. The reaction is "tell the user, don't retry".
- Resource that is not yours: for lookups by id, answer exactly as if it **did not exist** (\`null\`). Answering "FORBIDDEN" confirms the id exists, which leaks information. (Many APIs return 404 for the same reason.)
- A sensitive *field* on an otherwise visible object: return \`null\` (so the field must be nullable) or raise \`FORBIDDEN\`, depending on whether the UI should keep working. Returning \`null\` for email is friendlier; raising makes the problem loud.

### Do not rely on the client

Hiding a button in the app is not security. A hostile client can send any query. Every check must run on the server, **on every path**. The most common GraphQL security bug is protecting \`Query.order\` but forgetting \`Review.product.orders\` or some other route to the same data.

### Guards: reusable rules

Write each rule once as a small predicate over \`(parent, info, **args)\`, then apply it with a wrapper:

~~~python
def is_admin(parent, info, **args):
    user = info.context.user
    return user is not None and user["role"] == "ADMIN"

def protect(type_name, field_name, rule, hide=False):
    inner = RESOLVERS.get(type_name, {}).get(field_name, default_resolver)
    def guarded(parent, info, **args):
        if not rule(parent, info, **args):
            if hide:
                return None
            raise denied(info)
        return inner(parent, info, **args)
    RESOLVERS.setdefault(type_name, {})[field_name] = guarded
~~~

\`protect\` wraps the resolver that is already registered (or the default one), so existing code needs no edits. Libraries offer the same idea as decorators (\`@permission_classes\` in Strawberry, directives in Ariadne). Where the schema itself should show the rule, a custom directive such as \`@auth(role: ADMIN)\` documents it for clients.

### Data-level filtering

When the rule is "only your rows", enforce it in the **query**, not after: \`orders\` loads \`WHERE user_id = <caller>\`. Filtering after loading means the data already left the database, and a forgotten filter later becomes a leak.

### Default deny

Prefer allow-lists to deny-lists: new fields should start protected and be opened deliberately. A test that walks every field of \`Query\` and \`Mutation\` and checks each against a "public" allow-list catches mistakes automatically (you will test authorization in the final lesson).

### Common mistakes

- Trusting a \`userId\` argument instead of the context.
- Authorizing the top-level field and forgetting the nested paths to the same data.
- Different answers for "does not exist" and "not yours", which turn the API into an oracle.
- Doing the check after side effects: validate permissions **first**.`,
    mission: `Anyone can list every user and read every email right now. Lock the shop down: orders belong to their owner, admins see everything, emails are private, and the error codes tell the client exactly which door is closed.

Pass this lesson and the client app gets an **Orders** screen for whoever is signed in and an **Admin** tab that shows what each role may see.`,
    tasks: [
      "Rules is_signed_in, is_admin and is_self_or_admin (a user may see their own row), and denied(info): ApiError UNAUTHENTICATED for anonymous callers, FORBIDDEN otherwise",
      "protect(type_name, field_name, rule, hide=False) wrapping the registered resolver; use it on Query.users (admin), Customer.orders (self or admin) and hide Customer.email and Admin.email unless self or admin",
      "New fields: orders (your own, via the loader), order(id) (yours or admin, otherwise null) and allOrders (admin only; prime the items loader)",
      "Rebuild the schema",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 11: authorization.

TYPE_DEFS += """
"""


def is_signed_in(parent, info, **args):
    ...


def is_admin(parent, info, **args):
    ...


def is_self_or_admin(parent, info, **args):
    """parent is a user row (Customer or Admin)."""
    ...


def denied(info):
    """UNAUTHENTICATED when nobody is signed in, FORBIDDEN when someone is."""
    ...


def protect(type_name, field_name, rule, hide=False):
    """Wrap the resolver registered for TypeName.field (or the default one) in a rule."""
    ...


# Apply it, then add Query.orders / order / allOrders resolvers. Check permissions FIRST.

schema = make_schema()
`,
    solutionAdd: py`TYPE_DEFS += """
extend type Query {
  orders: [Order!]!
  order(id: ID!): Order
  allOrders: [Order!]!
}
"""


def is_signed_in(parent, info, **args):
    return info.context.user is not None


def is_admin(parent, info, **args):
    user = info.context.user
    return user is not None and user["role"] == "ADMIN"


def is_self_or_admin(parent, info, **args):
    """parent is a user row (Customer or Admin)."""
    user = info.context.user
    return user is not None and (user["role"] == "ADMIN" or user["id"] == parent["id"])


def denied(info):
    """UNAUTHENTICATED when nobody is signed in, FORBIDDEN when someone is."""
    if info.context.user is None:
        return ApiError("You must be signed in.", "UNAUTHENTICATED")
    return ApiError("You are not allowed to do that.", "FORBIDDEN")


def protect(type_name, field_name, rule, hide=False):
    """Wrap the resolver registered for TypeName.field (or the default one) in a rule."""
    inner = RESOLVERS.get(type_name, {}).get(field_name, default_resolver)

    def guarded(parent, info, **args):
        if not rule(parent, info, **args):  # the check runs BEFORE any work is done
            if hide:
                return None
            raise denied(info)
        return inner(parent, info, **args)

    RESOLVERS.setdefault(type_name, {})[field_name] = guarded


@resolver("Query", "orders")
def resolve_my_orders(root, info):
    user = require_login(info)
    return loader(info.context, "orders").load(user["id"])  # only the caller's rows ever leave the database


@resolver("Query", "order")
def resolve_order(root, info, id):
    user = require_login(info)
    order = fetch_one(info.context.db, "SELECT * FROM orders WHERE id = ?", (id,))
    if order is None or (order["user_id"] != user["id"] and user["role"] != "ADMIN"):
        return None  # somebody else's order looks exactly like one that does not exist
    return order


@resolver("Query", "allOrders")
def resolve_all_orders(root, info):
    rows = fetch_all(info.context.db, "SELECT * FROM orders ORDER BY id")
    loader(info.context, "items").prime(row["id"] for row in rows)
    return rows


protect("Query", "allOrders", is_admin)
protect("Query", "users", is_admin)
protect("Customer", "orders", is_self_or_admin)
protect("Customer", "email", is_self_or_admin, hide=True)
protect("Admin", "email", is_self_or_admin, hide=True)

schema = make_schema()`,
    explanation:
      "Authorization lives where the data is resolved, so each rule is a small predicate applied with protect(), which wraps whatever resolver is registered without editing it. The same object reachable through many paths stays protected because the guard is on the type's field, not on one query. Ownership is enforced in the query itself (the loader only fetches the caller's rows), a foreign order looks like a missing one, and an email the caller may not see becomes null instead of breaking the page. The checks run first, before any work, and anonymous versus signed-in callers get different, machine-readable codes.",
    hints: [
      { id: "h1", title: "Rules", content: 'user = info.context.user. is_signed_in: user is not None. is_admin: user is not None and user["role"] == "ADMIN". is_self_or_admin: signed in and (admin or user["id"] == parent["id"]). denied(info): ApiError("You must be signed in.", "UNAUTHENTICATED") if user is None, else ApiError("You are not allowed to do that.", "FORBIDDEN").' },
      { id: "h2", title: "protect", content: "inner = RESOLVERS.get(type_name, {}).get(field_name, default_resolver) at the time protect is called. Define guarded(parent, info, **args): if not rule(parent, info, **args): return None if hide else raise denied(info); otherwise return inner(parent, info, **args). Store it back in RESOLVERS[type_name][field_name]. Register the plain resolver BEFORE calling protect on it." },
      { id: "h3", title: "New fields", content: 'orders: require_login(info) then loader(info.context, "orders").load(user["id"]). order(id): return None unless the row exists and (it is the caller\'s or the caller is ADMIN). allOrders: SELECT * FROM orders ORDER BY id, prime the "items" loader with the order ids, and protect it with is_admin.' },
      { id: "h4", title: "What to protect", content: 'protect("Query", "users", is_admin); protect("Customer", "orders", is_self_or_admin); and the email fields on BOTH implementing types with hide=True: protect("Customer", "email", is_self_or_admin, hide=True) and the same for Admin.' },
    ],
    tests: [
      {
        id: "t1",
        description: "Anonymous callers are UNAUTHENTICATED, signed-in customers FORBIDDEN, for admin-only data",
        assertionCode: T(py`_fresh()
for q in ("{ users { name } }", "{ allOrders { id } }"):
    r = _gql(q)
    assert _codes(r) == ["UNAUTHENTICATED"], q + " as an anonymous caller should fail with UNAUTHENTICATED, got " + repr(r.get("errors"))
    assert r["data"] is None, "These fields are non-null lists, so data is null"
    r = _gql(q, token="sam-token")
    assert _codes(r) == ["FORBIDDEN"], q + " as a customer should fail with FORBIDDEN, got " + repr(r.get("errors"))
a = _data(_gql("{ users { name } allOrders { id totalCents items { quantity } } }", token="admin-token"))
assert len(a["users"]) == 4 and len(a["allOrders"]) == 6, "An admin sees everyone and every order, got " + repr(a)
assert a["allOrders"][2]["totalCents"] == 22700, "Order 3 totals 12900 + 2 x 4900 = 22700"`),
      },
      {
        id: "t2",
        description: "orders returns only the caller's orders",
        assertionCode: T(py`_fresh()
r = _gql("{ orders { id } }")
assert _codes(r) == ["UNAUTHENTICATED"], "orders needs a signed-in caller, got " + repr(r.get("errors"))
assert [o["id"] for o in _data(_gql("{ orders { id } }", token="sam-token"))["orders"]] == ["1", "2", "6"], "Sam's orders"
assert [o["id"] for o in _data(_gql("{ orders { id status } }", token="priya-token"))["orders"]] == ["3", "4"], "Priya's orders"
assert _data(_gql("{ orders { id } }", token="admin-token"))["orders"] == [], "The admin has placed no orders: orders means MY orders"`),
      },
      {
        id: "t3",
        description: "order(id): yours, or admin, otherwise it looks like it does not exist",
        assertionCode: T(py`_fresh()
q = "query($id: ID!) { order(id: $id) { id totalCents } }"
assert _data(_gql(q, {"id": "3"}, token="priya-token"))["order"] == {"id": "3", "totalCents": 22700}, "Priya may read her order 3"
r = _gql(q, {"id": "3"}, token="sam-token")
assert r.get("errors") is None and r["data"] == {"order": None}, "Sam asking for Priya's order must look like 'not found' (null, no error), got " + repr(r)
assert _data(_gql(q, {"id": "999"}, token="sam-token"))["order"] is None, "A missing order is also null"
assert _data(_gql(q, {"id": "3"}, token="admin-token"))["order"]["id"] == "3", "Admins may read any order"
assert _codes(_gql(q, {"id": "3"})) == ["UNAUTHENTICATED"], "Anonymous callers are asked to sign in"`),
      },
      {
        id: "t4",
        description: "Emails are visible only to the owner and admins, on every path",
        assertionCode: T(py`_fresh()
me = _data(_gql("{ me { email } }", token="sam-token"))["me"]
assert me == {"email": "sam@example.com"}, "You can read your own email, got " + repr(me)
q = "{ product(id: 1) { reviews { author { name email } } } }"
rows = _data(_gql(q, token="sam-token"))["product"]["reviews"]
assert [(r["author"]["name"], r["author"]["email"]) for r in rows] == [("Sam Carter", "sam@example.com"), ("Priya Nair", None), ("Leo Park", None)], "Through review.author only Sam's own email shows, got " + repr(rows)
rows = _data(_gql(q))["product"]["reviews"]
assert all(r["author"]["email"] is None for r in rows), "Anonymous callers see no emails, and that is not an error"
rows = _data(_gql(q, token="admin-token"))["product"]["reviews"]
assert [r["author"]["email"] for r in rows] == ["sam@example.com", "priya@example.com", "leo@example.com"], "Admins see all emails"
a = _data(_gql("{ users { ... on Admin { email } } }", token="admin-token"))["users"][0]
assert a == {"email": "admin@pocketstore.test"}, "Admin.email is protected too (and visible to the admin)"
assert _data(_gql("{ me { email } }", token="admin-token"))["me"] == {"email": "admin@pocketstore.test"}`),
      },
      {
        id: "t5",
        description: "Other people's orders cannot be reached through the account either",
        assertionCode: T(py`_fresh()
q = "{ product(id: 1) { reviews { author { ... on Customer { orderCount orders { id } } } } } }"
r = _gql(q, token="sam-token")
assert "FORBIDDEN" in _codes(r), "Reading Priya's or Leo's orders through review.author must be FORBIDDEN, got " + repr(r.get("errors"))
assert all(e["path"][-1] == "orders" for e in r["errors"]), "The failing field is Customer.orders, got " + repr([e.get("path") for e in r["errors"]])
mine = _data(_gql("{ me { ... on Customer { orders { id } } } }", token="sam-token"))["me"]["orders"]
assert [o["id"] for o in mine] == ["1", "2", "6"], "Your own orders through me still work"
all_ = _data(_gql("{ users { ... on Customer { orders { id } } } }", token="admin-token"))["users"]
assert [len(u.get("orders", [])) for u in all_] == [0, 3, 2, 1], "An admin may read everyone's orders, got " + repr(all_)`),
      },
      {
        id: "t6",
        description: "protect() wraps any registered resolver and runs the rule first",
        assertionCode: T(py`_fresh()
calls = []
saved = dict(RESOLVERS.get("Query", {}))
RESOLVERS.setdefault("Query", {})["shopName"] = lambda root, info: calls.append("ran") or "Closed shop"
try:
    protect("Query", "shopName", lambda parent, info, **a: info.context.user is not None and info.context.user["role"] == "ADMIN")
    schema = make_schema()
    r = _gql("{ shopName }")
    assert _codes(r) == ["UNAUTHENTICATED"] and calls == [], "The rule must run before the resolver; anonymous gets UNAUTHENTICATED and the resolver must not run, got " + repr((r, calls))
    r = _gql("{ shopName }", token="sam-token")
    assert _codes(r) == ["FORBIDDEN"] and calls == [], "A signed-in non-admin gets FORBIDDEN"
    assert _data(_gql("{ shopName }", token="admin-token")) == {"shopName": "Closed shop"} and calls == ["ran"], "An admin reaches the original resolver"
    RESOLVERS["Query"]["shopName"] = lambda root, info: "x"
    protect("Query", "shopName", lambda *a, **k: False, hide=True)
    schema = make_schema()
    r = _gql("{ tagline }")
    assert _data(r) == {"tagline": "Small things for big desks"}, "Other fields are untouched"
finally:
    RESOLVERS["Query"] = saved
    schema = make_schema()`),
      },
    ],
    unlocks: ["gql-orders"],
    checks: [
      {
        prompt: "Sam asks for `order(id: 3)`, which belongs to Priya. What is the best response?",
        question: {
          type: "choice",
          options: [
            "null with no error, exactly like an order that does not exist",
            "A FORBIDDEN error, so Sam knows it exists",
            "The order, but with the items removed",
            "A 500 error",
          ],
          answer: 0,
        },
        explanation:
          "Telling Sam \"forbidden\" confirms that order 3 exists, which lets an attacker enumerate ids. Answering exactly as for a missing record reveals nothing.",
      },
      {
        prompt: "Why must a user's email be protected on the `Customer` type itself instead of only on `Query.users`?",
        question: {
          type: "choice",
          options: [
            "The same object is reachable by other paths (me, review.author, order.items...), and the rule must follow the field",
            "Because Query.users cannot be protected",
            "Because Customer is faster to check",
            "It does not matter; protecting the entry point is enough",
          ],
          answer: 0,
        },
        explanation:
          "A graph has many routes to the same node. Guarding one door leaves the others open. Putting the rule on the type's field protects every path at once.",
      },
      {
        prompt: "An `isAdmin` flag is hidden by the mobile app for normal users. Is that an authorization control?",
        question: {
          type: "choice",
          options: [
            "No: the client is under the user's control, so the server must enforce the rule",
            "Yes, if the flag is hidden well",
            "Yes, but only for mutations",
            "Only when the app is also obfuscated",
          ],
          answer: 0,
        },
        explanation:
          "Anything the client does is advisory. A hostile client can send any query it likes, so enforcement must happen in resolvers.",
      },
    ],
  },

  // ───────────────────────────────────────── 12. limits
  {
    id: "graphql-gateway-12-limits",
    title: "Defend against abusive queries",
    minutes: 50,
    xp: 240,
    concepts: ["depth limit", "complexity / cost analysis", "validation rules", "AST visiting", "query size", "fragments"],
    learn: `### The flexibility is also the attack surface

Because the client writes the query, a malicious (or just careless) client can write an **expensive** one. Three common shapes:

- **Deep cycles.** The graph has loops: \`category → products → category → products ...\`. Nothing stops \`{ categories { products { category { products { category { ... } } } } } }\` from going twenty levels deep. The work grows exponentially with depth.
- **Alias bombs.** Aliases let one request repeat an expensive field a hundred times.
- **Huge lists.** \`products(limit: 100000)\`, or batching thousands of operations into one request.

Rate limiting by request count (as in the REST project) does not help: one request can do the work of ten thousand.

### Defences, in order of cheapness

1. **Reject early, before any resolver runs.** Everything below is *static analysis* done during validation, so an abusive query costs microseconds.
2. **Size limit** on the query text.
3. **Depth limit.** Count the deepest nesting of fields.
4. **Complexity (cost) limit.** Estimate how many objects the query could return: every field costs 1, and a list field multiplies the cost of its children by the page size. Reject above a budget.
5. **Caps on arguments** (\`first <= 50\`), already part of the schema design.
6. **Timeouts and allow-lists.** A per-request timeout (the demo's 0.25 s hook limit is one). Production APIs often register only **persisted queries** the app ships with, and refuse everything else.

### Validation rules

The pipeline from lesson 3 already runs \`validate(schema, document, rules)\`. A rule is a class with methods named \`enter_<node type>\` that graphql-core calls as it walks the document. Report a problem with \`self.report_error(GraphQLError(...))\`. Our \`EXTRA_RULES\` plug-in takes any number of them:

~~~python
class NoTagline(ValidationRule):
    def enter_field(self, node, *args):
        if node.name.value == "tagline":
            self.report_error(GraphQLError("tagline is banned today", node))
~~~

For limits, hook \`enter_operation_definition\` and analyse the operation's selection set yourself. \`self.context.get_fragment(name)\` finds a fragment definition and \`self.context.schema\` gives types.

### Measuring depth

Walk the selection set. A **field** adds 1 plus the depth beneath it; an **inline fragment** adds nothing by itself; a **fragment spread** continues into the fragment's selection set. Fragments are how people hide depth, so you *must* follow them, and guard against cycles (a fragment spreading itself) with a "seen" set so your rule never loops. Skip \`__schema\` and \`__type\`: introspection is legitimately deep and is gated separately (lesson 13).

### Measuring cost

Walk the same tree, now with the schema's types, to know which fields return lists:

- a leaf costs 1;
- an object field costs \`1 + cost of its children\`;
- a **list** field costs \`1 + page_size * cost of its children\`, where the page size is the \`first\`/\`limit\` argument, or a default of 10 when absent;
- a connection field like \`productsConnection(first: 20)\` is not itself a list, but its \`edges\` list inherits that 20.

Static analysis cannot see variable *values*, so for \`$first\` assume the worst case you allow (we use 50). Teams tune the budget against their real screens: set it just above the heaviest legitimate query.

### Good errors

Return a clear message with the numbers (\`Query cost 9060 exceeds the limit of 1000\`) and a stable code (\`DEPTH_LIMIT_EXCEEDED\`, \`COMPLEXITY_LIMIT_EXCEEDED\`, \`QUERY_TOO_LARGE\`) so a legitimate client can adapt.

### Common mistakes

- Counting only the top-level fields (aliases and fragments hide the rest).
- Recursing into fragments without a seen-set: a cyclic fragment crashes the server before the standard cycle rule reports it.
- Limiting depth but not width. Both matter.
- Blocking introspection with the depth limit and breaking every tool.`,
    mission: `Someone just sent your gateway a query nested twenty levels deep and it ground to a halt. Teach the gateway to say no, **before** running a single resolver: a query size cap, a depth limit and a cost budget, as validation rules.

When you pass, the **Abuse lab** opens: fire a deep cycle, an alias bomb and a huge page at your own server and watch each one get rejected, while a heavy but legitimate query still goes through.`,
    tasks: [
      "Constants MAX_QUERY_CHARS = 4000, MAX_DEPTH = 7, MAX_COST = 1000, DEFAULT_LIST_SIZE = 10 and MAX_PAGE_SIZE = 50",
      "selection_depth(context, selection_set, seen=()): follows fragments (with a cycle guard) and ignores __schema and __type",
      "requested_size(field_node) and selection_cost(context, selection_set, parent_type, page=None, seen=()): list fields multiply, connection fields pass their size down to edges, unknown variable sizes assume MAX_PAGE_SIZE",
      "Rules MaxQuerySize, MaxDepth, MaxCost reporting GraphQLErrors with codes QUERY_TOO_LARGE, DEPTH_LIMIT_EXCEEDED and COMPLEXITY_LIMIT_EXCEEDED (message with the numbers), appended to EXTRA_RULES",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 12: query limits as validation rules.
from graphql import get_named_type, get_nullable_type, is_list_type
from graphql.language import FieldNode, FragmentSpreadNode, InlineFragmentNode, IntValueNode
from graphql.validation import ValidationRule

MAX_QUERY_CHARS = 4000
MAX_DEPTH = 7
MAX_COST = 1000
DEFAULT_LIST_SIZE = 10  # assumed length of a list field with no first/limit argument
MAX_PAGE_SIZE = 50  # assumed value for a first/limit that is a $variable (worst case we allow)


def selection_depth(context, selection_set, seen=()):
    """Deepest nesting of fields below this selection set. Follow fragments; skip __schema and __type."""
    ...


def requested_size(node):
    """The first/limit argument of a field node: its literal value, MAX_PAGE_SIZE for a variable, None if absent."""
    ...


def selection_cost(context, selection_set, parent_type, page=None, seen=()):
    """Estimated number of objects this selection could produce. See the lesson for the model."""
    ...


class MaxQuerySize(ValidationRule):
    ...


class MaxDepth(ValidationRule):
    ...


class MaxCost(ValidationRule):
    ...


# EXTRA_RULES.extend([MaxQuerySize, MaxDepth, MaxCost])
`,
    solutionAdd: py`from graphql import get_named_type, get_nullable_type, is_list_type
from graphql.language import FieldNode, FragmentSpreadNode, InlineFragmentNode, IntValueNode
from graphql.validation import ValidationRule

MAX_QUERY_CHARS = 4000
MAX_DEPTH = 7
MAX_COST = 1000
DEFAULT_LIST_SIZE = 10  # assumed length of a list field with no first/limit argument
MAX_PAGE_SIZE = 50  # assumed value for a first/limit that is a $variable (worst case we allow)


def selection_depth(context, selection_set, seen=()):
    """Deepest nesting of fields below this selection set. Follow fragments; skip __schema and __type."""
    deepest = 0
    for node in selection_set.selections:
        if isinstance(node, FieldNode):
            if node.name.value in ("__schema", "__type"):
                continue  # introspection has its own switch (lesson 13)
            below = selection_depth(context, node.selection_set, seen) if node.selection_set else 0
            deepest = max(deepest, 1 + below)
        elif isinstance(node, InlineFragmentNode):
            deepest = max(deepest, selection_depth(context, node.selection_set, seen))
        elif isinstance(node, FragmentSpreadNode):
            name = node.name.value
            fragment = context.get_fragment(name)
            if fragment is not None and name not in seen:  # 'seen' stops cyclic fragments
                deepest = max(deepest, selection_depth(context, fragment.selection_set, seen + (name,)))
    return deepest


def requested_size(node):
    """The first/limit argument of a field node: its literal value, MAX_PAGE_SIZE for a variable, None if absent."""
    for argument in node.arguments:
        if argument.name.value in ("first", "limit"):
            if isinstance(argument.value, IntValueNode):
                return int(argument.value.value)
            return MAX_PAGE_SIZE  # a $variable: its value is unknown while validating
    return None


def selection_cost(context, selection_set, parent_type, page=None, seen=()):
    """Estimated number of objects this selection could produce. See the lesson for the model."""
    cost = 0
    for node in selection_set.selections:
        if isinstance(node, FieldNode):
            name = node.name.value
            if name.startswith("__"):
                continue
            field = getattr(parent_type, "fields", {}).get(name)
            if field is None:
                continue  # an unknown field is reported by the standard rules
            size = requested_size(node)
            multiplier, child_page = 1, None
            if is_list_type(get_nullable_type(field.type)):
                multiplier = size or page or DEFAULT_LIST_SIZE
            elif size:
                child_page = size  # a connection: its edges list inherits the requested page size
            below = 0
            if node.selection_set:
                below = selection_cost(context, node.selection_set, get_named_type(field.type), child_page, seen)
            cost += 1 + multiplier * below
        elif isinstance(node, InlineFragmentNode):
            on = context.schema.get_type(node.type_condition.name.value) if node.type_condition else parent_type
            cost += selection_cost(context, node.selection_set, on, page, seen)
        elif isinstance(node, FragmentSpreadNode):
            name = node.name.value
            fragment = context.get_fragment(name)
            if fragment is not None and name not in seen:
                on = context.schema.get_type(fragment.type_condition.name.value)
                cost += selection_cost(context, fragment.selection_set, on, page, seen + (name,))
    return cost


class MaxQuerySize(ValidationRule):
    def enter_document(self, node, *_args):
        size = len(node.loc.source.body) if node.loc else 0
        if size > MAX_QUERY_CHARS:
            self.report_error(
                GraphQLError(f"The query is {size} characters long; the limit is {MAX_QUERY_CHARS}.", extensions={"code": "QUERY_TOO_LARGE"})
            )


class MaxDepth(ValidationRule):
    def enter_operation_definition(self, node, *_args):
        depth = selection_depth(self.context, node.selection_set)
        if depth > MAX_DEPTH:
            self.report_error(
                GraphQLError(f"Query depth {depth} exceeds the limit of {MAX_DEPTH}.", node, extensions={"code": "DEPTH_LIMIT_EXCEEDED"})
            )


class MaxCost(ValidationRule):
    def enter_operation_definition(self, node, *_args):
        root = self.context.schema.get_root_type(node.operation)
        cost = selection_cost(self.context, node.selection_set, root)
        if cost > MAX_COST:
            self.report_error(
                GraphQLError(f"Query cost {cost} exceeds the limit of {MAX_COST}.", node, extensions={"code": "COMPLEXITY_LIMIT_EXCEEDED"})
            )


EXTRA_RULES.extend([MaxQuerySize, MaxDepth, MaxCost])`,
    explanation:
      "Validation runs before any resolver, so static limits turn an expensive attack into a cheap rejection. Depth is the deepest field nesting with fragments followed (and a seen-set so cyclic fragments cannot loop). Cost multiplies list fields by their page size, passes a connection's size down to its edges, and assumes the worst case for variables because their values are unknown at validation time. The three rules report GraphQLErrors with stable codes and the actual numbers, and they skip introspection so tools such as GraphiQL keep working.",
    hints: [
      { id: "h1", title: "Depth", content: "Loop over selection_set.selections. FieldNode: skip __schema and __type; depth = 1 + (selection_depth of its own selection_set if it has one, else 0). InlineFragmentNode: depth of its selection_set (adds nothing itself). FragmentSpreadNode: fragment = context.get_fragment(name); recurse into fragment.selection_set unless name is already in seen. Take the max." },
      { id: "h2", title: "Cost model", content: "For each field: size = requested_size(node); if the field's type is a list (is_list_type(get_nullable_type(field.type))) then multiplier = size or page or DEFAULT_LIST_SIZE; elif size: child_page = size. cost += 1 + multiplier * (cost of children, with get_named_type(field.type) as their parent_type and child_page as page). Leaves have no selection_set, so their children cost 0." },
      { id: "h3", title: "Fragments in the cost walk", content: "Inline fragment: the parent type becomes context.schema.get_type(node.type_condition.name.value) (or stays the same if there is no type condition). Fragment spread: look up the definition with context.get_fragment and use its type_condition the same way; pass seen + (name,) to guard against cycles." },
      { id: "h4", title: "The rules", content: "MaxQuerySize.enter_document(self, node, *args): len(node.loc.source.body). MaxDepth and MaxCost use enter_operation_definition(self, node, *args); the root type is self.context.schema.get_root_type(node.operation). report_error(GraphQLError(message, node, extensions={\"code\": ...})). Finish with EXTRA_RULES.extend([...])." },
    ],
    tests: [
      {
        id: "t1",
        description: "Normal client queries still run",
        assertionCode: T(py`_fresh()
ok = [
    ("{ shopName tagline openingHours }", None, None),
    ("query Home { categories { id name } newArrivals { id name priceCents inStock } }", None, None),
    ("query P($id: ID!) { product(id: $id) { id name category { name } reviews { id rating body createdAt author { name } } averageRating } }", {"id": "1"}, None),
    ("query B($first: Int, $after: String, $filter: ProductFilter, $sort: ProductSort) { productsConnection(first: $first, after: $after, filter: $filter, sort: $sort) { totalCount pageInfo { hasNextPage endCursor } edges { cursor node { id name priceCents category { name } } } } }", {"first": 6, "sort": "PRICE_DESC"}, None),
    ("query O { orders { id status createdAt totalCents items { quantity product { name } } } }", None, "sam-token"),
    ("query Legit { products(limit: 16) { name category { name } reviews { rating author { name } } } }", None, None),
]
for q, v, tok in ok:
    r = _gql(q, v, token=tok)
    assert not r.get("errors"), "A legitimate query was rejected: " + q[:60] + "... -> " + repr(r.get("errors"))`),
      },
      {
        id: "t2",
        description: "A deep cycle is rejected by the depth limit, before any resolver runs",
        assertionCode: T(py`_fresh()
q = "query DeepCycle { categories { products { category { products { category { products { category { products { name } } } } } } } } }"
ran = []
def spy(next_, root, info, **args):
    ran.append(info.field_name)
    return next_(root, info, **args)
MIDDLEWARE.append(spy)
try:
    r = _gql(q)
finally:
    MIDDLEWARE.remove(spy)
assert r.get("errors") and "DEPTH_LIMIT_EXCEEDED" in _codes(r), "A query nested 9 levels deep must fail with DEPTH_LIMIT_EXCEEDED, got " + repr(r.get("errors"))
assert r["data"] is None and ran == [], "Rejected during validation: no data, and no resolver may have run (ran: " + repr(ran) + ")"
msg = [m for m in _msgs(r) if "depth" in m.lower()][0]
assert "9" in msg and str(MAX_DEPTH) in msg, "The message should include the depth (9) and the limit, got " + msg
ok7 = "{ order(id: 3) { items { product { category { products { category { name } } } } } } }"
assert not _gql(ok7, token="priya-token").get("errors"), "Depth 7 is exactly at the limit and allowed, got " + repr(_gql(ok7, token="priya-token").get("errors"))`),
      },
      {
        id: "t3",
        description: "Fragments cannot be used to hide depth",
        assertionCode: T(py`_fresh()
q = """query Sneaky { categories { ...A } }
fragment A on Category { products { ...B } }
fragment B on Product { category { ...C } }
fragment C on Category { products { category { products { category { name } } } } }"""
r = _gql(q)
assert "DEPTH_LIMIT_EXCEEDED" in _codes(r), "The fragments add up to depth 8 and must be followed, got " + repr(r.get("errors"))
q = "{ categories { products { category { products { category { products { ... on Product { category { name } } } } } } } } }"
assert "DEPTH_LIMIT_EXCEEDED" in _codes(_gql(q)), "Inline fragments do not hide depth either"`),
      },
      {
        id: "t4",
        description: "Cyclic fragments produce a normal validation error, not a crash",
        assertionCode: T(py`_fresh()
q = "query Cyc { categories { ...A } } fragment A on Category { products { category { ...A } } }"
r = _gql(q)
assert r.get("errors"), "A fragment that spreads itself is invalid and must be reported"
assert any("itself" in m for m in _msgs(r)), "GraphQL's own cycle rule should explain it ('within itself'), got " + repr(_msgs(r))`),
      },
      {
        id: "t5",
        description: "An alias bomb exceeds the cost budget",
        assertionCode: T(py`_fresh()
bomb = "query AliasBomb {\n" + "\n".join("  a" + str(i) + ": products(limit: 50) { name category { name } }" for i in range(60)) + "\n}"
assert len(bomb) < MAX_QUERY_CHARS * 2
r = _gql(bomb)
assert "COMPLEXITY_LIMIT_EXCEEDED" in _codes(r), "60 aliases of a 50-row list must exceed the cost limit, got " + repr(r.get("errors"))
msg = [m for m in _msgs(r) if "cost" in m.lower()][0]
assert str(MAX_COST) in msg, "The message should mention the limit, got " + msg
assert r["data"] is None
assert not _gql("{ products(limit: 5) { name category { name } } }").get("errors"), "A small list is fine"
huge = _gql("query { products(limit: 100000) { id } }")
assert huge.get("errors") and huge["data"] is None, "A 100000-row page must be refused (by cost or by the argument check)"`),
      },
      {
        id: "t6",
        description: "Variables cannot dodge the cost check",
        assertionCode: T(py`_fresh()
q = "query V($n: Int) {\n" + "\n".join("  a" + str(i) + ": products(limit: $n) { name category { name } }" for i in range(20)) + "\n}"
r = _gql(q, {"n": 50})
assert "COMPLEXITY_LIMIT_EXCEEDED" in _codes(r), "Static analysis can't see $n, so it must assume the worst case page size (MAX_PAGE_SIZE), got " + repr(r.get("errors"))
c = "query Page($first: Int) { productsConnection(first: $first) { edges { node { id name } } } }"
assert not _gql(c, {"first": 6}).get("errors"), "A connection with a variable page size is within budget"
big = "{ productsConnection(first: 50) { edges { node { id name reviews { rating author { name } } } } } a: productsConnection(first: 50) { edges { node { id name reviews { rating author { name } } } } } }"
assert "COMPLEXITY_LIMIT_EXCEEDED" in _codes(_gql(big)), "A connection's edges inherit its first, so two 50-row connections with reviews exceed the budget, got " + repr(_gql(big).get("errors"))`),
      },
      {
        id: "t7",
        description: "Huge query text is refused",
        assertionCode: T(py`_fresh()
q = "{ " + " ".join("a" + str(i) + ": shopName" for i in range(300)) + " }"
assert len(q) > MAX_QUERY_CHARS
r = _gql(q)
assert _codes(r) == ["QUERY_TOO_LARGE"], "A query longer than MAX_QUERY_CHARS must fail with QUERY_TOO_LARGE, got " + repr(r.get("errors"))
assert not _gql("{ " + " ".join("a" + str(i) + ": shopName" for i in range(20)) + " }").get("errors"), "Short queries are fine"`),
      },
      {
        id: "t8",
        description: "Introspection is not caught by the limits",
        assertionCode: T(py`from graphql import get_introspection_query
_fresh()
r = _gql(get_introspection_query(descriptions=True))
assert not r.get("errors"), "The standard introspection query is deep and wide but must be exempt from the depth and cost rules, got " + repr(r.get("errors"))
assert len(r["data"]["__schema"]["types"]) > 20
r = _gql("{ __type(name: \"Product\") { name fields { name type { name kind ofType { name kind ofType { name kind ofType { name } } } } } } }")
assert not r.get("errors"), "__type queries are exempt too, got " + repr(r.get("errors"))`),
      },
    ],
    unlocks: ["gql-limits"],
    checks: [
      {
        prompt: "Why are depth and cost limits implemented as **validation rules** rather than inside resolvers?",
        question: {
          type: "choice",
          options: [
            "They run before execution, so an abusive query is refused without running any resolver or touching the database",
            "Resolvers cannot see the query",
            "Validation rules run on every field, which is faster",
            "GraphQL forbids raising errors in resolvers",
          ],
          answer: 0,
        },
        explanation:
          "By the time a resolver runs, the work has started. Static analysis during validation rejects the request at the cheapest possible moment.",
      },
      {
        prompt: "A depth limit is in place. A client sends 200 aliases of `{ products(limit: 100) { name } }` (depth 2). Which defence catches it?",
        question: {
          type: "choice",
          options: [
            "The cost (complexity) limit, because depth stays low while the total work explodes",
            "The depth limit, because 200 is a large number",
            "Nothing needs to catch it; aliases are free",
            "Only a firewall",
          ],
          answer: 0,
        },
        explanation:
          "Depth measures how deep a query goes, not how wide. An alias bomb is shallow but enormous, which is exactly what a cost budget estimates.",
      },
      {
        prompt: "Your depth rule recurses into fragment spreads. What stops `fragment A on Category { ...A }` from recursing forever?",
        question: {
          type: "choice",
          options: [
            "A seen-set of fragment names already on the current path",
            "Python's garbage collector",
            "GraphQL parses fragments into flat lists",
            "Nothing: the server simply times out",
          ],
          answer: 0,
        },
        explanation:
          "Validation rules run side by side, so your rule can be reached before the standard cycle rule reports the problem. Remembering which fragments you are already inside keeps the walk finite.",
      },
    ],
  },

  // ───────────────────────────────────────── 13. introspection
  {
    id: "graphql-gateway-13-introspection",
    title: "Introspection, docs and deprecation",
    minutes: 40,
    xp: 190,
    concepts: ["introspection", "__schema / __type", "descriptions", "@deprecated", "print_schema", "disabling introspection"],
    learn: `### A schema that describes itself

Every GraphQL server answers questions about its own schema with the same query language. Two special root fields exist on every schema:

~~~graphql
{
  __schema { queryType { name } types { name kind } }
  __type(name: "Product") { name kind fields { name type { name kind ofType { name kind } } } }
}
~~~

That is **introspection**. It powers GraphiQL's documentation panel and autocomplete, code generators that create typed clients, linters and schema registries. The scene's **Docs** browser is built from nothing but introspection queries sent to your \`execute()\`: first the list of type names, then the details of a few types at a time (the standard all-in-one query, \`get_introspection_query()\`, works too, but in pure Python it is slow enough that real tools often split it up or cache it).

### Type references

Types are described by a nested structure, because \`[Review!]!\` is "non-null of list of non-null of Review":

~~~json
{"kind": "NON_NULL", "ofType": {"kind": "LIST", "ofType": {"kind": "NON_NULL", "ofType": {"kind": "OBJECT", "name": "Review", "ofType": null}}}}
~~~

Tools turn that back into text by recursion. You will write that function.

### Descriptions

Fields and types can carry **descriptions**, shown by every tool. In SDL they are strings or blocks right before the definition:

~~~graphql
"""A thing the shop sells."""
type Product {
  "Price in cents. Money is never a Float."
  priceCents: Int!
}
~~~

Our schema was assembled from earlier SDL, so we attach descriptions afterwards from a dictionary. Good descriptions say what a field *means*, units, and whether it can be null and why. They are the cheapest documentation you can write because they live next to the code and ship with every release.

### Deprecation: change without breaking

Never delete a field clients still use. Mark it \`@deprecated\`, tell people what replaces it, and remove it only when usage reaches zero:

~~~graphql
legacyPrice: Float @deprecated(reason: "Use priceCents. Floats cannot hold money exactly.")
~~~

Deprecated fields are still served; tools show them struck through. This is why GraphQL APIs do not need \`/v1\`, \`/v2\` prefixes: the schema evolves additively. Adding fields is safe. Removing a field, making an argument required, or changing a type is a **breaking change**; \`graphql.find_breaking_changes(old_schema, new_schema)\` lists them (you will use it in the final lesson).

### Printing the schema

\`print_schema(schema)\` returns the schema as SDL, descriptions and deprecations included. Teams commit that file (\`schema.graphql\`) so that every change to the API shows up in code review, and generate clients from it.

### Should production allow introspection?

It is a debate. For a **public** API, introspection is the documentation. For a **private** API used by your own app, some teams disable it in production to avoid handing attackers a map. The honest view: hiding the schema is *obscurity*, not security, because clients still send queries and error messages can leak field names. Real protection is authorization and limits (lessons 11 and 12). If you do disable it, do it with a validation rule (graphql-core ships \`NoSchemaIntrospectionCustomRule\`) and keep it switchable, since developers need it in staging. Note that \`__typename\` must keep working: clients rely on it.

### Common mistakes

- Undocumented fields: a schema with no descriptions is a puzzle.
- Deleting a field instead of deprecating it.
- Disabling introspection and believing the API is now secure.
- Assuming a type reference is a name: lists and non-null wrap the real type several levels deep.`,
    mission: `The web team wants generated docs, the mobile team wants to know which fields are safe to use, and you want to be able to retire \`price\` floats. Describe the schema, deprecate a field the right way, give the gateway a switch for introspection, and write the function that turns introspection back into readable types.

The scene's **Docs browser** lights up, built from your own introspection, with a **Production mode** toggle that calls your switch.`,
    tasks: [
      "DESCRIPTIONS (a dict like {'Product': text, 'Product.priceCents': text}) and apply_descriptions(schema); describe at least Product, Product.priceCents, Query.products and Mutation.placeOrder; keep a deprecated legacyPrice: Float field (reason mentions priceCents) and resolve it; rebuild and apply",
      "ALLOW_INTROSPECTION flag, a rule ProductionIntrospectionGate that reports errors for __schema/__type only while the flag is False (append it to EXTRA_RULES), and the hook set_introspection(enabled)",
      "schema_sdl(): the schema as SDL text",
      "type_to_string(type_ref) and type_summary(name): run an introspection query through execute() and return {name, kind, fields: [{name, type}], values: [...]} or None for unknown types",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 13: introspection.
from graphql import NoSchemaIntrospectionCustomRule, print_schema

# 1) Document the schema and retire a field politely.
TYPE_DEFS += """
"""

DESCRIPTIONS = {
    # "Product": "A thing the shop sells.",
    # "Product.priceCents": "Price in cents ...",
}


def apply_descriptions(schema):
    """Set .description on the types and fields named in DESCRIPTIONS ('Type' or 'Type.member')."""
    ...


# 2) The introspection switch.
ALLOW_INTROSPECTION = True


class ProductionIntrospectionGate(NoSchemaIntrospectionCustomRule):
    """Behaves like graphql-core's rule, but only while ALLOW_INTROSPECTION is False."""

    ...


def set_introspection(enabled):
    """Hook: turn introspection on or off. Returns the new state."""
    ...


# 3) Printing and reading the schema.
def schema_sdl():
    ...


def type_to_string(type_ref):
    """{'kind': 'NON_NULL', 'ofType': {...}} -> '[Review!]!'"""
    ...


def type_summary(name):
    """Use __type(name: ...) through execute(). Return None for unknown types."""
    ...


# rebuild: schema = make_schema(); apply_descriptions(schema)
`,
    solutionAdd: py`from graphql import NoSchemaIntrospectionCustomRule, print_schema

TYPE_DEFS += """
extend type Product {
  legacyPrice: Float @deprecated(reason: "Use priceCents. Floats cannot hold money exactly.")
}
"""

DESCRIPTIONS = {
    "Query": "Everything a client can read.",
    "Query.products": "A page of products, optionally limited to one category (by slug). Use productsConnection for stable paging.",
    "Query.productsConnection": "Products as a Relay-style connection with filtering, sorting and cursors.",
    "Mutation": "Everything a client can change. Top-level fields run one after another.",
    "Mutation.placeOrder": "Buy products in one transaction: all lines succeed or none do.",
    "Product": "Something the shop sells.",
    "Product.priceCents": "Price in cents. Money is never a Float.",
    "Product.averageRating": "Mean review rating rounded to one decimal, or null when nobody has reviewed it.",
    "Product.shippingEstimate": "Delivery estimate from the shipping service. Null if that service fails.",
    "Account": "Anybody who can sign in.",
    "Account.email": "Visible only to the account owner and admins; null for everyone else.",
}


def apply_descriptions(schema):
    """Set .description on the types and fields named in DESCRIPTIONS ('Type' or 'Type.member')."""
    for key, text in DESCRIPTIONS.items():
        type_name, _, member = key.partition(".")
        graphql_type = schema.type_map.get(type_name)
        if graphql_type is None:
            continue
        if not member:
            graphql_type.description = text
            continue
        members = getattr(graphql_type, "fields", None) or getattr(graphql_type, "values", None) or {}
        if member in members:
            members[member].description = text


@resolver("Product", "legacyPrice")
def resolve_legacy_price(product, info):
    return product["price_cents"] / 100


ALLOW_INTROSPECTION = True


class ProductionIntrospectionGate(NoSchemaIntrospectionCustomRule):
    """Behaves like graphql-core's rule, but only while ALLOW_INTROSPECTION is False."""

    def enter_field(self, node, *args):
        if ALLOW_INTROSPECTION:
            return None
        return super().enter_field(node, *args)


EXTRA_RULES.append(ProductionIntrospectionGate)


def set_introspection(enabled):
    """Hook: turn introspection on or off. Returns the new state."""
    global ALLOW_INTROSPECTION
    ALLOW_INTROSPECTION = bool(enabled)
    return ALLOW_INTROSPECTION


def schema_sdl():
    return print_schema(schema)


def type_to_string(type_ref):
    """{'kind': 'NON_NULL', 'ofType': {...}} -> '[Review!]!'"""
    kind = type_ref["kind"]
    if kind == "NON_NULL":
        return type_to_string(type_ref["ofType"]) + "!"
    if kind == "LIST":
        return "[" + type_to_string(type_ref["ofType"]) + "]"
    return type_ref["name"]


TYPE_QUERY = """
query TypeSummary($name: String!) {
  __type(name: $name) {
    name
    kind
    fields { name type { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name } } } } } }
    enumValues { name }
  }
}
"""


def type_summary(name):
    """Use __type(name: ...) through execute(). Return None for unknown types."""
    found = execute({"query": TYPE_QUERY, "variables": {"name": name}}).get("data", {}).get("__type")
    if found is None:
        return None
    return {
        "name": found["name"],
        "kind": found["kind"],
        "fields": [{"name": f["name"], "type": type_to_string(f["type"])} for f in found["fields"] or []],
        "values": [v["name"] for v in found["enumValues"] or []],
    }


schema = make_schema()
apply_descriptions(schema)  # descriptions live outside the SDL, so re-apply after every rebuild`,
    explanation:
      "Introspection is just more GraphQL: __schema and __type are root fields served from the schema object, which is how docs, autocomplete and code generators work. Descriptions and @deprecated are metadata that ride along, so documentation and polite evolution ship with the API. A types reference is a nested NON_NULL/LIST wrapper, and printing it is a small recursion. The gate is a validation rule that checks a switch at request time, so introspection can be turned off for production and back on without rebuilding anything, while __typename keeps working because it is not an introspection type.",
    hints: [
      { id: "h1", title: "Descriptions", content: "apply_descriptions: for key, text in DESCRIPTIONS.items(): type_name, _, member = key.partition('.'); look up schema.type_map.get(type_name); with no member set graphql_type.description = text; otherwise members = getattr(graphql_type, 'fields', None) or getattr(graphql_type, 'values', None) or {} and set members[member].description = text when the member exists." },
      { id: "h2", title: "Deprecated field", content: 'extend type Product { legacyPrice: Float @deprecated(reason: "Use priceCents. Floats cannot hold money exactly.") } and a resolver returning product["price_cents"] / 100. Finish with schema = make_schema() followed by apply_descriptions(schema).' },
      { id: "h3", title: "The gate", content: "Subclass NoSchemaIntrospectionCustomRule and override enter_field(self, node, *args): return None while ALLOW_INTROSPECTION is True, otherwise return super().enter_field(node, *args). Append the class to EXTRA_RULES. set_introspection must declare global ALLOW_INTROSPECTION before assigning it." },
      { id: "h4", title: "type_to_string", content: "Recurse: NON_NULL -> type_to_string(ofType) + '!'; LIST -> '[' + type_to_string(ofType) + ']'; anything else -> its 'name'. type_summary runs query($name: String!) { __type(name: $name) { name kind fields { name type { ...nested ofType... } } enumValues { name } } } with execute({'query': ..., 'variables': {'name': name}}); fields and enumValues are null when not applicable." },
    ],
    tests: [
      {
        id: "t1",
        description: "Introspection describes the whole schema, including abstract and input types",
        assertionCode: T(py`_fresh()
d = _data(_gql("{ __schema { queryType { name } mutationType { name } types { name kind } } }"))["__schema"]
assert d["queryType"]["name"] == "Query" and d["mutationType"]["name"] == "Mutation", "Root types Query and Mutation"
kinds = {t["name"]: t["kind"] for t in d["types"]}
for name, kind in (("Product", "OBJECT"), ("Account", "INTERFACE"), ("SearchResult", "UNION"), ("Role", "ENUM"), ("ReviewInput", "INPUT_OBJECT"), ("ProductConnection", "OBJECT"), ("ID", "SCALAR")):
    assert kinds.get(name) == kind, name + " should be a " + kind + ", got " + repr(kinds.get(name))
t = _data(_gql('{ __type(name: "Nope") { name } }'))["__type"]
assert t is None, "__type of an unknown name is null"`),
      },
      {
        id: "t2",
        description: "Descriptions are served through introspection",
        assertionCode: T(py`_fresh()
q = '{ __type(name: "Product") { description fields { name description } } }'
d = _data(_gql(q))["__type"]
assert d["description"], "Product needs a description"
fields = {f["name"]: f["description"] for f in d["fields"]}
assert fields["priceCents"] and "cents" in fields["priceCents"].lower(), "Product.priceCents should be documented and mention cents, got " + repr(fields["priceCents"])
q = '{ q: __type(name: "Query") { fields { name description } } m: __type(name: "Mutation") { fields { name description } } }'
d = _data(_gql(q))
assert {f["name"]: f["description"] for f in d["q"]["fields"]}["products"], "Query.products needs a description"
assert {f["name"]: f["description"] for f in d["m"]["fields"]}["placeOrder"], "Mutation.placeOrder needs a description"
a = _data(_gql('{ __type(name: "Account") { description } }'))["__type"]["description"]
assert a, "The Account interface should be described as well"
s = make_schema()
apply_descriptions(s)
assert s.type_map["Product"].description and s.type_map["Product"].fields["priceCents"].description, "apply_descriptions(schema) must work on any freshly built schema"`),
      },
      {
        id: "t3",
        description: "legacyPrice is deprecated but still works",
        assertionCode: T(py`_fresh()
q = '{ __type(name: "Product") { fields(includeDeprecated: true) { name isDeprecated deprecationReason } } }'
fields = {f["name"]: f for f in _data(_gql(q))["__type"]["fields"]}
assert fields["legacyPrice"]["isDeprecated"] is True, "legacyPrice should be @deprecated"
assert "priceCents" in fields["legacyPrice"]["deprecationReason"], "The reason should point at the replacement, priceCents"
assert fields["priceCents"]["isDeprecated"] is False
default = [f["name"] for f in _data(_gql('{ __type(name: "Product") { fields { name } } }'))["__type"]["fields"]]
assert "legacyPrice" not in default, "Deprecated fields are hidden from introspection unless includeDeprecated is true"
assert _data(_gql("{ product(id: 1) { priceCents legacyPrice } }"))["product"] == {"priceCents": 5900, "legacyPrice": 59.0}, "Deprecated fields keep working"`),
      },
      {
        id: "t4",
        description: "set_introspection switches introspection off and on, __typename always works",
        assertionCode: T(py`_fresh()
try:
    assert set_introspection(False) is False, "set_introspection returns the new state"
    r = _gql("{ __schema { queryType { name } } }")
    assert r.get("errors") and "introspection" in _msgs(r)[0].lower(), "With introspection off, __schema must be refused with a message that says so, got " + repr(r)
    assert r["data"] is None
    r = _gql('{ __type(name: "Product") { name } }')
    assert r.get("errors"), "__type is refused too"
    assert _data(_gql("{ __typename shopName }")) == {"__typename": "Query", "shopName": "Pocket Store"}, "Normal queries and __typename keep working"
    assert not _gql("{ search(term: \"desk\") { __typename } }").get("errors"), "__typename inside queries is fine"
finally:
    assert set_introspection(True) is True
assert _data(_gql("{ __schema { queryType { name } } }"))["__schema"]["queryType"]["name"] == "Query", "Switching it back on restores introspection"`),
      },
      {
        id: "t5",
        description: "schema_sdl prints the whole contract",
        assertionCode: T(py`_fresh()
sdl = schema_sdl()
assert isinstance(sdl, str), "schema_sdl() returns text"
for piece in ("type Product", "interface Account", "union SearchResult", "input ReviewInput", "enum ProductSort", "type Mutation", "@deprecated", "Money is never a Float"):
    assert piece in sdl, "The printed SDL should contain " + repr(piece)
from graphql import build_schema
again = build_schema(sdl)
assert set(again.type_map) == set(schema.type_map), "The printed SDL must build back into the same set of types"`),
      },
      {
        id: "t6",
        description: "type_to_string reads nested type references",
        assertionCode: T(py`nn = lambda t: {"kind": "NON_NULL", "name": None, "ofType": t}
ls = lambda t: {"kind": "LIST", "name": None, "ofType": t}
obj = lambda n: {"kind": "OBJECT", "name": n, "ofType": None}
assert type_to_string(nn(ls(nn(obj("Review"))))) == "[Review!]!", "NON_NULL(LIST(NON_NULL(Review))) is [Review!]!"
assert type_to_string(obj("Product")) == "Product", "A plain named type"
assert type_to_string(ls(obj("Int"))) == "[Int]", "A nullable list of nullable Int"
assert type_to_string(nn(ls(ls(nn(obj("ID")))))) == "[[ID!]]!", "Lists can nest"
assert type_to_string(nn({"kind": "SCALAR", "name": "String", "ofType": None})) == "String!"`),
      },
      {
        id: "t7",
        description: "type_summary reads types through introspection",
        assertionCode: T(py`_fresh()
p = type_summary("Product")
assert p["name"] == "Product" and p["kind"] == "OBJECT" and p["values"] == [], "Product is an OBJECT with no enum values, got " + repr(p)
fields = {f["name"]: f["type"] for f in p["fields"]}
assert fields["priceCents"] == "Int!" and fields["reviews"] == "[Review!]!" and fields["category"] == "Category!" and fields["averageRating"] == "Float", "Field types are printed like SDL, got " + repr(fields)
r = type_summary("Role")
assert r == {"name": "Role", "kind": "ENUM", "fields": [], "values": ["ADMIN", "CUSTOMER"]}, "Enums list their values, got " + repr(r)
assert type_summary("DoesNotExist") is None, "Unknown types give None"
q = type_summary("Query")["fields"]
assert {"name": "product", "type": "Product"} in q and {"name": "categories", "type": "[Category!]!"} in q, "Query fields include product and categories"`),
      },
    ],
    unlocks: ["gql-docs"],
    checks: [
      {
        prompt: "Which change is **safe** for existing clients?",
        question: {
          type: "choice",
          options: [
            "Adding a new nullable field to Product",
            "Deleting `legacyPrice` that mobile v1 still queries",
            "Changing `priceCents: Int!` to `priceCents: String!`",
            "Making the optional `category` argument required",
          ],
          answer: 0,
        },
        explanation:
          "Clients only receive fields they ask for, so extra fields never break them. Removing a field, changing a type or tightening an argument makes some valid existing query invalid or different. Deprecate first, remove when usage is zero.",
      },
      {
        prompt: "A teammate says: \"We disabled introspection in production, so attackers can't learn our schema.\" What is the best reply?",
        question: {
          type: "choice",
          options: [
            "That's only obscurity: error messages and guessing still leak names, so rely on authorization and query limits",
            "Correct, the API is now fully secure",
            "Introspection cannot be disabled",
            "Disabling it also disables __typename, which is fine",
          ],
          answer: 0,
        },
        explanation:
          "Turning it off removes a convenience for attackers, not a vulnerability. Validation errors still suggest field names (\"Did you mean...\"), and real protection comes from authorization (lesson 11) and limits (lesson 12).",
      },
    ],
  },

  // ───────────────────────────────────────── 14. tests + REST comparison
  {
    id: "graphql-gateway-14-ship",
    title: "Test it, then compare it with REST",
    minutes: 55,
    xp: 280,
    concepts: ["schema testing", "contract tests", "breaking changes", "performance budgets", "REST vs GraphQL"],
    learn: `### What to test in a GraphQL API

Because the whole API is one function, \`execute(request)\`, testing is pleasantly uniform. You send a query and assert on the response, with the database reset first. The useful layers:

1. **Resolver and helper unit tests**: pure functions such as \`decode_cursor\` or a batch function.
2. **Integration tests through \`execute()\`**: the main body of your tests. They run the real schema, resolvers and database, exactly as a client would, which also catches wiring mistakes (a field with the wrong name, a resolver never registered).
3. **Contract tests**: every operation the mobile and web apps actually ship must still validate against the schema. \`validate(schema, parse(query))\` returns \`[]\` when it does.
4. **Schema compatibility**: compare the current schema with a saved baseline using \`find_breaking_changes(old, new)\`. An empty list means existing clients keep working.
5. **Performance budgets**: assert the *number of SQL statements* for important queries, using the stats from lesson 6. N+1 regressions show up as a failing test instead of a slow production.
6. **Negative paths**: authorization (anonymous, customer, admin), validation errors, masked internals, limits.

A good test starts from a clean database, names the behavior ("a customer cannot read someone else's order"), and asserts on the whole relevant response, including \`errors\`, not just \`data\`. Test the authorization table exhaustively: it is the cheapest security review you will ever do.

### A tiny test runner

Real projects use \`pytest\`. The idea fits in a few lines, and your scene runs it through a hook:

~~~python
TESTS = []

def test(fn):                      # a decorator that registers a test
    TESTS.append(fn)
    return fn

def run_tests():
    results = []
    for fn in TESTS:
        reset_db()                 # every test starts clean
        try:
            fn()
            results.append({"name": fn.__name__, "passed": True, "error": None})
        except AssertionError as e:
            results.append({"name": fn.__name__, "passed": False, "error": str(e) or "assertion failed"})
        except Exception as e:     # a crash is a failure too
            results.append({"name": fn.__name__, "passed": False, "error": type(e).__name__ + ": " + str(e)})
    reset_db()
    return results
~~~

Write assertion *messages* that explain what should have happened. A failing test that says only \`AssertionError\` costs minutes at 2 a.m.

Keep the suite **fast**. Here it runs inside a hook that is limited to a quarter of a second, and in real life a quick suite is one people actually run. Each \`execute()\` call parses and validates its query, which is the slow part, so prefer a few meaningful requests over hundreds of tiny ones.

### Do your tests actually test?

A test suite that passes is not necessarily a suite that protects. Break something on purpose (turn the depth limit off, stop masking errors, disable batching) and make sure some test fails. That habit is **mutation testing** in miniature, and the course grader does exactly this to your suite.

### REST or GraphQL?

You built both in this track. Compare them honestly on the *same screen*: the product page needs the product, its category, its reviews and each reviewer's name.

- **REST**: \`GET /products/7\`, \`GET /categories/2\`, \`GET /products/7/reviews\`, plus one \`GET /users/{id}\` per distinct reviewer. That is 3 + N round trips and every response carries all columns (SKU, stock, emails, roles).
- **GraphQL**: one request, and the response holds only the fields the screen shows.

Measure it: for product 1, count the requests and bytes each approach needs. Your \`compare_rest\` hook will make the difference concrete and let the scene draw it.

### When GraphQL fits

- Many different clients (web, iOS, Android, partners) with different data needs.
- Deeply connected data and screens that cross several resources.
- Fast-moving front ends that should not wait for new endpoints.
- You want a typed, introspectable contract and generated clients.

### When REST (or something else) is better

- **Simple CRUD** with few clients: REST is less machinery.
- **HTTP caching and CDNs**: GETs at stable URLs are cached by everything between you and the user.
- **File upload and download, streaming**: plain HTTP does it natively.
- **Webhooks and machine-to-machine calls** with fixed shapes.
- **Per-endpoint rate limiting and monitoring** that the infrastructure already understands.
- Small teams that cannot afford the extra concepts (N+1, cost limits, authorization per field).

Many companies use both: GraphQL for client-facing screens, REST or RPC between services. And you can put a gateway for GraphQL in front of existing REST services, which is exactly the role of this project: a *backend for frontends*.

### Common mistakes

- Tests that only check \`data\` and ignore \`errors\`.
- Sharing database state between tests.
- Treating GraphQL as automatically faster than REST. It reduces round trips, not server work.
- Choosing a technology for its novelty instead of the clients' needs.`,
    mission: `Time to ship. Write the gateway's **test suite** (covering the hard parts: batching, authorization, limits, masking, pagination), a **contract check** for the operations the apps depend on, and a **REST versus GraphQL** comparison for the product page.

Pass it and the scene unlocks the **Tests** tab, which runs your suite live, and a comparison card that shows requests and bytes for the same screen over both styles.`,
    tasks: [
      "TESTS, a @test decorator and run_tests(): reset the database before each test and at the end, return [{name, passed, error}] where a failed assert or a crash is a failed test with a useful message",
      "At least 7 tests with @test: the product page works, createReview validation, authorization (anonymous, customer, admin), an N+1 budget (SQL count), the query limits, error masking, cursor paging, and that BASELINE_SDL has no breaking changes against the current schema (find_breaking_changes)",
      "rest_calls(product_id) listing what a REST client would fetch for the product page: the product row, its category, its reviews, one user row per distinct reviewer",
      "compare_rest(product_id) returning {rest: {requests, bytes, calls}, graphql: {requests, bytes}}, using the byte length of compact JSON; unknown products are handled",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 14: tests, a contract check, and the REST comparison.
import json
from graphql import find_breaking_changes

# PROVIDED: the operations the shipped mobile and web apps send. They are a contract.
CLIENT_OPERATIONS = {
    "Home": "query Home { categories { id name } newArrivals { id name priceCents inStock } }",
    "ProductPage": "query ProductPage($id: ID!) { product(id: $id) { id name description priceCents inStock averageRating category { name } reviews { id rating body createdAt author { name } } } }",
    "MyOrders": "query MyOrders { orders { id status createdAt totalCents items { quantity product { name } } } }",
}

# PROVIDED: what mobile v1 relies on. A breaking change is anything that would make these queries invalid.
BASELINE_SDL = """
type Query {
  shopName: String!
  categories: [Category!]!
  product(id: ID!): Product
  products(category: String, limit: Int = 20, offset: Int = 0): [Product!]!
}
type Category { id: ID! name: String! }
type Product { id: ID! name: String! priceCents: Int! inStock: Boolean! category: Category! }
"""

# 1) A tiny test runner (this is what the Tests tab calls).
TESTS = []


def test(fn):
    """Decorator: register a test function."""
    ...


def run_tests():
    """Run every registered test on a freshly reset database. Return [{"name", "passed", "error"}]."""
    ...


def ask(query, variables=None, token=None):
    """A test helper: send a query through execute() as the person who owns this token."""
    ...


# 2) Your tests. Give each an assertion message that says what should have happened.
# @test
# def product_page_loads(): ...


# 3) The same screen over REST. Return the rows a REST client would download.
def rest_calls(product_id):
    """[(path, body), ...]: product, its category, its reviews, then one user per distinct reviewer."""
    ...


def payload_bytes(value):
    """Size of compact JSON (separators ',' and ':') in bytes."""
    ...


def compare_rest(product_id):
    """The scene's REST vs GraphQL card."""
    ...
`,
    solutionAdd: py`import json
from graphql import find_breaking_changes

CLIENT_OPERATIONS = {
    "Home": "query Home { categories { id name } newArrivals { id name priceCents inStock } }",
    "ProductPage": "query ProductPage($id: ID!) { product(id: $id) { id name description priceCents inStock averageRating category { name } reviews { id rating body createdAt author { name } } } }",
    "MyOrders": "query MyOrders { orders { id status createdAt totalCents items { quantity product { name } } } }",
}

BASELINE_SDL = """
type Query {
  shopName: String!
  categories: [Category!]!
  product(id: ID!): Product
  products(category: String, limit: Int = 20, offset: Int = 0): [Product!]!
}
type Category { id: ID! name: String! }
type Product { id: ID! name: String! priceCents: Int! inStock: Boolean! category: Category! }
"""

TESTS = []


def test(fn):
    """Decorator: register a test function."""
    TESTS.append(fn)
    return fn


def run_tests():
    """Run every registered test on a freshly reset database. Return [{"name", "passed", "error"}]."""
    results = []
    for fn in TESTS:
        reset_db()
        try:
            fn()
            results.append({"name": fn.__name__.replace("_", " "), "passed": True, "error": None})
        except AssertionError as failure:
            results.append({"name": fn.__name__.replace("_", " "), "passed": False, "error": str(failure) or "assertion failed"})
        except Exception as crash:
            results.append({"name": fn.__name__.replace("_", " "), "passed": False, "error": f"{type(crash).__name__}: {crash}"})
    reset_db()
    return results


def ask(query, variables=None, token=None):
    """A test helper: send a query through execute() as the person who owns this token."""
    headers = {"Authorization": "Bearer " + token} if token else {}
    return execute({"query": query, "variables": variables, "headers": headers})


@test
def product_page_loads_with_reviews():
    r = ask(CLIENT_OPERATIONS["ProductPage"], {"id": "1"})
    assert "errors" not in r, f"the product page query should work, got {r.get('errors')}"
    product = r["data"]["product"]
    assert product["category"]["name"] == "Audio", "product 1 belongs to Audio"
    assert len(product["reviews"]) == 3, f"product 1 has 3 reviews, got {len(product['reviews'])}"


@test
def every_client_operation_is_valid():
    from graphql import parse, validate

    # one document, one validation pass (validation is the slow part, and this suite must stay fast)
    problems = validate(schema, parse("\n".join(CLIENT_OPERATIONS.values())))
    assert problems == [], f"a client operation no longer validates: {[p.message for p in problems]}"


@test
def review_validation_reports_fields():
    q = "mutation($i: ReviewInput!) { createReview(input: $i) { review { id } userErrors { field } } }"
    r = ask(q, {"i": {"productId": "2", "rating": 9, "body": ""}}, token="sam-token")
    assert [e["field"] for e in r["data"]["createReview"]["userErrors"]] == ["rating", "body"], f"expected rating and body errors, got {r}"


@test
def orders_are_private():
    assert ask("{ orders { id } }")["errors"][0]["extensions"]["code"] == "UNAUTHENTICATED", "anonymous callers must sign in"
    assert ask("{ allOrders { id } }", token="sam-token")["errors"][0]["extensions"]["code"] == "FORBIDDEN", "customers must not read every order"
    assert len(ask("{ allOrders { id } }", token="admin-token")["data"]["allOrders"]) == 6, "admins read all 6 orders"
    assert ask("{ order(id: 3) { id } }", token="sam-token")["data"] == {"order": None}, "someone else's order must look missing"


@test
def catalogue_query_is_batched():
    r = ask("{ products(limit: 16) { name category { name } reviews { author { name } } } }")
    assert r["extensions"]["stats"]["sql"] <= 4, f"products + categories + reviews + authors should take 4 statements, took {r['extensions']['stats']['sql']}"


@test
def abusive_queries_are_rejected():
    deep = "{ categories { products { category { products { category { products { category { products { name } } } } } } } } }"
    assert ask(deep)["errors"][0]["extensions"]["code"] == "DEPTH_LIMIT_EXCEEDED", "deep cycles must hit the depth limit"
    bomb = "{ " + " ".join(f"a{i}: products(limit: 50) {{ name category {{ name }} }}" for i in range(8)) + " }"
    assert ask(bomb)["errors"][0]["extensions"]["code"] == "COMPLEXITY_LIMIT_EXCEEDED", "alias bombs must hit the cost limit"


@test
def internals_are_not_leaked():
    r = ask("{ product(id: 5) { name warehouse } }")
    assert "warehouse_map" not in json.dumps(r["errors"]), "SQL details must not reach the client"
    assert r["errors"][0]["message"] == "Internal server error", "bugs get a generic message"


@test
def cursor_pages_do_not_overlap():
    q = "query($a: String) { productsConnection(first: 6, after: $a) { pageInfo { endCursor } edges { node { id } } } }"
    one = ask(q)["data"]["productsConnection"]
    two = ask(q, {"a": one["pageInfo"]["endCursor"]})["data"]["productsConnection"]
    seen = [e["node"]["id"] for e in one["edges"]]
    assert not set(seen) & {e["node"]["id"] for e in two["edges"]}, "page two repeated items from page one"


@test
def schema_is_backwards_compatible():
    from graphql import build_schema

    broken = find_breaking_changes(build_schema(BASELINE_SDL), schema)
    assert broken == [], f"mobile v1 would break: {[b.description for b in broken]}"


def payload_bytes(value):
    """Size of compact JSON (separators ',' and ':') in bytes."""
    return len(json.dumps(value, separators=(",", ":")).encode())


def rest_calls(product_id):
    """[(path, body), ...]: product, its category, its reviews, then one user per distinct reviewer."""
    product = fetch_one(DB, "SELECT * FROM products WHERE id = ?", (product_id,))
    if product is None:
        return [(f"/products/{product_id}", {"error": "not_found"})]
    reviews = fetch_all(DB, "SELECT * FROM reviews WHERE product_id = ? ORDER BY id", (product_id,))
    calls = [
        (f"/products/{product_id}", product),
        (f"/categories/{product['category_id']}", fetch_one(DB, "SELECT * FROM categories WHERE id = ?", (product["category_id"],))),
        (f"/products/{product_id}/reviews", reviews),
    ]
    for user_id in sorted({review["user_id"] for review in reviews}):
        calls.append((f"/users/{user_id}", fetch_one(DB, "SELECT * FROM users WHERE id = ?", (user_id,))))
    return calls


def compare_rest(product_id):
    """The scene's REST vs GraphQL card."""
    calls = rest_calls(product_id)
    response = execute({"query": CLIENT_OPERATIONS["ProductPage"], "variables": {"id": str(product_id)}})
    return {
        "rest": {
            "requests": len(calls),
            "bytes": sum(payload_bytes(body) for _, body in calls),
            "calls": [{"path": path, "bytes": payload_bytes(body)} for path, body in calls],
        },
        "graphql": {"requests": 1, "bytes": payload_bytes(response.get("data"))},
    }`,
    explanation:
      "Everything goes through execute(), so integration tests exercise the real schema, resolvers and database. Resetting before each test keeps them independent, a failed assert or a crash becomes a clear failed result, and checking the SQL count turns the N+1 fix into a regression test. A contract test validates the shipped client operations against the schema, and find_breaking_changes does the same for the baseline SDL. The comparison measures the same screen both ways: REST needs 3 + N requests and ships whole rows, GraphQL one request with only the requested fields; the honest conclusion depends on your clients, caching needs and team.",
    hints: [
      { id: "h1", title: "The runner", content: "test(fn) appends to TESTS and returns fn. run_tests loops over TESTS: call reset_db(), then try fn(); catch AssertionError (use str(e) or a default) and a general Exception (type name plus message); append {'name': fn.__name__, 'passed': ..., 'error': ...}. Call reset_db() once more at the end." },
      { id: "h2", title: "Writing tests", content: "ask(query, variables, token) builds headers {'Authorization': 'Bearer ' + token} and returns execute({...}). Each test is a plain function with assert statements and messages like 'customers must not read every order'. Aim for: product page, review validation, authorization, SQL count <= 4 for products with category, reviews and author, depth/cost limits, masking, cursors, and find_breaking_changes(build_schema(BASELINE_SDL), schema) == []." },
      { id: "h3", title: "REST side", content: "rest_calls: fetch the product row; if missing return [(path, {'error': 'not_found'})]. Otherwise calls for /products/{id}, /categories/{category_id}, /products/{id}/reviews (the list of review rows) and one /users/{user_id} per distinct reviewer in sorted order, each body a whole dict from fetch_one / fetch_all." },
      { id: "h4", title: "The comparison", content: 'payload_bytes: len(json.dumps(value, separators=(",", ":")).encode()). compare_rest runs the ProductPage operation through execute and measures response["data"]. Return {"rest": {"requests": len(calls), "bytes": total, "calls": [{"path", "bytes"}]}, "graphql": {"requests": 1, "bytes": ...}}.' },
    ],
    tests: [
      {
        id: "t1",
        description: "run_tests() runs a real suite: at least 8 named tests, all passing",
        assertionCode: T(py`results = run_tests()
assert isinstance(results, list) and len(results) >= 8, "run_tests() should return a list with at least 8 results (cover the product page, validation, authorization, batching, limits, masking, paging, compatibility), got " + str(len(results) if isinstance(results, list) else results)
for r in results:
    assert set(r) == {"name", "passed", "error"}, "Each result needs name, passed and error, got " + repr(r)
    assert isinstance(r["name"], str) and r["name"], "Each result needs a name"
names = [r["name"] for r in results]
assert len(set(names)) == len(names), "Test names should be unique, got " + repr(names)
failed = [r for r in results if not r["passed"]]
assert not failed, "Your own suite fails on a correct gateway: " + repr(failed[:2])
assert all(r["error"] is None for r in results), "Passed tests have error None"`),
      },
      {
        id: "t2",
        description: "Failures and crashes are reported, not raised; state is cleaned up",
        assertionCode: T(py`saved = list(TESTS)
try:
    @test
    def zz_fails():
        assert 1 == 2, "this is the failure message"
    @test
    def zz_crashes():
        {}["missing"]
    @test
    def zz_blank_assert():
        assert False
    @test
    def zz_dirties_the_database():
        DB.execute("DELETE FROM reviews")
        DB.commit()
    results = {r["name"].replace(" ", "_"): r for r in run_tests()}
finally:
    TESTS[:] = saved
assert results["zz_fails"]["passed"] is False and results["zz_fails"]["error"] == "this is the failure message", "An AssertionError message becomes the error, got " + repr(results["zz_fails"])
assert results["zz_crashes"]["passed"] is False and "KeyError" in results["zz_crashes"]["error"], "A crash is a failed test mentioning the exception type, got " + repr(results["zz_crashes"])
assert results["zz_blank_assert"]["passed"] is False and results["zz_blank_assert"]["error"], "An assert without a message still gets a non-empty error"
assert results["zz_dirties_the_database"]["passed"] is True
n = fetch_one(DB, "SELECT COUNT(*) AS n FROM reviews")["n"]
assert n == 14, "run_tests() must leave a fresh database behind (found " + str(n) + " reviews)"`),
      },
      {
        id: "t3",
        description: "Each test starts from a clean database",
        assertionCode: T(py`saved = list(TESTS)
seen = []
try:
    TESTS[:] = []
    @test
    def zz_first():
        seen.append(fetch_one(DB, "SELECT COUNT(*) AS n FROM reviews")["n"])
        DB.execute("DELETE FROM reviews")
        DB.commit()
    @test
    def zz_second():
        seen.append(fetch_one(DB, "SELECT COUNT(*) AS n FROM reviews")["n"])
    results = run_tests()
finally:
    TESTS[:] = saved
assert seen == [14, 14], "Each test must start on a fresh database (14 reviews); counts seen: " + repr(seen)
assert [r["passed"] for r in results] == [True, True], "Both helper tests should pass, got " + repr(results)`),
      },
      {
        id: "t4",
        description: "Your suite notices when the query limits are switched off",
        assertionCode: T(py`global MAX_DEPTH, MAX_COST
old = (MAX_DEPTH, MAX_COST)
MAX_DEPTH, MAX_COST = 1000, 10 ** 9
try:
    failed = [r for r in run_tests() if not r["passed"]]
finally:
    MAX_DEPTH, MAX_COST = old
assert failed, "With the limits disabled at least one of your tests should fail. Add a test that sends a deep cycle and an alias bomb and checks the error codes."`),
      },
      {
        id: "t5",
        description: "Your suite notices when internal errors leak",
        assertionCode: T(py`global format_error
old = format_error
format_error = lambda error: error.formatted
try:
    failed = [r for r in run_tests() if not r["passed"]]
finally:
    format_error = old
assert failed, "With error masking switched off at least one test should fail. Add a test that asks for product 5's warehouse and checks the client sees no internal details."`),
      },
      {
        id: "t6",
        description: "Your suite notices when N+1 comes back",
        assertionCode: T(py`old = Loader.prime
Loader.prime = lambda self, keys: None
try:
    failed = [r for r in run_tests() if not r["passed"]]
finally:
    Loader.prime = old
assert failed, "With priming disabled every list triggers N+1 again. Add a test that checks the SQL count (extensions.stats.sql) of a list query."`),
      },
      {
        id: "t7",
        description: "compare_rest counts what a REST client needs for the product page",
        assertionCode: T(py`_fresh()
c = compare_rest(1)
assert set(c) == {"rest", "graphql"}, "compare_rest returns {'rest': ..., 'graphql': ...}, got " + repr(sorted(c))
paths = [x["path"] for x in c["rest"]["calls"]]
assert paths == ["/products/1", "/categories/1", "/products/1/reviews", "/users/2", "/users/3", "/users/4"], "Product 1 needs its product, category, reviews and each of its three reviewers, got " + repr(paths)
assert c["rest"]["requests"] == 6 and c["graphql"]["requests"] == 1, "6 REST requests versus 1 GraphQL request, got " + repr((c["rest"]["requests"], c["graphql"]["requests"]))
assert c["rest"]["bytes"] == sum(x["bytes"] for x in c["rest"]["calls"]), "rest.bytes is the sum of the individual calls"
assert 0 < c["graphql"]["bytes"] < c["rest"]["bytes"], "The GraphQL response carries only the screen's fields, so it must be smaller: " + repr((c["graphql"]["bytes"], c["rest"]["bytes"]))
assert all(isinstance(x["bytes"], int) and x["bytes"] > 0 for x in c["rest"]["calls"]), "Each call has a byte size"
assert payload_bytes({"a": 1}) == 7, 'compact JSON of {"a": 1} is {"a":1} = 7 bytes'`),
      },
      {
        id: "t8",
        description: "compare_rest handles products without reviews and unknown products",
        assertionCode: T(py`_fresh()
c = compare_rest(2)
assert [x["path"] for x in c["rest"]["calls"]] == ["/products/2", "/categories/1", "/products/2/reviews"], "A product without reviews needs no user calls, got " + repr([x["path"] for x in c["rest"]["calls"]])
assert c["rest"]["requests"] == 3
missing = compare_rest(999)
assert missing["rest"]["requests"] == 1 and missing["graphql"]["requests"] == 1, "An unknown product is one failed REST call and one GraphQL request, got " + repr(missing)
assert missing["graphql"]["bytes"] > 0`),
      },
    ],
    unlocks: ["gql-ship"],
    checks: [
      {
        prompt: "Your product-page query is fine today. Which test would catch someone adding a loop that queries the database once per review next month?",
        question: {
          type: "choice",
          options: [
            "A performance-budget test that asserts the SQL statement count from extensions.stats",
            "A test that the response contains `data`",
            "A test of the Python version",
            "None; N+1 can only be seen in production",
          ],
          answer: 0,
        },
        explanation:
          "The result is still correct when N+1 returns, only slower. Asserting the number of statements turns a silent performance regression into a failing test.",
      },
      {
        prompt: "Which of these is the strongest reason to prefer plain REST over GraphQL for an endpoint?",
        question: {
          type: "choice",
          options: [
            "Public, cacheable resources fetched by many clients and a CDN",
            "The data has relationships",
            "Mobile clients exist",
            "The team likes typed schemas",
          ],
          answer: 0,
        },
        explanation:
          "A GET to a stable URL is cached by browsers and CDNs for free. GraphQL's flexibility, relationships and typing are reasons *for* it. Uploads, streaming, webhooks and very simple CRUD also favor REST.",
      },
      {
        prompt: "`find_breaking_changes(old, new)` returns an empty list. What does that tell you?",
        question: {
          type: "choice",
          options: [
            "Queries valid against the old schema are still valid against the new one",
            "The API has no bugs",
            "No field was added",
            "The schema is documented",
          ],
          answer: 0,
        },
        explanation:
          "It checks compatibility for existing clients: no removed or retyped fields, no new required arguments. Additions are allowed, and it says nothing about resolver bugs.",
      },
    ],
  },
];
