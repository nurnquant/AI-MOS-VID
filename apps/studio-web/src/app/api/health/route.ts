import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "studio-web",
    phase: "AIVS-ENV-001",
    timestamp: new Date().toISOString(),
  });
}
