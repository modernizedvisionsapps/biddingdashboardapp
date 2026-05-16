# Architecture

This repository is a reusable Modernized Visions SaaS application template.

- Next.js App Router handles public pages, auth pages, protected app pages, and route handlers.
- The D1 binding name is `DB`.
- Users connect to organizations through `organization_memberships`.
- Memberships are soft-removed by setting `status = removed`; users are not hard-deleted.
- Owners manage company settings, invites, role changes, removals, and reactivation.
- Owners also manage billing through Stripe Billing Portal.
- Members cannot manage users.
- Members cannot manage billing.
- Active, pending invite, and inactive user states are surfaced in the settings UI.
- The last active owner cannot be removed or demoted.
- Invite links store only token hashes in `organization_invites`.
- Stripe Billing Portal is used for payment method updates, cancellation, and invoice management. No custom card forms are built in the template.
- Non-current subscription states put the app into read-only mode. Users can still sign in and view data, but future write APIs should call `requireWritableSubscription()` and read APIs should call `requireAuth()`.
- Deployment uses Next.js App Router with the OpenNext Cloudflare adapter on the Cloudflare Workers runtime.
- The app uses the `DB` D1 binding, manual dashboard-managed secrets and bindings, and Wrangler for D1 migrations plus OpenNext/Wrangler build-deploy tooling.
- Cloudflare dashboard remains the source of truth for runtime variables, secrets, and bindings.
- Password hashing uses `PBKDF2-SHA256` with `100000` iterations because Cloudflare Workers currently caps PBKDF2 iteration counts at `100000`.
