import { createClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "@/lib/config";

type StorageAdminClient = {
  storage: {
    from: (bucket: string) => {
      list: (
        path?: string,
        options?: { limit?: number; sortBy?: { column: string; order: "asc" | "desc" } }
      ) => Promise<{ data: { id: string | null; name: string }[] | null }>;
      remove: (paths: string[]) => Promise<unknown>;
    };
  };
};

export type AccountDeletionResult = {
  ok: boolean;
  status: number;
  error?: string;
};

export async function deleteSignedInAccount(request: Request): Promise<AccountDeletionResult> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return { ok: false, status: 415, error: "Expected a JSON request." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = [
    !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : "",
    !anonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : "",
    !serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : ""
  ].filter(Boolean);

  if (missing.length > 0) {
    return {
      ok: false,
      status: 500,
      error: `Server is missing delete-account configuration: ${missing.join(", ")}. Add it in your hosting environment variables.`
    };
  }

  const { confirmation } = (await request.json().catch(() => ({}))) as {
    confirmation?: string;
  };

  if (confirmation !== "DELETE") {
    return { ok: false, status: 400, error: "Confirmation text did not match." };
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

  if (!token) {
    return { ok: false, status: 401, error: "Missing auth token." };
  }

  const normalizedUrl = normalizeSupabaseUrl(supabaseUrl as string);
  const userClient = createClient(normalizedUrl, anonKey as string, {
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
    return { ok: false, status: 401, error: "Session is invalid. Please sign in again." };
  }

  const adminClient = createClient(normalizedUrl, serviceRoleKey as string, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  await removeUserStorageFolder(adminClient, "avatars", user.id);
  await removeUserStorageFolder(adminClient, "group-images", user.id);

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return { ok: false, status: 500, error: "Account deletion failed. Please try again later." };
  }

  return { ok: true, status: 200 };
}

async function removeUserStorageFolder(
  client: StorageAdminClient,
  bucket: string,
  userId: string
) {
  const paths = await listStoragePaths(client, bucket, userId);
  if (paths.length === 0) return;
  await client.storage.from(bucket).remove(paths);
}

async function listStoragePaths(
  client: StorageAdminClient,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const { data } = await client.storage.from(bucket).list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" }
  });
  if (!data?.length) return [];
  const paths = await Promise.all(
    data.map(async (item) => {
      const path = `${prefix}/${item.name}`;
      if (item.id === null) return listStoragePaths(client, bucket, path);
      return [path];
    })
  );
  return paths.flat();
}
