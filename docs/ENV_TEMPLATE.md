# Environment Template

This list is for manual entry into the Cloudflare dashboard and for local non-committed helper files.

Expected template variables:

- `PUBLIC_APP_NAME`
- `PUBLIC_COMPANY_NAME`
- `PUBLIC_SUPPORT_EMAIL`
- `APP_BASE_URL`
- `SESSION_COOKIE_NAME`
- `SESSION_TTL_DAYS`
- `PASSWORD_RESET_TOKEN_TTL_MINUTES`
- `INVITE_TOKEN_TTL_DAYS`
- `ACCOUNT_SETUP_TOKEN_TTL_DAYS`
- `STRIPE_PRICE_ID`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `APP_SECRET`

Notes:

- `APP_BASE_URL` is used for checkout success links, invite/setup/reset links, and the billing portal return URL.
- `STRIPE_SECRET_KEY="."` means Stripe is not configured yet.
- Do not paste real secrets into committed files.
- `.env` and `.dev.vars` files are local helpers only and should not be committed with real values.
- Runtime variables and secrets should be entered manually in the Cloudflare dashboard.
- `wrangler.toml` should not contain real production secrets.
- `wrangler.toml` should not contain real production variable values for this template workflow.
