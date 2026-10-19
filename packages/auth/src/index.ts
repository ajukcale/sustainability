/**
 * Phase 0 auth stub — session + tenant context from env.
 * Replace with hosted IdP (Clerk / Auth0 / Cognito / Better Auth) in Phase 1.
 * Never trust client-supplied tenant_id; always resolve from server session.
 */

export type SessionUser = {
  id: string;
  email: string;
};

export type Session = {
  user: SessionUser;
  tenantId: string;
};

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

/** Returns the current stub session (env-backed). */
export function getSession(): Session {
  return {
    user: {
      id: requireEnv("AUTH_STUB_USER_ID", "user_stub_001"),
      email: requireEnv("AUTH_STUB_EMAIL", "admin@example.com"),
    },
    tenantId: requireEnv("AUTH_STUB_TENANT_ID", "tenant_stub_001"),
  };
}

/** Tenant id from server session only — never from request body. */
export function getTenantId(): string {
  return getSession().tenantId;
}

/** Asserts an explicit tenant id matches the session (isolation helper). */
export function assertTenantAccess(requestedTenantId: string): void {
  const sessionTenantId = getTenantId();
  if (requestedTenantId !== sessionTenantId) {
    const error = new Error("Tenant access denied");
    (error as Error & { status: number }).status = 403;
    throw error;
  }
}
