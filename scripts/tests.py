import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

# Настройки проекта
TARGET_URL = "https://spacex.com"
OUTPUT_DIR = "/workspaces/space-y-rockets/static"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

def create_folders():
    """Создает базовую структуру папок проекта"""
    folders = ["css", "images", "js"]
    for folder in folders:
        os.makedirs(os.path.join(OUTPUT_DIR, folder), exist_ok=True)
    print("[+] Структура папок успешно создана.")

def download_css(soup):
    """Находит, скачивает и сохраняет CSS файлы, очищая пути"""
    for link in soup.find_all("link", rel="stylesheet"):
        css_url = link.get("href")
        if not css_url:
            continue
        
        # Превращаем относительную ссылку в абсолютную
        absolute_css_url = urljoin(TARGET_URL, css_url)
        css_filename = os.path.basename(urlparse(absolute_css_url).path) or "style.css"
        local_css_path = os.path.join(OUTPUT_DIR, "css", css_filename)
        
        try:
            print(f"[*] Скачивание стилей: {absolute_css_url}")
            res = requests.get(absolute_css_url, headers=HEADERS, timeout=10)
            if res.status_code == 200:
                with open(local_css_path, "w", encoding="utf-8") as f:
                    f.write(res.text)
                # Перенаправляем тег в HTML на локальный файл
                link["href"] = f"css/{css_filename}"
        except Exception as e:
            print(f"[-] Не удалось скачать CSS {absolute_css_url}: {e}")

def clean_media_and_assets(soup):
    """Удаляет оригинальные картинки, видео и скрипты аналитики"""
    # 1. Заменяем пути картинок на пустые заглушки для ваших будущих файлов
    for img in soup.find_all("img"):
        img["src"] = "images/placeholder.jpg"
        if img.get("srcset"):
            del img["srcset"]
            
    # 2. Очищаем фоновые видео
    for video in soup.find_all(["video", "source"]):
        if video.get("src"):
            video["src"] = ""
            
    # 3. Удаляем оригинальные JS-скрипты трекеров, рекламы и аналитики SpaceX
    for script in soup.find_all("script"):
        if script.get("src"):
            script.decompose()

def main():
    create_folders()
    
    print(f"[*] Запрос к сайту: {TARGET_URL}")
    try:
        response = requests.get(TARGET_URL, headers=HEADERS, timeout=15)
        response.raise_for_status()
    except Exception as e:
        print(f"[-] Критическая ошибка при запросе к сайту: {e}")
        return

    soup = BeautifulSoup(response.text, "html.parser")
    
    # Скачиваем стили и вычищаем медиа-элементы
    download_css(soup)
    clean_media_and_assets(soup)
    
    # Сохраняем итоговый скелет HTML
    index_path = os.path.join(OUTPUT_DIR, "index.html")
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(soup.prettify())
        
    print(f"[+] Успех! Очищенный каркас тегов и CSS сохранен в: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
