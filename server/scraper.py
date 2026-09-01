#!/usr/bin/env python3
"""
Ianseo Pro - Python Scraper Module & CLI
Provides pure-Python scraping of Ianseo.net tournaments, details, and scorecards with NO ADS.
"""

import sys
import json
import urllib.request
import urllib.parse
from html.parser import HTMLParser
import re

BASE_URL = "https://www.ianseo.net"

def fetch_html(url):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
    )
    with urllib.request.urlopen(req) as response:
        return response.read().decode('utf-8', errors='ignore')

def get_tournaments(year="2026", country_id="", comp_time="", search=""):
    params = urllib.parse.urlencode({
        "Year": year,
        "countryid": country_id,
        "comptime": comp_time
    })
    url = f"{BASE_URL}/TourList.php?{params}"
    html = fetch_html(url)

    tournaments = []
    # Match tournament rows
    row_pattern = re.compile(r"<tr[^>]*onclick=[\"']window\.open\('Details\.php\?toId=(\d+)'[^>]*>(.*?)<\/tr>", re.DOTALL | re.IGNORECASE)
    
    for match in row_pattern.finditer(html):
        to_id = match.group(1)
        row_content = match.group(2)
        
        # Extract td contents
        tds = re.findall(r"<td[^>]*>(.*?)<\/td>", row_content, re.DOTALL | re.IGNORECASE)
        if len(tds) < 5:
            continue
            
        # Clean text
        def clean(text):
            text = re.sub(r"<[^>]+>", " ", text)
            text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&quot;", '"')
            return " ".join(text.split()).strip()

        # Flag image
        flag_match = re.search(r"<img[^>]*src=[\"']([^\"']+)[\"'][^>]*title=[\"']([^\"']*)[\"']", row_content)
        flag_src = f"{BASE_URL}/{flag_match.group(1).lstrip('/')}" if flag_match else None
        country = flag_match.group(2) if flag_match else ""

        code = clean(tds[2]) if len(tds) > 2 else ""
        name = clean(tds[3]) if len(tds) > 3 else ""
        organizer = clean(tds[4]) if len(tds) > 4 else ""
        location = clean(tds[6]) if len(tds) > 6 else ""
        dates = clean(tds[7]) if len(tds) > 7 else ""
        updated = clean(tds[8]) if len(tds) > 8 else ""

        is_live = "today" in updated.lower() or "update" in row_content.lower()

        t_obj = {
            "toId": to_id,
            "code": code,
            "name": name,
            "organizer": organizer,
            "country": country,
            "flagSrc": flag_src,
            "location": location,
            "dates": dates,
            "updated": updated,
            "isLiveToday": is_live
        }

        if search:
            q = search.lower()
            if not any(q in str(v).lower() for v in t_obj.values()):
                continue

        tournaments.append(t_obj)

    return {
        "year": year,
        "total": len(tournaments),
        "tournaments": tournaments
    }

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--help":
        print("Usage: python3 scraper.py [--year 2026] [--country MAS] [--search text] [--export out.json]")
        return

    year = "2026"
    search = ""
    export_file = None

    args = sys.argv[1:]
    for i in range(len(args)):
        if args[i] == "--year" and i + 1 < len(args):
            year = args[i + 1]
        elif args[i] == "--search" and i + 1 < len(args):
            search = args[i + 1]
        elif args[i] == "--export" and i + 1 < len(args):
            export_file = args[i + 1]

    data = get_tournaments(year=year, search=search)
    print(f"🏹 Ianseo Python Scraper: Found {data['total']} tournaments for year {year}")
    for t in data["tournaments"][:10]:
        live = " [🔴 LIVE TODAY]" if t["isLiveToday"] else ""
        print(f"- [{t['toId']}] {t['name']}{live} | {t['location']} ({t['country']}) | {t['dates']}")

    if export_file:
        with open(export_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Exported {data['total']} items to {export_file}")

if __name__ == "__main__":
    main()
