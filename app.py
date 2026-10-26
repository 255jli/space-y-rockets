"""
SpaceY Rockets - Шуточный веб-сайт
====================================

Пародийный сайт для "покупки" космических ракет.
Владелец: Elan Mask (не путать с реальными людьми!)

Стек:
- Backend: Python 3.8+, Flask
- Frontend: HTML5, CSS3, Vanilla JavaScript
- 3D: Three.js (через CDN)

Запуск:
    python app.py

Генерация статики:
    python freeze.py
"""

from flask import Flask, render_template, jsonify
import json
import os

# =============================================================================
# ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
# =============================================================================

app = Flask(__name__)

# Конфигурация для Frozen-Flask (генерация статического сайта)
app.config['FREEZER_DESTINATION'] = 'dist'
app.config['FREEZER_STATIC_IGNORE'] = ['*.db', '*.sqlite']


# =============================================================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# =============================================================================

def load_rockets():
    """
    Загружает данные о ракетах из JSON файла.

    Returns:
        list: Список ракет из static/rockets.json
    """
    try:
        json_path = os.path.join(app.static_folder, 'rockets.json')
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('rockets', [])
    except FileNotFoundError:
        print("⚠️  rockets.json не найден!")
        return []
    except json.JSONDecodeError:
        print("⚠️  Ошибка чтения rockets.json!")
        return []


# =============================================================================
# МАРШРУТЫ (ROUTES)
# =============================================================================

@app.route('/')
def index():
    """
    Главный лендинг (SpaceX-style).
    """
    return render_template('index.html')


@app.route('/mission')
def mission():
    """
    Страница выбора ракеты и запуска симуляции.
    """
    rockets = load_rockets()
    return render_template(
        'mission.html',
        rockets=rockets,
        rockets_count=len(rockets)
    )


@app.route('/api/rockets')
def api_rockets():
    """
    REST API endpoint - возвращает список ракет в формате JSON.
    """
    rockets = load_rockets()
    return jsonify({
        'success': True,
        'count': len(rockets),
        'rockets': rockets
    })


@app.route('/api/rocket/<int:rocket_id>')
def api_rocket(rocket_id):
    """
    REST API endpoint - возвращает данные конкретной ракеты.
    """
    rockets = load_rockets()
    for rocket in rockets:
        if rocket['id'] == rocket_id:
            return jsonify({
                'success': True,
                'rocket': rocket
            })
    return jsonify({
        'success': False,
        'error': 'Rocket not found'
    }), 404


# =============================================================================
# ОБРАБОТЧИКИ ОШИБОК
# =============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Not Found',
        'message': 'Эта ракета улетела в другую галактику'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal Server Error',
        'message': 'Хьюстон, у нас проблема!'
    }), 500


# =============================================================================
# ЗАПУСК СЕРВЕРА
# =============================================================================

if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("🚀 SpaceY Rockets - Limited Edition")
    print("   by Elan Mask")
    print("=" * 60)
    print("\n📡 Server starting...")
    print("🌐 Open in browser: http://localhost:8000")
    print("\n📦 To generate static site:")
    print("   python freeze.py")
    print("=" * 60 + "\n")

    app.run(
        debug=True,
        host='0.0.0.0',
        port=8000
    )
