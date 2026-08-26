import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        page = await browser.new_page()
        
        print("Navigating...")
        await page.goto("http://localhost:5500/frontend/idealab.html", timeout=60000)
        
        print("Waiting for network idle...")
        await page.wait_for_load_state('networkidle')
        
        print("Typing message...")
        await page.fill('#stepInput', 'I want to build a Python weather app')
        
        print("Clicking nextBtn...")
        await page.click('#nextBtn')
        
        print("Waiting for 15 seconds to see what happens...")
        await page.wait_for_timeout(15000)
        
        print("Evaluating page state...")
        # Get AI Chat Feed text
        chat_text = await page.evaluate("document.getElementById('aiChatFeed').innerText")
        print("--- Chat Feed ---")
        print(chat_text)
        
        btn_text = await page.evaluate("document.getElementById('nextBtn').innerText")
        print(f"--- Button Text: {btn_text} ---")
        
        # Get console logs (since we missed them, let's inject a console listener)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
