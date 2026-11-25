(async function () {
  const response = await fetch(
    'https://raw.githubusercontent.com/255jli/space-y-rockets/e56948babce57f844d78fd7f27dbce0814bd43a7/static/js/rocket-animation.js'
  );
  let source = await response.text();
  source = source.replace(
    'export function stopRocketAnimation()',
    'function stopRocketAnimation()'
  );
  source = source
    .replace(
      'const ROCKET_LONGITUDINAL_AXIS = new THREE.Vector3(0, 0, 1);',
      'const ROCKET_LONGITUDINAL_AXIS = new THREE.Vector3(0, 1, 0);'
    )
    .replace(
      '    ENGINE_POSITIONS.forEach(([x, y], index) => {\n        const engine = new THREE.Group();\n        engine.position.set(x, y, 2.2 - rocketCenter.z);\n        engine.rotation.x = Math.PI / 2;\n        engine.visible = false;',
      '    const enginePlane = Math.max(\n        Math.abs(rocketBounds.max.x - rocketCenter.x),\n        Math.abs(rocketBounds.max.z - rocketCenter.z)\n      ) * 0.18;\n    const rearY = rocketBounds.min.y - rocketCenter.y + rocketLength * 0.02;\n    ENGINE_POSITIONS.forEach(([x, y], index) => {\n        const engine = new THREE.Group();\n        engine.position.set(x * enginePlane, rearY, y * enginePlane);\n        engine.visible = false;'
    )
    .replace(
      '    heatSpot.position.set(0, 0, rocketBounds.max.z - rocketCenter.z - 1.5);',
      '    heatSpot.position.set(0, rocketBounds.min.y - rocketCenter.y + rocketLength * 0.08, 0);'
    );
  const blob = new Blob([source], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  await import(url);
  URL.revokeObjectURL(url);
})().catch((error) => {
  console.error('[SpaceY] failed to load rocket animation', error);
});
