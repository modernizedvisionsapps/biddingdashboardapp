# Database Schema

- The database is multi-tenant by `organization_id`.
- Create one database per SaaS app, not one database per customer.
- Do not create one table per company.
- Users are attached to organizations through `organization_memberships`.
- Membership removal is soft-delete behavior: membership status changes to `removed`.
- Inactive users are users whose membership for the current organization is removed.
- Users are not hard-deleted, so historical records can continue to resolve names.
- Invite, setup, session, and password reset flows store token hashes only, never raw tokens.
- Stripe subscription state lives on `organizations`.
- Future app-specific tables should include `organization_id` and, where appropriate, `created_by_user_id`, `updated_by_user_id`, `created_at`, and `updated_at`.
- D1 migrations are applied with Wrangler.
- Runtime variables, secrets, and bindings remain manually managed in the Cloudflare dashboard whenever possible.
- User password rows store the PBKDF2 algorithm metadata and iteration count, but this template only creates new hashes with `PBKDF2-SHA256` at `100000` iterations because Cloudflare Workers currently caps PBKDF2 at `100000`.
