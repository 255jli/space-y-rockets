# SpaceY project instructions

- SpaceY is a satirical Flask site for rocket ordering and a Three.js flight animation. It does not sell or deliver real vehicles.
- The app uses Jinja templates in `templates/`, vanilla JavaScript and CSS in `static/`, and Flask for routes. Three.js is loaded from a CDN.
- Keep changes small and modular; put order-flow behavior in `static/js/order-flow.js` and reusable page fragments in `templates/components/`.
- Read [AI_PROJECT_GUIDE.md](../AI_PROJECT_GUIDE.md) before changing landing-page visuals. It records the near-final topbar and first hero section, the current lunar-section baseline, file ownership, and safe change order.
- Treat the landing topbar and first hero section as near-final: preserve their current appearance and behavior unless the user specifically asks to change them. Avoid incidental redesign or cleanup in these areas.
- The lunar section is also a carefully tuned design. Make only the requested adjustment; check the desktop and mobile overrides together and keep its Three.js sphere, rotation, lighting, and rim effect coherent.
- Keep design rationale in the project guide rather than scattering long-lived planning comments through source files. Add source comments only for local behavior that is not clear from the code.
- Do not use npm, add Node dependencies, or introduce a frontend build system.
- Do not run the app, tests, linters, builds, downloads, installers, or other commands that execute project code unless the user explicitly asks.
- Follow the user's requested scope. Do not change copy or assets unrelated to the task.
- Do not commit changes unless the user explicitly asks.
