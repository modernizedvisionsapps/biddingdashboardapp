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
  return `<p style="margin:28px 0;text-align:center;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 24px;border-radius:14px;background:#d98b2b;color:#0f1c2f;text-decoration:none;font-weight:700;font-size:15px;line-height:1.2;">${escapeHtml(label)}</a></p>`;
}

export function baseEmailLayout(options: { title: string; bodyHtml: string }): string {
  return `
    <div style="background:#f6f7f3;color:#142033;font-family:Inter,Arial,Helvetica,sans-serif;padding:32px 16px;">
      <div style="max-width:640px;margin:0 auto;">
        <div style="background:#ffffff;border:1px solid #d6dbe4;border-radius:24px;padding:40px 32px;box-shadow:0 16px 38px rgba(15,28,47,0.08);">
          <p style="margin:0 0 12px;text-align:center;font-family:Chivo,Inter,Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;line-height:1.2;color:#0f1c2f;">
            BidBoard
          </p>
          <h1 style="font-family:Chivo,Inter,Arial,Helvetica,sans-serif;font-size:30px;font-weight:700;line-height:1.2;margin:0 0 20px;text-align:center;color:#0f1c2f;">${escapeHtml(options.title)}</h1>
          <div style="font-size:16px;line-height:1.7;color:#5f6b7d;">${options.bodyHtml}</div>
          <hr style="margin:32px 0;border:none;border-top:1px solid #d6dbe4;" />
          <p style="font-size:13px;line-height:1.7;margin:0;text-align:center;color:#5f6b7d;">
            BidBoard by Modernized Visions<br />
            You received this email because this address was used for a BidBoard account.
          </p>
        </div>
        <p style="margin:16px 0 0;text-align:center;font-size:12px;line-height:1.6;color:#6c7686;">
          Modernized Visions
        </p>
      </div>
    </div>
  `;
}

export function buildPlainTextFromHtml(html: string): string {
  return stripHtml(html);
}
