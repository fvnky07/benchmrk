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
    img: ({
      className,
      alt,
      src,
      width,
      height,
    }: React.ComponentProps<'img'>) => (
      <Image
        className={cn('mb-2 rounded-xl border-2', className)}
        alt={alt ?? ''}
        src={src as string}
        width={width ? Number(width) : undefined}
        height={height ? Number(height) : undefined}
        fill={!width && !height}
      />
    ),
    Video: ({
      className,
      src,
      poster,
    }: {
      className?: string;
      src?: string;
      poster?: string;
    }) => (
      <video
        className={cn('rounded-md border', className)}
        src={src}
        poster={poster}
        controls
        loop
      />
    ),
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
    ...components,
  };
}

export function useMDXComponents(components?: MDXComponents): MDXComponents {
  return getMDXComponents(components);
}
