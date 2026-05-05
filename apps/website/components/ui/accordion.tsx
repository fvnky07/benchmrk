'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import type * as React from 'react';

import { cn } from '@/lib/utils';

function Accordion(
  props: React.ComponentProps<typeof AccordionPrimitive.Root>
) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('border-border border-t first:border-t-0', className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'flex w-full items-center justify-between gap-3 py-3 text-left font-semibold text-xl outline-none transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 sm:gap-4 sm:py-4 sm:text-2xl lg:text-3xl [&[data-state=open]>svg]:rotate-180',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3 sm:gap-4">{children}</div>
        <ChevronDown className="size-5 shrink-0 text-cyan-1 transition-transform duration-200 sm:size-6" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down sm:text-base lg:text-lg"
      {...props}
    >
      <div className={cn('pt-1 pb-3 pl-9 sm:pb-4 sm:pl-10', className)}>
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
