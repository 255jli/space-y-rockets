let selectedRocket = null;
let targetLatitude = null;
let targetLongitude = null;

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
            invalidQuantity: 'Choose a quantity between 1 and 10.'
        };
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
    const quantityIsValid = Number.isInteger(quantity) && quantity >= 1 && quantity <= 10;
    launchBtn.disabled =
        !selectedRocket || targetLatitude === null || !quantityIsValid;
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
    });

    updateLaunchButton();
}

document.addEventListener('DOMContentLoaded', initializeOrderFlow);
