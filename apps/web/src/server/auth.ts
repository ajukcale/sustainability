import { headers } from "next/headers";
import {
  assertOrgAccess,
  getAuthSession,
  hasPermission,
  requirePermission,
  requireTenantContext,
  requireUser,
  type AppSession,
  type Permission,
} from "@sustainability/auth";

export async function getRequestHeaders() {
  return await headers();
}

export async function requireAppUser() {
  return requireUser(await headers());
}

export async function requireAppPermission(permission: Permission) {
  return requirePermission(await headers(), permission);
}

export async function requireAppTenant() {
  return requireTenantContext(await headers());
}

export async function getAppAuthSession() {
  return getAuthSession(await headers());
}

export { assertOrgAccess, hasPermission };
export type { AppSession, Permission };
