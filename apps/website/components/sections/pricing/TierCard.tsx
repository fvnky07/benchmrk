// Source: https://github.com/aymanch-03/shadcn-pricing-page
import NumberFlow from '@number-flow/react';
import { ArrowRight, BadgeCheck } from 'lucide-react';

import type { TIERS } from '@/components/config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const PricingCard = ({
  tier,
  paymentFrequency,
}: {
  tier: (typeof TIERS)[0];
  paymentFrequency: string;
}) => {
  const price = tier.price[paymentFrequency];
  const isHighlighted = tier.highlighted;
  const isPopular = tier.popular;

  return (
    <div
      className={cn(
        'relative flex flex-col gap-8 overflow-hidden rounded-2xl border p-6 shadow',
        isHighlighted ? 'bg-foreground text-white' : 'bg-black-1 text-white',
        isPopular && 'bg-green-1 text-black outline-2 outline-black'
      )}
    >
      {/* Background Decoration */}

      {/* Card Header */}
      <h2 className="flex items-center gap-3 font-medium text-4xl capitalize">
        {tier.name}
        {isPopular && (
          <Badge className="mt-1 bg-orange-1 px-2 py-1 text-white hover:bg-orange-1">
            🔥 Most Popular
          </Badge>
        )}
      </h2>

      {/* Price Section */}
      <div className="relative h-12">
        {typeof price === 'number' ? (
          <>
            <NumberFlow
              format={{
                style: 'currency',
                currency: 'USD',
                trailingZeroDisplay: 'stripIfInteger',
              }}
              value={price}
              className="font-medium text-4xl"
            />
            <p className="-mt-2 font-medium text-xs">Per month/user</p>
          </>
        ) : (
          <h1 className="font-medium text-4xl">{price}</h1>
        )}
      </div>

      {/* Features */}
      <div className="flex-1 space-y-2">
        <h3 className="font-medium text-sm">{tier.description}</h3>
        <ul className="space-y-2">
          {tier.features.map((feature) => (
            <li
              key={feature}
              className={cn(
                'flex items-center gap-2 font-medium text-sm',
                isHighlighted ? 'text-background' : 'text-foreground/60'
              )}
            >
              <BadgeCheck strokeWidth={1} size={16} />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Call to Action Button */}
      <Button
        variant="expandIcon"
        Icon={ArrowRight}
        iconPlacement="right"
        className={cn(
          'h-fit w-full rounded-lg',
          isHighlighted && 'bg-accent text-foreground hover:bg-accent/95'
        )}
      >
        {tier.cta}
      </Button>
    </div>
  );
};

// Popular Background Component
