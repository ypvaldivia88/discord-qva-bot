# wow-discord-bot

Small **self-hosted** Discord bot that posts **WoW-related news** (and optional **deals/offers**) from **RSS feeds** into dedicated channels on a schedule. No manual posting once configured.

## What you need

- [Node.js 20+](https://nodejs.org/)
- A Discord server where you can add a bot
- RSS feed URLs you trust (Wowhead, Blues news aggregators, etc.). Blizzard’s shop may not offer a stable public RSS for “deals only”—you can use a news feed that covers promotions, or add a feed later when you find one.

## 1. Create the Discord application

1. Open [Discord Developer Portal](https://discord.com/developers/applications) → **New Application** → name it (e.g. WoW Forever Bot).
2. **Bot** → **Add Bot** → copy the **token** (keep it secret).
3. Under **Privileged Gateway Intents**, leave **Message Content Intent** **off** (this bot only uses slash commands + posting embeds; it does not read messages).
4. **OAuth2** → **URL Generator**: scopes `bot`, `applications.commands`; permissions: *Send Messages*, *Embed Links*, *Use Slash Commands*, *Read Messages/View Channels* (optional: *Attach Files*). Invite the bot to your server with that URL.

## 2. Channel IDs

Enable **Developer Mode** in Discord (User Settings → App Settings → Advanced). Right‑click the channel → **Copy Channel ID** for news and deals.

## 3. Configure environment

```bash
copy .env.example .env
```

Edit `.env`:

- `DISCORD_TOKEN` — bot token
- `GUILD_ID` — your server ID (for registering `/ping` quickly)
- `NEWS_CHANNEL_ID` / `DEALS_CHANNEL_ID` — text channel IDs
- `RSS_URLS_NEWS` — comma-separated RSS URLs (no spaces after commas)
- `RSS_URLS_DEALS` — optional; same format
- `CRON_RSS` — default every 6 hours: `0 */6 * * *`
- `MAX_POSTS_PER_RUN` — cap per channel per run (default `5`)

**Verify RSS URLs in a browser** (they should return XML). Wowhead and other sites change paths; update if a feed 404s.

## 4. Install and run

```bash
cd discord-qva-bot
npm install
npm start
```

For production, run under **PM2**, **Windows Service**, or a small VPS. Keep `.env` only on the host; never commit it.

## 5. Push to GitHub (account ypvaldivia88)

Repository: **[https://github.com/ypvaldivia88/discord-qva-bot](https://github.com/ypvaldivia88/discord-qva-bot)**

If you are setting this up locally, use [GitHub CLI](https://cli.github.com/) authenticated as `ypvaldivia88`, or [SSH keys](https://docs.github.com/en/authentication) on that account:

```bash
cd D:\Devops\Repos\discord-qva-bot
git init
git add .
git commit -m "Initial discord-qva-bot: RSS news/deals for Discord"
git remote add origin git@github.com:ypvaldivia88/discord-qva-bot.git
git branch -M main
git push -u origin main
```

(HTTPS: `https://github.com/ypvaldivia88/discord-qva-bot.git`.)

## License

MIT
