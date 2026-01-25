// Load environment variables
require('dotenv').config();

// Import dependencies
const { Bot } = require('grammy');
const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Initialize blockchain connection
const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const USDC_ADDRESS = process.env.USDC_ADDRESS;

// Contract ABI (minimal for our needs)
const ESCROW_ABI = [
  "function createDeal(string calldata _externalId, address _seller, address _buyer, uint256 _amount) external returns (uint256)",
  "function getDealByExternalId(string calldata _externalId) external view returns (tuple(string externalId, address seller, address buyer, uint256 amount, uint8 status, uint256 createdAt, uint256 completedAt))",
  "function getReputation(address _user) external view returns (uint256 completed, uint256 volume)",
  "function externalIdToDealId(string calldata) external view returns (uint256)",
  "function deals(uint256) external view returns (string, address, address, uint256, uint8, uint256, uint256)",
  "event DealFunded(uint256 indexed dealId, address buyer, uint256 amount)",
  "event DealCompleted(uint256 indexed dealId, address seller, uint256 amount, uint256 fee)"
];

const escrowContract = new ethers.Contract(CONTRACT_ADDRESS, ESCROW_ABI, wallet);

// Create bot instance
const bot = new Bot(process.env.BOT_TOKEN);

// Generate short deal ID (e.g., "TL-A7X9")
function generateDealId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TL-${code}`;
}

// Validate Ethereum address
function isValidAddress(address) {
  return ethers.isAddress(address);
}

// /start command
bot.command('start', async (ctx) => {
  const welcomeMessage = `
Welcome to TrustLock!

I help you exchange goods and services safely using crypto escrow on Base.

How it works:
1. Register your wallet with /wallet
2. Seller creates an escrow deal
3. Buyer deposits USDC (locked in smart contract)
4. Seller delivers the goods/service
5. Buyer confirms → funds released to seller

Commands:
/wallet 0x... - Register your wallet
/new @buyer amount description - Create escrow
/fund TL-XXXX - Fund a deal (buyer)
/status TL-XXXX - Check deal status
/deals - View your active deals
/release TL-XXXX - Release funds (buyer)
/cancel TL-XXXX - Cancel a deal
/dispute TL-XXXX reason - Flag a problem
/rep - Check your reputation
/help - Get help

Network: Base Sepolia (Testnet)
Stay safe. No more scams.
  `;
  await ctx.reply(welcomeMessage);
});

// /help command
bot.command('help', async (ctx) => {
  const helpMessage = `
TrustLock Help

Setup:
/wallet 0x... - Register your Base wallet

Deal Commands:
/new @buyer 100 Logo design - Create escrow
/fund TL-XXXX - Get deposit link (buyer)
/status TL-XXXX - Check deal status
/deals - View your active deals
/release TL-XXXX - Release funds (buyer only)
/cancel TL-XXXX - Cancel deal

Disputes:
/dispute TL-XXXX reason - Flag a problem
/canceldispute TL-XXXX - Cancel your dispute

Reviews:
/review TL-XXXX 5 Great seller! - Rate 1-5
/rep - Check reputation
/rep @username - Check someone's rep

Example flow:
1. /wallet 0xYourAddress
2. Seller: /new @buyer 50 Logo design
3. Buyer: /fund TL-XXXX → Click deposit link
4. Seller delivers work
5. Buyer: /release TL-XXXX
6. Both: /review TL-XXXX 5 Great!

Contract: ${CONTRACT_ADDRESS}
Network: Base Sepolia (Testnet)

Questions? Contact @nobrakesnft
  `;
  await ctx.reply(helpMessage);
});

// /wallet command - Register wallet address
bot.command('wallet', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || 'Anonymous';
  const text = ctx.message.text;
  const match = text.match(/^\/wallet\s+(0x[a-fA-F0-9]{40})$/i);

  if (!match) {
    // Check if user has a wallet registered
    const { data: user } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('telegram_id', userId)
      .single();

    if (user?.wallet_address) {
      await ctx.reply(`Your registered wallet: ${user.wallet_address}\n\nTo change: /wallet 0xNewAddress`);
    } else {
      await ctx.reply('Register your wallet:\n/wallet 0xYourWalletAddress\n\nExample:\n/wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00');
    }
    return;
  }

  const walletAddress = match[1];

  if (!isValidAddress(walletAddress)) {
    await ctx.reply('Invalid wallet address. Please check and try again.');
    return;
  }

  // Upsert user record
  const { error } = await supabase
    .from('users')
    .upsert({
      telegram_id: userId,
      username: username,
      wallet_address: walletAddress.toLowerCase()
    }, { onConflict: 'telegram_id' });

  if (error) {
    console.error('Database error:', error);
    await ctx.reply('Failed to save wallet. Try again.');
    return;
  }

  await ctx.reply(`
✅ Wallet registered!

Address: ${walletAddress}
Network: Base Sepolia

You can now create and participate in escrow deals.
Use /new to create your first deal.
  `);
});

// /new command - Create escrow deal
bot.command('new', async (ctx) => {
  const senderId = ctx.from.id;
  const senderUsername = ctx.from.username || 'Anonymous';
  const text = ctx.message.text;

  // Parse: /new @buyer amount description
  const match = text.match(/^\/new\s+@(\w+)\s+(\d+(?:\.\d+)?)\s+(.+)$/i);

  if (!match) {
    await ctx.reply(
      `Invalid format. Use:\n/new @buyer amount description\n\nExample:\n/new @johndoe 50 Logo design`
    );
    return;
  }

  const buyerUsername = match[1];
  const amount = parseFloat(match[2]);
  const description = match[3].trim();

  // Validation
  if (amount < 1) {
    await ctx.reply('Minimum escrow amount is 1 USDC.');
    return;
  }

  if (amount > 500) {
    await ctx.reply('Maximum escrow amount is 500 USDC for MVP.');
    return;
  }

  if (buyerUsername.toLowerCase() === senderUsername.toLowerCase()) {
    await ctx.reply("You can't create an escrow with yourself.");
    return;
  }

  // Check if seller has wallet registered
  const { data: seller } = await supabase
    .from('users')
    .select('wallet_address')
    .eq('telegram_id', senderId)
    .single();

  if (!seller?.wallet_address) {
    await ctx.reply('Please register your wallet first:\n/wallet 0xYourAddress');
    return;
  }

  // Generate unique deal ID
  const dealId = generateDealId();

  // Save to database
  const { data, error } = await supabase.from('deals').insert({
    deal_id: dealId,
    seller_telegram_id: senderId,
    seller_username: senderUsername,
    buyer_telegram_id: 0,
    buyer_username: buyerUsername,
    amount: amount,
    description: description,
    status: 'pending_deposit'
  }).select();

  if (error) {
    console.error('Database error:', error);
    await ctx.reply('Failed to create deal. Please try again.');
    return;
  }

  // Confirmation message
  const confirmMessage = `
✅ Escrow Created!

Deal ID: ${dealId}
Seller: @${senderUsername}
Buyer: @${buyerUsername}
Amount: ${amount} USDC
Description: ${description}

⏳ Waiting for @${buyerUsername} to deposit

@${buyerUsername} - Next steps:
1. Register wallet: /wallet 0xYourAddress
2. Fund deal: /fund ${dealId}
3. Click the deposit link to approve & pay
  `;

  await ctx.reply(confirmMessage);
});

// /status command - Check deal status
bot.command('status', async (ctx) => {
  const text = ctx.message.text;
  const userId = ctx.from.id;
  const username = ctx.from.username;
  const match = text.match(/^\/status\s+(TL-\w+)$/i);

  if (!match) {
    await ctx.reply('Usage: /status TL-XXXX');
    return;
  }

  const dealId = match[1].toUpperCase();

  const { data: deal, error } = await supabase
    .from('deals')
    .select('*')
    .eq('deal_id', dealId)
    .single();

  if (error || !deal) {
    await ctx.reply(`Deal ${dealId} not found.`);
    return;
  }

  // Get wallet addresses
  const { data: sellerUser } = await supabase
    .from('users')
    .select('wallet_address')
    .eq('telegram_id', deal.seller_telegram_id)
    .single();

  const { data: buyerUser } = await supabase
    .from('users')
    .select('wallet_address')
    .eq('username', deal.buyer_username)
    .single();

  const statusEmoji = {
    'pending_deposit': '⏳',
    'funded': '💰',
    'completed': '✅',
    'disputed': '⚠️',
    'cancelled': '❌',
    'refunded': '↩️'
  };

  let statusMessage = `
Deal: ${deal.deal_id}
${statusEmoji[deal.status] || '❓'} Status: ${deal.status.replace('_', ' ')}

Seller: @${deal.seller_username} ${sellerUser?.wallet_address ? '✓' : '(no wallet)'}
Buyer: @${deal.buyer_username} ${buyerUser?.wallet_address ? '✓' : '(no wallet)'}
Amount: ${deal.amount} USDC
Description: ${deal.description}

Created: ${new Date(deal.created_at).toLocaleDateString()}
`;

  // If pending deposit and viewer is buyer, show deposit instructions
  const isBuyer = deal.buyer_username.toLowerCase() === username?.toLowerCase();

  if (deal.status === 'pending_deposit' && isBuyer) {
    if (!buyerUser?.wallet_address) {
      statusMessage += `\n⚠️ Register your wallet first: /wallet 0xYourAddress`;
    } else if (sellerUser?.wallet_address) {
      const amountInWei = BigInt(Math.floor(deal.amount * 1e6)); // USDC has 6 decimals
      statusMessage += `
━━━━━━━━━━━━━━━
📥 DEPOSIT INSTRUCTIONS

1. Approve USDC spending:
   • Go to Base Sepolia USDC
   • Approve ${CONTRACT_ADDRESS} to spend ${deal.amount} USDC

2. Send deposit transaction:
   • Contract: ${CONTRACT_ADDRESS}
   • Call: deposit(dealId)

Or use basescan to interact directly.
━━━━━━━━━━━━━━━`;
    }
  }

  await ctx.reply(statusMessage);
});

// /deals command - View user's deals
bot.command('deals', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username;

  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .or(`seller_telegram_id.eq.${userId},buyer_username.eq.${username}`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !data || data.length === 0) {
    await ctx.reply('No deals found. Create one with /new');
    return;
  }

  let message = 'Your Recent Deals:\n\n';

  for (const deal of data) {
    const role = deal.seller_telegram_id === userId ? 'Seller' : 'Buyer';
    const emoji = {
      'pending_deposit': '⏳',
      'funded': '💰',
      'completed': '✅',
      'disputed': '⚠️',
      'cancelled': '❌',
      'refunded': '↩️'
    }[deal.status] || '❓';
    message += `${emoji} ${deal.deal_id} | ${deal.amount} USDC | ${role}\n`;
  }

  message += '\nUse /status TL-XXXX for details';

  await ctx.reply(message);
});

// /release command - Buyer releases funds to seller
bot.command('release', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username;
  const text = ctx.message.text;
  // Support: /release TL-XXXX or /release TL-XXXX confirm (for disputed deals)
  const match = text.match(/^\/release\s+(TL-\w+)(?:\s+(confirm))?$/i);

  if (!match) {
    await ctx.reply('Usage: /release TL-XXXX');
    return;
  }

  const dealId = match[1].toUpperCase();
  const forceConfirm = match[2]?.toLowerCase() === 'confirm';

  const { data: deal, error } = await supabase
    .from('deals')
    .select('*')
    .eq('deal_id', dealId)
    .single();

  if (error || !deal) {
    await ctx.reply(`Deal ${dealId} not found.`);
    return;
  }

  if (deal.buyer_username.toLowerCase() !== username?.toLowerCase()) {
    await ctx.reply('Only the buyer can release funds.');
    return;
  }

  // Handle disputed deals - require confirmation to auto-cancel dispute
  if (deal.status === 'disputed') {
    if (!forceConfirm) {
      await ctx.reply(`
⚠️ This deal is currently disputed!

Deal: ${dealId}

Releasing funds will cancel the dispute and pay the seller.
Are you sure you want to proceed?

To confirm, use: /release ${dealId} confirm
      `);
      return;
    }
    // User confirmed - will proceed to release and cancel dispute
  } else if (deal.status !== 'funded') {
    await ctx.reply(`Cannot release. Deal status is: ${deal.status}`);
    return;
  }

  const { error: updateError } = await supabase
    .from('deals')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      dispute_cancelled_by: deal.status === 'disputed' ? username : null
    })
    .eq('deal_id', dealId);

  if (updateError) {
    await ctx.reply('Failed to release funds. Try again.');
    return;
  }

  const fee = (deal.amount * 0.015).toFixed(2);
  const sellerReceives = (deal.amount - fee).toFixed(2);

  let message = `
✅ Funds Released!

Deal: ${dealId}
Amount: ${deal.amount} USDC
Fee (1.5%): ${fee} USDC
Seller receives: ${sellerReceives} USDC
`;

  if (deal.status === 'disputed') {
    message += `
⚠️ Dispute was cancelled by buyer releasing funds.
`;
  }

  message += `
@${deal.seller_username} - Payment released by @${deal.buyer_username}

Don't forget to leave a review: /review ${dealId}
  `;

  await ctx.reply(message);

  // Notify seller
  if (deal.seller_telegram_id) {
    try {
      await bot.api.sendMessage(deal.seller_telegram_id, `
🎉 Payment Released!

Deal: ${dealId}
Amount: ${sellerReceives} USDC (after 1.5% fee)
Buyer: @${deal.buyer_username}
${deal.status === 'disputed' ? '\n⚠️ Dispute was cancelled - buyer released funds.' : ''}
Leave a review: /review ${dealId}
      `);
    } catch (e) {
      console.error('Failed to notify seller:', e.message);
    }
  }
});

// /cancel command
bot.command('cancel', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username;
  const text = ctx.message.text;
  const match = text.match(/^\/cancel\s+(TL-\w+)$/i);

  if (!match) {
    await ctx.reply('Usage: /cancel TL-XXXX');
    return;
  }

  const dealId = match[1].toUpperCase();

  const { data: deal, error } = await supabase
    .from('deals')
    .select('*')
    .eq('deal_id', dealId)
    .single();

  if (error || !deal) {
    await ctx.reply(`Deal ${dealId} not found.`);
    return;
  }

  const isSeller = deal.seller_telegram_id === userId;
  const isBuyer = deal.buyer_username.toLowerCase() === username?.toLowerCase();

  if (!isSeller && !isBuyer) {
    await ctx.reply('You are not part of this deal.');
    return;
  }

  if (!['pending_deposit', 'funded'].includes(deal.status)) {
    await ctx.reply(`Cannot cancel. Deal status is: ${deal.status}`);
    return;
  }

  if (deal.status === 'pending_deposit' && isSeller) {
    await supabase
      .from('deals')
      .update({ status: 'cancelled' })
      .eq('deal_id', dealId);

    await ctx.reply(`Deal ${dealId} has been cancelled.`);
    return;
  }

  await supabase
    .from('deals')
    .update({ status: 'cancelled' })
    .eq('deal_id', dealId);

  await ctx.reply(`
❌ Deal Cancelled

Deal: ${dealId}

If funds were deposited on-chain, contact @nobrakesnft for refund.

@${deal.seller_username} @${deal.buyer_username} - Deal has been cancelled.
  `);
});

// /dispute command
bot.command('dispute', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username;
  const text = ctx.message.text;
  const match = text.match(/^\/dispute\s+(TL-\w+)(?:\s+(.+))?$/i);

  if (!match) {
    await ctx.reply('Usage: /dispute TL-XXXX reason');
    return;
  }

  const dealId = match[1].toUpperCase();
  const reason = match[2] || 'No reason provided';

  const { data: deal, error } = await supabase
    .from('deals')
    .select('*')
    .eq('deal_id', dealId)
    .single();

  if (error || !deal) {
    await ctx.reply(`Deal ${dealId} not found.`);
    return;
  }

  const isSeller = deal.seller_telegram_id === userId;
  const isBuyer = deal.buyer_username.toLowerCase() === username?.toLowerCase();

  if (!isSeller && !isBuyer) {
    await ctx.reply('You are not part of this deal.');
    return;
  }

  if (deal.status !== 'funded') {
    await ctx.reply(`Cannot dispute. Deal status is: ${deal.status}`);
    return;
  }

  await supabase
    .from('deals')
    .update({
      status: 'disputed',
      disputed_by: username,
      dispute_reason: reason,
      disputed_at: new Date().toISOString()
    })
    .eq('deal_id', dealId);

  const disputedBy = isSeller ? 'Seller' : 'Buyer';

  await ctx.reply(`
⚠️ Dispute Filed

Deal: ${dealId}
Filed by: ${disputedBy} (@${username})
Reason: ${reason}

Funds are locked. Platform owner will review.

@${deal.seller_username} @${deal.buyer_username} - Deal under dispute.

To cancel this dispute: /canceldispute ${dealId}
Or buyer can release funds: /release ${dealId}

Contact @nobrakesnft for resolution.
  `);

  // Notify the other party
  const otherPartyId = isSeller ? null : deal.seller_telegram_id;
  if (otherPartyId) {
    try {
      await bot.api.sendMessage(otherPartyId, `
⚠️ Dispute Filed on Deal ${dealId}

By: @${username} (${disputedBy})
Reason: ${reason}

Respond or provide evidence to @nobrakesnft
Or cancel dispute: /canceldispute ${dealId}
      `);
    } catch (e) {
      console.error('Failed to notify other party:', e.message);
    }
  }
});

// /canceldispute command - Cancel a dispute you opened
bot.command('canceldispute', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username;
  const text = ctx.message.text;
  const match = text.match(/^\/canceldispute\s+(TL-\w+)$/i);

  if (!match) {
    await ctx.reply('Usage: /canceldispute TL-XXXX');
    return;
  }

  const dealId = match[1].toUpperCase();

  const { data: deal, error } = await supabase
    .from('deals')
    .select('*')
    .eq('deal_id', dealId)
    .single();

  if (error || !deal) {
    await ctx.reply(`Deal ${dealId} not found.`);
    return;
  }

  if (deal.status !== 'disputed') {
    await ctx.reply(`Deal is not disputed. Status: ${deal.status}`);
    return;
  }

  // Only the person who opened the dispute can cancel it
  if (deal.disputed_by?.toLowerCase() !== username?.toLowerCase()) {
    await ctx.reply(`Only @${deal.disputed_by} (who opened the dispute) can cancel it.`);
    return;
  }

  await supabase
    .from('deals')
    .update({
      status: 'funded',
      dispute_cancelled_by: username,
      dispute_cancelled_at: new Date().toISOString()
    })
    .eq('deal_id', dealId);

  await ctx.reply(`
✅ Dispute Cancelled

Deal: ${dealId}
Cancelled by: @${username}

Deal is now back to funded status.
Buyer can release funds with: /release ${dealId}

@${deal.seller_username} @${deal.buyer_username} - Dispute has been resolved.
  `);

  // Notify other party
  const isSeller = deal.seller_telegram_id === userId;
  const otherPartyId = isSeller ? null : deal.seller_telegram_id;
  if (otherPartyId) {
    try {
      await bot.api.sendMessage(otherPartyId, `
✅ Dispute Cancelled on Deal ${dealId}

@${username} has cancelled the dispute.
Deal is back to normal - awaiting release.
      `);
    } catch (e) {
      console.error('Failed to notify:', e.message);
    }
  }
});

// /review command - Leave a review after deal completion
bot.command('review', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username;
  const text = ctx.message.text;
  // Format: /review TL-XXXX 5 Great seller, fast delivery!
  const match = text.match(/^\/review\s+(TL-\w+)\s+([1-5])(?:\s+(.+))?$/i);

  if (!match) {
    await ctx.reply(`
📝 Leave a Review

Usage: /review TL-XXXX [1-5] [comment]

Examples:
/review TL-ABCD 5 Great experience!
/review TL-ABCD 4 Good but slow delivery
/review TL-ABCD 3

Rating scale:
⭐⭐⭐⭐⭐ (5) - Excellent
⭐⭐⭐⭐ (4) - Good
⭐⭐⭐ (3) - Average
⭐⭐ (2) - Poor
⭐ (1) - Terrible
    `);
    return;
  }

  const dealId = match[1].toUpperCase();
  const rating = parseInt(match[2]);
  const comment = match[3]?.trim() || '';

  const { data: deal, error } = await supabase
    .from('deals')
    .select('*')
    .eq('deal_id', dealId)
    .single();

  if (error || !deal) {
    await ctx.reply(`Deal ${dealId} not found.`);
    return;
  }

  if (deal.status !== 'completed') {
    await ctx.reply('Can only review completed deals.');
    return;
  }

  const isSeller = deal.seller_telegram_id === userId;
  const isBuyer = deal.buyer_username.toLowerCase() === username?.toLowerCase();

  if (!isSeller && !isBuyer) {
    await ctx.reply('You are not part of this deal.');
    return;
  }

  // Check if already reviewed
  const reviewField = isSeller ? 'seller_review' : 'buyer_review';
  const ratingField = isSeller ? 'seller_rating' : 'buyer_rating';

  if (deal[reviewField]) {
    await ctx.reply('You have already reviewed this deal.');
    return;
  }

  // Save review
  const updateData = {
    [reviewField]: comment || 'No comment',
    [ratingField]: rating,
    [`${reviewField}_at`]: new Date().toISOString()
  };

  await supabase
    .from('deals')
    .update(updateData)
    .eq('deal_id', dealId);

  const stars = '⭐'.repeat(rating);
  const role = isSeller ? 'seller' : 'buyer';
  const reviewedParty = isSeller ? deal.buyer_username : deal.seller_username;

  await ctx.reply(`
✅ Review Submitted!

Deal: ${dealId}
Your rating for @${reviewedParty}: ${stars} (${rating}/5)
${comment ? `Comment: ${comment}` : ''}

Thank you for your feedback!
  `);

  // Notify the reviewed party
  const otherPartyId = isSeller ? null : deal.seller_telegram_id;
  if (otherPartyId) {
    try {
      await bot.api.sendMessage(otherPartyId, `
📝 New Review Received!

Deal: ${dealId}
From: @${username} (${role})
Rating: ${stars} (${rating}/5)
${comment ? `Comment: "${comment}"` : ''}
      `);
    } catch (e) {
      console.error('Failed to notify:', e.message);
    }
  }
});

// /resolve command - Owner only
bot.command('resolve', async (ctx) => {
  const username = ctx.from.username;

  if (username?.toLowerCase() !== 'nobrakesnft') {
    await ctx.reply('Only the platform owner can resolve disputes.');
    return;
  }

  const text = ctx.message.text;
  const match = text.match(/^\/resolve\s+(TL-\w+)\s+(release|refund)$/i);

  if (!match) {
    await ctx.reply('Usage: /resolve TL-XXXX release|refund');
    return;
  }

  const dealId = match[1].toUpperCase();
  const decision = match[2].toLowerCase();

  const { data: deal, error } = await supabase
    .from('deals')
    .select('*')
    .eq('deal_id', dealId)
    .single();

  if (error || !deal) {
    await ctx.reply(`Deal ${dealId} not found.`);
    return;
  }

  if (deal.status !== 'disputed') {
    await ctx.reply(`Deal is not disputed. Status: ${deal.status}`);
    return;
  }

  const newStatus = decision === 'release' ? 'completed' : 'refunded';
  const winner = decision === 'release' ? deal.seller_username : deal.buyer_username;

  await supabase
    .from('deals')
    .update({
      status: newStatus,
      completed_at: new Date().toISOString()
    })
    .eq('deal_id', dealId);

  await ctx.reply(`
⚖️ Dispute Resolved

Deal: ${dealId}
Decision: ${decision === 'release' ? 'Funds → Seller' : 'Refund → Buyer'}
Winner: @${winner}

@${deal.seller_username} @${deal.buyer_username} - Dispute resolved.
  `);
});

// /fund command - Create on-chain deal and get deposit link
bot.command('fund', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username;
  const text = ctx.message.text;
  const match = text.match(/^\/fund\s+(TL-\w+)$/i);

  if (!match) {
    await ctx.reply('Usage: /fund TL-XXXX');
    return;
  }

  const dealId = match[1].toUpperCase();

  // Get deal from database
  const { data: deal, error } = await supabase
    .from('deals')
    .select('*')
    .eq('deal_id', dealId)
    .single();

  if (error || !deal) {
    await ctx.reply(`Deal ${dealId} not found.`);
    return;
  }

  // Only buyer can fund
  if (deal.buyer_username.toLowerCase() !== username?.toLowerCase()) {
    await ctx.reply('Only the buyer can fund this deal.');
    return;
  }

  if (deal.status !== 'pending_deposit') {
    await ctx.reply(`Cannot fund. Deal status is: ${deal.status}`);
    return;
  }

  // Get both wallets
  const { data: sellerUser } = await supabase
    .from('users')
    .select('wallet_address')
    .eq('telegram_id', deal.seller_telegram_id)
    .single();

  const { data: buyerUser } = await supabase
    .from('users')
    .select('wallet_address')
    .eq('username', username)
    .single();

  if (!sellerUser?.wallet_address) {
    await ctx.reply(`Seller @${deal.seller_username} hasn't registered their wallet yet.`);
    return;
  }

  if (!buyerUser?.wallet_address) {
    await ctx.reply('Please register your wallet first: /wallet 0xYourAddress');
    return;
  }

  // Check if already on-chain (in database)
  if (deal.contract_deal_id) {
    const depositLink = `https://nobrakesnft.github.io/TrustLock?deal=${dealId}`;

    await ctx.reply(`
Deal already on blockchain!

Deal ID: ${dealId}

👇 TAP TO DEPOSIT:
${depositLink}
    `);
    return;
  }

  // Check if deal exists on-chain already
  try {
    const existingDealId = await escrowContract.externalIdToDealId(dealId);
    if (existingDealId.toString() !== '0') {
      // Deal already exists on-chain, update database
      await supabase
        .from('deals')
        .update({ contract_deal_id: dealId })
        .eq('deal_id', dealId);

      const depositLink = `https://nobrakesnft.github.io/TrustLock?deal=${dealId}`;

      await ctx.reply(`
Deal already on blockchain!

Deal ID: ${dealId}

👇 TAP TO DEPOSIT:
${depositLink}
      `);
      return;
    }
  } catch (e) {
    // Deal doesn't exist, continue to create
  }

  await ctx.reply('Creating deal on blockchain... Please wait.');

  try {
    // Create deal on-chain
    const amountInWei = BigInt(Math.floor(deal.amount * 1e6)); // USDC has 6 decimals

    const tx = await escrowContract.createDeal(
      dealId,
      sellerUser.wallet_address,
      buyerUser.wallet_address,
      amountInWei
    );

    await ctx.reply(`Transaction sent!\nTx: https://sepolia.basescan.org/tx/${tx.hash}`);

    await tx.wait();

    // Update database
    await supabase
      .from('deals')
      .update({
        contract_deal_id: dealId,
        tx_hash: tx.hash
      })
      .eq('deal_id', dealId);

    const depositLink = `https://nobrakesnft.github.io/TrustLock?deal=${dealId}`;

    await ctx.reply(`
✅ Deal registered on blockchain!

Deal ID: ${dealId}
Amount: ${deal.amount} USDC

👇 TAP TO DEPOSIT:
${depositLink}

1. Click the link above
2. Connect your wallet
3. Approve & Deposit

That's it! Funds will be locked in escrow.
    `);

  } catch (error) {
    console.error('Blockchain error:', error);
    await ctx.reply(`Failed to create on-chain deal: ${error.message}`);
  }
});

// /rep command - Check reputation
bot.command('rep', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username;
  const text = ctx.message.text;

  // Check if checking someone else's rep
  const match = text.match(/^\/rep\s+@(\w+)$/i);
  const targetUsername = match ? match[1] : username;

  // Get user's wallet
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('username', targetUsername)
    .single();

  if (!user) {
    await ctx.reply(`User @${targetUsername} not found. They need to register with /wallet first.`);
    return;
  }

  // Count deals
  const { data: completedDeals } = await supabase
    .from('deals')
    .select('amount')
    .or(`seller_username.eq.${targetUsername},buyer_username.eq.${targetUsername}`)
    .eq('status', 'completed');

  const { data: disputedDeals } = await supabase
    .from('deals')
    .select('id')
    .or(`seller_username.eq.${targetUsername},buyer_username.eq.${targetUsername}`)
    .eq('status', 'disputed');

  const totalDeals = completedDeals?.length || 0;
  const totalVolume = completedDeals?.reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;
  const disputes = disputedDeals?.length || 0;

  // Calculate trust level
  let trustLevel = '🆕 New';
  if (totalDeals >= 10 && disputes === 0) trustLevel = '⭐ Trusted';
  else if (totalDeals >= 5) trustLevel = '✓ Verified';
  else if (totalDeals >= 1) trustLevel = '👤 Active';

  await ctx.reply(`
📊 Reputation: @${targetUsername}

${trustLevel}

Completed deals: ${totalDeals}
Total volume: ${totalVolume.toFixed(2)} USDC
Disputes: ${disputes}

Wallet: ${user.wallet_address || 'Not registered'}
  `);
});

// Handle unknown text
bot.on('message:text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return;
  await ctx.reply('Use /help to see available commands.');
});

// ============================================
// BLOCKCHAIN STATUS POLLING (More reliable than event filters)
// ============================================

// Polling fallback - check pending deals every 30 seconds
async function pollPendingDeals() {
  try {
    // Get all pending_deposit deals that have contract_deal_id
    const { data: pendingDeals } = await supabase
      .from('deals')
      .select('*')
      .eq('status', 'pending_deposit')
      .not('contract_deal_id', 'is', null);

    if (!pendingDeals || pendingDeals.length === 0) return;

    for (const dbDeal of pendingDeals) {
      try {
        // Check on-chain status
        const chainDealId = await escrowContract.externalIdToDealId(dbDeal.deal_id);
        if (chainDealId.toString() === '0') continue;

        const onChainDeal = await escrowContract.deals(chainDealId);
        const onChainStatus = Number(onChainDeal[4]); // status is 5th element

        // Status: 0=Pending, 1=Funded, 2=Completed, 3=Refunded, 4=Disputed, 5=Cancelled
        if (onChainStatus === 1 && dbDeal.status === 'pending_deposit') {
          console.log(`Poll found funded deal: ${dbDeal.deal_id}`);

          // Update status
          await supabase
            .from('deals')
            .update({
              status: 'funded',
              funded_at: new Date().toISOString()
            })
            .eq('deal_id', dbDeal.deal_id);

          // Notify seller
          if (dbDeal.seller_telegram_id) {
            await bot.api.sendMessage(dbDeal.seller_telegram_id, `
💰 Payment Received!

Deal: ${dbDeal.deal_id}
Amount: ${dbDeal.amount} USDC
Buyer: @${dbDeal.buyer_username}

The buyer has funded the escrow. Deliver your goods/service now.

Once delivered, ask buyer to release with /release ${dbDeal.deal_id}
            `);
          }

          // Notify buyer
          const { data: buyerUser } = await supabase
            .from('users')
            .select('telegram_id')
            .eq('username', dbDeal.buyer_username)
            .single();

          if (buyerUser?.telegram_id) {
            await bot.api.sendMessage(buyerUser.telegram_id, `
✅ Deposit Confirmed!

Deal: ${dbDeal.deal_id}
Amount: ${dbDeal.amount} USDC

Your funds are now safely locked. Release with /release ${dbDeal.deal_id} after receiving goods.
            `);
          }
        }
      } catch (e) {
        console.error(`Error checking deal ${dbDeal.deal_id}:`, e.message);
      }
    }
  } catch (e) {
    console.error('Poll error:', e.message);
  }
}

// Start the bot
bot.start();
console.log('TrustLock bot is running!');
console.log('Contract:', CONTRACT_ADDRESS);

// Start polling for deal status (every 30 seconds)
setInterval(pollPendingDeals, 30000);
pollPendingDeals(); // Run immediately on start
console.log('Polling for deal status every 30 seconds');
