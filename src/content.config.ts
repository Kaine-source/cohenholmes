import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    author: z.string().default('Kaine Cohen'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    // Overrides the filename-derived id for routing/links when present.
    slug: z.string().optional(),
    heroImage: z.string().optional(),
  }),
});

export const collections = { blog };
