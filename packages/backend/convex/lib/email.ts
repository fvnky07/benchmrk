/**
 * Sends a transactional email through Resend's HTTP API. The SDK has Node.js
 * dependencies the Convex runtime can't load, so this uses fetch directly.
 * Failures are logged without the recipient or body.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not configured');
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'benchmrk <noreply@benchmrk.app>',
        to: [to],
        subject,
        html,
      }),
    });
    // Drain the body to release the connection.
    await response.text();
    if (!response.ok) {
      console.error('Resend request failed:', response.status);
    }
  } catch {
    console.error('Transactional email could not be sent');
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** A single-action email: heading, short explanation, one button, a footnote. */
export function actionEmail({
  title,
  heading,
  body,
  actionLabel,
  url,
  footnote,
}: {
  title: string;
  heading: string;
  body: string;
  actionLabel: string;
  url: string;
  footnote: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #171717; color: #ffffff;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 48px 20px;">
        <table role="presentation" style="max-width: 520px; width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding-bottom: 40px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">benchmrk</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f1f1f; border-radius: 16px; padding: 40px 32px;">
              <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 600; color: #ffffff; text-align: center;">${escapeHtml(heading)}</h2>
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #a1a1a1; text-align: center;">${escapeHtml(body)}</p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 4px 0 28px 0;">
                    <a href="${escapeHtml(url)}" style="display: inline-block; padding: 14px 36px; background-color: #3dcde6; color: #171717; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px;">${escapeHtml(actionLabel)}</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 12px; color: #525252; text-align: center;">${escapeHtml(footnote)}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="margin: 0; font-size: 12px; color: #525252;">&copy; ${new Date().getFullYear()} benchmrk · free and open source</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
