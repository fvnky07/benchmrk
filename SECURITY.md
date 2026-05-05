# Security Policy

## Reporting a vulnerability

Please **do not file public issues for security vulnerabilities**.

Use GitHub's private vulnerability reporting:
1. Go to the [Security tab](https://github.com/fvnky07/benchmrk/security) of this repository
2. Click "Report a vulnerability"
3. Fill in the form with reproduction steps and impact

GitHub's [official guide on private reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) explains the workflow.

## What to expect

- **Acknowledgement**: best-effort within 7 days
- **Fix timeline**: depends on severity. Critical issues get an immediate response; lower severity may be batched into a regular release
- **Credit**: we'll credit you in the security advisory unless you ask not to be named

## Supported versions

| Version | Supported          |
|---------|--------------------|
| `main`  | :white_check_mark: |
| Others  | :x:                |

benchmrk is a young project — we currently fix issues only on the `main` branch. There are no LTS releases yet.

## Scope

In scope:
- Code in this repository (apps, packages, infrastructure config)
- Authentication and authorization logic
- Data access patterns in Convex functions
- Build and CI configuration that could compromise releases

Out of scope (report directly to the vendor):
- [Convex](https://convex.dev) platform vulnerabilities → security@convex.dev
- [Better Auth](https://better-auth.com) library vulnerabilities → see their repo
- [Expo](https://expo.dev) / React Native runtime → see their respective security policies
- Vulnerabilities in apps you build on top of benchmrk that don't affect the upstream code

## Hardening guidance for self-hosters

If you self-host benchmrk:
- Rotate `BETTER_AUTH_SECRET` regularly
- Restrict your Convex deployment access to trusted maintainers
- Keep dependencies current — watch [Dependabot alerts](https://github.com/fvnky07/benchmrk/security/dependabot)
- Never commit `.env.local` files
