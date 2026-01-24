// Load environment variables
require('dotenv').config();

// Import grammY
const { Bot } = require('grammy');

// Create bot instance with your token
const bot = new Bot(process.env.BOT_TOKEN);

// /start command - Welcome message
bot.command('start', async (ctx) => {
  const welcomeMessage = `
Welcome to TrustLock!

I help you exchange goods and services safely using crypto escrow.

How it works:
1. Seller creates an escrow deal
2. Buyer deposits funds (locked in smart contract)
3. Seller delivers the goods/service
4. Buyer confirms → funds released to seller

Commands:
/start - Show this message
/help - Get help
/new - Create new escrow (coming soon)

Stay safe. No more scams.
  `;
  await ctx.reply(welcomeMessage);
});

// /help command
bot.command('help', async (ctx) => {
  const helpMessage = `
TrustLock Help

Available commands:
/start - Welcome message
/help - Show this help

Coming soon:
/new @user amount "description" - Create escrow
/status deal_id - Check deal status
/release deal_id - Release funds
/dispute deal_id - Flag a problem
/rep @user - Check reputation

Questions? Contact @nobrakesnft
  `;
  await ctx.reply(helpMessage);
});

// Handle any text message (for now, just echo back)
bot.on('message:text', async (ctx) => {
  // Ignore commands (already handled above)
  if (ctx.message.text.startsWith('/')) return;

  await ctx.reply(`You said: "${ctx.message.text}"\n\nUse /help to see available commands.`);
});

// Start the bot
bot.start();

console.log('TrustLock bot is running!');
