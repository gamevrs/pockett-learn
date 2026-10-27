import type { ProgramHandle } from "@/engine/program";
import { garageDemoProgram } from "./garage/demo";
import { launchDemoProgram } from "./launch/demo";
import { beatlabDemoProgram } from "./beatlab/demo";
import { sqldeskDemoProgram } from "./sqldesk/demo";
import { signalLabDemoProgram } from "./signal-lab/demo";
import { cargoControlDemoProgram } from "./cargo-control/demo";
import { storeApiDemoProgram } from "./store-api/demo";
import { smartHomeDemoProgram } from "./smart-home/demo";
import { csharpBasicsDemoProgram } from "./csharp-basics/demo";
import { csharpApiDemoProgram } from "./csharp-api/demo";
import { footlightDemoProgram } from "./csharp-delegates/demo";
import { goBasicsDemoProgram } from "./go-basics/demo";
import { goInventoryDemoProgram } from "./go-inventory/demo";
import { seasonAnalyticsDemoProgram } from "./season-analytics/demo";
import { schemaStudioDemoProgram } from "./schema-studio/demo";
import { countingHouseDemoProgram } from "./counting-house/demo";
import { graphqlGatewayDemoProgram } from "./graphql-gateway/demo";
import { formForgeDemoProgram } from "./form-forge/demo";
import { eventArenaDemoProgram } from "./event-arena/demo";
import { rustBasicsDemoProgram } from "./rust-basics/demo";
import { rustInventoryDemoProgram } from "./rust-inventory/demo";
import { cppBasicsDemoProgram } from "./cpp-basics/demo";
import { cppMemoryDemoProgram } from "./cpp-memory/demo";
import { csharpLinqDemoProgram } from "./csharp-linq/demo";
import { aiFoundationsDemoProgram } from "./ai-foundations/demo";
import { glyphGreenhouseDemoProgram } from "./ai-neural/demo";
import { jsApiDemoProgram } from "./js-api/demo";

/** Scripted stand-ins for a finished learner program, keyed by project slug. Used on the landing page. */
export const DEMO_PROGRAMS: Record<string, () => ProgramHandle> = {
  garage: garageDemoProgram,
  launch: launchDemoProgram,
  beatlab: beatlabDemoProgram,
  "pit-wall": sqldeskDemoProgram,
  "signal-lab": signalLabDemoProgram,
  "cargo-control": cargoControlDemoProgram,
  "store-api": storeApiDemoProgram,
  "smart-home": smartHomeDemoProgram,
  "csharp-basics": csharpBasicsDemoProgram,
  "csharp-api": csharpApiDemoProgram,
  "go-basics": goBasicsDemoProgram,
  "go-inventory": goInventoryDemoProgram,
  "season-analytics": seasonAnalyticsDemoProgram,
  "schema-studio": schemaStudioDemoProgram,
  "counting-house": countingHouseDemoProgram,
  "graphql-gateway": graphqlGatewayDemoProgram,
  "form-forge": formForgeDemoProgram,
  "event-arena": eventArenaDemoProgram,
  "rust-basics": rustBasicsDemoProgram,
  "rust-inventory": rustInventoryDemoProgram,
  "cpp-basics": cppBasicsDemoProgram,
  "cpp-memory": cppMemoryDemoProgram,
  "csharp-linq": csharpLinqDemoProgram,
  "csharp-delegates": footlightDemoProgram,
  "ai-foundations": aiFoundationsDemoProgram,
  "ai-neural": glyphGreenhouseDemoProgram,
  "js-api": jsApiDemoProgram,
};
