import { createAuthClient } from "better-auth/react";

function resolveBaseURL() {
  if (typeof globalThis !== "undefined") {
    const loc = (globalThis as { location?: { origin?: string } }).location;
    if (loc?.origin) return loc.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: resolveBaseURL(),
});

export const { signIn, signUp, signOut, useSession } = authClient;
