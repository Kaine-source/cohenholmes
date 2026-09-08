# Delivery log

How work on this repo runs, and what's in flight. Updated as things move.

## Who does what

- **Build & drive** — Claude Code: implementation, infrastructure, content, opens PRs.
- **Review** — GitHub Copilot code review (automatic on pull requests).
- **Approve & merge** — Kaine.

Everything reaches `main` through a pull request. Branch protection on `main`: PR
required, the `validate` check must pass, review threads must be resolved, no
force-push or deletion, not enforced for admins (emergency escape hatch).

No ChatGPT Work / Codex, no Airtable, no Outlook — this repo is GitHub-only.

## Shipped

- Static site on Cloudflare Pages; apex is a proxied CNAME to `*.pages.dev`.
- `/ca-builder` — Conditional Access policy builder, aligned to Microsoft's docs.
- `/ai-governance-check` — 12-question AI governance readiness check, browser-only,
  hash-locked CSP, no storage or network.
- `/mail-auth` — SPF/DKIM/DMARC record builder with a staged path to enforcement;
  DMARCbis-aware (no `pct`, uses `t=y`, includes `np`). Same hardening as the AI check.
- `/writing` — Medium posts via a server-side RSS Pages Function.
- Shared mini-nav across all four sub-pages.
- CI: `deploy.yml` (auto-deploy on push to `main`), `preview.yml` (per-PR Cloudflare
  preview + URL comment), `validate.yml` (route / CSP / privacy / scoring checks).
- Actions pinned to commit SHAs; Dependabot watching them.
- Repo is public; branch protection as above.

## In flight / queued

| Item | Status | Notes |
|---|---|---|
| Site copy + polish pass | Active | Full wording review done 8 Sep 2026. Queued: 5 wording fixes (missing space on `/ai-governance-check`, "bl lists" on `/mail-auth`, raw `riskRemediation` label on `/ca-builder`, bare `&` in a `/mail-auth` og:title, "Posts there" on the homepage) plus a cosmetic set (per-page footers differ, no canonical/og tags on `/ca-builder`, H1 casing, `/404` still on the old nav). Aim: the site reads like a working toolkit, not a template. |
| New tool candidates | Deciding | Add 1–2 tools that do real work in the browser (or a live lookup) so the site is visibly more than static pages + a Medium feed. Shortlist: `/mail-auth` **checker** (live DNS lookup via a Pages Function), CA policy-set reviewer (paste a Graph export, get an audit), email-header analyzer (paste headers, parse locally). |
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
