# cohenholmes.co.uk

Personal site for Kaine Cohen — security / identity consultant moving into AI engineering.
[Astro](https://astro.build), hosted on **Cloudflare Pages**.

Live: <https://cohenholmes.co.uk>

## Repo layout

```
src/
  layouts/BaseLayout.astro   shared nav/footer + the C&H brand tokens
  pages/
    index.astro              homepage
    404.astro                custom not-found page
    blog/
      index.astro            blog listing
      [slug].astro           individual post
  content/
    blog/                    post source (markdown, one file per post)
  content.config.ts          blog collection schema
public/                      passthrough — copied into dist/ byte-for-byte, unprocessed
  ca-builder.html            interactive Conditional Access Policy Builder (self-contained)
  ai-governance-check.html   AI governance readiness check (self-contained)
  mail-auth.html             SPF/DKIM/DMARC builder (self-contained)
  blog/diagrams/             diagram images referenced by blog posts
  sitemap.xml, robots.txt
astro.config.mjs             Astro config — also owns the /writing → /blog redirect
wrangler.toml                Pages project config (pages_build_output_dir = "dist")

# not deployed — kept at repo root:
ca-baseline-model-DRAFT.md      source copy of the CA baseline model (also on the CA Builder page)
ca-docs-alignment-audit.md      notes from aligning the CA content with Microsoft's docs
blog/                           original post drafts + diagram sources (now published natively — see below)
docs/                           delivery-log.md — how work runs + what's in flight
backup-*/                       previous homepage versions
```

The three tool pages (`ca-builder.html`, `ai-governance-check.html`, `mail-auth.html`) are
frozen, self-contained HTML files carrying a hash-locked CSP — they live in `public/`
untouched by the Astro build and must never be reformatted, or their inline `<script>`'s
CSP hash breaks.

Blog posts used to sync from Medium via a Pages Function; that dependency has been dropped.
The blog is now native: content lives in `src/content/blog/` and renders at `/blog`.
`/writing` still exists as a redirect page to `/blog` for old links.

## Local preview

```bash
npm install
npm run dev       # dev server at localhost:4321
```

or, to preview the exact production build (needed to see the 3 tool pages and `functions/`-style
routing behave as Cloudflare Pages would):

```bash
npm run build
npm run preview
```

## Deploy

Automatic: `.github/workflows/deploy.yml` runs `npm ci && npm run build` then
`wrangler pages deploy` on every push to `main` (i.e. every merged PR). Needs two repo
secrets — `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` — set once under Settings →
Secrets and variables → Actions.

`.github/workflows/preview.yml` builds and deploys a per-branch preview for every PR opened
from this repo (not forks) and comments the `*.cohenholmes-site.pages.dev` URL on the PR.

Manual deploy still works if needed, from the repo root:

```bash
npm run build
npx wrangler pages deploy
```

Uses the `cohenholmes-site` Pages project (output dir `dist`).

## Design system

Two systems currently coexist on the live site, deliberately — a visible artefact of an
in-progress rebrand, not a bug:

- **The 3 tool pages** (`ca-builder`, `ai-governance-check`, `mail-auth`) keep the original
  paper-and-ink system — Fraunces (display) / IBM Plex Mono / Inter (body), `--ink:#14171C`,
  `--paper:#F3F1EC`, `--line:#D8D4C8`, `--muted:#6B6A63`, accent `--signal:#3B5BFF`. They're
  frozen and won't be re-skinned incidentally.
- **Everything else** (homepage, 404, blog) uses the new C&H brand via
  `src/layouts/BaseLayout.astro` — Cormorant Garamond (display) / DM Sans (body), navy
  `--navy:#0F1E33` / `--navy-deep:#1A1A2E`, burnt orange `--accent:#C8622A`, cream
  `--cream:#F7F4EF`.

## Infrastructure notes

- **DNS:** Cloudflare (zone `cohenholmes.co.uk`). Apex is a proxied CNAME to
  `cohenholmes-site.pages.dev`; `www` redirects to the apex via a Redirect Rule.
- **TLS:** Full (Strict), Always Use HTTPS on, minimum TLS 1.2.
- **Mail:** Microsoft 365. SPF (`-all`) + DKIM (`selector1`/`selector2`) + DMARC
  (`p=none`, monitoring — tighten to `quarantine`/`reject` once aggregate reports are clean).
- **`.html` → extensionless** is automatic on Pages; internal links use `/blog`,
  `/ca-builder`.

## The CA Builder

`public/ca-builder.html` is a single self-contained file (HTML + CSS + vanilla JS, no
dependencies). It turns form input into Microsoft Graph `conditionalAccessPolicy` JSON
plus a plain-English summary and the Entra ID licence tier the policy needs, with
Microsoft baseline presets and a layered "baseline model" section. It's a learning /
demo tool — output is not validated against a tenant.
