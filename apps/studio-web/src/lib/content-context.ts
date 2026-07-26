import { NextResponse } from "next/server";
import { ContentError } from "@aivs/content";
import { resolveScriptProvider } from "@aivs/providers";
import { authErrorResponse } from "./auth-context";

/** One provider per process — env-selected (SCRIPT_PROVIDER), mock default. */
export const scriptProvider = resolveScriptProvider();

export function contentErrorResponse(error: unknown): NextResponse {
  if (error instanceof ContentError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return authErrorResponse(error);
}
