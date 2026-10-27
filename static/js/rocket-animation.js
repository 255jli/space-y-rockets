const THREE = window.THREE;
const ASSET_ROOT = '/static';
const STATION_SCALE = 0.012;
let STATION_PULL_SECONDS = 18;
const FLIGHT_SECONDS = 11;
let WHITEOUT_START = STATION_PULL_SECONDS + FLIGHT_SECONDS + 0.4;
let BLACKOUT_START = WHITEOUT_START + 2.8;
let END_CARD_START = BLACKOUT_START + 1.0;
const STATION_PAYLOAD_LENGTH = 8;
const ROCKET_LONGITUDINAL_AXIS = new THREE.Vector3(0, 1, 0);
const ROCKET_SCALE_NEAR = 0.0058;
const ROCKET_SCALE_FAR = 0.00035;
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

    async function loadTextureWithFallback(loader, primary, fallback, colorTexture = true) {
        try {
            return await loadTexture(loader, primary, colorTexture);
        } catch (error) {
            if (!fallback) throw error;
            console.warn('[SpaceY] texture fallback', primary, '→', fallback);
            return loadTexture(loader, fallback, colorTexture);
        }
    }

    const stationGltf = await loadGltf(gltfLoader, `${ASSET_ROOT}/models/station.glb`);
    const rocketGltf = await loadGltf(gltfLoader, `${ASSET_ROOT}/models/rocket.glb`);
    const earthTexture = await loadTextureWithFallback(
        textureLoader,
        `${ASSET_ROOT}/images/earth/earth_atmos_4096-winter.jpg`,
        `${ASSET_ROOT}/images/earth/earth_atmos_2048-summer.jpg`
    );
    const cloudTexture = await loadTextureWithFallback(
        textureLoader,
        `${ASSET_ROOT}/images/earth/earth_clouds_2048.png`,
        `${ASSET_ROOT}/images/earth/earth_clouds_1024.png`
    );
    const moonTexture = await loadTexture(textureLoader, `${ASSET_ROOT}/images/earth/moon_1024.jpg`);
    let specularTexture = null;
    let lightsTexture = null;
    try {
        specularTexture = await loadTexture(
            textureLoader, `${ASSET_ROOT}/images/earth/earth_specular_2048.jpg`, false
        );
    } catch (_) { /* optional */ }
    try {
        lightsTexture = await loadTexture(
            textureLoader, `${ASSET_ROOT}/images/earth/earth_lights_2048.png`
        );
    } catch (_) { /* optional */ }
    return {
        stationGltf, rocketGltf, earthTexture, cloudTexture, moonTexture,
        specularTexture, lightsTexture
    };
}
