# Note Loops UI Overhaul Instructions (Professional SaaS Pass)

This document is the single source of truth for the UI overhaul. Follow it step by step. Do not stop after small tweaks. The goal is a coherent, modern, professional SaaS UI across the app.

## Goal

Make Note Loops look like a modern, professional product:
- Clear visual hierarchy and typography
- Consistent spacing and layout
- Intentional navigation with active states
- Unified component styling (radius, shadows, borders, padding)
- Responsive behavior that looks designed, not accidental

## Non-goals

- Do not change backend logic, auth flow, data models, or database schema
- Do not change routes or break existing functionality
- Do not introduce a new UI library (keep Tailwind + shadcn/ui + Radix)
- Do not do “minor improvements” and stop; this is a full pass

## Stack Constraints

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- shadcn/ui components (local)
- Radix primitives
- lucide-react icons

## Definition of Done (must satisfy all)

A) Visual hierarchy is obvious at a glance (title → purpose → primary action)  
B) No page has huge dead whitespace on desktop; content uses a consistent container width and grid  
C) Navigation has a clear active state and feels intentional (not a row of generic buttons)  
D) Cards share consistent radius, border, shadow, padding, and headers  
E) Forms share consistent label/input/help/error spacing and focus rings  
F) Responsive: mobile = single column, tablet = 2 columns where relevant, desktop = grid  
G) Accessibility basics: keyboard focus visible, headings in order, contrast acceptable  

---

# Phase 0: Baseline Rules (apply everywhere)

## 0.1 Standard Container and Rhythm

Create and use a single container width across the app:
- Max width: `max-w-6xl`
- Gutters: `px-4 sm:px-6 lg:px-8`
- Main vertical padding: `py-8 sm:py-10`

All pages should render inside this container via AppFrame (no page should roll its own max width).

## 0.2 Surface + Elevation Rules

- App background should not be pure white everywhere.
- Use a subtle app background (e.g. `bg-muted/20`) behind content.
- Cards sit on top of the background with:
  - `rounded-xl`
  - `border border-border/60`
  - shadow token: `shadow-[var(--shadow)]`

Avoid Tailwind’s default `shadow-sm` and use theme shadow variables instead.

## 0.3 Radius Rules (strict)

- Cards: `rounded-xl`
- Inputs, buttons, tabs, controls: `rounded-lg`
- Inner elements inside tabs/cards can be `rounded-md` if needed, but the default should be `rounded-lg`.

Do not mix random rounded values across the app.

## 0.4 Typography Rules (strict)

Define and apply consistently:
- Page title: large, tracking-tight, not ultra-bold
- Page description: muted, readable line height
- Section titles: medium, semibold
- Body: base size with comfortable leading
- Muted: only for genuinely secondary text

Do not create one-off text sizes per page.

---

# Phase 1: Foundation Changes (components + theme usage)

## 1.1 Create a Container Component

Create `components/layout/Container.tsx`:

- Provides the max width and gutters used everywhere.
- Use it in AppFrame header and main content.

Implementation:

- `mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8`

## 1.2 Update AppFrame to Use Container and App Background

Update `AppFrame.tsx`:
- Root: `min-h-screen bg-muted/20 text-foreground`
- Header: sticky, subtle blur, border bottom
- Header content: inside `<Container>`
- Main: `py-8 sm:py-10` and inside `<Container>`

Header should not `flex-wrap`. Keep header stable.

## 1.3 Replace Header Navigation Buttons with Real Navigation

Update `HeaderNav.tsx`:
- Use `usePathname()` for active route styling
- Primary nav: `Library`
- Admin nav: only if admin, secondary
- Account: move into a right-side dropdown menu (avatar/icon button)
- Logged-out: show a single primary `Login` CTA

Do not render “Account”, “Library”, “Admin” as three equal outline buttons.

Use:
- `DropdownMenu` for account menu
- `Button variant="ghost"` for nav items
- Active state styling for current route

---

# Phase 2: Unify shadcn Component Styling (high impact)

These changes ensure every page immediately looks cohesive.

## 2.1 card.tsx

Change Card base class to use theme shadow and softer border.

Update Card root classes to:
- `rounded-xl border border-border/60 bg-card text-card-foreground shadow-[var(--shadow)]`

Remove default Tailwind `shadow-sm`.

## 2.2 button.tsx

Standardize rounding and sizes:
- Base class should use `rounded-lg` (not `rounded-md`).
- Size variants should not override rounding.

Update:
- Base: `rounded-lg`
- Sizes:
  - default: `h-10 px-4 py-2`
  - sm: `h-9 px-3`
  - lg: `h-11 px-8`
  - icon: `h-10 w-10`

Keep focus rings and accessibility behavior.

## 2.3 input.tsx

Update Input:
- Use `rounded-lg` (not `rounded-md`)
- Keep focus visible styling
- Ensure height matches button: `h-10`

## 2.4 textarea.tsx

Update Textarea:
- Use `rounded-lg`
- Minimum height: `min-h-[96px]`
- Match Input padding/typography

## 2.5 dialog.tsx

Make dialogs feel premium:
- Overlay: `bg-black/30` + optional `backdrop-blur-[2px]`
- Content: `rounded-xl`, `p-6`, `border-border/60`
- Shadow: `shadow-[var(--shadow-lg)]`

## 2.6 sheet.tsx

Same concept as dialog:
- Overlay: `bg-black/30 backdrop-blur-[2px]`
- Content: `rounded-xl p-6 border-border/60 shadow-[var(--shadow-lg)]`

## 2.7 tabs.tsx (recommended)

Make tabs look less default:
- TabsList: `rounded-lg border border-border/60 bg-muted p-1`
- TabsTrigger: consistent spacing and active shadow:
  - `data-[state=active]:shadow-[var(--shadow-sm)]`

---

# Phase 3: Shared Page Components (to stop one-off layouts)

Create these shared components and use them on the main pages.

## 3.1 PageShell

Create a `PageShell` component that standardizes:
- Title + description on the left
- Optional actions on the right (search, dropdowns, CTAs)
- Content underneath with consistent spacing

Recommended structure:
- Header row: `flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between`
- Title: `text-3xl sm:text-4xl font-semibold tracking-tight`
- Description: `text-muted-foreground max-w-prose`
- Body spacing: `mt-6 space-y-6`

## 3.2 SectionCard

Create a `SectionCard` wrapper around Card:
- Standard `CardHeader` spacing
- Standard `CardContent` padding
- Optional footer
- Ensures every section looks consistent

## 3.3 EmptyState

Create a reusable empty state:
- icon, title, description, primary action
- Centered, with good spacing
- Used whenever lists are empty

---

# Phase 4: Page Redesigns (apply the system)

Do these after Phase 1 + 2, otherwise you’ll fight styling inconsistencies.

## 4.1 Landing / Login Page

Problems to fix:
- Too many competing boxes
- Primary action not dominant
- Duplicated “invite” concepts

New layout (required):
- Hero section (2 columns on desktop):
  Left:
  - Product title
  - One-sentence description
  - Invite code input + Continue (primary CTA)
  - Helper line under input
  Right:
  - Single “How it works” card with 3 steps and icons (Read, Listen, Comment)

Below hero:
- Secondary section with the 3 image panels (Read/Listen/Comment)
  - Same card style
  - Same image size/aspect ratio
  - Short descriptions only

Acceptance:
- On load, eye goes: title → purpose → invite input → Continue.

## 4.2 Library Page

Problems to fix:
- Huge dead whitespace
- No scanning aids (search/sort)
- Single left-aligned card feels accidental

New layout (required):
- Use `PageShell` with actions:
  - Search input (placeholder: “Search books”)
  - Sort dropdown (Recently opened / Title)
- Content:
  - If user has progress: show a “Continue reading” card first
  - Then grid of book cards:
    - `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6`

Book card requirements:
- Cover image: consistent aspect ratio (no random heights)
- Title + chapters count
- Description clamped to 2–3 lines
- Primary action: Open (button)
- Secondary actions: PDF/EPUB should be subtle (small outline buttons or a dropdown)

Acceptance:
- With 1 book, the card still looks intentional (grid and width are correct).
- With many books, the grid scales cleanly.

## 4.3 Book Detail Page

Problems to fix:
- Chapters list needs scannability
- About text needs readable rhythm
- Actions/resume/feedback need clearer structure

New layout (required):
- Two-column on desktop:
  Left rail (sticky):
  - Cover
  - Title
  - Quick actions (PDF/EPUB)
  - Resume card (last position + resume button)
  - “Book feedback” entry action
  Right content:
  - Use tabs or clear sections:
    - Overview (About + stats)
    - Chapters (search + list)
    - Feedback (summary if exists)

Chapters list requirements:
- Add search field above list
- Each row shows:
  - Chapter title
  - Optional subtitle
  - Status (not started / in progress / done) if available
  - Hover affordance and clear click target

About section requirements:
- Constrain line length, use spacing between paragraphs, avoid walls of text.

Acceptance:
- User can immediately see:
  - Resume point
  - Where to open chapters
  - Where to leave feedback

---

# Phase 5: Consistency Sweep (required)

After page updates:
- Remove one-off max-width wrappers from pages (AppFrame handles it)
- Remove `shadow-sm` usage in page components and replace with theme shadows
- Remove inconsistent `rounded-*` overrides that break the radius rules
- Ensure spacing is consistent using `space-y-*` and `gap-*` patterns

---

# Implementation Notes

## Expected files to change

- `AppFrame.tsx`
- `HeaderNav.tsx`
- `globals.css` (only if needed for minor token corrections; avoid major changes)
- shadcn components:
  - `button.tsx`
  - `card.tsx`
  - `input.tsx`
  - `textarea.tsx`
  - `dialog.tsx`
  - `sheet.tsx`
  - `tabs.tsx`
- New components:
  - `components/layout/Container.tsx`
  - `components/layout/PageShell.tsx`
  - `components/layout/SectionCard.tsx`
  - `components/EmptyState.tsx` (location flexible)
- Pages:
  - Landing/login page route
  - Library route
  - Book detail route

## Execution Rule (important)

Do not stop after Phase 1 or after editing one page. Complete all phases through Phase 5 so the result is coherent.

## Verification Checklist (final)

- Header looks like a real product header and has an active state.
- All cards share the same border, shadow token, radius, padding.
- All buttons and inputs share rounding and sizing.
- Landing page has a clear primary CTA and no competing boxes.
- Library uses grid + search/sort and has no dead space.
- Book detail has a sticky left rail and scannable chapters list.
- Mobile layout is clean and not “squished”.
