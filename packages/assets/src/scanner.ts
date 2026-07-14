/**
 * Malware scanning boundary (security baseline §5). Local implementation
 * always passes; the interface is the seam for a ClamAV adapter, which must
 * ship before external uploads are accepted.
 */
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
    return { clean: true, detail: "local dev scanner — no scanning performed" };
  }
}
