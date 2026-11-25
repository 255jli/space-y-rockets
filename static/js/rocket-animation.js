/**
 * Entry for the mission flight scene (ES module).
 * Loads the full source module from the same directory so the main logic
 * stays in rocket-animation.source.js for humans and other tools to read.
 */
(async function bootstrapRocketAnimation() {
  const sourceUrl = new URL('./rocket-animation.source.js', import.meta.url);
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to load rocket animation source (${response.status})`);
  }

  let source = await response.text();
  // Blob import runs as a module without a static export binding; strip export.
  source = source.replace(
    'export function stopRocketAnimation()',
    'function stopRocketAnimation()'
  );

  const blob = new Blob([source], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  try {
    await import(url);
  } finally {
    URL.revokeObjectURL(url);
  }
})().catch((error) => {
  console.error('[SpaceY] failed to load rocket animation', error);
});
