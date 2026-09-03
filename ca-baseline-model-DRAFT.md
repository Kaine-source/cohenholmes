# Conditional Access — where to start

DRAFT for review / blog source. Not deployed. The condensed version on the CA Builder
page tracks the core layers; this is the fuller canonical copy.

Conditional Access (CA) is the "if this, then that" that runs **after** the first factor
(password, passkey or federated sign-in) and **before** the token is issued: *if* this
user, on this device, from this network, to this app, with this risk — *then* allow /
block / require MFA / require a compliant device / limit the session. It's the enforcement
point almost everything else in the Microsoft security stack plugs into.

In Zero Trust terms CA is primarily the *verify explicitly* and *assume breach* engine —
the gate at sign-in. (Microsoft's docs also credit it against *least privilege*, but that
pillar mostly lives in PIM, entitlement management and app-side authorisation.) CA decides
whether the door opens; it doesn't decide what's in the room.

Most tenants don't have "no security" — they have *scattered* security: three half-built
policies someone made in 2022, Security Defaults still on, an MFA registration free-for-all.
This is a baseline you can deploy **in order**, with the reasoning and the traps attached.

---

## Before you touch anything

- **Licensing.** Custom CA needs **Entra ID P1** (Business Premium, Microsoft 365 E3 / E5 /
  F3). Risk-based policies (sign-in / user risk) need **Entra ID P2** (E5, or the P2 add-on).
  No P1? You're on Security Defaults, and this guide is your migration target, not something
  you can do yet.
- **Turn Security Defaults off** — you can't create *any* CA policy, even report-only,
  while they're on. Disable them and keep MFA enforced *through* the switch: either let
  Microsoft's "upgrade from Security Defaults" managed policies carry it, or enforce
  policy 4 (MFA for all) immediately. Don't disable Security Defaults and then sit with
  everything in report-only — report-only doesn't enforce, so that's an unprotected window.
- **Look at what's already there.**
  - *Classic policies* stopped enforcing on 10 July 2024 — migrate their intent to modern
    policies, then disable them (you can't re-enable a classic policy once disabled, so
    document it first).
  - *Microsoft-managed policies* — Microsoft auto-creates a set of CA policies (block
    legacy auth, block device code flow, MFA for admins, MFA for all, risky-sign-in MFA,
    high-risk-user block/remediation, phishing-resistant MFA for admins). They arrive in
    report-only and Microsoft turns them on ~30 days later. You'll find policies you didn't
    make. Treat them as a baseline shortcut and the bridge off Security Defaults — read
    each one, exclude your break-glass group, and decide to adopt or replace.
  - *Report-only mode* on everything new. Always.
- **Know your people.** Who holds privileged roles. Which 2+ accounts are your break-glass.
- **Inventory legacy auth.** Sign-in logs, filter for the legacy protocols on *both* the
  interactive and non-interactive tabs — scanners, MFPs, line-of-business apps on SMTP AUTH
  / IMAP / POP, Exchange ActiveSync. You need this list before policy 1. The "Sign-ins
  using legacy authentication" workbook helps.
- **Is Intune real?** Policy 5 assumes device compliance policies that actually mean
  something. If devices aren't enrolled, that policy just blocks people.
- **Have users registered MFA methods?** Run a registration campaign (Authentication
  methods policy) first — policies 3 and 4 both depend on it, and a risky session can't
  register MFA once policy 7 is on.
- **Third-party MFA wired in via custom controls?** If Duo / RSA / Okta is integrated as
  an MFA provider through CA *custom controls*, that mechanism is on a retirement path —
  plan the move to external authentication methods (EAM) before it forces your hand.

### Mandatory MFA is a floor, not a ceiling

Microsoft now enforces MFA on the **management surface** — Azure portal, Entra/Intune admin
centres, and (Phase 2, from 1 Oct 2025) Azure CLI / PowerShell / ARM REST / IaC — for any
create, update or delete (read operations are exempt). Both phases are in force now; the
postponement windows closed in July 2026. Two things to know:

- It covers *that surface only* — requests to `management.azure.com`. It does nothing for a
  user opening Exchange, SharePoint, Teams or a SaaS app, which is the overwhelming
  majority of sign-ins, and it doesn't cover Microsoft Graph. You still need a tenant-wide
  CA MFA policy (policy 4).
- Your CA **exclusions don't apply to it**. Break-glass accounts hit the mandatory-MFA floor
  for Azure management regardless — so they need a working MFA method (passkey/FIDO2 in the
  safe, or certificate-based auth), not just a long password.

---

## The baseline — deploy in order

Every policy: **report-only → pilot group → all**. Exclude break-glass from all of them.

This maps onto Microsoft's own "Secure foundation" template set and their three-phase
deployment plan. Two Microsoft templates aren't broken out as layers here: **MFA for
Azure management** (now largely covered by mandatory MFA and the managed policies) and
**MFA for admins accessing the Microsoft admin portals** (a subset of layer 2). Add them
if you want the explicit coverage.

### 1. Block legacy authentication — all users

- **Why:** legacy protocols (POP, IMAP, SMTP AUTH, older Office) can't do MFA or device
  checks. An MFA-for-all policy blocks them as a side effect — a legacy client can't
  satisfy an MFA grant — but a dedicated block policy is cleaner, explicit, auditable, and
  covers the apps you *don't* gate with MFA. It's Microsoft's first "Secure foundation"
  policy: highest priority, lowest risk.
- **Config:** client apps = *Exchange ActiveSync clients* + *Other clients*; grant =
  *Block*; target *all resources*.
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
  Temporary Access Pass issued through your onboarding process. From July 2026 this policy
  also applies during Windows Hello for Business / macOS Platform SSO credential
  registration.
- **Rollout:** report-only, then enforce. Report-only *telemetry* is thin for user-action
  policies, so validate by having a pilot user actually run through registration — don't
  rely on the workbook.

### 4. Require MFA (or stronger) for all users — all users, all apps

- **Why:** the broad baseline. Everything below refines it. Target **all resources** with no
  app exclusions (Microsoft's own recommendation — exclusions create low-privilege gaps).
- **Assumes:** the registration campaign ran; policy 3 is protecting registration.
- **Watch out:** guests (policy 8), break-glass (exclude), non-interactive / service
  sign-ins. This is the policy most likely to generate helpdesk calls — time it, and have
  the pilot group be people who'll tell you what broke.
- **Target state:** "any MFA" is the starting bar, not the finish line. Once this is
  enforced and passkey/FIDO2 registration is broad, raise the authentication strength on
  this policy to **Phishing-resistant MFA** for everyone — that's where CISA SCuBA and
  Microsoft's own guidance point. Sequence it *after* enforcement, never before: pushing
  passkeys org-wide while MFA-for-all is still in report-only is how you strand people.
- **Rollout:** report-only, watch the "would have required MFA" volume, pilot, then all.

### 5. Require a managed device for desktop sessions — browser + modern clients

- **Why:** MFA proves *who*. Device compliance proves the *endpoint* is patched, encrypted
  and enrolled. Together they're the Zero Trust baseline for access from a real computer.
  Grant control: **compliant device OR Hybrid AD joined device**.
- **Assumes:** Intune (or hybrid join) deployed with meaningful compliance policies.
- **Watch out:** macOS / Linux, contractors on their own kit (policy 6 handles them),
  kiosk/shared devices. Note: **"Require approved client app"** went read-only for new and
  edited policies on 30 June 2026 — use **"Require app protection policy"** instead.
  Existing enabled policies that use it keep enforcing.
- **Rollout:** start with the most sensitive apps (finance, HR, admin portals), expand.
  Report-only is essential — but a report-only compliant-device policy triggers repeated
  certificate-selection prompts on macOS/iOS/Android, so exclude those platforms from the
  report-only version.

### 6. Contain unmanaged devices — MFA + short sign-in frequency + no persistent browser

- **Scope:** all users, browser, "device is not compliant and not hybrid joined".
- **Why:** don't block BYOD outright, but an unmanaged browser session shouldn't last 90
  days or leave refresh tokens on a personal laptop. This contains it.
- **Optional add:** Conditional Access App Control (Defender for Cloud Apps) to block
  downloads in-session — keeps data off the device entirely.
- **Watch out:** on personal (Entra-registered) devices, unlocking the device doesn't
  satisfy sign-in frequency the way it does on joined/hybrid-joined devices, so users get
  prompted on the interval — keep it to a few hours, not minutes, and don't use "every
  time" without MFA (looping risk). If the tenant still has the legacy "Remember MFA on
  trusted devices" setting on, turn it off before using sign-in frequency.
- **Rollout:** report-only, enforce alongside policy 5.

### 7. Risk-based — two policies (Entra ID P2)

- **7a. Sign-in risk medium/high → require MFA + reauthenticate.** Catches "the credential
  works but the sign-in looks wrong" — impossible travel, anonymous IP, leaked
  credentials. Microsoft's current template pairs the MFA requirement with sign-in
  frequency = *every time*, so the user re-proves identity there and then (target High and
  Medium).
- **7b. High user risk → require risk remediation.** Microsoft's current template uses the
  **Require risk remediation** grant control: it auto-applies an authentication strength
  and sign-in frequency = *every time*, and it works for passwordless users (a password
  change is meaningless without a password). The older **MFA + secure password change**
  (with **AND**) still works for password-only estates. Either variant must target *all
  resources* and can only carry user, app and user-risk conditions.
- **Assumes:** Entra ID P2. No P2? Skip layer 7 — 1–6 stand on their own. Users must have
  registered MFA before a risky session hits them (a risky session is blocked from
  registering). Confirm SSPR is fully working before enforcing the password-change variant.
- **Rollout:** report-only 2–4 weeks minimum, review the risk detections, then enforce.
  Risk policies lock people out more unexpectedly than any other.

### 8. Guest & external access → MFA + Terms of Use

- **Why:** guests authenticate in their home tenant; you can't assume they've done MFA.
  Require it at your resource. Terms of Use gives an auditable acceptance.
- **Assumes:** cross-tenant access settings reviewed — you can trust MFA claims from partner
  tenants to cut prompt fatigue.
- **Watch out:** B2B one-time-passcode users, guest redemption flows.
- **Rollout:** report-only, then enforce. (Microsoft's own phased plan does guest MFA
  early, in Phase 2 — we place it eighth only because it's a smaller population than the
  internal rollout. Do it whenever your all-users MFA policy is stable.)

### 9. Restrict device code flow — all users

No longer a nice-to-have. Microsoft's line is "block device code flow wherever possible";
it ships in Security Defaults, it's a Microsoft-managed policy, and it's in Microsoft's
own Phase 3. Device code flow exists for input-constrained devices (a conference-room
display, a CLI on a headless box); attackers abuse it by starting the flow themselves and
social-engineering a user into completing it.

- **Policy:** CA → *Conditions → Authentication flows → Device code flow → Block*, all
  users, with a tightly scoped exclusion group for the genuine device-code use cases
  (Teams Rooms have specific guidance; the Device Registration Service may also need
  excluding from an all-resources policy).
- **Sibling:** *Authentication transfer* (QR-code hand-off of a session from one device to
  another) — same conditions screen, block it unless you have a reason not to.
- **Watch out:** *protocol tracking* — once a session has used device code flow it stays
  tracked, so the block can also stop later non-device-code requests in that session.
- **Rollout:** report-only first — check the *Authentication flows* column in sign-in
  logs for legitimate device-code sign-ins before you enforce.

---

## Ordering note

Admins-first (2 before 4) is a deliberate choice: smallest blast radius, highest value, and
a small enough group to walk through phishing-resistant registration by hand. Some people
do the broad MFA rollout first to get coverage fast. In a very small tenant, doing 2, 3 and
4 together is fine — just keep them in report-only together and enforce in that order.

Microsoft's own deployment plan runs this over roughly four weeks (foundation → core
auth → advanced), a week of report-only per policy per phase. That's the realistic clock:
a weekend to get 1–4 into report-only, a few weeks to enforce the whole set. Not a
quarter, not a weekend.

## Cross-cutting rules

- **Break-glass:** two-plus cloud-only Global Administrator accounts on the
  `.onmicrosoft.com` domain, role assigned *permanent active* (not eligible via PIM),
  excluded from every policy that blocks or restricts sign-in, credentials held offline,
  sign-in activity alerted on. Give them a phishing-resistant method (passkey/CBA) that
  *differs* from your normal admin method — and remember the mandatory-MFA floor applies to
  them regardless of exclusions.
- **Contingency policies.** Keep a set of *disabled* backup policies ready to switch on
  during an identity/MFA outage, named so they stand out, e.g.
  `EM01 - ENABLE IN EMERGENCY: MFA disruption [1/3] - ...`.
- **Protect policy changes.** Turn on *protected actions* so creating, editing or deleting
  a CA policy needs a fresh MFA / step-up.
- **Never straight to ON.** Report-only → pilot group → all, every time.
- **Name policies consistently:** Microsoft's components are sequence number, apps,
  response, who and when — e.g. `CA01 - All - Block legacy auth - ON`. Pick a format and
  hold to it; there's no owner field, so encode the owning team in the name too.
- **Mind the ceiling.** 240 CA policies per tenant across all states — consolidate, don't
  proliferate.
- **Review quarterly.** CA estates drift; exclusions become permanent by accident.
- **Export the JSON.** Keep policy definitions in source control so changes are diffable —
  Microsoft explicitly endorses a policy-as-code workflow with CI.
- **Leave resilience defaults on.** They keep existing sessions alive during a Microsoft
  outage. Disabling them on a group- or role-scoped policy reduces resilience for the
  *whole* tenant.

## After the baseline

Once 1–9 are enforced, the next layer is contextual and risk-driven:

- **Authentication context** — step-up (compliant device, phishing-resistant MFA) on a
  sensitive SharePoint site, a Purview-labelled document, or a PIM role activation, without
  raising the bar for everything.
- **Insider risk** (Purview Adaptive Protection) as a CA condition — tighten access as a
  user's insider-risk level rises.
- **Token protection** — bind the sign-in session token to the device so a stolen token is
  useless elsewhere. GA for native apps (Exchange, SharePoint, Teams) on Windows, iOS and
  macOS; still preview for browsers. Pilot + report-only first.
- **Filter for devices** — target policy by device attributes (model, extensionAttributes)
  for scenarios group membership can't express.
- **Continuous access evaluation** — on by default; only touch it to *disable* for a
  specific break-glass path.
- **Agent identities** (preview) — CA now has agent-risk and agent-execution-environment
  conditions and a dedicated template category for AI agents.

## Deliberately left out of the baseline

- **Location-based blocking as a primary control** — a cloud proxy or VPN changes the IP
  Microsoft Entra sees, so IP allow/deny lists are hard to keep honest; prefer device-based
  controls or Global Secure Access. Named locations are still useful as *trusted
  exclusions* (skip the MFA prompt on the corporate egress). Microsoft *does* recommend the
  "allow known countries, block the rest" pattern as a standard control — we deprioritise
  it here because it's a real project to run well, not because it's wrong.
- **A policy per app** — group sensitive apps and target the group. Add specific policies
  only when a real requirement appears, and mind the 240-policy ceiling.
- **Blocking unknown/unsupported platforms** (ChromeOS etc.) — Microsoft actually
  recommends this ("any platform, exclude the supported ones → block"), and it's a
  template. We treat it as a refinement rather than a foundation, but it's a reasonable
  early add.
