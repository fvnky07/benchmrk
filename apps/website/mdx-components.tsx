// NOTE: Custom MDX components for rendering
import type { MDXComponents } from 'mdx/types';
import Image from 'next/image';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    img: ({ className, alt, ...props }: React.ComponentProps<'img'>) => (
      <Image
        className={cn('mb-2 rounded-xl border-2', className)}
        alt={alt ?? ''}
        {...props}
      />
    ),
    Video: ({ className, ...props }: React.ComponentProps<'video'>) => (
      <video
        className={cn('rounded-md border', className)}
        controls
        loop
        {...props}
      />
    ),
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
    ...components,
  };
}

export const useMDXComponents = getMDXComponents;
