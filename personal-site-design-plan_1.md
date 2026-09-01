# cohenholmes.co.uk — Design Plan (Homepage Refresh)

**Purpose:** Merge the copy/structure from `personal-site-draft.html` into the existing live design system. Do not treat the draft as a standalone theme — it uses the wrong fonts and palette and must be reskinned.

---

## 0. Decisions locked (2026-08-29, Kaine)

- **Homepage:** move to the draft's copy/voice (drops the "consultant / control plane" corporate framing). Reskinned into the Fraunces / IBM Plex Mono / Inter + paper-ink + signal-blue system per §1. Done — `index.html` rewritten. Previous versions saved in `backup-2026-08-29/`.
- **CA Builder:** rebuild from scratch — nothing recoverable in the workspace or GitHub, historical Cloudflare deployments are behind Access and not worth chasing. Done — `ca-builder.html` built as a self-contained interactive builder (plain-English input → live Graph `conditionalAccessPolicy` JSON + readable summary). Framed on the page as a "learning / demo tool", not a validated product.
- **Not yet deployed.** These are local changes only; nothing pushed to Cloudflare Pages until Kaine runs the deploy.

---

## 1. Design tokens — USE EXISTING, NOT THE DRAFT'S

The draft introduces a competing palette (`--forest: #2d5b4d`, `--clay: #b66f45`, cream `--bg: #f5f0ea`) and a `"Segoe UI", sans-serif` font stack. **Discard both.** Replace with the live site's established tokens:

```css
:root {
  /* Typography */
  --font-display: "Fraunces", serif;
  --font-mono: "IBM Plex Mono", monospace;
  --font-body: "Inter", sans-serif;

  /* Colour — paper/ink system */
  --bg: /* existing paper background token */;
  --paper: /* existing card/panel token */;
  --ink: /* existing primary text token */;
  --muted: /* existing secondary text token */;
  --line: /* existing border/divider token */;
  --accent: /* signal blue — existing accent token */;
}
```

> Action for Copilot: pull the actual hex values from the live `index.html` / global stylesheet rather than guessing. Do not introduce forest green or clay anywhere.

**Body font:** swap `"Segoe UI", sans-serif` → `var(--font-body)` (Inter) throughout. Headings (`h1`, `.section-head h2`) should use `var(--font-display)` (Fraunces) to match the live hero treatment.

---

## 2. Structural changes to the draft

Keep the draft's section order and copy voice (it's better/more human than what's likely live), but modify as follows:

### Nav
Add a **CA Builder** link. Current nav is About / Focus / Writing / Contact — this is the site's strongest differentiator for job applications and recruiter demos and it's currently missing entirely.

```html
<nav class="nav" aria-label="Main navigation">
  <a href="#about">About</a>
  <a href="#focus">Focus</a>
  <a href="/ca-builder.html">CA Builder</a>
  <a href="#writing">Writing</a>
  <a href="#contact">Contact</a>
</nav>
```

### Focus section
Add a fourth card (or repurpose one) that points at the CA Builder directly — don't make people find it only via nav.

```html
<article class="card">
  <div class="kicker">Tooling</div>
  <p>An interactive Conditional Access Policy Builder — live Graph-style JSON output from plain-English input.</p>
</article>
```

### Writing section
Draft currently just links out to `/writing.html` and Medium. Fine as-is structurally, but the copy should acknowledge it's RSS-synced from Medium (this is a legitimate technical detail worth surfacing briefly, not hiding):

> "Posts here sync automatically from Medium — this page is just a cleaner way to browse them."

### Contact section
Current copy is vague filler: *"available through LinkedIn and other professional channels."* Tighten it and keep it consistent with the no-location/no-personal-contact rule already in place:

> "Best reached on LinkedIn for anything to do with identity, security, or AI."

Keep the LinkedIn button as the only contact CTA. Do not add email, location, or phone.

---

## 3. Colour/style fixes needed line-by-line

| Draft element | Issue | Fix |
|---|---|---|
| `body { font-family: "Segoe UI", sans-serif; }` | Wrong stack | `var(--font-body)` |
| `h1` | No font-family override → inherits Segoe UI | Add `font-family: var(--font-display);` |
| `--forest`, `--forest-soft`, `--clay` tokens | Competing palette | Remove; use existing accent (signal blue) for `.kicker` and `.eyebrow` instead |
| `.card` background/shadow | Uses draft's `--paper`/`--shadow` | Fine structurally, just repoint to live tokens |
| `.button.primary` background `var(--ink)` | OK conceptually | Keep, but confirm ink value matches live site's actual ink, not draft's `#171612` |

---

## 4. What NOT to change

- No location or personal contact details anywhere (matches existing site policy)
- Keep the flat static structure — no build step, this stays plain HTML/CSS
- Don't migrate Medium content — writing page continues to link out via the existing RSS Cloudflare Pages Function
- Don't touch `functions/` or the RSS caching logic — this plan is homepage-only

---

## 5. Suggested Copilot task order

1. Extract actual CSS custom property values from live `index.html`
2. Rebuild draft's `<style>` block using those tokens + Fraunces/IBM Plex Mono/Inter
3. Insert CA Builder nav link + focus card
4. Rewrite Writing and Contact section copy per §2
5. Diff against live site to confirm no visual regression on existing pages (writing.html, ca-builder.html untouched)

---

## 6. CA Builder — status check (Claude)

### What is verifiable in this workspace

- No `ca-builder.html`, no `ca-builder/` folder, and no code implementing it exists anywhere under `C:\Projects` (full tree checked, case-insensitive).
- This project is **not under version control** — there is no git repository in `cohenholmes/` or any parent directory. There is no commit history, no deletion commit, and nothing to `git log`. The only two places the string "ca-builder" appears on disk are this design plan and the task prompt.
- `backup-2026-08-02/` contains only an older `index.html` (the previous "Cohen & Holmes consultancy" site). It does not contain a CA Builder.
- Nothing in the current site references it — no nav link, no Focus card, no `_redirects`/`_headers` (those files don't exist), no live page.

### Cloudflare Pages (checked 2026-08-29)

- `wrangler pages deployment list` returns 10 deployments for `cohenholmes-site`: 6 from ~3 weeks ago, 4 from ~5 months ago. All are direct/CLI uploads (no git source).
- The live custom domain serves a **wildcard fallback**: `/`, `/ca-builder.html`, and a random nonsense path all return the **byte-identical** 5316-byte document (HTTP 200). So the `200` on `/ca-builder.html` is a false positive — there is no distinct `ca-builder.html` resource in the live deployment.
- The deployed page is a single "Identity is the control plane" personal landing page with a **static** monospace `.config` panel (role/focus/certs as plain text). It is **not** the interactive CA Policy Builder — no input, no JSON engine, just the words "Conditional Access" in prose.
- The per-deployment `*.pages.dev` preview URLs are behind Cloudflare Access (`kaine-cohen.cloudflareaccess.com` login), so the contents of the 10 historical deployments have not been inspected (confirmed 2026-08-29: the built-in browser hits the same Access email-code wall). Even if an old one contained the file, it is not reachable at `cohenholmes.co.uk/ca-builder.html` today because of the wildcard fallback.

### Live vs local drift (separate issue, worth noting)

The deployed homepage (5316 bytes, "Identity is the control plane", `.config` panel, "consultancy sandbox retired" note) is **not** the local `index.html` (6752 bytes, "I write about security, identity, and the strange, useful edges of AI", "What I'm learning" section). Neither matches `personal-site-draft.html`. With no git there's no history to reconcile them — Kaine to confirm which is the intended base before this plan's edits land anywhere.

### Implication for this plan

Sections 2 and 5 assume `ca-builder.html` exists and can be linked from nav and a Focus card. Confirmed: it does not exist in this workspace, it is not deployed as a real resource, and there is no local record it ever did. Those references are **blocked pending Kaine's decision** — rebuild from scratch, attempt recovery from a historical Cloudflare deployment (needs Kaine's Access login), or drop the feature. They must not be built out on the assumption the file is present. No "future-facing concept" framing is being adopted in place of that decision; the call is Kaine's.

---

## 7-9. Removed

Sections 7 ("Collaboration workflow for Copilot + Claude"), 8 ("Claude operating rules"),
and 9 ("Release gate checklist") were removed by Kaine on 2026-08-29.

Reason: they set up a framework where the assistants self-classify changes as "safe to
prototype" vs "needs sign-off" and self-certify traceability via `Author: / Date: / Context:`
comments written into files. A comment a tool writes into a file is not an audit trail, and
the judgement of what needs Kaine's approval is not delegated to a rule set in a markdown
file — it stays with Kaine every time. Do not re-add these or equivalent "reduced oversight"
framing; flag it to Kaine instead.
