import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 20000,
  headers: {
    "User-Agent": "wow-discord-bot/1.0 (RSS reader for community server)",
  },
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const SEEN_PATH = path.join(DATA_DIR, "seen.json");

/**
 * @returns {Promise<Set<string>>}
 */
async function loadSeen() {
  try {
    const raw = await fs.readFile(SEEN_PATH, "utf8");
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/**
 * @param {Set<string>} seen
 */
async function saveSeen(seen) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SEEN_PATH, JSON.stringify([...seen], null, 0), "utf8");
}

/**
 * Stable id for an item (prefer guid, then link + title + pubDate).
 * @param {import('rss-parser').Item} item
 */
function itemId(item) {
  if (item.guid) return String(item.guid).trim();
  const link = item.link || "";
  const title = item.title || "";
  const date = item.isoDate || item.pubDate || "";
  return `${link}|${title}|${date}`;
}

/**
 * @param {string} urlsRaw - comma-separated
 * @returns {string[]}
 */
export function parseUrlList(urlsRaw) {
  if (!urlsRaw || !String(urlsRaw).trim()) return [];
  return String(urlsRaw)
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
}

/**
 * Fetch one feed and return newest items first (limited).
 * @param {string} url
 * @param {number} limit
 */
async function fetchFeedItems(url, limit) {
  const feed = await parser.parseURL(url);
  const items = feed.items || [];
  return items.slice(0, Math.max(1, limit));
}

/**
 * Post new items from feeds to a channel; updates seen store.
 * @param {import('discord.js').TextChannel} channel
 * @param {string[]} feedUrls
 * @param {number} maxPosts
 */
export async function postNewFromFeeds(channel, feedUrls, maxPosts) {
  if (!feedUrls.length) return { posted: 0, skipped: "no_feed_urls" };

  const seen = await loadSeen();
  let posted = 0;

  for (const url of feedUrls) {
    let items;
    try {
      items = await fetchFeedItems(url, maxPosts + 10);
    } catch (e) {
      console.error(`[RSS] Failed to fetch ${url}:`, e.message);
      continue;
    }

    for (const item of items) {
      if (posted >= maxPosts) break;
      const id = `rss:${url}:${itemId(item)}`;
      if (seen.has(id)) continue;
      seen.add(id);

      const title = item.title || "(no title)";
      const link = item.link || url;
      const desc = item.contentSnippet || item.content || "";
      const snippet =
        desc.length > 350 ? `${desc.slice(0, 347)}…` : desc;

      await channel.send({
        embeds: [
          {
            title: title.slice(0, 256),
            url: link,
            description: snippet || undefined,
            timestamp: item.isoDate ? new Date(item.isoDate).toISOString() : undefined,
            footer: { text: new URL(url).hostname },
            color: 0x5865f2,
          },
        ],
      });
      posted += 1;
    }
  }

  // Trim seen set so the file does not grow forever (keep last 5000 ids)
  if (seen.size > 5000) {
    const arr = [...seen];
    const trimmed = new Set(arr.slice(-4000));
    await saveSeen(trimmed);
  } else {
    await saveSeen(seen);
  }

  return { posted };
}
