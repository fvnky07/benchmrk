# Benchmrk

Benchmrk lets members track fitness activity under one authenticated identity.

## Language

**Social sign-in**:
Authentication initiated through a device-native Apple or Google identity picker.
_Avoid_: Browser sign-in, web OAuth

**Waitlist identity**:
A **Benchmrk identity** created when a prospective member confirms the website waitlist magic link and which may carry lifetime premium access.
_Avoid_: Waitlist account, premium account

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

**Routine**:
A planned template a member builds beforehand: an ordered list of **Exercises**, each with a target number of **Sets** and a **Rep range**.
_Avoid_: Workout (for the template), Program, Plan

**Workout**:
One performed gym visit by a **Benchmrk identity**, recorded live from start to finish.
_Avoid_: Session, Routine

**Exercise**:
A named movement from the shared catalog or a member-created custom one that can appear in **Routines** and **Workouts**.
_Avoid_: Movement, Lift

**Set**:
One logged effort of an **Exercise** within a **Workout**: weight and reps (or duration/distance for timed and cardio **Exercises**), a set type (normal, warmup, dropset, failure), and an optional **Effort rating**.
_Avoid_: Round, Entry

**Rep range**:
The lower and upper rep bounds a member aims to stay within for an **Exercise** in a **Routine** (for example 4–8 or 6–10).
_Avoid_: Rep target

**Effort rating**:
An optional per-**Set** rating of how hard the **Set** was, expressed on the scale the member chose in settings (RPE or RIR).
_Avoid_: Difficulty

**Overload target**:
The weight and reps the app suggests for a member's next **Sets** of an **Exercise**, derived from their previous **Workouts** and the **Rep range**.
_Avoid_: Recommendation, Goal

**Working Set**:
A **Set** of type normal or failure; warmup and dropset **Sets** are not **Working Sets** and never count toward an **Overload target**.
_Avoid_: Real set, Counted set

**Stalled Workout**:
A completed **Workout** in which a member performed an **Exercise** with at least one **Working Set** but did not meet its **Overload target**.
_Avoid_: Failed Workout

**Plateau**:
Three consecutive **Stalled Workouts** for the same **Exercise**.
_Avoid_: Stall (for the three-Workout state)

**Alternating sets**:
Two or more **Exercises** in a **Routine** or **Workout** performed by rotating one **Set** of each in turn rather than finishing one **Exercise** at a time.
_Avoid_: Superset (use only as an informal synonym in UI copy), Circuit

## Relationships

- A **Social sign-in** establishes access to one **Benchmrk identity**
- A confirmed **Waitlist identity** can access the native app through magic-link sign-in without creating a second **Benchmrk identity**
- Native magic-link sign-in is limited to an existing confirmed **Waitlist identity** and never creates a new **Benchmrk identity**
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
- A **Routine** is the plan; a **Workout** is what actually happened, and a **Workout** may be started from a **Routine** or from nothing
- A **Set** belongs to exactly one **Workout** and one **Exercise**
- A **Benchmrk identity** owns its **Routines**, **Workouts** and **Sets**
- An **Overload target** is computed per **Exercise** from the member's own history and never from another member's data
- An **Overload target** exists only for strength and bodyweight **Exercises**; timed and cardio **Exercises** show only their previous **Set**
- An abandoned **Workout**, or a skipped **Exercise** in a completed **Workout**, is never a **Stalled Workout**
- A **Plateau** is flagged to the member and never changes a **Routine** or an **Overload target** on its own


## Example dialogue

> **Dev:** "Google returned the same email as an existing password login. Should **Social sign-in** merge them?"
> **Domain expert:** "No — require the member to authenticate first, then perform explicit **Account linking**."
> **Dev:** "A member hits the top of the **Rep range**. What is the **Overload target**?"
> **Domain expert:** "The **Overload target** is more weight."


## Flagged ambiguities

- "account" could mean either a **Benchmrk identity** or a **Provider identity** — use the specific term
- The current code uses "workout" for a **Routine** and "workout session" for a **Workout** — use the specific terms **Routine** and **Workout** going forward
- "session" is overloaded: it can mean a signed-in member session (authentication) or a **Workout** — say "member session" or **Workout**
