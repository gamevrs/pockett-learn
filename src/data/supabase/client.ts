"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client. The URL and publishable key are public by design (row level security
 * protects the data), so the production project is the default; env vars can point a local
 * build at a different project.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://irrzwowbetnyppvxflvi.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_WVNVR1HBlLSqBOX-q54bhw_aYWni4Mt";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (!client) {
    client = createClient(URL, KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "pockett_auth" },
    });
  }
  return client;
}
