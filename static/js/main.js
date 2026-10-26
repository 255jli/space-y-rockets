let currentLanguage = 'en';

const translations = {
    en: {
        catalogEyebrow: '01 / FLEET',
        catalogTitle: 'Choose a vehicle',
        availableVehicles: 'Available for simulation:',
        selectVehicle: 'Select vehicle',
        missionTitle: 'Build your mission',
        selectedVehicle: 'Selected vehicle',
        noVehicle: 'Nothing selected yet',
        quantityLabel: 'Number of vehicles',
        quantityHint: 'Choose between 1 and 10.',
        quantityDecrease: 'Decrease quantity',
        quantityIncrease: 'Increase quantity',
        destinationLabel: 'Landing coordinates',
        mapHint: 'Select a point on the map.',
        coordinatesLabel: 'TARGET COORDINATES',
        noLocation: 'No destination selected',
        mapAria: 'World map. Select a destination.',
        launchSimulation: 'Start simulation',
        missionComplete: 'SPACEY / MISSION COMPLETE',
        endQuestion: 'Want to run another simulation?',
        returnHome: 'Return',
        sceneAria: 'Cinematic flight simulation',
        rocketTypeLaunch: 'Launch vehicle for payload deployment and orbital transport missions.',
        rocketTypePlatform: 'Orbital platform for communications and navigation.',
        rocketTypeLander: 'Landing module designed for precise planetary surface operations.',
        rocketTypeResearch: 'Space platform for research and orbital missions.',
        latitude: 'LAT',
        longitude: 'LON',
        selectLocation: 'Please select a destination on the map.',
        selectRocket: 'Please select a vehicle first.',
        invalidQuantity: 'Choose a quantity between 1 and 10.',
        sceneError: 'The 3D scene could not start. Please check WebGL support in your browser.'
    },
    ru: {
        catalogEyebrow: '01 / КАТАЛОГ',
        catalogTitle: 'Выберите аппарат',
        availableVehicles: 'Доступно для симуляции:',
        selectVehicle: 'Выбрать аппарат',
        missionTitle: 'Соберите миссию',
        selectedVehicle: 'Выбранный аппарат',
        noVehicle: 'Пока ничего не выбрано',
        quantityLabel: 'Количество аппаратов',
        quantityHint: 'Выберите от 1 до 10.',
        quantityDecrease: 'Уменьшить количество',
        quantityIncrease: 'Увеличить количество',
        destinationLabel: 'Координаты доставки',
        mapHint: 'Выберите точку на карте.',
        coordinatesLabel: 'КООРДИНАТЫ ЦЕЛИ',
        noLocation: 'Место доставки не выбрано',
        mapAria: 'Карта мира. Выберите место доставки.',
        launchSimulation: 'Начать симуляцию',
        missionComplete: 'SPACEY / МИССИЯ ЗАВЕРШЕНА',
        endQuestion: 'Запустить ещё одну симуляцию?',
        returnHome: 'Вернуться',
        sceneAria: 'Кинематографическая симуляция полёта',
        rocketTypeLaunch: 'Ракетная система для вывода полезной нагрузки и транспортных миссий.',
        rocketTypePlatform: 'Орбитальная платформа для связи и навигации.',
        rocketTypeLander: 'Посадочный модуль для точной работы у поверхности планеты.',
        rocketTypeResearch: 'Космическая платформа для исследовательских и орбитальных миссий.',
        latitude: 'ШИРОТА',
        longitude: 'ДОЛГОТА',
        selectLocation: 'Сначала выберите место доставки на карте.',
        selectRocket: 'Сначала выберите аппарат.',
        invalidQuantity: 'Укажите количество от 1 до 10.',
        sceneError: 'Не удалось запустить 3D-сцену. Проверьте поддержку WebGL в браузере.'
    },
    zh: {
        catalogEyebrow: '01 / 航天器',
        catalogTitle: '选择航天器',
        availableVehicles: '可供模拟的配置：',
        selectVehicle: '选择航天器',
        missionTitle: '构建你的任务',
        selectedVehicle: '已选航天器',
        noVehicle: '尚未选择航天器',
        quantityLabel: '航天器数量',
        quantityHint: '请选择 1 至 10 个。',
        quantityDecrease: '减少数量',
        quantityIncrease: '增加数量',
        destinationLabel: '投送坐标',
        mapHint: '在地图上选择位置。',
        coordinatesLabel: '目标坐标',
        noLocation: '尚未选择目的地',
        mapAria: '世界地图。选择目的地。',
        launchSimulation: '开始模拟',
        missionComplete: 'SPACEY / 任务完成',
        endQuestion: '再次运行模拟？',
        returnHome: '返回',
        sceneAria: '电影感飞行模拟',
        rocketTypeLaunch: '用于有效载荷部署和轨道运输任务的运载火箭。',
        rocketTypePlatform: '用于通信和导航任务的轨道平台。',
        rocketTypeLander: '用于精准行星表面作业的着陆模块。',
        rocketTypeResearch: '用于科研和轨道任务的航天平台。',
        latitude: '纬度',
        longitude: '经度',
        selectLocation: '请先在地图上选择目的地。',
        selectRocket: '请先选择航天器。',
        invalidQuantity: '请输入 1 至 10 之间的数量。',
        sceneError: '无法启动 3D 场景，请检查浏览器是否支持 WebGL。'
    }
};

window.SpaceY = {
    getMessages: () => translations[currentLanguage] || translations.en
};

function setLanguage(language) {
    currentLanguage = translations[language] ? language : 'en';
    const messages = translations[currentLanguage];
    document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : currentLanguage;

    document.querySelectorAll('[data-i18n]').forEach(element => {
        const value = messages[element.dataset.i18n];
        if (value !== undefined) element.textContent = value;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(element => {
        const value = messages[element.dataset.i18nHtml];
        if (value !== undefined) element.innerHTML = value;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(element => {
        const value = messages[element.dataset.i18nAria];
        if (value !== undefined) element.setAttribute('aria-label', value);
    });
    document.querySelectorAll('[data-language]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.language === currentLanguage));
    });

    document.querySelectorAll('.rocket-description').forEach(description => {
        const id = Number(description.dataset.descriptionId);
        const key = id <= 20 ? 'rocketTypeLaunch'
            : id <= 23 ? 'rocketTypePlatform'
                : id === 35 ? 'rocketTypeLander'
                    : 'rocketTypeResearch';
        if (messages[key]) description.textContent = messages[key];
    });

    document.querySelectorAll('[data-select-rocket]').forEach(button => {
        if (messages.selectVehicle) {
            button.setAttribute('aria-label', `${messages.selectVehicle}: ${button.dataset.rocketName}`);
        }
    });

    const map = document.getElementById('worldMap');
    if (map && messages.mapAria) map.setAttribute('aria-label', messages.mapAria);

    document.dispatchEvent(new CustomEvent('spacey:language-change', { detail: messages }));
}

document.addEventListener('DOMContentLoaded', () => {
    const languageMenu = document.querySelector('.language-menu');
    const languageMenuTrigger = languageMenu?.querySelector('.language-menu-trigger');

    languageMenuTrigger?.addEventListener('click', () => {
        const isOpen = languageMenu.classList.toggle('is-open');
        languageMenuTrigger.setAttribute('aria-expanded', String(isOpen));
    });

    languageMenu?.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            languageMenu.classList.remove('is-open');
            languageMenuTrigger?.setAttribute('aria-expanded', 'false');
            languageMenuTrigger?.focus();
        }
    });

    document.querySelectorAll('[data-language]').forEach(button => {
        button.addEventListener('click', () => {
            setLanguage(button.dataset.language);
            languageMenu?.classList.remove('is-open');
            languageMenuTrigger?.setAttribute('aria-expanded', 'false');
        });
    });

    // Apply default language only if mission/order page has i18n nodes
    if (document.querySelector('[data-i18n], .rocket-description, #worldMap')) {
        setLanguage('en');
    }
});
