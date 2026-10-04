# Benchmrk

Benchmrk lets members track fitness activity under one authenticated identity.

## Language

**Social sign-in**:
Authentication initiated through a device-native Apple or Google identity picker.
_Avoid_: Browser sign-in, web OAuth

**Waitlist identity**:
A **Benchmrk identity** created when a prospective member confirms the website waitlist magic link.
_Avoid_: Waitlist account, premium account (Benchmrk has no paid tier)

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

**Native-Consistent Product UI**:
Visible controls and surfaces that follow each operating system's appearance, interaction, and accessibility conventions, using platform-native components where available and narrow fallbacks for confirmed gaps.
_Avoid_: Fully native screen, native-looking skin

**Layout Glue**:
Structure that composes routes and product UI without owning domain behavior.
_Avoid_: Native screen implementation

**Appearance Preference**:
A **Benchmrk identity**'s choice of System, Light, or Dark that controls brightness behavior.
_Avoid_: Theme, color theme

**Dynamic Palette**:
Android colors derived from the device wallpaper, expressed in light or dark tonal values according to the effective appearance.
_Avoid_: Brand palette

**Benchmrk Accent**:
The product's green accent family, using darker foreground tones on light surfaces and the bright canonical tone on dark surfaces so primary actions and selection remain accessible.
_Avoid_: Neon green, hard-coded green

**Confirmed Appearance**:
The latest **Appearance Preference** successfully saved for a specific **Benchmrk identity** and remembered locally for that identity's next launch.
_Avoid_: Device theme, pending appearance

**Unavailable Capability**:
A discoverable product capability whose information screen explains that it cannot currently be used and exposes no action that simulates completion.
_Avoid_: Coming soon action, placeholder workflow

**Community**:
The planned social area for discovering and interacting with other people's shared training activity.
_Avoid_: Public Routine list, community feed

**Web Adapter**:
The accessible web presentation of mobile product workflows when platform-native components are unavailable, without a requirement to mimic either mobile platform.
_Avoid_: Native web UI, mobile-only placeholder

**Adaptive Workspace**:
A tablet presentation chosen by workflow: list/detail content may split into panes, while focused tasks use a readable-width column or a useful two-column arrangement without replacing top-level tabs.
_Avoid_: Enlarged phone layout, tablet sidebar shell

**Group**:
A live shared session of **Group members**, each on their own **Workout** and **Routine**, in which everyone sees each other's progress. There is no product member cap; the backend refuses joins beyond a safety limit.
_Avoid_: Jam, Room, Lobby, Party, Squad, Crew

**Group host**:
The **Group member** who created the **Group**; they may remove members and end it.
_Avoid_: Owner, Admin

**Group member**:
A **Benchmrk identity** currently in a **Group**.
_Avoid_: Participant, Player

**Pace**:
How far a **Group member** has progressed through their own planned **Sets**, as a percentage, used to show who is ahead or behind and how close each is to finishing.
_Avoid_: Score, Rank

**Machine setup**:
The adjustment positions a member saves for the machine they use for an **Exercise** (for example seat height, back pad, pin or bench angle), shown whenever that **Exercise** comes up.
_Avoid_: Machine settings, Presets

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
- Permanent deletion remains bound to the originally selected **Benchmrk identity**; confirming a different identity never deletes either
- Permanent deletion immediately ends access to a **Benchmrk identity**, even while its owned data is being removed
- A successful password reset remains successful if local sign-out cannot finish
- A **Routine** is the plan; a **Workout** is what actually happened, and a **Workout** may be started from a **Routine** or from nothing
- Each **Routine** maintains its **Exercise** count for list summaries; adding or removing an **Exercise** updates the count in the same transaction
- Planned **Sets** per **Exercise** in a **Routine** are whole numbers from 1 to 20
- A custom **Exercise** and its comments are visible only to its owning **Benchmrk identity**
- Analytics stays disabled until the current **Benchmrk identity**'s saved consent is known; identification and lifecycle capture require consent
- A **Set** belongs to exactly one **Workout** and one **Exercise**
- A **Benchmrk identity** owns its **Routines**, **Workouts** and **Sets**
- An **Overload target** is computed per **Exercise** from the member's own history and never from another member's data
- An **Overload target** exists only for strength and bodyweight **Exercises**; timed and cardio **Exercises** show only their previous **Set**
- An abandoned **Workout**, or a skipped **Exercise** in a completed **Workout**, is never a **Stalled Workout**
- A **Plateau** is flagged to the member and never changes a **Routine** or an **Overload target** on its own
- **Layout Glue** composes **Native-Consistent Product UI** without changing shared product behavior
- On Android 12+, the **Dynamic Palette** supplies hue in every **Appearance Preference**; Light and Dark choose tonal brightness, while System follows the device appearance
- Before saved preferences are available, a returning **Benchmrk identity** uses its locally remembered **Confirmed Appearance**; signed-out members and identities without one follow the device appearance
- A **Confirmed Appearance** must never cross **Benchmrk identity** boundaries
- Signing out immediately returns the product to device appearance but retains each **Benchmrk identity**'s non-sensitive **Confirmed Appearance** for future sign-in
- An **Unavailable Capability** remains navigable, but its destination is explanatory and contains no enabled completion action or delivery-date promise
- iOS uses the **Benchmrk Accent** as app tint while other surfaces use the operating system's semantic appearance roles
- Android 11 and below derive light and dark semantic colors from the **Benchmrk Accent** because a **Dynamic Palette** is unavailable
- The **Web Adapter** preserves workflow behavior, states, labels, keyboard access, and responsive layout; visual parity with Android or iOS is not required
- Tablets retain top-level tabs and use an **Adaptive Workspace** rather than applying one layout pattern to every route
- A **Group member**'s **Workout** stays their own; leaving a **Group** never ends it, and ending or abandoning the **Workout** removes them from the **Group**
- A **Benchmrk identity** is in at most one **Group** at a time
- A **Group** shows each member's **Pace**; a member's **Overload target** stays computed from their own history and only its met or missed status is shown
- A **Group member**'s **Effort ratings**, notes and body data are never shown to the **Group**; set-by-set weights and reps are shown only if that member chooses
- A **Group member** sees only progress made after they joined
- A **Machine setup** belongs to one **Benchmrk identity** and one **Exercise**; there is at most one per **Exercise** until gyms are modelled


## Example dialogue

> **Dev:** "Google returned the same email as an existing password login. Should **Social sign-in** merge them?"
> **Domain expert:** "No — require the member to authenticate first, then perform explicit **Account linking**."
> **Dev:** "A member hits the top of the **Rep range**. What is the **Overload target**?"
> **Domain expert:** "The **Overload target** is more weight."


## Flagged ambiguities

- "account" could mean either a **Benchmrk identity** or a **Provider identity** — use the specific term
- The current code uses "workout" for a **Routine** and "workout session" for a **Workout** — use the specific terms **Routine** and **Workout** going forward
- "session" is overloaded: it can mean a signed-in member session (authentication) or a **Workout** — say "member session" or **Workout**
- "Platform-native UI" could mean a fully native implementation or a platform-consistent experience — use **Native-Consistent Product UI**
- "Theme" could mean an operating-system appearance or a member's choice — use **Appearance Preference** for the System, Light, or Dark choice
- "group" is used informally for a cluster of **Exercises** in alternating sets — say **Alternating sets**, and reserve **Group** for the live shared session; the later Gym Crews idea needs a different name
- The word "Jam" appears in older tickets and research — it means a **Group**
