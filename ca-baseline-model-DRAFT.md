# Conditional Access — where to start

DRAFT for review / blog source. Not deployed. The condensed version on the CA Builder
page tracks the core layers; this is the fuller canonical copy.

Conditional Access (CA) is the "if this, then that" that runs **after** a user's password
check and **before** they get a token: *if* this user, on this device, from this network,
to this app, with this risk — *then* allow / block / require MFA / require a compliant
device / limit the session. It's the enforcement point almost everything else in the
Microsoft security stack plugs into.

Most tenants don't have "no security" — they have *scattered* security: three half-built
policies someone made in 2022, Security Defaults still on, an MFA registration free-for-all.
This is a baseline you can deploy **in order**, with the reasoning and the traps attached.

---

## Before you touch anything

- **Licensing.** Custom CA needs **Entra ID P1** (Business Premium, Microsoft 365 E3 / E5 /
  F3). Risk-based policies (sign-in / user risk) need **Entra ID P2** (E5, or the P2 add-on).
  No P1? You're on Security Defaults, and this guide is your migration target, not something
  you can do yet.
- **Turn Security Defaults off** before creating CA policies — they're mutually exclusive.
  Don't do this until policy 1–4 below are at least in report-only, or you'll have a gap.
- **Look at what's already there.**
  - *Classic policies* stopped enforcing in July 2024 — migrate their intent to modern
    policies, then disable them.
  - *Microsoft-managed policies* — Microsoft now auto-creates some CA policies in tenants
    (MFA for admins, per-user-MFA migration). You'll find policies you didn't make. Read
    them before you build alongside.
  - *Report-only mode* on everything new. Always.
- **Know your people.** Who holds privileged roles. Which 2 accounts are your break-glass.
- **Inventory legacy auth.** Sign-in logs, filter *Client app = Other clients* — scanners,
  MFPs, line-of-business apps on SMTP AUTH / IMAP / POP. You need this list before policy 1.
- **Is Intune real?** Policy 5 assumes device compliance policies that actually mean
  something. If devices aren't enrolled, that policy just blocks people.
- **Have users registered MFA methods?** Run a registration campaign (Authentication
  methods policy) first — policy 3 depends on it.

### Mandatory MFA is a floor, not a ceiling

Microsoft now enforces MFA on the **management surface** — Azure portal, Entra/Intune admin
centres, and (Phase 2, from Oct 2025) Azure CLI / PowerShell / ARM REST — for any
create/update/delete. Two things to know:

- It covers *that surface only*. It does nothing for a user opening Exchange, SharePoint,
  Teams, or a random SaaS app — which is 95% of sign-ins. You still need a tenant-wide CA
  MFA policy (policy 3).
- Your CA **exclusions don't apply to it**. Break-glass accounts hit the mandatory-MFA floor
  for Azure management regardless — so they need a working MFA method (passkey/FIDO2 in the
  safe, or certificate-based auth), not just a long password.

---

## The baseline — deploy in order

Every policy: **report-only → pilot group → all**. Exclude break-glass from all of them.

### 1. Block legacy authentication — all users

- **Why:** legacy protocols (POP, IMAP, SMTP AUTH, older Office) can't do MFA or device
  checks. Every policy below has a bypass until this is in place. Highest priority, lowest
  risk.
- **Watch out:** the scanners and LOB apps from your inventory. A blocked Exchange
  ActiveSync client gets one quarantine email; a blocked SMTP AUTH scanner just silently
  stops. Move them to a supported auth method or a tightly-scoped exception.
- **Rollout:** report-only 1–2 weeks, review *Other clients* sign-ins, then enforce.

### 2. Phishing-resistant MFA for admins — privileged directory roles

- **Why:** admin accounts are the highest-value target and the smallest population. Do them
  first, properly — push notifications and SMS are phishable, so "any MFA" isn't enough
  here. Use the **Phishing-resistant MFA** authentication strength (passkey/FIDO2, Windows
  Hello for Business, certificate-based auth).
- **Assumes:** admins have a phishing-resistant method registered. Provision *before* you
  enforce; a Temporary Access Pass covers the onboarding gap.
- **Watch out:** break-glass excluded (but see the mandatory-MFA note above — give them a
  real method). Service accounts holding roles — move them to workload identity / managed
  identity instead of carving exclusions.
- **Rollout:** pilot 1–2 admins, then all. It's a small group; shepherd them.

### 3. Secure the MFA registration surface — all users

- **Why:** if an attacker phishes a password, the next thing they do is register *their own*
  MFA method. Lock registration down so it can only happen from a trusted network or a
  compliant/managed device. Do this **before** you push everyone to register in policy 4.
- **How:** CA policy on the **Register security information** user action → require MFA (for
  users who already have a method) *and* a trusted location or compliant device.
- **Watch out:** genuinely new starters with no method and off-network — handle with a
  Temporary Access Pass issued through your onboarding process.
- **Rollout:** report-only, confirm your onboarding flow still works, then enforce.

### 4. Require MFA (or stronger) for all users — all users, all apps

- **Why:** the broad baseline. Everything below refines it. Target **all resources** with no
  app exclusions (Microsoft's own recommendation — exclusions create low-privilege gaps).
- **Assumes:** the registration campaign ran; policy 3 is protecting registration.
- **Watch out:** guests (policy 8), break-glass (exclude), non-interactive / service
  sign-ins. This is the policy most likely to generate helpdesk calls — time it, and have
  the pilot group be people who'll tell you what broke.
- **Rollout:** report-only, watch the "would have required MFA" volume, pilot, then all.

### 5. Require a managed device for desktop sessions — browser + modern clients

- **Why:** MFA proves *who*. Device compliance proves the *endpoint* is patched, encrypted
  and enrolled. Together they're the Zero Trust baseline for access from a real computer.
  Grant control: **compliant device OR Hybrid AD joined device**.
- **Assumes:** Intune (or hybrid join) deployed with meaningful compliance policies.
- **Watch out:** macOS / Linux, contractors on their own kit (policy 6 handles them),
  kiosk/shared devices. Note: **"Require approved client app"** went read-only for new
  policies on 30 June 2026 — use **"Require app protection policy"** instead.
- **Rollout:** start with the most sensitive apps (finance, HR, admin portals), expand.
  Report-only is essential here.

### 6. Contain unmanaged devices — MFA + short sign-in frequency + no persistent browser

- **Scope:** all users, browser, "device is not compliant and not hybrid joined".
- **Why:** don't block BYOD outright, but an unmanaged browser session shouldn't last 90
  days or leave refresh tokens on a personal laptop. This contains it.
- **Optional add:** Conditional Access App Control (Defender for Cloud Apps) to block
  downloads in-session — keeps data off the device entirely.
- **Watch out:** sign-in frequency + a phishing-resistant strength can double-prompt (known
  Microsoft quirk). 1–4 hours is the sweet spot, not "every time".
- **Rollout:** report-only, enforce alongside policy 5.

### 7. Risk-based — two policies (Entra ID P2)

- **7a. Sign-in risk medium/high → require MFA.** Catches "the credential works but the
  sign-in looks wrong" — impossible travel, anonymous IP, leaked credentials.
- **7b. High user risk → secure password change** (MFA + password change, with **AND** —
  Microsoft's rule). Lets a compromised user self-remediate without a ticket. This policy
  can only contain users, applications and userRiskLevels conditions, and must target all
  apps.
- **Assumes:** Entra ID P2. No P2? Skip layer 7 — 1–6 stand on their own. Confirm SSPR is
  fully working before enforcing 7b.
- **Rollout:** report-only 2–4 weeks minimum, review the risk detections, then enforce.
  Risk policies lock people out more unexpectedly than any other.

### 8. Guest & external access → MFA + Terms of Use

- **Why:** guests authenticate in their home tenant; you can't assume they've done MFA.
  Require it at your resource. Terms of Use gives an auditable acceptance.
- **Assumes:** cross-tenant access settings reviewed — you can trust MFA claims from partner
  tenants to cut prompt fatigue.
- **Watch out:** B2B one-time-passcode users, guest redemption flows.
- **Rollout:** report-only, then enforce.

---

## Ordering note

Admins-first (2 before 4) is a deliberate choice: smallest blast radius, highest value, and
a small enough group to walk through phishing-resistant registration by hand. Some people
do the broad MFA rollout first to get coverage fast. In a very small tenant, doing 2, 3 and
4 together is fine — just keep them in report-only together and enforce in that order.

## Cross-cutting rules

- **Break-glass:** two cloud-only Global Administrator accounts, excluded from *every*
  policy, credentials held offline, sign-in activity alerted on. Give them a phishing-
  resistant method (passkey/CBA) — the mandatory-MFA floor applies to them.
- **Never straight to ON.** Report-only → pilot group → all, every time.
- **Name policies consistently:** `CAxx - <persona> - <intent> - <state>`, e.g.
  `CA01 - All - Block legacy auth - ON`.
- **Review quarterly.** CA estates drift; exclusions become permanent by accident.
- **Export the JSON.** Keep policy definitions in source control so changes are diffable.

## After the baseline

Once 1–8 are enforced, the next layer is contextual and risk-driven:

- **Authentication context** — step-up (compliant device, phishing-resistant MFA) on a
  sensitive SharePoint site, a Purview-labelled document, or a PIM role activation, without
  raising the bar for everything.
- **Insider risk** (Purview Adaptive Protection) as a CA condition — tighten access as a
  user's insider-risk level rises.
- **Token protection** — bind refresh tokens to the device so a stolen token is useless
  elsewhere.
- **Filter for devices** — target policy by device attributes (model, extensionAttributes)
  for scenarios group membership can't express.
- **Authentication flows** — lock down device code flow and authentication transfer, both
  used in recent phishing campaigns.
- **Continuous access evaluation** — on by default; only touch it to *disable* for a
  specific break-glass path.

## Deliberately left out of the baseline

- **Location-based blocking as a primary control** — noisy and VPN-defeated. Use named
  locations for *trusted exclusions* (skip the MFA prompt on the corporate egress), not as
  the thing standing between an attacker and your data.
- **Per-country blocks** — only with a concrete reason; "block all, allow known" is a real
  project, not a checkbox.
- **A policy per app** — group sensitive apps and target the group. Add specific policies
  only when a real requirement appears.
- **Blocking unknown/unsupported platforms** (ChromeOS etc.) — reasonable to add as
  "any platform, exclude the supported ones → block", but it's a refinement, not a
  foundation.
