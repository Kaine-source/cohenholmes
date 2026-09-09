# Delivery log

How work on this repo runs, and what's in flight. Updated as things move.

## Who does what

- **Build & drive** — Claude Code: implementation, infrastructure, content, opens PRs.
- **Review** — GitHub Copilot (auto, ruleset on `main`) + the ChatGPT Codex
  connector (auto). Both advisory. Codex is a *reviewer* only now — it no longer
  pushes branches or orchestrates, which is what made two orchestrators a tax
  earlier in this project.
- **Approve & merge** — Kaine.

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
- `/writing` — Medium posts via a server-side RSS Pages Function.
- Shared mini-nav across all four sub-pages (and `/404`).
- Site copy positions Kaine as a Microsoft 365 consultant (identity / security /
  compliance / AI adoption); each tool page opens with a "learning tool — changes
  nothing, yours to take, check current official docs" note; footers consistent.
- CI: `deploy.yml` (auto-deploy on push to `main`), `preview.yml` (per-PR Cloudflare
  preview + URL comment), `validate.yml` (route / CSP / privacy / scoring checks).
- Actions pinned to commit SHAs; Dependabot watching them.
- Repo is public; branch protection as above.
- `uptime.yml` — synthetic monitor every 15 min: route health, `www` redirect,
  and DNS drift against [`ops/monitor.json`](../ops/monitor.json); opens/closes a
  `monitoring` issue.
- [`docs/dns-expected.md`](dns-expected.md) — the DNS the monitor enforces.
- Runbook (recovery playbooks, account/secret inventory) is kept in the private
  ops notes, out of this public repo.

## In flight / queued

| Item | Status | Notes |
|---|---|---|
| Ops layer — account tasks | Kaine to do | Click-ops only. (D) Cloudflare Web Analytics: a site exists (added ~5 months ago) but the beacon was never installed — 0 data. Switch it to automatic setup; the hash-locked CSP means it only reports on `/`, `/writing`, `/404` (the tool pages stay dark, by design). Then Claude adds the one-line privacy note. (E) verify the domain in Google Search Console + Bing (import from GSC), submit the sitemap; give Claude the GSC TXT string to add to DNS + `ops/monitor.json`. (F) confirm GitHub Secret Scanning + Push Protection are on. Runbook **TODO**s: registrar + renewal, recovery-code locations, 2FA methods. |
| Site copy + polish pass | Done (PR in review) | Hero/contact rewrite (M365-consultant positioning, certs + dyslexia line, "Say hello"), per-tool "learning tool" intros, consistent footers, `/404` on the shared nav, `/ca-builder` canonical + og tags, and the 5 wording-bug fixes. Analytics privacy note deferred until Web Analytics is actually enabled. |
| Ops layer — CI quality gates | Queued | Lighthouse CI + axe against a locally-served build in PRs (budgets for perf / a11y / SEO); scheduled `lychee` link check. Folds into the `validate` pattern. |
| New tool candidates | On hold | Paused deliberately — building up the ops / supporting layer before adding more features. Shortlist kept for later: `/mail-auth` **checker** (live DNS lookup via a Pages Function), CA policy-set reviewer (paste a Graph export, get an audit), email-header analyzer (paste headers, parse locally). |
| Blog post 2 — "I rebuilt my website with AI agents" | On hold | Draft written and merged to the repo (`blog/built-with-ai-agents.md`, PR #12). Not being re-typed into Medium yet — holding until the site polish and any new tool land, so the post points people at something finished. |
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
