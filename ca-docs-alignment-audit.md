# CA content alignment audit — vs Microsoft Learn (2026-09-03)

Scope: `ca-baseline-model-DRAFT.md`, `blog/ca-where-to-start.md`, `public/ca-builder.html`
checked against the Microsoft Entra Conditional Access documentation set
(`learn.microsoft.com/en-us/entra/identity/conditional-access/` + related pages, all
carrying ms.date March–August 2026).

**Verdict:** alignment is strong. Nothing is dangerously wrong. Six accuracy fixes, eight
currency updates, a handful of additions, three editorial divergences to flag. The layer
model maps almost 1:1 onto Microsoft's own 3-phase deployment plan and "Secure foundation"
template set.

---

## 1. Confirmed correct — do not change

| Claim in our content | Microsoft source |
| --- | --- |
| Custom CA needs Entra ID P1 (Business Premium / E3 / E5 / F3); risk-based needs P2 | `overview` |
| Classic policies stopped enforcing **10 July 2024**; can't re-enable after disable | `concept-conditional-access-policy-common` |
| "Require approved client app" → **read-only 30 June 2026**; existing enabled policies keep enforcing; use "Require app protection policy" | `migrate-approved-client-app` (note: the `concept-conditional-access-grant` page still says "early March 2026" — it is **stale**; our date is the authoritative one) |
| "Require MFA" and "Require authentication strength" cannot be combined in one policy | `concept-authentication-strengths` ("Unsupported combination of grant controls") |
| Built-in strengths: Multifactor authentication / Passwordless MFA / Phishing-resistant MFA (passkey-FIDO2, WHfB/platform credential, CBA multifactor); IDs …002 / …003 / …004 | `concept-authentication-strengths` |
| Authentication context = **c1–c99**, read-only ID, "Publish to apps", tagged by Purview labels / SharePoint sites / MDCA session policy / PIM activation / custom apps | `concept-conditional-access-cloud-apps` ("up to 99 authentication context definitions (c1-c99)") — our on-page "Where the IDs come from" explainer matches this step-for-step |
| `conditions.insiderRiskLevels` is a single string (minor/moderate/elevated); Purview Adaptive Protection | `concept-conditional-access-conditions` + Graph |
| Break-glass: **two** cloud-only Global Admin accounts, excluded from policies, offline creds, sign-in alerts, phishing-resistant method (passkey/FIDO2 **or** CBA), tested quarterly | `security-emergency-access`, `security-defaults` ("two cloud-only emergency access accounts permanently assigned the Global Administrator role") |
| Mandatory MFA: Phase 1 (Oct 2024) portals; Phase 2 (**Oct 1 2025**) CLI/PowerShell/mobile/IaC/REST for **create/update/delete only** (read exempt); management surface only; **CA exclusions do not apply**; break-glass need a real MFA method | `concept-mandatory-multifactor-authentication` — exact match, including the read-exempt nuance |
| Report-only → pilot group → all; exclude break-glass; ≥1 week report-only per policy; consistent naming; export JSON / policy-as-code with source control + CI; quarterly review | `plan-conditional-access` (Microsoft's own 3-phase Week 1–4 model) |
| Broad MFA policy targets **all resources, no app exclusions** ("every exclusion is a low-privilege gap") | `concept-conditional-access-cloud-apps` — and reinforced by the low-privilege-scope enforcement change rolling out from March 2026 |
| Block legacy auth = client apps **Exchange ActiveSync clients + Other clients**, grant **Block**, report-only first | `policy-block-legacy-authentication` |
| Secure MFA registration = CA policy on the **Register security information** user action, exclude trusted locations, require MFA / auth strength; TAP for new starters | `policy-all-users-security-info-registration` |
| Session-control Graph shapes: `disableResilienceDefaults`, `cloudAppSecurity.cloudAppSecurityType` (monitorOnly/blockDownloads/mcasConfigured), `persistentBrowser.mode` (always/never), `signInFrequency` everyTime | `concept-conditional-access-session`, `resilience-defaults` |
| Sign-in frequency default = **90 days**; CAE on by default (disable only for a break-glass path); resilience defaults on by default | `concept-session-lifetime`, `concept-continuous-access-evaluation`, `resilience-defaults` |
| "Azure management (well-known app)" = `797f4846-ba00-4fd7-ba43-dac1f8f63013` (Windows Azure Service Management API) | `concept-conditional-access-cloud-apps` |
| CA is Microsoft's Zero Trust policy engine; "verify explicitly" + "assume breach" | `overview` (but see editorial note E1) |

---

## 2. Accuracy fixes

### C1 — The "sign-in frequency + phishing-resistant strength double-prompt" claim is not supported

**We say** (baseline L6, blog L6): *"a short sign-in frequency combined with a phishing-resistant strength can double-prompt (known Microsoft quirk)."*

**Microsoft actually documents** (`concept-session-lifetime`, `concept-authentication-strengths`):
- Strength + sign-in frequency can be satisfied at **two different times** — a leniency, the opposite of double-prompting.
- Sign-in frequency **"every time" without MFA** → risk of **sign-in looping**.
- If the legacy **"Remember MFA on trusted devices"** setting is on, it must be turned off before using sign-in frequency or users get "prompted unexpectedly".
- On Entra-**registered** (personal/BYO) devices, unlocking the device **does not** satisfy sign-in frequency (it does on joined/hybrid-joined), so users on personal devices get prompted on the interval.

**Fix:** replace the line with: *"On personal (Entra-registered) devices, unlocking the device doesn't satisfy sign-in frequency, so users get prompted on the interval — keep it to a few hours, not minutes, and never 'every time' without MFA (looping risk). If your tenant still has 'Remember MFA on trusted devices' enabled, turn it off before using sign-in frequency."*

### C2 — High-user-risk remediation: the recommended template moved from "MFA + password change (AND)" to "Require risk remediation"

**We say** (baseline L7b, blog L7): *"High user risk → secure password change (MFA + password change, with AND — Microsoft's rule)."*

**Microsoft** (`policy-risk-based-user`, now titled "Require remediation for risky users"): the documented template uses the **"Require risk remediation"** grant control, which auto-selects **Require authentication strength** and **Sign-in frequency: Every time**, and *"covers both password-based and passwordless users."* The MMP "Require remediation for high-risk users" precedence: *"Require risk remediation overrides Require password change, and Block overrides all others."* "MFA + password change" still exists on the grant-controls page but is no longer the recommended template and doesn't work for passwordless users (a password-change flow is meaningless without a password).

**Fix:** lead L7b with **"Require risk remediation"** (auto-applies auth strength + reauth, works for passwordless). Keep "MFA + password change with AND" as the legacy variant for password-only estates. **CA Builder:** add a `riskRemediation` grant control.

### C3 — "Legacy auth is a bypass to every other policy" is imprecise

**We say** (baseline L1, blog L1, builder model card 01): *"Every other policy on this list has a bypass until [block legacy auth] is in place."*

**Microsoft** (`concept-conditional-access-conditions`): *"Sign-ins from legacy authentication clients don't support MFA and don't pass device state information, so they're **blocked by** Conditional Access grant controls, like requiring MFA or compliant devices."* So an MFA-for-all / all-client-apps policy already blocks legacy auth (the legacy client can't satisfy MFA). Legacy auth is a "bypass" only for policies scoped to modern clients.

**Fix:** *"Legacy protocols can't do MFA or device checks. An MFA-for-all policy blocks them as a side effect, but a dedicated block-legacy policy is cleaner, explicit, auditable, and covers apps you don't gate with MFA — it's Microsoft's first 'Secure foundation' policy."* Legacy auth stays layer 1; only the "bypass" wording changes.

### C4 — "credential check" → "first-factor authentication"

**We say** (blog + figure 1): *"runs after the credential check and before the token is issued."*

**Microsoft's canonical phrasing** (repeated on `overview`, `policy-block-legacy-authentication`, `concept-assignment-network`): *"Conditional Access policies are enforced **after first-factor authentication is completed**."*

**Fix:** *"after the first factor (password, passkey, or federated sign-in) and before the token is issued."* Update figure 1's caption too.

### C5 — Report-only for user-action policies (layer 3) needs a caveat

**We say** (baseline L3 rollout): *"report-only, confirm your onboarding flow still works, then enforce."*

**Microsoft** is internally inconsistent: `concept-conditional-access-report-only` says report-only works for "most" policies *"except for items included in the 'User Actions' scope"*, while `policy-all-users-security-info-registration` explicitly tells you to save the policy in report-only. Resolution: the policy **can** be created in report-only, but the impact/workbook telemetry for user-action policies is thin.

**Fix:** add to L3 — *"Report-only insight data is limited for user-action policies; validate by having a pilot user actually run through registration, not just by reading the workbook."* Also flag the separate report-only gotcha (from `concept-conditional-access-report-only`): report-only policies that require a compliant device can trigger repeated **certificate-selection prompts** on macOS/iOS/Android — exclude those platforms from report-only device-compliance policies.

### C6 — The CA Builder's on-page "baseline model" section is out of sync with the DRAFT

The `<section class="model">` in `ca-builder.html` still shows **7 layers, old numbering** (01 legacy → 02 phishres admins → 03 MFA all → 04 managed device → 05 contain unmanaged → 06 risk → 07 guests). It has **no "secure the MFA registration surface" layer** and **no device-code-flow layer**, and its layer 03 is the DRAFT's layer 4.

**Fix:** regenerate that section to match the DRAFT (8 layers + prep + the device-code layer, current numbering). The `data-preset` wiring and the presets themselves are fine — only the card list and numbering are stale.

---

## 3. Currency updates — Microsoft has moved; our content is behind but not wrong

### U1 — Device code flow: promote from "Borderline" to standard baseline

Our framing: *"Borderline core / not everyone counts this as baseline."*

Microsoft's 2026 position is unambiguous:
- *"Microsoft recommends blocking device code flow wherever possible"* (`concept-authentication-flows`).
- It's a **Microsoft-managed policy** ("Block device code flow", `managed-policies`).
- It's in **security defaults**, and **mandatory for all new tenants from 1 July 2026** (`security-defaults`).
- It's in the **plan-conditional-access Phase 3 core** list, alongside "Authentication transfer is blocked".

**Fix:** promote it to a numbered layer (or rename the "Borderline" heading to "Standard now" and note it ships in security defaults + the managed policies). Keep the scoped-exception guidance for Teams Rooms / conference devices (`policy-teams-devices-device-code-flow`) and the Device Registration Service exemption (client ID `01cb2876-7ebd-4aa4-9cc9-d28bd4d359a9`). Note the **protocol-tracking** behaviour: once a session uses device code flow it stays "protocol tracked", so the block can affect later non-device-code requests in that session.

### U2 — Microsoft-managed policies (MMPs): mention them as the migration bridge and a baseline shortcut

Microsoft auto-creates MMPs in eligible tenants in **report-only**, then turns them on **≥30 days later** (2-week email/Message-center notice). Current set (`managed-policies`, updated 2026-08-08): Block legacy authentication · Block device code flow · MFA for admins accessing Microsoft admin portals · MFA for all users · MFA for per-user-MFA users · MFA + reauthentication for risky sign-ins · Block access for high-risk users · Require remediation for high-risk users · Require phishing-resistant authentication for admins · Block high-risk agent identities (preview). Admins can exclude users and toggle state; can't rename or delete. **Exclude break-glass from them too.**

The **"upgrade from security defaults"** MMP set (Block legacy auth, MFA for Azure management, MFA for admins, MFA for all users) is the documented answer to the Security-Defaults→CA gap: *"After administrators disable security defaults, organizations should immediately enable Conditional Access policies... Microsoft-managed Conditional Access policies are available to maintain the same protections"* (`security-defaults`).

**Fix:** add to "Before you touch anything" — *"Microsoft now auto-creates some CA policies (Microsoft-managed policies) in report-only and enables them after ~30 days. You'll find policies you didn't make. They're both your baseline shortcut and your bridge off Security Defaults — read them, exclude break-glass, and decide to adopt or replace."* This is also the fix for the "Where to actually start" gap (§6).

### U3 — Cite Microsoft's "Secure foundation" template set

`concept-conditional-access-policy-common` has a **"Secure foundation"** category: *"Microsoft recommends these policies as the base for all organizations. Deploy these policies as a group."* — MFA for admins · Securing security info registration · Block legacy authentication · MFA for admins accessing Microsoft admin portals · MFA for all users · **MFA for Azure management** · Require compliant/hybrid/MFA for all users · Require compliant device.

Our baseline maps well but is missing an explicit **"MFA for Azure management"** layer and the **"MFA for admins accessing Microsoft admin portals"** template (both partly moot under mandatory MFA, but Microsoft still lists them).

**Fix:** add a short "how this maps to Microsoft's templates" note; consider a brief "MFA for Azure management" mention (or note it's now covered by mandatory MFA + the MMP).

### U4 — "All cloud apps" is now "All resources (formerly 'All cloud apps')"

Portal terminology change across all pages. Graph value unchanged (`includeApplications: ["All"]`). Blog/DRAFT mostly already say "all resources" (good). **CA Builder** dropdown still says "All cloud apps".

**Fix:** CA Builder dropdown label → "All resources".

### U5 — The "Locations" condition is now "Network"

`concept-assignment-network`: *"The Location condition moved and was renamed Network."* Graph unchanged (`conditions.locations`, `includeLocations`/`excludeLocations`, values `All` / `AllTrusted` / GUID). There's also an "All Compliant Network locations" option (Global Secure Access) we don't expose.

**Fix:** CA Builder label "Locations" → "Network (locations)". Optional: add "All Compliant Network locations".

### U6 — Risk-based sign-in policy now pairs MFA with reauthentication

Our L7a: *"sign-in risk medium/high → require MFA."*

`policy-risk-based-sign-in`: **High and Medium**, grant = Require authentication strength (Multifactor authentication), **session = Sign-in frequency: Every time**. The MMP is literally "Multifactor authentication **and reauthentication** for risky sign-ins."

**Fix:** add "+ reauthenticate (sign-in frequency: every time)" to L7a.

### U7 — Risk policies block MFA registration during risky sessions

`policy-risk-based-sign-in`: *"The sign-in risk-based policy prevents users from registering MFA during risky sessions. If users aren't registered for MFA, their risky sign-ins are blocked"* (AADSTS53004 / 53003). Worth a line in L7 — it's why the MFA registration campaign (prep) has to land before risk policies.

### U8 — AI agent identities in CA (Preview)

New "AI Agents" template category; "Agent risk" and "Agent execution environments" conditions; agent-targeted grant behaviour (Block only for agent *identities*; compliant-device for agent *users* on managed endpoints). All Preview. Optional one-liner in "After the baseline".

---

## 4. Recommended additions (gaps vs Microsoft guidance)

- **A1 — Contingency CA policies.** Microsoft (`plan-conditional-access`, `security-emergency-access`): keep **disabled** backup policies ready to enable during an identity/MFA outage, named e.g. `EM01 - ENABLE IN EMERGENCY: MFA Disruption [1/4] - ...`. We don't mention this. Add to "Cross-cutting rules".
- **A2 — Protected actions.** *"Enable protected actions to require additional verification before anyone creates, modifies, or deletes Conditional Access policies."* Add to "Cross-cutting rules".
- **A3 — 240-policy-per-tenant limit** (all states). One line under "Cross-cutting rules" — supports our "don't do a policy per app" position.
- **A4 — Break-glass refinements** (`security-emergency-access`): use the `.onmicrosoft.com` domain; PIM assignment **permanent active, not eligible**; use a **different** auth method from your normal admin accounts; the exclusion technically only needs to cover policies that **block or restrict sign-in** (report-only policies don't need it).
- **A5 — Resilience defaults: leave them ON.** The CA Builder has the toggle but no guidance. Add: *"leave resilience defaults enabled (default). Disabling them on a group- or role-scoped policy reduces outage resilience for the whole tenant — scope such a policy to individual users if you must disable."*
- **A6 — Template gotcha.** *"Conditional Access template policies exclude only the user who creates them"* — you must edit the policy after creation to exclude your break-glass group.
- **A7 — CA Builder feature gaps:** add `riskRemediation` grant control; add a token-protection session control (`secureSignInSession` / token protection is now **GA** for native apps on Windows/iOS/macOS for Exchange/SharePoint/Teams, preview for browser+ARM); add `frequencyInterval: "timeBased"` to the time-based sign-in-frequency JSON output (currently emits `value`+`type` without it); consider an "authentication flows" condition for device code flow.

---

## 5. Editorial divergences — defensible, but flag where we're more opinionated than Microsoft

- **E1 — "CA is deliberately not least privilege."** `overview` lists CA as helping align with **all three** Zero Trust pillars, including least privilege. Our sharper claim is a reasonable expert distinction, but state it as our framing, not as fact: *"CA is primarily the verify-explicitly / assume-breach engine; least privilege lives mostly in PIM and entitlement management."*
- **E2 — Per-country / location blocking.** Our "Deliberately left out" is fairly dismissive. `plan-conditional-access` **Recommendations** actively endorses the *"allow known countries, block the rest"* pattern, and it's a template. Our caveats (noisy, VPN/proxy changes the observed IP, prefer device controls) match `concept-assignment-network`, but acknowledge Microsoft recommends it and frame ours as a deliberate deprioritisation.
- **E3 — Block unknown/unsupported device platforms.** Our "Deliberately left out" calls it "a tidy-up, not a foundation." `concept-conditional-access-conditions`: *"Microsoft recommends creating a Conditional Access policy for unsupported device platforms"* — and it's in the Zero Trust + Remote work template categories. Flag the divergence.

---

## 6. The "Where to actually start" fix (now fully sourced)

- You **cannot create any CA policy — even report-only — while Security Defaults is enabled** (`security-defaults`, `plan-conditional-access`). Disabling Security Defaults is a hard prerequisite.
- Disabling Security Defaults with your policies only in report-only leaves an **unprotected window** (report-only doesn't enforce).
- **Microsoft's documented bridge** (`security-defaults`): *"After administrators disable security defaults, organizations should immediately enable Conditional Access policies to protect their organization. Microsoft-managed Conditional Access policies are available to maintain the same protections, covering blocking legacy authentication, requiring MFA for Azure management, requiring MFA for admins, and requiring MFA for all users."*
- So the corrected guidance: **disable Security Defaults and, in the same change, keep MFA coverage continuous** — either let the Microsoft-managed "upgrade from security defaults" policies carry it, or enforce your own "MFA for all" immediately. Put the higher-lockout-risk layers (managed device, contain-unmanaged, risk-based) in report-only and soak them.
- Also fix the timeline: Microsoft's own plan is **Week 1–4** with ≥1 week report-only per policy per phase. "A weekend of work, not a quarter" should become *"a few weeks, not a quarter"* (or "a weekend to get 1–4 into report-only; a few weeks to enforce the lot").
- And correct the prep-section bullet — *"Don't [disable Security Defaults] until policy 1–4 are at least in report-only"* is impossible; it should be *"Disable Security Defaults and keep MFA enforced through the switch (Microsoft-managed policies, or enforce policy 4 immediately) — don't leave a report-only-only gap."*

---

## 7. Per-artifact action list

### `ca-baseline-model-DRAFT.md`
- C1 sign-in frequency wording (L6) · C2 risk remediation (L7b) · C3 legacy-auth "bypass" wording (L1) · C5 report-only caveat + cert-prompt gotcha (L3)
- U1 promote device code flow · U2 add MMP note to prep · U3 template-mapping note + "MFA for Azure management" · U6 reauth on L7a · U7 registration-blocked-during-risk note
- A1 contingency policies · A2 protected actions · A3 240-policy limit · A4 break-glass refinements · A5 resilience defaults line
- §6 "Where to start" + prep-bullet rewrite · E1 soften least-privilege claim · E2/E3 acknowledge Microsoft's position

### `blog/ca-where-to-start.md` (and the Medium draft)
- C1 · C2 · C3 · C4 (+ figure 1 caption) · §6 rewrite · "weekend" → "a few weeks"
- U1 device code flow (reframe the "Borderline" section) · U6 reauth line
- E1 soften "not least privilege" · E2 acknowledge the allow-list-countries pattern
- Keep it a post, not a spec — fold these in as tightened sentences, don't bloat it

### `public/ca-builder.html`
- C6 regenerate the on-page "baseline model" section to match the DRAFT
- U4 "All cloud apps" → "All resources" · U5 "Locations" → "Network (locations)"
- A7 add `riskRemediation` grant control; add `frequencyInterval: "timeBased"` to time-based SIF output; consider token-protection session control + an authentication-flows condition
- Disclaimer: the "GUIDs are passed through as entered" line is already gone (good); consider adding "Built-in strength IDs and the Azure-management app ID are well-known and identical in every tenant."
