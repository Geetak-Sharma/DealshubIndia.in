/**
 * QC Logger — structured log entries to stderr with level tags.
 * Easy to grep in production: grep "\[QC-" logs
 */

const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LEVEL = LEVELS.INFO;

function ts() {
  return new Date().toISOString();
}

function emit(level, tag, msg, meta) {
  if (LEVELS[level] < CURRENT_LEVEL) return;
  const entry = {
    ts:    ts(),
    level,
    tag,
    msg,
    ...(meta ? { meta } : {}),
  };
  // Use stderr so it doesn't interfere with SSE/API responses
  process.stderr.write(`[QC-${tag}] ${level} ${ts()} — ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}\n`);
}

export const QCLogger = {
  // Scraper lifecycle
  scraperStart:    (channels)    => emit('INFO',  'SCRAPER', `Starting — ${channels} channels`),
  scraperCycle:    (channel)     => emit('INFO',  'SCRAPER', `Fetching`, { channel }),
  scraperDone:     (channel, n)  => emit('INFO',  'SCRAPER', `Fetched ${n} candidates`, { channel }),
  scraperError:    (channel, e)  => emit('ERROR', 'SCRAPER', `Channel error`, { channel, error: e }),

  // Per-post events
  postScraped:     (id, merchant) => emit('DEBUG', 'SCRAPE', `Post scraped`,    { id, merchant }),
  postRejectedSpam:(id)           => emit('INFO',  'REJECT', `Spam/join post`,  { id }),
  postRejectedQC:  (id)           => emit('INFO',  'REJECT', `Not QC relevant`, { id }),
  postRejectedParse:(id, e)       => emit('WARN',  'REJECT', `Parse error`,     { id, error: e }),
  postDuplicate:   (id)           => emit('DEBUG', 'DEDUP',  `Duplicate skipped`,{ id }),
  postPublished:   (id, merchant) => emit('INFO',  'PUBLISH',`Published`,       { id, merchant }),

  // Affiliate
  affiliateStripped:(id, before, after) => emit('DEBUG', 'AFFILIATE', `URL cleaned`, { id, before, after }),

  // Historical import
  historicalStart:  (channel, pages)   => emit('INFO', 'HISTORY', `Starting historical import`, { channel, pages }),
  historicalPage:   (channel, page, n) => emit('INFO', 'HISTORY', `Page ${page}: ${n} posts`,   { channel }),
  historicalDone:   (channel, total)   => emit('INFO', 'HISTORY', `Historical import complete`,  { channel, total }),

  // Store
  storeLoaded:     (count)    => emit('INFO',  'STORE',   `Loaded ${count} posts`),
  storeSaved:      (count)    => emit('DEBUG', 'STORE',   `Saved ${count} posts`),
  storeCheckpoint: (channel, msgId) => emit('INFO', 'CHECKPOINT', `Saved last msg ID`, { channel, msgId }),

  // Summary cycle stats
  cycleSummary:    (stats) => emit('INFO', 'CYCLE', `Cycle complete`, stats),
};
