# SpaceY

Satirical space company website: full-bleed landing page plus a **Mission Simulator** where you pick a fictional vehicle, set a target, and watch a Three.js launch animation.

**Nothing is for sale. No real rockets are reserved or delivered.** This is fiction for education and entertainment.

## Features

- Landing page inspired by commercial space-company marketing sites
- Mission Simulator: vehicle catalog, map target, animated flight
- Flask backend with JSON rocket catalog (`/api/rockets`)
- Optional static export via `freeze.py` for hosting without Python

## Run locally

```bash
pip install -r requirements.txt
python app.py
```

Open http://localhost:8000

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/mission` | Simulator |
| `/api/rockets` | Vehicle JSON |

## Static site

```bash
python freeze.py
```

Output goes to `dist/`. Publish that folder on any static host (GitHub Pages, Netlify, etc.). Three.js loads from a CDN, so visitors need network access for the simulator libraries.

More detail: [DEPLOYMENT.md](./DEPLOYMENT.md).

## Stack

- Python / Flask / Jinja
- Plain CSS and JavaScript (no npm build)
- Three.js from CDN for the flight scene

## Layout

```
app.py, freeze.py     Flask app and static export
templates/            Landing + mission pages
static/css, static/js Frontend
static/images, media  Assets
scripts/              Offline tooling (models, etc.)
dist/                 Generated static export
```

## Disclaimer

SpaceY is a **parody**. It is not affiliated with any real aerospace company. Names, visuals, and flows are fictional or satirical. Do not treat any UI as a real order form.
