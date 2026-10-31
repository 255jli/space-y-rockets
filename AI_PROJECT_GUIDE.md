# SpaceY implementation guide for AI contributors

This document is the design and code-ownership reference for future work in this
repository. Read the relevant sections before editing. The values below describe
the current accepted landing-page baseline; they are not an invitation to
"improve" or redesign it without a matching user request.

## Product and technical context

- SpaceY is a fictional, satirical rocket-ordering site. It does not sell,
  launch, or deliver real vehicles.
- Flask serves Jinja templates and JSON routes. Frontend behavior is vanilla
  JavaScript and CSS; the Three.js r128 runtime is loaded from a CDN.
- There is no npm project or frontend build system. Do not add one.
- Keep work scoped to the requested behavior. Preserve unrelated worktree
  changes and do not commit unless explicitly asked.
- Follow `.github/copilot-instructions.md` for mandatory workspace constraints,
  including the prohibition on running the app, tests, linters, builds, or other
  project code unless the user explicitly requests it.

## Visual baseline: what must be preserved

The topbar and the first landing section are considered nearly ideal. Do not
restructure, restyle, or "normalize" them during unrelated tasks. Make a change
there only when the user explicitly requests it, and keep it limited to that
request. The lunar second section is also a carefully tuned composition; change
only the specific detail requested and keep its responsive behavior intact.

### Topbar

- The topbar is fixed to the viewport. On the landing page it is hidden while
  scrolling down past 40 px and shown when scrolling upward or returning to the
  top. The scroll handler is inline in `templates/index.html`; its class state
  and transitions are styled in `static/css/style.css`.
- The header's hidden state intentionally coordinates `opacity`, `transform`,
  `filter`, delayed `visibility`, and `pointer-events`. Do not remove one of
  these properties in isolation: doing so can make an invisible header block
  interaction or make it disappear abruptly.
- The landing gradient uses two distinct pseudo-elements:
  - `::before` is the long, weak gradient extending to `50vh`.
  - `::after` is the short gradient fitted to the header's own height.
  Keep the header content above both layers and preserve their
  `pointer-events: none`; avoid merging them or changing their stacking without
  checking the rendered header and menu.
- The center navigation labels are deliberately non-interactive placeholders.
  Their text is `Button 1`, `Button 2`, `Button three`, then `Button 4` through
  `Button 8`. They use `#eee`; other text is white.
- The language selector is a real control. Its menu is right-anchored and
  animates from the right toward the left. Keep `aria-expanded`,
  `aria-controls`, hover behavior, touch/click behavior, focus visibility, and
  the arrow state synchronized when changing it.
- The mobile breakpoint hides the center labels and shows a menu toggle. Check
  the header grid and language control at both the `1024px` and `600px`
  breakpoints whenever changing header dimensions.

### Landing section 1

- `#panel-flight` is the full-viewport opening hero, with a looping launch video
  as its background and copy/CTA overlaid near the bottom.
- Its layout is based on `.spx-panel` and the shared media/content positioning
  rules in `static/css/style.css`.
- Preserve its full-screen composition, video treatment, text placement, and
  CTA unless the user specifically asks to change that section.

### Landing section 2: lunar panel

- `#panel-multiplanetary` is the second panel. It is intentionally taller than
  one viewport: both `height` and `min-height` are currently `126svh`.
- Text and the canvas are separate layers. `.spx-panel--earth .spx-panel-content`
  controls the text inset; `.earth-hero-visual` and `#earthHeroCanvas` control
  the right-side lunar visual. The canvas is shifted horizontally; do not
  mistake that for the sphere's own position.
- The headline uses Roboto, a tuned weight/width, and desktop/mobile font-size
  rules. The mobile declarations later in `style.css` override desktop values;
  update both when the requested change should apply at all sizes.
- The text block's padding, the headline-to-copy spacing, and the CTA's arrow
  alignment are intentional. Avoid changing these while adjusting unrelated
  typography or the moon.
- `static/js/earth-hero.js` creates a Three.js sphere with the lunar texture,
  shader-based day/night shading, and a narrow rim highlight. The sphere scale
  is `0.92`; the current rotation rate is 90% of one revolution per minute.
- The rim highlight is multiplied by the daylight factor so it appears only on
  the lit side. Keep it a surface-edge effect, not an atmospheric halo, and do
  not add stars around the moon.
- When changing the visual, preserve the rotation, texture orientation,
  lighting/shadow boundary, rim behavior, transparent canvas, and responsive
  canvas sizing unless the user explicitly asks to change one of them.

## File ownership and safe edit plan

Use this map to find the correct layer. Do not make the same behavior in
multiple places when one existing owner is responsible for it.

| File | Owns | Safe change plan |
|---|---|---|
| `templates/index.html` | Landing-page structure, topbar markup, section order, language control markup, and inline topbar scroll/menu state | First locate the existing element and its classes/IDs. Change markup or state only when required. Keep ARIA attributes and CSS selectors in sync; avoid moving unrelated sections. |
| `static/css/style.css` | Shared landing/simulator styles, responsive breakpoints, topbar transitions/gradients, and section composition | Find the base rule and every relevant media-query override before editing. Prefer a narrowly scoped selector. Preserve cascade order, stacking, pseudo-element layers, and established section 1/topbar appearance. |
| `static/js/earth-hero.js` | Three.js moon sphere, texture load, shader lighting/rim, resize, and continuous rotation | Keep renderer lifecycle and texture error reporting intact. Make visual changes in the sphere/shader/rotation that owns them; do not imitate the sphere with a static CSS image or duplicate effects. |
| `static/js/main.js` | General landing-page interactions | Check whether a behavior already belongs here before adding new landing interaction logic. Do not duplicate the topbar's existing inline scroll state without a deliberate refactor request. |
| `templates/mission.html` | Mission simulator page shell and shared brand/header markup | Check impact on shared header styles, since `.spx-header` rules also affect this page. Keep landing-only styles scoped under `.landing-page` where appropriate. |
| `templates/components/order.html` | Reusable order form/catalog/map fragment | Keep order markup changes here rather than duplicating it in page templates. |
| `static/js/order-flow.js` | Order selection, submission, and customer-counter flow | Keep order-flow behavior here. Preserve the existing real-time counter behavior and error handling when touching adjacent UI. |
| `static/js/rocket-animation.js` | Three.js mission-flight animation, loading, camera, and post-flight scene | Keep mission animation behavior here; do not mix it into the landing moon renderer. Preserve loading cancellation/return behavior and animation timing when making adjacent changes. |
| `README.md` | Human-facing project overview, stack, routes, and setup | Keep general product/setup information here. Link to this guide for detailed design constraints instead of copying the whole guide. |
| `.github/copilot-instructions.md` | Short, always-on AI instructions | Keep only cross-cutting rules and links here. Put detailed visual baselines and per-file ownership in this guide. |

## Change checklist

Before editing:

1. Restate the exact requested visual or behavior change internally; do not infer
   adjacent redesign work from a screenshot or a previous request.
2. Read the owning file and its callers/selectors. For CSS, inspect responsive
   overrides and related pseudo-elements, transforms, and stacking contexts.
3. Check `git status` and preserve existing user changes. Do not revert unrelated
   files or assume every existing diff belongs to the current task.
4. If the request has multiple reasonable interpretations that change layout or
   behavior, ask for clarification instead of guessing.

While editing:

1. Use the existing owner from the file map. Keep changes surgical and consistent
   across HTML, CSS, and JavaScript when the behavior crosses those boundaries.
2. Keep desktop and mobile behavior in agreement unless the user asked for a
   breakpoint-specific result.
3. Preserve keyboard focus, ARIA state, pointer behavior, visible error handling,
   and reduced assumptions about touch/hover where relevant.
4. Add comments only to explain non-obvious constraints. Do not add line-by-line
   narration or a speculative plan to every source file; this guide is the
   central design rationale so it can be updated without contradictory comments.
5. If an intentional change alters a baseline in this guide, update the matching
   section in the same task.

After editing:

1. Inspect the final diff and check that only requested files/behavior changed.
2. Run `git diff --check` for whitespace errors.
3. Do not run the app, tests, linters, builds, downloads, or other project code
   unless the user explicitly requests it.
4. Report the changed files and any verification limitation plainly. Do not say a
   visual change was browser-verified unless it was actually viewed in a browser.

## Documentation maintenance

This guide is the source of truth for non-obvious design constraints, not a
historical changelog. When a deliberate user-approved change makes a value or
behavior here obsolete, update the current baseline rather than appending
contradictory notes. Keep the topbar and first-section "near-final" status until
the user explicitly changes that preference.
