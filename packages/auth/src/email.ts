/**
 * Email boundary (ADR-AIVS-003 §1): local development logs links to the
 * server console; the Resend adapter is a stub until the user enables a
 * production email decision. No external calls in this module.
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

/** Placeholder — wiring Resend requires explicit user approval (paid/external). */
export class ResendEmailSenderStub implements EmailSender {
  readonly name = "resend-stub";
  async send(): Promise<void> {
    throw new Error("Resend email sending is not enabled in this module");
  }
}
