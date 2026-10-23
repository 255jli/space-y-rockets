Вот полный самодостаточный `PLUME_INTEGRATION.md`. Все эталонные шейдеры, геометрия и логика выписаны прямо в тексте — Copilot или разработчик соберут рабочую сцену из 9 огней без обращения к внешнему HTML.

***

# PLUME_INTEGRATION.md
**Интеграция реалистичного пламени Falcon 9 (9 сопел) в Three.js**

## 1. Обзор архитектуры
- **`flame_anchors.glb`**: содержит 9 невидимых узлов-якорей (`flame_anchor_00` … `flame_anchor_08`) на координатах срезов сопел.
- **Эталонные шейдеры**: выписаны ниже. Не переписывать с нуля — копировать 1:1.
- **Инстанцирование**: для каждого якоря создаётся `THREE.Group` с клонами материалов и уникальным `uSeed`.
- **Общий uniform**: `uTime` шарится между всеми 18 материалами (9 ядер + 9 облаков) для синхронной анимации.
- **Пост-обработка**: `UnrealBloomPass` обязателен для эффекта «жара».

---

## 2. Эталон: Геометрия ядра (`makeCoreGeometry`)
Трубчатый меш, вытянутый вдоль `-Y`. Радиус плавно растёт к хвосту.

```js
function makeCoreGeometry(rows = 140, segments = 40) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const initialLength = 4.4;

  for (let i = 0; i <= rows; i++) {
    const h = i / rows;
    const radius = 0.033 + 0.026 * h + 0.012 * Math.sin(Math.PI * h);
    for (let j = 0; j <= segments; j++) {
      const angle = (j / segments) * Math.PI * 2;
      positions.push(
        Math.cos(angle) * radius,
        -h * initialLength,
        Math.sin(angle) * radius
      );
      uvs.push(j / segments, h);
    }
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
```

---

## 3. Эталон: Материал ядра (`coreMaterial`)
Аддитивный шейдер, горячий бело-оранжевый градиент, лёгкая турбулентность.

```js
const coreMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uLength: { value: 4.4 },
    uWidth: { value: 0.82 },
    uSeed: { value: 0 }
  },
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
  toneMapped: false,

  vertexShader: `
    uniform float uTime;
    uniform float uLength;
    uniform float uWidth;
    uniform float uSeed;
    varying float vH;

    void main() {
      float h = uv.y;
      vec3 p = position;
      p.y = -h * uLength;
      p.xz *= uWidth;
      p.x += sin(uTime * 15.0 + h * 25.0 + uSeed) * 0.002 * h;
      p.z += cos(uTime * 12.0 + h * 21.0 + uSeed) * 0.002 * h;
      vH = h;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,

  fragmentShader: `
    uniform float uTime;
    uniform float uSeed;
    varying float vH;

    void main() {
      float h = vH;
      float startFade = smoothstep(0.0, 0.025, h);
      float tailFade = 1.0 - smoothstep(0.72, 1.0, h);
      float flicker = 0.88 + 0.12 * sin(h * 55.0 - uTime * 18.0 + uSeed);

      vec3 orange = vec3(1.0, 0.18, 0.025);
      vec3 hot = vec3(1.0, 0.93, 0.72);
      float hotCore = 1.0 - smoothstep(0.0, 0.72, h);
      vec3 color = mix(orange, hot, hotCore);

      float alpha = startFade * tailFade * flicker * 0.8;
      gl_FragColor = vec4(color, alpha);
    }
  `
});
```

---

## 4. Эталон: Геометрия и материал частиц
Облако из 16 000 точек, расширяющееся к хвосту, с дрейфом и мерцанием.

### 4.1. Генерация буферов
```js
function makeParticleBuffers(count = 16000) {
  const positions = new Float32Array(count * 3);
  const along = new Float32Array(count);
  const angle = new Float32Array(count);
  const radial = new Float32Array(count);
  const seed = new Float32Array(count);
  const size = new Float32Array(count);
  const speed = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
    along[i] = Math.random() * 1.26;
    angle[i] = Math.random() * Math.PI * 2;
    radial[i] = Math.sqrt(Math.random());
    seed[i] = Math.random();
    size[i] = 0.025 + Math.random() * 0.075;
    speed[i] = 0.38 + Math.random() * 0.34;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aAlong", new THREE.BufferAttribute(along, 1));
  geometry.setAttribute("aAngle", new THREE.BufferAttribute(angle, 1));
  geometry.setAttribute("aRadial", new THREE.BufferAttribute(radial, 1));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
  return geometry;
}
```

### 4.2. Шейдер частиц
```js
const particleMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uLength: { value: 4.4 },
    uWidth: { value: 0.82 },
    uSeed: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
  },
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  depthTest: true,
  toneMapped: false,

  vertexShader: `
    uniform float uTime;
    uniform float uLength;
    uniform float uWidth;
    uniform float uSeed;
    uniform float uPixelRatio;
    attribute float aAlong;
    attribute float aAngle;
    attribute float aRadial;
    attribute float aSeed;
    attribute float aSize;
    attribute float aSpeed;
    varying float vH;
    varying float vSeed;

    void main() {
      float h = mod(aAlong + uTime * aSpeed, 1.26);
      float tail = smoothstep(0.72, 1.22, h);
      float plumeRadius = 0.025 + 0.045 * h + 0.26 * smoothstep(0.72, 1.22, h);
      float theta = aAngle + 0.12 * sin(uTime * 2.7 + aSeed * 35.0 + h * 9.0) * tail;
      float r = aRadial * plumeRadius * uWidth;
      float driftX = sin(uTime * 1.8 + aSeed * 28.0 + h * 12.0) * 0.055 * tail;
      float driftZ = cos(uTime * 1.6 + aSeed * 31.0 + h * 10.0) * 0.055 * tail;

      vec3 p = vec3(cos(theta) * r + driftX, -h * uLength, sin(theta) * r + driftZ);
      vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);

      gl_Position = projectionMatrix * mvPosition;
      gl_PointSize = clamp(aSize * uPixelRatio * (420.0 / max(1.0, -mvPosition.z)), 1.0, 18.0);

      vH = h;
      vSeed = aSeed;
    }
  `,

  fragmentShader: `
    uniform float uTime;
    uniform float uSeed;
    varying float vH;
    varying float vSeed;

    void main() {
      vec2 q = gl_PointCoord - 0.5;
      float d = length(q) * 2.0;
      float soft = exp(-d * d * 5.0) * (1.0 - smoothstep(0.65, 1.0, d));
      float startFade = smoothstep(0.0, 0.07, vH);
      float tailFade = 1.0 - smoothstep(1.04, 1.26, vH);
      float flicker = 0.75 + 0.25 * sin(uTime * 16.0 + vSeed * 40.0 + vH * 30.0 + uSeed);

      vec3 whiteHot = vec3(1.0, 0.91, 0.70);
      vec3 yellow = vec3(1.0, 0.49, 0.10);
      vec3 orange = vec3(1.0, 0.16, 0.025);

      float h = clamp(vH, 0.0, 1.0);
      vec3 color = mix(whiteHot, yellow, smoothstep(0.06, 0.62, h));
      color = mix(color, orange, smoothstep(0.55, 1.12, h));

      float alpha = soft * startFade * tailFade * (0.035 + 0.055 * vSeed) * flicker;
      gl_FragColor = vec4(color, alpha);
    }
  `
});
```

---

## 5. Интеграция в сцену

### 5.1. Общие uniform'ы
```js
const sharedUniforms = {
  uTime: { value: 0 },
  uLength: { value: 5.8 },   // увеличено для "мощного" эффекта
  uWidth: { value: 0.9 },
  uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
};
```

### 5.2. Фабрика пламени
```js
const coreGeo = makeCoreGeometry();
const particleGeo = makeParticleBuffers(20000); // увеличено для плотности

function createFlame(index) {
  const group = new THREE.Group();
  const seedOffset = index * 17.3;

  const cMat = coreMaterial.clone();
  cMat.uniforms.uTime = sharedUniforms.uTime;
  cMat.uniforms.uLength = sharedUniforms.uLength;
  cMat.uniforms.uWidth = sharedUniforms.uWidth;
  cMat.uniforms.uSeed.value += seedOffset;

  const pMat = particleMaterial.clone();
  pMat.uniforms.uTime = sharedUniforms.uTime;
  pMat.uniforms.uLength = sharedUniforms.uLength;
  pMat.uniforms.uWidth = sharedUniforms.uWidth;
  pMat.uniforms.uPixelRatio = sharedUniforms.uPixelRatio;
  pMat.uniforms.uSeed.value += seedOffset;

  group.add(new THREE.Mesh(coreGeo, cMat));
  group.add(new THREE.Points(particleGeo, pMat));
  return group;
}
```

### 5.3. Загрузка якорей и расстановка
```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load('flame_anchors.glb', (gltf) => {
  const anchors = gltf.scene.children
    .filter(c => c.name.startsWith('flame_anchor_'))
    .sort((a, b) => a.name.localeCompare(b.name));

  anchors.forEach((anchor, i) => {
    anchor.add(createFlame(i));
    scene.add(anchor);
  });
});
```

### 5.4. Анимационный цикл
```js
let targetLength = 5.8;
let targetWidth = 0.9;
let nextChange = 0;
let prevTime = 0;

function animate(time) {
  requestAnimationFrame(animate);
  const seconds = time * 0.001;
  const dt = Math.min((time - prevTime) * 0.001, 0.05);
  prevTime = time;

  sharedUniforms.uTime.value = seconds;

  if (seconds >= nextChange) {
    targetLength = 5.2 + Math.random() * 1.2;
    targetWidth = 0.85 + Math.random() * 0.12;
    nextChange = seconds + 0.2 + Math.random() * 0.4;
  }

  sharedUniforms.uLength.value = THREE.MathUtils.damp(sharedUniforms.uLength.value, targetLength, 2.6, dt);
  sharedUniforms.uWidth.value = THREE.MathUtils.damp(sharedUniforms.uWidth.value, targetWidth, 2.5, dt);

  controls.update();
  composer.render(); // если используется EffectComposer с Bloom
}
requestAnimationFrame(animate);
```

---

## 6. Пост-обработка (Bloom)
Без bloom аддитивное пламя выглядит плоским. Обязательно подключить:

```js
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.8,  // strength — "жар"
  0.6,  // radius
  0.15  // threshold
);
composer.addPass(bloom);
```

---

## 7. Чек-лист производительности
| Симптом | Решение |
|---|---|
| FPS < 45 | Уменьшить `count` в `makeParticleBuffers` до `12000`. |
| Просадки при ресайзе | Обновлять `sharedUniforms.uPixelRatio.value` и `bloom.resolution` в `resize`. |
| Пламя "мерцает" слишком сильно | Уменьшить амплитуду `flicker` в фрагментных шейдерах с `0.12`/`0.25` до `0.06`/`0.12`. |
| Все 9 огней синхронны | Проверить, что `uSeed` действительно различается на `index * 17.3`. |

---

## 8. Что НЕ делать
- ❌ Не переписывать шейдеры с нуля — копировать блоки выше 1:1.
- ❌ Не использовать `MeshStandardMaterial` для пламени — только `ShaderMaterial` с `AdditiveBlending`.
- ❌ Не включать `depthWrite: true` — пламя исчезнет за корпусом ракеты.
- ❌ Не забывать `toneMapped: false` — иначе цвета будут приглушены tone mapping'ом рендерера.

***
