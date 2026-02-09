// source.config.ts
import {
  defineDocs,
  defineCollections,
  defineConfig,
  frontmatterSchema
} from "fumadocs-mdx/config";
import { z } from "zod";
var docs = defineDocs({
  dir: "content/docs"
});
var blog = defineCollections({
  type: "doc",
  dir: "content/blog",
  schema: frontmatterSchema.extend({
    date: z.string().date(),
    tags: z.array(z.string()).optional()
  })
});
var changelog = defineCollections({
  type: "doc",
  dir: "content/changelog",
  schema: frontmatterSchema.extend({
    date: z.string().date(),
    version: z.string().optional(),
    tags: z.array(z.string()).optional()
  })
});
var source_config_default = defineConfig({
  mdxOptions: {
    providerImportSource: "@mdx-js/react"
  }
});
export {
  blog,
  changelog,
  source_config_default as default,
  docs
};
