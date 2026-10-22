"""
Freeze Script - Генерация статического сайта
=============================================

Конвертирует Flask-приложение в статические HTML/CSS/JS файлы.
Результат сохраняется в папку 'dist/'.

Использование:
    python freeze.py

Деплой:
    - GitHub Pages
    - Netlify
    - Vercel
    - Любой статический хостинг
"""

from flask_frozen import Freezer
from app import app

# Инициализация генератора статики
freezer = Freezer(app)

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🧊 Freezing SpaceY Rockets...")
    print("="*60)
    print("\n📦 Generating static site in 'dist/' folder...")
    
    # Генерация статических файлов
    freezer.freeze()
    
    print("\n✅ Done!")
    print("\n📁 Static site created in 'dist/' folder")
    print("🌐 You can deploy this folder to any static hosting")
    print("="*60 + "\n")
