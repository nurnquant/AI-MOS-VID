/** Ephemeral self-signed TLS pair for local https test servers. */
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function selfSignedPair(): Promise<{ key: Buffer; cert: Buffer }> {
  const dir = await mkdtemp(join(tmpdir(), "aivs-tls-"));
  try {
    const keyPath = join(dir, "key.pem");
    const certPath = join(dir, "cert.pem");
    await execFileAsync("openssl", [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      keyPath,
      "-out",
      certPath,
      "-days",
      "1",
      "-subj",
      "/CN=127.0.0.1",
    ]);
    return { key: await readFile(keyPath), cert: await readFile(certPath) };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
