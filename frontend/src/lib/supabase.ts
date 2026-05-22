import { createClient } from "@supabase/supabase-js";
import { publicSupabaseConfig } from "./config";

if (publicSupabaseConfig.mode !== "supabase" && typeof window !== "undefined") {
  console.warn("[config] Supabase is not fully configured.", {
    mode: publicSupabaseConfig.mode,
    issues: publicSupabaseConfig.issues,
    warnings: publicSupabaseConfig.warnings
  });
}

export const supabase =
  publicSupabaseConfig.mode === "supabase"
    ? createClient(publicSupabaseConfig.url, publicSupabaseConfig.anonKey)
    : null;
