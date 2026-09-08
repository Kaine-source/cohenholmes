# Runbook — cohenholmes.co.uk

The "if something breaks or an account locks, what do I do" page. Keep it current;
it is only useful if it is true. Lines marked **TODO** need a fact only Kaine has.

---

## Where everything lives

| Thing | Where | Notes |
|---|---|---|
| Source of truth | `github.com/Kaine-source/cohenholmes` (public) | The repo *is* the site. `public/` is served; `functions/` is the one Pages Function. |
| Hosting | Cloudflare Pages, project **`cohenholmes-site`** | Deploys on every push to `main` via `.github/workflows/deploy.yml` (`wrangler pages deploy`). |
| DNS | Cloudflare (dashboard → DNS → Records) | Nameservers `mona` / `jaime.ns.cloudflare.com`. Expected records: [`dns-expected.md`](dns-expected.md). |
| Domain registrar | **TODO** — where is `cohenholmes.co.uk` registered? | Record: registrar name, the login, renewal date, whether auto-renew is on. This is a single point of failure — if the domain lapses, everything else is moot. |
| TLS certificate | Cloudflare (automatic, Universal SSL) | Nothing to renew by hand. If HTTPS breaks, check the Cloudflare SSL/TLS mode is **Full**. |
| Email | Microsoft 365, tenant `kcprod1` | MX → Exchange Online. Auth records in [`dns-expected.md`](dns-expected.md). |
| Writing feed | Medium `@kaine.cohen` → `/api/medium-feed` Pages Function | If `/writing` is empty, check Medium is up and the function logs in the Cloudflare dashboard. |

## Accounts and how to get back in

| Account | Login | 2FA | Recovery codes kept | 
|---|---|---|---|
| GitHub | **TODO** (username `Kaine-source`) | **TODO** | **TODO** — where are the 8 recovery codes? |
| Cloudflare | **TODO** | **TODO** (recommend a hardware key or Microsoft Authenticator) | **TODO** |
| Microsoft 365 | **TODO** admin account | **TODO** | **TODO** — plus is there a break-glass / second global admin? |
| Medium | **TODO** | **TODO** | n/a — only affects `/writing`, not the site itself |

> The GitHub account primary email is `kainecohen@hotmail.com`, kept deliberately
> as a recovery route. Command-line commits are authored as
> `69087812+Kaine-source@users.noreply.github.com` (email-privacy setting is on).

## Secrets in play

| Secret | Where | Expires / rotates |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | GitHub repo → Settings → Secrets → Actions. Token name in Cloudflare: `GitHub_Automation_90_days`. | **3 Dec 2026.** Cloud routine "Token rotation reminder" pings on 26 Nov. Rotate: create a new token (Account → Developer Platform → Pages → Edit), update the secret, delete the old token. Claude never sees the value. |
| `CLOUDFLARE_ACCOUNT_ID` | Same place | Not a secret really; does not expire. |

## Automated helpers already running

- **Monitor site** (`.github/workflows/uptime.yml`) — every 15 min, checks the
  routes and the DNS records, opens/closes a `monitoring`-labelled issue.
- **DMARC review** — cloud routine, fires 16 Sep 2026.
- **Token rotation reminder** — cloud routine, fires 26 Nov 2026.
- **Deploy watch** — cloud routine, daily + on every Action run, flags a failed deploy.

---

## Playbooks

### The site is down / showing an error

1. Check the [monitoring issue](https://github.com/Kaine-source/cohenholmes/issues?q=is%3Aissue+label%3Amonitoring) and the latest **Monitor site** run — it names the exact failing check.
2. Is it the whole site or one route?
   - **Whole site** → check the [Cloudflare status page](https://www.cloudflarestatus.com/), then Cloudflare dashboard → the Pages project → is the latest deployment green?
   - **One route** → open the file in `public/`, check the last few merged PRs for what changed, revert if needed (new branch → PR → merge; branch protection still applies).
3. Roll back fast: Cloudflare dashboard → `cohenholmes-site` → Deployments → find the last good one → **Rollback to this deployment**. This is instant and does not touch the repo. Then fix forward properly.

### A deploy failed

1. GitHub → Actions → **Deploy to Cloudflare Pages** → open the red run.
2. Common causes: `CLOUDFLARE_API_TOKEN` expired (see the rotation row above), Cloudflare API incident, or a `wrangler` version bump. The site keeps serving the previous deploy until a new one succeeds — no rush, but don't leave it.

### `/writing` is empty or erroring

The `/api/medium-feed` function fetches Medium's RSS server-side and caches it for
6 hours. If it fails it returns a 502 and the page shows a fallback message.
Check: Medium is reachable, then Cloudflare dashboard → the project → Functions →
logs. Nothing here affects the rest of the site.

### DNS drift alert from the monitor

The monitor said a record no longer matches [`dns-expected.md`](dns-expected.md).
- If **you changed it on purpose**: update `ops/monitor.json` (and this file) via a PR. Alert clears on the next run.
- If **you didn't**: Cloudflare dashboard → DNS → Records, compare against `dns-expected.md`, restore the missing/changed record. If records are gone wholesale, check whether the nameservers still point to Cloudflare (registrar login).

### Locked out of Cloudflare

DNS and hosting are both here, so this is the worst case.
1. Use the recovery codes (TODO: location above).
2. If email-based recovery: the Cloudflare login email is TODO — make sure you can receive mail there even if M365 is the thing that's broken.
3. Domain is still yours at the registrar — worst case you can repoint nameservers elsewhere and rebuild DNS from `dns-expected.md`, and re-deploy the site to any static host from the repo.

### Locked out of GitHub

1. Recovery codes (TODO: location).
2. The repo is public, so the code is not lost even in the worst case — clone exists locally at `C:\Projects\cohenholmes` and in `backup-*/`.
3. Deploys stop until access is back; the live site keeps serving the last deploy.

---

## Periodic checks (do these, roughly quarterly)

- [ ] Domain renewal date still comfortably in the future; auto-renew on.
- [ ] `CLOUDFLARE_API_TOKEN` not close to expiry.
- [ ] Recovery codes for GitHub / Cloudflare / M365 still exist and you know where.
- [ ] `dns-expected.md` still matches reality (run **Monitor site** manually).
- [ ] Dependabot PRs for pinned Actions merged.
- [ ] Skim the last quarter's monitoring issues for a pattern.
