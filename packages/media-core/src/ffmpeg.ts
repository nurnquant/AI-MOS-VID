import { spawn } from "node:child_process";

export interface FfmpegRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/** Thin, safe wrapper around ffmpeg/ffprobe process execution. */
export async function runProcess(
  binary: "ffmpeg" | "ffprobe",
  args: string[],
  timeoutMs = 60_000,
): Promise<FfmpegRunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${binary} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to start ${binary}: ${err.message}. Is it installed?`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? -1, stdout, stderr });
    });
  });
}

export async function runFfmpeg(args: string[], timeoutMs?: number): Promise<FfmpegRunResult> {
  const result = await runProcess(
    "ffmpeg",
    ["-hide_banner", "-loglevel", "error", ...args],
    timeoutMs,
  );
  if (result.exitCode !== 0) {
    throw new Error(`ffmpeg failed (exit ${result.exitCode}): ${result.stderr.slice(0, 2000)}`);
  }
  return result;
}
