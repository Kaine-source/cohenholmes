import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const legacyPath = 'dist/ai-governance-readiness-check.html';
const indexPath = 'dist/index.html';
const sitemapPath = 'dist/sitemap.xml';
const headersPath = 'dist/_headers';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(existsSync(indexPath), `${indexPath} is missing — run "npm run build" first`);
assert(existsSync(sitemapPath), `${sitemapPath} is missing — run "npm run build" first`);
assert(existsSync(headersPath), `${headersPath} is missing — run "npm run build" first`);
assert(!existsSync(legacyPath), `${legacyPath} must not exist`);

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

// Each of these three tools is a real templated Astro page, not a public/ passthrough, so
// there's no byte-identity source to compare against — what actually matters is self-
// consistency: the inline script's own hash must match what the page's own CSP meta tag
// declares, and the source restrictions the CSP promises (no network, no unsafe-inline)
// must actually hold in the script that ships. `banInnerHTML: false` is for ca-builder only —
// its JSON/summary panes are legitimately built via innerHTML, escaped through its own esc()
// helper, so the check there is that the helper exists rather than that innerHTML is absent.
function checkToolPage(name, canonicalPath, { banInnerHTML = true } = {}) {
  const pagePath = `dist${canonicalPath}/index.html`;
  assert(existsSync(pagePath), `${pagePath} is missing — run "npm run build" first`);
  const page = readFileSync(pagePath, 'utf8');

  assert(page.includes(`https://cohenholmes.co.uk${canonicalPath}`), `${name}: canonical route is incorrect`);
  assert(index.includes(`href="${canonicalPath}"`), `${name}: homepage route is missing`);
  assert(sitemap.includes(`https://cohenholmes.co.uk${canonicalPath}`), `${name}: sitemap route is missing`);

  assert(!/localStorage|sessionStorage|indexedDB/.test(page), `${name}: browser storage API detected`);
  assert(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(page), `${name}: network API detected`);
  assert(!/\son[a-z]+\s*=/.test(page), `${name}: inline event handler detected`);
  if (banInnerHTML) {
    assert(!page.includes('innerHTML'), `${name}: unsafe dynamic HTML API detected`);
  } else {
    assert(page.includes('function esc('), `${name}: escaping helper is missing`);
  }

  const scriptMatch = page.match(/<script>([\s\S]*?)<\/script>/);
  assert(scriptMatch, `${name}: inline script block is missing`);
  new Function(scriptMatch[1]);

  const calculatedHash = createHash('sha256').update(scriptMatch[1]).digest('base64');
  const policyMatch = page.match(/Content-Security-Policy" content="([^"]+)"/);
  assert(policyMatch, `${name}: Content Security Policy is missing`);
  assert(
    policyMatch[1].includes(`script-src 'sha256-${calculatedHash}'`),
    `${name}: CSP script hash does not match the inline script`
  );
  assert(!policyMatch[1].includes("script-src 'unsafe-inline'"), `${name}: unsafe inline scripts remain enabled`);
  assert(policyMatch[1].includes("connect-src 'none'"), `${name}: connect-src 'none' is missing from CSP`);
  assert(policyMatch[1].includes("form-action 'none'"), `${name}: form-action 'none' is missing from CSP`);

  return page;
}

checkToolPage('ca-builder', '/ca-builder', { banInnerHTML: false });
checkToolPage('mail-auth', '/mail-auth');
const aiPage = checkToolPage('ai-governance-check', '/ai-governance-check');

const questionCount = (aiPage.match(/\n\s*domain:'/g) || []).length;
assert(questionCount === 12, `Expected 12 questions, found ${questionCount}`);

const domains = [...new Set([...aiPage.matchAll(/domain:'([^']+)'/g)].map(match => match[1]))].sort();
assert(
  JSON.stringify(domains) === JSON.stringify(['Agents', 'Data', 'Governance', 'Human oversight', 'Identity']),
  `Unexpected domains: ${domains.join(', ')}`
);

const levelMatches = [...aiPage.matchAll(/\{max:(\d+),label:'([^']+)'/g)]
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

console.log('Site validation passed: route, privacy, CSP, JavaScript and scoring checks succeeded for all three tools.');
