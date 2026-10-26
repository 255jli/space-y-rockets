# SpaceY

SpaceY is a satirical rocket-ordering website. Choose a fictional vehicle, set a delivery point, and watch a Three.js flight animation. No real vehicles are sold or delivered.

## Stack

- Python and Flask serve the page and rocket data.
- Jinja templates live in `templates/`; page components are in `templates/components/`.
- The frontend uses plain CSS and JavaScript. Three.js r128 is loaded from a CDN.
- Rocket selection, quantity (1–10), map selection, and launch are handled by `static/js/order-flow.js`.

There is no npm project or frontend build step.

## Run locally

Install the Python dependencies from `requirements.txt`, then run `python app.py`. The Flask development server is configured for port 8000.

To generate the static site, run `python freeze.py`; the output is written to `dist/`.

## Project layout

- `app.py`, `freeze.py` — Flask application and static export.
- `templates/` — page and order-panel templates.
- `static/css/`, `static/js/` — frontend styles and behavior.
- `static/models/`, `static/media/` — local 3D models and launch clips.
- `scripts/rocket/`, `scripts/station/` — model-generation tools and setup notes.
