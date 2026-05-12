import { NextResponse } from "next/server";
import { createPasswordResetForUser, passwordResetUrl } from "@/app/lib/auth/invites";
import { normaliseEmail } from "@/app/lib/auth/passwords";
import { readAuthData, writeAuthData } from "@/app/lib/auth/store";
import { sendEmail } from "@/app/lib/email/send-email";

type Body = { email?: string };

/** Same JSON when the account is missing or cannot use self-service reset (no password yet). */
const okBody = { ok: true as const };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  const email = normaliseEmail(body.email ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "Password reset email is not configured (missing RESEND_API_KEY). Ask an administrator to set outbound email or reset your password from the admin console.",
      },
      { status: 503 },
    );
  }

  const data = await readAuthData();
  const user = Object.values(data.users).find((row) => row.email === email && row.active);
  const canReset = Boolean(user?.passwordHash && user?.passwordSalt);

  if (!canReset || !user) {
    return NextResponse.json(okBody);
  }

  const { user: updated, rawToken } = createPasswordResetForUser(user);
  const url = passwordResetUrl(rawToken);
  try {
    await sendEmail({
      to: user.email,
      subject: "Reset your Planet Sport Studio password",
      text: [
        "We received a request to reset the password for your Planet Sport Studio account.",
        "",
        "Open this link (valid for 2 hours):",
        url,
        "",
        "If you did not ask for this, you can ignore this email.",
      ].join("\n"),
      html: `<p>We received a request to reset the password for your Planet Sport Studio account.</p><p><a href="${url.replace(/"/g, "&quot;")}">Set a new password</a> (link valid for 2 hours).</p><p>If you did not ask for this, you can ignore this email.</p>`,
    });
  } catch (e) {
    console.error("[forgot-password] sendEmail failed:", e);
    return NextResponse.json({ error: "Could not send reset email. Try again later or contact support." }, { status: 502 });
  }

  data.users[user.id] = updated;
  await writeAuthData(data);

  return NextResponse.json(okBody);
}
