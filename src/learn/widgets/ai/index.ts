import type { WidgetRegistry } from "@/learn/widget";
import { EmbeddingSpace, checkEmbeddingSpace } from "./EmbeddingSpace";
import { AnnSearch, checkAnn } from "./AnnSearch";
import { IndexPlanner, checkIndexPlanner } from "./IndexPlanner";
import { FilterSearch, checkFilterSearch } from "./FilterSearch";
import { Chunker, checkChunker } from "./Chunker";
import { RagPipeline, checkRagPipeline } from "./RagPipeline";
import { HybridSearch, checkHybridSearch } from "./HybridSearch";
import { RagEval, checkRagEval } from "./RagEval";
import { Tokenizer, checkTokenizer, ContextBudget, checkContextBudget } from "./Tokens";
import { InferenceLab, checkInferenceLab } from "./InferenceLab";
import { AgentLoop, checkAgentLoop } from "./AgentLoop";
import { ToolServer, checkToolServer } from "./ToolServer";
import { HINTS, withHint } from "./hints";

/** Widgets for the "Shipping AI features" module. Keys are prefixed with "ai-" to stay unique. */
const BASE: WidgetRegistry = {
  "ai-space": { Component: EmbeddingSpace, check: checkEmbeddingSpace },
  "ai-ann": { Component: AnnSearch, check: checkAnn },
  "ai-index": { Component: IndexPlanner, check: checkIndexPlanner },
  "ai-filter": { Component: FilterSearch, check: checkFilterSearch },
  "ai-chunker": { Component: Chunker, check: checkChunker },
  "ai-rag": { Component: RagPipeline, check: checkRagPipeline },
  "ai-hybrid": { Component: HybridSearch, check: checkHybridSearch },
  "ai-eval": { Component: RagEval, check: checkRagEval },
  "ai-tokens": { Component: Tokenizer, check: checkTokenizer },
  "ai-budget": { Component: ContextBudget, check: checkContextBudget },
  "ai-infer": { Component: InferenceLab, check: checkInferenceLab },
  "ai-agent": { Component: AgentLoop, check: checkAgentLoop },
  "ai-mcp": { Component: ToolServer, check: checkToolServer },
};

/** Widgets whose goal questions get a nudge under them after a wrong Check. */
const NUDGE: Record<string, (goal: Record<string, unknown>) => string> = {
  "ai-space": HINTS.space,
  "ai-ann": HINTS.ann,
  "ai-index": HINTS.index,
  "ai-filter": HINTS.filter,
  "ai-chunker": HINTS.chunker,
  "ai-rag": HINTS.rag,
  "ai-hybrid": HINTS.hybrid,
  "ai-eval": HINTS.eval,
  "ai-tokens": HINTS.tokens,
  "ai-budget": HINTS.budget,
  "ai-infer": HINTS.infer,
  "ai-agent": HINTS.agent,
  "ai-mcp": HINTS.mcp,
};

export const AI_WIDGETS: WidgetRegistry = Object.fromEntries(Object.entries(BASE).map(([key, def]) => [key, NUDGE[key] ? withHint(def, NUDGE[key]) : def]));
