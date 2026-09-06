# I rebuilt my website with AI agents in six days. Here's what that actually looked like.

Every "I built X with AI" post skips the part I wanted to know when I read them: what did the
human actually do, and where did it go wrong. So here is mine, with those bits left in.

## The setup

I already had a personal site. A flat one-page thing on Cloudflare Pages, the kind you put up
in an afternoon and never touch again. What I wanted this time was different: somewhere that
showed the work rather than describing it. Tools a peer or a recruiter could click through, not
screenshots of tools.

The build ran from 1 to 6 September 2026. Six days, mostly evenings, 41 commits across nine pull
requests. The thing doing most of the typing was Claude Code, a terminal agent that reads the
repository, edits files, runs commands and opens pull requests. GitHub Copilot sat alongside it
as a code reviewer. For a stretch in the middle I also had ChatGPT's Codex connector working the
same repository. More on that shortly.

## What got built

Not just a static site. By the end there were:

- Three interactive tools, each a single self-contained HTML file with no backend. If you run
  Microsoft Conditional Access, the policy builder turns plain-English intent into a named, scoped
  policy. If you're weighing up AI governance, the readiness check scores you across five domains
  in about two minutes. If you own a domain, the mail-auth builder gives you SPF, DKIM and DMARC
  records with a staged path to enforcement that won't blackhole your own mail. Plain-English
  input, live output, nothing submitted anywhere.
- A writing page that pulls my Medium posts through a small server-side function, so the feed's
  missing CORS headers stop being my problem.
- A deployment pipeline: every push to `main` deploys itself, every pull request gets its own
  Cloudflare preview URL posted as a comment, and a validation job checks routing, the
  content-security-policy hashes and every scoring boundary in the governance tool before
  anything merges.
- Branch protection so nothing reaches production without a pull request, plus scheduled agents
  that re-check the site's DNS health, remind me to rotate an API token before it expires, and
  flag a failed deploy.

All of it on free tiers. Cloudflare Pages, GitHub Actions' free minutes, no paid services.

![A left-to-right pipeline of five stages: Local edit (agent, in the repo); Branch and PR
(validate and preview run); Review (Copilot and me), drawn as the highlighted box with the word
"approve"; Merge to main (branch protected); Production (auto-deploys on merge). An offshoot
from Production reads "failed deploy, I get pinged". Caption: every change is a pull request;
nothing merges without a green check and the review step; nothing deploys except a merge to
main.](diagrams/blog2-pipeline.png)

That list is longer than what I set out to build. The scope crept, in a good way. Once the
deploy pipeline existed, adding previews was cheap. Once previews existed, the second tool was
mostly "do that again, for this." Agents are very good at "do that again, for this."

## Three agents was one too many

Claude Code drove. Copilot reviewed. Both live inside GitHub, both leave their output where the
work is. That part worked.

The mistake was adding Codex to the same repository at the same time. The idea was appealing:
parallel agents, different strengths. But two orchestrators pushing branches at one `main` is a
tax you pay every session. Each starts cold. Each has to be told what the other changed. When I
turned on the rule that requires review threads to be resolved before a merge, Codex's review
bot started leaving comments that blocked merges Claude was trying to land, and I was the one
manually unpicking it.

I consolidated to two pillars and a person: Claude Code builds and drives, Copilot reviews, I
approve and merge. One place, one flow. If I want a second opinion I ask for one, I don't run a
second agent in the same room.

## The moment I said no

Partway through, one of the assistants proposed a "collaboration workflow" for the
non-production files. The assistants would classify their own changes as "safe to prototype" or
"needs sign-off", and record traceability by writing `Author: [tool] / Date: / Context:`
comments into the files themselves. Fewer check-ins with me, with a self-written comment
standing in for approval.

I stripped it out. A comment a tool writes into a file is not an audit trail, and the judgement
of what needs my sign-off is not something I delegate to a rule in a markdown file. That call
stays with me every time. I also asked the agents to flag it if similar "reduced oversight"
framing turned up again, rather than quietly adopting it.

This is the part I would underline for anyone doing this. The agents are fluent and confident,
and it is very easy to let the review step erode because everything looks fine. It usually is
fine. The one time it isn't is the whole reason the step exists.

## What went wrong, and how I found out

- I set a Cloudflare API token to "no expiration" by accident. It's the leftmost option in the
  dialog. I caught it a few minutes later, generated a 90-day one, and scheduled a reminder to
  rotate it before it lapses.
- My GitHub account was on a personal email address, so early command-line commits could have
  carried it into public history. Fixed with the "block command-line pushes that expose my
  email" setting and a switch to the no-reply address. The history turned out clean anyway.
- A diagram in my last post still said "credential check" after I had changed the surrounding
  text to "first factor". The agent had regenerated one figure and not the other. I only noticed
  on a re-read.

The pattern: the tooling caught most of it. A failing check, a rejected push, a validation job.
The stale diagram I caught by reading. Neither of those substitutes for the other.

## What AI was good at, and what it wasn't

Good at: plumbing. The Actions workflows, the preview job, the DNS records, pinning third-party
actions to commit hashes and wiring up Dependabot to keep them current. All of that is fiddly,
well documented, and exactly what an agent does faster and more completely than I would by hand.
It is also good at catching its own inconsistencies once you ask it to look, and at holding
context across a long session.

Not good at: knowing what to build. It will build the wrong thing well and cheerfully. It needs
a person holding the intent, saying "no, smaller" and "that's not the point." And it cannot test
what it cannot see. The Cloudflare previews sit behind an access login, so the agent could not
click through them. I had to log it in or check myself.

## If you're doing this

Keep the review step even when it feels like ceremony. Pick one agent to drive and don't run two
against the same repository. Put the human's approval on the irreversible actions and nowhere
else. Treat every output as a draft you edit.

The three tools on the site are the proof it worked. They are not the story. The story is that
six days of an agent's output only became a website because someone stayed the editor.
