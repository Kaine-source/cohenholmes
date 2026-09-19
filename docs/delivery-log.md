# Delivery log

How work on this repo runs, and what's in flight. Updated as things move.

## Who does what

- **Build & drive** — Claude Code: implementation, infrastructure, content, opens PRs.
- **Review** — GitHub Copilot (auto, ruleset on `main`) + the ChatGPT Codex
  connector (auto). Both advisory. Codex is a *reviewer* only now — it no longer
  pushes branches or orchestrates, which is what made two orchestrators a tax
  earlier in this project.
- **Approve & merge** — Kaine.

Every blog post gets a sensitivity pass before it's added — real IPs, tokens, secrets,
internal hostnames — regardless of who drafted it. Caught once already: a real Tailscale
address in a supplied draft, redacted before it landed (see Shipped).

Everything reaches `main` through a pull request. Branch protection on `main`: PR
required, the `validate` check must pass, review threads must be resolved, no
force-push or deletion, not enforced for admins (emergency escape hatch).

No Airtable, no Outlook. Tracking and review live in GitHub.

## Shipped

- Static site on Cloudflare Pages; apex is a proxied CNAME to `*.pages.dev`.
- `/ca-builder` — Conditional Access policy builder, aligned to Microsoft's docs.
- `/ai-governance-check` — 12-question AI governance readiness check, browser-only,
  hash-locked CSP, no storage or network.
- `/mail-auth` — SPF/DKIM/DMARC record builder with a staged path to enforcement;
  DMARCbis-aware (no `pct`, uses `t=y`, includes `np`). Same hardening as the AI check.
- All three tools carry a hash-locked CSP with `connect-src 'none'` — a browser-
  enforced guarantee that nothing typed can be sent anywhere. `no-referrer` on
  every page. `/ca-builder` also escapes every user value in its summary output
  (`esc()`), so injected markup — `<img onerror>`, `<meta refresh>`, `<iframe>` —
  renders as inert text. Verified: no navigation, no outbound request.
- Site rebuilt on Astro. The 3 tool pages are carried through as a passthrough `public/`
  directory — everything else (homepage, `/404`, the blog) is a real Astro page.
  `pages_build_output_dir` is now `dist`; all 3 CI workflows build before deploying/validating.
- Native blog at `/blog` (content collection, `src/content/blog/`) replaces the Medium-synced
  `/writing` — the Medium dependency (`functions/api/medium-feed.js`) is removed entirely.
  `/writing` is now a redirect page to `/blog` (a static meta-refresh, since the site has no
  SSR adapter — not a true HTTP 3xx, so `ops/monitor.json` checks it as a route, not a
  redirect). Three posts shipped as native launch content: "I rebuilt my website with AI
  agents..." and "Conditional Access policies: what exactly are they..." (both migrated
  from their `blog/*.md` repo drafts with frontmatter added and diagrams copied into
  `public/blog/diagrams/`), plus "Building a Homelab SOC on a Raspberry Pi..." (supplied
  as ready Markdown; a specific Tailscale IP in the draft was redacted before publishing —
  see "Who does what" below on the sensitivity pass this repo now runs on every post).
  The collection schema also gained `author` (defaults to Kaine Cohen), and optional
  `slug` (overrides the filename-derived route) and `heroImage` fields.
- New C&H brand (Cormorant Garamond / DM Sans, navy `#0F1E33`/`#1A1A2E`, burnt orange
  `#C8622A`, cream `#F7F4EF`) applied via `src/layouts/BaseLayout.astro` to the homepage,
  `/404` and the blog. The 3 tool pages deliberately keep the original paper-and-ink system
  (Fraunces/IBM Plex Mono/Inter, signal blue) — they're frozen, so the site carries two
  visual identities during the transition rather than something to paper over.
- Shared mini-nav across all pages using the new brand (Home / CA Builder / AI Check /
  Mail Auth / Blog); the 3 tool pages keep their own original nav markup and paper-and-ink
  styling, just with the brand text updated (see rebrand bullet below).
- **Rebrand: site identity is now "CohenHolmes", not "Kaine Cohen".** Nav brand, footer,
  page titles/`og:title`, and the homepage's JSON-LD (now `Organization` "CohenHolmes"
  with Kaine as `founder`, was `Person` "Kaine Cohen") all updated — including in the 3
  frozen tool pages, where only the brand text (title, `og:title`, nav link, footer span)
  was touched, never the inline `<script>`; the CSP sha256 hash was verified byte-for-byte
  unchanged before and after on all three. Blog posts keep individual authorship via a
  "Blog by Kaine Cohen" byline instead of the site-wide identity.
- **Location/sensitivity sweep across the whole repo**, prompted by a specific town-and-
  county reference found in old, non-deployed `backup-*/` homepage snapshots — more precise
  than anything on the live site, but still tracked in the public repo. Redacted from the
  current files in all three backups plus the general-region mention that was in the new
  blog post, and — with Kaine's explicit go-ahead — scrubbed from git history via
  `git filter-repo`, the same approach already used once before in this repo for a leaked
  recovery email. History rewrites don't reach clones/forks made before the rewrite; those
  keep the old commits regardless.
- **Sensitivity-check-first practice, formalised as a skill**: content that might carry
  real personal/infrastructure detail (an address, a real IP, a token) now gets flagged and
  discussed before it's used or committed, not cleaned up after landing. This incident is
  exactly the gap that closes — the reference above was caught on request, after the fact.
- Site copy positions Kaine as a Microsoft 365 consultant (identity / security /
  compliance / AI adoption); each tool page opens with a "learning tool — changes
  nothing, yours to take, check current official docs" note; footers consistent.
- CI: `deploy.yml` (auto-deploy on push to `main`), `preview.yml` (per-PR Cloudflare
  preview + URL comment), `validate.yml` (route / CSP / privacy / scoring checks).
- Actions pinned to commit SHAs; Dependabot watching them.
- Repo is public; branch protection as above.
- `uptime.yml` — synthetic monitor (cron; GitHub throttles it to every few hours
  on a quiet repo): route health, `www` redirect, DNS drift against
  [`ops/monitor.json`](../ops/monitor.json); opens/closes a `monitoring` issue on
  failure/recovery. `transient` routes (reserved for checks with a third-party dependency —
  none currently configured, now that the Medium-feed proxy is gone) retry harder and a
  persistent bad status is a warning, not a page. `workflow_dispatch` has a
  `force_fail` input to exercise the alert path.
- [`docs/dns-expected.md`](dns-expected.md) — the DNS the monitor enforces.
- Runbook (recovery playbooks, account/secret inventory) is kept in the private
  ops notes, out of this public repo. A personal recovery email that was briefly
  committed there was scrubbed from all of `main`'s history (`git filter-repo`).
- GitHub security: secret scanning + push protection + Dependabot alerts on;
  Copilot review ruleset on `main`; Codex connector reviews too. All advisory.

## In flight / queued

| Item | Status | Notes |
|---|---|---|
| Ops — analytics decision (D) | Kaine to decide | A Web Analytics site exists (Pages-created) but no beacon was ever installed — 0 data. It's toggled from **Workers & Pages → `cohenholmes-site` → Settings → Web Analytics**, not the standalone UI. The tool claims are scoped to *what you type*, so counting an anonymous visit doesn't break them. **Option A:** enable it — reports on `/`, `/blog`, `/404` only (the tool pages' `connect-src 'none'` blocks the beacon); Claude then adds a one-line "visits counted anonymously; the tools send nothing you enter" note and softens ca-builder's "never connects" wording. **Option B:** leave it off — no beacon anywhere, lean on Search Console for discovery data (Claude's lean). |
| Ops — Search Console + Bing (E) | Kaine to do | GSC: any Google account (a personal Gmail is fine — no @cohenholmes.co.uk needed), add a **Domain** property for `cohenholmes.co.uk`, send Claude the `google-site-verification` TXT string → Claude adds it to Cloudflare DNS + `ops/monitor.json`, then verify + submit `sitemap.xml`. Bing: "import from Google Search Console" after GSC verifies. |
| Ops — GitHub security (F) | **Done** | Claude enabled secret scanning, push protection and Dependabot alerts via the API (all were off). Not touched: Dependabot *security updates* (opens PRs — Kaine's call) and `secret_scanning_validity_checks` (toggle didn't take; retry later). |
| Runbook TODOs | Kaine to do | Fill `C:\Projects\cohenholmes-notes\runbook.md`: registrar + renewal + auto-renew (the important one), recovery-code locations, 2FA method per account, which Google account owns the GSC property. |
| Ops layer — CI quality gates | Queued | Lighthouse CI + axe against a locally-served build in PRs (budgets for perf / a11y / SEO); scheduled `lychee` link check. Folds into the `validate` pattern. |
| New tool candidates | On hold | Paused deliberately — building up the ops / supporting layer before adding more features. Shortlist kept for later: `/mail-auth` **checker** (live DNS lookup via a Pages Function), CA policy-set reviewer (paste a Graph export, get an audit), email-header analyzer (paste headers, parse locally). |
| DMARC hardening post | Queued | Companion to `/mail-auth`; write after the 16 Sept DMARC review lands real data. |
| Service token → CI browser tests | Optional | Automates preview review (Playwright + axe/Lighthouse), removes the Access login step. |
| `_headers` for `Referrer-Policy` | Cosmetic | Align the server header with the page meta. |
| IA restructure (`/about`, `/services`, `/tools`) | Parked | A project, not a task. |

## Running on their own

- **DMARC review** — one-off cloud routine, fires 16 Sep 2026: re-checks SPF/DKIM/DMARC
  DNS health and gives the checklist for tightening `p=none` -> `p=quarantine`.
- **Token rotation reminder** — one-off, fires 26 Nov 2026: rotate the Cloudflare
  Pages API token before its 3 Dec expiry.
- **Deploy watch** — daily + on every Action run: flags a failed production deploy.
