"use client";

import { useEffect } from "react";
import { startCloudSync } from "@/data/progress/sync";

/** Keeps progress mirrored to Supabase while someone is signed in. Renders nothing. */
export function CloudSync() {
  useEffect(() => startCloudSync(), []);
  return null;
}
