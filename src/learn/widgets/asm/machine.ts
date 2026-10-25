/**
 * A toy CPU for the Assembly module: an assembler (text → numbered instructions), a machine that runs
 * one instruction per step, and an evaluator that checks a program against a lesson goal.
 *
 * Pure TypeScript with no imports, so content checks can run it under plain Node.
 *
 * The machine: registers R0–R3 (whole numbers, 16-bit signed), a program counter (PC) holding the
 * address of the next instruction, flags Z (last result was zero) and N (last result was negative),
 * a small data memory (default 16 cells), a stack at the top of memory growing down (SP), and an
 * output list. The program lives in its own numbered slots (address 0, 1, 2…), separate from data.
 *
 * Every instruction is encoded as three numbers: [opcode, A, B].
 */

export type Mnemonic = "HLT" | "MOV" | "LOAD" | "STORE" | "ADD" | "SUB" | "CMP" | "JMP" | "JZ" | "JNZ" | "JLT" | "JGT" | "OUT" | "PUSH" | "POP" | "CALL" | "RET";

export const ALL_OPS: Mnemonic[] = ["MOV", "OUT", "HLT", "ADD", "SUB", "LOAD", "STORE", "JMP", "CMP", "JZ", "JNZ", "JLT", "JGT", "PUSH", "POP", "CALL", "RET"];

export type Kind = "reg" | "imm" | "addr" | "ind" | "label";

export type Operand =
  | { kind: "reg"; r: number }
  | { kind: "imm"; v: number }
  | { kind: "addr"; a: number }
  | { kind: "ind"; r: number }
  | { kind: "label"; name: string; target: number };

export interface Form {
  op: Mnemonic;
  kinds: Kind[];
  opcode: number;
}

/** Every instruction form with its opcode. */
export const FORMS: Form[] = [
  { op: "HLT", kinds: [], opcode: 0 },
  { op: "MOV", kinds: ["reg", "imm"], opcode: 1 },
  { op: "MOV", kinds: ["reg", "reg"], opcode: 2 },
  { op: "LOAD", kinds: ["reg", "addr"], opcode: 3 },
  { op: "STORE", kinds: ["reg", "addr"], opcode: 4 },
  { op: "ADD", kinds: ["reg", "reg"], opcode: 5 },
  { op: "SUB", kinds: ["reg", "reg"], opcode: 6 },
  { op: "ADD", kinds: ["reg", "imm"], opcode: 7 },
  { op: "SUB", kinds: ["reg", "imm"], opcode: 8 },
  { op: "CMP", kinds: ["reg", "reg"], opcode: 9 },
  { op: "CMP", kinds: ["reg", "imm"], opcode: 10 },
  { op: "JMP", kinds: ["label"], opcode: 11 },
  { op: "JZ", kinds: ["label"], opcode: 12 },
  { op: "JNZ", kinds: ["label"], opcode: 13 },
  { op: "JLT", kinds: ["label"], opcode: 14 },
  { op: "JGT", kinds: ["label"], opcode: 15 },
  { op: "OUT", kinds: ["reg"], opcode: 16 },
  { op: "PUSH", kinds: ["reg"], opcode: 17 },
  { op: "POP", kinds: ["reg"], opcode: 18 },
  { op: "CALL", kinds: ["label"], opcode: 19 },
  { op: "RET", kinds: [], opcode: 20 },
  { op: "LOAD", kinds: ["reg", "ind"], opcode: 21 },
  { op: "STORE", kinds: ["reg", "ind"], opcode: 22 },
];

/** How each instruction is written, for error messages and the reference card. */
export const USAGE: Record<Mnemonic, { example: string; does: string }> = {
  MOV: { example: "MOV R0, #5  or  MOV R0, R1", does: "Put a number in a register, or copy one register into another." },
  OUT: { example: "OUT R0", does: "Send the number in a register to the output." },
  HLT: { example: "HLT", does: "Stop the CPU." },
  ADD: { example: "ADD R0, R1  or  ADD R0, #1", does: "R0 = R0 + R1 (or + a number). Sets the flags." },
  SUB: { example: "SUB R0, R1  or  SUB R0, #1", does: "R0 = R0 − R1 (or − a number). Sets the flags." },
  LOAD: { example: "LOAD R0, [3]  or  LOAD R0, [R1]", does: "Copy the number at a memory address into a register." },
  STORE: { example: "STORE R0, [3]  or  STORE R0, [R1]", does: "Copy a register into a memory address." },
  CMP: { example: "CMP R0, R1  or  CMP R0, #0", does: "Work out R0 − R1 and keep only the flags." },
  JMP: { example: "JMP loop", does: "Jump to a label: the next instruction is the one after it." },
  JZ: { example: "JZ done", does: "Jump if Z = 1 (the last result was zero, or the two were equal)." },
  JNZ: { example: "JNZ loop", does: "Jump if Z = 0 (the last result was not zero)." },
  JLT: { example: "JLT smaller", does: "Jump if N = 1 (the first was less than the second)." },
  JGT: { example: "JGT bigger", does: "Jump if Z = 0 and N = 0 (the first was greater)." },
  PUSH: { example: "PUSH R0", does: "Put a register's value on top of the stack." },
  POP: { example: "POP R0", does: "Take the top value off the stack into a register." },
  CALL: { example: "CALL double", does: "Push the return address, then jump to a function." },
  RET: { example: "RET", does: "Pop the return address and jump back to it." },
};

export interface Instr {
  op: Mnemonic;
  opcode: number;
  args: Operand[];
  /** 1-based source line. */
  line: number;
  code: [number, number, number];
}

export interface Program {
  instrs: Instr[];
  /** Label (lower-case) → address. */
  labels: Record<string, number>;
  /** For each source line (index = line − 1): the address of the instruction on it, or null. */
  lineAddr: (number | null)[];
}

export interface AsmError {
  line: number;
  message: string;
}

export interface AsmOptions {
  allow?: string[] | null;
  registers: number;
  memory: number;
}

export type AsmResult = { ok: true; program: Program } | { ok: false; errors: AsmError[] };

const MIN = -32768;
const MAX = 32767;
export const wrap = (v: number) => ((((v - MIN) % 65536) + 65536) % 65536) + MIN;

const REG = /^r(\d+)$/i;
const IDENT = /^[a-z_][a-z0-9_]*$/i;

function regRange(n: number) {
  return n === 1 ? "R0" : `R0 to R${n - 1}`;
}

function describeKind(k: Kind, opts: AsmOptions) {
  switch (k) {
    case "reg":
      return `a register (${regRange(opts.registers)})`;
    case "imm":
      return "a number like #5";
    case "addr":
    case "ind":
      return "a memory address like [3]";
    case "label":
      return "a label name";
  }
}

/** Splits a line into its label (if any), mnemonic and operand texts. */
export function splitLine(raw: string): { label: string | null; mnemonic: string | null; operands: string[] } {
  let text = raw;
  const semi = text.indexOf(";");
  if (semi >= 0) text = text.slice(0, semi);
  text = text.trim();
  let label: string | null = null;
  const lm = /^([A-Za-z_][A-Za-z0-9_]*)\s*:/.exec(text);
  if (lm) {
    label = lm[1];
    text = text.slice(lm[0].length).trim();
  }
  if (!text) return { label, mnemonic: null, operands: [] };
  const sp = text.search(/\s/);
  const mnemonic = sp < 0 ? text : text.slice(0, sp);
  const rest = sp < 0 ? "" : text.slice(sp).trim();
  const operands = rest ? rest.split(",").map((s) => s.trim()) : [];
  return { label, mnemonic, operands };
}

type Parsed = { ok: true; operand: Operand } | { ok: false; message: string };

function parseOperand(text: string, want: Kind, opts: AsmOptions): Parsed {
  const t = text.trim();
  if (!t) return { ok: false, message: "an operand is missing (check the commas)" };
  const reg = REG.exec(t);
  if (want === "reg") {
    if (reg) {
      const r = Number(reg[1]);
      if (r >= opts.registers) return { ok: false, message: `there's no register ${t.toUpperCase()}: this CPU has ${regRange(opts.registers)}` };
      return { ok: true, operand: { kind: "reg", r } };
    }
    return { ok: false, message: `expected ${describeKind("reg", opts)}, not "${t}"` };
  }
  if (want === "imm") {
    const m = /^#\s*(-?\d+)$/.exec(t);
    if (m) {
      const v = Number(m[1]);
      if (v < MIN || v > MAX) return { ok: false, message: `${v} is too big: numbers go from ${MIN} to ${MAX}` };
      return { ok: true, operand: { kind: "imm", v } };
    }
    if (/^-?\d+$/.test(t)) return { ok: false, message: `write #${t} for the number ${t} (the # means "this exact number")` };
    return { ok: false, message: `expected a number like #5, not "${t}"` };
  }
  if (want === "addr" || want === "ind") {
    const m = /^\[\s*(.*?)\s*\]$/.exec(t);
    if (!m) {
      if (/^#?-?\d+$/.test(t)) return { ok: false, message: `write [${t.replace("#", "")}] for memory address ${t.replace("#", "")}` };
      return { ok: false, message: `expected a memory address like [3], not "${t}"` };
    }
    const inner = m[1];
    if (/^\d+$/.test(inner)) {
      const a = Number(inner);
      if (opts.memory === 0) return { ok: false, message: "this CPU has no data memory in this step" };
      if (a >= opts.memory) return { ok: false, message: `address ${a} doesn't exist: memory goes from 0 to ${opts.memory - 1}` };
      return { ok: true, operand: { kind: "addr", a } };
    }
    const ir = REG.exec(inner);
    if (ir) {
      const r = Number(ir[1]);
      if (r >= opts.registers) return { ok: false, message: `there's no register ${inner.toUpperCase()}: this CPU has ${regRange(opts.registers)}` };
      return { ok: true, operand: { kind: "ind", r } };
    }
    return { ok: false, message: `"${t}" isn't an address: use a number like [3] or a register like [R1]` };
  }
  // label
  if (t.startsWith("#") || /^-?\d+$/.test(t)) return { ok: false, message: `jump to a label name (like "loop"), not a number` };
  if (reg) return { ok: false, message: `jump to a label name (like "loop"), not a register` };
  if (!IDENT.test(t)) return { ok: false, message: `"${t}" isn't a valid label name` };
  return { ok: true, operand: { kind: "label", name: t, target: -1 } };
}

/** Which operand kinds a written operand could be, so we can pick the right form. */
function guessKind(text: string): Kind | null {
  const t = text.trim();
  if (REG.test(t)) return "reg";
  if (t.startsWith("#")) return "imm";
  if (/^\[\s*r\d+\s*\]$/i.test(t)) return "ind";
  if (t.startsWith("[")) return "addr";
  if (IDENT.test(t)) return "label";
  return null;
}

export function assemble(source: string, opts: AsmOptions): AsmResult {
  const lines = source.replace(/\r/g, "").split("\n");
  const allow = opts.allow ? new Set(opts.allow.map((s) => s.toUpperCase())) : null;
  const errors: AsmError[] = [];
  const instrs: Instr[] = [];
  const labels: Record<string, number> = {};
  const labelLine: Record<string, number> = {};
  const lineAddr: (number | null)[] = [];

  lines.forEach((raw, i) => {
    const line = i + 1;
    lineAddr.push(null);
    const { label, mnemonic, operands } = splitLine(raw);
    if (label) {
      const key = label.toLowerCase();
      if (REG.test(label) || (ALL_OPS as string[]).includes(label.toUpperCase())) errors.push({ line, message: `"${label}" can't be a label: it's already the name of a register or instruction` });
      else if (key in labels) errors.push({ line, message: `the label "${label}" is already used on line ${labelLine[key]}` });
      else {
        labels[key] = instrs.length;
        labelLine[key] = line;
      }
    }
    if (!mnemonic) return;
    const op = mnemonic.toUpperCase() as Mnemonic;
    if (!(ALL_OPS as string[]).includes(op)) {
      const known = allow ? ALL_OPS.filter((o) => allow.has(o)) : ALL_OPS;
      const hint = operands.length === 0 && IDENT.test(mnemonic) ? ` If it's a label, end it with a colon: ${mnemonic}:` : ` Try one of: ${known.join(", ")}.`;
      errors.push({ line, message: `I don't know the instruction "${mnemonic}".${hint}` });
      return;
    }
    if (allow && !allow.has(op)) {
      errors.push({ line, message: `${op} isn't available in this step.` });
      return;
    }
    const forms = FORMS.filter((f) => f.op === op);
    const count = forms[0].kinds.length;
    if (!forms.some((f) => f.kinds.length === operands.length)) {
      const need = count === 0 ? "no operands" : count === 1 ? "1 operand" : `${count} operands`;
      errors.push({ line, message: `${op} takes ${need}, like ${USAGE[op].example}` });
      return;
    }
    // choose the form whose second operand matches what was written (MOV R0, #5 vs MOV R0, R1)
    let form = forms[0];
    if (forms.length > 1 && operands.length > 0) {
      const g = guessKind(operands[operands.length - 1]);
      form = forms.find((f) => f.kinds[f.kinds.length - 1] === g) ?? (g === "ind" ? forms.find((f) => f.kinds.includes("addr")) : undefined) ?? forms[0];
    }
    const args: Operand[] = [];
    for (let k = 0; k < form.kinds.length; k++) {
      let want = form.kinds[k];
      // a form with an immediate also accepts a register, and vice versa; report against the friendlier one
      if (forms.length > 1 && k === form.kinds.length - 1) {
        const alt = forms.map((f) => f.kinds[k]);
        if (alt.includes("reg") && alt.includes("imm") && !REG.test(operands[k]) && !operands[k].trim().startsWith("#")) want = /^-?\d+$/.test(operands[k].trim()) ? "imm" : "reg";
      }
      const p = parseOperand(operands[k], want, opts);
      if (!p.ok) {
        const which = form.kinds.length === 1 ? " " : k === 0 ? ", first operand: " : ", second operand: ";
        errors.push({ line, message: `${op}${which}${p.message}` });
        return;
      }
      args.push(p.operand);
    }
    lineAddr[i] = instrs.length;
    instrs.push({ op, opcode: form.opcode, args, line, code: [form.opcode, 0, 0] });
  });

  // resolve labels and encode
  for (const ins of instrs) {
    for (const a of ins.args) {
      if (a.kind === "label") {
        const t = labels[a.name.toLowerCase()];
        if (t === undefined) errors.push({ line: ins.line, message: `there's no label called "${a.name}"` });
        else a.target = t;
      }
    }
    const nums = ins.args.map((a) => (a.kind === "reg" || a.kind === "ind" ? a.r : a.kind === "imm" ? a.v : a.kind === "addr" ? a.a : a.target));
    ins.code = [ins.opcode, nums[0] ?? 0, nums[1] ?? 0];
  }
  if (!errors.length && instrs.length === 0) errors.push({ line: 1, message: "There are no instructions yet. Write at least one, like MOV R0, #5." });
  errors.sort((a, b) => a.line - b.line);
  if (errors.length) return { ok: false, errors };
  return { ok: true, program: { instrs, labels, lineAddr } };
}

/** Text for one instruction, rebuilt from its operands (labels by name). */
export function instrText(ins: { op: Mnemonic; args: Operand[] }): string {
  const parts = ins.args.map((a) => (a.kind === "reg" ? `R${a.r}` : a.kind === "imm" ? `#${a.v}` : a.kind === "addr" ? `[${a.a}]` : a.kind === "ind" ? `[R${a.r}]` : a.name));
  return parts.length ? `${ins.op} ${parts.join(", ")}` : ins.op;
}

/** Decode three numbers back into an instruction (labels shown as addresses). */
export function decode(code: number[]): string | null {
  const form = FORMS.find((f) => f.opcode === code[0]);
  if (!form) return null;
  const parts = form.kinds.map((k, i) => {
    const v = code[i + 1] ?? 0;
    return k === "reg" ? `R${v}` : k === "imm" ? `#${v}` : k === "addr" ? `[${v}]` : k === "ind" ? `[R${v}]` : `${v}`;
  });
  return parts.length ? `${form.op} ${parts.join(", ")}` : form.op;
}

// ───────────────────────── machine ─────────────────────────

export interface MachineConfig {
  registers: number;
  memory: number;
  allow: string[] | null;
  maxSteps: number;
  /** Starting register values (length = registers). */
  regs: number[];
  /** Starting memory (length = memory). */
  mem: number[];
  /** Address → variable name, for notes. */
  names: Record<string, string>;
  /** Mention the flags in step notes. */
  flags: boolean;
}

export interface Machine {
  regs: number[];
  mem: number[];
  pc: number;
  sp: number;
  z: boolean;
  n: boolean;
  out: number[];
  steps: number;
  halted: boolean;
  error: string | null;
  note: string;
  /** Address of the instruction that just ran. */
  last: number | null;
  wroteReg: number | null;
  wroteMem: number | null;
  readMem: number | null;
}

/** Overrides like { R0: 5 } / { "3": 10 } applied to a starting array. */
export function applyOverrides(base: number[], over: Record<string, number> | undefined, kind: "reg" | "mem"): number[] {
  const out = [...base];
  for (const [k, v] of Object.entries(over ?? {})) {
    const idx = kind === "reg" ? Number(k.replace(/^r/i, "")) : Number(k);
    if (Number.isInteger(idx) && idx >= 0 && idx < out.length) out[idx] = wrap(v);
  }
  return out;
}

export function boot(cfg: MachineConfig, over?: { regs?: Record<string, number>; mem?: Record<string, number> }): Machine {
  return {
    regs: applyOverrides(cfg.regs, over?.regs, "reg"),
    mem: applyOverrides(cfg.mem, over?.mem, "mem"),
    pc: 0,
    sp: cfg.memory,
    z: false,
    n: false,
    out: [],
    steps: 0,
    halted: false,
    error: null,
    note: "",
    last: null,
    wroteReg: null,
    wroteMem: null,
    readMem: null,
  };
}

const fmt = (v: number) => (v < 0 ? `−${-v}` : String(v));

function where(cfg: MachineConfig, a: number) {
  const name = cfg.names[String(a)];
  return name ? `${name} (address ${a})` : `address ${a}`;
}

function flagText(z: boolean, n: boolean) {
  return `Z = ${z ? 1 : 0}, N = ${n ? 1 : 0}`;
}

/** Runs one instruction. Returns a new machine; the old one is untouched. */
export function step(m0: Machine, p: Program, cfg: MachineConfig): Machine {
  if (m0.halted || m0.error) return m0;
  const m: Machine = { ...m0, regs: [...m0.regs], mem: [...m0.mem], out: [...m0.out], wroteReg: null, wroteMem: null, readMem: null };
  if (m.steps >= cfg.maxSteps) {
    m.error = `Stopped after ${cfg.maxSteps} steps. The program may be stuck in a loop that never ends.`;
    m.note = m.error;
    return m;
  }
  const ins = p.instrs[m.pc];
  if (!ins) {
    m.error = `PC is ${m.pc}, but there's no instruction at address ${m.pc}. The CPU ran past the end of the program: did you forget HLT?`;
    m.note = m.error;
    return m;
  }
  const at = m.pc;
  m.last = at;
  m.steps += 1;
  let next = m.pc + 1;
  const a = ins.args[0];
  const b = ins.args[1];
  const R = (o: Operand | undefined) => (o && (o.kind === "reg" || o.kind === "ind") ? o.r : 0);
  const val = (o: Operand | undefined) => (o?.kind === "imm" ? o.v : m.regs[R(o)]);
  const valText = (o: Operand | undefined) => (o?.kind === "imm" ? fmt(o.v) : `R${R(o)}`);
  const setFlags = (v: number) => {
    m.z = v === 0;
    m.n = v < 0;
  };
  const fail = (msg: string) => {
    m.error = msg;
    m.note = msg;
    m.steps -= 1;
    m.last = m0.last;
    return m;
  };
  const addrOf = (o: Operand | undefined): number | null => {
    if (o?.kind === "addr") return o.a;
    if (o?.kind === "ind") return m.regs[o.r];
    return null;
  };
  const jump = (taken: boolean, why: string) => {
    const target = b === undefined && a?.kind === "label" ? a : null;
    if (!target) return;
    if (taken) {
      next = target.target;
      m.note = `${why}, so ${ins.op} jumps to ${target.name} (address ${target.target}).`;
    } else m.note = `${why}, so ${ins.op} doesn't jump: on to the next instruction.`;
  };

  switch (ins.op) {
    case "HLT":
      m.halted = true;
      next = m.pc;
      m.note = `The CPU stops. ${m.steps} ${m.steps === 1 ? "step" : "steps"} in total.`;
      break;
    case "MOV": {
      const v = val(b);
      m.regs[R(a)] = v;
      m.wroteReg = R(a);
      m.note = b?.kind === "imm" ? `R${R(a)} = ${fmt(v)}.` : `Copied R${R(b)} into R${R(a)}: both now hold ${fmt(v)}.`;
      break;
    }
    case "LOAD": {
      const addr = addrOf(b);
      if (addr === null || addr < 0 || addr >= cfg.memory) return fail(`LOAD from address ${addr}, but memory goes from 0 to ${cfg.memory - 1}.`);
      m.regs[R(a)] = m.mem[addr];
      m.wroteReg = R(a);
      m.readMem = addr;
      m.note = `${b?.kind === "ind" ? `R${R(b)} holds ${addr}, so read` : "Read"} ${where(cfg, addr)} into R${R(a)}: R${R(a)} = ${fmt(m.mem[addr])}.`;
      break;
    }
    case "STORE": {
      const addr = addrOf(b);
      if (addr === null || addr < 0 || addr >= cfg.memory) return fail(`STORE to address ${addr}, but memory goes from 0 to ${cfg.memory - 1}.`);
      m.mem[addr] = m.regs[R(a)];
      m.wroteMem = addr;
      m.note = `${b?.kind === "ind" ? `R${R(b)} holds ${addr}, so wrote` : "Wrote"} R${R(a)} (${fmt(m.regs[R(a)])}) into ${where(cfg, addr)}.`;
      break;
    }
    case "ADD":
    case "SUB": {
      const x = m.regs[R(a)];
      const y = val(b);
      const v = wrap(ins.op === "ADD" ? x + y : x - y);
      m.regs[R(a)] = v;
      m.wroteReg = R(a);
      setFlags(v);
      m.note = `R${R(a)} = ${fmt(x)} ${ins.op === "ADD" ? "+" : "−"} ${fmt(y)} = ${fmt(v)}.${cfg.flags ? ` Flags: ${flagText(m.z, m.n)}.` : ""}`;
      break;
    }
    case "CMP": {
      const x = m.regs[R(a)];
      const y = val(b);
      const v = wrap(x - y);
      setFlags(v);
      const rel = v === 0 ? "equal" : v < 0 ? `R${R(a)} is less` : `R${R(a)} is greater`;
      m.note = `Compared R${R(a)} with ${valText(b)}: ${fmt(x)} − ${fmt(y)} = ${fmt(v)} (${rel}). ${flagText(m.z, m.n)}.`;
      break;
    }
    case "JMP":
      jump(true, "Always");
      m.note = `Jumped to ${a?.kind === "label" ? a.name : "?"} (address ${a?.kind === "label" ? a.target : "?"}).`;
      break;
    case "JZ":
      jump(m.z, `Z is ${m.z ? 1 : 0}`);
      break;
    case "JNZ":
      jump(!m.z, `Z is ${m.z ? 1 : 0}`);
      break;
    case "JLT":
      jump(m.n, `N is ${m.n ? 1 : 0}`);
      break;
    case "JGT":
      jump(!m.z && !m.n, `Z is ${m.z ? 1 : 0} and N is ${m.n ? 1 : 0}`);
      break;
    case "OUT":
      m.out.push(m.regs[R(a)]);
      m.note = `Output ${fmt(m.regs[R(a)])} (from R${R(a)}).`;
      break;
    case "PUSH":
      if (m.sp <= 0) return fail("Stack overflow: PUSH, but the stack has filled all of memory.");
      m.sp -= 1;
      m.mem[m.sp] = m.regs[R(a)];
      m.wroteMem = m.sp;
      m.note = `Pushed ${fmt(m.regs[R(a)])} (from R${R(a)}) onto the stack at address ${m.sp}. SP = ${m.sp}.`;
      break;
    case "POP":
      if (m.sp >= cfg.memory) return fail("Stack underflow: POP, but the stack is empty.");
      m.regs[R(a)] = m.mem[m.sp];
      m.wroteReg = R(a);
      m.readMem = m.sp;
      m.note = `Popped ${fmt(m.mem[m.sp])} off the stack (address ${m.sp}) into R${R(a)}. SP = ${m.sp + 1}.`;
      m.sp += 1;
      break;
    case "CALL": {
      if (m.sp <= 0) return fail("Stack overflow: CALL needs room for a return address, but the stack has filled all of memory.");
      const t = a?.kind === "label" ? a : null;
      m.sp -= 1;
      m.mem[m.sp] = m.pc + 1;
      m.wroteMem = m.sp;
      next = t ? t.target : next;
      m.note = `Pushed the return address ${m.pc + 1} onto the stack, then jumped to ${t?.name} (address ${next}).`;
      break;
    }
    case "RET":
      if (m.sp >= cfg.memory) return fail("RET, but the stack is empty: there's no return address to go back to.");
      next = m.mem[m.sp];
      m.readMem = m.sp;
      m.sp += 1;
      m.note = `Popped the return address ${next} off the stack and jumped back to it.`;
      break;
  }
  m.pc = next;
  return m;
}

/** Runs until HLT, an error, or the step limit. */
export function run(m0: Machine, p: Program, cfg: MachineConfig): Machine {
  let m = m0;
  for (let i = 0; i <= cfg.maxSteps + 1 && !m.halted && !m.error; i++) m = step(m, p, cfg);
  return m;
}

// ───────────────────────── goals ─────────────────────────

export interface CpuCase {
  regs?: Record<string, number>;
  mem?: Record<string, number>;
  out?: number[];
  expectRegs?: Record<string, number>;
  expectMem?: Record<string, number>;
}

export interface CpuGoal {
  /** Expected output of the default run. */
  out?: number[];
  /** Expected registers ("R0": 5) after the default run. */
  regs?: Record<string, number>;
  /** Expected memory ("3": 10) after the default run. */
  mem?: Record<string, number>;
  /** Re-run with other starting values: the program must work in general. */
  cases?: CpuCase[];
  /** Mnemonics the program must use / must not use. */
  uses?: string[];
  avoid?: string[];
  /** At most this many instructions. */
  maxLines?: number;
  /** At most this many steps in the default run. */
  maxSteps?: number;
}

export type Verdict = { ok: true } | { ok: false; reason: string };

const listText = (xs: number[]) => (xs.length ? xs.map(fmt).join(", ") : "nothing");

function describeInputs(c: CpuCase, cfg: MachineConfig) {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(c.regs ?? {})) parts.push(`${k.toUpperCase()} = ${fmt(v)}`);
  for (const [k, v] of Object.entries(c.mem ?? {})) parts.push(`${cfg.names[k] ?? `address ${k}`} = ${fmt(v)}`);
  return parts.length ? `With ${parts.join(", ")}: ` : "";
}

function compare(m: Machine, exp: { out?: number[]; regs?: Record<string, number>; mem?: Record<string, number> }, cfg: MachineConfig, prefix: string): Verdict {
  const say = (text: string): Verdict => ({ ok: false, reason: prefix ? prefix + text : text.charAt(0).toUpperCase() + text.slice(1) });
  if (m.error) return say(m.error);
  if (!m.halted) return say("the program didn't reach HLT.");
  if (exp.out) {
    const same = exp.out.length === m.out.length && exp.out.every((v, i) => v === m.out[i]);
    if (!same) return say(`it output ${listText(m.out)}, but it should output ${listText(exp.out)}.`);
  }
  for (const [k, v] of Object.entries(exp.regs ?? {})) {
    const r = Number(k.replace(/^r/i, ""));
    if (m.regs[r] !== v) return say(`R${r} should end up as ${fmt(v)}, but it's ${fmt(m.regs[r] ?? 0)}.`);
  }
  for (const [k, v] of Object.entries(exp.mem ?? {})) {
    const a = Number(k);
    if (m.mem[a] !== v) return say(`${where(cfg, a)} should end up holding ${fmt(v)}, but it holds ${fmt(m.mem[a] ?? 0)}.`);
  }
  return { ok: true };
}

/** Assembles and runs `source` against a goal (with its extra cases). */
export function evaluate(source: string, cfg: MachineConfig, goal: CpuGoal): Verdict {
  const asm = assemble(source, { allow: cfg.allow, registers: cfg.registers, memory: cfg.memory });
  if (!asm.ok) return { ok: false, reason: `Line ${asm.errors[0].line}: ${asm.errors[0].message}` };
  const p = asm.program;
  const used = new Set(p.instrs.map((i) => i.op));
  for (const u of goal.uses ?? []) if (!used.has(u.toUpperCase() as Mnemonic)) return { ok: false, reason: `Use ${u.toUpperCase()} somewhere in your program.` };
  for (const u of goal.avoid ?? []) if (used.has(u.toUpperCase() as Mnemonic)) return { ok: false, reason: `Solve this one without ${u.toUpperCase()}.` };
  if (goal.maxLines !== undefined && p.instrs.length > goal.maxLines) return { ok: false, reason: `Do it in at most ${goal.maxLines} instructions (yours has ${p.instrs.length}).` };
  if (goal.out || goal.regs || goal.mem || goal.maxSteps !== undefined) {
    const m = run(boot(cfg), p, cfg);
    const v = compare(m, goal, cfg, "");
    if (!v.ok) return v;
    if (goal.maxSteps !== undefined && m.steps > goal.maxSteps) return { ok: false, reason: `It works, but takes ${m.steps} steps. Can you do it in ${goal.maxSteps} or fewer?` };
  }
  for (const c of goal.cases ?? []) {
    const m = run(boot(cfg, c), p, cfg);
    const v = compare(m, { out: c.out, regs: c.expectRegs, mem: c.expectMem }, cfg, describeInputs(c, cfg));
    if (!v.ok) return v;
  }
  return { ok: true };
}

/** Builds a machine config from widget props (shared by the widget and content checks). */
export function makeConfig(p: {
  allow?: string[];
  registers?: number;
  memory?: number;
  regs?: Record<string, number>;
  mem?: Record<string, number>;
  names?: Record<string, string>;
  maxSteps?: number;
  flags?: boolean;
}): MachineConfig {
  const allow = p.allow ? p.allow.map((s) => s.toUpperCase()) : null;
  const ops = allow ?? ALL_OPS;
  const needsMem = ["LOAD", "STORE", "PUSH", "POP", "CALL", "RET"].some((o) => ops.includes(o)) || Boolean(p.mem && Object.keys(p.mem).length);
  const registers = Math.min(8, Math.max(1, p.registers ?? 4));
  const memory = Math.min(32, Math.max(0, p.memory ?? (needsMem ? 16 : 0)));
  const flags = p.flags ?? ["CMP", "JZ", "JNZ", "JLT", "JGT"].some((o) => ops.includes(o));
  return {
    registers,
    memory,
    allow,
    maxSteps: p.maxSteps ?? 500,
    regs: applyOverrides(new Array(registers).fill(0), p.regs, "reg"),
    mem: applyOverrides(new Array(memory).fill(0), p.mem, "mem"),
    names: p.names ?? {},
    flags,
  };
}
