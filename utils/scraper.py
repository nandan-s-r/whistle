import httpx
from bs4 import BeautifulSoup
from config.settings import SERPER_API_KEY

def scrape_website(url):
    """Scrapes a website's main text for AI ingestion."""
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        response = httpx.get(url, headers=headers, timeout=10.0)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.extract()
            
        text = soup.get_text(separator=' ')
        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        return text[:10000] # Limit to 10k chars to save context
    except Exception as e:
        return f"Error scraping {url}: {e}"

def search_news(query):
    """Uses Serper API if available, else fallback."""
    if not SERPER_API_KEY:
        return [{"title": "API Key Missing", "snippet": "Configure SERPER_API_KEY in .env to use real news search."}]
        
    try:
        url = "https://google.serper.dev/news"
        payload = {"q": query, "gl": "in"} # Default to India for this ecosystem
        headers = {
            'X-API-KEY': SERPER_API_KEY,
            'Content-Type': 'application/json'
        }
        response = httpx.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        
        results = []
        if 'news' in data:
            for item in data['news'][:5]:
                results.append({
                    "title": item.get('title'),
                    "snippet": item.get('snippet'),
                    "link": item.get('link'),
                    "date": item.get('date')
                })
        return results
    except Exception as e:
        return [{"title": "Search Error", "snippet": str(e)}]
