#!/usr/bin/env node

/**
 * Ianseo Pro CLI Scraper
 * Usage:
 *   node cli.js --list --year 2026 --time 1
 *   node cli.js --id 29742 --details
 *   node cli.js --id 29244 --path /TourData/2026/29244/IQRW.php --export results.json
 */

const fs = require('fs');
const scraper = require('./scraper');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--list') options.list = true;
    else if (arg === '--details') options.details = true;
    else if (arg === '--id' || arg === '-i') options.id = args[++i];
    else if (arg === '--year' || arg === '-y') options.year = args[++i];
    else if (arg === '--country' || arg === '-c') options.country = args[++i];
    else if (arg === '--time' || arg === '-t') options.time = args[++i];
    else if (arg === '--search' || arg === '-s') options.search = args[++i];
    else if (arg === '--path' || arg === '-p') options.path = args[++i];
    else if (arg === '--export' || arg === '-o') options.export = args[++i];
    else if (arg === '--help' || arg === '-h') options.help = true;
  }
  return options;
}

function printHelp() {
  console.log(`
🏹 Ianseo Pro Scraper CLI
------------------------------------------------------
Options:
  --list                     List competitions
  --id <toId>                Tournament ID to inspect
  --details                  Show tournament summary & sections
  --path <subpath>           Scrape specific subpage (e.g. ENC.php, IQRW.php)
  --year <year>              Filter by Year (default: 2026)
  --country <code>           Filter by country code (e.g. MAS, USA, GBR)
  --time <1|2|3>             1: Today, 2: Completed, 3: Upcoming
  --search <keyword>         Search keyword
  --export <file.json>       Save output to JSON file
  --help                     Show this help message

Examples:
  node server/cli.js --list --year 2026 --time 1
  node server/cli.js --id 29742 --details
  node server/cli.js --id 29244 --path /TourData/2026/29244/IQRW.php --export iqrw.json
`);
}

async function run() {
  const options = parseArgs();

  if (options.help || Object.keys(options).length === 0) {
    printHelp();
    return;
  }

  try {
    let result = null;

    if (options.list) {
      console.log(`🔍 Scraping tournament list (Year: ${options.year || '2026'}, Country: ${options.country || 'All'}, Time: ${options.time || 'All'})...`);
      result = await scraper.getTournaments({
        year: options.year || '2026',
        countryid: options.country || '',
        comptime: options.time || '',
        search: options.search || ''
      });

      console.log(`\n✅ Found ${result.count} tournaments:`);
      console.log('--------------------------------------------------------------------------------');
      result.tournaments.slice(0, 20).forEach((t, idx) => {
        const liveTag = t.isLiveToday ? ' [🔴 LIVE TODAY]' : '';
        console.log(`${idx + 1}. [${t.toId}] [${t.code}] ${t.name}${liveTag}`);
        console.log(`   📍 ${t.location} (${t.country}) | 📅 ${t.dates} | 🔄 ${t.updated}`);
      });
      if (result.count > 20) {
        console.log(`\n... and ${result.count - 20} more tournaments.`);
      }
    } else if (options.id && options.path) {
      console.log(`🎯 Scraping event data for Tournament ${options.id} (${options.path})...`);
      result = await scraper.getEventData(options.id, options.path);
      console.log(`\n📋 Title: ${result.pageTitle}`);
      if (result.tables.length > 0) {
        console.log(`Found ${result.tables.length} table(s). Sample rows from Table 1:`);
        const tbl = result.tables[0];
        console.log('Headers:', tbl.headers.join(' | '));
        tbl.rows.slice(0, 10).forEach(r => {
          console.log(`- ${r.rank ? '#' + r.rank : ''} ${r.athlete || ''} ${r.club ? '(' + r.club + ')' : ''} => ${r.cells.slice(3).join(' ')}`);
        });
      }
    } else if (options.id || options.details) {
      const toId = options.id;
      if (!toId) {
        console.error('❌ Please specify --id <toId>');
        return;
      }
      console.log(`📋 Scraping details for Tournament ${toId}...`);
      result = await scraper.getTournamentDetails(toId);
      console.log(`\n🏆 ${result.title}`);
      console.log(`🏢 Organizer: ${result.organizer}`);
      console.log(`📍 Location & Dates: ${result.locationAndDates}`);
      console.log('\n📂 Sections & Available Documents:');
      result.sections.forEach(s => {
        console.log(`\n[${s.title}] (${s.items.length} items):`);
        s.items.forEach(item => {
          const type = item.category.toUpperCase();
          const pdfTag = item.pdfUrl ? ' [PDF Available]' : '';
          console.log(`  - [${type}] ${item.text}${pdfTag}`);
        });
      });
    }

    if (options.export && result) {
      fs.writeFileSync(options.export, JSON.stringify(result, null, 2), 'utf-8');
      console.log(`\n💾 Saved output to ${options.export}`);
    }
  } catch (err) {
    console.error('❌ Error during scrape:', err.message);
  }
}

run();
