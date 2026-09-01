I need you to investigate the status of ca-builder.html in the cohenholmes project and review a design plan doc that GitHub Copilot has been editing.

## 1. Investigate ca-builder.html

We built an interactive Conditional Access Policy Builder (ca-builder.html) in a previous session — it produced live Graph-style JSON output and plain-English summaries, and was deployed via Cloudflare Pages. GitHub Copilot has since reported it can't find it anywhere in the workspace.

Please check:

- `git log --all -- ca-builder.html` — was it ever committed, and if so, is there a deletion commit?
- Does it exist in the current working tree, even if not linked from nav?
- Check Cloudflare Pages deployment history to confirm whether it was ever actually served live on the production domain, not just committed locally
- If it's genuinely gone: was it deleted deliberately during a rebuild, or dropped by accident?

Report back what you find before we decide whether to restore, rebuild, or drop the feature.

## 2. Review the attached design plan doc

Copilot added sections 6–9 to a homepage design plan doc. I want your take on two things:

**Section 6** treats the CA Builder as a "future-facing concept" that may not exist yet, based on Copilot not finding it. Once you've confirmed the actual status from part 1, this section needs to be corrected or removed — don't let a wrong premise drive the design plan.

**Sections 7–9** propose a "collaboration workflow" where you and Copilot can iterate on non-production files with reduced check-ins, using a self-written `Author: [tool] / Date: / Context:` comment format as a stand-in for approval/traceability. I don't want that adopted. Any comment a tool writes into a file isn't a real audit trail, and I don't want either of you self-certifying what counts as "safe to prototype" vs what needs my sign-off — that judgement stays with me every time, not delegated via a framework baked into a markdown file.

Please:
- Confirm ca-builder.html's actual status and correct section 6 accordingly (or remove it)
- Strip sections 7-9 entirely
- Flag it clearly if you see similar "reduced oversight" framing show up again in future docs from Copilot or otherwise, rather than quietly going along with it

Let me know what you find on the git/deployment history first, then I'll confirm next steps before anything gets rebuilt or restored.
