import type { Module } from "../../learn/types.ts";
import { securityLessonsA } from "./security-a.ts";
import { securityLessonsB } from "./security-b.ts";
import { securityLessonsC } from "./security-c.ts";

/**
 * Module: security. Threat models, authentication and authorization, sessions and tokens, OAuth and
 * OpenID Connect, access control, least privilege, secrets, common web flaws, tenants and audit logs.
 * Written around the Dovetail Clinic booking system and a few small invented services.
 */
export const securityModule: Module = {
  id: "security",
  part: "systems",
  title: "Trust nothing by default",
  blurb: "Threat models, sessions and tokens, OAuth and OpenID Connect, access control, least privilege, secrets, injection and XSS, tenant isolation and audit logs.",
  icon: "shield",
  lessons: [...securityLessonsA, ...securityLessonsB, ...securityLessonsC],
};
