// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  blog: create.doc("blog", {}),
  changelog: create.doc("changelog", {"v1-0-launch.mdx": () => import("../content/changelog/v1-0-launch.mdx?collection=changelog"), "v1-1-nutrition.mdx": () => import("../content/changelog/v1-1-nutrition.mdx?collection=changelog"), "v1-2-analytics.mdx": () => import("../content/changelog/v1-2-analytics.mdx?collection=changelog"), "v1-3-social-features.mdx": () => import("../content/changelog/v1-3-social-features.mdx?collection=changelog"), "v1-4-ai-coaching.mdx": () => import("../content/changelog/v1-4-ai-coaching.mdx?collection=changelog"), "v1-5-1-hotfix.mdx": () => import("../content/changelog/v1-5-1-hotfix.mdx?collection=changelog"), "v1-5-performance-boost.mdx": () => import("../content/changelog/v1-5-performance-boost.mdx?collection=changelog"), }),
  docs: create.doc("docs", {}),
};
export default browserCollections;