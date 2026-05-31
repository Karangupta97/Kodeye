import { getServiceDB } from "../db/supabase";
import { logger } from "../utils/logger";

const profileCache = new Map<string, string | null>();

/**
 * Resolve a GitHub login to the Supabase auth user UUID via profiles.username.
 */
export const resolveSupabaseUserId = async (
  githubLogin: string | null | undefined
): Promise<string | null> => {
  if (!githubLogin?.trim()) {
    return null;
  }

  const key = githubLogin.trim().toLowerCase();
  if (profileCache.has(key)) {
    return profileCache.get(key) ?? null;
  }

  const supabase = getServiceDB();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", key)
    .maybeSingle();

  if (error) {
    logger.warn("Failed to resolve Supabase user from GitHub login", {
      githubLogin: key,
      error: error.message,
    });
    profileCache.set(key, null);
    return null;
  }

  const userId = data?.id ?? null;
  profileCache.set(key, userId);
  return userId;
};

/** Prefer repo owner, then webhook sender, for tenant assignment. */
export const resolveWebhookUserId = async (input: {
  ownerLogin?: string | null;
  senderLogin?: string | null;
}): Promise<string | null> => {
  const fromOwner = await resolveSupabaseUserId(input.ownerLogin);
  if (fromOwner) {
    return fromOwner;
  }
  return resolveSupabaseUserId(input.senderLogin);
};
