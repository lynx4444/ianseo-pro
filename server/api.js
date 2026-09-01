const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const scraper = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('tiny'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

/**
 * GET /api/tournaments
 * Query params: year, countryid, comptime, q, limit, offset
 */
app.get('/api/tournaments', async (req, res) => {
  try {
    const { year = '2026', countryid = '', comptime = '', q = '', limit = '5000', offset = 0 } = req.query;
    const data = await scraper.getTournaments({
      year,
      countryid,
      comptime,
      search: q
    });

    const numLimit = limit === 'all' ? data.tournaments.length : (parseInt(limit, 10) || 5000);
    const numOffset = parseInt(offset, 10) || 0;
    const paginated = data.tournaments.slice(numOffset, numOffset + numLimit);

    res.json({
      success: true,
      year: data.year,
      countryid: data.countryid,
      comptime: data.comptime,
      years: data.years,
      countries: data.countries,
      totalCount: data.count,
      offset: numOffset,
      limit: numLimit,
      tournaments: paginated
    });
  } catch (err) {
    console.error('Error fetching tournaments:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/tournaments/:toId
 */
app.get('/api/tournaments/:toId', async (req, res) => {
  try {
    const { toId } = req.params;
    const details = await scraper.getTournamentDetails(toId);
    res.json({ success: true, details });
  } catch (err) {
    console.error(`Error fetching details for ${req.params.toId}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/tournaments/:toId/data
 * Query param: path (e.g. /TourData/2026/29742/ENC.php or IQRW.php)
 */
app.get('/api/tournaments/:toId/data', async (req, res) => {
  try {
    const { toId } = req.params;
    const { path: subPath } = req.query;
    if (!subPath) {
      return res.status(400).json({ success: false, error: 'Path query param is required' });
    }

    const data = await scraper.getEventData(toId, subPath);
    res.json({ success: true, data });
  } catch (err) {
    console.error(`Error fetching event data for ${req.params.toId}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/tournaments/:toId/export
 * Query param: format (json, csv)
 */
app.get('/api/tournaments/:toId/export', async (req, res) => {
  try {
    const { toId } = req.params;
    const { format = 'json', path: subPath } = req.query;

    if (subPath) {
      const data = await scraper.getEventData(toId, subPath);
      if (format === 'csv' && data.tables.length > 0) {
        const table = data.tables[0];
        let csv = (table.headers.join(',') || 'Rank,Athlete,Club,Scores,Total') + '\n';
        table.rows.forEach(r => {
          csv += r.cells.map(c => `"${c.replace(/"/g, '""')}"`).join(',') + '\n';
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="tournament_${toId}_data.csv"`);
        return res.send(csv);
      }
      return res.json({ success: true, data });
    }

    const details = await scraper.getTournamentDetails(toId);
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="tournament_${toId}_details.json"`);
      return res.send(JSON.stringify(details, null, 2));
    }

    res.json({ success: true, details });
  } catch (err) {
    console.error(`Error exporting data for ${req.params.toId}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/proxy/pdf
 * Clean streaming proxy for Ianseo PDFs to bypass ad banners
 */
app.get('/api/proxy/pdf', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || !url.startsWith('http')) {
      return res.status(400).send('Valid PDF URL is required');
    }

    const pdfRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Referer': 'https://www.ianseo.net/'
      }
    });

    if (!pdfRes.ok) {
      return res.status(pdfRes.status).send('Failed to fetch PDF from remote');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="ianseo_document.pdf"');
    const buffer = await pdfRes.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('PDF proxy error:', err);
    res.status(500).send('Error proxying PDF');
  }
});

/**
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), platform: 'Ianseo Pro' });
});

// Fallback to index.html for SPA routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🏹 Ianseo Pro Scraper & Web App is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
