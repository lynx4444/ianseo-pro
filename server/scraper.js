const cheerio = require('cheerio');

const BASE_URL = 'https://www.ianseo.net';

// In-memory cache with TTL
const cache = new Map();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

async function fetchWithCache(url, forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && cache.has(url)) {
    const entry = cache.get(url);
    if (now - entry.timestamp < CACHE_TTL_MS) {
      return entry.data;
    }
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
    }

    const html = await res.text();
    cache.set(url, { timestamp: now, data: html });
    return html;
  } catch (err) {
    if (cache.has(url)) {
      return cache.get(url).data;
    }
    throw err;
  }
}

/**
 * Scrape Tournaments List from TourList.php
 */
async function getTournaments(options = {}) {
  const {
    year = '2026',
    countryid = '',
    comptime = '', // '' = all, '1' = today, '2' = completed, '3' = upcoming
    search = ''
  } = options;

  const queryParams = new URLSearchParams();
  if (year) queryParams.append('Year', year);
  if (countryid) queryParams.append('countryid', countryid);
  if (comptime) queryParams.append('comptime', comptime);

  const url = `${BASE_URL}/TourList.php?${queryParams.toString()}`;
  const html = await fetchWithCache(url);
  const $ = cheerio.load(html);

  // Extract filter options (years & countries)
  const years = [];
  $('#Year option').each((_, el) => {
    const val = $(el).val();
    if (val) years.push(val);
  });

  const countries = [];
  $('#countryid option').each((_, el) => {
    const code = $(el).val();
    const name = $(el).text().trim();
    if (code) countries.push({ code, name });
  });

  const tournaments = [];
  let currentSection = 'All Competitions';

  // Iterate over table rows
  $('table.tourlist-table tr').each((_, el) => {
    const $row = $(el);

    // Check for section header
    if ($row.hasClass('today-subheader')) {
      currentSection = $row.text().trim();
      return;
    }

    // Skip non-data rows or secondary responsive rows
    if ($row.hasClass('results-secondary-lines') || $row.hasClass('table100-head')) {
      return;
    }

    // Find toId from onclick
    const onclick = $row.attr('onclick') || '';
    const toIdMatch = onclick.match(/toId=(\d+)/);
    if (!toIdMatch) return;

    const toId = toIdMatch[1];
    const tds = $row.find('td');
    if (tds.length < 5) return;

    const code = $row.find('td.column2:not(.mobile-show-notresponsive)').text().trim();
    const name = $row.find('td.column3:not(.mobile-show-notresponsive)').text().trim() ||
                 $row.find('td.column2.mobile-show-notresponsive').text().trim();
    const organizer = $row.find('td.column4').text().trim();
    
    // Flag & Country
    const flagImg = $row.find('td.column5 img');
    const flagSrc = flagImg.attr('src') ? (flagImg.attr('src').startsWith('http') ? flagImg.attr('src') : `${BASE_URL}/${flagImg.attr('src').replace(/^\//, '')}`) : null;
    const country = flagImg.attr('title') || flagImg.attr('alt') || '';

    const location = $row.find('td.column6').text().trim();
    const dates = $row.find('td.column7').text().trim();
    const updated = $row.find('td.column8').text().trim();

    const isLiveToday = currentSection.toLowerCase().includes('today') ||
                        updated.toLowerCase().includes('today') ||
                        $row.find('.update').length > 0;

    tournaments.push({
      toId,
      code,
      name,
      organizer,
      flagSrc,
      country,
      location,
      dates,
      updated,
      isLiveToday,
      section: currentSection
    });
  });

  // Client search filter if provided
  let filtered = tournaments;
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = tournaments.filter(t => 
      t.name.toLowerCase().includes(q) ||
      t.code.toLowerCase().includes(q) ||
      t.organizer.toLowerCase().includes(q) ||
      t.location.toLowerCase().includes(q) ||
      t.country.toLowerCase().includes(q)
    );
  }

  return {
    year: year || '2026',
    countryid,
    comptime,
    years: years.length > 0 ? years : ['2027', '2026', '2025', '2024', '2023', '2022', '2021', '2020'],
    countries,
    count: filtered.length,
    total: tournaments.length,
    tournaments: filtered
  };
}

/**
 * Scrape Tournament Details & Sections
 */
async function getTournamentDetails(toId) {
  if (!toId) throw new Error('Tournament ID (toId) is required');

  const url = `${BASE_URL}/Details.php?toId=${toId}`;
  const html = await fetchWithCache(url);
  const $ = cheerio.load(html);

  // Header info
  const headerContainer = $('.results-header-container');
  const headerLeftImg = headerContainer.find('.results-header-left img').attr('src');
  const headerRightImg = headerContainer.find('.results-header-right img').attr('src');

  const headerLines = [];
  headerContainer.find('.results-header-center div').each((_, el) => {
    const txt = $(el).text().trim();
    if (txt) headerLines.push(txt);
  });

  const title = headerLines[0] || $('title').text().replace('| Ianseo', '').trim();
  const organizer = headerLines[1] || '';
  const locationAndDates = headerLines[2] || '';

  // Extract panels
  const sections = [];
  const allLinks = [];

  $('.results-panel').each((_, el) => {
    const $panel = $(el);
    const head = $panel.children('.results-panel-head').first().text().trim();
    if (!head || head === 'Competition Information') return;

    const items = [];
    $panel.find('.results-item-container').each((_, itemEl) => {
      const $item = $(itemEl);
      const linkEl = $item.find('.results-link a');
      const text = linkEl.text().trim();
      const href = linkEl.attr('href');
      const updateText = $item.find('.results-update-text').text().trim();

      // Find any PDF link in item
      const pdfEl = $item.find('a[href$=".pdf"], a[href*=".pdf?"]');
      let pdfUrl = pdfEl.attr('href') || (href && href.includes('.pdf') ? href : null);
      if (pdfUrl && !pdfUrl.startsWith('http')) {
        pdfUrl = `${BASE_URL}/${pdfUrl.replace(/^\//, '')}`;
      }

      let webUrl = href;
      if (webUrl && !webUrl.startsWith('http')) {
        webUrl = `${BASE_URL}/${webUrl.replace(/^\//, '')}`;
      }

      if (text && (webUrl || pdfUrl)) {
        // Determine category type
        let category = 'page';
        const lowerText = text.toLowerCase();
        if (pdfUrl && (!webUrl || webUrl.endsWith('.pdf'))) category = 'pdf';
        else if (lowerText.includes('recurve') || lowerText.includes('compound') || lowerText.includes('barebow') || lowerText.includes('traditional') || lowerText.includes('arrows') || lowerText.includes('flechas') || lowerText.includes('qualification') || lowerText.includes('clasificaci')) category = 'qualification';
        else if (lowerText.includes('bracket') || lowerText.includes('elimination') || lowerText.includes('finals') || lowerText.includes('eliminat')) category = 'bracket';
        else if (lowerText.includes('participant') || lowerText.includes('inscritos') || lowerText.includes('entry') || lowerText.includes('target') || lowerText.includes('country') || lowerText.includes('dianas')) category = 'entries';
        else if (lowerText.includes('schedule') || lowerText.includes('agenda') || lowerText.includes('layout') || lowerText.includes('campo') || lowerText.includes('prospectus')) category = 'document';
        else if (lowerText.includes('statistic') || lowerText.includes('number of entries') || lowerText.includes('inscri')) category = 'statistics';
        else if (lowerText.includes('medal') || lowerText.includes('standing')) category = 'medals';

        const itemObj = {
          text,
          webUrl,
          pdfUrl,
          path: href ? href.replace(/^https?:\/\/[^\/]+/, '') : null,
          category,
          updated: updateText
        };
        items.push(itemObj);
        allLinks.push(itemObj);
      }
    });

    if (items.length > 0) {
      sections.push({
        title: head,
        items
      });
    }
  });

  return {
    toId,
    title,
    organizer,
    locationAndDates,
    bannerLeft: headerLeftImg ? (headerLeftImg.startsWith('http') ? headerLeftImg : `${BASE_URL}/${headerLeftImg.replace(/^\//, '')}`) : null,
    bannerRight: headerRightImg ? (headerRightImg.startsWith('http') ? headerRightImg : `${BASE_URL}/${headerRightImg.replace(/^\//, '')}`) : null,
    sections,
    allLinksCount: allLinks.length,
    url
  };
}

/**
 * Scrape sub-page data (Qualification table, Entries, Brackets, Statistics)
 */
async function getEventData(toId, path) {
  if (!path) throw new Error('Path is required');

  let fullUrl = path.startsWith('http') ? path : `${BASE_URL}/${path.replace(/^\//, '')}`;
  const html = await fetchWithCache(fullUrl);
  const $ = cheerio.load(html);

  // Extract page title / category name
  const pageTitle = $('th.center, h2, h1, .table100-head th.font-weight-bold').first().text().trim() ||
                    $('title').text().replace('| Ianseo', '').trim();

  // Parse tables
  const tables = [];

  $('table').each((tableIdx, tableEl) => {
    const $tbl = $(tableEl);
    
    // Extract headers
    let headers = [];
    $tbl.find('tr.table100-head:last-child th, thead tr:last-child th, tr:first-child th').each((_, th) => {
      const h = $(th).text().trim();
      if (h) headers.push(h);
    });

    const rows = [];
    let currentCategory = '';

    $tbl.find('tr').each((_, tr) => {
      const $tr = $(tr);
      if ($tr.hasClass('table100-head') || $tr.find('th').length > 0) return;

      // Check if it is a category / section divider row
      if ($tr.find('td[colspan]').length === 1) {
        const span = parseInt($tr.find('td').first().attr('colspan') || '1', 10);
        if (span > 2) {
          currentCategory = $tr.text().trim();
          return;
        }
      }

      // Skip secondary line wrapper
      if ($tr.hasClass('results-secondary-lines')) return;

      const cells = [];
      $tr.find('td').each((_, td) => {
        const text = $(td).text().trim().replace(/\s+/g, ' ');
        cells.push(text);
      });

      if (cells.length > 0 && cells.some(c => c.length > 0)) {
        const rowObj = {
          category: currentCategory,
          cells
        };

        if (cells.length >= 3) {
          rowObj.rank = cells[0] || '';
          rowObj.athlete = cells[1] || '';
          rowObj.club = cells[2] || '';
          rowObj.scores = cells.slice(3);
          rowObj.total = cells[cells.length - 3] || cells[cells.length - 1] || '';
        }

        rows.push(rowObj);
      }
    });

    if (rows.length > 0 || headers.length > 0) {
      tables.push({
        tableIndex: tableIdx,
        headers,
        rowsCount: rows.length,
        rows
      });
    }
  });

  return {
    toId,
    path,
    url: fullUrl,
    pageTitle,
    tables
  };
}

module.exports = {
  BASE_URL,
  getTournaments,
  getTournamentDetails,
  getEventData
};
