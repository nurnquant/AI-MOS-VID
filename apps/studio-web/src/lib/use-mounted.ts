"use client";

/**
 * Hydration guard (see AIVS-PROJECTS-012 flake post-mortem): a form
 * submit button that is enabled in the server-rendered HTML can fire a
 * NATIVE GET submit when clicked before React hydrates — navigating
 * with query params instead of running onSubmit. Gate submit buttons
 * with `disabled={!mounted || …}` so they only activate once hydrated.
 */
import { useEffect, useState } from "react";

export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
