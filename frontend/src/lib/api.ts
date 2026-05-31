import { createClient } from "@/lib/supabase/client";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

export interface ApiResponse<T> {
  data: T;
}

export type ApiValidator<T> = (payload: unknown) => payload is T;

const getAccessToken = async (): Promise<string | null> => {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
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
