import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "@/lib/config";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = [
    !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : "",
    !anonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : "",
    !serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : ""
  ].filter(Boolean);

  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Server is missing delete-account configuration: ${missing.join(", ")}. Add it in your hosting environment variables.`
      },
      { status: 500 }
    );
  }

  const configuredSupabaseUrl = supabaseUrl as string;
  const configuredAnonKey = anonKey as string;
  const configuredServiceRoleKey = serviceRoleKey as string;

  const { confirmation } = (await request.json().catch(() => ({}))) as {
    confirmation?: string;
  };

  if (confirmation !== "DELETE") {
    return NextResponse.json({ error: "Confirmation text did not match." }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

  if (!token) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }

  const normalizedUrl = normalizeSupabaseUrl(configuredSupabaseUrl);
  const userClient = createClient(normalizedUrl, configuredAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  const {
    data: { user },
    error: userError
  } = await userClient.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Session is invalid. Please sign in again." }, { status: 401 });
  }

  const adminClient = createClient(normalizedUrl, configuredServiceRoleKey);
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
