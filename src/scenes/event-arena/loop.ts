import { rng } from "./sim";

/**
 * A reference event loop for the Event-loop lab. It turns a script (the same format the learner's
 * runLoop() receives) into a list of frames: call stack, microtask queue, task queue and console,
 * after every little thing that happens. The lab plays the frames back and compares the learner's
 * runLoop() result with the real output.
 */

export type Step =
  | { type: "log"; text: string }
  | { type: "microtask"; run: Step[] }
  | { type: "timeout"; delay?: number; run: Step[] };

export interface QueueItem {
  label: string;
  /** Due time in virtual ms (tasks only). */
  due?: number;
}

export interface LoopFrame {
  phase: "script" | "microtasks" | "task" | "idle" | "done";
  stack: string[];
  micro: QueueItem[];
  tasks: QueueItem[];
  out: string[];
  now: number;
  note: string;
  /** Line in the generated source that is executing, or null. */
  line: number | null;
}

interface Node {
  step: Step;
  line: number;
  kids: Node[];
}

/** Source code for a script, plus the line each step starts on. */
export function toSource(script: Step[]): { lines: string[]; nodes: Node[] } {
  const lines: string[] = [];
  const build = (steps: Step[], indent: string): Node[] =>
    steps.map((step) => {
      const node: Node = { step, line: lines.length, kids: [] };
      if (step.type === "log") {
        lines.push(`${indent}console.log(${JSON.stringify(step.text)});`);
      } else if (step.type === "microtask") {
        lines.push(`${indent}queueMicrotask(() => {`);
        node.kids = build(step.run, indent + "  ");
        lines.push(`${indent}});`);
      } else {
        lines.push(`${indent}setTimeout(() => {`);
        node.kids = build(step.run, indent + "  ");
        lines.push(`${indent}}, ${step.delay ?? 0});`);
      }
      return node;
    });
  const nodes = build(script, "");
  return { lines, nodes };
}

const firstLog = (steps: Step[]): string => {
  for (const s of steps) {
    if (s.type === "log") return s.text;
    const inner = firstLog(s.run);
    if (inner) return inner;
  }
  return "…";
};

/** All frames of the run, from the first line of the script to the empty loop. */
export function trace(script: Step[]): { frames: LoopFrame[]; lines: string[]; output: string[] } {
  const { lines, nodes } = toSource(script);
  const frames: LoopFrame[] = [];
  const out: string[] = [];
  const micro: (QueueItem & { kids: Node[] })[] = [];
  const tasks: (QueueItem & { kids: Node[]; order: number; due: number })[] = [];
  let now = 0;
  let order = 0;

  const snap = (phase: LoopFrame["phase"], stack: string[], note: string, line: number | null) =>
    frames.push({
      phase,
      stack: [...stack],
      micro: micro.map(({ label }) => ({ label })),
      tasks: tasks.map(({ label, due }) => ({ label, due })),
      out: [...out],
      now,
      note,
      line,
    });

  const exec = (kids: Node[], stack: string[], phase: LoopFrame["phase"]) => {
    for (const node of kids) {
      const { step } = node;
      if (step.type === "log") {
        out.push(step.text);
        snap(phase, [...stack, `console.log("${step.text}")`], `console.log prints "${step.text}" straight away.`, node.line);
      } else if (step.type === "microtask") {
        micro.push({ label: `microtask · "${firstLog(step.run)}"`, kids: node.kids });
        snap(phase, stack, `queueMicrotask puts its callback in the microtask queue. It will run as soon as the stack is empty.`, node.line);
      } else {
        const delay = Math.max(0, step.delay ?? 0);
        tasks.push({ label: `timer ${delay} ms · "${firstLog(step.run)}"`, kids: node.kids, order: order++, due: now + delay });
        snap(phase, stack, `setTimeout asks the runtime for a timer. When ${delay} ms have passed the callback joins the task queue (due at ${now + delay} ms).`, node.line);
      }
    }
  };

  snap("script", ["main()"], "The script itself is the first task: it runs to the end before anything else.", null);
  exec(nodes, ["main()"], "script");

  const drain = () => {
    if (micro.length) snap("microtasks", [], "The stack is empty, so the loop drains the microtask queue: every microtask runs, even ones added while draining.", null);
    while (micro.length) {
      const m = micro.shift()!;
      snap("microtasks", ["microtask()"], `Run the oldest microtask.`, null);
      exec(m.kids, ["microtask()"], "microtasks");
      snap("microtasks", [], micro.length ? "That microtask is done. More are waiting." : "The microtask queue is empty.", null);
    }
  };

  snap("script", [], "The script is finished and the call stack is empty.", null);
  drain();

  while (tasks.length) {
    tasks.sort((a, b) => a.due - b.due || a.order - b.order);
    const t = tasks.shift()!;
    now = t.due;
    snap("idle", [], `Nothing else to do: time moves on to ${now} ms and the loop takes the oldest due task.`, null);
    snap("task", ["timer callback()"], `Run the task: ${t.label}.`, null);
    exec(t.kids, ["timer callback()"], "task");
    snap("task", [], "The task is done and the stack is empty.", null);
    drain();
  }
  snap("done", [], "Both queues are empty. The loop is idle until something new arrives.", null);
  return { frames, lines, output: [...out] };
}

const log = (text: string): Step => ({ type: "log", text });
const micro = (...run: Step[]): Step => ({ type: "microtask", run });
const timeout = (delay: number, ...run: Step[]): Step => ({ type: "timeout", delay, run });

export interface Preset {
  id: string;
  title: string;
  hint: string;
  script: Step[];
}

export const PRESETS: Preset[] = [
  {
    id: "classic",
    title: "Promise vs timer",
    hint: "A promise callback always beats a timer scheduled at the same moment.",
    script: [log("start"), timeout(0, log("timeout")), micro(log("promise")), log("end")],
  },
  {
    id: "micro",
    title: "Microtasks all the way",
    hint: "The microtask queue is drained completely, including microtasks added on the way.",
    script: [timeout(0, log("task")), micro(log("m1"), micro(log("m1 child"))), micro(log("m2")), log("sync")],
  },
  {
    id: "timers",
    title: "Timer order",
    hint: "Shortest delay first. Equal delays keep the order they were set in.",
    script: [timeout(50, log("slow")), timeout(10, log("fast A")), timeout(10, log("fast B")), timeout(0, log("zero")), log("sync")],
  },
  {
    id: "per-task",
    title: "Microtasks after every task",
    hint: "The queue is drained after the script and after each task, not just once.",
    script: [timeout(1, log("A"), micro(log("A micro"))), timeout(1, log("B")), log("sync")],
  },
  {
    id: "nested",
    title: "A timer inside a timer",
    hint: "A timer set inside a task is due at that task's time plus its own delay.",
    script: [timeout(100, log("outer"), timeout(5, log("inner"))), timeout(103, log("between")), log("sync")],
  },
];

/** A random script (nested up to two levels) for testing the learner's loop on something new. */
export function randomScript(seed: number): Step[] {
  const rand = rng(seed * 7919 + 13);
  let n = 0;
  const gen = (depth: number, count: number): Step[] => {
    const steps: Step[] = [];
    for (let i = 0; i < count; i++) {
      const roll = rand();
      if (depth >= 2 || roll < 0.4) steps.push(log(String.fromCharCode(65 + (n++ % 26))));
      else if (roll < 0.7) steps.push(micro(...gen(depth + 1, 1 + Math.floor(rand() * 2))));
      else steps.push(timeout([0, 0, 5, 10, 20][Math.floor(rand() * 5)], ...gen(depth + 1, 1 + Math.floor(rand() * 2))));
    }
    return steps;
  };
  return gen(0, 4 + Math.floor(rand() * 2));
}
