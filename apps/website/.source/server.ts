// @ts-nocheck
import * as __fd_glob_6 from "../content/changelog/v1-5-performance-boost.mdx?collection=changelog"
import * as __fd_glob_5 from "../content/changelog/v1-5-1-hotfix.mdx?collection=changelog"
import * as __fd_glob_4 from "../content/changelog/v1-4-ai-coaching.mdx?collection=changelog"
import * as __fd_glob_3 from "../content/changelog/v1-3-social-features.mdx?collection=changelog"
import * as __fd_glob_2 from "../content/changelog/v1-2-analytics.mdx?collection=changelog"
import * as __fd_glob_1 from "../content/changelog/v1-1-nutrition.mdx?collection=changelog"
import * as __fd_glob_0 from "../content/changelog/v1-0-launch.mdx?collection=changelog"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const blog = await create.doc("blog", "content/blog", {});

export const changelog = await create.doc("changelog", "content/changelog", {"v1-0-launch.mdx": __fd_glob_0, "v1-1-nutrition.mdx": __fd_glob_1, "v1-2-analytics.mdx": __fd_glob_2, "v1-3-social-features.mdx": __fd_glob_3, "v1-4-ai-coaching.mdx": __fd_glob_4, "v1-5-1-hotfix.mdx": __fd_glob_5, "v1-5-performance-boost.mdx": __fd_glob_6, });

export const docs = await create.docs("docs", "content/docs", {}, {});