function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function linkButton(label: string, href: string): string {
  return `<p style="margin:24px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:10px 16px;border:1px solid #000;color:#000;text-decoration:none;">${escapeHtml(label)}</a></p>`;
}

export function baseEmailLayout(options: { title: string; bodyHtml: string }): string {
  return `
    <div style="background:#ffffff;color:#000000;font-family:Calibri,Arial,Helvetica,sans-serif;padding:24px;">
      <div style="max-width:640px;margin:0 auto;">
        <h1 style="font-size:20px;font-weight:600;margin:0 0 16px;">${escapeHtml(options.title)}</h1>
        <div style="font-size:16px;line-height:1.5;">${options.bodyHtml}</div>
        <hr style="margin:24px 0;border:none;border-top:1px solid #d4d4d4;" />
        <p style="font-size:13px;line-height:1.5;margin:0;">
          Modernized Visions<br />
          You received this email because this address was used for a Modernized Visions app account.
        </p>
      </div>
    </div>
  `;
}

export function buildPlainTextFromHtml(html: string): string {
  return stripHtml(html);
}
