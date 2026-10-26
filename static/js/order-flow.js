let selectedRocket = null;
let targetLatitude = null;
let targetLongitude = null;

function messages() {
    return window.SpaceY.getMessages();
}

function updateCoordinateReadout() {
    const currentMessages = messages();
    document.getElementById('selectedCoords').textContent =
        `${currentMessages.latitude} ${targetLatitude.toFixed(2)}° · ${currentMessages.longitude} ${targetLongitude.toFixed(2)}°`;
}

function updateLaunchButton() {
    const quantity = Number(document.getElementById('quantity').value);
    const quantityIsValid = Number.isInteger(quantity) && quantity >= 1 && quantity <= 10;
    document.getElementById('launchBtn').disabled =
        !selectedRocket || targetLatitude === null || !quantityIsValid;
}

function selectLocation(clientX, clientY) {
    const map = document.getElementById('worldMap');
    const bounds = map.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (clientY - bounds.top) / bounds.height));
    targetLongitude = x * 360 - 180;
    targetLatitude = 90 - y * 180;

    const marker = document.getElementById('mapMarker');
    marker.hidden = false;
    marker.style.left = `${x * 100}%`;
    marker.style.top = `${y * 100}%`;
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
        option.closest('.rocket-card').classList.toggle('is-selected', isSelected);
        option.setAttribute('aria-pressed', String(isSelected));
    });
    document.getElementById('selectedRocketName').textContent = selectedRocket.name;
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
    const quantity = Number(quantityInput.value);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        window.alert(currentMessages.invalidQuantity);
        quantityInput.focus();
        return;
    }

    const animationContainer = document.getElementById('animationContainer');
    animationContainer.dataset.latitude = String(targetLatitude);
    animationContainer.dataset.longitude = String(targetLongitude);
    animationContainer.dataset.rocketName = selectedRocket.name;
    animationContainer.dataset.quantity = String(quantity);
    document.getElementById('cinemaFlightLabel').textContent =
        `${selectedRocket.name} · ${quantity} ×`;
    window.startRocketAnimation();
}

function returnToHome() {
    document.getElementById('animationContainer').style.display = 'none';
    window.stopRocketAnimation?.();
    document.body.style.overflow = '';
    selectedRocket = null;
    targetLatitude = null;
    targetLongitude = null;
    document.querySelectorAll('[data-select-rocket]').forEach(button => {
        button.setAttribute('aria-pressed', 'false');
        button.closest('.rocket-card').classList.remove('is-selected');
    });

    const quantityInput = document.getElementById('quantity');
    quantityInput.value = '1';
    document.getElementById('selectedRocketName').textContent = messages().noVehicle;
    document.getElementById('mapMarker').hidden = true;
    document.getElementById('selectedCoords').textContent = messages().noLocation;
    document.getElementById('cinemaFlightLabel').textContent = '';
    updateLaunchButton();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initializeOrderFlow() {
    document.getElementById('selectedRocketName').textContent = messages().noVehicle;

    document.querySelectorAll('[data-select-rocket]').forEach(button => {
        button.addEventListener('click', () => selectRocket(button));
    });

    const quantityInput = document.getElementById('quantity');
    quantityInput.addEventListener('input', updateLaunchButton);
    quantityInput.addEventListener('change', () => {
        const quantity = Number(quantityInput.value);
        if (!Number.isInteger(quantity) || quantity < 1) quantityInput.value = '1';
        if (quantity > 10) quantityInput.value = '10';
        updateLaunchButton();
    });
    document.querySelectorAll('[data-quantity-step]').forEach(button => {
        button.addEventListener('click', () => {
            const current = Number(quantityInput.value) || 1;
            const step = Number(button.dataset.quantityStep);
            quantityInput.value = String(Math.max(1, Math.min(10, current + step)));
            updateLaunchButton();
        });
    });

    const map = document.getElementById('worldMap');
    map.addEventListener('click', event => selectLocation(event.clientX, event.clientY));
    map.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const bounds = map.getBoundingClientRect();
            selectLocation(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
        }
    });

    document.getElementById('launchBtn').addEventListener('click', startDelivery);
    document.querySelectorAll('[data-return-home]').forEach(button => {
        button.addEventListener('click', returnToHome);
    });
    document.querySelectorAll('[data-scroll-to-order]').forEach(button => {
        button.addEventListener('click', () => {
            document.getElementById('delivery').scrollIntoView({ behavior: 'smooth' });
        });
    });
    document.addEventListener('spacey:language-change', event => {
        if (targetLatitude === null) {
            document.getElementById('selectedCoords').textContent = event.detail.noLocation;
        } else {
            updateCoordinateReadout();
        }
        if (!selectedRocket) {
            document.getElementById('selectedRocketName').textContent = event.detail.noVehicle;
        }
    });

    updateLaunchButton();
}

document.addEventListener('DOMContentLoaded', initializeOrderFlow);
