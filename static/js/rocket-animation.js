const SCENE_TIMING = {
    undock: 6.5,
    launch: 8.8,
    flight: 15.8,
    whiteout: 23.4,
    notice: 26.1,
    blackout: 29.2,
    endCard: 30.7
};

const QUALITY_SCALE = Math.min(window.devicePixelRatio || 1, 1.35);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let scene;
let camera;
let renderer;
let planet;
let clouds;
let rocket;
let station;
let exhaust;
let exhaustCore;
let exhaustLight;
let frameId;
let startedAt;
let sceneGeneration = 0;
let targetOutward;
let previousTimestamp = 0;

const vectorUp = new THREE.Vector3(0, 0, 1);
const tempDirection = new THREE.Vector3();
const tempPosition = new THREE.Vector3();
const tempSide = new THREE.Vector3();

function latLonToVector3(latitude, longitude, radius) {
    const lat = THREE.MathUtils.degToRad(latitude);
    const lon = THREE.MathUtils.degToRad(longitude);
    return new THREE.Vector3(
        radius * Math.cos(lat) * Math.cos(lon),
        radius * Math.sin(lat),
        -radius * Math.cos(lat) * Math.sin(lon)
    );
}

function createStars() {
    const positions = new Float32Array(1600 * 3);
    for (let i = 0; i < positions.length; i += 3) {
        const angle = Math.random() * Math.PI * 2;
        const height = Math.random() * 2 - 1;
        const radius = 24 + Math.random() * 46;
        const spread = Math.sqrt(1 - height * height) * radius;
        positions[i] = Math.cos(angle) * spread;
        positions[i + 1] = height * radius;
        positions[i + 2] = Math.sin(angle) * spread;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    scene.add(new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
            color: 0xdbe7ff,
            size: 0.075,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.76,
            depthWrite: false
        })
    ));
}

function loadTexture(path, onLoad, isColor = true) {
    new THREE.TextureLoader().load(
        path,
        texture => {
            texture.encoding = isColor ? THREE.sRGBEncoding : THREE.LinearEncoding;
            onLoad(texture);
        },
        undefined,
        error => console.error(`Не удалось загрузить текстуру ${path}`, error)
    );
}

function createAtmosphere() {
    const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.42, 56, 56),
        new THREE.ShaderMaterial({
            vertexShader: `
                varying vec3 viewNormal;
                varying vec3 viewPosition;
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    viewNormal = normalize( normalMatrix * normal );
                    viewPosition = normalize( -mvPosition.xyz );
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 viewNormal;
                varying vec3 viewPosition;
                void main() {
                    float rim = pow( 1.0 - max( dot( viewNormal, viewPosition ), 0.0 ), 3.0 );
                    gl_FragColor = vec4( 0.18, 0.52, 1.0, rim * 0.68 );
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        })
    );
    planet.add(atmosphere);
}

function createPlanet(generation) {
    planet = new THREE.Group();
    scene.add(planet);

    const segments = reducedMotion ? 40 : 56;
    const earth = new THREE.Mesh(
        new THREE.SphereGeometry(1.35, segments, segments),
        new THREE.MeshPhongMaterial({
            color: 0xffffff,
            specular: 0x183047,
            shininess: 16
        })
    );
    planet.add(earth);
    loadTexture('/static/images/earth/earth_atmos_2048-summer.jpg', texture => {
        if (generation !== sceneGeneration) return;
        earth.material.map = texture;
        earth.material.needsUpdate = true;
    });
    loadTexture('/static/images/earth/earth_specular_2048.jpg', texture => {
        if (generation !== sceneGeneration) return;
        earth.material.specularMap = texture;
        earth.material.specular.setHex(0x555555);
        earth.material.needsUpdate = true;
    }, false);

    clouds = new THREE.Mesh(
        new THREE.SphereGeometry(1.375, segments, segments),
        new THREE.MeshLambertMaterial({
            color: 0xe4f0ff,
            transparent: true,
            opacity: 0.48,
            depthWrite: false
        })
    );
    planet.add(clouds);
    loadTexture('/static/images/earth/earth_clouds_2048.png', texture => {
        if (generation !== sceneGeneration) return;
        clouds.material.map = texture;
        clouds.material.needsUpdate = true;
    });
    createAtmosphere();

    const surface = latLonToVector3(targetLatitude, targetLongitude, 1.35);
    const facing = new THREE.Vector3(0.34, 0.2, 0.92).normalize();
    planet.quaternion.setFromUnitVectors(surface.clone().normalize(), facing);
    planet.rotateZ(-0.08);
    targetOutward = surface.clone().normalize().applyQuaternion(planet.quaternion).normalize();
}

function createStation() {
    station = new THREE.Group();
    scene.add(station);

    const metal = new THREE.MeshStandardMaterial({ color: 0xb5c4d0, metalness: 0.72, roughness: 0.32 });
    const panel = new THREE.MeshStandardMaterial({
        color: 0x1a4d75,
        metalness: 0.35,
        roughness: 0.42,
        emissive: 0x071c35
    });
    const module = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.5, 12), metal);
    station.add(module);

    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), metal);
    station.add(hub);

    for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.035, 0.035), metal);
        arm.position.x = side * 0.32;
        station.add(arm);
        const solarPanel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.025, 0.29), panel);
        solarPanel.position.x = side * 0.67;
        station.add(solarPanel);
    }

    const outward = targetOutward.clone();
    station.position.copy(outward).multiplyScalar(2.58);
    station.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), outward);
}

function createFlame() {
    const flameMaterial = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader: `
            varying vec2 flameUv;
            void main() {
                flameUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }
        `,
        fragmentShader: `
            uniform float time;
            varying vec2 flameUv;
            void main() {
                float edge = 1.0 - smoothstep( 0.04, 0.5, abs( flameUv.x - 0.5 ) );
                float taper = smoothstep( 0.0, 0.18, flameUv.y ) * ( 1.0 - smoothstep( 0.84, 1.0, flameUv.y ) );
                float pulse = 0.82 + 0.18 * sin( time * 24.0 + flameUv.y * 18.0 );
                vec3 color = mix( vec3( 1.0, 0.2, 0.015 ), vec3( 1.0, 0.92, 0.62 ), smoothstep( 0.35, 0.75, edge ) );
                gl_FragColor = vec4( color, edge * taper * pulse );
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.72, 14, 1, true), flameMaterial);
    flame.rotation.x = -Math.PI / 2;
    flame.position.z = -0.82;
    rocket.add(flame);

    const core = new THREE.Mesh(
        new THREE.ConeGeometry(0.035, 0.42, 10, 1, true),
        new THREE.MeshBasicMaterial({
            color: 0xfff2bf,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    core.rotation.x = -Math.PI / 2;
    core.position.z = -0.7;
    core.visible = false;
    rocket.add(core);
    exhaust = flame;
    exhaustCore = core;
    exhaustLight = new THREE.PointLight(0xff6a16, 0, 3, 2);
    exhaustLight.position.z = -0.5;
    rocket.add(exhaustLight);
}

function createFallbackRocket() {
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.055, 0.72, 10),
        new THREE.MeshStandardMaterial({ color: 0xe8edf2, metalness: 0.55, roughness: 0.35 })
    );
    body.rotation.x = Math.PI / 2;
    body.position.z = 0.02;

    const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.04, 0.18, 10),
        new THREE.MeshStandardMaterial({ color: 0xdce4ec, metalness: 0.45, roughness: 0.3 })
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 0.46;
    rocket.userData.fallback.add(body, nose);
}

function loadRocketModel(generation) {
    if (!THREE.GLTFLoader) {
        console.error('Three.js GLTFLoader недоступен; используется упрощённая модель ракеты.');
        return;
    }

    new THREE.GLTFLoader().load(
        '/static/fallcon2000.glb',
        gltf => {
            if (generation !== sceneGeneration || !rocket) return;
            const model = gltf.scene;
            model.scale.setScalar(0.012);
            model.position.z = -0.411;
            rocket.remove(rocket.userData.fallback);
            rocket.add(model);
            rocket.userData.model = model;
        },
        undefined,
        error => {
            if (generation === sceneGeneration) {
                console.error('Не удалось загрузить static/fallcon2000.glb', error);
            }
        }
    );
}

function createRocket(generation) {
    rocket = new THREE.Group();
    scene.add(rocket);
    rocket.userData.fallback = new THREE.Group();
    rocket.add(rocket.userData.fallback);
    createFallbackRocket();
    createFlame();
    loadRocketModel(generation);
}

function createScene() {
    const generation = ++sceneGeneration;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02040a);
    scene.fog = new THREE.FogExp2(0x02040a, 0.004);

    camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 160);
    camera.position.set(0.15, 0.38, 5.1);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('globeCanvas'),
        antialias: QUALITY_SCALE > 1,
        powerPreference: 'high-performance',
        alpha: false
    });
    renderer.setPixelRatio(QUALITY_SCALE);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    scene.add(new THREE.AmbientLight(0x9ab5d6, 0.34));
    const sunlight = new THREE.DirectionalLight(0xffe4c4, 2.2);
    sunlight.position.set(-4, 3.5, 5);
    scene.add(sunlight);
    createStars();
    createPlanet(generation);
    createStation();
    createRocket(generation);
}

function smoothstep(value) {
    const t = THREE.MathUtils.clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
}

function updateCamera(elapsed, flightProgress) {
    const pan = smoothstep(elapsed / SCENE_TIMING.launch) * (reducedMotion ? 0.09 : 0.22);
    const orbitPosition = new THREE.Vector3(
        Math.sin(pan) * 5.1,
        0.38 + Math.sin(elapsed * 0.16) * 0.025,
        Math.cos(pan) * 5.1
    );
    const orbitLook = new THREE.Vector3(0.08 + pan * 0.8, 0, 0);
    const follow = smoothstep((elapsed - SCENE_TIMING.launch + 0.3) / 2.2);

    tempDirection.copy(targetOutward).negate();
    tempPosition.copy(rocket.position).addScaledVector(targetOutward, 2.65);
    tempSide.crossVectors(tempDirection, new THREE.Vector3(0, 1, 0)).normalize();
    tempPosition.addScaledVector(tempSide, 0.32);

    const lookPosition = rocket.position.clone().addScaledVector(tempDirection, 0.65);
    camera.position.copy(orbitPosition.lerp(tempPosition, follow));
    camera.lookAt(orbitLook.lerp(lookPosition, follow));

    const flightZoom = 1 - Math.max(0, flightProgress) * 0.08;
    camera.zoom = THREE.MathUtils.lerp(1, flightZoom, follow);
    camera.updateProjectionMatrix();
}

function updateRocket(elapsed, delta) {
    const departureProgress = smoothstep((elapsed - SCENE_TIMING.undock) / 2.3);
    const flightProgress = THREE.MathUtils.clamp(
        (elapsed - SCENE_TIMING.launch) / SCENE_TIMING.flight,
        0,
        1
    );
    const travelProgress = flightProgress * flightProgress * (2 - flightProgress);
    const startingRadius = 2.58;
    const endingRadius = 1.92;
    const radius = THREE.MathUtils.lerp(startingRadius, endingRadius, travelProgress);
    const outward = targetOutward.clone();
    const tangent = new THREE.Vector3().crossVectors(outward, new THREE.Vector3(0, 1, 0)).normalize();

    tempPosition.copy(outward).multiplyScalar(radius);
    tempPosition.addScaledVector(tangent, 0.2 * (1 - departureProgress));
    tempPosition.addScaledVector(outward, 0.3 * (1 - departureProgress));
    rocket.position.copy(tempPosition);
    rocket.quaternion.setFromUnitVectors(vectorUp, outward.clone().negate());
    rocket.rotateY(0.12);

    const ignition = smoothstep((elapsed - SCENE_TIMING.launch + 0.1) / 1.2);
    const cutoff = 1 - smoothstep((flightProgress - 0.84) / 0.16);
    const thrust = ignition * cutoff;
    exhaust.visible = thrust > 0.01;
    exhaustCore.visible = thrust > 0.01;
    exhaust.material.uniforms.time.value += delta;
    exhaust.scale.set(0.85 + Math.sin(elapsed * 29) * 0.12, 0.72 + Math.sin(elapsed * 23) * 0.2, 1);
    exhaustLight.intensity = 4.5 * thrust * (0.88 + Math.sin(elapsed * 26) * 0.12);
    rocket.visible = elapsed > 5.5;

    station.visible = elapsed < SCENE_TIMING.undock + 3.2;
    station.position.copy(outward).multiplyScalar(startingRadius);
    station.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), outward);
    return flightProgress;
}

function updateCinema(elapsed) {
    const whiteout = document.getElementById('cinemaWhiteout');
    const notice = document.getElementById('cinemaNotice');
    const blackout = document.getElementById('cinemaBlackout');
    const endCard = document.getElementById('cinemaEndCard');

    const whiteProgress = smoothstep((elapsed - SCENE_TIMING.whiteout) / 2.5);
    whiteout.style.opacity = String(whiteProgress);
    if (elapsed >= SCENE_TIMING.notice) notice.classList.add('is-visible');
    if (elapsed >= SCENE_TIMING.blackout) {
        notice.classList.remove('is-visible');
        blackout.classList.add('is-visible');
    }
    if (elapsed >= SCENE_TIMING.endCard) endCard.classList.add('is-visible');
}

function animate(timestamp) {
    if (!renderer) return;
    const delta = previousTimestamp ? Math.min((timestamp - previousTimestamp) / 1000, 0.05) : 0;
    previousTimestamp = timestamp;
    const elapsed = (timestamp - startedAt) / 1000;

    planet.rotation.y += delta * (reducedMotion ? 0.0015 : 0.004);
    clouds.rotation.y += delta * (reducedMotion ? 0.002 : 0.009);

    const flightProgress = updateRocket(elapsed, delta);
    updateCamera(elapsed, flightProgress);
    updateCinema(elapsed);
    renderer.render(scene, camera);

    if (elapsed < SCENE_TIMING.endCard + 1.1) {
        frameId = requestAnimationFrame(animate);
    }
}

function resizeScene() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function startRocketAnimation() {
    const container = document.getElementById('animationContainer');
    container.style.display = 'block';
    document.body.style.overflow = 'hidden';

    document.getElementById('cinemaWhiteout').style.opacity = '0';
    document.getElementById('cinemaNotice').classList.remove('is-visible');
    document.getElementById('cinemaBlackout').classList.remove('is-visible');
    document.getElementById('cinemaEndCard').classList.remove('is-visible');

    try {
        createScene();
    } catch (error) {
        console.error('Не удалось запустить 3D-сцену.', error);
        stopRocketAnimation();
        container.style.display = 'none';
        document.body.style.overflow = '';
        document.getElementById('delivery').style.display = 'block';
        window.alert('Не удалось запустить 3D-сцену. Проверьте поддержку WebGL в браузере.');
        return;
    }

    previousTimestamp = 0;
    startedAt = performance.now();
    frameId = requestAnimationFrame(animate);
    window.addEventListener('resize', resizeScene);
}

function stopRocketAnimation() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = null;
    window.removeEventListener('resize', resizeScene);
    sceneGeneration += 1;
    if (scene) {
        scene.traverse(object => {
            object.geometry?.dispose();
            if (Array.isArray(object.material)) {
                object.material.forEach(disposeMaterial);
            } else if (object.material) {
                disposeMaterial(object.material);
            }
        });
    }
    if (renderer) {
        renderer.dispose();
    }
    renderer = null;
    scene = null;
    camera = null;
    planet = null;
    clouds = null;
    rocket = null;
    station = null;
    exhaust = null;
    exhaustCore = null;
    exhaustLight = null;
}

function disposeMaterial(material) {
    for (const value of Object.values(material)) {
        if (value && value.isTexture) value.dispose();
    }
    material.dispose();
}
