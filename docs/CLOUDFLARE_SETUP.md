# Cloudflare Setup

## Deployment Model

- This SaaS template deploys as a Next.js app on Cloudflare Workers using OpenNext.
- OpenNext transforms the Next.js build output into the Worker bundle consumed by Wrangler and Cloudflare Workers.

## Config Philosophy

- Wrangler and OpenNext are used for build, deploy, preview, type generation, and D1 migrations.
- Production variables, secrets, and bindings should be managed manually in the Cloudflare dashboard whenever possible.
- Do not commit real secrets.
- Do not rely on repo-stored secrets for production.

## Dashboard Variables And Wrangler

- Wrangler 4.x treats `wrangler.toml` as the source of truth for text variables unless told otherwise.
- If dashboard-managed variables are changed in Cloudflare and Wrangler is allowed to deploy without protection, those dashboard values can be overwritten or deleted on the next deploy.
- This template sets `keep_vars = true` in `wrangler.toml` so dashboard-managed text variables are preserved during deploys.
- `npm run cf:deploy` also passes `--keep-vars` as a CLI safeguard.
- Production text variables should still be entered manually in the Cloudflare dashboard.
- Production secrets should still be entered manually in the Cloudflare dashboard.
- Do not blindly accept Cloudflare prompts to sync real variables or secrets into `wrangler.toml`.
- If Cloudflare shows “Update your wrangler config file with these changes to keep your local development environment in sync,” do not copy real secrets into the repo.
- The D1 binding name must remain exactly `DB`.

## Required Cloudflare Binding

- D1 binding name: `DB`
- Create a separate D1 database per app using this template.
- Preferred workflow: add the `DB` binding manually in the Cloudflare dashboard for the deployed Worker.
- `wrangler.toml` intentionally does not hardcode a production D1 database ID.

## Required Cloudflare Variables

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

## Required Cloudflare Secrets

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `APP_SECRET`

## D1 Setup

```bash
npx wrangler d1 create <app-db-name>
npx wrangler d1 migrations apply <app-db-name> --remote
```

## Deploy Commands

```bash
npm run cf:build
npm run cf:preview
npm run cf:deploy
```

## Warning

- Do not add production secrets to `wrangler.toml`.
- Do not add production text variables to `wrangler.toml`.
- Be careful adding runtime bindings to `wrangler.toml`; repo-managed bindings can override dashboard-managed settings depending on deployment method.
- Keep `keep_vars = true` in `wrangler.toml` so dashboard-managed variables are preserved during deployment.
- `npm run cf:deploy` uses `--keep-vars`, but that CLI flag is not a substitute for keeping the config aligned with the dashboard-managed workflow.
