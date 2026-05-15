import feedparser
from sqlalchemy.orm import Session
import models
from datetime import datetime, timedelta
import time
try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

def clean_html(html_content: str) -> str:
    """Helper to strip HTML tags from RSS summaries/descriptions."""
    if not html_content:
        return ""
    if BeautifulSoup is None:
        import re
        return re.sub(r'<[^>]*>', '', html_content)
    
    soup = BeautifulSoup(html_content, "html.parser")
    # Get text with space separator to avoid merging words
    text = soup.get_text(separator=' ')
    # Clean up multiple spaces and newlines
    text = ' '.join(text.split())
    return text

RSS_FEEDS = [
    {"url": "https://thehackernews.com/feeds/posts/default", "name": "TheHackerNews"},
    {"url": "https://feeds.feedburner.com/PaloAltoNetworks", "name": "PaloAlto"},
    {"url": "https://krebsonsecurity.com/feed/", "name": "KrebsOnSecurity"},
    {"url": "https://www.darkreading.com/rss.xml", "name": "DarkReading"},
    {"url": "https://economictimes.indiatimes.com/tech/ites/rssfeeds/13357563.cms", "name": "ET-Tech-India"},
    {"url": "https://www.gadgets360.com/rss/feeds", "name": "Gadgets360-India"},
    {"url": "https://securityaffairs.com/feed", "name": "SecurityAffairs"},
    {"url": "https://www.bleepingcomputer.com/feed/", "name": "BleepingComputer"},
    {"url": "https://www.bankinfosecurity.asia/rss", "name": "BankInfoSecurity-Asia"},
    {"url": "https://rss.inshorts.com/articles/technology", "name": "Inshorts-Technology"},
    {"url": "https://socradar.io/feed/", "name": "SOCRadar-DarkWeb"},
    {"url": "https://flashpoint.io/feed/", "name": "Flashpoint-Intel"},
    {"url": "https://www.cyberscoop.com/feed/", "name": "CyberScoop"},
    {"url": "https://www.mandiant.com/resources/blog/rss.xml", "name": "Mandiant-Threat-Intel"},
    {"url": "https://www.recordedfuture.com/feed", "name": "RecordedFuture-DarkWeb"}
]


def fetch_rss_feeds(db: Session, timeframe: str = "today"):
    collected_count = 0
    now = datetime.utcnow()
    
    # Calculate threshold date
    if timeframe == "yesterday":
        threshold_start = now - timedelta(days=1)
        # We look for anything on that specific day
        threshold_end = now - timedelta(days=0)
    elif timeframe == "week":
        threshold_start = now - timedelta(days=7)
    else: # today
        threshold_start = now - timedelta(days=0)

    for feed in RSS_FEEDS:
        try:
            print(f"[*] Fetching feed: {feed['name']} ({timeframe})...")
            parsed_feed = feedparser.parse(feed['url'])
            
            for entry in parsed_feed.entries:
                # Check date if available
                pub_date = None
                if hasattr(entry, 'published_parsed'):
                    pub_date = datetime.fromtimestamp(time.mktime(entry.published_parsed))
                
                # Filter by timeframe
                if pub_date:
                    if timeframe == "today" and pub_date.date() != now.date(): continue
                    if timeframe == "yesterday" and pub_date.date() != (now - timedelta(days=1)).date(): continue
                    if timeframe == "week" and pub_date < (now - timedelta(days=7)): continue

                # Duplicacy Check Rule: Exact link OR normalized title
                normalized_title = entry.get('title', '').strip().lower()
                existing = db.query(models.Incident).filter(
                    (models.Incident.link == entry.link) | 
                    (models.Incident.title.ilike(normalized_title))
                ).first()
                
                if not existing:
                    raw_desc = entry.get('description', entry.get('summary', ''))
                    clean_desc = clean_html(raw_desc)
                    
                    title_desc = (normalized_title + clean_desc.lower())
                    country = "India" if any(k in title_desc for k in ["india", "mumbai", "delhi", "rbi", "upi"]) else "Global"

                    incident = models.Incident(
                        title=entry.get('title', 'Unknown Title'),
                        description=clean_desc,
                        source=feed['name'],
                        link=entry.link,
                        country=country,
                        happened_at=pub_date,
                        raw_data=dict(entry)
                    )
                    db.add(incident)
                    collected_count += 1
            db.commit()
        except Exception as e:
            print(f"[!] RSS Error {feed['name']}: {str(e)}")
            
    return {"message": f"RSS ({timeframe}): {collected_count} new incidents."}

