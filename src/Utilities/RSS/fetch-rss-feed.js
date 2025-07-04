// rssSender.js
const Parser = require("rss-parser");
const db = require("../../Handlers/database");

const parser  = new Parser();
const RSS_URL = "https://www.rnz.co.nz/rss/national.xml";

/**
 * @param {string} serverId Discord server (guild) ID
 * @param {string} rssUrl The url where to get RSS from (MAY NOT BE WORKING)
 * @returns {Promise<Array>} list of new items for this run
 */
async function fetchRSSforServer(serverId, rssUrl = RSS_URL) {
  if (!serverId) {
    throw new Error("serverId is required");
  }

  const key = `sentGuids_${serverId}`;

  try {
    const feed = await parser.parseURL(rssUrl);

    const sentArr   = (await db.rss.get(key)) || [];
    const sentSet   = new Set(sentArr);
    const nextSet   = new Set(sentArr);

    const newItems = feed.items.filter(item => {
      const guid = item.guid || item.link;
      return !sentSet.has(guid);
    });

    const totalItems = [];

    if ( newItems.length === 0 ) {

      return [];

    }

    for (const item of newItems) {
      const guid  = item.guid || item.link;

      totalItems.push({
        title: item.title,
        url:   item.link,
        desc:  item.contentSnippet,
        time:  new Date(item.pubDate).toISOString()
      });

      nextSet.add(guid);
    }

    await db.rss.set(key, Array.from(nextSet));
    return totalItems;

  } catch (err) {
    console.error(`❌ [RSS] [${serverId}] Error:`, err.message);
    return [];
  }
}

module.exports = fetchRSSforServer;