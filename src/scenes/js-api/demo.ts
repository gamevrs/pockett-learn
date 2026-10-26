import { createStaticProgram, type ProgramHandle } from "@/engine/program";
import { DEFAULT_ROUTES } from "@/engine/runtimes/javascript/sim-api";
import { SimNetwork } from "@/engine/runtimes/javascript/sim-network";
import { DocklineSim } from "./sim";
import { parseGraph } from "./sim-graph";
import { runSuite } from "./sim-suite";
import type { RawRequest } from "./types";

/**
 * What the finished Dockline program exposes, as plain TypeScript so the landing page and the
 * project hub card need no JavaScript engine. It is the stand-in API from sim.ts behind the same
 * hooks the scene calls, with its outbound calls going through the program's network.
 */

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function jsApiDemoProgram(): ProgramHandle {
  const net = new SimNetwork({ now: () => performance.now(), setTimeout: (cb, ms) => window.setTimeout(cb, ms), clearTimeout: (id) => window.clearTimeout(id) }, DEFAULT_ROUTES);

  const api = new DocklineSim({
    sleep,
    upstream: async (path) => {
      // a call that never answers must not hang the request
      const res = await Promise.race([net.fetch(path), sleep(700).then(() => null)]);
      if (!res) throw new Error("upstream timed out");
      return { status: res.status, body: await res.json().catch(() => null) };
    },
  });

  return createStaticProgram({
    hooks: {
      listMiddleware: (() => api.listMiddleware()) as never,
      listRoutes: (() => api.listRoutes()) as never,
      recentLogs: ((n: number) => api.recentLogs(n)) as never,
      breakerState: (() => api.breakerState()) as never,
      lifecycleState: (() => api.lifecycleState()) as never,
      restart: (() => api.restart()) as never,
      parseGraph: ((source: string) => parseGraph(source)) as never,
    },
    asyncHooks: {
      handle: ((raw: RawRequest) => api.handle(raw)) as never,
      shutdown: (() => api.shutdown()) as never,
      runSuite: (() => runSuite()) as never,
    },
    env: {
      network: {
        entries: () => net.entries(),
        subscribe: (l) => net.subscribe(l),
        configure: (o) => net.configure(o),
        failNext: (m, t, k) => net.failNext(m, t, k),
        clearLog: () => net.clearLog(),
      },
    },
  });
}
