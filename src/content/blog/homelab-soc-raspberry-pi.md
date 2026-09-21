---
title: "Building a Homelab SOC on a Raspberry Pi with MCP and Microsoft Graph"
description: "How I turned a £70 Raspberry Pi 4 into a real-time security operations centre — complete with MCP servers, a live dashboard, Microsoft Graph alerting, and Tailscale as the backbone."
pubDate: 2026-09-15
author: "Kaine Cohen"
tags: ["homelab", "microsoft-graph", "mcp", "raspberry-pi", "entra-id", "python", "security"]
slug: "homelab-soc-raspberry-pi"
---

I spend my working days advising enterprise clients on Microsoft 365 security — Entra ID, Conditional Access, Purview, the lot. Most of what I build lives in tenants I don't own, on infrastructure I can't fully see. So when I wanted to build something I controlled end-to-end, something I could break and fix and learn from at 11pm without a change-approval board, I bought a Raspberry Pi.

What started as a simple Tailscale monitor turned into a proper homelab SOC: real-time device visibility, Microsoft Graph integration, push alerts, and a live web dashboard — all running on a £70 bit of kit on my desk.

Here's how it works.

## The Architecture

The stack has three layers.

**The Pi** (a Raspberry Pi 4, 4GB) runs everything via Docker Compose. Two MCP servers handle data collection: `mcp-tailscale` on port 8080 talks to the Tailscale API and exposes a `run_command` tool for shell access inside the container; `mcp-graph` on port 8090 connects to Microsoft Graph using a registered Entra app with client credentials flow. A dashboard service on port 8081 renders the web UI. An alerter container polls both sources and fires push notifications via a self-hosted ntfy instance on port 8082.

**Tailscale** is the backbone. Every service is only reachable over the tailnet — no ports exposed to the internet, no firewall rules to manage. The Pi sits at a private tailnet address and my MacBook connects to it transparently, wherever I am.

**Claude Desktop** on the MacBook connects to both MCP servers via `mcp-remote`, proxied over Tailscale. That means Claude has live tools: `list_devices`, `get_risky_sign_ins`, `list_ca_policies`, `check_mfa_gaps` — all callable from a conversation, without copying and pasting API responses.

```
MacBook Pro (Claude Desktop)
  └── npx mcp-remote → Pi:8080  (mcp-tailscale)
  └── npx mcp-remote → Pi:8090  (mcp-graph)

Raspberry Pi 4 (on the tailnet)
  └── mcp-tailscale  :8080  — Tailscale API + shell
  └── mcp-graph      :8090  — Microsoft Graph tools
  └── dashboard      :8081  — Web UI
  └── ntfy           :8082  — Push notifications
  └── alerter              — Polling + alerts
```

## The MCP Servers

Both servers are built with [FastMCP](https://github.com/jlowin/fastmcp), a Python library that handles the MCP protocol and exposes an SSE endpoint with almost no boilerplate.

A tool looks like this:

```python
@mcp.tool()
def get_risky_sign_ins() -> dict:
    """Return recent failed sign-ins from Microsoft Graph."""
    token = get_graph_token()
    url = "https://graph.microsoft.com/v1.0/auditLogs/signIns"
    params = {"$filter": "status/errorCode ne 0", "$top": 50}
    resp = requests.get(url, headers={"Authorization": f"Bearer {token}"}, params=params)
    return resp.json()
```

One thing worth knowing: `uvicorn.run()` is blocking. Any tool you define after it will never be registered. I hit this the hard way — `pre_delete_check` was sitting below the server start call and silently doing nothing. Define all tools first, then start the server.

Graph authentication uses client credentials flow with a 55-minute token cache — the access token lifetime is 60 minutes, so caching with a 5-minute buffer means I'm never mid-task when it expires.

## The Dashboard

The dashboard is a single-file Starlette app (`dashboard.py`) serving HTML with inline CSS. No JavaScript framework, no build step — just Python string templating and a bit of CSS custom properties.

It has five sections: Overview (stat cards + device chart), Sign-ins (recent failures, success/failure breakdown), Devices (full Tailscale device list), Entra Audit (CA policies, MFA status), and Security Posture (a quick composite score based on MFA gaps and policy health).

The overview pulls from both MCP sources in parallel — Tailscale device counts on one side, Graph security signals on the other — and computes a posture score: 100 points, minus 10 per user without MFA registered, minus 20 if a CA policy has changed state unexpectedly.

Mobile layout was an interesting constraint. The sidebar collapses to a fixed bottom nav bar at 768px, stat cards go from three columns to two, and charts stack vertically. The Pi serves this to my phone over Tailscale just as happily as to my MacBook.

## The Alerter

The alerter runs as a separate container — a Python loop with a configurable polling interval, no web server, pure `while True`.

It checks three things:

**Sign-in spike** — if more than 10 failed sign-ins appear in the last hour, fire an urgent ntfy notification. This runs every 5 minutes.

**CA policy change** — if an enabled Conditional Access policy changes its state between polls, fire an urgent alert immediately. CA policies don't change on their own; a state change almost always means a human made a change. This runs every 10 minutes.

**MFA gaps** — compare the list of enabled users against the list of users with MFA registered. Any new enabled account without MFA gets flagged. This runs every 15 minutes.

Each check is stateful — it stores the previous result and only alerts on delta, not on every poll. The Graph token is cached with the same 55-minute TTL as the MCP server, so the alerter doesn't spam the token endpoint either.

One gotcha: Python inside Docker buffers stdout by default. Add `-u` to your container command (`python -u src/alerter.py`) or you'll see nothing in `docker logs` for minutes at a time.

## What's Working Well

**The MCP integration is genuinely useful.** Being able to type "any offline devices in the last hour?" or "show me CA policies with exclusions" and get a real answer — not a JSON blob I have to parse myself — changes how I interact with my own infrastructure. Claude acts as the interface layer.

**Tailscale makes the networking trivial.** I haven't touched a firewall rule or managed a certificate. Every service just works, from anywhere, as long as I'm on the tailnet.

**Docker Compose volume mounts mean instant iteration.** The source files are mounted directly into the containers — edit `server.py` on the Pi, restart the container, done. No build step, no image push.

## Where It Hits the Ceiling

The Pi's hardware is the honest constraint. It handles two MCP servers, a dashboard, ntfy, and an alerter without breaking a sweat at idle — but the Graph token fetch adds ~400ms of latency to every cold MCP call, and anything that fans out to multiple Graph endpoints in parallel slows noticeably. For a personal homelab this is fine. For anything production-shaped, you'd want something meatier.

The flat `.env` approach also starts to show its age as the number of secrets grows. A proper secrets manager (even just Bitwarden Secrets or 1Password's CLI integration) would be the next step.

## What's Next

The first iteration is essentially done. The natural next move is to think harder about *what* to monitor rather than *how* to monitor it. A few things on the list:

- **Stale account detection** — users inactive for 90+ days, auto-report weekly
- **Named location drift** — alert if a sign-in succeeds from an IP not in any named location
- **Graph webhook subscriptions** — replace polling with push for sign-in events, which would reduce the alerter's latency from minutes to seconds

The Pi will probably stay as the control plane even as the scope grows. It's cheap, silent, always on, and having a physical thing on my desk that's doing real security work is, honestly, more motivating than a cloud function I never see.

---

If you're an M365 security practitioner who hasn't built something like this — start. The Graph API is one of the most capable security data sources in the Microsoft stack, and it's completely accessible with a free Entra app registration and a few hours on a weekend afternoon.

I'll be open-sourcing this once it's in a state other people can actually pick up and run. Questions welcome in the meantime.
