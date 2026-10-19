// Exercises the Worker's exported fetch handler directly, through a real MCP client,
// without wrangler/workerd — this Worker uses nothing but Web standard APIs (fetch,
// Request, Response), all available natively in Node 18+, so there's nothing
// Workers-specific to simulate. A plain Node http.createServer bridges real HTTP
// (what the MCP SDK's client transport needs to talk to) onto one call to
// worker.fetch(request, env) per request.
import { createServer } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import worker from '../src/index.ts';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const FIXTURE_POST_HTML =
  '<!DOCTYPE html><html><body><article><h1>First post</h1>' +
  '<div class="prose" data-astro-cid-fake123><p>Hello from the fixture post.</p></div>' +
  '</article></body></html>';

// Mirrors the real site's syntax-highlighted code blocks (nested <span> tokens,
// one per line) and, deliberately, an indented diagram-style line — this is the
// exact shape that broke get_post before indentation inside <pre> was protected
// from the prose whitespace collapse.
const FIXTURE_CODE_POST_HTML =
  '<!DOCTYPE html><html><body><article><h1>Second post</h1>' +
  '<div class="prose" data-astro-cid-fake456>' +
  '<p>Some   prose   with   extra   spaces   that   should   collapse.</p>' +
  '<pre data-language="text"><code>' +
  '<span class="line"><span>MacBook</span></span>\n' +
  '<span class="line"><span>  └── indented child</span></span>' +
  '</code></pre>' +
  '<p>More   prose   after   the   code   block.</p>' +
  '</div></article></body></html>';

function fixtureFeed(port) {
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>
<item><title>First post</title><link>http://localhost:${port}/blog/first-post/</link><pubDate>Mon, 01 Jan 2026 00:00:00 GMT</pubDate><description>First summary</description><category>ai</category></item>
<item><title>Second post</title><link>http://localhost:${port}/blog/second-post/</link><pubDate>Sun, 01 Feb 2026 00:00:00 GMT</pubDate><description>Second summary</description></item>
</channel></rss>`;
}

function startFixtureSite(port) {
  return createServer((req, res) => {
    if (req.url === '/rss.xml') {
      res.writeHead(200, { 'content-type': 'text/xml' });
      res.end(fixtureFeed(port));
    } else if (req.url === '/blog/first-post/') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(FIXTURE_POST_HTML);
    } else if (req.url === '/blog/second-post/') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(FIXTURE_CODE_POST_HTML);
    } else {
      res.writeHead(404);
      res.end('not found');
    }
  }).listen(port);
}

function startWorkerBridge(port, env) {
  return createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const request = new Request(`http://localhost:${port}${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
    });
    const response = await worker.fetch(request, env);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) {
      for await (const chunk of response.body) res.write(chunk);
    }
    res.end();
  }).listen(port);
}

const fixturePort = 9801;
const bridgePort = 9802;
const fixtureServer = startFixtureSite(fixturePort);
const bridgeServer = startWorkerBridge(bridgePort, { SITE_URL: `http://localhost:${fixturePort}` });
await new Promise((resolve) => setTimeout(resolve, 100));

const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${bridgePort}/mcp`));
const client = new Client({ name: 'smoke-test', version: '1.0.0' });
await client.connect(transport);

const tools = await client.listTools();
const toolNames = tools.tools.map((t) => t.name).sort();
assert(
  JSON.stringify(toolNames) === JSON.stringify(['get_latest_post', 'get_post', 'list_posts']),
  `Unexpected tool list: ${toolNames.join(', ')}`
);

const listResult = await client.callTool({ name: 'list_posts', arguments: {} });
const posts = JSON.parse(listResult.content[0].text);
assert(posts.length === 2, `Expected 2 posts from the fixture feed, got ${posts.length}`);
assert(posts[0].slug === 'first-post', `Expected newest-first order (first-post), got ${posts[0].slug}`);

const latestResult = await client.callTool({ name: 'get_latest_post', arguments: {} });
const latest = JSON.parse(latestResult.content[0].text);
assert(latest.slug === posts[0].slug, 'get_latest_post should match list_posts[0]');

const postResult = await client.callTool({ name: 'get_post', arguments: { slug: 'first-post' } });
assert(
  postResult.content[0].text.includes('Hello from the fixture post.'),
  `get_post did not return the fixture's content: ${postResult.content[0].text}`
);

const badResult = await client.callTool({ name: 'get_post', arguments: { slug: 'does-not-exist' } });
assert(badResult.isError === true, 'get_post with an unknown slug should set isError, not throw or silently succeed');

// Regression: indentation inside <pre> (code blocks, aligned diagrams) must survive
// the prose whitespace collapse — see src/index.ts's extractProseText.
const codePostResult = await client.callTool({ name: 'get_post', arguments: { slug: 'second-post' } });
const codePostText = codePostResult.content[0].text;
assert(
  codePostText.includes('  └── indented child'),
  `Indentation inside <pre> was not preserved. Got:\n${codePostText}`
);
assert(
  /Some prose with extra spaces that should collapse\./.test(codePostText),
  `Ordinary prose whitespace should still collapse to single spaces. Got:\n${codePostText}`
);

await client.close();
fixtureServer.close();
bridgeServer.close();

console.log('MCP server smoke test passed: tools/list, list_posts, get_latest_post, get_post and its error path all behave correctly.');
