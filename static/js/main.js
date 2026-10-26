let currentLanguage = 'en';

const translations = {
    en: {
        navRockets: 'Vehicles', navNews: 'Missions', navAbout: 'About',
        heroEyebrow: 'ORBITAL SYSTEMS / 2026', heroTitle: 'Beyond.<br>Precisely.<br><span>On time.</span>',
        heroSubtitle: 'Explore the fleet, set your destination, and follow the flight.',
        browseFleet: 'Explore the fleet', heroStep1: '01 / SELECT VEHICLE',
        heroStep2: '02 / SET DESTINATION', heroStep3: '03 / FLIGHT SIMULATION',
        earthCaption: 'EARTH / ORBITAL VIEW', newsEyebrow: 'FROM THE MISSION ARCHIVE',
        newsTitle: 'Missions & milestones',
        newsIntro: 'Milestones in reusable launch systems and orbital infrastructure.',
        newsCategory1: 'REUSABLE SYSTEMS', july2016: 'JULY 2016',
        newsTitle1: 'CRS-9: proving booster recovery',
        newsText1: 'After its orbital mission, the first stage returned to a drone ship, demonstrating the promise of reuse.',
        newsCategory2: 'ORBITAL CONNECTIVITY', jan2017: 'JANUARY 2017',
        newsTitle2: 'Iridium NEXT: a new constellation',
        newsText2: 'The first deployment began a major upgrade to the global mobile communications network.',
        newsCategory3: 'CREWED SYSTEMS', nov2015: 'NOVEMBER 2015',
        newsTitle3: 'DragonFly: landing system test',
        newsText3: 'A ground firing test validated the propulsion system designed for a controlled landing.',
        catalogEyebrow: '01 / FLEET', catalogTitle: 'Choose a vehicle',
        availableVehicles: 'Available for simulation:', selectVehicle: 'Select vehicle',
        missionEyebrow: '02 / MISSION SETTINGS', missionTitle: 'Set your destination',
        selectedVehicle: 'Selected vehicle:', noVehicle: 'Nothing selected yet', quantityLabel: 'Number of vehicles',
        quantityHint: 'Choose between 1 and 10.', quantityDecrease: 'Decrease quantity', quantityIncrease: 'Increase quantity',
        destinationLabel: 'Landing coordinates',
        mapHint: 'Select a point on the map. The same coordinates orient the 3D planet.',
        coordinatesLabel: 'TARGET COORDINATES', noLocation: 'No destination selected',
        mapAria: 'World map. Select a destination.', launchSimulation: 'Start simulation',
        missionComplete: 'SPACEY / MISSION COMPLETE',
        endQuestion: 'Return to the home page?',
        returnHome: 'Return to home',
        noticeEyebrow: 'MESSAGE RECEIVED', noticeText: 'Your next flight is waiting.',
        photoCredit: 'Photo: CC0 / Wikimedia Commons ↗',
        sceneAria: 'Cinematic flight simulation', galleryAria: 'Mission gallery',
        altCrs9: 'SpaceX CRS-9 launch', altIridium: 'Night launch of the Iridium satellite constellation',
        altDragon: 'Dragon spacecraft hover test', altOrbcomm: 'ORBCOMM-2 launch',
        altJcsat: 'JCSAT-16 night launch', altAbort: 'Dragon pad abort test',
        altVolcano: 'Sarychev volcano eruption from orbit',
        footerText: 'SpaceY is a fictional project for an interactive space delivery simulation.<br>No vehicle has left Earth. Not even in our imagination.',
        footerCopyright: '© 2026 SpaceY / All missions are simulated.',
        rocketTypeLaunch: 'Launch vehicle for payload deployment and orbital transport missions.',
        rocketTypePlatform: 'Orbital platform for communications and navigation.',
        rocketTypeLander: 'Landing module designed for precise planetary surface operations.',
        rocketTypeResearch: 'Space platform for research and orbital missions.',
        latitude: 'LAT', longitude: 'LON',
        selectLocation: 'Please select a destination on the map.',
        selectRocket: 'Please select a vehicle first.',
        invalidQuantity: 'Choose a quantity between 1 and 10.',
        sceneError: 'The 3D scene could not start. Please check WebGL support in your browser.'
    },
    ru: {
        navRockets: 'Аппараты', navNews: 'Миссии', navAbout: 'О проекте',
        heroEyebrow: 'ОРБИТАЛЬНЫЕ СИСТЕМЫ / 2026', heroTitle: 'Дальше.<br>Точнее.<br><span>Вовремя.</span>',
        heroSubtitle: 'Изучите аппараты, задайте место доставки и проследите за полётом.',
        browseFleet: 'Открыть каталог', heroStep1: '01 / ВЫБОР АППАРАТА',
        heroStep2: '02 / МЕСТО ДОСТАВКИ', heroStep3: '03 / СИМУЛЯЦИЯ ПОЛЁТА',
        earthCaption: 'ЗЕМЛЯ / ВИД С ОРБИТЫ', newsEyebrow: 'ИЗ АРХИВА МИССИЙ',
        newsTitle: 'Миссии и достижения',
        newsIntro: 'Ключевые этапы развития многоразовых систем и орбитальной инфраструктуры.',
        newsCategory1: 'МНОГОРАЗОВЫЕ СИСТЕМЫ', july2016: 'ИЮЛЬ 2016',
        newsTitle1: 'CRS-9: проверка возврата ступени',
        newsText1: 'После орбитальной миссии первая ступень вернулась на морскую платформу, подтвердив потенциал повторного использования.',
        newsCategory2: 'ОРБИТАЛЬНАЯ СВЯЗЬ', jan2017: 'ЯНВАРЬ 2017',
        newsTitle2: 'Iridium NEXT: новая группировка',
        newsText2: 'Запуск первой партии спутников начал масштабное обновление глобальной сети мобильной связи.',
        newsCategory3: 'ПИЛОТИРУЕМЫЕ СИСТЕМЫ', nov2015: 'НОЯБРЬ 2015',
        newsTitle3: 'DragonFly: испытание системы посадки',
        newsText3: 'Огневые испытания подтвердили работу двигательной системы для управляемого спуска аппарата.',
        catalogEyebrow: '01 / КАТАЛОГ', catalogTitle: 'Выберите аппарат',
        availableVehicles: 'Доступно для симуляции:', selectVehicle: 'Выбрать аппарат',
        missionEyebrow: '02 / ПАРАМЕТРЫ МИССИИ', missionTitle: 'Укажите место доставки',
        selectedVehicle: 'Выбранный аппарат:', noVehicle: 'Пока ничего не выбрано', quantityLabel: 'Количество аппаратов',
        quantityHint: 'Выберите от 1 до 10 аппаратов.', quantityDecrease: 'Уменьшить количество', quantityIncrease: 'Увеличить количество',
        destinationLabel: 'Координаты доставки',
        mapHint: 'Выберите точку на карте. Те же координаты зададут положение планеты в 3D-сцене.',
        coordinatesLabel: 'КООРДИНАТЫ ЦЕЛИ', noLocation: 'Место доставки не выбрано',
        mapAria: 'Карта мира. Выберите место доставки.', launchSimulation: 'Начать симуляцию',
        missionComplete: 'SPACEY / МИССИЯ ЗАВЕРШЕНА',
        endQuestion: 'Вернуться на главную?',
        returnHome: 'Вернуться на главную',
        noticeEyebrow: 'СООБЩЕНИЕ ПОЛУЧЕНО', noticeText: 'Следующий полёт уже ждёт.',
        photoCredit: 'Фото: CC0 / Wikimedia Commons ↗',
        sceneAria: 'Кинематографическая симуляция полёта', galleryAria: 'Галерея миссий',
        altCrs9: 'Запуск SpaceX CRS-9', altIridium: 'Ночной запуск спутников Iridium',
        altDragon: 'Испытание корабля Dragon', altOrbcomm: 'Запуск ORBCOMM-2',
        altJcsat: 'Ночной запуск JCSAT-16', altAbort: 'Испытание аварийного спасения Dragon',
        altVolcano: 'Извержение вулкана Сарычева, вид с орбиты',
        footerText: 'SpaceY — вымышленный проект для интерактивной симуляции космической доставки.<br>Ни один аппарат не покинул Землю. Даже мысленно.',
        footerCopyright: '© 2026 SpaceY / Все миссии существуют только в симуляции.',
        rocketTypeLaunch: 'Ракетная система для вывода полезной нагрузки и транспортных миссий.',
        rocketTypePlatform: 'Орбитальная платформа для связи и навигации.',
        rocketTypeLander: 'Посадочный модуль для точной работы у поверхности планеты.',
        rocketTypeResearch: 'Космическая платформа для исследовательских и орбитальных миссий.',
        latitude: 'ШИРОТА', longitude: 'ДОЛГОТА',
        selectLocation: 'Сначала выберите место доставки на карте.',
        selectRocket: 'Сначала выберите аппарат.',
        invalidQuantity: 'Укажите количество от 1 до 10.',
        sceneError: 'Не удалось запустить 3D-сцену. Проверьте поддержку WebGL в браузере.'
    },
    zh: {
        navRockets: '航天器', navNews: '任务', navAbout: '关于',
        heroEyebrow: '轨道系统 / 2026', heroTitle: '更远。<br>更准。<br><span>准时。</span>',
        heroSubtitle: '浏览航天器、设置目的地，并追踪飞行过程。',
        browseFleet: '浏览航天器', heroStep1: '01 / 选择航天器',
        heroStep2: '02 / 设置目的地', heroStep3: '03 / 飞行模拟',
        earthCaption: '地球 / 轨道视角', newsEyebrow: '任务档案',
        newsTitle: '任务与里程碑',
        newsIntro: '可重复使用运载系统与轨道基础设施的发展历程。',
        newsCategory1: '可重复使用系统', july2016: '2016年7月',
        newsTitle1: 'CRS-9：验证助推器回收',
        newsText1: '完成轨道任务后，一级助推器返回海上平台，展示了重复使用的潜力。',
        newsCategory2: '轨道通信', jan2017: '2017年1月',
        newsTitle2: 'Iridium NEXT：新一代卫星网络',
        newsText2: '首批卫星部署启动了全球移动通信网络的重大升级。',
        newsCategory3: '载人航天系统', nov2015: '2015年11月',
        newsTitle3: 'DragonFly：着陆系统测试',
        newsText3: '地面点火测试验证了飞行器受控下降所需的推进系统。',
        catalogEyebrow: '01 / 航天器', catalogTitle: '选择航天器',
        availableVehicles: '可供模拟的配置：', selectVehicle: '选择航天器',
        missionEyebrow: '02 / 任务设置', missionTitle: '设置目的地',
        selectedVehicle: '已选航天器：', noVehicle: '尚未选择航天器', quantityLabel: '航天器数量',
        quantityHint: '请选择 1 至 10 个。', quantityDecrease: '减少数量', quantityIncrease: '增加数量',
        destinationLabel: '投送坐标',
        mapHint: '在地图上选择位置；相同坐标将用于 3D 地球定位。',
        coordinatesLabel: '目标坐标', noLocation: '尚未选择目的地',
        mapAria: '世界地图。选择目的地。', launchSimulation: '开始模拟',
        missionComplete: 'SPACEY / 任务完成',
        endQuestion: '返回首页？',
        returnHome: '返回首页',
        noticeEyebrow: '消息已收到', noticeText: '下一次飞行已准备就绪。',
        photoCredit: '图片：CC0 / Wikimedia Commons ↗',
        sceneAria: '电影感飞行模拟', galleryAria: '任务图片库',
        altCrs9: 'SpaceX CRS-9 发射', altIridium: '铱星卫星网络夜间发射',
        altDragon: '龙飞船悬停测试', altOrbcomm: 'ORBCOMM-2 发射',
        altJcsat: 'JCSAT-16 夜间发射', altAbort: '龙飞船发射台中止测试',
        altVolcano: '从轨道拍摄的萨雷切夫火山喷发',
        footerText: 'SpaceY 是一个用于展示互动太空投送模拟的虚构项目。<br>没有航天器离开地球，想象中也没有。',
        footerCopyright: '© 2026 SpaceY / 所有任务均为模拟。',
        rocketTypeLaunch: '用于有效载荷部署和轨道运输任务的运载火箭。',
        rocketTypePlatform: '用于通信和导航任务的轨道平台。',
        rocketTypeLander: '用于精准行星表面作业的着陆模块。',
        rocketTypeResearch: '用于科研和轨道任务的航天平台。',
        latitude: '纬度', longitude: '经度',
        selectLocation: '请先在地图上选择目的地。',
        selectRocket: '请先选择航天器。',
        invalidQuantity: '请输入 1 至 10 之间的数量。',
        sceneError: '无法启动 3D 场景，请检查浏览器是否支持 WebGL。'
    }
};

window.SpaceY = {
    getMessages: () => translations[currentLanguage]
};

function setLanguage(language) {
    currentLanguage = translations[language] ? language : 'en';
    const messages = translations[currentLanguage];
    document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : currentLanguage;
    document.title = {
        en: 'SpaceY — Orbital Systems',
        ru: 'SpaceY — орбитальные системы',
        zh: 'SpaceY — 轨道系统'
    }[currentLanguage];

    document.querySelectorAll('[data-i18n]').forEach(element => {
        const value = messages[element.dataset.i18n];
        if (value !== undefined) element.textContent = value;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(element => {
        const value = messages[element.dataset.i18nHtml];
        if (value !== undefined) element.innerHTML = value;
    });
    document.querySelectorAll('[data-i18n-alt]').forEach(element => {
        const value = messages[element.dataset.i18nAlt];
        if (value !== undefined) element.alt = value;
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
        description.textContent = messages[key];
    });
    document.querySelectorAll('[data-select-rocket]').forEach(button => {
        button.setAttribute('aria-label', `${messages.selectVehicle}: ${button.dataset.rocketName}`);
    });

    const map = document.getElementById('worldMap');
    if (map) map.setAttribute('aria-label', messages.mapAria);
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
    setLanguage('en');
});
