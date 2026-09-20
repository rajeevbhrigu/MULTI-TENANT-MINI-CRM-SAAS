import "server-only";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

/** Dev-friendly default: logs the email instead of sending it. Never used in production. */
class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(
      `\n--- [email:console] to=${message.to} subject="${message.subject}" ---\n${message.text ?? message.html}\n---\n`,
    );
  }
}

// Placeholders - implement against the real provider SDK when credentials
// are available. Never claim delivery without a configured provider.
class ResendEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    if (!process.env.EMAIL_API_KEY) {
      throw new Error("EMAIL_API_KEY is not configured for the resend email provider.");
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "MiniCRM <no-reply@minicrm.example>",
        to: message.to,
        subject: message.subject,
        html: message.html,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend email send failed: ${res.status} ${await res.text()}`);
    }
  }
}

let provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (provider) return provider;
  const kind = process.env.EMAIL_PROVIDER ?? "console";
  provider = kind === "resend" ? new ResendEmailProvider() : new ConsoleEmailProvider();
  return provider;
}
