# Full Flow Test Checklist

## A. Local Build Checks

- `npm install`
- `npm run build`
- `npm run cf:build`

## B. Cloudflare Setup Checks

- D1 database created
- migrations applied
- `DB` binding added
- env vars added
- secrets added
- Stripe webhook endpoint added
- Resend key added

## C. Checkout / Setup Flow

- landing page loads
- Sign In goes to `/login`
- Start Checkout opens Stripe Checkout
- `checkout.session.completed` webhook received
- user created
- organization created
- owner membership created
- account setup token created
- setup email sent/logged
- setup account form works
- user redirected to `/app`

## D. Auth Flow

- login works
- `/api/auth/me` returns safe data
- logout works
- protected `/app` blocks unauthenticated users

## E. Password Reset

- forgot password returns generic success
- reset email sent/logged
- reset token works
- old sessions revoked
- login works with new password

## F. User Management

- owner can invite user
- pending invite appears
- invite email sent/logged
- invited user accepts invite
- active user appears
- owner can promote/demote
- owner cannot remove/demote last owner
- owner can remove user
- inactive user appears
- owner can reactivate inactive user

## G. Billing / Read-Only

- billing page shows subscription status
- owner can open billing portal
- member cannot manage billing
- non-current subscription shows read-only banner
- future write APIs call `requireWritableSubscription`

## H. Clone-To-New-App Checklist

- clone repo
- rename app/package/env values
- create new D1 database
- apply base migrations
- add app-specific migrations
- build app-specific front end
- wire app-specific CTA to Start Checkout logic
- add app-specific routes and tables under `/app`
