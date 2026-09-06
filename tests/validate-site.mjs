import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const pagePath = 'public/ai-governance-check.html';
const legacyPath = 'public/ai-governance-readiness-check.html';
const indexPath = 'public/index.html';
const sitemapPath = 'public/sitemap.xml';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(existsSync(pagePath), `${pagePath} is missing`);
assert(!existsSync(legacyPath), `${legacyPath} must not exist`);

const page = readFileSync(pagePath, 'utf8');
const index = readFileSync(indexPath, 'utf8');
const sitemap = readFileSync(sitemapPath, 'utf8');

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
