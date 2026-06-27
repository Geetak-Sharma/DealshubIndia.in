import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const deals = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/deals" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    price: z.string(),
    originalPrice: z.string().optional(),
    link: z.string().url(),
    category: z.enum(['CPU', 'GPU', 'Storage', 'Peripheral', 'Laptop', 'Other']),
    image: image().optional().or(z.string().url().optional()),
    isLoot: z.boolean().default(false),
    date: z.date(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/blog" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    author: z.string().default('DealsHub Team'),
    image: image().optional().or(z.string().url().optional()),
    tags: z.array(z.string()).default([]),
    category: z.string().default('General'),
  }),
});

export const collections = { deals, blog };

