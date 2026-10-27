const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyCHyi7E6LNi0Ev73OsUdaBR8QPItZX1050',
    authDomain: 'space-y-rockets.firebaseapp.com',
    databaseURL: 'https://space-y-rockets-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'space-y-rockets',
    storageBucket: 'space-y-rockets.firebasestorage.app',
    messagingSenderId: '597922032867',
    appId: '1:597922032867:web:9123473196bfe4c11e29d6'
};

let selectedRocket = null;
let targetLatitude = null;
let targetLongitude = null;
let customerCounterValue = null;
let renderedCustomerCounterValue = null;
let customerCounterStatus = null;
const CUSTOMER_COUNTER_STATUS_MESSAGES = {
    loading: 'Загрузка счётчика клиентов…',
    updating: 'Обновляем счётчик…',
    thanks: 'Спасибо за отзыв!',
    error: 'Не удалось обновить счётчик. Попробуйте позже.',
    unavailable: 'Счётчик сейчас недоступен.'
};

function messages() {
    return (window.SpaceY && window.SpaceY.getMessages)
        ? window.SpaceY.getMessages()
        : {
            noVehicle: 'Nothing selected yet',
            noLocation: 'No destination selected',
            latitude: 'LAT',
            longitude: 'LON',
            selectRocket: 'Please select a vehicle first.',
            selectLocation: 'Please select a destination on the map.',
            invalidQuantity: 'Choose a quantity between 1 and 10.',
            acceptFuelUse: 'Please agree to the emergency fuel-use condition.'
        };
}

function updateCustomerCounterStatus(statusKey) {
    customerCounterStatus = statusKey;
    const status = document.getElementById('customerCounterStatus');
    if (status) status.textContent = statusKey ? CUSTOMER_COUNTER_STATUS_MESSAGES[statusKey] : '';
}

function renderCustomerCounter() {
    const output = document.getElementById('customerCounterValue');
    if (!output || customerCounterValue === null) return;
    const formattedValue = new Intl.NumberFormat(document.documentElement.lang || 'en')
        .format(customerCounterValue);
    const animate = renderedCustomerCounterValue !== null &&
        renderedCustomerCounterValue !== customerCounterValue &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const counterButton = document.getElementById('customerCounterButton');
    const availableWidth = counterButton ? counterButton.clientWidth - 24 : 0;
    if (availableWidth > 0) {
        output.style.fontSize = `${Math.min(88, availableWidth / (formattedValue.length * 0.62))}px`;
    }
    output.setAttribute('aria-label', formattedValue);
    output.replaceChildren();

    [...formattedValue].forEach((character, index) => {
        if (!/\d/.test(character)) {
            const separator = document.createElement('span');
            separator.className = 'customer-counter-separator';
            separator.setAttribute('aria-hidden', 'true');
            separator.textContent = character;
            output.append(separator);
            return;
        }

        const digitWindow = document.createElement('span');
        digitWindow.className = 'customer-counter-digit-window';
        digitWindow.setAttribute('aria-hidden', 'true');
        const digit = document.createElement('span');
        digit.className = 'customer-counter-digit';
        digit.textContent = character;
        digitWindow.append(digit);
        output.append(digitWindow);

        if (animate) {
            digit.animate(
                [
                    { transform: 'rotateX(-90deg) translateY(0.35em)', opacity: 0 },
                    { transform: 'rotateX(0) translateY(0)', opacity: 1 }
                ],
                {
                    duration: 420,
                    delay: index * 35,
                    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                    fill: 'both'
                }
            );
        }
    });

    renderedCustomerCounterValue = customerCounterValue;
}

async function initializeCustomerCounter() {
    const button = document.getElementById('customerCounterButton');
    const output = document.getElementById('customerCounterValue');
    if (!button || !output) return;

    let incrementCustomerCounter;
    updateCustomerCounterStatus('loading');
    button.addEventListener('click', async () => {
        updateCustomerCounterStatus('updating');
        try {
            const result = await incrementCustomerCounter();
            if (!result.committed) throw new Error('Customer counter transaction was not committed');
            customerCounterValue = result.snapshot.val();
            renderCustomerCounter();
            updateCustomerCounterStatus('thanks');
        } catch (error) {
            console.error('[SpaceY] Customer counter update failed.', error);
            updateCustomerCounterStatus('error');
        }
    });

    try {
        const [{ initializeApp }, { getDatabase, onValue, ref, runTransaction }] = await Promise.all([
            import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
            import('https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js')
        ]);
        const app = initializeApp(FIREBASE_CONFIG);
        const customerCounter = ref(getDatabase(app), 'customerCounter');
        incrementCustomerCounter = () => runTransaction(customerCounter, value => {
            if (!Number.isSafeInteger(value) || value < 0 || value === Number.MAX_SAFE_INTEGER) {
                return undefined;
            }
            return value + 1;
        });

        onValue(customerCounter, snapshot => {
            const value = snapshot.val();
            if (!Number.isSafeInteger(value) || value < 0) {
                customerCounterValue = null;
                output.textContent = '—';
                button.disabled = true;
                updateCustomerCounterStatus('unavailable');
                console.error('[SpaceY] The customerCounter database value must be a non-negative integer.');
                return;
            }
            customerCounterValue = value;
            renderCustomerCounter();
            button.disabled = false;
            if (customerCounterStatus === 'loading' || customerCounterStatus === 'unavailable') {
                updateCustomerCounterStatus(null);
            }
        }, error => {
            button.disabled = true;
            updateCustomerCounterStatus('unavailable');
            console.error('[SpaceY] Customer counter subscription failed.', error);
        });
    } catch (error) {
        button.disabled = true;
        updateCustomerCounterStatus('unavailable');
        console.error('[SpaceY] Customer counter initialization failed.', error);
    }
}

function updateCoordinateReadout() {
    const currentMessages = messages();
    const el = document.getElementById('selectedCoords');
    if (!el) return;
    el.textContent =
        `${currentMessages.latitude} ${targetLatitude.toFixed(2)}° · ${currentMessages.longitude} ${targetLongitude.toFixed(2)}°`;
}

function updateLaunchButton() {
    const quantityInput = document.getElementById('quantity');
    const launchBtn = document.getElementById('launchBtn');
    if (!quantityInput || !launchBtn) return;
    const quantity = Number(quantityInput.value);
    const fuelConsent = document.getElementById('fuelConsent');
    const quantityIsValid = Number.isInteger(quantity) && quantity >= 1 && quantity <= 10;
    launchBtn.disabled =
        !selectedRocket || targetLatitude === null || !quantityIsValid || !fuelConsent?.checked;
}

function selectLocation(clientX, clientY) {
    const map = document.getElementById('worldMap');
    if (!map) return;
    const bounds = map.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (clientY - bounds.top) / bounds.height));
    targetLongitude = x * 360 - 180;
    targetLatitude = 90 - y * 180;

    const marker = document.getElementById('mapMarker');
    if (marker) {
        marker.hidden = false;
        marker.style.left = `${x * 100}%`;
        marker.style.top = `${y * 100}%`;
    }
    updateCoordinateReadout();
    updateLaunchButton();
}

function selectRocket(button) {
    selectedRocket = {
        id: Number(button.dataset.rocketId),
        name: button.dataset.rocketName
    };
    document.querySelectorAll('[data-select-rocket]').forEach(option => {
        const isSelected = option === button;
        option.closest('.rocket-card')?.classList.toggle('is-selected', isSelected);
        option.setAttribute('aria-pressed', String(isSelected));
    });
    const nameEl = document.getElementById('selectedRocketName');
    if (nameEl) nameEl.textContent = selectedRocket.name;
    updateLaunchButton();
}

function startDelivery() {
    const currentMessages = messages();
    if (!selectedRocket) {
        window.alert(currentMessages.selectRocket);
        return;
    }
    if (targetLatitude === null || targetLongitude === null) {
        window.alert(currentMessages.selectLocation);
        return;
    }

    const quantityInput = document.getElementById('quantity');
    const quantity = Number(quantityInput?.value);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        window.alert(currentMessages.invalidQuantity);
        quantityInput?.focus();
        return;
    }
    const fuelConsent = document.getElementById('fuelConsent');
    if (!fuelConsent?.checked) {
        window.alert(currentMessages.acceptFuelUse);
        fuelConsent?.focus();
        return;
    }

    const animationContainer = document.getElementById('animationContainer');
    if (!animationContainer) return;

    animationContainer.dataset.latitude = String(targetLatitude);
    animationContainer.dataset.longitude = String(targetLongitude);
    animationContainer.dataset.rocketName = selectedRocket.name;
    animationContainer.dataset.quantity = String(quantity);

    const label = document.getElementById('cinemaFlightLabel');
    if (label) {
        label.textContent = `${selectedRocket.name} · ${quantity} ×`;
    }

    if (typeof window.startRocketAnimation === 'function') {
        window.startRocketAnimation();
    }
}

function returnToHome() {
    const animationContainer = document.getElementById('animationContainer');
    if (animationContainer) animationContainer.style.display = 'none';
    window.stopRocketAnimation?.();
    document.body.style.overflow = '';

    selectedRocket = null;
    targetLatitude = null;
    targetLongitude = null;

    document.querySelectorAll('[data-select-rocket]').forEach(button => {
        button.setAttribute('aria-pressed', 'false');
        button.closest('.rocket-card')?.classList.remove('is-selected');
    });

    const quantityInput = document.getElementById('quantity');
    if (quantityInput) quantityInput.value = '1';
    const fuelConsent = document.getElementById('fuelConsent');
    if (fuelConsent) fuelConsent.checked = false;

    const nameEl = document.getElementById('selectedRocketName');
    if (nameEl) nameEl.textContent = messages().noVehicle;

    const marker = document.getElementById('mapMarker');
    if (marker) marker.hidden = true;

    const coords = document.getElementById('selectedCoords');
    if (coords) coords.textContent = messages().noLocation;

    const label = document.getElementById('cinemaFlightLabel');
    if (label) label.textContent = '';

    updateLaunchButton();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initializeOrderFlow() {
    const nameEl = document.getElementById('selectedRocketName');
    if (nameEl) nameEl.textContent = messages().noVehicle;

    document.querySelectorAll('[data-select-rocket]').forEach(button => {
        button.addEventListener('click', () => selectRocket(button));
    });

    const quantityInput = document.getElementById('quantity');
    if (quantityInput) {
        quantityInput.addEventListener('input', updateLaunchButton);
        quantityInput.addEventListener('change', () => {
            const quantity = Number(quantityInput.value);
            if (!Number.isInteger(quantity) || quantity < 1) quantityInput.value = '1';
            if (quantity > 10) quantityInput.value = '10';
            updateLaunchButton();
        });
    }
    document.getElementById('fuelConsent')?.addEventListener('change', updateLaunchButton);

    document.querySelectorAll('[data-quantity-step]').forEach(button => {
        button.addEventListener('click', () => {
            if (!quantityInput) return;
            const current = Number(quantityInput.value) || 1;
            const step = Number(button.dataset.quantityStep);
            quantityInput.value = String(Math.max(1, Math.min(10, current + step)));
            updateLaunchButton();
        });
    });

    const map = document.getElementById('worldMap');
    if (map) {
        map.addEventListener('click', event => selectLocation(event.clientX, event.clientY));
        map.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                const bounds = map.getBoundingClientRect();
                selectLocation(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
            }
        });
    }

    document.getElementById('launchBtn')?.addEventListener('click', startDelivery);

    document.querySelectorAll('[data-return-home]').forEach(button => {
        button.addEventListener('click', returnToHome);
    });

    // Optional: scroll to order block if still present somewhere
    document.querySelectorAll('[data-scroll-to-order]').forEach(button => {
        button.addEventListener('click', () => {
            document.getElementById('delivery')?.scrollIntoView({ behavior: 'smooth' });
        });
    });

    document.addEventListener('spacey:language-change', event => {
        if (targetLatitude === null) {
            const coords = document.getElementById('selectedCoords');
            if (coords) coords.textContent = event.detail.noLocation;
        } else {
            updateCoordinateReadout();
        }
        if (!selectedRocket) {
            const nameEl2 = document.getElementById('selectedRocketName');
            if (nameEl2) nameEl2.textContent = event.detail.noVehicle;
        }
        renderCustomerCounter();
    });

    updateLaunchButton();
    initializeCustomerCounter();
}

document.addEventListener('DOMContentLoaded', initializeOrderFlow);
