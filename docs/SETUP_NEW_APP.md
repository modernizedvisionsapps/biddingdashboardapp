# Setup New App

1. Clone or create a new repo from this template.
2. Create the Cloudflare Workers deployment target for the app.
3. Create the D1 database.
4. Apply migrations.
5. Confirm `wrangler.toml` includes `keep_vars = true` before deploying.
6. Add the D1 binding named `DB`.
7. Add variables and secrets manually in the Cloudflare dashboard.
7. Create the Stripe product and price.
8. Add `STRIPE_PRICE_ID`.
9. Add the Stripe webhook endpoint: `/api/stripe/webhook`.
10. Add the Resend API key.
11. Deploy.
12. Confirm the dashboard variables and secrets are still present after deploy.
13. Test:
   - landing page loads
   - Start Checkout opens Stripe Checkout
   - webhook creates setup email/token
   - setup account works
   - login works
   - user management works
   - billing portal works

Additional notes:

- `wrangler.toml` should keep `keep_vars = true` so deploys do not wipe dashboard-managed text variables.
- The D1 binding name must remain exactly `DB`.
- Add `STRIPE_SECRET_KEY` manually in the Cloudflare dashboard.
- Stripe Billing Portal should be configured in the Stripe dashboard if your account requires setup.
- The billing portal route is `/api/billing/create-portal-session`.
- Organizations need `stripe_customer_id` from the checkout flow before portal access can work.
- `APP_BASE_URL` is used for the Stripe Billing Portal return URL.
