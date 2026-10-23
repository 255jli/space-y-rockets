/**
 * SpaceY Rockets - Основная логика
 * =================================
 * 
 * Этот файл содержит всю интерактивность сайта:
 * - Выбор ракеты
 * - Интерактивная карта мира
 * - Запуск анимации доставки
 * - Модальное окно успеха
 */

// =============================================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// =============================================================================

let selectedRocketId = null;
let selectedRocketName = null;
let targetLatitude = null;
let targetLongitude = null;

// =============================================================================
// ШАГ 1: ВЫБОР РАКЕТЫ
// =============================================================================

/**
 * Выбирает ракету и показывает форму доставки
 * 
 * @param {number} rocketId - ID выбранной ракеты
 * @param {string} rocketName - Название ракеты
 */
function selectRocket(rocketId, rocketName) {
    selectedRocketId = rocketId;
    selectedRocketName = rocketName;

    document.querySelectorAll('.rocket-card').forEach(card => {
        card.classList.toggle('is-selected', Number(card.dataset.rocketId) === rocketId);
    });
    
    // Показываем секцию доставки
    const deliverySection = document.getElementById('delivery');
    deliverySection.style.display = 'block';
    
    // Показываем название выбранной ракеты
    const selectedNameEl = document.getElementById('selectedRocketName');
    selectedNameEl.textContent = rocketName;
    
    // Прокручиваем к форме доставки
    deliverySection.scrollIntoView({ behavior: 'smooth' });
    
    // Инициализируем карту
    initWorldMap();
}

// =============================================================================
// ШАГ 2: ИНТЕРАКТИВНАЯ КАРТА МИРА
// =============================================================================

/**
 * Инициализирует карту мира для выбора точки доставки
 */
function initWorldMap() {
    const canvas = document.getElementById('worldMap');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Устанавливаем размер canvas
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Рисуем карту
    drawMap(ctx, canvas.width, canvas.height);
    
    // Обработчик клика для выбора точки
    canvas.onclick = function(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Конвертируем пиксели в координаты (lat/lon)
        const lon = (x / canvas.width) * 360 - 180;
        const lat = 90 - (y / canvas.height) * 180;
        
        targetLatitude = lat;
        targetLongitude = lon;
        
        // Показываем выбранную точку
        drawSelectedPoint(ctx, canvas, x, y);
        
        // Обновляем текст координат
        const coordsEl = document.getElementById('selectedCoords');
        coordsEl.textContent = `Широта: ${lat.toFixed(2)}°, Долгота: ${lon.toFixed(2)}°`;
        
        // Активируем кнопку запуска
        const launchBtn = document.getElementById('launchBtn');
        launchBtn.disabled = false;
    };
}

/**
 * Рисует карту мира на canvas
 */
function drawMap(ctx, width, height) {
    // Фон
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
    
    // Сетка координат
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Вертикальные линии (долгота)
    for (let i = 0; i <= 12; i++) {
        const x = (i / 12) * width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    // Горизонтальные линии (широта)
    for (let i = 0; i <= 6; i++) {
        const y = (i / 6) * height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Упрощенные контуры континентов
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    
    // Северная Америка
    ctx.beginPath();
    ctx.moveTo(width * 0.15, height * 0.25);
    ctx.lineTo(width * 0.25, height * 0.2);
    ctx.lineTo(width * 0.3, height * 0.3);
    ctx.lineTo(width * 0.25, height * 0.4);
    ctx.lineTo(width * 0.2, height * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Южная Америка
    ctx.beginPath();
    ctx.moveTo(width * 0.25, height * 0.5);
    ctx.lineTo(width * 0.3, height * 0.55);
    ctx.lineTo(width * 0.28, height * 0.7);
    ctx.lineTo(width * 0.25, height * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Европа
    ctx.beginPath();
    ctx.moveTo(width * 0.45, height * 0.25);
    ctx.lineTo(width * 0.55, height * 0.2);
    ctx.lineTo(width * 0.55, height * 0.3);
    ctx.lineTo(width * 0.45, height * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Африка
    ctx.beginPath();
    ctx.moveTo(width * 0.45, height * 0.4);
    ctx.lineTo(width * 0.55, height * 0.4);
    ctx.lineTo(width * 0.55, height * 0.65);
    ctx.lineTo(width * 0.5, height * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Азия
    ctx.beginPath();
    ctx.moveTo(width * 0.55, height * 0.2);
    ctx.lineTo(width * 0.8, height * 0.25);
    ctx.lineTo(width * 0.85, height * 0.35);
    ctx.lineTo(width * 0.75, height * 0.45);
    ctx.lineTo(width * 0.6, height * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Австралия
    ctx.beginPath();
    ctx.moveTo(width * 0.75, height * 0.6);
    ctx.lineTo(width * 0.85, height * 0.6);
    ctx.lineTo(width * 0.85, height * 0.7);
    ctx.lineTo(width * 0.75, height * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

/**
 * Рисует выбранную точку на карте
 */
function drawSelectedPoint(ctx, canvas, x, y) {
    const width = canvas.width;
    const height = canvas.height;
    
    // Перерисовываем карту
    drawMap(ctx, width, height);
    
    // Рисуем точку
    ctx.fillStyle = '#ff3333';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Рисуем пульсирующее кольцо
    ctx.strokeStyle = 'rgba(255, 51, 51, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.stroke();
}

// =============================================================================
// ШАГ 3: ЗАПУСК АНИМАЦИИ
// =============================================================================

/**
 * Запускает анимацию доставки ракеты
 */
function startDelivery() {
    if (targetLatitude === null || targetLongitude === null) {
        alert('Пожалуйста, выберите место доставки на карте!');
        return;
    }

    const quantity = Number(document.getElementById('quantity').value);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        alert('Укажите количество от 1 до 100.');
        return;
    }
    
    // Скрываем форму доставки
    const deliverySection = document.getElementById('delivery');
    deliverySection.style.display = 'none';
    
    // Показываем анимацию
    const animationContainer = document.getElementById('animationContainer');
    animationContainer.style.display = 'block';
    
    // Обновляем информацию о миссии
    const missionTarget = document.getElementById('missionTarget');
    missionTarget.textContent = `Lat: ${targetLatitude.toFixed(2)}°, Lon: ${targetLongitude.toFixed(2)}°`;

    const missionReport = document.getElementById('missionReport');
    missionReport.textContent = `${selectedRocketName} / ${quantity} ед. / ${targetLatitude.toFixed(2)}°, ${targetLongitude.toFixed(2)}°`;
    
    // Запускаем 3D анимацию
    startRocketAnimation();
}

// =============================================================================
// ШАГ 4: МОДАЛЬНОЕ ОКНО УСПЕХА
// =============================================================================

/**
 * Показывает модальное окно успеха
 */
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.style.display = 'flex';
    
    // Обработчик звезд рейтинга
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.onclick = function() {
            const rating = Number(this.dataset.rating);
            
            // Подсвечиваем звезды
            stars.forEach((s, i) => {
                if (i < rating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
            
            // Шуточный ответ
            setTimeout(() => {
                alert('Спасибо за оценку! Она будет передана в /dev/null');
            }, 300);
        };
    });
}

/**
 * Закрывает модальное окно успеха
 */
function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.style.display = 'none';
    
    // Сбрасываем все данные
    selectedRocketId = null;
    selectedRocketName = null;
    targetLatitude = null;
    targetLongitude = null;
    
    // Прокручиваем наверх
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =============================================================================
// ИНИЦИАЛИЗАЦИЯ
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('SpaceY mission interface ready.');
});
