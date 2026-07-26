import { NextResponse } from "next/server";
import { PublishingError } from "@aivs/publishing";
import { authErrorResponse } from "./auth-context";

export function publishingErrorResponse(error: unknown): NextResponse {
  if (error instanceof PublishingError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return authErrorResponse(error);
}
