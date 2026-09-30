# Restrict native magic links to confirmed Waitlist identities

Native magic-link sign-in authenticates only an existing confirmed Waitlist identity and returns the same user-visible response for eligible and ineligible emails; it never creates a Benchmrk identity or grants premium access to an unknown email. This preserves access for passwordless waitlist members without turning the native login route or Better Auth’s current post-verification premium hook into an unrestricted registration path.
