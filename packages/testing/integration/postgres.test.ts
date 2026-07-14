import { describe, expect, it } from "vitest";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://aivs:aivs_local@localhost:5433/aivs";

describe("PostgreSQL connection (integration)", () => {
  it("connects and executes a round-trip query", async () => {
    const client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    try {
      const result = await client.query("SELECT 1 + 1 AS sum, current_database() AS db");
      expect(result.rows[0].sum).toBe(2);
      expect(result.rows[0].db).toBeTruthy();
    } finally {
      await client.end();
    }
  });
});
