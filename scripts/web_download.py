import json
import asyncio
from playwright.async_api import async_playwright

async def get_spacex_layout():
    async with async_playwright() as p:
        # Запускаем фоновый браузер
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Задаем стандартное разрешение экрана (можно поменять под себя)
        await page.set_viewport_size({"width": 1920, "height": 1080})
        
        print("Открываем сайт SpaceX...")
        await page.goto("https://www.spacex.com", wait_until="networkidle")
        
        # Скрипт внутри браузера, который соберет координаты элементов
        layout_data = await page.evaluate('''() => {
            const tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'span'];
            const elements = document.querySelectorAll(tags.join(','));
            const data = [];
            
            elements.forEach((el, index) => {
                const rect = el.getBoundingClientRect();
                const text = el.innerText ? el.innerText.trim() : "";
                
                // Фильтруем только видимый текст
                if (text && rect.width > 0 && rect.height > 0) {
                    const style = window.getComputedStyle(el);
                    data.push({
                        id: index,
                        tag: el.tagName.toLowerCase(),
                        text_preview: text.substring(0, 40), // кусочек текста для понимания
                        width_px: Math.round(rect.width),
                        height_px: Math.round(rect.height),
                        top_px: Math.round(rect.top + window.scrollY),
                        left_px: Math.round(rect.left + window.scrollX),
                        font_size: style.fontSize,
                        line_height: style.lineHeight,
                        margin: style.margin,
                        padding: style.padding
                    });
                }
            });
            return data;
        }''')
        
        # Сохраняем результат в файл
        with open("spacex_layout.json", "w", encoding="utf-8") as f:
            json.dump(layout_data, f, indent=4, ensure_ascii=False)
            
        print(f"Готово! Данные о {len(layout_data)} текстовых блоках сохранены в файл 'spacex_layout.json'")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(get_spacex_layout())
