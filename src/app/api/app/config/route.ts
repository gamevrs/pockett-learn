import { APP_CONFIG } from "@/lib/app/config";

/** Version gate and Notifications inbox for the phone app (see src/lib/app/config.ts). Prerendered at build time. */
export function GET() {
  return Response.json(APP_CONFIG);
}
