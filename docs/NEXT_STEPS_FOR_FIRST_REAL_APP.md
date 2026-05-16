# Next Steps For First Real App

- This repository is now the reusable base SaaS template.
- Do not build app-specific features directly into the template unless they are reusable infrastructure.
- For the first real app, clone this repo and rename app/package/env values as needed.
- Add app-specific database migrations after the base migrations.
- App-specific read endpoints should use `requireAuth`.
- App-specific write endpoints should use `requireWritableSubscription`.
- App-specific reminder emails and automations should be built inside the real app, not the base template.
- The public landing page is intentionally blank so a real marketing frontend can be designed or imported per app.
- Any real landing page CTA should call the checkout session route.
