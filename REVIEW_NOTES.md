# Review changes

This branch contains proposed improvements from the September 2026 site review.

## Implemented

- Hardened the Medium writing feed rendering so external feed content is treated as data rather than trusted HTML.
- Added canonical, Open Graph and basic structured-data metadata to the homepage.
- Added canonical and social metadata to the Writing page.
- Added `robots.txt` and `sitemap.xml`.

## Deliberately not changed in this PR

### Conditional Access: `approvedApplication`

The builder currently exposes the legacy `approvedApplication` grant. Microsoft stopped allowing creation/editing of the **Require approved client app** control on 30 June 2026; new policies should use **Require app protection policy** instead.

I have left the CA Builder untouched in this branch because it is a large single-file application and the behavioural change deserves its own focused review rather than being bundled into an SEO/security-hardening PR.

Suggested follow-up:
- remove `approvedApplication` from new-policy options and presets;
- retain a small legacy note so consultants understand what they may still see in existing tenants;
- validate the resulting Graph payloads against current Microsoft documentation.

## Other follow-up ideas

- Server-render or pre-generate the Writing article list so crawlers receive article titles/excerpts in the initial HTML.
- Move historical drafts/backups under an `archive/` or `docs/` directory if the repository grows.
- Consider extracting shared CSS only once more pages are added; the current static architecture should remain deliberately lightweight.

The intent of this branch is to improve hardening and discoverability without changing the current visual design or voice.