import { Request, Response, NextFunction } from "express";
import { getAuthDB } from "../db/supabase";
import { logAuthFailure } from "../utils/securityLogger";

export interface AuthedRequest extends Request {
  userId: string;
  accessToken: string;
}

const extractBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  return token || null;
};

/** EventSource cannot send Authorization headers; allow token via query. */
export const resolveAccessToken = (req: Request): string | null => {
  const bearer = extractBearerToken(req);
  if (bearer) {
    return bearer;
  }
  const queryToken = req.query.access_token;
  if (typeof queryToken === "string" && queryToken.trim()) {
    return queryToken.trim();
  }
  return null;
};

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = resolveAccessToken(req);
  if (!token) {
    logAuthFailure("missing_token", req.path);
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const supabase = getAuthDB();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      logAuthFailure(error?.message || "invalid_token", req.path);
      return res.status(401).json({ error: "Unauthorized" });
    }

    const authed = req as AuthedRequest;
    authed.userId = user.id;
    authed.accessToken = token;
    return next();
  } catch {
    logAuthFailure("auth_exception", req.path);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

export const getAuthedUserId = (req: Request): string => {
  return (req as AuthedRequest).userId;
};
