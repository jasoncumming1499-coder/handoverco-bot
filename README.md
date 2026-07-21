# The Handover Co — Telegram Bot

Auto-welcomes new group/channel members, and auto-replies with AI (Claude) until you take over a conversation yourself.

## What it does

- **New member joins** → bot sends a welcome message automatically.
- **Someone messages the group** → bot replies using Claude, based on the business description in `SYSTEM_PROMPT` inside `index.js`.
- **You want to take over a chat** → send `/human` in that chat (from your own Telegram account). The bot goes quiet in that chat.
- **You're done, want AI back on** → send `/ai` in that chat.

Only you (OWNER_ID) can use `/human` and `/ai` — anyone else sending them is ignored.

## Setup (local test)

1. Install [Node.js](https://nodejs.org) (v18+) if you don't have it.
2. In this folder, run:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
4. Fill in `.env`:
   - `BOT_TOKEN` — already filled in with the token BotFather gave you. **Keep this private.**
   - `ANTHROPIC_API_KEY` — get one at https://console.anthropic.com/settings/keys
   - `OWNER_ID` — your personal numeric Telegram ID. Message **@userinfobot** on Telegram and it'll reply with your ID.
   - `WELCOME_MESSAGE` — edit to whatever you want new members to see.
5. Run it:
   ```
   npm start
   ```
6. Add `@Jsmarketmovesbot` to your Telegram group, and try messaging it.

## Editing what the AI knows

Open `index.js` and edit the `SYSTEM_PROMPT` constant near the top — that's the bot's entire understanding of your business, tone, and what it should hand off to you. Change it any time and restart the bot.

## Deploying so it runs 24/7

Running `npm start` only works while your computer is on. To keep it live permanently, deploy to a free/cheap host:

**Render.com (easiest)**
1. Push this folder to a GitHub repo.
2. On Render.com → New → Background Worker → connect the repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add the same environment variables from `.env` in Render's dashboard (Environment tab).
6. Deploy — it'll run continuously.

## Notes

- Conversation memory is per-chat and resets if the bot restarts (fine for a small group; let me know if you want it to persist to a file/database instead).
- The `/human` and `/ai` toggle IS saved to a file (`chat-modes.json`) so it survives restarts.
- Never share your `BOT_TOKEN` or `ANTHROPIC_API_KEY` publicly — anyone with them can control the bot / rack up API charges on your account.
