import { NextResponse } from "next/server";
import { ContentError } from "@aivs/content";
import { MockScriptProvider } from "@aivs/providers";
import { authErrorResponse } from "./auth-context";

/** One mock provider per process — deterministic, no external calls. */
export const scriptProvider = new MockScriptProvider();

export function contentErrorResponse(error: unknown): NextResponse {
  if (error instanceof ContentError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return authErrorResponse(error);
}
