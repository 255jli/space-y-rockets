# SpaceY

SpaceY is a satirical SpaceX-style site. The landing page mimics the spacex.com full-bleed layout. A separate **Mission Simulator** page lets you pick a fictional vehicle, set a delivery point, and watch a Three.js flight animation. No real vehicles are sold or delivered.

## Stack

- Python and Flask serve the pages and rocket data.
- Jinja templates in `templates/` (`index.html` = landing, `mission.html` = simulator).
- Frontend: plain CSS and JavaScript. Three.js r128 from CDN.
- No npm project or frontend build step.

## Pages

| Route | Purpose |
|-------|---------|
| `/` | SpaceX-inspired landing (full-viewport panels, most nav links are non-functional) |
| `/mission` | Vehicle catalog, map, launch simulation |
| `/api/rockets` | JSON list of vehicles |

The landing **WATCH** / **RESERVE YOUR RIDE** / **OPEN SIMULATOR** CTAs go to `/mission`.

## Run locally

```bash
pip install -r requirements.txt
python app.py
```

Open http://localhost:8000

Static export:

```bash
python freeze.py
```

Output is written to `dist/`.

## Project layout

- `app.py`, `freeze.py` — Flask app and static export
- `templates/index.html` — landing
- `templates/mission.html` — simulator shell
- `templates/components/order.html` — fleet + map form
- `static/css/style.css` — landing + mission styles
- `static/js/` — main, order-flow, rocket-animation
- `static/images/`, `static/media/` — CC0 / public-domain assets where catalogued
- `scripts/` — tooling (layout scrape, models, etc.)

## Disclaimer

This is a fictional parody project for educational and entertainment purposes only.
