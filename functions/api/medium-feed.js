// Cloudflare Pages Function
// Route: /api/medium-feed
// Fetches Medium's RSS feed server-side (Medium's feed has no CORS headers,
// so this can't be called directly from browser JS) and returns clean JSON.

const MEDIUM_USER = "@kaine.cohen";
const FEED_URL = `https://medium.com/feed/${MEDIUM_USER}`;
const CACHE_SECONDS = 60 * 60 * 6; // 6 hours — Medium feeds don't need to be hit on every page load

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request(context.request.url, context.request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let xml;
  try {
    const res = await fetch(FEED_URL, {
      headers: { "User-Agent": "cohenholmes.co.uk-feed-fetch" },
    });
    if (!res.ok) throw new Error(`Medium responded ${res.status}`);
    xml = await res.text();
  } catch (err) {
    return jsonResponse({ error: "Could not reach Medium", detail: String(err) }, 502);
  }

  const posts = parseRssItems(xml).slice(0, 12);
  const response = jsonResponse({ posts, fetchedAt: new Date().toISOString() }, 200, CACHE_SECONDS);

  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

function parseRssItems(xml) {
  const items = [];
  const itemBlocks = xml.split("<item>").slice(1);

  for (const block of itemBlocks) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    const rawContent = extractTag(block, "content:encoded") || extractTag(block, "description") || "";

    const snippet = stripHtml(rawContent).slice(0, 200).trim();
    const thumbnail = extractFirstImageSrc(rawContent);

    if (title && link) {
      items.push({
        title: decodeEntities(title),
        link: link.split("?source=")[0],
        pubDate,
        snippet: decodeEntities(snippet) + (snippet.length === 200 ? "…" : ""),
        thumbnail,
      });
    }
  }
  return items;
}

function extractTag(block, tag) {
  const escaped = tag.replace(/[:]/g, "\\$&");
  const re = new RegExp(`<${escaped}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${escaped}>`);
  const match = block.match(re);
  return match ? match[1].trim() : "";
}

function extractFirstImageSrc(html) {
  const matches = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)];
  for (const m of matches) {
    const src = m[1];
    // Medium injects a tracking-pixel <img> (medium.com/_stat?event=...) into every
    // post's content — skip it and keep looking for a real cover image.
    if (!src.includes("/stat?event=")) return src;
  }
  return null;
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function jsonResponse(data, status = 200, cacheSeconds = 0) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      ...(cacheSeconds ? { "Cache-Control": `public, max-age=${cacheSeconds}` } : {}),
    },
  });
}
