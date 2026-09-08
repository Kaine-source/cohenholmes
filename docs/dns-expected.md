# Expected DNS — cohenholmes.co.uk

The machine-checked values live in [`ops/monitor.json`](../ops/monitor.json); the
`Monitor site` workflow resolves them every 15 minutes over DNS-over-HTTPS and
opens an issue if anything drifts. This page is the human-readable copy plus the
context the JSON can't hold.

**When you deliberately change a record, edit `ops/monitor.json` in the same pull
request** — otherwise the monitor will page you for a change you made on purpose.
The obvious upcoming one: moving DMARC from `p=none` to `p=quarantine` after the
16 Sept review.

## Nameservers / DNS host

Cloudflare DNS — `mona.ns.cloudflare.com`, `jaime.ns.cloudflare.com`. All records
below are managed in the Cloudflare dashboard (DNS → Records). Registrar and
recovery details are kept in the private ops notes, not in this repo.

## Web

| Name | Type | Value | Notes |
|---|---|---|---|
| `cohenholmes.co.uk` | CNAME (flattened) | `cohenholmes-site.pages.dev` | Proxied — resolves publicly as Cloudflare anycast `A` records, which change. The monitor checks the **site responds with the right content**, not the IPs. |
| `www.cohenholmes.co.uk` | — | not configured | `www` currently does not resolve. Add a proxied CNAME to the apex if you want it to work. |

## Email — Microsoft 365

| Name | Type | Value |
|---|---|---|
| `cohenholmes.co.uk` | MX | `0 cohenholmes-co-uk.mail.protection.outlook.com` |
| `cohenholmes.co.uk` | TXT (SPF) | `v=spf1 include:spf.protection.outlook.com -all` |
| `cohenholmes.co.uk` | TXT | `MS=ms64540345` — M365 domain-ownership token, leave in place |
| `selector1._domainkey` | CNAME | `selector1-cohenholmes-co-uk._domainkey.kcprod1.k-v1.dkim.mail.microsoft` |
| `selector2._domainkey` | CNAME | `selector2-cohenholmes-co-uk._domainkey.kcprod1.k-v1.dkim.mail.microsoft` |
| `_dmarc.cohenholmes.co.uk` | TXT | `v=DMARC1; p=none; rua=mailto:kaine.cohen@cohenholmes.co.uk` |

SPF is already at `-all` (hardfail). DKIM uses two selectors so a key can be
rotated without downtime. DMARC is at monitoring only — the staged path to
enforcement is in the `/mail-auth` tool and the 16 Sept cloud routine.

## Not present (by design)

- No standalone `A`/`AAAA` at the apex you manage — the Pages CNAME is flattened.
- No `autodiscover`, `enterpriseregistration`, `enterpriseenrollment`, or Skype/
  Teams SRV records. Add them only if you start using Outlook desktop autodiscover
  or Intune enrollment on this domain.
