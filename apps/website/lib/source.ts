import { docs } from '@/.source/server';
import { loader } from 'fumadocs-core/source';

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});

// NOTE: blog and changelog are standalone doc collections,
// imported directly where needed from @/.source/server
