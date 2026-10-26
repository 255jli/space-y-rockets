# SpaceY project instructions

- SpaceY is a satirical Flask site for rocket ordering and a Three.js flight animation. It does not sell or deliver real vehicles.
- The app uses Jinja templates in `templates/`, vanilla JavaScript and CSS in `static/`, and Flask for routes. Three.js is loaded from a CDN.
- Keep changes small and modular; put order-flow behavior in `static/js/order-flow.js` and reusable page fragments in `templates/components/`.
- Do not use npm, add Node dependencies, or introduce a frontend build system.
- Do not run the app, tests, linters, builds, downloads, installers, or other commands that execute project code unless the user explicitly asks.
- Follow the user's requested scope. Do not change copy or assets unrelated to the task.
- Do not commit changes unless the user explicitly asks.
