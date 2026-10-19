import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';

interface Env {
  // Set in wrangler.toml for production; overridable via .dev.vars for local testing
  // against a fixture server instead of the real site.
  SITE_URL: string;
}

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  tags: string[];
}

function decodeEntities(value: string): string {
  return value
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

// Regex, not a real XML parser — acceptable here because this only ever reads the
// feed this same site's own build produces (see ../src/pages/rss.xml.js in the main
// site, not this package), not arbitrary third-party XML.
function parseFeed(xml: string): FeedItem[] {
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return itemBlocks.map((block) => {
    const field = (tag: string) => {
      const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
      return match ? decodeEntities(match[1]) : '';
    };
    const tags = [...block.matchAll(/<category>([\s\S]*?)<\/category>/g)].map((m) => decodeEntities(m[1]));
    return { title: field('title'), link: field('link'), pubDate: field('pubDate'), description: field('description'), tags };
  });
}

async function fetchFeed(siteUrl: string): Promise<FeedItem[]> {
  const response = await fetch(`${siteUrl}/rss.xml`);
  if (!response.ok) {
    throw new Error(`Fetching the feed failed: HTTP ${response.status}`);
  }
  return parseFeed(await response.text());
}

function slugFromLink(link: string): string {
  const match = link.match(/\/blog\/([^/]+)\/?$/);
  return match ? match[1] : link;
}

// Same caveat as parseFeed: coupled to the main site's current blog-post template
// (src/pages/blog/[slug].astro), specifically its `<div class="prose">` content
// wrapper, not a general-purpose HTML content extractor. If that template changes
// shape, this needs updating alongside it.
function extractProseText(html: string): string | null {
  // `[^>]*` tolerates Astro's injected data-astro-cid-* scoped-style attribute on
  // this element, which varies per build — matching the literal tag would silently
  // break every time the site rebuilds with a new scope hash.
  const match = html.match(/<div class="prose"[^>]*>([\s\S]*?)<\/div>\s*<\/article>/);
  if (!match) return null;
  let body = match[1];

  // Code blocks (and anything else inside <pre>, like the architecture diagram in
  // the homelab post) carry meaningful indentation — pull them out before the prose
  // whitespace-collapse below runs, so that collapse can't flatten them. By the time
  // that collapse runs, every tag is already gone, so there'd be no way left to tell
  // "this space is indentation" from "this space is between two prose words."
  const codeBlocks: string[] = [];
  body = body.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_match, inner: string) => {
    const code = decodeEntities(inner.replace(/<[^>]+>/g, ''));
    codeBlocks.push(code);
    return `\n\n\u0000CODEBLOCK${codeBlocks.length - 1}\u0000\n\n`;
  });

  let text = body
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  text = decodeEntities(text);

  // Restore the protected code blocks verbatim, indentation intact.
  text = text.replace(/\u0000CODEBLOCK(\d+)\u0000/g, (_match, index: string) => codeBlocks[Number(index)]);

  return text;
}

function createServer(siteUrl: string): McpServer {
  const server = new McpServer({ name: 'cohenholmes-blog', version: '1.0.0' });

  server.registerTool(
    'list_posts',
    {
      title: 'List blog posts',
      description:
        'List every published post on the CohenHolmes blog (cohenholmes.co.uk/blog), newest first, with title, slug, date, summary and tags. Read-only — this server has no tool that writes, edits or deletes anything.',
    },
    async () => {
      const posts = await fetchFeed(siteUrl);
      const payload = posts.map((post) => ({ ...post, slug: slugFromLink(post.link) }));
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
    }
  );

  server.registerTool(
    'get_latest_post',
    {
      title: 'Get the latest blog post',
      description:
        "Get the single most recently published post's metadata (title, slug, date, summary, tags). Call get_post with its slug for the full text.",
    },
    async () => {
      const posts = await fetchFeed(siteUrl);
      const latest = posts[0];
      if (!latest) {
        return { content: [{ type: 'text', text: 'No posts are published yet.' }] };
      }
      const payload = { ...latest, slug: slugFromLink(latest.link) };
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
    }
  );

  server.registerTool(
    'get_post',
    {
      title: "Get a blog post's full text",
      description: 'Get the full text of one published post by its slug (from list_posts or get_latest_post).',
      inputSchema: { slug: z.string().describe('The post slug, e.g. "ai-governance-keeping-pace"') },
    },
    async ({ slug }: { slug: string }) => {
      const response = await fetch(`${siteUrl}/blog/${slug}/`);
      if (!response.ok) {
        return {
          content: [{ type: 'text', text: `No published post found at /blog/${slug}/ (HTTP ${response.status}).` }],
          isError: true,
        };
      }
      const text = extractProseText(await response.text());
      if (!text) {
        return {
          content: [{ type: 'text', text: "Found the page but couldn't extract its content — the site's template may have changed." }],
          isError: true,
        };
      }
      return { content: [{ type: 'text', text }] };
    }
  );

  return server;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const siteUrl = env.SITE_URL.replace(/\/$/, '');

    if (url.pathname === '/mcp') {
      const server = createServer(siteUrl);
      // Stateless: a fresh server + transport per request, matching the Worker's
      // per-request execution model — no session state persists between calls, and
      // there's nothing here that would need it (every tool is a read-only lookup).
      const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      return transport.handleRequest(request);
    }

    if (url.pathname === '/') {
      return new Response(
        'CohenHolmes blog MCP server. Read-only: list_posts, get_latest_post, get_post. ' +
          'Point an MCP client at /mcp. Source: https://github.com/Kaine-source/cohenholmes/tree/main/mcp-server',
        { headers: { 'content-type': 'text/plain; charset=utf-8' } }
      );
    }

    return new Response('Not found', { status: 404 });
  },
};
