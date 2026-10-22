# 🚀 Deployment Guide - CosmicDelivery

## Варианты деплоя

### 1. GitHub Pages (бесплатно, статический сайт)

#### Шаг 1: Генерация статики
```bash
python freeze.py
```

#### Шаг 2: Загрузка на GitHub
```bash
# Создайте репозиторий на GitHub
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/ваш-username/freerockets.git
git push -u origin main
```

#### Шаг 3: Включение GitHub Pages
1. Зайдите в Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` / `root` (или создайте ветку `gh-pages`)
4. Save

Сайт будет доступен по адресу:
`https://ваш-username.github.io/freerockets/`

---

### 2. Netlify (бесплатно, автоматический деплой)

#### Вариант A: Через Git
1. Зарегистрируйтесь на [Netlify](https://netlify.com)
2. Нажмите "New site from Git"
3. Выберите GitHub репозиторий
4. Build command: `python freeze.py`
5. Publish directory: `build`
6. Deploy site

#### Вариант B: Drag & Drop
1. Выполните `python freeze.py`
2. Перетащите папку `build/` на [Netlify Drop](https://app.netlify.com/drop)

---

### 3. Vercel (бесплатно, для Flask)

#### Шаг 1: Установка Vercel CLI
```bash
npm i -g vercel
```

#### Шаг 2: Деплой
```bash
vercel
```

Следуйте инструкциям в терминале.

---

### 4. Heroku (бесплатно, для Flask)

#### Шаг 1: Создание файлов

**Procfile:**
```
web: gunicorn app:app
```

**runtime.txt:**
```
python-3.11.0
```

#### Шаг 2: Установка Heroku CLI
```bash
# macOS
brew tap heroku/brew && brew install heroku

# Windows
# Скачайте с https://devcenter.heroku.com/articles/heroku-cli
```

#### Шаг 3: Деплой
```bash
heroku login
heroku create cosmic-delivery
git push heroku main
heroku open
```

---

### 5. Render (бесплатно, для Flask)

1. Зарегистрируйтесь на [Render](https://render.com)
2. New → Web Service
3. Connect GitHub repository
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `gunicorn app:app`
6. Create Web Service

---

### 6. Railway (бесплатно, для Flask)

1. Зарегистрируйтесь на [Railway](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Settings → Variables → Add `PORT=5000`
4. Deploy

---

## Сравнение платформ

| Платформа | Тип | Бесплатно | Сложность | Скорость |
|-----------|-----|-----------|-----------|----------|
| GitHub Pages | Static | ✅ | 🟢 Легко | ⚡ Быстро |
| Netlify | Static | ✅ | 🟢 Легко | ⚡ Быстро |
| Vercel | Static/Server | ✅ | 🟡 Средне | ⚡ Быстро |
| Heroku | Server | ❌ (платно) | 🟡 Средне | 🐢 Медленно |
| Render | Server | ✅ | 🟡 Средне | ⚡ Быстро |
| Railway | Server | ✅ | 🟢 Легко | ⚡ Быстро |

---

## Рекомендации

### Для портфолио:
- **GitHub Pages** - бесплатно, быстро, показывает Git навыки
- **Netlify** - автоматический деплой при каждом push

### Для продакшена:
- **Render** - бесплатный тариф, хорошая производительность
- **Railway** - простой деплой, хорошая документация

### Для демонстрации:
- **Vercel** - быстрая загрузка, хорошая аналитика

---

## Оптимизация перед деплоем

### 1. Проверьте .gitignore
Убедитесь, что тяжелые файлы не попадают в Git:
```bash
git status
```

### 2. Минифицируйте CSS/JS (опционально)
```bash
# Для CSS
pip install cssmin
cssmin < static/css/style.css > static/css/style.min.css

# Для JS
npm install -g terser
terser static/js/main.js -o static/js/main.min.js
```

### 3. Оптимизируйте изображения
- Используйте WebP формат
- Сжимайте через [TinyPNG](https://tinypng.com)
- Или используйте внешние URL (Unsplash, Pexels)

### 4. Добавьте мета-теги
В `templates/index.html`:
```html
<meta name="description" content="CosmicDelivery - Limited Edition Rockets">
<meta name="keywords" content="rockets, space, 3D animation">
<meta property="og:title" content="CosmicDelivery">
<meta property="og:description" content="Order your personal rocket">
<meta property="og:image" content="URL_к_картинке">
```

---

## Troubleshooting

### Проблема: "Module not found"
```bash
pip install -r requirements.txt
```

### Проблема: "Port 5000 already in use"
```bash
# Измените порт в app.py
app.run(port=5001)
```

### Проблема: "Frozen-Flask not working"
```bash
# Убедитесь, что все маршруты работают
python app.py
# Затем
python freeze.py
```

### Проблема: "3D анимация не загружается"
- Проверьте интернет-соединение (Three.js через CDN)
- Откройте консоль браузера (F12) и проверьте ошибки
- Убедитесь, что текстура Земли доступна

---

## Полезные ссылки

- [Flask Documentation](https://flask.palletsprojects.com/)
- [Frozen-Flask Documentation](https://pythonhosted.org/Frozen-Flask/)
- [Three.js Documentation](https://threejs.org/docs/)
- [GitHub Pages](https://pages.github.com/)
- [Netlify Documentation](https://docs.netlify.com/)
- [Vercel Documentation](https://vercel.com/docs)

---

**Удачи с деплоем! 🚀**
