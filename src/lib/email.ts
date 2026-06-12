import { Resend } from "resend"

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

export interface AlertEmailOptions {
  to: string
  productName: string
  message: string
  srp: string
  amp: string
  markup: string
}

function buildHtml(opts: AlertEmailOptions): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9faf8;margin:0;padding:0;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#00343A;padding:28px 32px;">
      <p style="color:#ffffff;font-weight:700;font-size:18px;margin:0;">Markaver</p>
      <p style="color:#33A579;font-size:12px;margin:4px 0 0;">Pricing Intelligence</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#6b7280;font-size:13px;margin:0 0 4px;">Price alert for</p>
      <h2 style="color:#00343A;font-size:22px;font-weight:700;margin:0 0 24px;">${opts.productName}</h2>
      <div style="background:#f9faf8;border-radius:8px;padding:16px 20px;margin-bottom:24px;border-left:4px solid #33A579;">
        <p style="color:#374151;font-size:14px;margin:0;line-height:1.5;">${opts.message}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Recommended SRP</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:700;color:#047857;font-size:16px;">${opts.srp}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">AMP (trimmed)</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;font-size:15px;">${opts.amp}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#6b7280;font-size:13px;">Markup ratio</td>
          <td style="padding:10px 0;text-align:right;font-weight:600;color:#111827;font-size:15px;">${opts.markup}×</td>
        </tr>
      </table>
    </div>
    <div style="background:#f9faf8;padding:14px 32px;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">Markaver · ${new Date().toUTCString()}</p>
    </div>
  </div>
</body>
</html>`
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email] No RESEND_API_KEY — password reset link: ${resetUrl}`)
    return
  }
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9faf8;margin:0;padding:0;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#00343A;padding:28px 32px;">
      <p style="color:#ffffff;font-weight:700;font-size:18px;margin:0;">Markaver</p>
      <p style="color:#33A579;font-size:12px;margin:4px 0 0;">Pricing Intelligence</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#00343A;font-size:20px;font-weight:700;margin:0 0 12px;">Reset your password</h2>
      <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px;">Click the button below to set a new password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#00343A;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Reset password</a>
      <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;">If you did not request a password reset, you can ignore this email.</p>
    </div>
  </div>
</body>
</html>`
  await getResend().emails.send({
    from: `Markaver <${process.env.RESEND_FROM ?? "noreply@markaver.com"}>`,
    to,
    subject: "Reset your Markaver password",
    html,
  })
}

export async function sendInviteEmail(to: string, inviteeName: string, orgName: string, setPasswordUrl: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email] No RESEND_API_KEY — invite link for ${to}: ${setPasswordUrl}`)
    return
  }
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9faf8;margin:0;padding:0;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#00343A;padding:28px 32px;">
      <p style="color:#ffffff;font-weight:700;font-size:18px;margin:0;">Markaver</p>
      <p style="color:#33A579;font-size:12px;margin:4px 0 0;">Pricing Intelligence</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#00343A;font-size:20px;font-weight:700;margin:0 0 12px;">You've been invited to ${orgName}</h2>
      <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Hi${inviteeName ? ` ${inviteeName}` : ""},<br/><br/>
        You've been added to <strong>${orgName}</strong> on Markaver. Click the button below to set your password and get started.
      </p>
      <a href="${setPasswordUrl}" style="display:inline-block;background:#00343A;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Set my password</a>
      <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;">This link expires in 24 hours. If you were not expecting this invitation, you can ignore this email.</p>
    </div>
  </div>
</body>
</html>`
  await getResend().emails.send({
    from: `Markaver <${process.env.RESEND_FROM ?? "noreply@markaver.com"}>`,
    to,
    subject: `You've been invited to ${orgName} on Markaver`,
    html,
  })
}

export async function sendAlertEmail(opts: AlertEmailOptions): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email] No RESEND_API_KEY — skipping email to ${opts.to}: ${opts.message}`)
    return
  }
  await getResend().emails.send({
    from: `Markaver <${process.env.RESEND_FROM ?? "noreply@markaver.com"}>`,
    to: opts.to,
    subject: `Price Alert: ${opts.productName}`,
    html: buildHtml(opts),
  })
}
