# CA Baseline Model — DRAFT for review

Not deployed. Lives outside `public/`. This is the "overall model" the reviewer asked for —
an opinionated, layered starter set for Conditional Access, with the reasoning attached.
Kaine to review wording before any of it goes on the site (his name is on it).

**How to use it:** deploy in order. Every policy: report-only → pilot group → all. Exclude
break-glass from every policy.

---

## 1. Block legacy authentication — all users

- **Why:** legacy auth (POP, IMAP, SMTP AUTH, older Office clients) can't do MFA or device
  checks. Every other policy has a bypass until this one is in place. Highest priority,
  lowest risk.
- **Assumes:** nothing. Basic auth is off in Exchange Online by default now, but migrated
  tenants and tenants with exceptions still need the explicit block.
- **Watch out:** scan-to-email MFPs, old scanners, line-of-business apps using SMTP AUTH,
  shared mailboxes on legacy clients. Find them first — sign-in logs, filter *Client app =
  Other clients*.
- **Rollout:** report-only 1–2 weeks, review the "Other clients" sign-ins, then enforce.

## 2. Phishing-resistant MFA for admins — privileged directory roles

- **Why:** admin accounts are the highest-value target and the smallest population. Do them
  first and do them properly — push notifications and SMS are phishable, so "any MFA" isn't
  enough here.
- **Assumes:** admins have a phishing-resistant method registered (passkey / FIDO2, Windows
  Hello for Business, or certificate-based auth). Provision these *before* enforcing; a
  Temporary Access Pass covers the onboarding gap.
- **Watch out:** break-glass accounts are excluded (they use a long random password in a
  safe, not a key). Service accounts holding directory roles — move them to workload identity
  or managed identity instead of carving exclusions.
- **Rollout:** pilot with 1–2 admins, then all. Keep TAP available during onboarding.

## 3. Require MFA (or stronger) for all users — all users, all apps

- **Why:** the broad baseline. Everything below refines it.
- **Assumes:** users have registered an MFA method. Run a registration campaign (Authentication
  methods policy) first, paired with a registration-enforcement policy or the Identity
  Protection registration policy.
- **Watch out:** guests (handled separately in policy 7), break-glass (exclude), remaining
  non-interactive / service sign-ins.
- **Rollout:** report-only, watch the "would have required MFA" volume, pilot a group, then
  all. This is the policy most likely to generate helpdesk calls — time it deliberately.

## 4. Require a managed device for desktop sessions — browser + modern clients

- **Why:** MFA proves *who*. Device compliance proves the *endpoint* is patched, encrypted
  and enrolled. Together they're the Zero Trust baseline for access from a real computer.
- **Assumes:** Intune (or hybrid join) is deployed and the compliance policies are meaningful.
  Without that, this just blocks people.
- **Watch out:** macOS / Linux, contractors on their own kit (policy 5 handles them),
  kiosk / shared devices.
- **Rollout:** start with the most sensitive apps (finance, HR, admin portals), expand.
  Report-only is essential here.

## 5. Unmanaged devices → MFA + short sign-in frequency + no persistent browser

- **Scope:** all users, browser, "device is not compliant and not hybrid joined".
- **Why:** you don't want to block BYOD outright, but an unmanaged browser session shouldn't
  last 90 days or leave refresh tokens on a personal laptop. This contains it.
- **Optional add:** Conditional Access App Control (Defender for Cloud Apps) to block
  downloads in-session — keeps data off the unmanaged device entirely.
- **Watch out:** sign-in frequency + a phishing-resistant strength can double-prompt (known
  Microsoft quirk). 1–4 hours is usually the sweet spot, not "every time".
- **Rollout:** report-only, then enforce alongside policy 4.

## 6. Risk-based — two policies (Entra ID P2)

- **6a. Sign-in risk medium/high → require MFA.** Catches "the credential works but the
  sign-in looks wrong".
- **6b. User risk high → secure password change (MFA + password change, AND).** Lets a
  compromised user self-remediate.
- **Assumes:** Entra ID P2 (E5 or the add-on). No P2? Skip this layer — 1–5 stand on their
  own.
- **Watch out:** risk policies lock people out unexpectedly more than any other. Report-only
  for longer here, and confirm SSPR is fully working before 6b.
- **Rollout:** report-only 2–4 weeks minimum, review the risk detections, then enforce.

## 7. Guest & external access → MFA + Terms of Use

- **Why:** guests authenticate in their home tenant; you can't assume they have MFA. Require
  it at your resource. Terms of Use gives you an auditable acceptance.
- **Assumes:** cross-tenant access settings reviewed — you can trust MFA claims from partner
  tenants to cut down prompts.
- **Watch out:** B2B one-time-passcode users, guest redemption flows.
- **Rollout:** report-only, then enforce.

---

## Cross-cutting rules

- **Break-glass:** two cloud-only Global Administrator accounts, excluded from *every*
  policy, long random passwords held offline, sign-in activity alerted on.
- **Never straight to ON.** Report-only → pilot group → all, every time.
- **Name policies consistently:** `CAxx - <persona> - <intent> - <state>`, e.g.
  `CA01 - All - Block legacy auth - ON`.
- **Review quarterly.** CA estates drift.

## What this model deliberately leaves out

- **Location-based blocking as a primary control** — noisy and VPN-defeated. Use named
  locations for *trusted exclusions* (e.g. skip MFA prompts on the corporate egress), not as
  the thing standing between an attacker and your data.
- **Per-country blocks** — only if you have a concrete reason; "block all, allow known" is a
  real project, not a checkbox.
- **A policy per app** — group sensitive apps and target the group. Add specific policies
  only when a real requirement appears.
