'use client';

import { Check, X } from 'lucide-react';

interface ComparisonRow {
  feature: string;
  individuals: boolean | string;
  teams: boolean | string;
}

// NOTE: Comprehensive feature comparison between Individual and Team tiers
const FEATURE_COMPARISON: ComparisonRow[] = [
  {
    feature: 'Email Alerts',
    individuals: 'Free',
    teams: 'Unlimited',
  },
  {
    feature: 'Phone Call Alerts',
    individuals: false,
    teams: true,
  },
  {
    feature: 'Check Frequency',
    individuals: '3 minutes',
    teams: '30 seconds',
  },
  {
    feature: 'Data Enrichment',
    individuals: 'Automatic',
    teams: 'Automatic',
  },
  {
    feature: 'Monitors',
    individuals: '10',
    teams: '20',
  },
  {
    feature: 'Team Seats',
    individuals: 'Up to 3',
    teams: 'Up to 6',
  },
  {
    feature: 'Priority Support',
    individuals: false,
    teams: true,
  },
  {
    feature: 'Custom Integrations',
    individuals: false,
    teams: true,
  },
  {
    feature: 'API Access',
    individuals: false,
    teams: true,
  },
];

interface FAQItem {
  question: string;
  answer: string;
}

// NOTE: Common pricing questions to reduce support load
const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Can I switch plans at any time?',
    answer:
      "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges.",
  },
  {
    question: 'What happens when I reach my monitor limit?',
    answer:
      "You'll receive a notification when approaching your limit. You can upgrade to a higher tier or purchase additional monitor capacity.",
  },
  {
    question: 'Do you offer refunds?',
    answer:
      "We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied, contact us for a full refund.",
  },
  {
    question: 'Is there a discount for annual billing?',
    answer:
      'Yes! Annual billing saves you 17% compared to monthly billing. Teams plan is $75/month when billed annually vs $90/month.',
  },
  {
    question: 'Can I add more team members?',
    answer:
      'Each plan comes with a set number of seats. Contact us for custom enterprise plans if you need more seats.',
  },
];

export const PricingBreakdown = () => {
  return (
    <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black-1 px-4 py-16 sm:px-4 sm:py-24 lg:px-12">
      <div className="w-full max-w-6xl space-y-16">
        {/* Feature Comparison Table */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="font-medium text-4xl text-green-1 tracking-tight sm:text-5xl">
              Compare Plans
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-foreground/60 sm:text-lg">
              See what&apos;s included in each plan and find the perfect fit for
              your needs.
            </p>
          </div>

          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:block">
            <table className="w-full">
              <thead className="border-white/10 border-b bg-green-1/10">
                <tr>
                  <th className="px-6 py-4 text-left font-medium text-sm text-white">
                    Feature
                  </th>
                  <th className="px-6 py-4 text-center font-medium text-sm text-white">
                    Individuals
                  </th>
                  <th className="bg-green-1/5 px-6 py-4 text-center font-medium text-sm text-white">
                    Teams
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {FEATURE_COMPARISON.map((row) => (
                  <tr
                    key={row.feature}
                    className="transition-colors hover:bg-white/5"
                  >
                    <td className="px-6 py-4 text-foreground/80 text-sm">
                      {row.feature}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {typeof row.individuals === 'boolean' ? (
                        row.individuals ? (
                          <Check className="mx-auto h-5 w-5 text-green-1" />
                        ) : (
                          <X className="mx-auto h-5 w-5 text-foreground/20" />
                        )
                      ) : (
                        <span className="text-foreground/80 text-sm">
                          {row.individuals}
                        </span>
                      )}
                    </td>
                    <td className="bg-green-1/5 px-6 py-4 text-center">
                      {typeof row.teams === 'boolean' ? (
                        row.teams ? (
                          <Check className="mx-auto h-5 w-5 text-green-1" />
                        ) : (
                          <X className="mx-auto h-5 w-5 text-foreground/20" />
                        )
                      ) : (
                        <span className="text-foreground/80 text-sm">
                          {row.teams}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-4 sm:hidden">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm">
              <div className="border-white/10 border-b bg-green-1/10 px-4 py-3 text-center font-medium text-white">
                Individuals
              </div>
              <div className="divide-y divide-white/5">
                {FEATURE_COMPARISON.map((row) => (
                  <div
                    key={row.feature}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <span className="text-foreground/80 text-sm">
                      {row.feature}
                    </span>
                    <span className="text-foreground/80 text-sm">
                      {typeof row.individuals === 'boolean' ? (
                        row.individuals ? (
                          <Check className="h-5 w-5 text-green-1" />
                        ) : (
                          <X className="h-5 w-5 text-foreground/20" />
                        )
                      ) : (
                        row.individuals
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm">
              <div className="border-white/10 border-b bg-green-1/10 px-4 py-3 text-center font-medium text-white">
                Teams
              </div>
              <div className="divide-y divide-white/5">
                {FEATURE_COMPARISON.map((row) => (
                  <div
                    key={row.feature}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <span className="text-foreground/80 text-sm">
                      {row.feature}
                    </span>
                    <span className="text-foreground/80 text-sm">
                      {typeof row.teams === 'boolean' ? (
                        row.teams ? (
                          <Check className="h-5 w-5 text-green-1" />
                        ) : (
                          <X className="h-5 w-5 text-foreground/20" />
                        )
                      ) : (
                        row.teams
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="font-medium text-4xl text-green-1 tracking-tight sm:text-5xl">
              Frequently Asked Questions
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-foreground/60 sm:text-lg">
              Everything you need to know about our pricing and plans.
            </p>
          </div>

          <div className="mx-auto max-w-3xl space-y-4">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="group overflow-hidden rounded-xl border border-white/10 bg-background/50 backdrop-blur-sm transition-all hover:border-white/20"
              >
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-left font-medium text-white transition-colors hover:bg-white/5">
                  <span className="text-base sm:text-lg">{item.question}</span>
                  <svg
                    className="h-5 w-5 shrink-0 text-green-1 transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="border-white/5 border-t px-6 py-4 text-foreground/80 text-sm leading-relaxed sm:text-base">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="rounded-2xl border border-white/10 bg-green-1/10 px-6 py-8 text-center backdrop-blur-sm sm:px-12 sm:py-12">
          <h3 className="font-medium text-2xl text-green-1 sm:text-3xl">
            Still have questions?
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-foreground/80 text-sm sm:text-base">
            Our team is here to help you choose the right plan for your needs.
          </p>
          <button className="mt-6 rounded-full bg-green-1 px-8 py-3 font-medium text-black text-sm transition-all hover:bg-green-1/90 sm:text-base">
            Contact Sales
          </button>
        </div>
      </div>
    </section>
  );
};
