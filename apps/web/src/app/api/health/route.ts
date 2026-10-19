import { NextResponse } from "next/server";

/** Liveness: process is up (no dependency checks). */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "sustainability-web",
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
