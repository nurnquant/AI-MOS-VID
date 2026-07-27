/**
 * Email boundary (ADR-AIVS-003 §1, real sending per ADR-AIVS-011 §C).
 * EMAIL_PROVIDER=console|resend — console default (logs to the server
 * console, unchanged local behavior); `resend` sends via the Resend
 * REST API and fails loud at resolution when the key is missing.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailSender {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

export class ConsoleEmailSender implements EmailSender {
  readonly name = "console-local";
  async send(message: EmailMessage): Promise<void> {
    console.log(`\n[aivs-auth email → ${message.to}] ${message.subject}\n${message.text}\n`);
  }
}

type FetchLike = typeof fetch;

/** Resend REST adapter — one fetch, no SDK dependency. */
export class ResendEmailSender implements EmailSender {
  readonly name = "resend";

  private readonly apiKey: string;
  private readonly from: string;
  private readonly fetchImpl: FetchLike;

  constructor(options?: { apiKey?: string; from?: string; fetchImpl?: FetchLike }) {
    const apiKey = options?.apiKey ?? process.env.RESEND_API_KEY;
    const from = options?.from ?? process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) {
      throw new Error(
        "EMAIL_PROVIDER=resend but RESEND_API_KEY / RESEND_FROM_EMAIL are not both set — " +
          "add them to the environment or set EMAIL_PROVIDER=console",
      );
    }
    this.apiKey = apiKey;
    this.from = from;
    this.fetchImpl = options?.fetchImpl ?? fetch;
  }

  async send(message: EmailMessage): Promise<void> {
    const response = await this.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      throw new Error(`resend send failed (${response.status}): ${detail}`);
    }
  }
}

/** EMAIL_PROVIDER=console|resend; unset/unknown falls back to console. */
export function resolveEmailSender(): EmailSender {
  const requested = (process.env.EMAIL_PROVIDER ?? "").trim();
  if (requested === "resend") return new ResendEmailSender();
  if (requested && requested !== "console") {
    console.warn(`EMAIL_PROVIDER="${requested}" is not a registered sender — using console`);
  }
  return new ConsoleEmailSender();
}
