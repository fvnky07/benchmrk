# Benchmrk

Benchmrk lets members track fitness activity under one authenticated identity.

## Language

**Social sign-in**:
Authentication initiated through a device-native Apple or Google identity picker.
_Avoid_: Browser sign-in, web OAuth

**Benchmrk identity**:
The member record that owns profile and workout data.
_Avoid_: Account, user

**Provider identity**:
A verified identity issued by Apple or Google.
_Avoid_: Social account

**Account linking**:
The deliberate attachment of a freshly authenticated **Provider identity** to a **Benchmrk identity** under an active member session.
_Avoid_: Automatic merging

**Profile setup**:
The authenticated onboarding checkpoint completed by choosing a unique username or explicitly accepting an assigned one; bio and photo are optional.
_Avoid_: Registration

## Relationships

- A **Social sign-in** establishes access to one **Benchmrk identity**
- A newly created **Benchmrk identity** imports any available provider name and avatar
- Google **Social sign-in** is available on iOS and Android; Apple **Social sign-in** is available only on iOS
- A **Social sign-in** action appears only when its provider can complete authentication on that platform
- Any **Benchmrk identity** without a username must pass through **Profile setup** before accessing the main app
- **Profile setup** presents an editable username suggestion derived from available identity details
- An assigned username is shown to the member and requires confirmation before **Profile setup** completes
- A **Benchmrk identity** may have multiple explicitly linked **Provider identities**
- Explicit **Account linking** may attach a **Provider identity** whose email differs from the **Benchmrk identity**
- **Account linking** never changes profile details on the **Benchmrk identity**
- A **Provider identity** is never attached to an existing **Benchmrk identity** solely because their email addresses match

## Example dialogue

> **Dev:** "Google returned the same email as an existing password login. Should **Social sign-in** merge them?"
> **Domain expert:** "No — require the member to authenticate first, then perform explicit **Account linking**."

## Flagged ambiguities

- "account" could mean either a **Benchmrk identity** or a **Provider identity** — use the specific term
