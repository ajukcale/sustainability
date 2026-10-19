import { checkDatabaseReady } from "@sustainability/db";
import { NextResponse } from "next/server";

/** Readiness: dependencies (PostgreSQL) are reachable. */
export async function GET() {
  const db = await checkDatabaseReady();

  if (!db.ok) {
    return NextResponse.json(
      {
        status: "not_ready",
        checks: { database: { ok: false, error: db.error } },
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      status: "ready",
      checks: { database: { ok: true } },
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
