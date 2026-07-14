import { describe, expect, it } from "vitest";
import { GET } from "../src/app/api/health/route";

describe("health endpoint (unit)", () => {
  it("returns ok with service identity", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("studio-web");
    expect(body.phase).toBe("AIVS-ENV-001");
  });
});
