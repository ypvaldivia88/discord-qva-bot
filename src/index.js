import "dotenv/config";
import cron from "node-cron";
import {
  Client,
  GatewayIntentBits,
  Events,
  ChannelType,
} from "discord.js";
import { parseUrlList, postNewFromFeeds } from "./rss.js";

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
const newsChannelId = process.env.NEWS_CHANNEL_ID;
const dealsChannelId = process.env.DEALS_CHANNEL_ID;
const cronExpr = process.env.CRON_RSS || "0 */6 * * *";
const maxPosts = Number(process.env.MAX_POSTS_PER_RUN || "5");

const newsFeeds = parseUrlList(process.env.RSS_URLS_NEWS);
const dealsFeeds = parseUrlList(process.env.RSS_URLS_DEALS);

if (!token) {
  console.error("Missing DISCORD_TOKEN in .env");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

/** Text channels and announcement (“news”) channels can receive normal messages. */
const POSTABLE_CHANNEL_TYPES = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
]);

/**
 * @param {string | undefined} channelId
 * @param {string} label
 */
async function resolveTextChannel(channelId, label) {
  if (!channelId) {
    console.warn(`[${label}] No channel ID set — skipping.`);
    return null;
  }
  const ch = await client.channels.fetch(channelId).catch((err) => {
    console.error(`[${label}] Channel ${channelId} fetch failed:`, err?.message || err);
    return null;
  });
  if (!ch) {
    return null;
  }
  if (!POSTABLE_CHANNEL_TYPES.has(ch.type)) {
    console.error(
      `[${label}] Channel ${channelId} is type ${ch.type} — use a text or announcement channel.`
    );
    return null;
  }
  return ch;
}

async function runRssJob() {
  const newsCh = await resolveTextChannel(newsChannelId, "NEWS");
  const dealsCh = await resolveTextChannel(dealsChannelId, "DEALS");

  if (newsCh && newsFeeds.length) {
    const r = await postNewFromFeeds(newsCh, newsFeeds, maxPosts);
    console.log(`[RSS] News channel: posted ${r.posted}`, r.skipped || "");
  } else if (newsCh && !newsFeeds.length) {
    console.warn("[RSS] NEWS_CHANNEL_ID set but RSS_URLS_NEWS is empty.");
  }

  if (dealsCh && dealsFeeds.length) {
    const r = await postNewFromFeeds(dealsCh, dealsFeeds, maxPosts);
    console.log(`[RSS] Deals channel: posted ${r.posted}`, r.skipped || "");
  } else if (dealsCh && !dealsFeeds.length) {
    console.warn("[RSS] DEALS_CHANNEL_ID set but RSS_URLS_DEALS is empty.");
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);

  if (guildId) {
    try {
      await c.application.commands.set(
        [
          {
            name: "ping",
            description: "Reply with pong (sanity check)",
          },
        ],
        guildId
      );
      console.log(`Slash commands registered for guild ${guildId}`);
    } catch (e) {
      console.warn("Could not register guild commands:", e.message);
    }
  }

  cron.schedule(cronExpr, () => {
    runRssJob().catch((e) => console.error("[RSS] Job error:", e));
  });

  // First run shortly after startup
  setTimeout(() => {
    runRssJob().catch((e) => console.error("[RSS] Initial run error:", e));
  }, 5000);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "ping") {
    await interaction.reply({ content: "Pong.", ephemeral: true });
  }
});

client.login(token);
