const THREE = window.THREE;
const ASSET_ROOT = '/static';
const STATION_SCALE = 0.012;
let STATION_PULL_SECONDS = 18;
const FLIGHT_SECONDS = 22;
let WHITEOUT_START = STATION_PULL_SECONDS + FLIGHT_SECONDS + 0.4;
let BLACKOUT_START = WHITEOUT_START + 2.8;
let END_CARD_START = BLACKOUT_START + 1.0;
const STATION_PAYLOAD_LENGTH = 8;
const ROCKET_LONGITUDINAL_AXIS = new THREE.Vector3(0, 1, 0);
// Visual scale range: tiny in station bay → larger as it approaches the camera.
const ROCKET_SCALE_NEAR = 0.0045;
const ROCKET_SCALE_FAR = 0.00115;
const PLANET_UNIT_RADIUS = 1;
const PLANET_WORLD_SCALE = 1.85;
const PLANET_RADIUS = PLANET_UNIT_RADIUS * PLANET_WORLD_SCALE;
const IMPACT_MARGIN = 0.08;
const ENGINE_POSITIONS = [
    [0, 0],
    ...Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2;
        return [1.25 * Math.cos(angle), 1.25 * Math.sin(angle)];
    })
];

let renderer;
let scene;
let camera;
let clock;
let stationRoot;
let stationMixer;
let stationAction;
let dummyRocket;
let rocketRoot;
let rocketModel;
let flightCurve;
let rocketBounds;
let rocketCenter;
let rocketLength;
let flames = [];
let sharedFlameTime;
let heatSpot;
let planet;
let clouds;
let moon;
let atmosphereMaterial;
let earthMaterial;
let resizeHandler;
let animationFrame = 0;
let flightStarted = false;
let impactReached = false;
let resources = [];
let activeContainer;
let disposed = false;
let rocketStartOrientation;
let launchAudio = null;
let explosionAudio = null;
let explosionTriggered = false;
let stationDriftVelocity = new THREE.Vector3(0, 0, 0);
let stationBayScale = 1;

const FLIGHT_FORWARD = new THREE.Vector3(0, 0, -1);
const PLANET_CENTER = new THREE.Vector3(0.15, -0.35, -9.2);
const INITIAL_CAMERA_POSITION = new THREE.Vector3(-1.15, 0.55, -1.45);
const INITIAL_CAMERA_TARGET = new THREE.Vector3(-0.2, 0.05, -0.15);
const targetOrientation = new THREE.Quaternion();
const rocketDirection = new THREE.Vector3(0, 0, -1);
const _dummyWorldPos = new THREE.Vector3();
const _dummyWorldQuat = new THREE.Quaternion();
const _toPlanet = new THREE.Vector3();
const _camToRocket = new THREE.Vector3();

const LOCALIZED_LOADING = {
    en: { loading: 'Preparing flight…', failed: 'The flight scene could not be loaded.' },
    ru: { loading: 'Подготовка полёта…', failed: 'Не удалось загрузить сцену полёта.' },
    zh: { loading: '正在准备飞行…', failed: '无法加载飞行场景。' }
};

function setLoadingProgress(loaded, total) {
    const bar = activeContainer?.querySelector('.cinema-loading-bar');
    const text = activeContainer?.querySelector('.cinema-loading-text');
    if (!bar || !text) return;
    const progress = total ? Math.round((loaded / total) * 100) : 0;
    bar.style.width = `${progress}%`;
    text.textContent = `${localizedText().loading} ${progress}%`;
}

function localizedText() {
    const language = (document.documentElement.lang || 'en').split('-')[0];
    return LOCALIZED_LOADING[language] || LOCALIZED_LOADING.en;
}

function loadGltf(loader, path) {
    return new Promise((resolve, reject) => {
        loader.load(path, resolve, undefined, error => {
            reject(new Error(`Failed to load model ${path}`, { cause: error }));
        });
    });
}

function loadTexture(loader, path, colorTexture = true) {
    return new Promise((resolve, reject) => {
        loader.load(path, texture => {
            if (colorTexture) texture.encoding = THREE.sRGBEncoding;
            texture.anisotropy = Math.min(8, renderer?.capabilities.getMaxAnisotropy() || 1);
            resources.push(texture);
            resolve(texture);
        }, undefined, error => {
            reject(new Error(`Failed to load texture ${path}`, { cause: error }));
        });
    });
}

async function preloadAssets() {
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_url, loaded, total) => setLoadingProgress(loaded, total);
    const gltfLoader = new THREE.GLTFLoader(manager);
    const textureLoader = new THREE.TextureLoader(manager);
    // Prefer the highest-detail maps available in the repo.
    const results = await Promise.allSettled([
        loadGltf(gltfLoader, `${ASSET_ROOT}/models/station.glb`),
        loadGltf(gltfLoader, `${ASSET_ROOT}/models/rocket.glb`),
        loadTexture(textureLoader, `${ASSET_ROOT}/images/earth/earth_atmos_4096-winter.jpg`),
        loadTexture(textureLoader, `${ASSET_ROOT}/images/earth/earth_clouds_2048.png`),
        loadTexture(textureLoader, `${ASSET_ROOT}/images/earth/moon_1024.jpg`),
        loadTexture(textureLoader, `${ASSET_ROOT}/images/earth/earth_specular_2048.jpg`, false),
        loadTexture(textureLoader, `${ASSET_ROOT}/images/earth/earth_lights_2048.png`)
    ]);
    const failed = results.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
    const [
        stationGltf, rocketGltf, earthTexture, cloudTexture, moonTexture,
        specularTexture, lightsTexture
    ] = results.map(result => result.value);
    return {
        stationGltf, rocketGltf, earthTexture, cloudTexture, moonTexture,
        specularTexture, lightsTexture
    };
}

function makeStars() {
    const count = 1400;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const vertical = Math.random() * 2 - 1;
        const radius = 30 + Math.random() * 40;
        const ring = Math.sqrt(1 - vertical * vertical) * radius;
        positions[index * 3] = Math.cos(angle) * ring;
        positions[index * 3 + 1] = vertical * radius;
        positions[index * 3 + 2] = Math.sin(angle) * ring;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    scene.add(new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
            color: 0xdce8ff,
            size: 0.05,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true,
            depthWrite: false
        })
    ));
}

function makePlanet(assets, latitude, longitude) {
    const {
        earthTexture, cloudTexture, moonTexture, specularTexture, lightsTexture
    } = assets;

    planet = new THREE.Group();
    planet.position.copy(PLANET_CENTER);
    planet.scale.setScalar(PLANET_WORLD_SCALE);
    scene.add(planet);

    // Higher-poly sphere + full PBR-ish stack (color, specular, night lights).
    earthMaterial = new THREE.MeshStandardMaterial({
        map: earthTexture,
        roughnessMap: specularTexture || null,
        roughness: 0.82,
        metalness: 0.05,
        emissiveMap: lightsTexture || null,
        emissive: lightsTexture ? new THREE.Color(0xffffff) : new THREE.Color(0x000000),
        emissiveIntensity: lightsTexture ? 0.55 : 0,
        envMap: null
    });
    if (specularTexture) {
        // Specular map is treated as roughness: invert-ish by high roughness base.
        earthMaterial.roughness = 0.9;
    }
    const earth = new THREE.Mesh(
        new THREE.SphereGeometry(PLANET_UNIT_RADIUS, 128, 96),
        earthMaterial
    );
    planet.add(earth);

    clouds = new THREE.Mesh(
        new THREE.SphereGeometry(PLANET_UNIT_RADIUS * 1.008, 96, 64),
        new THREE.MeshLambertMaterial({
            map: cloudTexture,
            transparent: true,
            opacity: 0.42,
            depthWrite: false
        })
    );
    planet.add(clouds);

    const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(PLANET_UNIT_RADIUS * 1.045, 64, 48),
        new THREE.ShaderMaterial({
            uniforms: { intensity: { value: 0.32 } },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vViewDirection;
                void main() {
                    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
                    vNormal = normalize(normalMatrix * normal);
                    vViewDirection = normalize(-viewPosition.xyz);
                    gl_Position = projectionMatrix * viewPosition;
                }
            `,
            fragmentShader: `
                uniform float intensity;
                varying vec3 vNormal;
                varying vec3 vViewDirection;
                void main() {
                    float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDirection)), 0.0), 2.15);
                    float alpha = smoothstep(0.03, 0.92, rim) * intensity;
                    gl_FragColor = vec4(0.28, 0.58, 1.0, alpha);
                }
            `,
            side: THREE.BackSide,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false
        })
    );
    atmosphereMaterial = atmosphere.material;
    planet.add(atmosphere);

    const latitudeRadians = THREE.MathUtils.degToRad(latitude);
    const longitudeRadians = THREE.MathUtils.degToRad(longitude);
    const targetSurface = new THREE.Vector3(
        Math.cos(latitudeRadians) * Math.cos(longitudeRadians),
        Math.sin(latitudeRadians),
        -Math.cos(latitudeRadians) * Math.sin(longitudeRadians)
    ).normalize();
    planet.quaternion.setFromUnitVectors(targetSurface, new THREE.Vector3(0, 0, 1));

    moon = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 48, 32),
        new THREE.MeshStandardMaterial({
            map: moonTexture,
            roughness: 1,
            metalness: 0
        })
    );
    moon.position.set(3.6, 2.4, 4.5);
    scene.add(moon);
}

function addStation(stationGltf) {
    stationRoot = stationGltf.scene;
    stationRoot.scale.setScalar(STATION_SCALE);
    stationRoot.position.set(0, 0, 0);
    scene.add(stationRoot);

    dummyRocket = stationRoot.getObjectByName('dummy_rocket');
    if (!dummyRocket) throw new Error('station.glb is missing the dummy_rocket node');
    if (!stationGltf.animations.length) throw new Error('station.glb has no extraction animation');

    stationRoot.updateMatrixWorld(true);
    dummyRocket.updateWorldMatrix(true, false);
    INITIAL_CAMERA_TARGET.copy(dummyRocket.getWorldPosition(new THREE.Vector3()));
    INITIAL_CAMERA_POSITION.copy(INITIAL_CAMERA_TARGET)
        .add(new THREE.Vector3(-0.55, 0.62, -1.85));
    camera.position.copy(INITIAL_CAMERA_POSITION);
    camera.lookAt(INITIAL_CAMERA_TARGET);

    stationMixer = new THREE.AnimationMixer(stationRoot);
    stationAction = stationMixer.clipAction(stationGltf.animations[0]);
    stationAction.setLoop(THREE.LoopOnce, 1);
    stationAction.clampWhenFinished = true;
    stationMixer.timeScale = 0.85;

    const dummyPositionTrack = stationAction.getClip().tracks.find(track =>
        track.name.includes('dummy_rocket') && track.name.endsWith('.position')
    );
    let extractionTime = stationAction.getClip().duration;
    if (dummyPositionTrack) {
        const valueSize = dummyPositionTrack.getValueSize();
        for (let key = 1; key < dummyPositionTrack.times.length; key += 1) {
            const previous = (key - 1) * valueSize;
            const current = key * valueSize;
            let changed = false;
            for (let axis = 0; axis < valueSize; axis += 1) {
                if (Math.abs(dummyPositionTrack.values[current + axis] -
                    dummyPositionTrack.values[previous + axis]) > 1e-5) {
                    changed = true;
                    break;
                }
            }
            if (changed) extractionTime = dummyPositionTrack.times[key];
        }
    }
    STATION_PULL_SECONDS = extractionTime / stationMixer.timeScale;
    WHITEOUT_START = STATION_PULL_SECONDS + FLIGHT_SECONDS + 0.4;
    BLACKOUT_START = WHITEOUT_START + 2.8;
    END_CARD_START = BLACKOUT_START + 1.0;
}

function makeCoreGeometry(rows = 96, segments = 24) {
    const positions = [];
    const uvs = [];
    const indices = [];
    for (let row = 0; row <= rows; row += 1) {
        const height = row / rows;
        const radius = 0.033 + 0.026 * height + 0.012 * Math.sin(Math.PI * height);
        for (let segment = 0; segment <= segments; segment += 1) {
            const angle = (segment / segments) * Math.PI * 2;
            positions.push(Math.cos(angle) * radius, -height * 5.8, Math.sin(angle) * radius);
            uvs.push(segment / segments, height);
        }
    }
    for (let row = 0; row < rows; row += 1) {
        for (let segment = 0; segment < segments; segment += 1) {
            const vertex = row * (segments + 1) + segment;
            const nextRow = vertex + segments + 1;
            indices.push(vertex, nextRow, vertex + 1, nextRow, nextRow + 1, vertex + 1);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

function makeFlameMaterials() {
    sharedFlameTime = { value: 0 };
    const coreGeometry = makeCoreGeometry();
    const coreMaterials = ENGINE_POSITIONS.map((_, index) => new THREE.ShaderMaterial({
        uniforms: {
            uTime: sharedFlameTime,
            uLength: { value: 5.8 },
            uWidth: { value: 0.9 },
            uSeed: { value: index * 17.3 }
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
                float startFade = smoothstep(0.0, 0.025, vH);
                float tailFade = 1.0 - smoothstep(0.72, 1.0, vH);
                float flicker = 0.88 + 0.12 * sin(vH * 55.0 - uTime * 18.0 + uSeed);
                vec3 orange = vec3(1.0, 0.18, 0.025);
                vec3 hot = vec3(1.0, 0.93, 0.72);
                vec3 color = mix(orange, hot, 1.0 - smoothstep(0.0, 0.72, vH));
                gl_FragColor = vec4(color, startFade * tailFade * flicker * 0.8);
            }
        `
    }));

    const particleCount = 720;
    const along = new Float32Array(particleCount);
    const angle = new Float32Array(particleCount);
    const radial = new Float32Array(particleCount);
    const seed = new Float32Array(particleCount);
    const size = new Float32Array(particleCount);
    const speed = new Float32Array(particleCount);
    for (let index = 0; index < particleCount; index += 1) {
        along[index] = Math.random() * 1.26;
        angle[index] = Math.random() * Math.PI * 2;
        radial[index] = Math.sqrt(Math.random());
        seed[index] = Math.random();
        size[index] = 0.025 + Math.random() * 0.075;
        speed[index] = 0.38 + Math.random() * 0.34;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(particleCount * 3), 3));
    particleGeometry.setAttribute('aAlong', new THREE.BufferAttribute(along, 1));
    particleGeometry.setAttribute('aAngle', new THREE.BufferAttribute(angle, 1));
    particleGeometry.setAttribute('aRadial', new THREE.BufferAttribute(radial, 1));
    particleGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    particleGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));

    const particleMaterials = ENGINE_POSITIONS.map((_, index) => new THREE.ShaderMaterial({
        uniforms: {
            uTime: sharedFlameTime,
            uLength: { value: 5.8 },
            uWidth: { value: 0.9 },
            uSeed: { value: index * 17.3 },
            uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
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
                float plumeRadius = 0.025 + 0.045 * h + 0.26 * tail;
                float theta = aAngle + 0.12 * sin(uTime * 2.7 + aSeed * 35.0 + h * 9.0) * tail;
                float radius = aRadial * plumeRadius * uWidth;
                vec3 p = vec3(cos(theta) * radius, -h * uLength, sin(theta) * radius);
                p.x += sin(uTime * 1.8 + aSeed * 28.0 + h * 12.0) * 0.055 * tail;
                p.z += cos(uTime * 1.6 + aSeed * 31.0 + h * 10.0) * 0.055 * tail;
                vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
                gl_Position = projectionMatrix * viewPosition;
                gl_PointSize = clamp(aSize * uPixelRatio * (420.0 / max(1.0, -viewPosition.z)), 1.0, 18.0);
                vH = h;
                vSeed = aSeed + uSeed;
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying float vH;
            varying float vSeed;
            void main() {
                vec2 q = gl_PointCoord - 0.5;
                float d = length(q) * 2.0;
                float soft = exp(-d * d * 5.0) * (1.0 - smoothstep(0.65, 1.0, d));
                float startFade = smoothstep(0.0, 0.07, vH);
                float tailFade = 1.0 - smoothstep(1.04, 1.26, vH);
                float flicker = 0.75 + 0.25 * sin(uTime * 16.0 + vSeed * 40.0 + vH * 30.0);
                vec3 color = mix(vec3(1.0, 0.91, 0.70), vec3(1.0, 0.49, 0.10), smoothstep(0.06, 0.62, vH));
                color = mix(color, vec3(1.0, 0.16, 0.025), smoothstep(0.55, 1.12, vH));
                gl_FragColor = vec4(color, soft * startFade * tailFade * (0.035 + 0.055 * fract(vSeed)) * flicker);
            }
        `
    }));

    return { coreGeometry, coreMaterials, particleGeometry, particleMaterials };
}

function addRocket(rocketGltf) {
    rocketModel = rocketGltf.scene;
    rocketModel.updateMatrixWorld(true);
    rocketBounds = new THREE.Box3().setFromObject(rocketModel);
    rocketCenter = rocketBounds.getCenter(new THREE.Vector3());
    rocketLength = rocketBounds.getSize(new THREE.Vector3()).y;
    if (!Number.isFinite(rocketLength) || rocketLength <= 0) {
        throw new Error('rocket.glb has invalid longitudinal bounds');
    }

    rocketRoot = new THREE.Group();
    rocketModel.position.sub(rocketCenter);
    rocketRoot.add(rocketModel);
    // Visible from frame 0 — appears together with the station.
    rocketRoot.visible = true;
    scene.add(rocketRoot);

    stationBayScale = STATION_SCALE * (STATION_PAYLOAD_LENGTH / rocketLength);
    rocketRoot.scale.setScalar(stationBayScale);

    const flameAssets = makeFlameMaterials();
    ENGINE_POSITIONS.forEach(([x, y], index) => {
        const engine = new THREE.Group();
        engine.position.set(x, 2.2 - rocketCenter.y, y);
        engine.visible = false;

        const core = new THREE.Mesh(flameAssets.coreGeometry, flameAssets.coreMaterials[index]);
        const particles = new THREE.Points(flameAssets.particleGeometry, flameAssets.particleMaterials[index]);
        engine.add(core, particles);
        rocketModel.add(engine);
        flames.push(engine);
    });

    const heatGeometry = new THREE.SphereGeometry(2.6, 24, 16);
    const heatMaterial = new THREE.ShaderMaterial({
        uniforms: { heat: { value: 0 } },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vViewDirection;
            void main() {
                vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
                vNormal = normalize(normalMatrix * normal);
                vViewDirection = normalize(-viewPosition.xyz);
                gl_Position = projectionMatrix * viewPosition;
            }
        `,
        fragmentShader: `
            uniform float heat;
            varying vec3 vNormal;
            varying vec3 vViewDirection;
            void main() {
                float glow = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDirection))), 2.0);
                float alpha = smoothstep(0.02, 0.75, glow) * heat * 0.92;
                gl_FragColor = vec4(1.0, 0.22 + glow * 0.35, 0.025, alpha);
            }
        `
    });
    heatSpot = new THREE.Mesh(heatGeometry, heatMaterial);
    heatSpot.position.set(0, rocketBounds.max.y - rocketCenter.y - 1.5, 0);
    heatSpot.visible = false;
    rocketModel.add(heatSpot);
}

function createRenderer(container) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02040a);
    scene.fog = new THREE.FogExp2(0x02040a, 0.0008);

    camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.02, 120);
    camera.position.copy(INITIAL_CAMERA_POSITION);
    camera.lookAt(INITIAL_CAMERA_TARGET);

    const canvas = container.querySelector('#globeCanvas');
    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: (window.devicePixelRatio || 1) < 2,
        alpha: false,
        powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    scene.add(new THREE.HemisphereLight(0xb8d7ff, 0x11131c, 0.72));
    const sunlight = new THREE.DirectionalLight(0xffedda, 2.15);
    sunlight.position.set(-5, 4, 7);
    scene.add(sunlight);
    makeStars();
}

function setupAudio() {
    launchAudio = new Audio(`${ASSET_ROOT}/media/launch/crs34_launch_audio.m4a`);
    launchAudio.loop = true;
    launchAudio.volume = 0.22;
    launchAudio.preload = 'auto';

    explosionAudio = new Audio(`${ASSET_ROOT}/media/launch/explosion_stub.m4a`);
    explosionAudio.loop = false;
    explosionAudio.volume = 0.85;
    explosionAudio.preload = 'auto';
}

function startLaunchAudio() {
    if (!launchAudio) return;
    const play = launchAudio.play();
    if (play && typeof play.catch === 'function') play.catch(() => {});
}

function stopLaunchAudio() {
    if (!launchAudio) return;
    try {
        launchAudio.pause();
        launchAudio.currentTime = 0;
    } catch (_) { /* noop */ }
}

function triggerExplosionStub() {
    if (explosionTriggered) return;
    explosionTriggered = true;
    stopLaunchAudio();
    if (explosionAudio) {
        const play = explosionAudio.play();
        if (play && typeof play.catch === 'function') {
            play.catch(() => {
                console.info('[SpaceY] explosion_stub.m4a missing — drop CC0 SFX at static/media/launch/explosion_stub.m4a');
            });
        }
    }
}

/** Distance-based scale: farther from camera → smaller; closer → larger. */
function scaleFromCameraDistance(position) {
    _camToRocket.copy(position).sub(camera.position);
    const distance = _camToRocket.length();
    // Typical distances in this scene: ~0.8 (close) … ~3.5 (bay / far).
    const t = THREE.MathUtils.clamp((distance - 0.7) / 2.6, 0, 1);
    return THREE.MathUtils.lerp(ROCKET_SCALE_NEAR, ROCKET_SCALE_FAR, t);
}

/** Push the rocket out of the planet solid if it intersects. Returns true on impact. */
function resolvePlanetCollision(position) {
    _toPlanet.copy(position).sub(PLANET_CENTER);
    const distance = _toPlanet.length();
    const minDistance = PLANET_RADIUS + IMPACT_MARGIN;
    if (distance >= minDistance) return false;

    // Snap to surface shell — visual "hit the ground".
    if (distance > 1e-5) {
        _toPlanet.multiplyScalar(minDistance / distance);
    } else {
        _toPlanet.set(0, 0, 1).multiplyScalar(minDistance);
    }
    position.copy(PLANET_CENTER).add(_toPlanet);
    return true;
}

function syncRocketToDummy() {
    if (!dummyRocket || !rocketRoot) return;
    stationRoot.updateMatrixWorld(true);
    dummyRocket.updateWorldMatrix(true, false);
    dummyRocket.getWorldPosition(_dummyWorldPos);
    dummyRocket.getWorldQuaternion(_dummyWorldQuat);

    rocketRoot.position.copy(_dummyWorldPos);
    rocketRoot.quaternion.copy(_dummyWorldQuat);
    // While in the bay, keep station-matched scale so it reads as the payload.
    rocketRoot.scale.setScalar(stationBayScale);
    // Hide the low-detail dummy mesh; the real rocket stands in for it.
    dummyRocket.visible = false;
}

function beginFlight() {
    if (flightStarted) return;
    flightStarted = true;

    stationRoot.updateMatrixWorld(true);
    dummyRocket.updateWorldMatrix(true, false);
    const start = dummyRocket.getWorldPosition(new THREE.Vector3());

    // Nose already toward Earth.
    const earthOrientation = new THREE.Quaternion().setFromUnitVectors(
        ROCKET_LONGITUDINAL_AXIS,
        FLIGHT_FORWARD
    );
    rocketRoot.position.copy(start);
    rocketRoot.quaternion.copy(earthOrientation);
    rocketStartOrientation = earthOrientation.clone();
    rocketDirection.copy(FLIGHT_FORWARD);

    // Path ends just above the planetary surface (collision will clamp the rest).
    const surfacePoint = PLANET_CENTER.clone().add(
        new THREE.Vector3(0.02, 0.12, 1).normalize().multiplyScalar(PLANET_RADIUS + IMPACT_MARGIN + 0.05)
    );
    flightCurve = new THREE.CubicBezierCurve3(
        start,
        start.clone().add(new THREE.Vector3(0.35, -0.08, -2.6)),
        surfacePoint.clone().add(new THREE.Vector3(-0.15, 0.25, 1.8)),
        surfacePoint
    );

    stationDriftVelocity.set(0.035, 0.004, 0.012);
    dummyRocket.visible = false;
    startLaunchAudio();
}

function updateRocket(elapsed, flightProgress, delta) {
    if (!rocketRoot) return;

    if (!flightStarted) {
        syncRocketToDummy();
        return;
    }

    if (impactReached) {
        // Freeze on the surface after collision.
        flames.forEach(flame => { flame.visible = false; });
        heatSpot.visible = false;
        return;
    }

    const progress = THREE.MathUtils.clamp(flightProgress, 0, 1);
    const travel = progress * progress * (3 - 2 * progress);
    rocketRoot.position.copy(flightCurve.getPoint(travel));
    rocketDirection.copy(flightCurve.getTangent(travel)).normalize();

    // Collision with Earth solid.
    if (resolvePlanetCollision(rocketRoot.position)) {
        impactReached = true;
        // Force whiteout timeline from this moment if we hit early.
        const now = elapsed;
        if (now < WHITEOUT_START) {
            WHITEOUT_START = now + 0.15;
            BLACKOUT_START = WHITEOUT_START + 2.4;
            END_CARD_START = BLACKOUT_START + 0.9;
        }
        triggerExplosionStub();
    }

    targetOrientation.setFromUnitVectors(ROCKET_LONGITUDINAL_AXIS, rocketDirection);
    rocketRoot.quaternion.slerp(targetOrientation, 0.14);

    // Gradual size change as the rocket moves closer to / farther from the camera.
    const desiredScale = scaleFromCameraDistance(rocketRoot.position);
    const current = rocketRoot.scale.x;
    const next = THREE.MathUtils.lerp(current, desiredScale, 0.08);
    rocketRoot.scale.setScalar(next);

    const engineThrust = THREE.MathUtils.smoothstep(elapsed, STATION_PULL_SECONDS + 0.1, STATION_PULL_SECONDS + 0.7) *
        (1 - THREE.MathUtils.smoothstep(progress, 0.9, 1));
    sharedFlameTime.value += delta;
    flames.forEach(flame => {
        flame.visible = !impactReached && engineThrust > 0.01;
    });

    // Heat grows with proximity to the atmosphere / surface.
    _toPlanet.copy(rocketRoot.position).sub(PLANET_CENTER);
    const altitude = _toPlanet.length() - PLANET_RADIUS;
    const nearSurface = 1 - THREE.MathUtils.smoothstep(altitude, 0.05, 2.4);
    const heat = nearSurface * THREE.MathUtils.smoothstep(progress, 0.35, 0.85);
    heatSpot.visible = heat > 0.02;
    heatSpot.material.uniforms.heat.value = heat;
    heatSpot.scale.setScalar(0.7 + heat * 1.2);

    if (stationRoot) {
        stationRoot.position.addScaledVector(stationDriftVelocity, delta * 60);
    }

    if (planet) {
        const cloudSpeed = 0.012 + progress * progress * 0.6;
        clouds.rotation.y += delta * cloudSpeed;
        atmosphereMaterial.uniforms.intensity.value = 0.32 + nearSurface * 1.15;

        const haze = THREE.MathUtils.clamp(nearSurface * 0.85 + progress * 0.35, 0, 1);
        scene.fog.density = 0.0008 + haze * 0.05;
        scene.fog.color.setRGB(
            THREE.MathUtils.lerp(0.008, 0.88, haze * haze),
            THREE.MathUtils.lerp(0.016, 0.9, haze * haze),
            THREE.MathUtils.lerp(0.04, 0.92, haze * haze)
        );
        if (renderer) {
            renderer.toneMappingExposure = 1.1 + haze * 1.7;
        }
    }
}

function updateCamera(elapsed, flightProgress) {
    if (!flightStarted || elapsed < STATION_PULL_SECONDS + 0.15) {
        camera.position.lerp(INITIAL_CAMERA_POSITION, 0.04);
        camera.lookAt(INITIAL_CAMERA_TARGET);
        return;
    }

    const follow = THREE.MathUtils.smoothstep(elapsed, STATION_PULL_SECONDS + 0.15, STATION_PULL_SECONDS + 1.4);
    const back = 1.35 - flightProgress * 0.25;
    const up = 0.38 - flightProgress * 0.08;
    const mount = rocketRoot.position.clone()
        .addScaledVector(rocketDirection, -back)
        .add(new THREE.Vector3(0, up, 0));

    camera.position.lerp(mount, 0.06 + follow * 0.12);

    const lookAhead = rocketRoot.position.clone().addScaledVector(rocketDirection, 2.2);
    const earthBias = THREE.MathUtils.smoothstep(flightProgress, 0.15, 0.85);
    lookAhead.lerp(PLANET_CENTER, earthBias * 0.35);
    camera.lookAt(lookAhead);

    camera.fov = THREE.MathUtils.lerp(46, 58, THREE.MathUtils.smoothstep(flightProgress, 0.2, 0.9));
    camera.updateProjectionMatrix();
}

function updateOverlays(elapsed) {
    const whiteout = activeContainer.querySelector('.cinema-whiteout');
    const blackout = activeContainer.querySelector('.cinema-blackout');
    const endCard = activeContainer.querySelector('.cinema-end-card');

    const white = THREE.MathUtils.smoothstep(elapsed, WHITEOUT_START, WHITEOUT_START + 2.2);
    if (whiteout) whiteout.style.opacity = String(white);

    if (elapsed >= WHITEOUT_START + 0.35) {
        triggerExplosionStub();
    }

    const black = THREE.MathUtils.smoothstep(elapsed, BLACKOUT_START, BLACKOUT_START + 1.0);
    if (blackout) blackout.style.opacity = String(black);

    if (elapsed >= END_CARD_START) endCard?.classList.add('is-visible');
}

function renderFrame() {
    if (disposed || !renderer) return;
    const delta = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;

    if (stationMixer) stationMixer.update(delta);
    if (!flightStarted && elapsed >= STATION_PULL_SECONDS) beginFlight();

    const progress = THREE.MathUtils.clamp(
        (elapsed - STATION_PULL_SECONDS) / FLIGHT_SECONDS,
        0,
        1
    );
    updateRocket(elapsed, progress, delta);
    updateCamera(elapsed, progress);
    updateOverlays(elapsed);
    renderer.render(scene, camera);

    if (elapsed < END_CARD_START + 2.5) {
        animationFrame = requestAnimationFrame(renderFrame);
    }
}

function resize() {
    if (!renderer || !camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function disposeObject(object) {
    object.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
            } else {
                child.material.dispose();
            }
        }
    });
}

async function initRocketAnimation(containerId) {
    disposed = false;
    flightStarted = false;
    impactReached = false;
    explosionTriggered = false;
    stationDriftVelocity.set(0, 0, 0);

    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container #${containerId} not found`);
    activeContainer = container;
    container.style.display = 'block';
    document.body.style.overflow = 'hidden';

    const endCard = container.querySelector('.cinema-end-card');
    endCard?.classList.remove('is-visible');
    const whiteout = container.querySelector('.cinema-whiteout');
    const blackout = container.querySelector('.cinema-blackout');
    if (whiteout) whiteout.style.opacity = '0';
    if (blackout) blackout.style.opacity = '0';

    const loading = container.querySelector('.cinema-loading');
    loading?.classList.add('is-visible');
    setLoadingProgress(0, 1);

    const latitude = Number(container.dataset.latitude) || 0;
    const longitude = Number(container.dataset.longitude) || 0;
    const assets = await preloadAssets();

    createRenderer(container);
    setupAudio();
    addStation(assets.stationGltf);
    addRocket(assets.rocketGltf);
    makePlanet(assets, latitude, longitude);

    // First sync so rocket is already sitting in the bay when the scene opens.
    syncRocketToDummy();

    stationAction.reset();
    stationAction.play();

    loading?.classList.remove('is-visible');
    clock = new THREE.Clock();
    resizeHandler = resize;
    window.addEventListener('resize', resizeHandler);
    animationFrame = requestAnimationFrame(renderFrame);
    return { stop: stopRocketAnimation };
}

export function stopRocketAnimation() {
    disposed = true;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;

    stopLaunchAudio();
    if (explosionAudio) {
        try { explosionAudio.pause(); } catch (_) { /* noop */ }
    }
    launchAudio = null;
    explosionAudio = null;
    explosionTriggered = false;
    flightStarted = false;
    impactReached = false;

    if (scene) {
        disposeObject(scene);
        scene.clear();
    }
    resources.forEach(resource => resource.dispose());
    resources = [];
    renderer?.dispose();
    renderer = null;
    scene = null;
    camera = null;
    clock = null;
    stationRoot = null;
    stationMixer = null;
    stationAction = null;
    dummyRocket = null;
    rocketRoot = null;
    rocketModel = null;
    flightCurve = null;
    rocketStartOrientation = null;
    planet = null;
    clouds = null;
    moon = null;
    heatSpot = null;
    flames = [];
    activeContainer = null;
}

window.startRocketAnimation = () => {
    initRocketAnimation('animationContainer').catch(error => {
        console.error('Не удалось подготовить сцену полёта.', error);
        const container = document.getElementById('animationContainer');
        if (!container) return;
        const errorMessage = localizedText().failed;
        stopRocketAnimation();
        activeContainer = container;
        const loading = container.querySelector('.cinema-loading');
        const errorText = container.querySelector('.cinema-loading-error');
        const returnButton = container.querySelector('.cinema-loading-return');
        loading?.classList.add('is-visible');
        if (errorText) {
            errorText.hidden = false;
            errorText.textContent = errorMessage;
        }
        if (returnButton) returnButton.hidden = false;
    });
};
window.stopRocketAnimation = stopRocketAnimation;
