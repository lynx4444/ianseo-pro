# 🏹 Ianseo Pro - Modern & Ad-Free Archery Tournament Hub

A high-performance web scraper and modern web application that extracts tournament schedules, live results, qualification rankings, participant rosters, and official documents from [Ianseo.net](https://www.ianseo.net/) and presents them in an **elevated, modern, 100% ad-free interface**.

---

## 🌟 Highlights & Features

- **🛡️ 100% Ad-Free**: Completely removes all Google AdSense banners, overlays, tracking scripts, and popups that clutter Ianseo.net.
- **⚡ Real-Time Live Scraper**: Scrapes live tournament data directly from Ianseo with smart caching for lightning-fast sub-second loading.
- **🏆 Archery Modern UI**: Sleek dark/light themes, archery target color rings (Gold, Red, Blue, Black, White), glassmorphism cards, and Google typography (*Outfit*, *Inter*, *JetBrains Mono*).
- **🔴 Live Event Radar**: Instant discovery of competitions taking place today with live pulse badge.
- **🎯 Full Qualification & Scorecards**: Interactive score tables with 10s & Xs counts, distance breakdown, and gold/silver/bronze podium highlights.
- **📋 Official Documents & Clean PDF Stream**: Access Field of Play layouts, Schedules, and Bulletins in-app without leaving the portal.
- **👥 Participant & Roster Explorer**: Search archers, club affiliations, and target assignments.
- **🎯 Interactive Archery Target Practice**: Built-in interactive SVG target simulator for scoring arrows and logging ends.
- **💾 1-Click Clean Export**: Export full tournament datasets in clean JSON or CSV formats.
- **💻 CLI & Python Scrapers Included**: Run terminal scraping or integrate into Python/Node pipelines.

---

## 🚀 Quick Start

### 1. Run the Web Application
```bash
cd /Users/johanirfan/.gemini/antigravity-ide/scratch/ianseo-pro
node server/api.js
```
Then open your browser to:
👉 **`http://localhost:3000`**

---

## 💻 Standalone Scraper CLI Usage

### Node.js CLI:
```bash
# List all 2026 tournaments occurring today
node server/cli.js --list --year 2026 --time 1

# Inspect tournament details and documents
node server/cli.js --id 29742 --details

# Scrape qualification scores and export to JSON
node server/cli.js --id 29244 --path /TourData/2026/29244/IQRW.php --export qual_results.json
```

### Python Scraper CLI:
```bash
# Search tournaments in Malaysia for 2026 and export to JSON
python3 server/scraper.py --year 2026 --search Malaysia --export malaysia_2026.json
```

---

## 🔌 REST API Reference

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/tournaments` | `GET` | Get list of tournaments (params: `year`, `countryid`, `comptime`, `q`, `limit`) |
| `/api/tournaments/:toId` | `GET` | Get tournament overview, banners, and sections |
| `/api/tournaments/:toId/data` | `GET` | Scrape and parse sub-page table (`?path=/TourData/...`) |
| `/api/tournaments/:toId/export` | `GET` | Export tournament as `json` or `csv` (`?format=json\|csv`) |
| `/api/proxy/pdf` | `GET` | Stream Ianseo PDF document cleanly without ad wrapper |
| `/api/health` | `GET` | Health check endpoint |
