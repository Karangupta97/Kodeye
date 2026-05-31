import { createClient } from "@/lib/supabase/client";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

export interface ApiResponse<T> {
  data: T;
}

export type ApiValidator<T> = (payload: unknown) => payload is T;

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

export const setCachedAccessToken = (
  token: string | null,
  expiresAt?: number
) => {
  cachedAccessToken = token;
  tokenExpiresAt = expiresAt ?? (token ? Date.now() + 55 * 60_000 : 0);
};

const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token ?? null;
    setCachedAccessToken(token, session?.expires_at ? session.expires_at * 1000 : undefined);
    return token;
  } catch {
    return null;
  }
};

export const fetchApi = async <T>(
  path: string,
  options: RequestInit = {},
  validator?: ApiValidator<T>
): Promise<T> => {
  const accessToken = await getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const payload = (await response.json()) as ApiResponse<unknown>;
  if (!("data" in payload)) {
    throw new Error("Invalid API response shape");
  }

  if (validator && !validator(payload.data)) {
    throw new Error("API response validation failed");
  }

  return payload.data as T;
};

export const fetchPullRequestFiles = (
  prId: string,
  options?: { includePatch?: boolean; filename?: string }
) => {
  const params = new URLSearchParams();
  if (options?.includePatch) params.set("includePatch", "1");
  if (options?.filename) params.set("filename", options.filename);
  const qs = params.toString();
  return fetchApi<Array<{
    id: string;
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch: string | null;
    raw_url: string | null;
    blob_url: string | null;
  }>>(`/api/pull-requests/${prId}/files${qs ? `?${qs}` : ""}`);
};
