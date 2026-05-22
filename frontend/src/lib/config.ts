export type RuntimeMode = "supabase" | "demo" | "misconfigured";

export type PublicSupabaseConfig = {
  mode: RuntimeMode;
  url: string;
  anonKey: string;
  issues: string[];
  warnings: string[];
};

export function normalizeSupabaseUrl(url: string) {
  return url.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

function looksLikeSupabaseProjectUrl(url: string) {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url);
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const url = rawUrl ? normalizeSupabaseUrl(rawUrl) : "";
  const anonKey = rawAnonKey.trim();
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!rawUrl && !rawAnonKey) {
    return {
      mode: "demo",
      url: "",
      anonKey: "",
      issues: [],
      warnings: ["Supabase env vars are missing. The app is running in browser-only demo mode."]
    };
  }

  if (!rawUrl) issues.push("NEXT_PUBLIC_SUPABASE_URL is missing.");
  if (!rawAnonKey) issues.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.");
  if (rawUrl.includes("/rest/v1")) warnings.push("NEXT_PUBLIC_SUPABASE_URL should be the project URL, not the REST URL. The app will normalize it.");
  if (url && !looksLikeSupabaseProjectUrl(url)) warnings.push("NEXT_PUBLIC_SUPABASE_URL does not look like a Supabase project URL.");
  if (anonKey && !anonKey.startsWith("ey")) warnings.push("NEXT_PUBLIC_SUPABASE_ANON_KEY does not look like a JWT key.");

  return {
    mode: issues.length > 0 ? "misconfigured" : "supabase",
    url,
    anonKey,
    issues,
    warnings
  };
}

export const publicSupabaseConfig = getPublicSupabaseConfig();

export function runtimeLabel(mode: RuntimeMode) {
  if (mode === "supabase") return "Supabase connected";
  if (mode === "misconfigured") return "Config issue";
  return "Demo mode";
}
