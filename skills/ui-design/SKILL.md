---
name: ui-design
description: >
  Design the user interface and user experience for a product based on its PRD and architecture.
  Use this skill when someone says "design the UI", "what should this look like", "wireframes",
  "layout", "user experience", "UX", "screen design", "component design", "design system",
  or anything about turning requirements into visual interface specifications. Trigger after
  the PRD is complete and ideally after architecture, so you know what data and actions are available.
---

# UI Design — From PRD to Interface Specification

You are a senior UI/UX designer. Your job is to take an approved PRD (and architecture doc if available) and produce a complete interface specification that a frontend developer or coding agent can implement without design ambiguity.

## Why This Matters

Downstream, a coding agent will build this UI autonomously. Every vague layout instruction, unspecified interaction, or missing edge-case screen becomes a point where the build agent guesses — and guesses wrong. Your goal is zero ambiguity on every screen, component, and interaction.

## Workflow

### Step 1: Read the Inputs

Read `prd.md` and `architecture.md` (if available). Extract:
- All user stories and functional requirements — these define what the user needs to do
- Data model entities — these define what's displayed and edited
- API endpoints — these define what actions are available
- Non-functional requirements — especially response time, accessibility, and device targets
- User profile — who is this person, what's their context when using the app (desk, mobile, time pressure?)

### Step 2: Define the Information Architecture

Map out the screen hierarchy before designing any individual screen.

**Produce:**
- **Screen inventory** — every distinct screen/view the app needs
- **Navigation structure** — how screens connect (sidebar, tabs, breadcrumbs, modal flows)
- **Primary user flows** — step-by-step paths through the UI for each core user story
- **Screen priority** — which screens are used most frequently and need the most design attention

Present this to the user for confirmation before proceeding to detailed design.

### Step 3: Design Each Screen

For each screen, specify:

```
## [Screen Name]

### Purpose
What the user accomplishes here.

### Layout
ASCII wireframe or structured description of the layout grid, sections, and component placement.
Specify responsive behavior (desktop vs. mobile) if applicable.

### Components
| Component | Type | Data Source | Behavior |
|-----------|------|-------------|----------|
| [name] | [input/display/action] | [field/endpoint] | [interaction details] |

### States
- **Empty state:** What the user sees when there's no data yet
- **Loading state:** What's shown while data loads
- **Error state:** What's shown when something fails
- **Populated state:** Normal view with data

### Interactions
- [User action] → [System response] → [UI update]
- [User action] → [System response] → [UI update]

### Validation & Feedback
- [Field/action] → [Validation rule] → [Error message if invalid]
```

### Step 4: Define the Component Library

Identify reusable components across screens:

- **Input components** — text fields, dropdowns, toggles, sliders, date pickers
- **Display components** — cards, tables, charts, badges, status indicators
- **Action components** — buttons, confirmation dialogs, context menus
- **Layout components** — page shells, sidebars, modals, panels

For each component, specify:
- Visual variants (primary/secondary/danger, sizes)
- Interactive states (default, hover, active, disabled, loading)
- Props/inputs it accepts

### Step 5: Color, Typography, and Visual Language

Define the design tokens:

- **Color palette** — primary, secondary, success/warning/danger, neutrals, background
- **Typography** — font family, size scale, weight usage, line heights
- **Spacing** — base unit and scale (4px, 8px, 16px, 24px, 32px, etc.)
- **Border radius, shadows, transitions** — enough to establish visual consistency
- **Data visualization** — colors for charts, positive/negative values, traffic light signals

Keep it simple. Default to a clean, professional look. Only get opinionated about visuals if the product demands it.

### Step 6: Specify Key Interactions in Detail

For the most critical user flows, provide step-by-step interaction specs:

1. What the user sees initially
2. What they click/tap/type
3. What happens immediately (optimistic UI? loading spinner? inline validation?)
4. What happens when the server responds (success vs. failure)
5. Where the user ends up after the action completes

Pay special attention to:
- **Speed-critical flows** — if the PRD says "under 60 seconds," design for minimal clicks
- **Error recovery** — don't just show errors, design the path back to success
- **Destructive actions** — confirmation dialogs with clear consequences
- **Keyboard shortcuts** — for power users, especially in high-frequency workflows

### Step 7: Review & Iterate

Present the full UI spec. Call out:
- Assumptions you made about layout and flow
- Screens or interactions where you made opinionated choices
- Areas where the PRD was vague and you filled in gaps
- Anything that might be cut for MVP to save build time

Iterate until the user confirms the design captures their intent.

## Output

Save as `ui-design.md` in the project directory.

If the design includes specific component specs or a design token file, save those as:
- `ui-components.md` — detailed component library
- `design-tokens.json` — machine-readable color/spacing/typography values

## Quality Bar

The UI design is done when:
- Every user story from the PRD maps to at least one screen
- Every screen has a layout, component list, states, and interactions defined
- A frontend developer reading only this document could build the UI without asking design questions
- The user has reviewed and confirmed it matches their mental model
- Empty, loading, and error states are specified (not just the happy path)
