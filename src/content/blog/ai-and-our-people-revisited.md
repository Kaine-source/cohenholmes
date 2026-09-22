---
title: "Revisiting \"AI and Our People\": what's actually changed"
description: "A year and a half ago I wrote about bringing people along with AI. Rereading it now, the cultural argument holds up — but what \"people-first\" actually requires has changed underneath it."
pubDate: 2026-09-22
tags: ["ai", "governance", "agents"]
draft: false
---

I went back and read something I wrote in April 2025, called *AI and Our People*. It's a fine piece — I stand by most of it — but reading it back eighteen months later, it's a bit like finding an old email about "the cloud." Not wrong. Just written before the ground moved.

## What I said then

The argument was simple: AI adoption is a people problem before it's a technology problem. Roll it out without change management and you get low adoption and wasted investment. Invest in your people — their confidence, their skills, their trust — and AI actually helps them do more of what matters. "Your people are your power," I wrote, and meant it.

At the time, "AI" mostly meant a smarter autocomplete. Drafting an email. Summarising a document. Pulling together sources I'd otherwise have gone hunting for myself. A tool, always waiting for me to ask it something, always a human pressing the button.

## What I couldn't have written then

None of that piece mentions agents. It couldn't have — not meaningfully. In April 2025, "an AI agent" was still mostly a demo, not something sitting inside your tenant with permissions of its own.

That's not true anymore. Copilot Studio now lets anyone in an organisation build an agent without writing a line of code, and Microsoft's answer to what that actually means at scale — Agent 365 — went generally available this year. It gives every agent an Entra Agent ID: a real identity, the same kind a user or an application gets, sitting inside Entra, subject to Conditional Access, subject to access reviews, owned by an actual person who's accountable for what it does.

That's the bit worth sitting with. The AI I wrote about in 2025 had no login. The AI most organisations are running today does.

![Comparison diagram: in April 2025 an AI tool had no identity of its own and a human triggered every action; an AI agent today has a real Microsoft Entra Agent ID and is governed by Conditional Access, access reviews and Purview controls.](/blog/diagrams/ai-people-identity-shift.svg)

## The three-word version of what changed

Microsoft frames Agent 365 around three things: observe, govern, secure. It's a tidy way to describe what's actually new:

- **Observe** — you need to know your agents exist at all. A registry, not a guess.
- **Govern** — someone owns each one, with a lifecycle, not a fire-and-forget deployment.
- **Secure** — the same identity, data and threat controls you'd apply to a person now apply to the thing acting on their behalf.

None of that existed as a coherent model when I wrote the original post. It does now, and it's not optional — it's the actual shape of the risk.

## What "people-first" now has to include

The cultural argument hasn't changed. But the specific things I meant by it in 2025 — confidence, upskilling, "don't be afraid of the tool" — were about people *using* AI. They say nothing about the fact that some of your people can now *stand up* an AI that acts under its own identity, in an afternoon, in Copilot Studio, without IT necessarily knowing it exists.

So the people-first conversation now needs a second half:

- Everyone building or approving an agent needs to understand it's a security principal, not a script.
- Someone needs to own each agent by name — Agent 365 makes this explicit, but the accountability was always the point.
- "It's just AI" stops being a reasonable answer to "what can this access?"

This isn't a contradiction of what I wrote before. It's the same argument, one layer down, now that the technology has an identity to actually govern.

## Where this shows up in practice

This is most of what the [AI Governance Readiness Check](https://cohenholmes.co.uk/ai-governance-check) on this site is actually testing for — not "have you turned on Copilot," but whether your organisation has answered the ownership and access questions before an agent needs them answered. If you haven't looked at it since it was AI chat and not agents, it's worth another five minutes.

I'm glad I wrote the original piece — the people argument was right, and I'd make it again. I just didn't know yet what "the technology" would turn out to mean.
