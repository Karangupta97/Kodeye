import { logger } from "./logger";

export type SecurityEventType =
  | "auth_failure"
  | "authorization_failure"
  | "unauthorized_access";

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  resource?: string;
  resourceId?: string;
  path?: string;
  detail?: string;
}

export const logSecurityEvent = (event: SecurityEvent) => {
  logger.warn(`[security] ${event.type}`, {
    ...event,
    timestamp: new Date().toISOString(),
  });
};

export const logAuthFailure = (detail?: string, path?: string) => {
  logSecurityEvent({ type: "auth_failure", detail, path });
};

export const logAuthorizationFailure = (input: {
  userId: string;
  resource: string;
  resourceId: string;
  path?: string;
}) => {
  logSecurityEvent({
    type: "authorization_failure",
    userId: input.userId,
    resource: input.resource,
    resourceId: input.resourceId,
    path: input.path,
  });
};
