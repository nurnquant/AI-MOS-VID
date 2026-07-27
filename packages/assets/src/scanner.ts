/**
 * Malware scanning boundary (security baseline §5, ADR-AIVS-011 §B).
 * Selection via SCAN_PROVIDER=off|clamav — `off` keeps the always-pass
 * scanner but logs the posture once so it is explicit, never silent.
 * Scan errors fail CLOSED: validation treats a thrown scan as a
 * validation failure, so the asset never leaves quarantine unscanned.
 */
import { createReadStream } from "node:fs";
import { createConnection, type Socket } from "node:net";

export interface ScanResult {
  clean: boolean;
  detail?: string;
}

export interface MalwareScanner {
  readonly name: string;
  scan(filePath: string): Promise<ScanResult>;
}

export class AlwaysPassScanner implements MalwareScanner {
  readonly name = "always-pass-local";
  async scan(): Promise<ScanResult> {
    return { clean: true, detail: "scanning disabled (SCAN_PROVIDER=off)" };
  }
}

/**
 * clamd INSTREAM client (TCP, no dependencies): `zINSTREAM\0`, then
 * length-prefixed chunks, zero-length terminator; clamd answers
 * `stream: OK` or `stream: <signature> FOUND`.
 */
export class ClamdScanner implements MalwareScanner {
  readonly name = "clamav";

  private readonly host: string;
  private readonly port: number;
  private readonly timeoutMs: number;

  constructor(options?: { host?: string; port?: number; timeoutMs?: number }) {
    this.host = options?.host ?? process.env.CLAMAV_HOST ?? "127.0.0.1";
    this.port = options?.port ?? Number(process.env.CLAMAV_PORT ?? 3310);
    this.timeoutMs = options?.timeoutMs ?? 60_000;
  }

  async scan(filePath: string): Promise<ScanResult> {
    const response = await new Promise<string>((resolve, reject) => {
      const socket: Socket = createConnection({ host: this.host, port: this.port });
      const chunks: Buffer[] = [];
      const fail = (err: Error) => {
        socket.destroy();
        reject(err);
      };
      socket.setTimeout(this.timeoutMs, () => fail(new Error("clamd timeout")));
      socket.once("error", fail);
      socket.on("data", (chunk) =>
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
      );
      socket.once("close", () => resolve(Buffer.concat(chunks).toString("utf8")));

      socket.once("connect", () => {
        socket.write("zINSTREAM\0");
        const file = createReadStream(filePath, { highWaterMark: 64 * 1024 });
        file.once("error", fail);
        file.on("data", (data: string | Buffer) => {
          const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
          const size = Buffer.alloc(4);
          size.writeUInt32BE(buffer.length);
          socket.write(size);
          socket.write(buffer);
        });
        file.once("end", () => {
          socket.write(Buffer.alloc(4)); // zero-length chunk = end of stream
        });
      });
    });

    const text = response.replaceAll("\0", "").trim();
    if (text.endsWith("OK")) return { clean: true, detail: text };
    if (text.endsWith("FOUND")) return { clean: false, detail: text };
    // ERROR or unexpected reply — fail closed.
    throw new Error(`clamd unexpected reply: ${text || "(empty)"}`);
  }
}

/** SCAN_PROVIDER=off|clamav; unknown values fall back to off (logged). */
export function resolveScanner(): MalwareScanner {
  const requested = (process.env.SCAN_PROVIDER ?? "").trim();
  if (requested === "clamav") return new ClamdScanner();
  if (requested && requested !== "off") {
    console.warn(`SCAN_PROVIDER="${requested}" is not a registered scanner — scanning disabled`);
  } else {
    console.warn("malware scanning disabled (SCAN_PROVIDER=off) — uploads are NOT scanned");
  }
  return new AlwaysPassScanner();
}
