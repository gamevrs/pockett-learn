import type { WidgetRegistry } from "@/learn/widget";
import { ThreatMap, checkThreatMap } from "./ThreatMap";
import { Gate, checkGate } from "./Gate";
import { SessionLab, checkSessionLab } from "./SessionLab";
import { CookieLab, checkCookieLab } from "./CookieLab";
import { OAuthFlow, checkOAuthFlow } from "./OAuthFlow";
import { IdorLab, checkIdorLab } from "./IdorLab";
import { PermsLab, checkPermsLab } from "./PermsLab";
import { SecretsHunt, checkSecretsHunt } from "./SecretsHunt";
import { SupplyLab, checkSupplyLab } from "./SupplyLab";
import { InjectLab, checkInjectLab } from "./InjectLab";
import { TenantLab, checkTenantLab } from "./TenantLab";
import { AuditLab, checkAuditLab } from "./AuditLab";
import { HINTS, withHint } from "./hints";

/** Widgets for the "Trust nothing by default" security module. Keys are prefixed "sec-". */
const BASE: WidgetRegistry = {
  "sec-threat": { Component: ThreatMap, check: checkThreatMap },
  "sec-gate": { Component: Gate, check: checkGate },
  "sec-session": { Component: SessionLab, check: checkSessionLab },
  "sec-cookie": { Component: CookieLab, check: checkCookieLab },
  "sec-oauth": { Component: OAuthFlow, check: checkOAuthFlow },
  "sec-idor": { Component: IdorLab, check: checkIdorLab },
  "sec-perms": { Component: PermsLab, check: checkPermsLab },
  "sec-secrets": { Component: SecretsHunt, check: checkSecretsHunt },
  "sec-supply": { Component: SupplyLab, check: checkSupplyLab },
  "sec-inject": { Component: InjectLab, check: checkInjectLab },
  "sec-tenant": { Component: TenantLab, check: checkTenantLab },
  "sec-audit": { Component: AuditLab, check: checkAuditLab },
};

/** Widgets whose goal questions get a nudge under them after a wrong Check. */
const NUDGE: Record<string, (goal: Record<string, unknown>) => string> = {
  "sec-threat": HINTS.threat,
  "sec-gate": HINTS.gate,
  "sec-session": HINTS.session,
  "sec-cookie": HINTS.cookie,
  "sec-oauth": HINTS.oauth,
  "sec-idor": HINTS.idor,
  "sec-perms": HINTS.perms,
  "sec-supply": HINTS.supply,
  "sec-inject": HINTS.inject,
  "sec-tenant": HINTS.tenant,
  "sec-audit": HINTS.audit,
};

export const SECURITY_WIDGETS: WidgetRegistry = Object.fromEntries(Object.entries(BASE).map(([key, def]) => [key, NUDGE[key] ? withHint(def, NUDGE[key]) : def]));
