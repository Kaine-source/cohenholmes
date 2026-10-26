# Personal-site review follow-ups

CohenHolmes is a **personal website**, not a consultancy landing page. Keep the first-person voice, writing, experiments and privacy-conscious tools central.

## Follow-up checks (not implemented in this PR)

- [ ] Verify the previously reported `/mail-auth` 404 against the current production deployment. The current Astro `src/pages` directory has no `mail-auth.astro`; do not add a homepage link until a working route exists.
- [ ] Audit blog discovery: compare published content entries with the blog index and sitemap. Confirm every non-draft post is accessible and linked.
- [ ] Test navigation and interactive cards on keyboard, mobile and screen readers; check focus order, accessible names and colour contrast.
- [ ] Run the repository build and tests, and check CSP headers on the deployed preview.
- [x] Change homepage structured data from `Organization` to `WebSite` with a `Person` author; validate rendered JSON-LD in the preview.

## Intent

The homepage edits clarify who writes the site, keep the existing tools and blog prominent, and add an invitation to get in touch. No new data collection, tracking or external scripts are introduced.
