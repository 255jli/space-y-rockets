/**
 * SpaceY rocket flight scene.
 * Loads the base animation module, applies orientation/audio patches, then imports it.
 *
 * Runtime patches (applied to the base source before import):
 * - Nose axis is +Y (GLTF length), not +Z
 * - Engines / heat sit at the rear along -Y
 * - Launch loop stops when the explosion plays (whiteout)
 * - stopRocketAnimation clears all audio; start always tears down the previous run
 */
(async function bootstrapRocketAnimation() {
  const BASE_URL =
    'https://raw.githubusercontent.com/255jli/space-y-rockets/e56948babce57f844d78fd7f27dbce0814bd43a7/static/js/rocket-animation.js';

  const response = await fetch(BASE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch rocket animation base (${response.status})`);
  }

  let source = await response.text();

  // Nose axis: GLTF length is Y, not Z.
  source = source.replace(
    'const ROCKET_LONGITUDINAL_AXIS = new THREE.Vector3(0, 0, 1);',
    '// Model length is Y after GLTF load (see rocketLength from bounds).\n'
      + 'const ROCKET_LONGITUDINAL_AXIS = new THREE.Vector3(0, 1, 0);'
  );

  // Engines and heat at the rear along -Y (flame particles already extend in -Y).
  source = source.replace(
    '    ENGINE_POSITIONS.forEach(([x, y], index) => {\n'
      + '        const engine = new THREE.Group();\n'
      + '        engine.position.set(x, y, 2.2 - rocketCenter.z);\n'
      + '        engine.rotation.x = Math.PI / 2;\n'
      + '        engine.visible = false;',
    '    const enginePlane = Math.max(\n'
      + '        Math.abs(rocketBounds.max.x - rocketCenter.x),\n'
      + '        Math.abs(rocketBounds.max.z - rocketCenter.z)\n'
      + '    ) * 0.18;\n'
      + '    const rearY = rocketBounds.min.y - rocketCenter.y + rocketLength * 0.02;\n'
      + '    ENGINE_POSITIONS.forEach(([x, y], index) => {\n'
      + '        const engine = new THREE.Group();\n'
      + '        engine.position.set(x * enginePlane, rearY, y * enginePlane);\n'
      + '        engine.visible = false;'
  );

  source = source.replace(
    '    heatSpot.position.set(0, 0, rocketBounds.max.z - rocketCenter.z - 1.5);',
    '    heatSpot.position.set(0, rocketBounds.min.y - rocketCenter.y + rocketLength * 0.08, 0);'
  );

  // Clearer audio helpers: stop launch bed when the explosion starts; hard-stop all on teardown.
  source = source.replace(
    'function startLaunchAudio() {\n'
      + '    if (!launchAudio) return;\n'
      + '    const play = launchAudio.play();\n'
      + '    if (play && typeof play.catch === \'function\') play.catch(() => {});\n'
      + '}\n'
      + '\n'
      + 'function playExplosionAudio() {\n'
      + '    if (!explosionAudio || explosionTriggered) return;\n'
      + '    explosionTriggered = true;\n'
      + '    try {\n'
      + '        if (explosionAudio._audioCtx && explosionAudio._audioCtx.state === \'suspended\') {\n'
      + '            explosionAudio._audioCtx.resume().catch(() => {});\n'
      + '        }\n'
      + '        explosionAudio.currentTime = 0;\n'
      + '        const play = explosionAudio.play();\n'
      + '        if (play && typeof play.catch === \'function\') play.catch(() => {});\n'
      + '    } catch (_) { /* noop */ }\n'
      + '}\n'
      + '\n'
      + 'function stopLaunchAudio() {\n'
      + '    if (launchAudio) {\n'
      + '        try {\n'
      + '            launchAudio.pause();\n'
      + '            launchAudio.currentTime = 0;\n'
      + '        } catch (_) { /* noop */ }\n'
      + '    }\n'
      + '    if (explosionAudio) {\n'
      + '        try {\n'
      + '            explosionAudio.pause();\n'
      + '            explosionAudio.currentTime = 0;\n'
      + '        } catch (_) { /* noop */ }\n'
      + '    }\n'
      + '}',
    'function safePlay(audio) {\n'
      + '    if (!audio) return;\n'
      + '    const play = audio.play();\n'
      + '    if (play && typeof play.catch === \'function\') play.catch(() => {});\n'
      + '}\n'
      + '\n'
      + 'function safeStop(audio) {\n'
      + '    if (!audio) return;\n'
      + '    try {\n'
      + '        audio.pause();\n'
      + '        audio.currentTime = 0;\n'
      + '    } catch (_) { /* noop */ }\n'
      + '}\n'
      + '\n'
      + 'function startLaunchAudio() {\n'
      + '    safePlay(launchAudio);\n'
      + '}\n'
      + '\n'
      + 'function stopLaunchLoop() {\n'
      + '    // Stops only the looping launch bed so the explosion can take over.\n'
      + '    safeStop(launchAudio);\n'
      + '}\n'
      + '\n'
      + 'function playExplosionAudio() {\n'
      + '    if (!explosionAudio || explosionTriggered) return;\n'
      + '    explosionTriggered = true;\n'
      + '    stopLaunchLoop();\n'
      + '    try {\n'
      + '        if (explosionAudio._audioCtx && explosionAudio._audioCtx.state === \'suspended\') {\n'
      + '            explosionAudio._audioCtx.resume().catch(() => {});\n'
      + '        }\n'
      + '        explosionAudio.currentTime = 0;\n'
      + '        safePlay(explosionAudio);\n'
      + '    } catch (_) { /* noop */ }\n'
      + '}\n'
      + '\n'
      + 'function stopAllFlightAudio() {\n'
      + '    safeStop(launchAudio);\n'
      + '    safeStop(explosionAudio);\n'
      + '}'
  );

  source = source.replace(
    '    // Fire distant explosion once as the whiteout begins.\n'
      + '    if (white > 0.02) playExplosionAudio();',
    '    // One-shot: kill launch loop, play explosion as whiteout starts.\n'
      + '    if (white > 0.02) playExplosionAudio();'
  );

  source = source.replace(
    '    stopLaunchAudio();\n'
      + '    launchAudio = null;\n'
      + '    explosionAudio = null;\n'
      + '    explosionGain = null;\n'
      + '    explosionTriggered = false;',
    '    stopAllFlightAudio();\n'
      + '    launchAudio = null;\n'
      + '    explosionAudio = null;\n'
      + '    explosionGain = null;\n'
      + '    explosionTriggered = false;'
  );

  source = source.replace(
    'window.startRocketAnimation = () => {\n'
      + '    const runId = animationRunId + 1;\n'
      + '    initRocketAnimation(\'animationContainer\').catch(error => {',
    'window.startRocketAnimation = () => {\n'
      + '    // Always tear down a previous run so replay does not stack audio or RAF loops.\n'
      + '    stopRocketAnimation();\n'
      + '    const runId = animationRunId + 1;\n'
      + '    initRocketAnimation(\'animationContainer\').catch(error => {'
  );

  source = source.replace(
    'function orientRocketAlongFlight(direction, outQuat) {\n'
      + '    outQuat.setFromUnitVectors(ROCKET_LONGITUDINAL_AXIS, direction);',
    'function orientRocketAlongFlight(direction, outQuat) {\n'
      + '    // Map model nose (+Y) onto the flight direction, then roll for the logo.\n'
      + '    outQuat.setFromUnitVectors(ROCKET_LONGITUDINAL_AXIS, direction);'
  );

  // Blob import has no export binding; keep stopRocketAnimation as a local function.
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
