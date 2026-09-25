import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

// Read the tool page and sitemap from dist/ (the built output). This page is a real
// templated Astro page (src/pages/ai-governance-check.astro), not a public/ passthrough,
// so there's no byte-identity source to compare against — what actually matters is
// self-consistency, asserted below: the inline script's own hash must match what the
// page's own CSP meta tag declares.
const pagePath = 'dist/ai-governance-check/index.html';
const legacyPath = 'dist/ai-governance-readiness-check.html';
const indexPath = 'dist/index.html';
const sitemapPath = 'dist/sitemap.xml';
const headersPath = 'dist/_headers';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(existsSync(pagePath), `${pagePath} is missing — run "npm run build" first`);
assert(existsSync(indexPath), `${indexPath} is missing — run "npm run build" first`);
assert(existsSync(sitemapPath), `${sitemapPath} is missing — run "npm run build" first`);
assert(existsSync(headersPath), `${headersPath} is missing — run "npm run build" first`);
assert(!existsSync(legacyPath), `${legacyPath} must not exist`);

const page = readFileSync(pagePath, 'utf8');
const index = readFileSync(indexPath, 'utf8');
const sitemap = readFileSync(sitemapPath, 'utf8');
const headers = readFileSync(headersPath, 'utf8');

// Cloudflare Pages applies this file's rules to every response. These three headers
// have no interaction with the tool pages' hash-locked CSP <meta> tags or with the
// giscus.app script blog posts load, unlike Content-Security-Policy would — that one
// needs a route-aware policy and is deliberately left for a separate pass.
assert(/^\/\*$/m.test(headers), 'Wildcard path rule is missing from _headers');
assert(/Strict-Transport-Security:\s*max-age=31536000; includeSubDomains/.test(headers), 'HSTS header is missing or misconfigured');
assert(/X-Frame-Options:\s*SAMEORIGIN/.test(headers), 'X-Frame-Options header is missing or misconfigured');
assert(/Permissions-Policy:\s*\S/.test(headers), 'Permissions-Policy header is missing');

assert(page.includes('https://cohenholmes.co.uk/ai-governance-check'), 'Canonical route is incorrect');
assert(index.includes('href="/ai-governance-check"'), 'Homepage route is missing');
assert(sitemap.includes('https://cohenholmes.co.uk/ai-governance-check'), 'Sitemap route is missing');

const questionCount = (page.match(/\n\s*domain:'/g) || []).length;
assert(questionCount === 12, `Expected 12 questions, found ${questionCount}`);

const domains = [...new Set([...page.matchAll(/domain:'([^']+)'/g)].map(match => match[1]))].sort();
assert(
  JSON.stringify(domains) === JSON.stringify(['Agents', 'Data', 'Governance', 'Human oversight', 'Identity']),
  `Unexpected domains: ${domains.join(', ')}`
);

assert(!/localStorage|sessionStorage|indexedDB/.test(page), 'Browser storage API detected');
assert(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(page), 'Answer-related network API detected');
assert(!page.includes('innerHTML'), 'Unsafe dynamic HTML API detected');
assert(!/\son[a-z]+\s*=/.test(page), 'Inline event handler detected');

const scriptMatch = page.match(/<script>([\s\S]*?)<\/script>/);
assert(scriptMatch, 'Inline script block is missing');
new Function(scriptMatch[1]);

const calculatedHash = createHash('sha256').update(scriptMatch[1]).digest('base64');
const policyMatch = page.match(/Content-Security-Policy" content="([^"]+)"/);
assert(policyMatch, 'Content Security Policy is missing');
assert(
  policyMatch[1].includes(`script-src 'sha256-${calculatedHash}'`),
  'CSP script hash does not match the inline script'
);
assert(!policyMatch[1].includes("script-src 'unsafe-inline'"), 'Unsafe inline scripts remain enabled');

const levelMatches = [...page.matchAll(/\{max:(\d+),label:'([^']+)'/g)]
  .map(match => ({ max: Number(match[1]), label: match[2] }));
assert(levelMatches.length === 5, `Expected 5 maturity levels, found ${levelMatches.length}`);

const boundaries = [
  [0, 'Foundation'], [6, 'Foundation'], [7, 'Developing'], [12, 'Developing'],
  [13, 'Controlled'], [18, 'Controlled'], [19, 'Operational'], [22, 'Operational'],
  [23, 'Adaptive'], [24, 'Adaptive']
];
for (const [score, expected] of boundaries) {
  const actual = levelMatches.find(level => score <= level.max)?.label;
  assert(actual === expected, `Score ${score}: expected ${expected}, received ${actual}`);
}

console.log('Site validation passed: route, privacy, CSP, JavaScript and scoring checks succeeded.');
