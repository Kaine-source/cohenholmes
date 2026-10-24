import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

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

// Cloudflare Pages applies this file's rules to every response. These headers have no
// interaction with each page's own CSP <meta> tag (set per-route below) — a route-aware
// policy belongs in the page itself, not this file, so that giscus.app on blog posts and
// the stricter ca-builder/ai-governance-check policies never have to coexist with a
// second, file-level CSP that browsers would additionally AND against theirs.
assert(/^\/\*$/m.test(headers), 'Wildcard path rule is missing from _headers');
assert(/Strict-Transport-Security:\s*max-age=31536000; includeSubDomains/.test(headers), 'HSTS header is missing or misconfigured');
assert(/X-Frame-Options:\s*SAMEORIGIN/.test(headers), 'X-Frame-Options header is missing or misconfigured');
assert(/X-Content-Type-Options:\s*nosniff/.test(headers), 'X-Content-Type-Options header is missing or misconfigured');
assert(/Referrer-Policy:\s*no-referrer/.test(headers), 'Referrer-Policy header is missing or misconfigured');
assert(/Permissions-Policy:\s*\S/.test(headers), 'Permissions-Policy header is missing');
assert(!/^\s*Content-Security-Policy:/m.test(headers), '_headers must not set a file-level CSP — it would AND against each page\'s own <meta> policy');

// Every page that isn't covered by checkToolPage() below still needs its own CSP meta
// tag — "no CSP" was the actual gap this pass closes. unsafe-inline must never appear
// in script-src: an inline script either gets a real sha256 hash or doesn't ship.
function checkBaselineCsp(name, pagePath, { extra = [] } = {}) {
  assert(existsSync(pagePath), `${pagePath} is missing — run "npm run build" first`);
  const page = readFileSync(pagePath, 'utf8');
  const policyMatch = page.match(/Content-Security-Policy" content="([^"]+)"/);
  assert(policyMatch, `${name}: Content-Security-Policy meta tag is missing`);
  const policy = policyMatch[1];
  assert(policy.includes("script-src 'self' https://static.cloudflareinsights.com"), `${name}: CSP must allow the analytics beacon in script-src`);
  assert(!/script-src[^;]*'unsafe-inline'/.test(policy), `${name}: unsafe-inline must not appear in script-src`);
  assert(policy.includes("object-src 'none'"), `${name}: CSP must set object-src 'none'`);
  for (const token of extra) {
    assert(policy.includes(token), `${name}: CSP is missing expected "${token}"`);
  }
  return { page, policy };
}

checkBaselineCsp('404', 'dist/404.html');
checkBaselineCsp('blog index', 'dist/blog/index.html');
checkBaselineCsp('mcp', 'dist/mcp/index.html');
checkBaselineCsp('about', 'dist/about/index.html');

assert(index.includes('href="/about"'), 'Homepage nav is missing the /about link');
assert(sitemap.includes('https://cohenholmes.co.uk/about'), 'about: sitemap route is missing');

{
  const { policy } = checkBaselineCsp('homepage', 'dist/index.html');
  const jsonLdMatch = index.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  assert(jsonLdMatch, 'homepage: JSON-LD script block is missing');
  const jsonLdHash = createHash('sha256').update(jsonLdMatch[1]).digest('base64');
  assert(policy.includes(`'sha256-${jsonLdHash}'`), "homepage: CSP script hash does not match the JSON-LD inline script");

  // A <meta> CSP only governs content parsed after it — it must appear before the
  // JSON-LD block in document order, not just be present somewhere on the page.
  const cspIndex = index.indexOf('Content-Security-Policy');
  const jsonLdIndex = index.indexOf('application/ld+json');
  assert(cspIndex !== -1 && jsonLdIndex !== -1 && cspIndex < jsonLdIndex, 'homepage: CSP meta tag must come before the JSON-LD script in document order');
}

// Every built blog post (not the index) must allow giscus.app — client.js plus the
// comment iframe it injects — without broadening script-src beyond self/beacon/giscus.
const blogSlugDirs = readdirSync('dist/blog', { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(`dist/blog/${entry.name}/index.html`))
  .map((entry) => entry.name);
assert(blogSlugDirs.length > 0, 'No built blog post directories found under dist/blog');
for (const slug of blogSlugDirs) {
  checkBaselineCsp(`blog post (${slug})`, `dist/blog/${slug}/index.html`, {
    extra: ["script-src 'self' https://static.cloudflareinsights.com https://giscus.app", 'frame-src https://giscus.app'],
  });
}

// Self-consistency rather than a hardcoded post count: the feed and the blog index are
// built from the same (non-draft) collection query, so their item counts must agree —
// this structurally guarantees a draft can't leak into the feed without also showing up
// on the blog index, which would be caught elsewhere.
const feedPath = 'dist/rss.xml';
const blogIndexPath = 'dist/blog/index.html';
assert(existsSync(feedPath), `${feedPath} is missing — run "npm run build" first`);
assert(existsSync(blogIndexPath), `${blogIndexPath} is missing — run "npm run build" first`);
const feed = readFileSync(feedPath, 'utf8');
const blogIndex = readFileSync(blogIndexPath, 'utf8');
assert(feed.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'rss.xml must start with a valid XML declaration');
assert(feed.includes('<rss version="2.0">'), 'rss.xml must be a valid RSS 2.0 feed');
const publishedPostCount = (blogIndex.match(/class="post"/g) || []).length;
const feedItemCount = (feed.match(/<item>/g) || []).length;
assert(
  feedItemCount === publishedPostCount && publishedPostCount > 0,
  `rss.xml has ${feedItemCount} item(s) but the blog index lists ${publishedPostCount} published post(s) — they must match, and at least one post must be published`
);
assert(index.includes('application/rss+xml'), 'Homepage is missing the RSS <link rel="alternate"> tag (BaseLayout wiring)');

// Each of these two tools is a real templated Astro page, not a public/ passthrough, so
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

console.log('Site validation passed: route, privacy, CSP, JavaScript, scoring and RSS feed checks succeeded.');
