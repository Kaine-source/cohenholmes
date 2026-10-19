---
title: "AI agents don't skip ALM — they just make you watch it happen in real time"
description: "Retiring one tool and rebuilding another on this site surfaced the same lesson twice: build, test and review each catch things the one before it missed, whether the developer is human or an AI agent."
pubDate: 2026-10-19
tags: ["ai", "alm", "governance", "workflow"]
draft: true
---

A few days ago I asked an AI agent to retire one of the tools on this site and
redesign another. Small jobs, the kind you'd hand to a junior dev without much
thought. What I actually got was a live, compressed demonstration of why Application
Lifecycle Management has the stages it has — because every single stage caught
something the one before it missed, and none of them would have caught it on their
own.

> **In short:** build, test and review aren't bureaucracy bolted onto development —
> they're independent checks that fail differently. An AI agent doesn't make that
> redundant. If anything it makes the gaps between stages easier to see, because the
> agent moves fast enough that you watch each one actually earn its place.

## The job: retire one tool, rebuild another

Two pieces of work, done back to back on [cohenholmes.co.uk](https://cohenholmes.co.uk)'s
own repo. First, retire the mail-auth (DMARC builder) tool — properly, not just
delete it. Second, redesign the AI Governance Readiness Check from a long scrollable
form into a one-question-at-a-time flashcard interaction.

Neither is complicated. That's the point — if the lifecycle discipline pays off on a
two-file personal-site change, it pays off everywhere.

## Stage one: plan the rollback before you touch anything

The brief for the retirement was specific: it should exist outside `main`, recoverable,
not gone. The agent's first move, before deleting a single line, was `git branch
archive/mail-auth-tool` at the exact commit where the tool was still live — then
pushed that branch to origin immediately, before the removal commit existed.

That ordering is the whole lesson in miniature. If the branch had been created
*after* the deletion, there'd have been a window where the only copy of a working
tool was whatever was in the agent's working memory of that turn. Branch-first,
delete-second isn't a nicety; it's the difference between a reversible change and an
article of faith that git reflog will save you.

It then grepped the whole repository for every reference to the tool rather than
relying on "the obvious places" — found six files, one of which (a homepage tile) I
genuinely wouldn't have remembered either. Thoroughness here isn't a personality
trait, it's a search command run before editing anything.

## Stage two: build looks done. It isn't, yet

The flashcard rebuild went fine by every measure I could check without actually
running it. The code read cleanly. The automated test suite — which independently
recomputes the page's CSP hash from the built script and asserts it matches the
`<meta>` tag — passed. `npm run build` succeeded.

None of that is nothing. But none of it is "working," either, and the gap between
the two showed up the moment someone actually looked at a screenshot mid-flow: the
"Show my readiness" button was genuinely disabled (the code was correct — it wouldn't
submit) but had zero visual difference from an enabled button, because the disabled
styling only covered a different set of buttons on the page. Invisible in the diff.
Invisible to a test that checks structure, not appearance. Visible in about four
seconds to a human looking at a rendered screenshot.

**Green CI tells you the code does what the tests check. It doesn't tell you the
thing is actually usable.** That's not a limitation of this particular test suite —
it's true of every test suite, which is exactly why "test" and "actually use it" are
different lifecycle stages rather than one box to tick.

## Stage three: review catches what testing didn't think to try

I ran my own functional pass after fixing that — clicking through the flow, checking
the score computed correctly, confirming keyboard arrow navigation worked. It did.
I was satisfied. I pushed it.

An automated code reviewer (Codex, running against the opened pull request) then
found two things my functional pass hadn't thought to try:

1. **A race condition.** The new "tap an answer, auto-advance after 180ms" interaction
   scheduled a timer that read the *current* question index when it fired, not the
   index it was scheduled against. Answer a question, then immediately hit "Next"
   before that 180ms is up, and the stale timer fires afterward and advances *again*
   — skipping a question entirely. I hadn't tried answering-then-immediately-navigating
   because it didn't occur to me as a thing someone would do quickly. It's exactly the
   kind of thing someone does quickly.
2. **Keyboard focus loss.** Every card re-render replaces the DOM, including whatever
   button currently has focus. A mouse user doesn't notice. A keyboard or screen-reader
   user answering via Enter lands on nothing — focus falls out to `<body>`, and they
   have to tab all the way back into the card for every single question. My functional
   test had used mouse clicks throughout. It never exercised the keyboard path at all.

Both are real. Both got fixed, and both got re-verified the same way the first bug
had been caught — by actually driving the interaction, this time specifically
simulating the exact sequences (rapid double-navigation, keyboard-only answering) that
had been missed the first time.

## What this says about AI and ALM, not just about this one PR

The agent that wrote the code is the same agent that reviewed the screenshots, wrote
the functional tests, and fixed the bugs the second reviewer found. One actor, three
different lifecycle roles, worn one after another. What made each role catch
something different wasn't a different brain — it was a different *question being
asked*. Build asks "does this do what I intended." Test asks "does this actually work
when exercised." Review asks "what did the first two miss, from a different angle."
Those are genuinely different questions, and collapsing them into "the agent said it's
done" throws away the entire reason a lifecycle has separate stages in the first
place.

This is the same thread as the [AI governance piece](/blog/ai-governance-keeping-pace)
I've just written: the discipline that was already necessary doesn't become optional
once AI is doing the work faster. It becomes the only thing standing between "looks
done" and "is done" — because the agent will move through every stage you give it
permission to skip, just as confidently whether that's the right call or not. Give it
the full lifecycle, with independent checks at each stage, and it'll show you exactly
where each one earns its keep. Skip a stage, and you won't find out it mattered until
whatever it would have caught ships.

The retirement and the rebuild are both live in
[PR #43](https://github.com/Kaine-source/cohenholmes/pull/43) if you want the actual
diffs, commit-by-commit, rather than my summary of them.
