import {
  defineDocs,
  defineCollections,
  defineConfig,
  frontmatterSchema,
} from 'fumadocs-mdx/config';
import { z } from 'zod';

export const docs = defineDocs({
  dir: 'content/docs',
});

export const blog = defineCollections({
  type: 'doc',
  dir: 'content/blog',
  schema: frontmatterSchema.extend({
    date: z.string().date(),
    tags: z.array(z.string()).optional(),
  }),
});

export const changelog = defineCollections({
  type: 'doc',
  dir: 'content/changelog',
  schema: frontmatterSchema.extend({
    date: z.string().date(),
    version: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export default defineConfig({
  mdxOptions: {
    providerImportSource: '@mdx-js/react',
  },
});
