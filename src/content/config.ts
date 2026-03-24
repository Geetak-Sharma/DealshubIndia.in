import { defineCollection, z } from 'astro:content';

const deals = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    price: z.string(),
    originalPrice: z.string().optional(),
    link: z.string().url(),
    category: z.enum(['CPU', 'GPU', 'Storage', 'Peripheral', 'Laptop', 'Other']),
    image: z.string().optional(),
    isLoot: z.boolean().default(false),
    date: z.date(),
  }),
});

export const collections = { deals };
