# cohenholmes-blog-mcp

A read-only [MCP](https://modelcontextprotocol.io) server exposing the CohenHolmes
blog to any MCP client — point an agent at it instead of asking someone to paste in
a link, or set it up as a recurring check-in for new posts.

Deployed as a Cloudflare Worker, separately from the main site (which stays a plain
static Cloudflare Pages deploy with no server of its own).

## Tools

| Tool | What it does |
|---|---|
| `list_posts` | Every published post, newest first — title, slug, date, summary, tags |
| `get_latest_post` | Just the most recent post's metadata |
| `get_post` | Full text of one post, by slug |

That's the whole surface. There is no `create_post`, `update_post` or anything else
that writes, edits or deletes. This Worker has no storage, no secrets and no
authenticated write path — every tool call reads the live site
(`https://cohenholmes.co.uk`) at request time and nothing else. Keeping it that way is
deliberate: the main site's entire design is "nothing submitted, nothing collected,"
and a write-capable MCP server would mean standing up exactly the kind of mutable,
authenticated surface that stance exists to avoid. If a write tool is ever wanted here,
it needs its own explicit decision, not a quiet addition to this one.

## How it gets its data

`list_posts` / `get_latest_post` fetch and parse `/rss.xml` — the same feed the main
site serves to RSS readers (`../src/pages/rss.xml.js`), so there's exactly one
canonical source of "what's published," not a second content pipeline to keep in
sync. `get_post` fetches the rendered post page itself and extracts the article body.

Both are regex-based rather than a real XML/HTML parser. That's a deliberate,
narrow choice: this only ever parses output from this same repo's own Astro build,
not arbitrary third-party markup, so the shape is known and controlled. If the blog
post template (`../src/pages/blog/[slug].astro`) changes which element wraps the
article body, `get_post`'s extraction needs updating alongside it — `isError: true`
with an explicit message is what happens if that drifts rather than a silent wrong
answer.

## Local development

```
npm install
npm run typecheck
npm test            # self-contained smoke test, no wrangler/workerd needed — see below
npm run dev          # starts wrangler dev on :8787
```

`npm test` runs `test/smoke.mjs`, which imports this Worker's exported `fetch` handler
directly (it's nothing but Web standard APIs — `fetch`, `Request`, `Response` — so it
runs under plain Node, no Workers runtime required) and drives it through a real MCP
client against a tiny in-process fixture server. Fast, and nothing here depends on
network access to the real site.

To run against the real site locally instead of the fixture, `npm run dev` uses
`wrangler dev`, which needs real outbound internet access to `cohenholmes.co.uk` —
`SITE_URL` can be overridden via a `.dev.vars` file (gitignored) if you want to point
it at something else, e.g. a locally-served `dist/` from the main site.

## Deploying

```
npm run deploy
```

Requires a Cloudflare account authenticated via `wrangler login` (or `CLOUDFLARE_API_TOKEN`
in the environment) with permission to create Workers. `SITE_URL` for production is set
in `wrangler.toml`, not passed at deploy time.
