# cohenholmes.co.uk

The CohenHolmes site — Kaine Cohen's Microsoft 365 consultancy, covering security,
identity and the move into AI engineering. Blog posts are bylined "Blog by Kaine Cohen";
the site itself is branded CohenHolmes throughout (nav, footer, page titles, structured
data). [Astro](https://astro.build), hosted on **Cloudflare Pages**.

Live: <https://cohenholmes.co.uk>

## Repo layout

```
src/
  layouts/BaseLayout.astro   shared nav/footer + the C&H brand tokens
  pages/
    index.astro              homepage
    404.astro                custom not-found page
    ca-builder.astro         interactive Conditional Access Policy Builder
    ai-governance-check.astro  AI governance readiness check
    mail-auth.astro          SPF/DKIM/DMARC builder
    blog/
      index.astro            blog listing
      [slug].astro           individual post
  content/
    blog/                    post source (markdown, one file per post)
  content.config.ts          blog collection schema
public/                      passthrough — copied into dist/ byte-for-byte, unprocessed
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

The three tool pages (`ca-builder`, `ai-governance-check`, `mail-auth`) are ordinary Astro
pages using `BaseLayout`, same as the rest of the site — but each carries a hash-locked
CSP (`script-src 'sha256-...'`) tied to its own inline `<script is:inline>` block. That
script's exact text must never change (not even whitespace) without recomputing and
updating the matching hash in the page's own CSP `<meta>` tag, or the policy breaks.
`node tests/validate-site.mjs` checks this self-consistency on every build.

Blog posts used to sync from Medium via a Pages Function; that dependency has been dropped.
The blog is now native: content lives in `src/content/blog/` and renders at `/blog`.
`/writing` still exists as a redirect page to `/blog` for old links.

## Local preview

```bash
npm install
npm run dev       # dev server at localhost:4321
```

or, to preview the exact production build (needed to see the 3 tool pages served exactly as
Cloudflare Pages would):

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

One system across the whole site, via `src/layouts/BaseLayout.astro` — Cormorant Garamond
(display) / DM Sans (body) / DM Mono (code, tool labels), navy `--navy:#0F1E33` /
`--navy-deep:#1A1A2E`, burnt orange `--accent:#C8622A` (`--accent-text:#A8501C` for
body-sized text/links, `--accent-on-dark:#D97A42` for small text on the dark header/
footer — plain `--accent` fails AA contrast in both of those contexts), cream
`--cream:#F7F4EF`. The header/footer chrome is always the standard measure; a page can
opt into a wider content column (`<BaseLayout wide>`) for data-dense layouts like the 3
tool pages' builders and grids, without widening the nav/footer bar itself.

## Infrastructure notes

- **DNS:** Cloudflare (zone `cohenholmes.co.uk`). Apex is a proxied CNAME to
  `cohenholmes-site.pages.dev`; `www` redirects to the apex via a Redirect Rule.
- **TLS:** Full (Strict), Always Use HTTPS on, minimum TLS 1.2.
- **Mail:** Microsoft 365. SPF (`-all`) + DKIM (`selector1`/`selector2`) + DMARC
  (`p=none`, monitoring — tighten to `quarantine`/`reject` once aggregate reports are clean).
- **`.html` → extensionless** is automatic on Pages; internal links use `/blog`,
  `/ca-builder`.

## The CA Builder

`src/pages/ca-builder.astro` is a self-contained Conditional Access builder (vanilla JS,
no dependencies, hash-locked CSP — see above). It turns form input into Microsoft Graph
`conditionalAccessPolicy` JSON
plus a plain-English summary and the Entra ID licence tier the policy needs, with
Microsoft baseline presets and a layered "baseline model" section. It's a learning /
demo tool — output is not validated against a tenant.
