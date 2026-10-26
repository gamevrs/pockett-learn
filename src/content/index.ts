import { flattenLessons, languageOf, type Lesson, type Project, type UpcomingProject } from "@/engine/types";
import { garage } from "./projects/garage";
import { launch } from "./projects/launch";
import { beatlab } from "./projects/beatlab";
import { pitWall } from "./projects/pit-wall";
import { garageJs } from "./projects/garage-js";
import { signalLab } from "./projects/signal-lab";
import { cargoControl } from "./projects/cargo-control";
import { storeApi } from "./projects/store-api";
import { smartHome } from "./projects/smart-home";
import { csharpBasics } from "./projects/csharp-basics";
import { seasonAnalytics } from "./projects/season-analytics";
import { formForge } from "./projects/form-forge";
import { eventArena } from "./projects/event-arena";
import { graphqlGateway } from "./projects/graphql-gateway";
import { rustBasics } from "./projects/rust-basics";
import { goBasics } from "./projects/go-basics";
import { cppBasics } from "./projects/cpp-basics";
import { aiFoundations } from "./projects/ai-foundations";

/** Every playable project, in the order shown in the picker. */
export const PROJECTS: Project[] = [garage, launch, beatlab, pitWall,garageJs, signalLab, cargoControl, storeApi, smartHome, seasonAnalytics, csharpBasics, formForge, eventArena, graphqlGateway, rustBasics, goBasics, cppBasics, aiFoundations];

/**
 * Planned (not yet built) projects. They fill out each language's path (Beginner → Intermediate →
 * Advanced → Professional) so learners can see what is coming. Slugs match the real projects'
 * slugs, so when a project is added to PROJECTS its planned entry disappears automatically.
 */
const PLANNED: UpcomingProject[] = [
  {
    slug: "art-studio",
    language: "python",
    difficulty: "Beginner",
    title: "Art Studio",
    tagline: "Generative art with loops and randomness.",
    emoji: "🎨",
    accent: { from: "#ff5c9a", to: "#c5ee8a" },
    skills: ["loops", "randomness", "functions"],
  },
  {
    slug: "signal-lab",
    language: "python",
    difficulty: "Intermediate",
    title: "Signal Lab",
    tagline: "Decode noisy radio messages with strings, regex and parsing.",
    emoji: "📡",
    accent: { from: "#38bdf8", to: "#6366f1" },
    skills: ["strings", "regex", "parsing", "comprehensions"],
  },
  {
    slug: "cargo-control",
    language: "python",
    difficulty: "Intermediate",
    title: "Cargo Bay",
    tagline: "Keep a shipping depot running with exceptions, JSON and validation.",
    emoji: "📦",
    accent: { from: "#f59e0b", to: "#b45309" },
    skills: ["exceptions", "JSON", "validation", "context managers"],
  },
  {
    slug: "pixel-pet",
    language: "python",
    difficulty: "Intermediate",
    title: "Pixel Pet",
    tagline: "Raise a creature with classes & state machines.",
    emoji: "🐣",
    accent: { from: "#ffd23d", to: "#ff8a3d" },
    skills: ["classes", "state machines", "encapsulation"],
  },
  {
    slug: "smart-home",
    language: "python",
    difficulty: "Advanced",
    title: "Smart Home Hub",
    tagline: "Wire up devices with callbacks, interfaces and the observer pattern.",
    emoji: "🏠",
    accent: { from: "#34d399", to: "#0d9488" },
    skills: ["callbacks", "closures", "decorators", "interfaces", "observer", "dependency injection", "generators"],
  },
  {
    slug: "rover",
    language: "python",
    difficulty: "Advanced",
    title: "Crater Rover",
    tagline: "Program a rover through a canyon with algorithms.",
    emoji: "🛰️",
    accent: { from: "#ff7a45", to: "#c2410c" },
    skills: ["graphs", "pathfinding", "recursion"],
  },
  {
    slug: "store-api",
    language: "python",
    difficulty: "Professional",
    title: "Pocket Store API",
    tagline: "Build a REST API with CRUD, SQLite, auth and tests.",
    emoji: "🛒",
    accent: { from: "#a78bfa", to: "#7c3aed" },
    skills: ["REST", "CRUD", "SQLite", "validation", "pagination", "auth", "testing"],
  },
  {
    slug: "graphql-gateway",
    language: "python",
    difficulty: "Professional",
    title: "Graph Gateway",
    tagline: "Design a GraphQL schema with queries, mutations and resolvers.",
    emoji: "🕸️",
    accent: { from: "#f472b6", to: "#be185d" },
    skills: ["schemas", "queries", "mutations", "resolvers"],
  },
  {
    slug: "form-forge",
    language: "javascript",
    difficulty: "Intermediate",
    title: "Form Forge",
    tagline: "Validate and transform form data with array methods, JSON and regex.",
    emoji: "🧾",
    accent: { from: "#fbbf24", to: "#d97706" },
    skills: ["array methods", "destructuring", "errors", "JSON", "regex validation"],
  },
  {
    slug: "event-arena",
    language: "javascript",
    difficulty: "Advanced",
    title: "Event Arena",
    tagline: "Run an async arena with promises, event emitters and classes.",
    emoji: "⚔️",
    accent: { from: "#fb7185", to: "#be123c" },
    skills: ["closures", "promises", "async/await", "event emitters", "classes"],
  },
  {
    slug: "js-api",
    language: "javascript",
    difficulty: "Professional",
    title: "Node-style API",
    tagline: "Route requests, serve CRUD and fetch data, then add GraphQL.",
    emoji: "🧩",
    accent: { from: "#60a5fa", to: "#1d4ed8" },
    skills: ["REST routing", "CRUD", "fetch", "GraphQL"],
  },
  {
    slug: "season-analytics",
    language: "sql",
    difficulty: "Intermediate",
    title: "Season Analytics",
    tagline: "Answer season-long questions with subqueries, CTEs and window functions.",
    emoji: "📈",
    accent: { from: "#2dd4bf", to: "#0f766e" },
    skills: ["subqueries", "CTEs", "window functions"],
  },
  {
    slug: "schema-studio",
    language: "sql",
    difficulty: "Advanced",
    title: "Schema Studio",
    tagline: "Design a safe schema with constraints, indexes and transactions.",
    emoji: "🗄️",
    accent: { from: "#818cf8", to: "#4338ca" },
    skills: ["constraints", "indexes", "transactions", "normalization"],
  },
  {
    slug: "csharp-basics",
    language: "csharp",
    difficulty: "Beginner",
    title: "Cinder Depot",
    tagline: "Types, methods and classes: your first steps in C#.",
    emoji: "#️⃣",
    accent: { from: "#a78bfa", to: "#6d28d9" },
    skills: ["types", "methods", "classes"],
  },
  {
    slug: "csharp-delegates",
    language: "csharp",
    difficulty: "Advanced",
    title: "Delegates & Events",
    tagline: "Decouple code with delegates, events, interfaces, generics and LINQ.",
    emoji: "🔔",
    accent: { from: "#c084fc", to: "#7e22ce" },
    skills: ["delegates", "events", "interfaces", "generics", "LINQ"],
  },
  {
    slug: "csharp-api",
    language: "csharp",
    difficulty: "Professional",
    title: "ASP.NET-style API",
    tagline: "Build a routed, CRUD web API in the .NET style.",
    emoji: "🌐",
    accent: { from: "#8b5cf6", to: "#4c1d95" },
    skills: ["routing", "CRUD", "dependency injection", "middleware"],
  },
  {
    slug: "rust-inventory",
    language: "rust",
    difficulty: "Intermediate",
    title: "Cargo Manifest",
    tagline: "Parse a cargo manifest robustly with lifetimes, error types, modules and tests.",
    emoji: "📜",
    accent: { from: "#f4b183", to: "#c2570c" },
    skills: ["lifetimes", "From & ?", "modules", "closures", "iterator adaptors", "impl Display", "unit tests"],
  },
  {
    slug: "rust-traits",
    language: "rust",
    difficulty: "Advanced",
    title: "Drone Fleet",
    tagline: "Command a fleet through traits, generics, trait objects and shared state.",
    emoji: "🛸",
    accent: { from: "#f0a070", to: "#9a3412" },
    skills: ["traits", "generics", "Box<dyn Trait>", "operator overloading", "Rc<RefCell<T>>", "Iterator"],
  },
  {
    slug: "rust-server",
    language: "rust",
    difficulty: "Professional",
    title: "Key-Value Server",
    tagline: "Serve commands with threads, channels, a mutex and a thread pool, std only.",
    emoji: "🗄️",
    accent: { from: "#e8905a", to: "#7c2d12" },
    skills: ["threads", "mpsc channels", "Arc<Mutex<T>>", "protocol parser", "thread pool", "benchmarks"],
  },
  {
    slug: "go-inventory",
    language: "go",
    difficulty: "Intermediate",
    title: "Warehouse Ledger",
    tagline: "Keep a warehouse's books with interfaces, embedding, custom errors, generics and JSON.",
    emoji: "📒",
    accent: { from: "#5eead4", to: "#0f766e" },
    skills: ["interfaces", "embedding", "errors.As", "generics", "JSON decoding", "regexp", "table-driven tests"],
  },
  {
    slug: "go-pipeline",
    language: "go",
    difficulty: "Advanced",
    title: "Telemetry Pipeline",
    tagline: "Process a firehose of readings with goroutines, channels, worker pools and context.",
    emoji: "🌊",
    accent: { from: "#22d3ee", to: "#0369a1" },
    skills: ["goroutines", "channels", "select", "sync", "worker pools", "fan-in / fan-out", "context", "race conditions"],
  },
  {
    slug: "go-api",
    language: "go",
    difficulty: "Professional",
    title: "REST API",
    tagline: "Build and test an HTTP API with net/http, middleware, validation and structured logs.",
    emoji: "🛰️",
    accent: { from: "#06b6d4", to: "#155e75" },
    skills: ["net/http", "httptest", "routing patterns", "middleware", "validation", "repository interface", "log/slog"],
  },
  {
    slug: "cpp-memory",
    language: "cpp",
    difficulty: "Intermediate",
    title: "Memory & Classes",
    tagline: "See the stack and the heap, then own resources safely with RAII, smart pointers and move semantics.",
    emoji: "🧠",
    accent: { from: "#3b82f6", to: "#1e40af" },
    skills: ["pointers & references", "stack vs heap", "new / delete → RAII", "rule of three / five", "copy vs move", "std::unique_ptr", "operator overloading", "std::istringstream", "custom exceptions"],
  },
  {
    slug: "cpp-engine",
    language: "cpp",
    difficulty: "Advanced",
    title: "Templates & Patterns",
    tagline: "Write generic code and wire parts together with templates, concepts, callbacks and virtual functions.",
    emoji: "🧩",
    accent: { from: "#2563eb", to: "#1e3a8a" },
    skills: ["templates & concepts", "STL containers & iterators", "lambdas & std::function", "observer & strategy", "inheritance & virtual", "shared_ptr / weak_ptr", "std::optional & std::variant"],
  },
  {
    slug: "cpp-exchange",
    language: "cpp",
    difficulty: "Professional",
    title: "Order Book",
    tagline: "Build an order-book trading engine: fast data structures, threads, a protocol parser and tests.",
    emoji: "📊",
    accent: { from: "#1d4ed8", to: "#172554" },
    skills: ["priority_queue & unordered_map", "reserve & move semantics", "thread / mutex / atomic", "protocol parser", "unit tests with assert", "profiling with <chrono>"],
  },
  {
    slug: "ai-neural",
    track: "ai",
    language: "python",
    difficulty: "Intermediate",
    title: "Neural Garden",
    tagline: "Grow a neural network from scratch in NumPy and teach it to read handwritten digits.",
    emoji: "🌱",
    accent: { from: "#34d399", to: "#8b5cf6" },
    skills: ["neurons & activations", "forward pass", "backpropagation", "mini-batches", "digit recogniser", "initialisation", "regularisation", "learning-rate schedules"],
  },
  {
    slug: "ai-language",
    track: "ai",
    language: "python",
    difficulty: "Advanced",
    title: "Word Lab",
    tagline: "Build a tiny language model: tokens, n-grams, embeddings, attention and sampling.",
    emoji: "🔤",
    accent: { from: "#38bdf8", to: "#c084fc" },
    skills: ["tokenisation & BPE", "n-gram models", "embeddings & cosine similarity", "attention", "temperature & top-k sampling", "perplexity"],
  },
  {
    slug: "ai-assistant",
    track: "ai",
    language: "python",
    difficulty: "Professional",
    title: "Help Desk Agent",
    tagline: "Engineer a production AI assistant: retrieval, tools, guardrails and evaluation.",
    emoji: "🛟",
    accent: { from: "#fb7185", to: "#7c3aed" },
    skills: ["retrieval-augmented generation", "prompt templates", "tool calling", "schema validation & retries", "guardrails & eval sets", "cost & latency budgets", "caching"],
  },
];

/** What is still coming: PLANNED minus anything already playable. */
export const UPCOMING: UpcomingProject[] = PLANNED.filter((u) => !PROJECTS.some((p) => p.slug === u.slug));

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}

export interface PrerequisiteRef {
  slug: string;
  title: string;
  /** False while the prerequisite is still only planned (no page to link to yet). */
  available: boolean;
}

/** A project's recommended-first list with titles; unknown slugs are dropped. */
export function resolvePrerequisites(project: Project): PrerequisiteRef[] {
  return (project.prerequisites ?? []).flatMap((slug): PrerequisiteRef[] => {
    const real = getProject(slug);
    if (real) return [{ slug, title: real.title, available: true }];
    const planned = UPCOMING.find((u) => u.slug === slug);
    return planned ? [{ slug, title: planned.title, available: false }] : [];
  });
}

export interface LessonContext {
  project: Project;
  lesson: Lesson;
  index: number;
  total: number;
  prev: Lesson | null;
  next: Lesson | null;
  chapterTitle: string;
}

export function getLessonContext(slug: string, lessonId: string): LessonContext | undefined {
  const project = getProject(slug);
  if (!project) return undefined;
  const lessons = flattenLessons(project);
  const index = lessons.findIndex((l) => l.id === lessonId);
  if (index === -1) return undefined;
  const chapter = project.chapters.find((c) => c.lessons.some((l) => l.id === lessonId));
  return {
    project,
    lesson: lessons[index],
    index,
    total: lessons.length,
    prev: lessons[index - 1] ?? null,
    next: lessons[index + 1] ?? null,
    chapterTitle: chapter?.title ?? "",
  };
}

export function allLessonParams(): { slug: string; lessonId: string }[] {
  return PROJECTS.flatMap((p) => flattenLessons(p).map((l) => ({ slug: p.slug, lessonId: l.id })));
}

/** Light-weight project card data for lists and the public API (no solutions or tests). */
export function summarize(project: Project) {
  const lessons = flattenLessons(project);
  return {
    slug: project.slug,
    language: languageOf(project),
    track: project.track ?? null,
    sceneId: project.sceneId,
    title: project.title,
    tagline: project.tagline,
    emoji: project.emoji,
    difficulty: project.difficulty,
    hours: project.hours,
    accent: project.accent,
    skills: project.skills,
    lessonCount: lessons.length,
    totalXp: lessons.reduce((sum, l) => sum + l.xp, 0),
    features: project.features.map(({ id, title, emoji }) => ({ id, title, emoji })),
  };
}
