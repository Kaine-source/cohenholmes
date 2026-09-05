# cohenholmes.co.uk

Personal site for Kaine Cohen — security / identity consultant moving into AI engineering.
Static HTML, no build step, hosted on **Cloudflare Pages**.

Live: <https://cohenholmes.co.uk>

## Repo layout

```
public/                 ← everything here is deployed to Cloudflare Pages
  index.html            homepage
  writing.html          Medium posts, rendered client-side from the feed function
  ca-builder.html       interactive Conditional Access Policy Builder (self-contained)
  404.html              custom not-found page
  sitemap.xml
functions/
  api/medium-feed.js    Pages Function — fetches @kaine.cohen's Medium RSS server-side,
                        returns clean JSON to writing.html (Medium's feed has no CORS)
wrangler.toml           Pages project config (pages_build_output_dir = "public")

# not deployed — kept at repo root:
ca-baseline-model-DRAFT.md      source copy of the CA baseline model (also on the CA Builder page)
ca-docs-alignment-audit.md      notes from aligning the CA content with Microsoft's docs
blog/                           post drafts + diagram sources (published via Medium)
backup-*/                       previous homepage versions
```

Only `public/` and `functions/` ship. `wrangler.toml`, the `.md` docs, `blog/` and
`backup-*/` folders sit at the repo root so Pages never publishes them.

## Local preview

Any static server works, e.g.:

```bash
npx wrangler pages dev public
```

`wrangler pages dev` also runs the `functions/` code, so `/api/medium-feed` and the
Writing page work locally.

## Deploy

Automatic: `.github/workflows/deploy.yml` runs `wrangler pages deploy` on every push to
`main` (i.e. every merged PR). Needs two repo secrets — `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` — set once under Settings → Secrets and variables → Actions.

Manual deploy still works if needed, from the repo root:

```bash
npx wrangler pages deploy
```

Uses the `cohenholmes-site` Pages project (output dir `public`).

## Design system

- **Type:** Fraunces (display) / IBM Plex Mono / Inter (body)
- **Colour:** paper-and-ink — `--ink:#14171C`, `--paper:#F3F1EC`, `--line:#D8D4C8`,
  `--muted:#6B6A63`, one accent `--signal:#3B5BFF`
- Flat, static, deliberately lightweight. CSS is inline per page (extract to a shared
  sheet only if the page count grows).

## Infrastructure notes

- **DNS:** Cloudflare (zone `cohenholmes.co.uk`). Apex is a proxied CNAME to
  `cohenholmes-site.pages.dev`; `www` redirects to the apex via a Redirect Rule.
- **TLS:** Full (Strict), Always Use HTTPS on, minimum TLS 1.2.
- **Mail:** Microsoft 365. SPF (`-all`) + DKIM (`selector1`/`selector2`) + DMARC
  (`p=none`, monitoring — tighten to `quarantine`/`reject` once aggregate reports are clean).
- **`.html` → extensionless** is automatic on Pages; internal links use `/writing`,
  `/ca-builder`.

## The CA Builder

`public/ca-builder.html` is a single self-contained file (HTML + CSS + vanilla JS, no
dependencies). It turns form input into Microsoft Graph `conditionalAccessPolicy` JSON
plus a plain-English summary and the Entra ID licence tier the policy needs, with
Microsoft baseline presets and a layered "baseline model" section. It's a learning /
demo tool — output is not validated against a tenant.
