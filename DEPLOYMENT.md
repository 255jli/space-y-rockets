# Deployment

SpaceY can run as a Flask application or be exported as a static site.

## Static hosting

1. Install Python dependencies from `requirements.txt`.
2. Run `python freeze.py` from the project root.
3. Publish the generated `dist/` directory on a static host.

The static export includes the frontend and local media. Three.js and Orbitron are loaded from CDNs, so visitors need an internet connection for those resources.

## Flask hosting

Use a Python host that supports Flask and configure it to serve `app:app`. Install dependencies from `requirements.txt`; configure the host's required port through its platform settings.

Do not publish the Blender installation archive or generated `.blend` work files. The checked-in runtime models are in `static/models/`.
