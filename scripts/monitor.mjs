#!/usr/bin/env node
// Synthetic monitor for cohenholmes.co.uk.
//
// Two kinds of check, both read from ops/monitor.json:
//   1. HTTP  — each route returns the expected status and (for 200s) contains
//              an expected string, or parses as JSON with an expected key.
//   2. DNS   — the live SPF / DMARC / MX / DKIM records still match what we
//              expect. Uses DNS-over-HTTPS (dns.google) so it needs no `dig`.
//
// Exit 0 = everything passed. Exit 1 = at least one hard failure.
// A transient network problem reaching a check endpoint is retried, then
// reported as a soft warning (does not fail the run) so a blip at 3am does
// not open an issue. A record that resolves but is wrong IS a hard failure.
//
// When you deliberately change a DNS record (e.g. moving DMARC to
// p=quarantine), update ops/monitor.json in the same pull request.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(await readFile(join(ROOT, "ops", "monitor.json"), "utf8"));

const RETRIES = 3;
const RETRY_DELAY_MS = 4000;
const TIMEOUT_MS = 15000;

const failures = [];
const warnings = [];
const passes = [];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(label, fn) {
  let lastErr;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < RETRIES) await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  const e = new Error(`${label}: unreachable after ${RETRIES} attempts (${lastErr && lastErr.message})`);
  e.soft = true;
  throw e;
}

async function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: { "user-agent": "cohenholmes-monitor (+https://cohenholmes.co.uk)", ...(opts.headers || {}) },
    });
  } finally {
    clearTimeout(t);
  }
}

// ---- HTTP checks -----------------------------------------------------------

async function checkRoute(route) {
  const url = cfg.site + route.path;
  const wantStatus = route.status || 200;
  let res;
  try {
    res = await withRetry(`GET ${route.path}`, () => fetchWithTimeout(url, { redirect: "follow" }));
  } catch (err) {
    warnings.push(err.message);
    return;
  }

  if (res.status !== wantStatus) {
    failures.push(`GET ${route.path} → ${res.status}, expected ${wantStatus}`);
    return;
  }

  if (wantStatus === 200) {
    const body = await res.text();
    if (route.contains && !body.includes(route.contains)) {
      failures.push(`GET ${route.path} → 200 but body is missing "${route.contains}" (page may be broken)`);
      return;
    }
    if (route.json) {
      try {
        const data = JSON.parse(body);
        if (!(route.json in data)) {
          failures.push(`GET ${route.path} → 200 but JSON has no "${route.json}" key`);
          return;
        }
      } catch {
        failures.push(`GET ${route.path} → 200 but body is not valid JSON`);
        return;
      }
    }
  }

  passes.push(`GET ${route.path} → ${res.status}`);
}

// ---- DNS checks (DNS-over-HTTPS) -----------------------------------------

const TYPE = { A: 1, CNAME: 5, MX: 15, TXT: 16 };

async function resolve(name, type) {
  return withRetry(`DoH ${type} ${name}`, async () => {
    const res = await fetchWithTimeout(
      `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
      { headers: { accept: "application/dns-json" } }
    );
    if (!res.ok) throw new Error(`dns.google returned ${res.status}`);
    const data = await res.json();
    return (data.Answer || []).filter((a) => a.type === TYPE[type]);
  });
}

const normTxt = (s) => s.replace(/"/g, "").replace(/\s+/g, " ").trim();
const normHost = (s) => s.replace(/\.$/, "").toLowerCase().trim();

async function checkTxt(name, expectedList) {
  let answers;
  try {
    answers = await resolve(name, "TXT");
  } catch (err) {
    warnings.push(err.message);
    return;
  }
  const got = answers.map((a) => normTxt(a.data));
  for (const expected of expectedList) {
    if (got.includes(normTxt(expected))) {
      passes.push(`TXT ${name} contains "${expected}"`);
    } else {
      failures.push(`TXT ${name} is missing "${expected}" (got: ${got.join(" | ") || "no records"})`);
    }
  }
}

async function checkMx(name, expectedHosts) {
  let answers;
  try {
    answers = await resolve(name, "MX");
  } catch (err) {
    warnings.push(err.message);
    return;
  }
  const got = answers.map((a) => normHost(a.data.split(/\s+/).pop()));
  for (const host of expectedHosts) {
    if (got.includes(normHost(host))) passes.push(`MX ${name} → ${host}`);
    else failures.push(`MX ${name} is missing ${host} (got: ${got.join(", ") || "no records"})`);
  }
}

async function checkCname(name, expectedTarget) {
  let answers;
  try {
    answers = await resolve(name, "CNAME");
  } catch (err) {
    warnings.push(err.message);
    return;
  }
  const got = answers.map((a) => normHost(a.data));
  if (got.includes(normHost(expectedTarget))) passes.push(`CNAME ${name} → ${expectedTarget}`);
  else failures.push(`CNAME ${name} → ${got.join(", ") || "no record"}, expected ${expectedTarget}`);
}

// ---- run -----------------------------------------------------------------

for (const route of cfg.routes) await checkRoute(route);

for (const [name, list] of Object.entries(cfg.dns.TXT || {})) await checkTxt(name, list);
for (const [name, hosts] of Object.entries(cfg.dns.MX || {})) await checkMx(name, hosts);
for (const [name, target] of Object.entries(cfg.dns.CNAME || {})) await checkCname(name, target);

// ---- report ------------------------------------------------------------

const line = (s) => process.stdout.write(s + "\n");
line(`\ncohenholmes.co.uk monitor — ${new Date().toISOString()}`);
line(`  ${passes.length} passed, ${failures.length} failed, ${warnings.length} warning(s)\n`);
for (const p of passes) line(`  ok    ${p}`);
for (const w of warnings) line(`  warn  ${w}`);
for (const f of failures) line(`  FAIL  ${f}`);

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  const md = [
    `### Monitor — ${failures.length ? "❌ failing" : "✅ healthy"}`,
    ``,
    `${passes.length} passed · ${failures.length} failed · ${warnings.length} warning(s)`,
    ``,
    ...failures.map((f) => `- ❌ ${f}`),
    ...warnings.map((w) => `- ⚠️ ${w}`),
    ...(failures.length ? [] : passes.map((p) => `- ✅ ${p}`)),
    ``,
  ].join("\n");
  await (await import("node:fs/promises")).appendFile(summaryPath, md);
}

process.exit(failures.length ? 1 : 0);
