type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function fromEmail(): string {
  return process.env.CRON_ALERT_FROM_EMAIL?.trim()
    || process.env.RESEND_FROM_EMAIL?.trim()
    || "Planet Sport Studio <alerts@planetsport.studio>";
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
  const to = input.to.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new Error("Notification email is invalid.");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail(),
      to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Email notification failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }
}
