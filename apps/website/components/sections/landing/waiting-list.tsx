'use client';
import GridPattern from '@/components/ui/grid-pattern';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Sparkle } from 'lucide-react';
import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@repo/backend/convex/_generated/api';

export default function WaitingList() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutateEmail = useMutation(api.waitlist.addEmailToWaitlist);

  const handleRegister = async () => {
    if (!email) {
      setError('Please enter an email');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await mutateEmail({ email });
      setSuccess(true);
      setEmail('');
      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section
      id="waitlist"
      className="bg-black-1 relative flex h-screen w-full flex-col items-center justify-center overflow-hidden px-4 py-12 sm:px-4 lg:px-12"
    >
      <GridPattern
        width={30}
        height={30}
        strokeColor="rgba(255,255,255, 0.3)"
      />
      <div className="debug bg-black-2 relative z-10 flex h-full w-full flex-col overflow-hidden rounded-4xl p-2 shadow sm:flex-row lg:p-0">
        {/* <div className="hidden flex-col gap-2 lg:flex lg:gap-4"></div> */}
        <div className="hidden flex-col gap-2 lg:flex lg:gap-4">
          {/* NOTE: Each text container grows to fill available space */}
          <div className="flex items-center justify-baseline overflow-hidden">
            <h1 className="font-[nippo] text-[15vw] leading-none font-bold tracking-tighter sm:text-[12vw] lg:text-[20vw]">
              JOIN
            </h1>
          </div>
          <div className="flex items-center justify-baseline overflow-hidden">
            <h1 className="font-[nippo] text-[15vw] leading-none font-bold tracking-tighter sm:text-[12vw] lg:text-[20vw]">
              THE
            </h1>
          </div>
          <div className="flex items-center justify-baseline overflow-hidden sm:justify-baseline">
            <h1 className="font-[nippo] text-[15vw] leading-none font-bold tracking-tighter sm:text-[12vw] lg:text-[20vw]">
              LIST!
            </h1>
          </div>
        </div>

        <div className="flex grow flex-col items-center justify-center gap-4 p-4">
          <div className="bg-cyan-1 flex flex-2 grow rounded-4xl p-4">
            <div
              style={{ opacity: 0.45 }}
              className="flex h-full w-full flex-2 items-start justify-center rounded-4xl bg-black p-4"
            >
              <h1 className="text-4xl text-white md:text-6xl">
                <span>
                  <Sparkle className="size-12" />
                </span>
                First 100 people to sign up on the waitlist will recieve
                LIFETIME premium membership
              </h1>
            </div>
          </div>
          <div className="flex h-auto w-full flex-1 flex-col items-center justify-center gap-4 rounded-4xl border-6 border-black p-3">
            <Field>
              <FieldLabel htmlFor="input-button-group">
                Enter your email
              </FieldLabel>
              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && (
                <p className="text-sm text-green-500">
                  Successfully added to waitlist!
                </p>
              )}
              <ButtonGroup className="gap-2">
                <Input
                  id="input-button-group"
                  placeholder="johndoe@gmail.com"
                  className="h-12 rounded-4xl border-white px-4"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                  }}
                  disabled={isLoading}
                />
                <Button
                  onClick={handleRegister}
                  className="h-12 rounded-4xl px-4"
                  disabled={isLoading}
                >
                  {isLoading ? 'Registering...' : 'Register'}
                </Button>
              </ButtonGroup>
            </Field>
          </div>
        </div>
      </div>
    </section>
  );
}
