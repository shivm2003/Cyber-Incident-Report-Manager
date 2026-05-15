import requests
try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None
import re

def fetch_article_content(url: str) -> str:
    """
    Fetches the HTML content of a URL and extracts the main text body.
    Returns the extracted text, or a fallback message if it fails.
    """
    if not url or not url.startswith('http'):
        return ""
        
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }
    
    try:
        # Use a session for better persistence
        session = requests.Session()
        response = session.get(url, headers=headers, timeout=15, allow_redirects=True)
        
        # Validation: Only process if it's actually a webpage
        content_type = response.headers.get('Content-Type', '').lower()
        if 'text/html' not in content_type:
            return f"Crawler skipped: URL points to a non-HTML resource ({content_type})."

        if response.status_code != 200:
            print(f"[*] Crawler blocked or failed for {url} (Status: {response.status_code})")
            # If 403, we might be blocked by Cloudflare/DDoS protection
            if response.status_code == 403:
                return "Access denied by source website (Cloudflare or bot protection). Manual review suggested."
            return f"Crawler failed to access the URL. HTTP Status: {response.status_code}"
            
        if BeautifulSoup is None:
            return "BeautifulSoup4 module is missing. Please install it with 'pip install beautifulsoup4'."

        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove unwanted elements
        for element in soup(['script', 'style', 'nav', 'header', 'footer', 'aside', 'form', 'iframe', 'button', 'input']):
            element.decompose()
            
        # Try to find main article content
        # Common classes/tags for articles
        article_candidates = [
            soup.find('article'),
            soup.find(id=re.compile('article|content|main|post|body', re.I)),
            soup.find(class_=re.compile('article|content|main|post|body|entry-content', re.I)),
            soup.find('main')
        ]
        
        article = next((c for c in article_candidates if c), None)
        
        if article:
            text = article.get_text(separator='\n', strip=True)
        else:
            # Fallback to entire body
            text = soup.body.get_text(separator='\n', strip=True) if soup.body else soup.get_text(separator='\n', strip=True)
            
        # Clean up text
        lines = [line.strip() for line in text.splitlines() if len(line.strip()) > 20] # Filter out short noise lines
        text = '\n'.join(lines)
        
        # REMOVE NULL CHARACTERS (\x00) - These crash SQLite/Postgres on commit
        text = text.replace('\x00', '')
        
        # Limit to first 15000 characters
        return text
        
    except requests.exceptions.Timeout:
        print(f"[*] Crawler timed out for {url}")
        return "Crawler timed out while attempting to fetch the article."
    except Exception as e:
        print(f"[*] Crawler exception for {url}: {e}")
        return f"Crawler encountered an error: {str(e)}"
