# Local Development

- Run `npm install`.
- Run `npm run dev` for normal Next.js local development.
- Use `.env.local` for local Next.js env vars.
- Use `.dev.vars` only for Cloudflare/OpenNext local preview settings such as `NEXTJS_ENV=development`.
- Local email sending requires `RESEND_API_KEY`.
- If `RESEND_API_KEY` is missing or `.`, invite emails fail gracefully and the invite row still persists.
- Invite acceptance can be tested through local email delivery or the non-production `devOnlyInviteUrl` response field.
- Billing portal testing requires a real Stripe test secret and an organization row with a `stripe_customer_id`.
- Local D1 testing can use Wrangler-managed local resources or remote bindings later if explicitly configured.
- Stripe CLI webhook testing should be added during end-to-end local billing verification.
- `npm run build` validates the plain Next.js build.
- `npm run cf:preview` runs the OpenNext Cloudflare preview flow once bindings/config are available.
- Runtime secrets and the `DB` D1 binding are managed manually in the Cloudflare dashboard for deployed environments.
- Password hashing is fixed at `PBKDF2-SHA256` with `100000` iterations for Cloudflare Workers compatibility because Workers currently reject PBKDF2 iteration counts above `100000`.
