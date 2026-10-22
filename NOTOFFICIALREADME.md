# 🚀 SpaceY Rockets

**Шуточный веб-сайт для "покупки" космических ракет**

Пародийный сайт от **Elan Mask** (не путать с реальными людьми!). Выберите одну из 40 моделей ракет и получите её бесплатно. Доставка прямо в ваше воображение!

![SpaceY Rockets](https://img.shields.io/badge/Flask-3.0-black?style=for-the-badge&logo=flask)
![Python](https://img.shields.io/badge/Python-3.8+-blue?style=for-the-badge&logo=python)
![Three.js](https://img.shields.io/badge/Three.js-r128-green?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

## ✨ Особенности

- 🎨 **40 пародийных ракет** с абсурдными описаниями
- 🌍 **Интерактивная карта мира** для выбора точки доставки
- 🚀 **3D анимация** полёта ракеты к выбранной точке (Three.js)
- 🎬 **Кинематографические эффекты** (LIVE TRACKING, статусы миссии)
- 📱 **Адаптивный дизайн** (работает на мобильных)
- ⚡ **Оптимизация для слабых CPU** (автоматическое определение устройства)
- 💰 **Все ракеты бесплатны** ($0.00 или Free)
- 🎭 **Шуточный характер** (дисклеймер в футере)

## 🛠️ Технологии

### Backend
- **Python 3.8+** - язык программирования
- **Flask 3.0** - веб-фреймворк
- **Frozen-Flask** - генератор статического сайта

### Frontend
- **HTML5** - семантическая разметка
- **CSS3** - стили (без фреймворков, всё вручную)
- **Vanilla JavaScript** - без фреймворков
- **Three.js r128** - 3D графика (через CDN)
- **Google Fonts** - шрифт Inter (через CDN)

## 📁 Структура проекта

```
space-y-rockets/
│
├── app.py                      # Flask приложение (главный файл)
├── freeze.py                   # Генератор статического сайта
├── requirements.txt            # Python зависимости
├── .gitignore                  # Git игнорирование
├── README.md                   # Этот файл
│
├── templates/                  # HTML шаблоны (Jinja2)
│   └── index.html              # Главная страница
│
└── static/                     # Статические файлы
    ├── rockets.json            # База данных 40 ракет
    ├── css/
    │   └── style.css           # Все стили (вручную)
    ├── js/
    │   ├── main.js             # Основная логика
    │   └── rocket-animation.js # 3D анимация (Three.js)
    └── images/                 # Изображения
        └── earth.jpg           # Текстура Земли для 3D
```

## 🚀 Быстрый старт

### 1. Клонирование репозитория

```bash
git clone https://github.com/[ваш-username]/space-y-rockets.git
cd space-y-rockets
```

### 2. Создание виртуального окружения

```bash
# Linux/macOS
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

### 3. Установка зависимостей

```bash
pip install -r requirements.txt
```

### 4. Добавление текстуры Земли

Скачайте текстуру Земли и сохраните как `static/images/earth.jpg`:

**Вариант 1: NASA Blue Marble (рекомендуется)**
```bash
# Скачайте с NASA и сохраните как static/images/earth.jpg
# https://visibleearth.nasa.gov/images/57752/blue-marble-land-surface-shallow-water-and-shaded-topography
```

**Вариант 2: Three.js examples**
```bash
# Прямая ссылка на текстуру
wget -O static/images/earth.jpg "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg"
```

### 5. Запуск сервера

```bash
python app.py
```

Откройте http://localhost:5000 в браузере.

### 6. (Опционально) Генерация статического сайта

```bash
python freeze.py
```

Статический сайт будет создан в папке `dist/`.

## 🎬 Как работает анимация

1. **Выбор ракеты** → Пользователь выбирает одну из 40 моделей
2. **Карта мира** → Интерактивная карта для выбора точки доставки
3. **3D сцена** → Полноэкранный глобус с текстурой Земли (Three.js)
4. **Полёт ракеты** → По дуге Безье от орбиты к точке
5. **Кинематографика**:
   - Зелёный мигающий "LIVE TRACKING"
   - Статусы: "ROCKET DEPLOYED" → "IN TRANSIT" → "APPROACHING TARGET" → "DELIVERED!"
   - Координаты цели
6. **Финал** → Модальное окно с шуткой и рейтингом

## ⚡ Оптимизация для слабых CPU

Проект автоматически адаптируется под производительность устройства:

| Параметр | Low (слабый) | Medium (средний) | High (мощный) |
|----------|--------------|------------------|---------------|
| CPU cores | ≤ 2 | 3-4 | 5+ |
| RAM | ≤ 2 GB | 3-4 GB | 5+ GB |
| Pixel ratio | 0.5x | 0.75x | Native |
| Sphere segments | 16 | 24 | 32 |
| FPS | 30 | 60 | 60 |
| Antialiasing | ❌ | ✅ | ✅ |
| Animation duration | 3s | 5s | 5s |

## 📊 Размер проекта

| Компонент | Размер | В репозитории? |
|-----------|--------|----------------|
| Python код | ~5 KB | ✅ Да |
| HTML шаблон | ~10 KB | ✅ Да |
| CSS стили | ~15 KB | ✅ Да |
| JavaScript | ~20 KB | ✅ Да |
| rockets.json | ~10 KB | ✅ Да |
| **Итого код** | **~60 KB** | ✅ Да |
| Текстура Земли | ~2 MB | ✅ Да |

**Репозиторий: ~2 MB** (очень лёгкий!)

## 🎯 Особенности для портфолио

### Что демонстрирует этот проект:

1. **Fullstack разработка** - Flask + HTML/CSS/JS
2. **3D графика** - Three.js, работа с 3D объектами
3. **Оптимизация** - адаптация под разные устройства
4. **Чистый код** - читаемый, с комментариями
5. **Git** - правильный .gitignore
6. **CDN** - использование внешних ресурсов
7. **REST API** - endpoints для данных
8. **Responsive design** - адаптивность
9. **Performance** - оптимизация для слабых CPU
10. **UX/UI** - интерактивность, анимации

### Ключевые навыки:

- ✅ Python/Flask
- ✅ HTML5/CSS3
- ✅ Vanilla JavaScript
- ✅ Three.js (3D graphics)
- ✅ Canvas API
- ✅ REST API
- ✅ Git/GitHub
- ✅ Performance optimization
- ✅ Responsive design

## ⚠️ Дисклеймер

**Это пародийный проект, созданный исключительно в развлекательных целях.**

- ❌ Не связан с реальной космической компанией
- ❌ Никакие ракеты реально не продаются
- ❌ Никакие ракеты реально не доставляются
- ❌ 3D анимация - это просто визуальный эффект
- ✅ Это шутка, мемы, пародия

## 📝 Лицензия

MIT License - делайте что хотите, но помните: это просто шутка.

## 🤝 Вклад

Хотите улучшить код? Создайте Pull Request!

---

**Сделано с ❤️ и метановым топливом**

*P.S. Если вы дочитали до сюда - вы крутой! 🚀*
