/**
 * SpaceY Rockets - 3D анимация полета ракеты
 * ============================================
 * 
 * Этот файл содержит 3D анимацию полета ракеты к выбранной точке.
 * Использует Three.js для рендеринга глобуса и ракеты.
 * Оптимизировано для слабых CPU.
 */

// =============================================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// =============================================================================

let scene, camera, renderer, globe, rocket, cloudLayer, flightPath, targetMarker, targetWorldPosition;
let animationFrame;
let isAnimating = false;
let animationStartTime = 0;

// Оптимизация для слабых CPU
const DEVICE_TIER = getDeviceTier();
const ANIMATION_DURATION = DEVICE_TIER === 'low' ? 9000 : 12500;
const FRAME_INTERVAL = DEVICE_TIER === 'low' ? 33 : 16; // 30fps или 60fps

// Предрассчитанные точки траектории
let trajectoryPoints = [];
const TRAJECTORY_STEPS = 60;
let lastFrameTime = 0;

// =============================================================================
// ОПРЕДЕЛЕНИЕ МОЩНОСТИ УСТРОЙСТВА
// =============================================================================

/**
 * Определяет мощность устройства для адаптации графики
 */
function getDeviceTier() {
    const cores = navigator.hardwareConcurrency || 2;
    const memory = navigator.deviceMemory || 4;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (reducedMotion || cores <= 2 || memory <= 2) {
        return 'low';
    } else if (cores <= 4 || memory <= 4) {
        return 'medium';
    }
    return 'high';
}

console.log('🎮 Device tier:', DEVICE_TIER);

// =============================================================================
// ИНИЦИАЛИЗАЦИЯ 3D СЦЕНЫ
// =============================================================================

/**
 * Инициализирует 3D сцену с глобусом
 */
function initGlobeScene() {
    const canvas = document.getElementById('globeCanvas');
    if (!canvas) return;
    
    // Создаем сцену
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // Создаем камеру
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 3);
    
    // Создаем рендерер с оптимизациями
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: DEVICE_TIER === 'high',
        powerPreference: 'low-power',
        alpha: false
    });
    
    // Ограничиваем pixel ratio для слабых устройств
    const pixelRatio = DEVICE_TIER === 'low' ? 0.5 : (DEVICE_TIER === 'medium' ? 0.75 : window.devicePixelRatio);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Добавляем свет
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);
    
    // Создаем глобус
    createGlobe();
    
    // Создаем ракету
    createRocket();
    
    // Обработчик изменения размера окна
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(onWindowResize, 200);
    });
}

/**
 * Создает 3D глобус с текстурой Земли
 */
function createGlobe() {
    // Адаптивное количество сегментов
    const segments = DEVICE_TIER === 'low' ? 32 : (DEVICE_TIER === 'medium' ? 48 : 64);
    const geometry = new THREE.SphereGeometry(1, segments, segments);
    
    // Загружаем текстуру Земли из локального файла
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('/static/images/earth.jpg');
    earthTexture.encoding = THREE.sRGBEncoding;
    
    // Ограничиваем размер текстуры для слабых устройств
    if (DEVICE_TIER === 'low') {
        earthTexture.minFilter = THREE.LinearFilter;
        earthTexture.magFilter = THREE.LinearFilter;
    }
    
    // Используем более легкий материал для слабых устройств
    const material = DEVICE_TIER === 'low' 
        ? new THREE.MeshBasicMaterial({ map: earthTexture })
        : new THREE.MeshPhongMaterial({
            map: earthTexture,
            specular: new THREE.Color(0x222222),
            shininess: 10
        });
    
    globe = new THREE.Mesh(geometry, material);
    globe.rotation.order = 'XYZ';
    scene.add(globe);

    const cloudTexture = textureLoader.load('/static/images/earth_clouds_1024.png');
    cloudLayer = new THREE.Mesh(
        new THREE.SphereGeometry(1.012, segments, segments),
        new THREE.MeshLambertMaterial({
            map: cloudTexture,
            transparent: true,
            opacity: 0.42,
            depthWrite: false
        })
    );
    globe.add(cloudLayer);
    
    const atmosphereGeometry = new THREE.SphereGeometry(1.045, segments, segments);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x78c9ed,
        transparent: true,
        opacity: DEVICE_TIER === 'low' ? 0.1 : 0.16,
        side: THREE.BackSide,
        depthWrite: false
    });
    globe.add(new THREE.Mesh(atmosphereGeometry, atmosphereMaterial));
}

/**
 * Создает 3D модель ракеты
 */
function createRocket() {
    const radialSegments = DEVICE_TIER === 'low' ? 8 : 12;
    
    // Корпус ракеты
    const bodyGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.15, radialSegments);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    
    // Носовой конус
    const noseGeometry = new THREE.ConeGeometry(0.02, 0.05, radialSegments);
    const noseMaterial = new THREE.MeshBasicMaterial({ color: 0xff3333 });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.y = 0.1;
    
    // Группа ракеты
    rocket = new THREE.Group();
    rocket.add(body);
    rocket.add(nose);
    
    // Начальная позиция на орбите
    rocket.position.set(0, 1.5, 0);
    
    scene.add(rocket);
}

// =============================================================================
// ТРАЕКТОРИЯ ПОЛЕТА
// =============================================================================

/**
 * Конвертирует широту/долготу в 3D координаты на сфере
 */
function latLonToVector3(lat, lon, radius) {
    const latitude = lat * (Math.PI / 180);
    const longitude = lon * (Math.PI / 180);
    
    const x = radius * Math.cos(latitude) * Math.cos(longitude);
    const y = radius * Math.sin(latitude);
    const z = -radius * Math.cos(latitude) * Math.sin(longitude);
    
    return new THREE.Vector3(x, y, z);
}

/**
 * Предрассчитывает траекторию полета
 */
function precomputeTrajectory() {
    trajectoryPoints = [];
    const latitudeRadians = targetLatitude * (Math.PI / 180);
    const longitudeRadians = targetLongitude * (Math.PI / 180);
    const targetGlobeLongitude = -Math.PI / 2 - longitudeRadians;
    const rotation = new THREE.Euler(latitudeRadians, targetGlobeLongitude, 0, 'XYZ');
    const surfacePoint = latLonToVector3(targetLatitude, targetLongitude, 1.018);
    targetWorldPosition = surfacePoint.clone().applyEuler(rotation);
    const startDistance = 2.35;
    const endDistance = 1.08;
    
    for (let i = 0; i <= TRAJECTORY_STEPS; i++) {
        const t = i / TRAJECTORY_STEPS;
        const distance = startDistance + (endDistance - startDistance) * t;
        trajectoryPoints.push(targetWorldPosition.clone().multiplyScalar(distance / 1.018));
    }

    if (flightPath) {
        scene.remove(flightPath);
        flightPath.geometry.dispose();
        flightPath.material.dispose();
    }
    flightPath = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(trajectoryPoints),
        new THREE.LineBasicMaterial({ color: 0xc7f36b, transparent: true, opacity: 0.42 })
    );
    scene.add(flightPath);

    if (targetMarker) {
        globe.remove(targetMarker);
    }
    targetMarker = new THREE.Group();
    const markerPosition = surfacePoint;
    const markerDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xff765c })
    );
    const markerRing = new THREE.Mesh(
        new THREE.RingGeometry(0.027, 0.034, 24),
        new THREE.MeshBasicMaterial({ color: 0xff765c, side: THREE.DoubleSide })
    );
    markerRing.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        markerPosition.clone().normalize()
    );
    targetMarker.add(markerDot, markerRing);
    targetMarker.position.copy(markerPosition);
    globe.add(targetMarker);
    rocket.position.copy(trajectoryPoints[0]);
}

// =============================================================================
// АНИМАЦИЯ ПОЛЕТА
// =============================================================================

/**
 * Анимирует полет ракеты к выбранной точке
 */
function animateRocketFlight(currentTime) {
    if (!isAnimating) return;
    
    // Throttle кадров для слабых устройств
    if (currentTime - lastFrameTime < FRAME_INTERVAL) {
        animationFrame = requestAnimationFrame(animateRocketFlight);
        return;
    }
    lastFrameTime = currentTime;
    
    // Сканируем заданный сектор, затем переходим к бортовой камере.
    const elapsed = currentTime - animationStartTime;
    const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
    const scanProgress = Math.min(progress / 0.24, 1);
    const approachProgress = Math.max(0, (progress - 0.24) / 0.76);
    const easedScan = scanProgress * scanProgress * (3 - 2 * scanProgress);

    globe.rotation.x = targetLatitude * (Math.PI / 180) * easedScan;
    globe.rotation.y = (-Math.PI / 2 - targetLongitude * (Math.PI / 180)) * easedScan;
    cloudLayer.rotation.y += 0.00025;

    const pathIndex = Math.min(Math.floor(approachProgress * TRAJECTORY_STEPS), TRAJECTORY_STEPS);
    rocket.position.copy(trajectoryPoints[pathIndex]);
    rocket.visible = approachProgress < 0.08;

    const flightDirection = targetWorldPosition.clone().normalize().negate();
    if (approachProgress > 0) {
        camera.position.copy(rocket.position).addScaledVector(flightDirection, -0.16);
        camera.lookAt(rocket.position.clone().addScaledVector(flightDirection, 1.2));
    } else {
        camera.position.set(0, 0, 3.2);
        camera.lookAt(0, 0, 0);
    }

    if (flightPath) {
        flightPath.visible = scanProgress >= 0.82;
    }

    const reticle = document.getElementById('targetReticle');
    if (reticle) {
        reticle.classList.toggle('is-locked', scanProgress >= 0.72 && scanProgress < 1);
    }

    const cameraMode = document.getElementById('cameraMode');
    if (cameraMode) {
        cameraMode.textContent = approachProgress > 0.04
            ? 'КАМЕРА / БОРТОВОЙ РЕЖИМ'
            : 'КАМЕРА / ОРБИТАЛЬНОЕ НАБЛЮДЕНИЕ';
    }

    const fog = document.getElementById('flightFog');
    if (fog && approachProgress > 0.84) {
        fog.classList.add('is-active');
        fog.style.opacity = String(Math.min((approachProgress - 0.84) / 0.16, 1));
    }

    const progressBar = document.getElementById('missionProgress');
    if (progressBar) {
        progressBar.style.transform = `scaleX(${progress})`;
    }
    
    // Обновляем статус
    const statusEl = document.getElementById('trackingStatus');
    if (statusEl) {
        let newStatus;
        if (progress < 0.12) newStatus = 'СКАНИРОВАНИЕ СЕКТОРА';
        else if (progress < 0.24) newStatus = 'ЦЕЛЬ ОБНАРУЖЕНА';
        else if (progress < 0.38) newStatus = 'КАМЕРА НА БОРТУ';
        else if (progress < 0.78) newStatus = 'ВХОД В АТМОСФЕРУ';
        else newStatus = 'СНИЖЕНИЕ К ЦЕЛИ';
        
        if (statusEl.textContent !== newStatus) {
            statusEl.textContent = newStatus;
        }
    }
    
    // Если ракета достигла цели
    if (progress >= 1) {
        finishAnimation();
        return;
    }

    renderer.render(scene, camera);
    
    animationFrame = requestAnimationFrame(animateRocketFlight);
}

/**
 * Завершает анимацию и показывает модальное окно
 */
function finishAnimation() {
    isAnimating = false;
    
    // Показываем финальное сообщение
    const statusEl = document.getElementById('trackingStatus');
    if (statusEl) {
        statusEl.textContent = 'СВЯЗЬ С АППАРАТОМ УСТАНОВЛЕНА';
    }

    const progressBar = document.getElementById('missionProgress');
    if (progressBar) {
        progressBar.style.transform = 'scaleX(1)';
    }

    const fog = document.getElementById('flightFog');
    if (fog) {
        fog.classList.add('is-active');
        fog.style.opacity = '1';
    }
    
    setTimeout(() => {
        const notice = document.getElementById('flightNotice');
        if (notice) notice.classList.add('is-visible');
    }, 1600);

    setTimeout(() => {
        const animationContainer = document.getElementById('animationContainer');
        animationContainer.style.display = 'none';
        
        // Очищаем сцену
        if (renderer) {
            renderer.dispose();
        }
        
        showSuccessModal();
    }, 6200);
}

/**
 * Обработчик изменения размера окна
 */
function onWindowResize() {
    if (!camera || !renderer) return;
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// =============================================================================
// УПРАВЛЕНИЕ АНИМАЦИЕЙ
// =============================================================================

/**
 * Запускает анимацию полета ракеты
 */
function startRocketAnimation() {
    const fog = document.getElementById('flightFog');
    const notice = document.getElementById('flightNotice');
    if (fog) {
        fog.classList.remove('is-active');
        fog.style.opacity = '0';
    }
    if (notice) notice.classList.remove('is-visible');

    // Инициализируем 3D сцену
    initGlobeScene();
    
    // Предрассчитываем траекторию
    precomputeTrajectory();
    
    // Запускаем анимацию
    isAnimating = true;
    animationStartTime = performance.now();
    lastFrameTime = 0;
    animationFrame = requestAnimationFrame(animateRocketFlight);
}
