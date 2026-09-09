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
  ops notes, out of this public repo. A personal recovery email that was briefly
  committed there was scrubbed from all of `main`'s history (`git filter-repo`).
- GitHub security: secret scanning + push protection + Dependabot alerts on;
  Copilot review ruleset on `main`; Codex connector reviews too. All advisory.

## In flight / queued

| Item | Status | Notes |
|---|---|---|
| Ops — analytics decision (D) | Kaine to decide | A Web Analytics site exists (Pages-created) but no beacon was ever installed — 0 data. It's toggled from **Workers & Pages → `cohenholmes-site` → Settings → Web Analytics**, not the standalone UI. The tool claims are scoped to *what you type*, so counting an anonymous visit doesn't break them. **Option A:** enable it — reports on `/`, `/writing`, `/404` only (the tool pages' `connect-src 'none'` blocks the beacon); Claude then adds a one-line "visits counted anonymously; the tools send nothing you enter" note and softens ca-builder's "never connects" wording. **Option B:** leave it off — no beacon anywhere, lean on Search Console for discovery data (Claude's lean). |
| Ops — Search Console + Bing (E) | Kaine to do | GSC: any Google account (a personal Gmail is fine — no @cohenholmes.co.uk needed), add a **Domain** property for `cohenholmes.co.uk`, send Claude the `google-site-verification` TXT string → Claude adds it to Cloudflare DNS + `ops/monitor.json`, then verify + submit `sitemap.xml`. Bing: "import from Google Search Console" after GSC verifies. |
| Ops — GitHub security (F) | **Done** | Claude enabled secret scanning, push protection and Dependabot alerts via the API (all were off). Not touched: Dependabot *security updates* (opens PRs — Kaine's call) and `secret_scanning_validity_checks` (toggle didn't take; retry later). |
| Runbook TODOs | Kaine to do | Fill `C:\Projects\cohenholmes-notes\runbook.md`: registrar + renewal + auto-renew (the important one), recovery-code locations, 2FA method per account, which Google account owns the GSC property. |
| Ops layer — CI quality gates | Queued | Lighthouse CI + axe against a locally-served build in PRs (budgets for perf / a11y / SEO); scheduled `lychee` link check. Folds into the `validate` pattern. |
| New tool candidates | On hold | Paused deliberately — building up the ops / supporting layer before adding more features. Shortlist kept for later: `/mail-auth` **checker** (live DNS lookup via a Pages Function), CA policy-set reviewer (paste a Graph export, get an audit), email-header analyzer (paste headers, parse locally). |
| Blog post 2 — "I rebuilt my website with AI agents" | On hold | Draft merged to the repo (`blog/built-with-ai-agents.md`, PR #12). Site polish is done; now just waiting on Kaine to want it live. Publish flow: Claude re-types the approved text into a Medium draft, Kaine formats + publishes. |
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
