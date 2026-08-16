// NOTE: Custom MDX components for rendering with Next.js Image optimization

import Image from 'next/image';
import type { ComponentPropsWithoutRef } from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

export type MDXComponents = Record<string, unknown>;

export function getMDXComponents(
  components: MDXComponents = {}
): MDXComponents {
  return {
    img: ({
      alt = '',
      className,
      width,
      height,
      src = '',
      ...props
    }: ComponentPropsWithoutRef<'img'>) => {
      if (typeof src !== 'string') {
        return (
          <img
            src={src}
            alt={alt}
            className={cn('mb-2 rounded-xl border-2', className)}
            width={width}
            height={height}
            {...props}
          />
        );
      }

      return (
        <Image
          src={src}
          alt={alt}
          className={cn('mb-2 rounded-xl border-2', className)}
          width={width ? Number(width) : 800}
          height={height ? Number(height) : 600}
          {...props}
        />
      );
    },
    Video: ({ className, ...props }: ComponentPropsWithoutRef<'video'>) => (
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
