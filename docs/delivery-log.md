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
- `/writing` — Medium posts via a server-side RSS Pages Function.
- Shared mini-nav across all three sub-pages.
- CI: `deploy.yml` (auto-deploy on push to `main`), `preview.yml` (per-PR Cloudflare
  preview + URL comment), `validate.yml` (route / CSP / privacy / scoring checks).
- Actions pinned to commit SHAs; Dependabot watching them.
- Repo is public; branch protection as above.

## In flight / queued

| Item | Notes |
|---|---|
| SPF/DKIM/DMARC builder tool | Next. Same pattern as the CA builder. Build before 16 Sept. |
| DMARC hardening post | Companion to the tool; write after the 16 Sept DMARC review lands real data. |
| Blog post 2 — "how AI built me a website" | Unblocked, not started. |
| Service token -> CI browser tests | Optional. Automates preview review (Playwright + axe/Lighthouse), removes the Access login step. |
| `_headers` for `Referrer-Policy` | Cosmetic — align the server header with the page meta. |
| IA restructure (`/about`, `/services`, `/tools`) | A project, not a task. Parked. |

## Running on their own

- **DMARC review** — one-off cloud routine, fires 16 Sep 2026: re-checks SPF/DKIM/DMARC
  DNS health and gives the checklist for tightening `p=none` -> `p=quarantine`.
- **Token rotation reminder** — one-off, fires 26 Nov 2026: rotate the Cloudflare
  Pages API token before its 3 Dec expiry.
- **Deploy watch** — daily + on every Action run: flags a failed production deploy.
