---
title: "Is AI governance keeping pace with innovation, or are we kidding ourselves?"
description: "Most AI governance frameworks quietly assume mature identity and data governance already exist underneath them. In most organisations I see, that foundation isn't there yet — and that's the actual gap."
pubDate: 2026-10-19
tags: ["ai", "governance", "security"]
draft: true
---

I asked this question on LinkedIn yesterday and got six likes, two reposts, and
not one comment. That's not nothing, but it's also not the "let's hear real
perspectives" conversation I was hoping to start. So I'm going to answer my own
question first, in public, and leave the invitation open at the end — if you work in
this space and think I've got it wrong, or only half right, tell me. I'll update this
post with your view, credited, rather than let it sit as one opinion pretending to be
a survey.

> **In short:** most organisations aren't failing at AI governance because the
> frameworks are wrong. They're failing because AI governance quietly assumes a
> mature identity and data governance foundation that most organisations — even good
> ones — don't actually have yet. AI didn't create that gap. It just started charging
> rent on it.

## The frameworks aren't the problem

NIST AI RMF, ISO/IEC 42001, the EU AI Act's risk tiers — none of these are badly
written. Read any of them and the substance is sound: know what you're running, assign
ownership, assess risk before and after deployment, keep evidence, give people a way to
flag when something's gone wrong. I built a [readiness check](https://cohenholmes.co.uk/ai-governance-check)
around exactly that shape of question, and nobody who's taken it has told me the
questions feel unreasonable.

What I keep seeing in practice is organisations treating AI governance as a new,
separate discipline — a policy to write, a tool to buy, a checklist to run — bolted on
top of whatever already existed. And what already existed, in a lot of mid-market
tenants I work in, is this: permissions that were never cleaned up, a SharePoint and
OneDrive sharing model nobody's audited in years, service accounts with more access
than any human would be given, and no real inventory of what's connected to what.

Copilot and agentic tools don't create that problem. They index it, surface it, and
act on it faster than a person would have. An AI agent that can read everything a
user's account can read isn't a new risk category — it's the old over-permissioning
problem, now with a much faster reader attached.

## What I actually see, walking into a tenant

Four things come up often enough that I'd call them the real gap, not the exception:

**Nobody can say where the sensitive data actually is.** Not in a "we have a DLP
policy" sense — in a "if I ask you to name the five SharePoint sites an AI agent
absolutely should not be able to touch, can you name them in under a minute" sense.
Most can't, and Purview sensitivity labels that exist only in a policy document don't
change that.

**Agents and integrations don't have an identity model.** A human has a name, a
manager, an access review, an offboarding process. A service principal or an agent
connector frequently has none of that — it was set up once, given broad permissions
because narrowing them was fiddly, and nobody's looked at it since. Conditional Access
policies get built around users and devices; the same rigour rarely gets applied to
what's effectively a non-human identity with its own reach into the tenant.

**There's no inventory.** Not of models, not of use cases, not of which team is using
which tool with which data. You can't govern what you can't name, and most
organisations I've asked genuinely don't have a list — not a bad list, no list.

**Nobody's told people when they're actually supposed to check the output.** Everyone
agrees "human oversight" matters in the abstract. Far fewer organisations have said,
concretely, which categories of AI-assisted output need a second pair of eyes before
they go external, and who that second pair of eyes belongs to.

None of these four are AI problems. They're identity and data governance problems that
AI adoption is now making visible and urgent, because the systems touching that mess
are faster and more far-reaching than the humans who used to be the bottleneck.

## Why this matters more for mid-market than enterprise

Large enterprises usually have *some* of this foundation already — an identity team,
a data governance function, people whose job is exactly the unglamorous plumbing work
above. It's mid-market organisations, the ones running Microsoft 365 Business Premium
with Entra ID P1 and no dedicated security headcount, where I see the gap most sharply.
They're adopting Copilot and agent tooling at the same pace as everyone else, often
genuinely enthusiastically, without the underlying identity and data hygiene that the
frameworks quietly assume is already solved.

That's not a reason to slow down adoption. It's a reason to sequence it properly:
fix the access model and know your data before you widen what can read it, not after.

## The invitation, still open

I'd still like to hear from people actually doing this work — CISOs, AI governance
leads, security specialists, anyone navigating this inside a real organisation rather
than from a vendor deck. Tell me where I've got this wrong, or what I'm missing from a
sector or scale I don't see often. Comment, message me, or just reply to the original
post — I'll fold genuine perspectives into an update here, credited, because a
roundtable beats a monologue every time I can actually make one happen.

And if you want a concrete starting point rather than another framework summary, the
[AI Governance Readiness Check](https://cohenholmes.co.uk/ai-governance-check) on this
site walks through the same four areas above in about five minutes, entirely in your
browser, with nothing submitted anywhere.
