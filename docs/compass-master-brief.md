# Compass Inc. — Master design & development brief

Saved word for word from the founders' brief of 15 November 2026, so that later sessions and teammates have the source. Do not edit it here. Decisions made since are recorded in [compass-art-direction.md](compass-art-direction.md) and [home-screen-spec.md](home-screen-spec.md).

---

**Claude Fable 5.2 | Phase 1: Visual Identity & Home Experience**

Project team: Josh, Oliver and Aditya
Primary development environment: Claude Code
Model: Claude Fable 5.2
Project: Compass
Current milestone: Establish the visual identity and build a high-fidelity, responsive Home prototype.

## 1. Your role

Act as a senior multidisciplinary product development team consisting of:

* A senior product designer responsible for product vision and UX.
* A world-class art director responsible for visual identity and creative direction.
* A 3D artist and technical artist specialising in Three.js.
* A senior frontend engineer specialising in React and TypeScript.
* A motion designer specialising in high-quality web interactions.
* A QA engineer responsible for functional and visual testing.

You are working with a three-person founding team: Josh, Oliver and Aditya.

Your responsibility is not simply to produce functional code. You are helping us establish the foundations of a distinctive, polished product that could eventually become a publicly available application.

Think independently, challenge weak design decisions, research when necessary and maintain high standards throughout the project.

Do not settle for generic AI-generated SaaS aesthetics.

## 2. Product vision

### What is Compass?

Compass is a planner and personal organisation application designed for students and individuals who want to manage their schoolwork, routines, habits and personal goals in one place.

The problem is that people frequently have their assignments, appointments, habits, priorities and goals scattered across different applications and platforms.

Compass brings these together in one approachable, visually engaging environment.

### Our distinctive feature

The user's boat develops as they make progress.

The boat is the emotional centre of the application. It represents the user's journey, consistency and personal development.

Users should be able to:

* Watch their boat develop over time.
* Unlock new boat components and decorations.
* Customise their boat's appearance.
* Experience different environments and seasonal decorations.
* See visual representations of their progress.

The boat should make organisation satisfying rather than stressful.

Missing a day must never erase previously earned progression or permanently damage the user's boat.

### Product philosophy

1. Functionality must remain excellent.
2. Visual quality should be a major differentiator.
3. Progress should feel rewarding.
4. The experience should be calm, approachable and motivating.
5. Users should have control over their experience.
6. Avoid unnecessary notifications, pop-ups and recommendations.
7. Privacy is the default.

### Initial business direction

Begin with a free, private planner.

Potential future business models include individual premium subscriptions, advanced customisation and school-wide licensing.

Do not implement monetisation, advertising or payment systems in this prototype.

## 3. First version product structure

The eventual application has five main destinations:

1. Home
2. Study
3. Habit Tracker
4. Weekly Review
5. My Pages

Fitness is an optional feature within the planner.

### Home

* Calendar-led interface.
* Daily and weekly tasks.
* Daily and weekly progress bars.
* Boat progression and customisation.
* Next-week priorities.
* Upcoming assessments and important events.

### Study

* Editable subject pages.
* Tasks and assessments.
* Recurring study sessions.
* Notes and preparation tasks.

### Habit Tracker

* User-defined habits.
* Daily or selected-weekday tracking.
* Historical completion records.
* Weekly consistency summaries.

### Weekly Review

* Saved weekly reflections.
* Task and habit summaries.
* Next-week priorities.

### My Pages

* Personal notes.
* Checklists.
* Goals.
* Reading and project pages.

IMPORTANT: This milestone concentrates on Home and the boat. Do not attempt to build the entire application now.

Create the navigation structure and sensible destinations for future pages, but prioritise the quality of the first Home experience.

## 4. Visual identity — highest priority

This section is particularly important.

We want Compass to look like a carefully art-directed product, not a standard productivity dashboard.

### Overall aesthetic

Our proposed direction is:

Premium nautical meets modern adventure.

The experience should combine:

* The calmness and sophistication of premium nautical design.
* The visual richness of an exploration/adventure game.
* The clarity of an excellent productivity application.
* The warmth of an approachable personal companion.

The product should feel mature enough for university students and adults, without losing its playful personality.

Avoid making it look like a children's educational game.

### Colour palette

Establish a complete colour system.

Initial direction:

* Deep ocean navy: primary brand colour.
* Rich marine blue: secondary colour.
* Muted teal: supporting colour.
* Warm ivory and cream: backgrounds and surfaces.
* Seafoam green: positive progress indicators.
* Muted sand or gold: occasional highlights.

Avoid excessive saturated colours.

Do not use bright blue gradients everywhere.

The colours should work across the dashboard, boat environment, calendar, typography and interactive states.

Create reusable design tokens rather than hardcoding colours throughout components.

### Typography

Typography should feel distinctive and carefully selected.

Explore:

* A refined display typeface for important headings.
* A highly readable sans-serif for interface text.
* Consistent typographic hierarchy.
* Carefully controlled line lengths and spacing.
* Tabular numerals for counters, dates and progress indicators.

Use properly licensed or freely available fonts.

Avoid generic typography combinations unless there is a compelling reason.

### Shapes and materials

Explore:

* Soft, continuous corner radii.
* Restrained shadows.
* Subtle depth.
* Carefully layered surfaces.
* Refined borders.
* Natural-looking water and lighting.

Avoid excessive glassmorphism, floating cards and unnecessary gradients.

The interface should feel cohesive rather than assembled from unrelated UI components.

## 5. The boat — central brand experience

The boat is arguably the most important visual asset in Compass.

Invest significant creative effort into getting it right.

### Desired appearance

A detailed, beautifully stylised 3D sailboat.

The boat should have:

* Recognisable proportions.
* A carefully designed hull.
* Detailed sails.
* A mast and rigging.
* Natural materials and textures.
* Subtle reflections and shadows.
* A recognisable silhouette.

It should feel like a premium adventure-game asset rather than a primitive collection of geometric shapes.

We want a balance between stylised realism and visual simplicity.

Avoid overly realistic simulation, excessive detail and childish cartoon proportions.

### The ocean environment

The boat should exist within a beautifully designed ocean environment.

Explore:

* Natural-looking animated water.
* Gentle waves.
* Subtle reflections.
* Soft environmental lighting.
* Atmospheric depth.
* A restrained horizon.
* Subtle wake effects.

The environment should create atmosphere without interfering with the planner.

### Boat progression

Develop a progression storyboard.

Potential stages:

1. Starter vessel — a small, simple sailboat.
2. Improved vessel — larger sails and improved detailing.
3. Developed vessel — additional structural features and decorations.
4. Advanced vessel — a more sophisticated and recognisable boat.

These are initial concepts, not fixed designs.

Show how the boat changes between stages and ensure the progression feels meaningful.

Progression should be based primarily on cumulative achievements and long-term participation, not solely on consecutive-day streaks.

Previously earned items must remain earned.

### Customisation

Eventually users should be able to customise:

* Hull colour.
* Sail colour.
* Flags.
* Decorations.
* Banners.
* Seasonal elements.

Separate earned rewards from freely selectable appearance options.

### Animation

The boat should have subtle, continuous movement.

Consider:

* Gentle bobbing.
* Small rotational changes.
* Moving sails.
* Water movement.
* Subtle environmental particles.

Animations should be smooth and interruptible.

Provide reduced-motion support.

On mobile, prioritise performance and battery efficiency.

## 6. Home screen — first implementation

The Home screen is our first major deliverable.

It must demonstrate how the boat and the planner work together.

### Layout principles

The calendar remains the primary organisational tool.

The boat is the emotional and visual centrepiece.

Do not sacrifice calendar usability to make room for decorative elements.

Explore a desktop composition featuring:

* Brand identity and navigation.
* A prominent calendar.
* Daily task organisation.
* Weekly progress.
* A dedicated boat/voyage experience.
* Upcoming priorities.

The layout should have excellent visual hierarchy.

Do not force everything into equal-sized cards.

### Suggested content

Use realistic sample information.

Example subjects:

* Biology.
* Economics.
* English.
* Mathematics.
* Chinese.

Example tasks:

* Complete Biology revision.
* Prepare Economics essay.
* Finish Mathematics exercises.
* Review English notes.

Example assessments:

* Biology test.
* Economics examination.
* English oral presentation.

Example habits:

* Read for 20 minutes.
* Complete daily revision.
* Exercise.
* Plan tomorrow.

These are sample records only.

### Required Home interactions

Implement working interactions for:

1. Switching between calendar weeks.
2. Selecting individual dates.
3. Viewing daily tasks.
4. Viewing weekly tasks.
5. Adding a task.
6. Editing a task.
7. Marking tasks complete.
8. Changing task priority.
9. Displaying daily progress.
10. Displaying weekly progress.
11. Viewing upcoming assessments.
12. Displaying next-week priorities.
13. Accessing the boat experience.

Progress indicators must update when the user changes task completion.

Calendar and task lists must use the same underlying sample records.

Do not create disconnected duplicate versions of tasks.

### Mobile experience

The responsive design must be intentional.

Do not simply shrink the desktop dashboard.

Consider:

* A compact navigation system.
* A well-designed mobile calendar.
* Touch-friendly task interactions.
* A smaller boat scene.
* Appropriate spacing.
* Safe-area support.
* Readable text.
* Bottom navigation where appropriate.

Test at approximately 375px, 390px, 768px, 1024px and 1440px widths.

## 7. Technical stack

Our current preference is a responsive web application.

Recommended initial stack:

* React.
* TypeScript.
* Vite.
* Tailwind CSS with custom styling.
* Three.js.
* React Three Fiber.
* Drei.
* Motion.
* Lucide React.
* Playwright.
* Vitest where appropriate.

Use current stable, compatible versions.

Before installing anything, inspect the existing repository and its dependencies.

Do not overwrite existing working code or remove established functionality.

If the current project already has a suitable architecture, retain it unless there is a strong technical reason to change.

### Architecture

Use:

* Reusable components.
* Clear separation of UI and business logic.
* Centralised design tokens.
* Consistent naming.
* Sensible file organisation.
* Type-safe data structures.

Avoid unnecessarily complex abstractions.

Use sample data and local persistence for the prototype where appropriate.

Do not build authentication, cloud storage, payment processing or production infrastructure yet.

### 3D performance

The boat experience is visually important, but performance is equally important.

Requirements:

* Lazy-load the 3D scene.
* Avoid unnecessarily high polygon counts.
* Limit device pixel ratio where appropriate.
* Avoid excessive real-time effects.
* Provide a graceful fallback when WebGL is unavailable.
* Support reduced motion.
* Test mobile performance.
* Avoid blocking the calendar while the 3D scene loads.

Use procedural geometry or appropriately licensed assets where suitable.

Do not use copyrighted models without permission.

## 8. Claude Code skills and tooling

Before substantial implementation, inspect the existing Claude Code environment.

### Required design skills

Install or verify the following:

**A. Anthropic Frontend Design**

Claude Code plugin:

`/plugin install frontend-design@anthropics/claude-code`

Purpose:

* Establish visual direction.
* Improve design decisions.
* Avoid generic interface patterns.
* Improve typography and layout.

Use this as the primary creative design skill.

**B. UI UX Pro Max**

Marketplace:

`/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill`

Then:

`/plugin install ui-ux-pro-max@ui-ux-pro-max-skill`

Alternatively, use the current CLI installation instructions:

`npx ui-ux-pro-max-cli init --ai claude`

Purpose:

* Design system research.
* Colour palettes.
* Typography pairings.
* Component and layout guidance.
* UX best practices.

Use its recommendations selectively. Compass's established art direction takes precedence.

**C. Optional visual refinement**

Investigate Impeccable as an optional additional skill.

Only install it if it adds capabilities not already provided by the primary design skills.

Avoid installing several overlapping design systems.

### Browser testing

Install Playwright MCP:

`claude mcp add playwright npx @playwright/mcp@latest`

Use it to:

* Open the local application.
* Interact with components.
* Test navigation.
* Inspect responsive layouts.
* Capture screenshots.
* Identify functional errors.

Verify that the MCP server is connected before relying on it.

### Additional tools

Investigate whether other tools are genuinely necessary.

Potential future integrations:

* Figma MCP if we introduce a Figma design workflow.
* Additional browser debugging tools if Playwright is insufficient.
* 3D asset creation tools if procedural geometry cannot achieve the desired visual quality.

Do not install tools simply because they are popular.

### Installation rules

Before installing:

1. Check whether the skill or integration is already installed.
2. Check compatibility.
3. Read the relevant instructions.
4. Avoid duplicate installations.
5. Prefer project-level dependencies where appropriate.
6. Ask before making unnecessary global system changes.

Never expose credentials, API keys or private information.

## 9. Design process

This is a design-led project.

Do not jump directly into coding.

Follow this sequence:

### Phase A — Repository and project audit

Inspect:

* Existing files.
* Current application structure.
* Existing components.
* Existing design decisions.
* Installed dependencies.
* Current Git status.
* Existing documentation.

Preserve existing work.

If there are uncommitted changes, do not overwrite them.

### Phase B — Art direction

Develop the proposed visual identity.

Create:

`docs/compass-art-direction.md`

This document should establish:

* Overall creative direction.
* Brand personality.
* Colour palette.
* Typography.
* Spacing.
* Component styling.
* Materials and textures.
* Illustration direction.
* 3D boat appearance.
* Animation principles.
* Desktop and mobile composition.
* References and anti-references.

Explore two or three distinct visual interpretations of the premium nautical direction.

Recommend one and explain why.

Present the art direction to the founding team before committing to the full Home implementation.

Do not treat a collection of generic inspiration images as a completed design system.

### Phase C — Home screen specification

Create:

`docs/home-screen-spec.md`

Include:

* Screen layout.
* Component hierarchy.
* Desktop composition.
* Mobile composition.
* Calendar behaviour.
* Task behaviour.
* Boat integration.
* Interaction specifications.
* Animation specifications.
* Accessibility considerations.

### Phase D — Build the Home prototype

Once the direction is approved:

* Implement the design system.
* Build the responsive Home screen.
* Create the 3D boat experience.
* Implement the required interactions.
* Connect the calendar and tasks.
* Add sample data.
* Add local persistence where appropriate.

Do not expand into unrelated features.

### Phase E — Visual refinement

This stage is not optional.

Review the actual application in a browser.

Capture screenshots at desktop and mobile sizes.

Compare the implementation against the art direction.

Look for:

* Weak hierarchy.
* Poor spacing.
* Inconsistent components.
* Generic styling.
* Unnecessary cards.
* Poor typography.
* Clipping.
* Misaligned elements.
* Excessive animations.
* Poor mobile composition.

Fix meaningful issues rather than simply reporting them.

## 10. Engineering and UX quality standards

Use the following principles where appropriate.

### Loading

* Skeleton loaders instead of unnecessary spinners.
* Blurred image placeholders where useful.
* Cached content while refreshing in the background.
* Avoid layout shifts.

### Interactions

* Optimistic updates where safe.
* Undo toasts instead of unnecessary confirmation pop-ups.
* Interruptible animations.
* Larger touch targets than icons alone.
* Predictable navigation.
* Keyboard accessibility.

### Navigation

* Consider a command menu with Cmd/Ctrl + K.
* Provide keyboard shortcut hints where useful.
* Ensure navigation remains clear on mobile.

### Layout

* Respect mobile safe-area insets.
* Use tabular numerals for counters.
* Avoid awkward heading wraps.
* Use consistent corner geometry.
* Avoid unnecessary visual clutter.

### Notifications

* No unsolicited pop-ups.
* No excessive recommendations.
* No distracting notification system in this prototype.

### Accessibility

* Semantic HTML.
* Accessible colour contrast.
* Keyboard navigation.
* Visible focus states.
* Reduced-motion support.
* Screen-reader-friendly labels.

## 11. Functional completion criteria

Do not declare the prototype complete simply because the application runs.

The following must be verified.

### Home

* Home loads without runtime errors.
* Calendar displays correctly.
* Week navigation works.
* Date selection works.
* Daily tasks display correctly.
* Weekly tasks display correctly.
* Tasks can be added.
* Tasks can be edited.
* Tasks can be completed and reopened.
* Progress indicators update correctly.
* Sample assessments display correctly.
* Next-week priorities display correctly.

### Boat

* 3D boat renders correctly.
* The boat has recognisable sailboat geometry.
* Water animation works.
* Lighting and materials are visually coherent.
* The scene does not obstruct the planner.
* Mobile performance is acceptable.
* Reduced-motion settings are respected.
* A fallback exists if WebGL is unavailable.

### Responsive design

* Desktop layout works.
* Tablet layout works.
* Mobile layout works.
* No horizontal overflow.
* Touch targets are usable.
* Text remains readable.
* Navigation works on smaller screens.

### Quality

* No obvious console errors.
* No broken navigation.
* No placeholder buttons pretending to work.
* No unnecessary loading delays.
* No major visual inconsistencies.
* No severe performance issues.

Use Playwright for functional testing and screenshots.

Run the relevant build and test commands.

Report any remaining limitations honestly.

## 12. Development workflow

Work autonomously on safe, reversible tasks.

Use /goal and the appropriate Claude Code automation capabilities where available, but do not bypass important safety checks.

Use subagents for genuinely independent work, such as:

* Design reference research.
* Accessibility review.
* Test development.
* Independent code review.

Do not delegate conflicting changes to the same files.

Keep the founding team informed at meaningful checkpoints.

Maintain documentation as decisions are made.

Do not make destructive Git operations.

Do not automatically commit or push changes without approval.

## 13. Deliverables

At the end of the initial design milestone, we expect:

1. docs/compass-art-direction.md
2. docs/home-screen-spec.md
3. A documented design system.
4. A boat progression storyboard.
5. A high-fidelity Home screen prototype.
6. A working 3D boat and ocean environment.
7. Functional calendar and task interactions.
8. Responsive desktop and mobile layouts.
9. Browser screenshots.
10. A functional testing report.
11. A list of recommended next development stages.

## 14. Final creative instruction

We want Compass to be recognisable.

Someone should be able to see a screenshot of Compass and immediately associate it with the product.

The boat should be memorable.

The ocean environment should feel atmospheric.

The interface should be beautiful without becoming impractical.

The calendar should be genuinely useful.

The experience should make people want to return because they enjoy using it and can see their progress.

Do not prioritise feature quantity over execution quality.

Do not produce a generic dashboard.

Do not mistake animations for good design.

Do not mistake complexity for sophistication.

Build Compass as a cohesive product with a distinctive identity, not as a collection of disconnected features.

Begin with the repository audit and visual direction. Present the creative direction for approval before proceeding with the full Home implementation.

We would rather have one exceptional Home experience than five mediocre pages.

END OF BRIEF
