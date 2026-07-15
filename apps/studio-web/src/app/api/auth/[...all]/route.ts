/** Better Auth handler — sign-up/in/out, session, etc. (ADR-AIVS-003 §1). */
import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@aivs/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST } = toNextJsHandler(getAuth().handler);
