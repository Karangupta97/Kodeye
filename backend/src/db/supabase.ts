import { createClient, SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null = null;
let authClient: SupabaseClient | null = null;

const requireSupabaseUrl = (): string => {
  const url = process.env.SUPABASE_URL;
  if (!url) {
    throw new Error("Missing SUPABASE_URL environment variable.");
  }
  return url;
};

/** Service role — webhooks and system writes only (bypasses RLS). */
export const getServiceDB = (): SupabaseClient => {
  if (serviceClient) {
    return serviceClient;
  }

  const supabaseUrl = requireSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY for service database access.",
    );
  }

  serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return serviceClient;
};

/** Anon key — JWT validation in requireAuth (no elevated access). */
export const getAuthDB = (): SupabaseClient => {
  if (authClient) {
    return authClient;
  }

  const supabaseUrl = requireSupabaseUrl();
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error("Missing SUPABASE_ANON_KEY for auth validation.");
  }

  authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return authClient;
};

/** User-scoped client — RLS enforced via the user's access token. */
export const getUserDB = (accessToken: string): SupabaseClient => {
  const supabaseUrl = requireSupabaseUrl();
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error("Missing SUPABASE_ANON_KEY for user-scoped database access.");
  }

  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
};

/** @deprecated Use getServiceDB() for writes or pass userId filters explicitly. */
export const getDB = (): SupabaseClient => getServiceDB();

export const connectDB = (): SupabaseClient => getServiceDB();
