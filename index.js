import 'dotenv/config';
import { Bot } from 'grammy';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const BOT_TOKEN = process.env.BOT_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OWNER_ID = Number(process.env.OWNER_ID);
const WELCOME_MESSAGE = process.env.WELCOME_MESSAGE ||
  "Welcome! Ask me anything and I'll help until Jason jumps in personally.";

if (!BOT_TOKEN || !ANTHROPIC_API_KEY || !OWNER_ID) {
  console.error('Missing BOT_TOKEN, ANTHROPIC_API_KEY, or OWNER_ID in .env');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// --- Persisted "mode" per chat: true = human is handling it, bot stays quiet ---
const MODES_FILE = './chat-modes.json';
let humanModeChats = new Set();
try {
  humanModeChats = new Set(JSON.parse(fs.readFileSync(MODES_FILE, 'utf8')));
} catch {
  humanModeChats = new Set();
}
function saveModes() {
  fs.writeFileSync(MODES_FILE, JSON.stringify([...humanModeChats]));
}

// --- Simple rolling conversation memory per chat (last 10 messages, resets on restart) ---
const history = new Map(); // chatId -> [{role, content}]
function pushHistory(chatId, role, content) {
  const h = history.get(chatId) || [];
  h.push({ role, content });
  if (h.length > 10) h.shift();
  history.set(chatId, h);
}

// EDIT THIS to describe your business — this is what the AI knows and says.
const SYSTEM_PROMPT = `You are the assistant for The Handover Co, a UK digital estate administration business.

What we do:
- Help executors close online accounts and recover digital assets for someone who has died
- Offer a proactive retainer service for people who want to organise their digital affairs while alive

Tone: warm, clear, reassuring — this is a sensitive topic for grieving families, so avoid being clinical or salesy.

Rules:
- Answer questions about these services simply and helpfully.
- If someone wants to sign up, has a complex or urgent case, or asks something you're unsure about, tell them Jason will personally follow up, and do not make promises about pricing or timelines.
- Keep replies short — 2-4 sentences, suitable for a Telegram chat.`;

// --- Welcome new members ---
bot.on('message:new_chat_members', async (ctx) => {
  for (const member of ctx.message.new_chat_members) {
    if (member.is_bot) continue;
    await ctx.reply(WELCOME_MESSAGE);
  }
});

// --- Owner controls: /human and /ai toggle per chat ---
bot.command('human', async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;
  humanModeChats.add(ctx.chat.id);
  saveModes();
  await ctx.reply("🔕 AI auto-reply is OFF for this chat. I'll stay quiet — you've got it from here.");
});

bot.command('ai', async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;
  humanModeChats.delete(ctx.chat.id);
  saveModes();
  await ctx.reply("🤖 AI auto-reply is back ON for this chat.");
});

// --- Auto-reply with Claude unless this chat is in human mode ---
bot.on('message:text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return; // ignore commands here
  if (humanModeChats.has(ctx.chat.id)) return;   // owner is handling this chat

  const chatId = ctx.chat.id;
  pushHistory(chatId, 'user', ctx.message.text);

  try {
    await ctx.replyWithChatAction('typing');
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: history.get(chatId),
    });
    const reply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    pushHistory(chatId, 'assistant', reply);
    await ctx.reply(reply);
  } catch (err) {
    console.error('Claude API error:', err);
    await ctx.reply("Sorry, I'm having trouble replying right now — Jason will follow up shortly.");
  }
});

bot.catch((err) => console.error('Bot error:', err));

bot.start();
console.log('Bot is running...');
