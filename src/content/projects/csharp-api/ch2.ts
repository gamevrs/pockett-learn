import type { Chapter } from "@/engine/types";
import { TYPES_DIVIDER } from "../../../engine/compose.ts";
import { cs, js, md } from "./util.ts";

/**
 * Chapter 2: Endpoints, validation and data. Bind requests to code, reject bad input with problem details, and keep bookings in a unit of work with row versions.
 */

export const chapter2: Chapter = {
  id: "endpoints-and-data",
  title: "Endpoints, validation and data",
  blurb: "Bind requests to code, reject bad input with problem details, and keep bookings in a unit of work with row versions.",
  lessons: [
    // ───────────────────────── 5 ─────────────────────────
    {
      id: "csharp-api-5-endpoints",
      title: "Endpoints, controllers and model binding",
      minutes: 55,
      xp: 260,
      concepts: ["minimal endpoints", "controllers & attributes", "reflection", "parameter binding", "JSON model binding", "IResult", "platform modules"],
      learn: md`### Two ways to write the same endpoint

An endpoint is a handler the router can reach. Your \`RequestDelegate\` from lesson 2 already is one, but writing every handler against raw \`HttpContext\` means every handler re-implements "read the id from the route, parse the body, turn the answer into JSON". Frameworks fix that with two styles that share one idea: **the handler declares what it needs as parameters, and the framework binds them**.

**Minimal endpoints** use a delegate:

~~~csharp
app.MapGet("/slots/{id:int}", (int id, Catalog catalog) => catalog.Slots.FirstOrDefault(s => s.Id == id));
~~~

**Controllers** group related actions in a class and describe routing with attributes:

~~~csharp
[Route("gyms")]
class GymsController(Catalog catalog)
{
    [HttpGet("{id:int}")] public Gym Get(int id) => catalog.Gyms.FirstOrDefault(g => g.Id == id);
}
~~~

Both end up as the same thing in the route table: an \`Endpoint\` whose handler is built by reflection. Minimal endpoints suit small, focused services; controllers suit groups of related actions that share dependencies, a prefix and policies. The framework choice is mostly about how your team likes to organise code.

### Parameter binding: where does each argument come from?

For each parameter of the method, decide the *source*, in this order:

1. \`HttpContext\` itself: pass the context.
2. A **route value** with the same name as the parameter (\`id\` from \`/slots/{id:int}\`).
3. A **query string** value with that name (\`?city=Leeds\`).
4. A simple type (\`int\`, \`string\`, nullable \`DateOnly?\`) that was not found: use its **default value** if it has one, otherwise the caller omitted a required value: \`400\`.
5. A type that is registered in the **container**: inject the service from the request scope.
6. Anything else is a **model**: deserialize it from the **JSON body**. No body, or a body that is not valid JSON, is a \`400\`.

Converting text to the parameter type is the first place untrusted input meets typed code. \`System.ComponentModel.TypeDescriptor.GetConverter(type).ConvertFromInvariantString(text)\` handles numbers, dates and enums in one call; always catch the failure and answer \`400\` with a message naming the parameter. Never let a \`FormatException\` escape as a \`500\`: the caller's mistake is not your outage.

### Results: what a handler returns

Handlers return one of three things, and the adapter turns each into a response:

- an **\`IResult\`** (\`Results.Created(location, body)\`) that knows how to write itself, for when status and headers matter;
- a **plain object**: serialized as \`200\` JSON;
- \`null\`: **404**, because "I looked it up and it is not there" is the commonest reason for null. \`void\` is \`204\`.

\`IResult\` is a small *command object*: the handler decides what should happen, the result carries it out against the context. That keeps handlers easy to unit-test (you can inspect the result without a server).

### Reflection, the careful way

The adapter invokes the method with \`MethodInfo.Invoke\`. Pass \`BindingFlags.DoNotWrapExceptions\`, or an exception thrown inside the handler arrives wrapped in a \`TargetInvocationException\` and your error middleware will treat every domain error as an unexpected 500. Reflection is also slower than a direct call, so real frameworks build compiled delegates once at startup; for our purposes correctness matters more.

For controllers, \`MapControllers\` scans the methods that carry an \`[HttpGet]\`/\`[HttpPost]\`-style attribute, joins the class-level \`[Route]\` prefix with the method's template, and creates the controller per request through the container (\`ctx.Services().Create(type)\`), so its constructor parameters are injected. It also copies **all attributes** of the class and the method into the endpoint's \`Metadata\`: that is how a policy attribute declared on a controller will reach the authorization middleware later.

### The program now grows by modules

Your file only grows at the bottom, but real middleware order has to be controlled. From this lesson the program is organised as **modules**: \`Platform.Add(name, phase, setup)\` registers a block of setup code (services, middleware, routes), and \`Platform.Build()\` runs the modules sorted by phase, producing a fresh \`Api\` each time. Registering a module with an existing name **replaces** it, so a later lesson can swap the error handler without touching this code. The \`Phase\` constants (provided) fix where each kind of middleware sits in the pipeline.

Every lesson from here has the same rhythm: write the types, register a module, replay a section of the recording, and read the result on the console.

### Common mistakes

- Binding the body for \`GET\` handlers, or reading the body twice.
- Treating an unparseable id as a 500 instead of a 400.
- Forgetting \`DoNotWrapExceptions\`.
- Building a controller with \`new\` instead of through the container, so its dependencies never arrive.
- Returning \`200\` with \`null\` JSON for "not found".`,
      mission: md`The route table from lesson 2 and the pipeline from lesson 3 exist, but every handler is still hand-written plumbing. The front desk needs real read endpoints now: the list of gyms, a gym by id, a gym's slots on a day, one slot, and a quote for a group booking.

You will write the machinery that makes those one-liners possible: a parameter **binder**, an **\`IResult\`**, **controller scanning** by attribute, and a first **module** of the platform. The harness replays ten recorded requests, including a bad date and bad JSON, and the console lists every endpoint with its kind. When this lesson passes, the **Endpoints** panel lights up.`,
      tasks: [
        "Write IResult/Result (Status, optional Body and Location) and Results.Ok / Results.Created",
        "Write Binder.Adapt(method, target): bind each parameter from HttpContext, route values, query values (typed through TypeDescriptor, 400 on failure, default values honoured), the container, or the JSON body (400 when missing or invalid; run Binder.ModelCheckers on the model); invoke with DoNotWrapExceptions; null result is 404, void is 204, IResult executes itself, anything else is 200 JSON",
        "Write the attributes (Route, HttpMethod, HttpGet, HttpPost) and EndpointExtensions: MapGet/MapPost for delegates, MapControllers (prefix + template, controller built with ctx.Services().Create, copy class and method attributes into the endpoint's Metadata), UseServices (a scope per request kept in ctx.Items) and ctx.Services()",
        "Write GymsController with list (optional city filter), get by id, and slots (optional DateOnly? day), then register the three modules from the starter comment",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 5. From now on the program grows by modules (Platform, below). Register three of them:
//  Platform.Add("catalog", Phase.Scope, api => { Catalog and PriceList as singletons; api.App.UseServices(api.Services); });
//  Platform.Add("errors", Phase.Errors, api => api.App.Use("errors", Middlewares.Errors));
//  Platform.Add("endpoints", Phase.Endpoints, api => {
//      MapGet("/slots/{id:int}", (int id, Catalog catalog) => the slot with that id, or null);
//      MapPost("/quotes", (QuoteRequest q, PriceList prices) => Results.Created("/quotes/1", new { q.SlotId, q.Climbers, total = q.Climbers * prices.PerClimber }));
//      MapControllers(typeof(GymsController)); });
var web = Platform.Build();
Board.Show("endpointTable", web.App.Router.Endpoints.Select(e => new { e.Method, e.Template, kind = e.Metadata.Any() ? "controller" : "minimal" }));
await web.Replay("endpoints");

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── IResult/Result/Results, the Binder (route, query, services, JSON body), the attributes,
// EndpointExtensions (MapGet, MapPost, MapControllers, UseServices, Services) and GymsController (list, get, slots).
interface IResult { void Execute(HttpContext ctx); }
record Result(int Status, object Body = null, string Location = null) : IResult { public void Execute(HttpContext ctx) => throw new NotImplementedException(); }

static class Results
{
    public static IResult Ok(object body) => throw new NotImplementedException();
    public static IResult Created(string location, object body) => throw new NotImplementedException();
}

static class Binder
{
    public static List<Action<object>> ModelCheckers { get; } = new();
    public static RequestDelegate Adapt(MethodInfo method, Func<HttpContext, object> target) => throw new NotImplementedException();
}

class RouteAttribute : Attribute { }
class HttpMethodAttribute : Attribute { }
class HttpGetAttribute : HttpMethodAttribute { }
class HttpPostAttribute : HttpMethodAttribute { }

static class EndpointExtensions
{
    public static Endpoint MapGet(this App app, string template, Delegate handler) => throw new NotImplementedException();
    public static Endpoint MapPost(this App app, string template, Delegate handler) => throw new NotImplementedException();
    public static App MapControllers(this App app, params Type[] controllers) => throw new NotImplementedException();
    public static App UseServices(this App app, ServiceCollection services) => throw new NotImplementedException();
    public static ServiceProvider Services(this HttpContext ctx) => throw new NotImplementedException();
}

class GymsController { }

// Provided: the data the endpoints serve.
record Gym(int Id, string Name, string City);
record Slot(int Id, int GymId, string Day, string Time, int Capacity);
record QuoteRequest(int SlotId, int Climbers);

class Catalog
{
    public List<Gym> Gyms { get; } = new() { new(1, "Granite Yard", "Leeds"), new(2, "Harbour Boulders", "Bristol"), new(3, "Summit Mill", "Sheffield") };
    public List<Slot> Slots { get; } = new()
    {
        new(11, 1, "2031-06-14", "09:00", 8), new(12, 1, "2031-06-14", "11:00", 8), new(21, 2, "2031-06-14", "09:00", 6),
        new(22, 2, "2031-06-15", "14:00", 6), new(31, 3, "2031-06-14", "10:00", 10),
    };
}

// Provided by pockett: the platform is a list of modules. A module registers services, middleware and
// routes; each declares a phase, which decides where its middleware sits in the pipeline.
static class Phase { public const int Scope = 5, Observe = 10, Errors = 20, Auth = 30, Limit = 40, Authorize = 50, Idempotency = 60, Cache = 70, Endpoints = 80, Policies = 90; }

class Api(App app, Clock clock, ServiceCollection services)
{
    public App App { get; } = app;
    public Clock Clock { get; } = clock;
    public ServiceCollection Services { get; } = services;
    public Dictionary<string, object> Parts { get; } = new();
    public T Part<T>(string name) => (T)Parts[name];
    public Task<List<Exchange>> Replay(string section) => Lab.Replay(App, section, Clock);
}

static class Platform
{
    static readonly List<(string Name, int Phase, Action<Api> Setup)> modules = new();
    public static void Add(string name, int phase, Action<Api> setup) { modules.RemoveAll(m => m.Name == name); modules.Add((name, phase, setup)); }
    public static Api Build()
    {
        var api = new Api(new App(), new Clock(), new ServiceCollection());
        foreach (var module in modules.OrderBy(m => m.Phase)) module.Setup(api);
        return api;
    }
}`,
      solutionAdd: cs`// 5. endpoints and binding
Platform.Add("catalog", Phase.Scope, api =>
{
    api.Services.Add<Catalog>(Lifetime.Singleton);
    api.Services.Add<PriceList>(Lifetime.Singleton);
    api.App.UseServices(api.Services);
});
Platform.Add("errors", Phase.Errors, api => api.App.Use("errors", Middlewares.Errors));
Platform.Add("endpoints", Phase.Endpoints, api =>
{
    api.App.MapGet("/slots/{id:int}", (int id, Catalog catalog) => catalog.Slots.FirstOrDefault(s => s.Id == id));
    api.App.MapPost("/quotes", (QuoteRequest q, PriceList prices) => Results.Created("/quotes/1", new { q.SlotId, q.Climbers, total = q.Climbers * prices.PerClimber }));
    api.App.MapControllers(typeof(GymsController));
});
var web = Platform.Build();
Board.Show("endpointTable", web.App.Router.Endpoints.Select(e => new { e.Method, e.Template, kind = e.Metadata.Any() ? "controller" : "minimal" }));
await web.Replay("endpoints");

${TYPES_DIVIDER}
interface IResult { void Execute(HttpContext ctx); }

record Result(int Status, object Body = null, string Location = null) : IResult
{
    public void Execute(HttpContext ctx)
    {
        if (Location != null) ctx.Response.Headers["Location"] = Location;
        if (Body == null) ctx.Response.Status = Status; else ctx.Response.WriteJson(Status, Body);
    }
}

static class Results
{
    public static IResult Ok(object body) => new Result(200, body);
    public static IResult Created(string location, object body) => new Result(201, body, location);
}

static class Binder
{
    public static List<Action<object>> ModelCheckers { get; } = new();

    public static RequestDelegate Adapt(MethodInfo method, Func<HttpContext, object> target) => ctx =>
    {
        var result = method.Invoke(target(ctx), BindingFlags.DoNotWrapExceptions, null, method.GetParameters().Select(p => Bind(p, ctx)).ToArray(), null);
        if (result is IResult r) r.Execute(ctx);
        else if (method.ReturnType == typeof(void)) ctx.Response.Status = 204;
        else if (result == null) ctx.Response.Status = 404;
        else ctx.Response.WriteJson(200, result);
        return Task.CompletedTask;
    };

    static object Bind(ParameterInfo p, HttpContext ctx)
    {
        var type = p.ParameterType;
        if (type == typeof(HttpContext)) return ctx;
        if (ctx.RouteValues().TryGetValue(p.Name, out var raw) || ctx.Request.Query.TryGetValue(p.Name, out raw)) return Parse(raw, p);
        if (type.IsPrimitive || type == typeof(string) || Nullable.GetUnderlyingType(type) != null)
            return p.HasDefaultValue ? p.DefaultValue : throw new HttpException(400, $"missing value for '{p.Name}'");
        if (ctx.Services().GetService(type) is { } service) return service;
        if (ctx.Request.Body == "") throw new HttpException(400, "a JSON body is required");
        object model;
        try { model = JsonSerializer.Deserialize(ctx.Request.Body, type, Json.Options); }
        catch (JsonException e) { throw new HttpException(400, "invalid JSON: " + e.Message); }
        foreach (var check in ModelCheckers) check(model);
        return model;
    }

    static object Parse(string raw, ParameterInfo p)
    {
        try { return System.ComponentModel.TypeDescriptor.GetConverter(Nullable.GetUnderlyingType(p.ParameterType) ?? p.ParameterType).ConvertFromInvariantString(raw); }
        catch (Exception) { throw new HttpException(400, $"'{raw}' is not a valid {p.Name}"); }
    }
}

class RouteAttribute(string prefix) : Attribute { public string Prefix { get; } = prefix; }
class HttpMethodAttribute(string method, string template) : Attribute { public string Method { get; } = method; public string Template { get; } = template; }
class HttpGetAttribute(string template = "") : HttpMethodAttribute("GET", template);
class HttpPostAttribute(string template = "") : HttpMethodAttribute("POST", template);

static class EndpointExtensions
{
    public static Endpoint MapGet(this App app, string template, Delegate handler) => app.Router.Add("GET", template, Binder.Adapt(handler.Method, _ => handler.Target));
    public static Endpoint MapPost(this App app, string template, Delegate handler) => app.Router.Add("POST", template, Binder.Adapt(handler.Method, _ => handler.Target));

    public static App MapControllers(this App app, params Type[] controllers)
    {
        foreach (var type in controllers)
            foreach (var method in type.GetMethods().Where(m => m.GetCustomAttribute<HttpMethodAttribute>() != null))
            {
                var verb = method.GetCustomAttribute<HttpMethodAttribute>();
                var template = string.Join("/", new[] { type.GetCustomAttribute<RouteAttribute>()?.Prefix, verb.Template }.Where(s => !string.IsNullOrEmpty(s)));
                var endpoint = app.Router.Add(verb.Method, "/" + template, Binder.Adapt(method, ctx => ctx.Services().Create(type)));
                foreach (var attribute in type.GetCustomAttributes().Concat(method.GetCustomAttributes())) endpoint.With(attribute);
            }
        return app;
    }

    public static App UseServices(this App app, ServiceCollection services)
    {
        var root = new Lazy<ServiceProvider>(() => services.Build());
        return app.Use("scope", async (ctx, next) =>
        {
            var scope = root.Value.CreateScope();
            ctx.Items["services"] = scope;
            await next(ctx);
        });
    }

    public static ServiceProvider Services(this HttpContext ctx) => (ServiceProvider)ctx.Items["services"];
}

record Gym(int Id, string Name, string City);
record Slot(int Id, int GymId, string Day, string Time, int Capacity);
record QuoteRequest(int SlotId, int Climbers);

class Catalog
{
    public List<Gym> Gyms { get; } = new() { new(1, "Granite Yard", "Leeds"), new(2, "Harbour Boulders", "Bristol"), new(3, "Summit Mill", "Sheffield") };
    public List<Slot> Slots { get; } = new()
    {
        new(11, 1, "2031-06-14", "09:00", 8), new(12, 1, "2031-06-14", "11:00", 8), new(21, 2, "2031-06-14", "09:00", 6),
        new(22, 2, "2031-06-15", "14:00", 6), new(31, 3, "2031-06-14", "10:00", 10),
    };
}

[Route("gyms")]
class GymsController(Catalog catalog)
{
    [HttpGet] public object List(string city = null) => catalog.Gyms.Where(g => city == null || g.City == city);
    [HttpGet("{id:int}")] public Gym Get(int id) => catalog.Gyms.FirstOrDefault(g => g.Id == id);
    [HttpGet("{id:int}/slots")] public object Slots(int id, DateOnly? day = null) => catalog.Slots.Where(s => s.GymId == id && (day == null || s.Day == day.Value.ToString("yyyy-MM-dd")));
}

// Provided by pockett: the platform is a list of modules. A module registers services, middleware and
// routes; each declares a phase, which decides where its middleware sits in the pipeline.
static class Phase { public const int Scope = 5, Observe = 10, Errors = 20, Auth = 30, Limit = 40, Authorize = 50, Idempotency = 60, Cache = 70, Endpoints = 80, Policies = 90; }

class Api(App app, Clock clock, ServiceCollection services)
{
    public App App { get; } = app;
    public Clock Clock { get; } = clock;
    public ServiceCollection Services { get; } = services;
    public Dictionary<string, object> Parts { get; } = new();
    public T Part<T>(string name) => (T)Parts[name];
    public Task<List<Exchange>> Replay(string section) => Lab.Replay(App, section, Clock);
}

static class Platform
{
    static readonly List<(string Name, int Phase, Action<Api> Setup)> modules = new();
    public static void Add(string name, int phase, Action<Api> setup) { modules.RemoveAll(m => m.Name == name); modules.Add((name, phase, setup)); }
    public static Api Build()
    {
        var api = new Api(new App(), new Clock(), new ServiceCollection());
        foreach (var module in modules.OrderBy(m => m.Phase)) module.Setup(api);
        return api;
    }
}`,
      explanation:
        "Binder.Adapt turns any method into a RequestDelegate. For every parameter it picks a source in a fixed order: HttpContext, route values, query values, defaults for simple types, registered services, and finally the JSON body. Conversion failures become HttpException(400) with the parameter name, so the error middleware answers with a client error rather than an outage. The result handling follows the three shapes a handler can return: IResult executes itself, null means 404 and anything else is serialized as 200. MapControllers reads [Route] and [HttpGet]-style attributes by reflection, creates the controller through the container so its constructor is injected, and copies the attributes into the endpoint's metadata. UseServices opens one scope per request and stores it in Items so Services() can find it.",
      hints: [
        { id: "h1", title: "Binding a parameter", content: "static object Bind(ParameterInfo p, HttpContext ctx): if (p.ParameterType == typeof(HttpContext)) return ctx; if (ctx.RouteValues().TryGetValue(p.Name, out var raw) || ctx.Request.Query.TryGetValue(p.Name, out raw)) return Parse(raw, p); Simple types (IsPrimitive, string, Nullable.GetUnderlyingType(type) != null) with nothing found: return p.HasDefaultValue ? p.DefaultValue : throw new HttpException(400, ...). Then ctx.Services().GetService(type) is { } service -> return it. Otherwise it is the body: JsonSerializer.Deserialize(ctx.Request.Body, type, Json.Options) inside try/catch (JsonException) -> HttpException(400, ...)." },
        { id: "h2", title: "Converting and invoking", content: "Parse: System.ComponentModel.TypeDescriptor.GetConverter(Nullable.GetUnderlyingType(p.ParameterType) ?? p.ParameterType).ConvertFromInvariantString(raw) inside try/catch (Exception) -> HttpException(400, $\"'{raw}' is not a valid {p.Name}\"). Invoke with method.Invoke(target(ctx), BindingFlags.DoNotWrapExceptions, null, args, null). Then: IResult -> Execute; void -> Status 204; null -> Status 404; else ctx.Response.WriteJson(200, result). Return Task.CompletedTask." },
        { id: "h3", title: "MapControllers and the scope middleware", content: "foreach controller type, foreach method with GetCustomAttribute<HttpMethodAttribute>() != null: template = string.Join(\"/\", new[] { type.GetCustomAttribute<RouteAttribute>()?.Prefix, verb.Template }.Where(s => !string.IsNullOrEmpty(s))); var endpoint = app.Router.Add(verb.Method, \"/\" + template, Binder.Adapt(method, ctx => ctx.Services().Create(type))); foreach (var attribute in type.GetCustomAttributes().Concat(method.GetCustomAttributes())) endpoint.With(attribute);  UseServices: var root = new Lazy<ServiceProvider>(() => services.Build()); app.Use(\"scope\", async (ctx, next) => { ctx.Items[\"services\"] = root.Value.CreateScope(); await next(ctx); });" },
      ],
      tests: [
        {
          id: "t1",
          description: "the route table lists two minimal endpoints and three controller actions",
          assertionCode: js`
assert(Array.isArray(scene.endpointTable) && Array.isArray(scene.endpoints) && scene.endpoints.length >= 10, "Register the modules and replay the section: await web.Replay(\"endpoints\").");
assert(Array.isArray(scene.endpointTable), "The harness sends the route list with Board.Show(\"endpointTable\", ...).");
const kinds = scene.endpointTable.map((e) => e.kind + " " + e.method + " " + e.template).sort();
assertEqual(kinds, ["controller GET /gyms", "controller GET /gyms/{id:int}", "controller GET /gyms/{id:int}/slots", "minimal GET /slots/{id:int}", "minimal POST /quotes"], "endpoint table (controller actions must carry their attributes in Metadata)");`,
        },
        {
          id: "t2",
          description: "route values are bound to typed parameters, and a null result is a 404",
          assertionCode: js`
assert(Array.isArray(scene.endpointTable) && Array.isArray(scene.endpoints) && scene.endpoints.length >= 10, "Register the modules and replay the section: await web.Replay(\"endpoints\").");
assert(Array.isArray(scene.endpoints), "Replay the section with web.Replay(\"endpoints\").");
const [list, , one, missing] = scene.endpoints;
assertEqual(list.status, 200, "GET /gyms");
assertEqual(JSON.parse(list.body).length, 3, "three gyms");
assertEqual(JSON.parse(one.body), { id: 2, name: "Harbour Boulders", city: "Bristol" }, "GET /gyms/2");
assertEqual(missing.status, 404, "GET /gyms/9: the action returned null");`,
        },
        {
          id: "t3",
          description: "query values bind by name, and optional parameters use their defaults",
          assertionCode: js`
assert(Array.isArray(scene.endpointTable) && Array.isArray(scene.endpoints) && scene.endpoints.length >= 10, "Register the modules and replay the section: await web.Replay(\"endpoints\").");
const [, filtered, , , slots] = scene.endpoints;
assertEqual(JSON.parse(filtered.body).map((g) => g.name), ["Granite Yard"], "GET /gyms?city=Leeds");
assertEqual(JSON.parse(slots.body).map((s) => s.id), [11, 12], "GET /gyms/1/slots?day=2031-06-14 binds the date");`,
        },
        {
          id: "t4",
          description: "a value that cannot be converted is a 400 that names the problem",
          assertionCode: js`
assert(Array.isArray(scene.endpointTable) && Array.isArray(scene.endpoints) && scene.endpoints.length >= 10, "Register the modules and replay the section: await web.Replay(\"endpoints\").");
const bad = scene.endpoints[5];
assertEqual(bad.status, 400, "GET /gyms/1/slots?day=tomorrow");
assert(bad.body.includes("tomorrow"), "the error message should repeat the offending text: " + bad.body);
assert(bad.body.includes("day"), "and name the parameter: " + bad.body);`,
        },
        {
          id: "t5",
          description: "a minimal endpoint receives injected services",
          assertionCode: js`
assert(Array.isArray(scene.endpointTable) && Array.isArray(scene.endpoints) && scene.endpoints.length >= 10, "Register the modules and replay the section: await web.Replay(\"endpoints\").");
const slot = scene.endpoints[6];
assertEqual(slot.status, 200, "GET /slots/12");
assertEqual(JSON.parse(slot.body), { id: 12, gymId: 1, day: "2031-06-14", time: "11:00", capacity: 8 }, "the Catalog service is injected and the slot is serialized");`,
        },
        {
          id: "t6",
          description: "a JSON body is bound to a model and an IResult controls the response",
          assertionCode: js`
assert(Array.isArray(scene.endpointTable) && Array.isArray(scene.endpoints) && scene.endpoints.length >= 10, "Register the modules and replay the section: await web.Replay(\"endpoints\").");
const quote = scene.endpoints[7];
assertEqual(quote.status, 201, "POST /quotes");
assertEqual(quote.headers["Location"], "/quotes/1", "Results.Created sets the Location header");
assertEqual(JSON.parse(quote.body), { slotId: 12, climbers: 3, total: 30 }, "3 climbers at 10 each");`,
        },
        {
          id: "t7",
          description: "invalid or missing JSON is a client error, not a crash",
          assertionCode: js`
assert(Array.isArray(scene.endpointTable) && Array.isArray(scene.endpoints) && scene.endpoints.length >= 10, "Register the modules and replay the section: await web.Replay(\"endpoints\").");
const [broken, empty] = [scene.endpoints[8], scene.endpoints[9]];
assertEqual(broken.status, 400, "POST /quotes with truncated JSON");
assertEqual(empty.status, 400, "POST /quotes with no body");
assert(!/Exception|at Program/.test(broken.body + empty.body), "error bodies must not contain stack traces");`,
        },
      ],
      unlocks: ["ca-endpoints"],
      checks: [
        {
          prompt: "A handler method throws `ConflictException`. You invoked it with plain `method.Invoke(...)`. What reaches your error middleware?",
          question: {
            type: "choice",
            options: [
              "A TargetInvocationException wrapping the ConflictException",
              "The ConflictException itself",
              "Nothing: reflection swallows exceptions",
              "An ArgumentException",
            ],
            answer: 0,
          },
          explanation: "`MethodInfo.Invoke` wraps whatever the method throws. Your middleware would see a `TargetInvocationException`, not the `HttpException`, and answer 500. `BindingFlags.DoNotWrapExceptions` lets the original exception through.",
        },
        {
          prompt: "`GET /gyms/abc` fails the `{id:int}` route constraint, but `GET /gyms/1/slots?day=tomorrow` matches its route and fails binding. What are the two statuses?",
          question: { type: "choice", options: ["404 then 400", "400 then 400", "404 then 404", "400 then 404"], answer: 0 },
          explanation: "A failed constraint means no route matches, so the answer is 404. Once a route matches, the request has reached a handler; a value that cannot be bound to a parameter is a client error: 400.",
        },
        {
          prompt: "Why does a controller get built through the container instead of `new GymsController()`?",
          question: {
            type: "choice",
            options: [
              "So its constructor parameters are injected from the request's scope",
              "Because C# forbids calling constructors from reflection",
              "To make the controller a singleton",
              "To avoid copying its attributes",
            ],
            answer: 0,
          },
          explanation: "The constructor declares the controller's dependencies (a Catalog, later a repository and the current user). Only the container can supply them, and it does so from the current request's scope so scoped services line up.",
        },
      ],
    },
    // ───────────────────────── 6 ─────────────────────────
    {
      id: "csharp-api-6-problems",
      title: "Validation and problem details",
      minutes: 45,
      xp: 240,
      concepts: ["attribute-based validation", "reflection", "400 vs 422", "RFC 7807 problem details", "error middleware", "not leaking internals"],
      learn: md`### Errors are part of the API

A client can only react to a failure it can understand. If your API answers \`500\` with a stack trace for a typo in a request, three things go wrong at once: the caller cannot tell what to fix, an attacker learns about your internals, and your error dashboard fills with noise that is really the caller's fault. This lesson gives every failure the same machine-readable shape and keeps your internals private.

### 400 or 422?

Both mean "the client's fault", and both are defensible. The distinction we use:

- **400 Bad Request**: the request could not even be *understood*: malformed JSON, a route value that is not a number, a body that is missing.
- **422 Unprocessable Content**: the request was understood and well formed, but its *values* break rules: \`climbers: 12\` in a gym that allows at most 8, a blank name.

Stick to a convention and document it. Clients that distinguish "my encoder is broken" from "my user typed something wrong" will thank you.

### Validation by attributes

A rule is a small object that inspects one value and returns a message or \`null\`. Attributes let you attach rules to the model itself, next to the field they describe:

~~~csharp
record NewBooking(
    [property: Range(1, 100000)] int SlotId,
    [property: Range(1, 8)] int Climbers,
    [property: NotBlank] string Name);
~~~

Two details that trip people up. First, on a **positional record** the attribute must say \`[property: ...]\`; without the target it lands on the constructor *parameter*, where a reflection scan of the properties never sees it. Second, the validator reads rules by **reflection**: for each public property, \`GetCustomAttributes<RuleAttribute>()\` gives the rules, \`GetValue(model)\` gives the value, and the property's name (converted to \`camelCase\` to match the JSON the client sent) becomes the key of the error dictionary. The result maps every failing field to *all* of its messages, because telling a user about one error at a time is how forms become infuriating.

Validation answers the question "is this request internally sensible?". It does not know about the world. "Slot 99 does not exist" and "the slot is full" are *business rules* that need data, so they live in the domain code (lesson 7) and surface as \`404\`/\`409\`.

### The seam: where validation plugs in

Your binder from lesson 5 exposes \`Binder.ModelCheckers\`, a list of callbacks run on every model after it is deserialized. Registering a checker that calls the validator and throws a \`ValidationException\` means *no handler ever runs with an invalid model*, and nobody has to remember to call validation. Frameworks provide the same kind of seam (filters, validation providers), because "remember to validate" is a rule that always gets broken eventually.

### Problem details: one shape for every failure

**RFC 7807** defines a JSON document for HTTP errors, served as \`application/problem+json\`:

~~~json
{
  "type": "https://api.crux.example/problems/422",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "One or more fields are invalid.",
  "instance": "/bookings/check",
  "errors": { "climbers": ["must be between 1 and 8"] }
}
~~~

- \`type\` is a stable identifier for the *kind* of problem, ideally a URL that documents it. Clients branch on it.
- \`title\` is a short, constant, human-readable summary of the type.
- \`status\` repeats the HTTP status so the body stands on its own when logged.
- \`detail\` explains *this occurrence*.
- \`instance\` identifies the request (here, the path).
- Extra members (\`errors\`) are allowed and expected.

Your \`Problems\` middleware sits at the outer edge, catches \`ValidationException\`, other \`HttpException\`s and everything else, and writes a problem document for each. It also upgrades **empty error responses**: when the router answers \`404\` or \`405\` with no body, the middleware fills in a proper problem so even routing failures look the same.

### Never leak internals

For an unexpected exception the \`detail\` must be generic (\`"An unexpected error occurred."\`), no message, no type name, no stack trace. The real exception is stashed in \`ctx.Items["exception"]\` so that logging (lesson 12) can record it under a correlation id the caller can quote to support. A client should be able to say "request web-9001 failed" and you should be able to find everything about it. It should not be able to learn your connection string.

### Common mistakes

- Putting rule attributes on a positional record without \`property:\`.
- Validating inside each handler by hand, so one forgotten endpoint accepts anything.
- Returning only the first error.
- Using \`ex.Message\` as \`detail\` for unexpected exceptions.
- Mixing conventions: \`400\` for validation on one endpoint and \`422\` on the next.`,
      mission: md`Support keeps forwarding screenshots: a booking form that says "Error 500" when someone types 12 climbers, a mobile app that cannot tell *which* field was wrong, and one stack trace that included a database host name. The fix is one consistent failure format and a validation step that nobody can forget.

You will write the rules, the validator and a \`Problems\` middleware, plug the validator into the binder, and replace the plain error handler with the new one. The harness replays seven requests: a good one, a bad one with three broken fields, truncated JSON, a conflict, a crash, a missing route and a wrong verb. When this lesson passes, the **Problem details** panel lights up.`,
      tasks: [
        "Write RuleAttribute implementations: NotBlank (message \"must not be blank\") and Range(min, max) (\"must be between {min} and {max}\", only for ints)",
        "Write Validator.Validate(model): for each property, run its RuleAttribute checks and return a dictionary from the camelCase property name to all messages, leaving out properties that pass",
        "Write ValidationException (status 422, keeps the Errors dictionary), ConflictException (409) and NotFoundException (404) as HttpException subclasses",
        "Write Middlewares.Problems: write application/problem+json documents (type, title, status, detail, instance, errors) for ValidationException, any HttpException, and unexpected exceptions (generic detail, exception kept in ctx.Items[\"exception\"]); also fill in a problem when a response is 4xx/5xx with an empty body",
        "Register ModelCheckers, the replacement \"errors\" module and the \"drills\" module from the starter comment",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 6. Check every bound model, and answer every failure with a problem document.
//  Binder.ModelCheckers.Add(model => { throw a ValidationException when Validator.Validate(model) finds errors });
//  Platform.Add("errors", Phase.Errors, api => api.App.Use("problems", Middlewares.Problems));   // replaces the plain "errors" module
//  Platform.Add("drills", Phase.Endpoints, api => {
//      MapPost("/bookings/check", (NewBooking booking) => Results.Ok(booking));
//      MapGet("/drill/conflict", ctx => throw new ConflictException("slot 12 is full"));
//      MapGet("/drill/crash", ctx => throw new InvalidOperationException("secret connection string")); });
await Platform.Build().Replay("problems");

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── The rules (NotBlank, Range), Validator.Validate (camelCase property -> messages), the exceptions and Middlewares.Problems.
abstract class RuleAttribute : Attribute { public abstract string Check(object value); }
class NotBlankAttribute : RuleAttribute { public override string Check(object v) => throw new NotImplementedException(); }
class RangeAttribute(int min, int max) : RuleAttribute { public override string Check(object v) => throw new NotImplementedException(); }

static class Validator
{
    public static Dictionary<string, string[]> Validate(object model) => throw new NotImplementedException();
}

class ValidationException : HttpException { public ValidationException(Dictionary<string, string[]> errors) : base(422, "One or more fields are invalid.") { } }
class ConflictException : HttpException { public ConflictException(string message) : base(409, message) { } }
class NotFoundException : HttpException { public NotFoundException(string message) : base(404, message) { } }

static partial class Middlewares
{
    public static Task Problems(HttpContext ctx, RequestDelegate next) => throw new NotImplementedException();
}

// Provided: the model with its rules, and the shape of a problem document.
record NewBooking([property: Range(1, 100000)] int SlotId, [property: Range(1, 8)] int Climbers, [property: NotBlank] string Name);
record ProblemDetails(string Type, string Title, int Status, string Detail, string Instance, Dictionary<string, string[]> Errors = null);`,
      solutionAdd: cs`// 6. validation and problem details
Binder.ModelCheckers.Add(model =>
{
    var errors = Validator.Validate(model);
    if (errors.Count > 0) throw new ValidationException(errors);
});
Platform.Add("errors", Phase.Errors, api => api.App.Use("problems", Middlewares.Problems));
Platform.Add("drills", Phase.Endpoints, api =>
{
    api.App.MapPost("/bookings/check", (NewBooking booking) => Results.Ok(booking));
    api.App.MapGet("/drill/conflict", ctx => throw new ConflictException("slot 12 is full"));
    api.App.MapGet("/drill/crash", ctx => throw new InvalidOperationException("secret connection string"));
});
await Platform.Build().Replay("problems");

${TYPES_DIVIDER}
abstract class RuleAttribute : Attribute { public abstract string Check(object value); }
class NotBlankAttribute : RuleAttribute { public override string Check(object v) => string.IsNullOrWhiteSpace(v as string) ? "must not be blank" : null; }
class RangeAttribute(int min, int max) : RuleAttribute { public override string Check(object v) => v is int n && (n < min || n > max) ? $"must be between {min} and {max}" : null; }

static class Validator
{
    public static Dictionary<string, string[]> Validate(object model) =>
        model.GetType().GetProperties()
            .Select(p => (Name: JsonNamingPolicy.CamelCase.ConvertName(p.Name), Errors: p.GetCustomAttributes<RuleAttribute>().Select(r => r.Check(p.GetValue(model))).Where(e => e != null).ToArray()))
            .Where(x => x.Errors.Length > 0)
            .ToDictionary(x => x.Name, x => x.Errors);
}

record NewBooking([property: Range(1, 100000)] int SlotId, [property: Range(1, 8)] int Climbers, [property: NotBlank] string Name);
record ProblemDetails(string Type, string Title, int Status, string Detail, string Instance, Dictionary<string, string[]> Errors = null);

class ValidationException(Dictionary<string, string[]> errors) : HttpException(422, "One or more fields are invalid.") { public Dictionary<string, string[]> Errors { get; } = errors; }
class ConflictException(string message) : HttpException(409, message);
class NotFoundException(string message) : HttpException(404, message);

static partial class Middlewares
{
    public static async Task Problems(HttpContext ctx, RequestDelegate next)
    {
        try { await next(ctx); }
        catch (ValidationException e) { Problem(ctx, e.Status, e.Message, e.Errors); }
        catch (HttpException e) { Problem(ctx, e.Status, e.Message); }
        catch (Exception e) { ctx.Items["exception"] = e; Problem(ctx, 500, "An unexpected error occurred."); }
        if (ctx.Response.Status >= 400 && ctx.Response.Body == "") Problem(ctx, ctx.Response.Status, null);
    }

    static void Problem(HttpContext ctx, int status, string detail, Dictionary<string, string[]> errors = null)
    {
        var title = status switch { 400 => "Bad Request", 401 => "Unauthorized", 403 => "Forbidden", 404 => "Not Found", 405 => "Method Not Allowed", 409 => "Conflict", 422 => "Unprocessable Entity", 429 => "Too Many Requests", _ => "Internal Server Error" };
        ctx.Response.WriteJson(status, new ProblemDetails("https://api.crux.example/problems/" + status, title, status, detail, ctx.Request.Path, errors));
        ctx.Response.Headers["Content-Type"] = "application/problem+json";
    }
}`,
      explanation:
        "The checker added to Binder.ModelCheckers runs after every JSON body is deserialized, so an invalid NewBooking never reaches a handler: Validator reflects over the properties, runs each RuleAttribute and returns every message for every failing field, keyed by the camelCase name the client used. The Problems middleware sits where the old error handler was (same module name, so registering it replaces the earlier one) and turns each exception kind into an RFC 7807 document: validation errors keep their field dictionary, other HttpExceptions keep their message, and anything unexpected gets a generic detail while the exception itself goes into ctx.Items for logging. After the pipeline returns, an empty 4xx/5xx response from the router also becomes a problem so every failure looks the same.",
      hints: [
        { id: "h1", title: "Rules and the validator", content: "class RangeAttribute(int min, int max) : RuleAttribute { public override string Check(object v) => v is int n && (n < min || n > max) ? $\"must be between {min} and {max}\" : null; } NotBlank: string.IsNullOrWhiteSpace(v as string) ? \"must not be blank\" : null. Validate: model.GetType().GetProperties().Select(p => (Name: JsonNamingPolicy.CamelCase.ConvertName(p.Name), Errors: p.GetCustomAttributes<RuleAttribute>().Select(r => r.Check(p.GetValue(model))).Where(e => e != null).ToArray())).Where(x => x.Errors.Length > 0).ToDictionary(x => x.Name, x => x.Errors)" },
        { id: "h2", title: "The Problems middleware", content: "try { await next(ctx); } catch (ValidationException e) { Problem(ctx, e.Status, e.Message, e.Errors); } catch (HttpException e) { Problem(ctx, e.Status, e.Message); } catch (Exception e) { ctx.Items[\"exception\"] = e; Problem(ctx, 500, \"An unexpected error occurred.\"); } after that: if (ctx.Response.Status >= 400 && ctx.Response.Body == \"\") Problem(ctx, ctx.Response.Status, null);  Problem writes new ProblemDetails(\"https://api.crux.example/problems/\" + status, title, status, detail, ctx.Request.Path, errors) with WriteJson and then sets Headers[\"Content-Type\"] = \"application/problem+json\". Titles: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 405 Method Not Allowed, 409 Conflict, 422 Unprocessable Entity, 429 Too Many Requests, otherwise Internal Server Error." },
        { id: "h3", title: "Wiring it up", content: "Binder.ModelCheckers.Add(model => { var errors = Validator.Validate(model); if (errors.Count > 0) throw new ValidationException(errors); }); Platform.Add(\"errors\", Phase.Errors, api => api.App.Use(\"problems\", Middlewares.Problems)); using the same module name \"errors\" as lesson 5 replaces that module. ValidationException : HttpException(422, \"One or more fields are invalid.\") with a public Errors property." },
      ],
      tests: [
        {
          id: "t1",
          description: "a valid model passes validation untouched",
          assertionCode: js`
assert(Array.isArray(scene.problems) && scene.problems.length >= 7, "Replay the section: await Platform.Build().Replay(\"problems\").");
assert(Array.isArray(scene.problems), "Replay the section with Platform.Build().Replay(\"problems\").");
const ok = scene.problems[0];
assertEqual(ok.status, 200, "POST /bookings/check with a valid body");
assertEqual(JSON.parse(ok.body), { slotId: 12, climbers: 2, name: "Priya" }, "echoed model");`,
        },
        {
          id: "t2",
          description: "invalid fields give a 422 problem listing every broken field",
          assertionCode: js`
assert(Array.isArray(scene.problems) && scene.problems.length >= 7, "Replay the section: await Platform.Build().Replay(\"problems\").");
const bad = scene.problems[1];
assertEqual(bad.status, 422, "status for a model that breaks rules");
assertEqual(bad.headers["Content-Type"], "application/problem+json", "content type");
const p = JSON.parse(bad.body);
assertEqual(Object.keys(p.errors).sort(), ["climbers", "name", "slotId"], "all three broken fields are reported, named in camelCase");
assert(p.errors.climbers[0].includes("1") && p.errors.climbers[0].includes("8"), "the message states the allowed range: " + p.errors.climbers[0]);
assertEqual(p.status, 422, "status member repeats the HTTP status");
assertEqual(p.instance, "/bookings/check", "instance is the request path");`,
        },
        {
          id: "t3",
          description: "malformed JSON is a 400, not a 422",
          assertionCode: js`
assert(Array.isArray(scene.problems) && scene.problems.length >= 7, "Replay the section: await Platform.Build().Replay(\"problems\").");
const bad = scene.problems[2];
assertEqual(bad.status, 400, "truncated JSON");
const p = JSON.parse(bad.body);
assertEqual(p.title, "Bad Request", "title");
assert(p.errors == null, "there is no per-field list when the body could not be read");`,
        },
        {
          id: "t4",
          description: "domain exceptions keep their status and message",
          assertionCode: js`
assert(Array.isArray(scene.problems) && scene.problems.length >= 7, "Replay the section: await Platform.Build().Replay(\"problems\").");
const c = scene.problems[3];
assertEqual(c.status, 409, "ConflictException");
const p = JSON.parse(c.body);
assertEqual(p.title, "Conflict", "title");
assertEqual(p.detail, "slot 12 is full", "detail carries this occurrence's message");
assertEqual(p.type, "https://api.crux.example/problems/409", "type is stable per status");`,
        },
        {
          id: "t5",
          description: "an unexpected exception is a 500 that reveals nothing",
          assertionCode: js`
assert(Array.isArray(scene.problems) && scene.problems.length >= 7, "Replay the section: await Platform.Build().Replay(\"problems\").");
const crash = scene.problems[4];
assertEqual(crash.status, 500, "status");
assertEqual(crash.headers["Content-Type"], "application/problem+json", "content type");
assert(!/secret|connection|InvalidOperation/i.test(crash.body), "the exception text must not reach the client: " + crash.body);`,
        },
        {
          id: "t6",
          description: "routing failures become problem documents too",
          assertionCode: js`
assert(Array.isArray(scene.problems) && scene.problems.length >= 7, "Replay the section: await Platform.Build().Replay(\"problems\").");
const missing = scene.problems[5];
assertEqual(missing.status, 404, "unknown path");
assertEqual(JSON.parse(missing.body).title, "Not Found", "a 404 with no body is upgraded to a problem");
const wrong = scene.problems[6];
assertEqual(wrong.status, 405, "wrong verb");
assertEqual(wrong.headers["Allow"], "GET", "the Allow header set by the router survives");
assertEqual(JSON.parse(wrong.body).status, 405, "and gets a body");`,
        },
      ],
      unlocks: ["ca-problems"],
      checks: [
        {
          prompt: "Which request deserves 400 and which deserves 422?\n\nA: `{\"climbers\":` (the JSON stops)\nB: `{\"climbers\": 12}` (the gym allows 8)",
          question: { type: "choice", options: ["A is 400, B is 422", "A is 422, B is 400", "Both are 400", "Both are 422"], answer: 0 },
          explanation: "A cannot be parsed at all: the request is malformed, so 400. B is well formed but breaks a rule on its values, so 422. The line is: *understood but unacceptable* versus *not understood*.",
        },
        {
          prompt: "You declare `record NewBooking([Range(1, 8)] int Climbers)` and the validator finds no rules on it. Why?",
          question: {
            type: "choice",
            options: [
              "Without `property:` the attribute is attached to the constructor parameter, which a scan of properties never sees",
              "Records cannot have attributes",
              "Range only works on classes",
              "GetCustomAttributes needs the attribute to be public",
            ],
            answer: 0,
          },
          explanation: "On a positional record the compiler generates a property from each parameter. An unqualified attribute applies to the parameter. Writing `[property: Range(1, 8)]` places it on the generated property, where `GetProperties()` finds it.",
        },
        {
          prompt: "Why does the 500 response carry a generic `detail` while the real exception is stored in `ctx.Items[\"exception\"]`?",
          question: {
            type: "choice",
            options: [
              "Clients must not see internals, but operators still need the full detail to log under a correlation id",
              "Exceptions cannot be serialized to JSON",
              "To make the response smaller",
              "Because ProblemDetails has no field for messages",
            ],
            answer: 0,
          },
          explanation: "Exception messages routinely contain connection strings, file paths and SQL. The client gets a stable generic message; the logging middleware reads the stashed exception and records it next to the request's correlation id.",
        },
      ],
    },
    // ───────────────────────── 7 ─────────────────────────
    {
      id: "csharp-api-7-store",
      title: "Repository, unit of work and row versions",
      minutes: 60,
      xp: 290,
      concepts: ["unit of work", "repository pattern", "change tracking", "identity map", "optimistic concurrency", "row version", "LINQ queries", "409 Conflict"],
      learn: md`### Keeping bookings somewhere

The platform needs to remember bookings. Real systems use a database; the *shape* of the code around it is what we are learning, and it is the same shape Entity Framework Core uses: a **context** that tracks entities, a **repository** that asks it questions, and a **unit of work** that writes everything that changed in one go.

Our store lives in memory, but we treat it like a database on purpose. Rows are kept as **JSON text**, so every read hands you a *copy*, and two requests that load the same booking get two different objects. If the "database" returned the same object to everyone, you could never see a lost update, because there would only be one object.

### The unit of work and change tracking

A **unit of work** collects the changes made during one business operation and commits them together. \`DbContext\` is yours:

- \`Find<T>(id)\` loads a row, deserializes it and **tracks** it: the context remembers a snapshot (the row's JSON as loaded).
- \`Add(entity)\` tracks a new entity as pending insert.
- \`SaveChanges()\` works out what changed by comparing each tracked entity's current JSON with its snapshot, then writes only those. Nothing is saved until you call it, and one call saves everything.
- An **identity map** guarantees that asking for booking 1 twice in one context returns the *same object*, so two parts of one request cannot hold diverging versions of one row.

The context is registered **scoped** (lesson 4): one per request, which makes "one request = one unit of work" literally true, and the captive-dependency rule keeps it from leaking between requests.

### Optimistic concurrency

Two people open booking 1 at the same time. One changes the group size and saves. The other, still looking at the old data, changes it too and saves. Without protection the second save silently overwrites the first: a **lost update**.

Pessimistic locking prevents it by making the second person wait, which does not survive web latency (the "lock" would be held while someone thinks). **Optimistic concurrency** assumes conflicts are rare and detects them instead: every row carries a **version** that increases on each write. The client sends back the version it read; the save succeeds only if the stored version is still that one.

~~~csharp
db.ExpectVersion(booking, body.Version);   // "I read version 1"
booking.Climbers = body.Climbers;
db.SaveChanges();                           // throws ConcurrencyException if the row is no longer at version 1
~~~

A mismatch becomes **409 Conflict** with a message telling the client what happened. The client's job is to re-read and retry, or to ask the user. (\`412 Precondition Failed\` is the stricter answer when the client used an \`If-Match\` header; we keep the version in the body, so 409.)

Two implementation details matter. **Check every changed row before writing any**, so a conflict on the third row cannot leave the first two half-saved: all or nothing. And **bump the version inside the same step** as the write: version = expected + 1.

### The repository

A repository gives domain code a vocabulary (\`Get(id)\`, \`ForSlot(slotId)\`) instead of exposing the raw context. Its methods are plain LINQ over tracked entities:

~~~csharp
public IEnumerable<Booking> ForSlot(int slotId) => db.Set<Booking>().Where(b => b.SlotId == slotId && b.Status == "Confirmed");
~~~

Two warnings from real ORMs apply even to this toy. **Deferred execution**: a LINQ query is a recipe, not a result; materialize with \`ToList()\` before the context goes away. And **N+1**: a loop that calls \`Get(id)\` per item runs one query per item; fetch the set once.

### The controller

\`BookingsController\` gets everything by constructor injection (lesson 4/5): the repository, the context, the catalog and the current user (an \`ICurrentUser\` abstraction with a fixed stand-in for now; lesson 8 supplies the real one). \`Create\` looks the slot up (\`404\` if missing), computes the places left with a LINQ sum (\`409\` if the group is too big), adds the booking and saves. \`Update\` loads the booking, tells the context which version the client saw, applies the change and saves.

One honest caveat: "check the places left, then insert" is a **check-then-act** race. Two simultaneous requests could both see one place left. A real database closes that gap with a constraint or a transaction at the right isolation level. We note it here because it is the most common bug in booking systems.

### Common mistakes

- Returning the stored object itself, so callers mutate "the database" without \`SaveChanges\`.
- Bumping the version in the controller instead of in \`SaveChanges\`.
- Saving rows one by one and discovering the conflict halfway through.
- Using the client-supplied version as the new stored version.
- Catching \`ConcurrencyException\` and retrying blindly: you would overwrite the very change the exception protects.`,
      mission: md`The booking site has been writing to a shared list in memory. Last week two coaches edited the same group booking at once and one change vanished; nobody noticed until a group of eight showed up for a slot sized for six.

You will build the storage layer properly: a \`DbContext\` with change tracking and versioned rows, a repository, and a \`BookingsController\` whose \`PUT\` refuses stale updates with a 409. The harness replays eight requests: create, overbook, read, update, update with the stale version, create again, and two lookups of things that do not exist. When this lesson passes, the **Booking ledger** shows the rows with their versions.`,
      tasks: [
        "Write DbContext: tracked entries (entity, snapshot JSON, expected version, added flag); Set<T>() loads every row; Find<T>(id) returns the already-tracked object when there is one (identity map), otherwise loads and tracks a copy; Add; ExpectVersion",
        "Write SaveChanges: assign ids to new entities, call Saving(added), assign ids again, work out the changed entries (added or JSON differs from the snapshot), check every non-added row's stored version against its expected version and throw ConcurrencyException before writing anything, then write each row with Version = 1 (new) or expected + 1 and refresh its snapshot",
        "Write BookingRepository: Get(id) (virtual), ForSlot(slotId) (confirmed bookings only, LINQ) and Add",
        "Write BookingsController: GET /bookings/{id:int}, POST /bookings (NewBooking: NotFoundException for an unknown slot, ConflictException \"only {left} places left in slot {id}\", save and return Results.Created(\"/bookings/{id}\", booking)) and PUT /bookings/{id:int} (ChangeBooking: ExpectVersion, change Climbers, save). Register the \"store\" and \"bookings\" modules from the starter comment",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 7. Two modules, then the harness replays the "bookings" section.
//  Platform.Add("store", Phase.Scope, api => {          // phase Scope: services must be registered before the endpoints use them
//      var db = new Database();  api.Parts["db"] = db;
//      register db (Singleton, factory _ => db), DbContext (Scoped), BookingRepository (Scoped) and
//      ICurrentUser (Scoped, factory _ => new FixedUser(3, "member")); });
//  Platform.Add("bookings", Phase.Endpoints, api => api.App.MapControllers(typeof(BookingsController)));
var shop = Platform.Build();
await shop.Replay("bookings");
Board.Show("rows", shop.Part<Database>("db").Table(typeof(Booking)).Values.Select(json => JsonSerializer.Deserialize<Booking>(json, Json.Options)));

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── DbContext (Set, Find with an identity map, Add, ExpectVersion, SaveChanges with change detection and a
// version check before any write), BookingRepository and BookingsController (Get, Create, Update).
partial class DbContext(Database db)
{
    partial void Saving(List<Entity> added); // called by SaveChanges once new rows have ids; lesson 15 uses it
    public IEnumerable<T> Set<T>() where T : Entity => throw new NotImplementedException();
    public T Find<T>(int id) where T : Entity => throw new NotImplementedException();
    public void Add(Entity e) => throw new NotImplementedException();
    public void ExpectVersion(Entity e, int version) => throw new NotImplementedException();
    public int SaveChanges() => throw new NotImplementedException();
}

class BookingRepository(DbContext db)
{
    public virtual Booking Get(int id) => throw new NotImplementedException();
    public IEnumerable<Booking> ForSlot(int slotId) => throw new NotImplementedException();
    public void Add(Booking booking) => throw new NotImplementedException();
}

[Route("bookings")]
class BookingsController(BookingRepository bookings, DbContext db, Catalog catalog, ICurrentUser user)
{
}

// Provided: entities, the database, the user abstraction and the update model.
abstract class Entity { public int Id { get; set; } public int Version { get; set; } }

class Booking : Entity
{
    public int SlotId { get; set; }
    public int MemberId { get; set; }
    public int Climbers { get; set; }
    public string Name { get; set; }
    public string Status { get; set; } = "Confirmed";
}

class ConcurrencyException(string message) : ConflictException(message);

class Database
{
    readonly Dictionary<Type, SortedDictionary<int, string>> tables = new();
    readonly Dictionary<Type, int> sequences = new();
    public SortedDictionary<int, string> Table(Type type) => tables.TryGetValue(type, out var rows) ? rows : tables[type] = new();
    public int NextId(Type type) => sequences[type] = sequences.GetValueOrDefault(type) + 1;
}

interface ICurrentUser { int MemberId { get; } string Role { get; } }
record FixedUser(int MemberId, string Role) : ICurrentUser;
record ChangeBooking([property: Range(1, 100000)] int Version, [property: Range(1, 8)] int Climbers);
class HttpPutAttribute(string template = "") : HttpMethodAttribute("PUT", template);`,
      solutionAdd: cs`// 7. repository and unit of work
Platform.Add("store", Phase.Scope, api =>
{
    var db = new Database();
    api.Parts["db"] = db;
    api.Services.Add(Lifetime.Singleton, _ => db);
    api.Services.Add<DbContext>(Lifetime.Scoped);
    api.Services.Add<BookingRepository>(Lifetime.Scoped);
    api.Services.Add<ICurrentUser>(Lifetime.Scoped, _ => new FixedUser(3, "member"));
});
Platform.Add("bookings", Phase.Endpoints, api => api.App.MapControllers(typeof(BookingsController)));
var shop = Platform.Build();
await shop.Replay("bookings");
Board.Show("rows", shop.Part<Database>("db").Table(typeof(Booking)).Values.Select(json => JsonSerializer.Deserialize<Booking>(json, Json.Options)));

${TYPES_DIVIDER}
abstract class Entity { public int Id { get; set; } public int Version { get; set; } }

class Booking : Entity
{
    public int SlotId { get; set; }
    public int MemberId { get; set; }
    public int Climbers { get; set; }
    public string Name { get; set; }
    public string Status { get; set; } = "Confirmed";
}

class ConcurrencyException(string message) : ConflictException(message);

class Database
{
    readonly Dictionary<Type, SortedDictionary<int, string>> tables = new();
    readonly Dictionary<Type, int> sequences = new();
    public SortedDictionary<int, string> Table(Type type) => tables.TryGetValue(type, out var rows) ? rows : tables[type] = new();
    public int NextId(Type type) => sequences[type] = sequences.GetValueOrDefault(type) + 1;
}

// Tracks what it loads and writes only what changed: the unit of work.
partial class DbContext(Database db)
{
    class Entry { public Entity Entity; public string Snapshot; public int Expected; public bool Added; }
    readonly List<Entry> entries = new();
    static string Dump(Entity e) => JsonSerializer.Serialize(e, e.GetType(), Json.Options);
    partial void Saving(List<Entity> added);

    public IEnumerable<T> Set<T>() where T : Entity => db.Table(typeof(T)).Keys.ToList().Select(Find<T>);

    public T Find<T>(int id) where T : Entity
    {
        if (entries.FirstOrDefault(e => e.Entity is T t && t.Id == id) is { } tracked) return (T)tracked.Entity;
        if (!db.Table(typeof(T)).TryGetValue(id, out var json)) return null;
        var entity = JsonSerializer.Deserialize<T>(json, Json.Options);
        entries.Add(new Entry { Entity = entity, Snapshot = json, Expected = entity.Version });
        return entity;
    }

    public void Add(Entity e) => entries.Add(new Entry { Entity = e, Added = true });
    public void ExpectVersion(Entity e, int version) => entries.First(x => x.Entity == e).Expected = version;

    public int SaveChanges()
    {
        void AssignIds() { foreach (var e in entries.Where(e => e.Added && e.Entity.Id == 0)) e.Entity.Id = db.NextId(e.Entity.GetType()); }
        AssignIds();
        Saving(entries.Where(e => e.Added).Select(e => e.Entity).ToList());
        AssignIds();
        var changed = entries.Where(e => e.Added || Dump(e.Entity) != e.Snapshot).ToList();
        foreach (var e in changed.Where(e => !e.Added)) // check every row before writing any of them
        {
            var current = (Entity)JsonSerializer.Deserialize(db.Table(e.Entity.GetType())[e.Entity.Id], e.Entity.GetType(), Json.Options);
            if (current.Version != e.Expected) throw new ConcurrencyException($"{e.Entity.GetType().Name} {e.Entity.Id} was changed by someone else (you had version {e.Expected}, it is now {current.Version})");
        }
        foreach (var e in changed)
        {
            e.Entity.Version = e.Added ? 1 : e.Expected + 1;
            e.Snapshot = Dump(e.Entity);
            db.Table(e.Entity.GetType())[e.Entity.Id] = e.Snapshot;
            (e.Added, e.Expected) = (false, e.Entity.Version);
        }
        return changed.Count;
    }
}

class BookingRepository(DbContext db)
{
    public virtual Booking Get(int id) => db.Find<Booking>(id);
    public IEnumerable<Booking> ForSlot(int slotId) => db.Set<Booking>().Where(b => b.SlotId == slotId && b.Status == "Confirmed");
    public void Add(Booking booking) => db.Add(booking);
}

interface ICurrentUser { int MemberId { get; } string Role { get; } }
record FixedUser(int MemberId, string Role) : ICurrentUser;
record ChangeBooking([property: Range(1, 100000)] int Version, [property: Range(1, 8)] int Climbers);
class HttpPutAttribute(string template = "") : HttpMethodAttribute("PUT", template);

[Route("bookings")]
class BookingsController(BookingRepository bookings, DbContext db, Catalog catalog, ICurrentUser user)
{
    [HttpGet("{id:int}")] public Booking Get(int id) => bookings.Get(id);

    [HttpPost]
    public IResult Create(NewBooking body)
    {
        var slot = catalog.Slots.FirstOrDefault(s => s.Id == body.SlotId) ?? throw new NotFoundException($"slot {body.SlotId} does not exist");
        var left = slot.Capacity - bookings.ForSlot(slot.Id).Sum(b => b.Climbers);
        if (body.Climbers > left) throw new ConflictException($"only {left} places left in slot {slot.Id}");
        var booking = new Booking { SlotId = slot.Id, MemberId = user.MemberId, Climbers = body.Climbers, Name = body.Name };
        bookings.Add(booking);
        db.SaveChanges();
        return Results.Created("/bookings/" + booking.Id, booking);
    }

    [HttpPut("{id:int}")]
    public Booking Update(int id, ChangeBooking body)
    {
        var booking = bookings.Get(id) ?? throw new NotFoundException($"booking {id} does not exist");
        db.ExpectVersion(booking, body.Version);
        booking.Climbers = body.Climbers;
        db.SaveChanges();
        return booking;
    }
}`,
      explanation:
        "DbContext keeps a list of tracked entries. Find returns the tracked object if it has one (the identity map) or deserializes a copy of the stored JSON and remembers that JSON as the snapshot together with the version it was loaded at. SaveChanges finds the changed entries by comparing current JSON with the snapshot, checks that each existing row still carries the version the caller expects (throwing ConcurrencyException, which is a ConflictException and therefore a 409, before anything is written), and only then writes: new rows get Version 1, existing rows expected + 1. The controller sets the expected version from the request body, so a second update that still says version 1 is refused. Capacity is a LINQ sum over the slot's confirmed bookings.",
      hints: [
        { id: "h1", title: "Tracking and Find", content: "class Entry { public Entity Entity; public string Snapshot; public int Expected; public bool Added; } readonly List<Entry> entries. static string Dump(Entity e) => JsonSerializer.Serialize(e, e.GetType(), Json.Options). Find<T>: first look for entries.FirstOrDefault(e => e.Entity is T t && t.Id == id); else db.Table(typeof(T)).TryGetValue(id, out var json) -> JsonSerializer.Deserialize<T>(json, Json.Options), then entries.Add(new Entry { Entity = entity, Snapshot = json, Expected = entity.Version }). Set<T>() => db.Table(typeof(T)).Keys.ToList().Select(Find<T>)." },
        { id: "h2", title: "SaveChanges", content: "void AssignIds() { foreach (var e in entries.Where(e => e.Added && e.Entity.Id == 0)) e.Entity.Id = db.NextId(e.Entity.GetType()); } AssignIds(); Saving(entries.Where(e => e.Added).Select(e => e.Entity).ToList()); AssignIds(); var changed = entries.Where(e => e.Added || Dump(e.Entity) != e.Snapshot).ToList(); First loop (non-added only): load the stored row, compare its Version with e.Expected, throw new ConcurrencyException(...) on a mismatch. Second loop: e.Entity.Version = e.Added ? 1 : e.Expected + 1; e.Snapshot = Dump(e.Entity); db.Table(type)[e.Entity.Id] = e.Snapshot; then reset Added = false and Expected = the new version. Return changed.Count." },
        { id: "h3", title: "The controller", content: "Create: var slot = catalog.Slots.FirstOrDefault(s => s.Id == body.SlotId) ?? throw new NotFoundException(...); var left = slot.Capacity - bookings.ForSlot(slot.Id).Sum(b => b.Climbers); if (body.Climbers > left) throw new ConflictException($\"only {left} places left in slot {slot.Id}\"); new Booking { SlotId = slot.Id, MemberId = user.MemberId, Climbers = body.Climbers, Name = body.Name }; bookings.Add(booking); db.SaveChanges(); return Results.Created(\"/bookings/\" + booking.Id, booking). Update: var booking = bookings.Get(id) ?? throw new NotFoundException(...); db.ExpectVersion(booking, body.Version); booking.Climbers = body.Climbers; db.SaveChanges(); return booking. Add [HttpPut] by declaring class HttpPutAttribute(string template = \"\") : HttpMethodAttribute(\"PUT\", template) if it is not already provided." },
      ],
      tests: [
        {
          id: "t1",
          description: "creating a booking returns 201 with a Location and a row at version 1",
          assertionCode: js`
assert(Array.isArray(scene.bookings) && scene.bookings.length >= 8, "Register the modules and replay: await shop.Replay(\"bookings\").");
assert(Array.isArray(scene.bookings), "Replay the section with shop.Replay(\"bookings\").");
const created = scene.bookings[0];
assertEqual(created.status, 201, "POST /bookings");
assertEqual(created.headers["Location"], "/bookings/1", "Location header");
const b = JSON.parse(created.body);
assertEqual([b.id, b.version, b.memberId, b.climbers, b.status], [1, 1, 3, 4, "Confirmed"], "id, version, member (from ICurrentUser), climbers, status");`,
        },
        {
          id: "t2",
          description: "a group larger than the places left is a 409",
          assertionCode: js`
assert(Array.isArray(scene.bookings) && scene.bookings.length >= 8, "Register the modules and replay: await shop.Replay(\"bookings\").");
const over = scene.bookings[1];
assertEqual(over.status, 409, "3 climbers when only 2 places are left in a slot of 6");
const p = JSON.parse(over.body);
assertEqual(p.title, "Conflict", "title");
assert(p.detail.includes("2"), "the detail says how many places are left: " + p.detail);`,
        },
        {
          id: "t3",
          description: "a stored booking can be read back",
          assertionCode: js`
assert(Array.isArray(scene.bookings) && scene.bookings.length >= 8, "Register the modules and replay: await shop.Replay(\"bookings\").");
const read = scene.bookings[2];
assertEqual(read.status, 200, "GET /bookings/1");
const b = JSON.parse(read.body);
assertEqual([b.id, b.name, b.climbers], [1, "Priya", 4], "the stored booking");`,
        },
        {
          id: "t4",
          description: "an update that quotes the current version succeeds and bumps the version",
          assertionCode: js`
assert(Array.isArray(scene.bookings) && scene.bookings.length >= 8, "Register the modules and replay: await shop.Replay(\"bookings\").");
const upd = scene.bookings[3];
assertEqual(upd.status, 200, "PUT with version 1");
const b = JSON.parse(upd.body);
assertEqual([b.climbers, b.version], [2, 2], "climbers changed, version bumped to 2");`,
        },
        {
          id: "t5",
          description: "an update with a stale version is refused with 409",
          assertionCode: js`
assert(Array.isArray(scene.bookings) && scene.bookings.length >= 8, "Register the modules and replay: await shop.Replay(\"bookings\").");
const stale = scene.bookings[4];
assertEqual(stale.status, 409, "PUT quoting version 1 when the row is at version 2");
assertEqual(JSON.parse(stale.body).title, "Conflict", "a problem document");
const rows = scene.rows;
assertEqual(rows.find((r) => r.id === 1).climbers, 2, "the stale update did not overwrite the row (climbers stays 2)");`,
        },
        {
          id: "t6",
          description: "the stored rows carry ids, versions and the data",
          assertionCode: js`
assert(Array.isArray(scene.bookings) && scene.bookings.length >= 8, "Register the modules and replay: await shop.Replay(\"bookings\").");
assert(Array.isArray(scene.rows), "Send the rows with Board.Show(\"rows\", ...).");
assertEqual(scene.rows.length, 2, "two bookings were stored");
assertEqual(scene.rows.map((r) => [r.id, r.version, r.name]), [[1, 2, "Priya"], [2, 1, "Ben"]], "id, version and name of each row");`,
        },
        {
          id: "t7",
          description: "freed capacity can be booked again (a LINQ sum over confirmed bookings)",
          assertionCode: js`
assert(Array.isArray(scene.bookings) && scene.bookings.length >= 8, "Register the modules and replay: await shop.Replay(\"bookings\").");
const second = scene.bookings[5];
assertEqual(second.status, 201, "after the update the slot has 4 places left, so 4 more climbers fit");
assertEqual(JSON.parse(second.body).id, 2, "second booking id");`,
        },
        {
          id: "t8",
          description: "unknown bookings and unknown slots are 404 problems",
          assertionCode: js`
assert(Array.isArray(scene.bookings) && scene.bookings.length >= 8, "Register the modules and replay: await shop.Replay(\"bookings\").");
assertEqual(scene.bookings[6].status, 404, "GET /bookings/42");
assertEqual(scene.bookings[7].status, 404, "POST for slot 99");
assertEqual(JSON.parse(scene.bookings[7].body).title, "Not Found", "problem title");`,
        },
      ],
      unlocks: ["ca-store"],
      checks: [
        {
          prompt: "Two people save booking 1 (version 3) at nearly the same time, both having read version 3. With optimistic concurrency, what happens?",
          question: {
            type: "choice",
            options: [
              "The first save succeeds and moves the row to version 4; the second is rejected as stale",
              "Both saves succeed and the later one wins",
              "Both saves are rejected",
              "The second save waits for the first to finish and then overwrites it",
            ],
            answer: 0,
          },
          explanation: "The version is the compare-and-swap token. The first writer finds version 3 and writes 4. The second finds 4, which is not what it expected, so it gets a conflict and must re-read.",
        },
        {
          prompt: "Why does `SaveChanges` verify every changed row *before* writing the first one?",
          question: {
            type: "choice",
            options: [
              "So a conflict on a later row cannot leave earlier rows half-saved",
              "Because writes are slower than reads",
              "To assign ids before saving",
              "To avoid serializing the entities twice",
            ],
            answer: 0,
          },
          explanation: "A unit of work should be all or nothing. Checking everything first means either every change is written or none is.",
        },
        {
          prompt: "A request handler loops over 50 booking ids and calls `repository.Get(id)` for each. What is this pattern called, and what is the fix?",
          question: {
            type: "choice",
            options: [
              "N+1 queries; fetch the whole set with one query",
              "Lazy loading; enable eager loading globally",
              "Deadlock; add a lock",
              "Dirty read; use a transaction",
            ],
            answer: 0,
          },
          explanation: "One query to get the ids plus one per item is the classic N+1. Ask for all the rows in one query (a `WHERE id IN (...)` in SQL, one `Set<T>()` pass here) and index them in memory.",
        },
      ],
    },
  ],
};
