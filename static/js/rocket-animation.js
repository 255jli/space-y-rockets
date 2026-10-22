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

let scene, camera, renderer, globe, rocket;
let animationFrame;
let isAnimating = false;
let animationStartTime = 0;

// Оптимизация для слабых CPU
const DEVICE_TIER = getDeviceTier();
const ANIMATION_DURATION = DEVICE_TIER === 'low' ? 3000 : 5000;
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
    const segments = DEVICE_TIER === 'low' ? 16 : (DEVICE_TIER === 'medium' ? 24 : 32);
    const geometry = new THREE.SphereGeometry(1, segments, segments);
    
    // Загружаем текстуру Земли из локального файла
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('/static/images/earth.jpg');
    
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
    scene.add(globe);
    
    // Атмосферу добавляем только на средних/высоких устройствах
    if (DEVICE_TIER !== 'low') {
        const atmosphereGeometry = new THREE.SphereGeometry(1.02, segments, segments);
        const atmosphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x4488ff,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        scene.add(atmosphere);
    }
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
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    return new THREE.Vector3(x, y, z);
}

/**
 * Предрассчитывает траекторию полета
 */
function precomputeTrajectory() {
    trajectoryPoints = [];
    const startPos = new THREE.Vector3(0, 1.5, 0);
    const targetPoint = latLonToVector3(targetLatitude, targetLongitude, 1);
    const midPos = new THREE.Vector3(
        (startPos.x + targetPoint.x) / 2,
        Math.max(startPos.y, targetPoint.y) + 0.8,
        (startPos.z + targetPoint.z) / 2
    );
    
    for (let i = 0; i <= TRAJECTORY_STEPS; i++) {
        const t = i / TRAJECTORY_STEPS;
        const pos = new THREE.Vector3();
        pos.x = (1-t)*(1-t)*startPos.x + 2*(1-t)*t*midPos.x + t*t*targetPoint.x;
        pos.y = (1-t)*(1-t)*startPos.y + 2*(1-t)*t*midPos.y + t*t*targetPoint.y;
        pos.z = (1-t)*(1-t)*startPos.z + 2*(1-t)*t*midPos.z + t*t*targetPoint.z;
        trajectoryPoints.push(pos);
    }
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
    
    // Вычисляем прогресс
    const elapsed = currentTime - animationStartTime;
    const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
    
    // Целевая точка
    const targetPoint = latLonToVector3(targetLatitude, targetLongitude, 1);
    
    // Вращаем глобус
    const targetRotationY = -targetLongitude * (Math.PI / 180);
    globe.rotation.y += (targetRotationY - globe.rotation.y) * 0.03;
    
    // Берем позицию из предрассчитанной траектории
    const index = Math.min(Math.floor(progress * TRAJECTORY_STEPS), TRAJECTORY_STEPS - 1);
    const pos = trajectoryPoints[index];
    rocket.position.copy(pos);
    
    // Поворачиваем ракету
    if (DEVICE_TIER !== 'low' && index < TRAJECTORY_STEPS - 1) {
        const nextPos = trajectoryPoints[index + 1];
        rocket.lookAt(nextPos);
        rocket.rotateX(Math.PI / 2);
    }
    
    // Обновляем статус
    const statusEl = document.getElementById('trackingStatus');
    if (statusEl) {
        let newStatus;
        if (progress < 0.3) newStatus = 'ROCKET DEPLOYED';
        else if (progress < 0.7) newStatus = 'IN TRANSIT';
        else newStatus = 'APPROACHING TARGET';
        
        if (statusEl.textContent !== newStatus) {
            statusEl.textContent = newStatus;
        }
    }
    
    // Если ракета достигла цели
    if (progress >= 1) {
        finishAnimation();
        return;
    }
    
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
        statusEl.textContent = 'DELIVERED!';
    }
    
    setTimeout(() => {
        // Скрываем анимацию
        const animationContainer = document.getElementById('animationContainer');
        animationContainer.style.display = 'none';
        
        // Очищаем сцену
        if (renderer) {
            renderer.dispose();
        }
        
        // Показываем модальное окно успеха
        showSuccessModal();
    }, 2000);
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

/**
 * Пропускает анимацию
 */
function skipAnimation() {
    isAnimating = false;
    
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
    
    // Скрываем анимацию
    const animationContainer = document.getElementById('animationContainer');
    animationContainer.style.display = 'none';
    
    // Очищаем сцену
    if (renderer) {
        renderer.dispose();
    }
    
    // Показываем модальное окно успеха
    showSuccessModal();
}
