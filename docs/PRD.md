# DealPact MVP — Product Requirements Document

> Generated: January 2025
> Updated: February 2025
> Status: **LAUNCHED ON MAINNET**
> Contract: `0x116511753bf00671bc321f2e3364159Fe502ed22` (Base)
> PMF Score: 9.1/10

---

## 1. Executive Summary

DealPact is a Telegram bot that lets crypto freelancers and digital goods sellers get paid safely through smart contract escrow on Base. The buyer deposits USDC, the seller delivers, and funds release only when both agree — or the platform owner resolves disputes. No website needed, no complex wallet UX, just simple bot commands in Telegram where crypto communities already live.

---

## 2. Problem Statement

### Pain Points

| Problem | Evidence |
|---------|----------|
| **Freelancer scams** | Crypto freelancers get ghosted after delivering work — no PayPal protection in crypto |
| **Buyer scams** | Buyers pay, never receive goods — especially for digital codes, designs, services |
| **Trust barrier** | Strangers won't transact because neither wants to send first |
| **Platform lock-in** | Existing escrow platforms are clunky websites, not where users actually are (Telegram) |

### Current Solutions & Gaps

| Solution | Gap |
|----------|-----|
| **Traditional escrow (Escrow.com)** | No crypto, slow, high fees, requires KYC |
| **Web3 escrow (Uniscrow, Cryptegrity)** | Website-based, clunky UX, not Telegram-native |
| **Trusted middlemen in groups** | Relies on humans who can scam or disappear |
| **"You go first" trust** | Literally gambling |

### Why Now?
- Base chain is mature with low fees (~$0.01 per transaction)
- Post-FTX trust crisis — people want trustless solutions
- Telegram is THE hub for crypto communities
- No Telegram-native escrow exists

---

## 3. Target Users

### Primary Persona: "Alex the Crypto Freelancer"

| Attribute | Details |
|-----------|---------|
| **Age** | 22-35 |
| **Location** | Global (Nigeria, Philippines, Eastern Europe, US) |
| **Work** | Designer, developer, writer, VA — paid in crypto |
| **Behavior** | Lives in Telegram/Discord, has MetaMask, holds USDC |
| **Pain** | Lost $500 last month to a client who ghosted after delivery |
| **Need** | Simple way to guarantee payment before starting work |
| **Tech comfort** | Can use a Telegram bot, has used Uniswap before |

### Secondary Persona: "Jordan the Digital Goods Seller"
Sells game keys, premium accounts, software licenses in Telegram groups. Needs buyers to trust they'll actually receive the code.

---

## 4. Solution Overview

### Core Value Proposition
> "Get paid in crypto without getting scammed — right inside Telegram."

### Key Differentiators

| Feature | DealPact | Competitors |
|---------|-----------|-------------|
| **Interface** | Telegram bot | Website |
| **Onboarding** | 0 steps, just use bot | Create account, connect wallet, etc. |
| **Chain** | Base (cheap) | ETH mainnet (expensive) |
| **Target** | Freelancers & digital goods | General/B2B |
| **Reputation** | On-chain, portable | Platform-locked or none |

---

## 5. Feature Requirements

### MVP (P0) — Must Have for Launch ✅ ALL COMPLETE

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 1 | **Create Escrow** | `/new @buyer 100 USDC "Logo design"` creates a deal | ✅ |
| 2 | **Deposit Funds** | Buyer clicks link → deposits USDC to smart contract | ✅ |
| 3 | **Release Funds** | Buyer confirms → funds go to seller (minus 1.5% fee) | ✅ |
| 4 | **Cancel/Refund** | Both parties agree → funds return to buyer | ✅ |
| 5 | **Dispute Flag** | Either party flags dispute → owner notified | ✅ |
| 6 | **Manual Resolution** | Owner reviews, decides fund release | ✅ |
| 7 | **Deal Status** | `/status [deal_id]` shows current state | ✅ |
| 8 | **Reputation Counter** | Track successful deals per wallet (on-chain) | ✅ |
| 9 | **Review System** | Star ratings + comments after deals | ✅ |
| 10 | **Wallet Registration** | Interactive button to register/update wallet | ✅ |
| 11 | **Evidence System** | Submit text/photo evidence in disputes | ✅ |
| 12 | **Moderator System** | Assign mods to handle disputes | ✅ |

### Phase 2 (P1) — Add After MVP Works

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 1 | **Milestone Payments** | Split payment into stages | Planned |
| 2 | **Reputation Badges** | Visual trust levels (New/Verified/Trusted) | ✅ Done |
| 3 | **Auto-release Timer** | Funds release after X days if buyer silent | ✅ Done (24hr reminder) |
| 4 | **Multiple Arbiters** | Community members can resolve disputes | ✅ Done (Mod system) |
| 5 | **Simple Web Dashboard** | View your deals history | ✅ Done (Frontend) |

### Phase 3 (P2) — Future Nice-to-Haves

| # | Feature |
|---|---------|
| 1 | WL spot verification |
| 2 | EAS attestations for portable reputation |
| 3 | AI-assisted dispute resolution |
| 4 | Multi-chain support (Solana, Arbitrum) |
| 5 | Fiat on-ramp integration |

---

## 6. User Stories

### Story 1: Create Escrow
```
AS a seller
I WANT to create an escrow deal with a command
SO THAT my buyer can deposit funds safely

ACCEPTANCE CRITERIA:
- Bot responds with deal ID and deposit link
- Buyer is notified via Telegram
- Deal shows as "pending deposit"
```

### Story 2: Deposit Funds
```
AS a buyer
I WANT to deposit USDC to the escrow
SO THAT the seller knows I'm serious and funds are locked

ACCEPTANCE CRITERIA:
- Clicking link opens wallet to approve + deposit
- Contract locks exactly the specified amount
- Both parties notified: "Funds locked"
- 1.5% fee calculated but not deducted yet
```

### Story 3: Release Funds
```
AS a buyer
I WANT to release funds after receiving my deliverable
SO THAT the seller gets paid

ACCEPTANCE CRITERIA:
- /release [deal_id] triggers release
- Seller receives amount minus 1.5% fee
- Both parties notified: "Deal complete"
- Reputation counter increments for both
```

### Story 4: Dispute a Deal
```
AS a buyer or seller
I WANT to flag a dispute if something's wrong
SO THAT a neutral party can help resolve it

ACCEPTANCE CRITERIA:
- /dispute [deal_id] "reason" flags the deal
- Funds remain locked
- Platform owner receives Telegram notification
- Deal status changes to "disputed"
```

### Story 5: Resolve Dispute
```
AS the platform owner
I WANT to review disputes and decide the outcome
SO THAT deals don't stay stuck forever

ACCEPTANCE CRITERIA:
- Owner can /resolve [deal_id] [release|refund]
- Funds go to winner
- Both parties notified with resolution
- Deal marked "resolved"
```

### Story 6: Check Reputation
```
AS a user
I WANT to see someone's reputation score
SO THAT I can decide if I trust them

ACCEPTANCE CRITERIA:
- /rep [wallet or @username] shows stats
- Displays: total deals, success rate, volume
- Shows badge level if applicable
```

### Story 7: Cancel Deal
```
AS a buyer or seller
I WANT to cancel a deal both parties agree to cancel
SO THAT funds are returned without dispute

ACCEPTANCE CRITERIA:
- Both parties must /cancel [deal_id]
- After both confirm, funds return to buyer
- No fee charged on cancellations
- Deal marked "cancelled"
```

---

## 7. Technical Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Bot** | Node.js + grammY | Simple Telegram bot framework, great docs |
| **Smart Contract** | Solidity on Base | Low fees, EVM compatible, lots of tutorials |
| **Database** | Supabase (Postgres) | Free tier, easy setup, real-time features |
| **Wallet Connection** | WalletConnect / Coinbase Wallet | Users click link, connect, deposit |
| **Hosting** | Railway or Vercel | Free/cheap, easy deploy from GitHub |

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        TELEGRAM                              │
│                                                              │
│   User sends: /new @buyer 100 USDC "Logo design"            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    DEALPACT BOT                             │
│                    (Node.js + grammY)                        │
│                                                              │
│   • Parses commands                                          │
│   • Creates deal records                                     │
│   • Generates deposit links                                  │
│   • Sends notifications                                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
┌─────────────────────────┐ ┌─────────────────────────────────┐
│       SUPABASE          │ │      BASE BLOCKCHAIN            │
│       (Database)        │ │      (Smart Contract)           │
│                         │ │                                 │
│ • Deal records          │ │ • Lock USDC                     │
│ • User mappings         │ │ • Release to seller             │
│ • Dispute history       │ │ • Refund to buyer               │
│ • Off-chain reputation  │ │ • On-chain reputation counter   │
└─────────────────────────┘ └─────────────────────────────────┘
```

### Smart Contract Functions

```solidity
createDeal(buyer, seller, amount, description) → Returns dealId
deposit(dealId) → Buyer sends USDC, locked in contract
release(dealId) → Only buyer can call, sends funds to seller
refund(dealId) → Only owner can call (disputes), returns to buyer
cancel(dealId) → Both parties must call, returns to buyer
```

---

## 8. Success Metrics

### North Star Metric
**Total Value Locked (TVL) in active escrows**

### Targets

| Metric | Month 1 | Month 6 |
|--------|---------|---------|
| Active escrows created | 50 | 500 |
| Successful completions | 40 | 450 |
| Dispute rate | <10% | <5% |
| Repeat users | 20% | 40% |
| Total volume (USDC) | $5,000 | $100,000 |
| Revenue (1.5% fees) | $75 | $1,500 |

---

## 9. Go-to-Market Strategy

### Week 1-2: Soft Launch
- Find 5-10 crypto freelancers in communities
- Offer to escrow their next deal for FREE
- Get feedback, fix bugs

### Week 3-4: Community Seeding
- Post in crypto freelancer Telegrams/Discords
- Share screenshots of successful deals
- Target: Web3 job boards, NFT alpha groups

### Month 2+: Organic Growth
- Let virality work (both parties must join)
- Add "Powered by DealPact" to deal confirmations

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Smart contract bug** | Start with $500 max limit, get audited before scaling |
| **Owner key compromised** | Use hardware wallet, multi-sig later |
| **Dispute overload** | Cap active disputes, charge dispute fee |
| **Low adoption** | First 10 escrows free, seed communities |

---

## 11. Implementation Phases

### Phase 1: Foundation (Weeks 1-3) ✅ COMPLETE
- [x] Set up development environment
- [x] Create Telegram bot with BotFather
- [x] Build basic bot that responds to /start
- [x] Learn Solidity basics
- [x] Deploy simple contract on Base testnet
- [x] Set up Supabase project

### Phase 2: Core Escrow (Weeks 4-7) ✅ COMPLETE
- [x] Write escrow smart contract
- [x] Test contract on Base Sepolia testnet
- [x] Connect bot to Supabase
- [x] Implement /new command
- [x] Generate deposit links
- [x] Implement /release command
- [x] Implement /dispute and /resolve

### Phase 3: Polish & Launch (Weeks 8-10) ✅ COMPLETE
- [x] Add reputation counter
- [x] Implement /rep command
- [x] Add fee collection (1.5%)
- [x] Error handling
- [x] Test with real USDC (small amounts)
- [x] Get 5 beta users
- [x] Soft launch
- [x] Deploy to Base Mainnet
- [x] Verify contract on Basescan

### Phase 4: Post-Launch Improvements ✅ COMPLETE
- [x] Review/rating system with comments
- [x] Interactive wallet registration buttons
- [x] Update wallet feature
- [x] Button-based UI navigation
- [x] Evidence submission for disputes (text + photos)
- [x] Moderator system for dispute handling
- [x] Admin panel with logs
- [x] 24-hour release reminders
- [x] On-chain dispute marking

---

## 12. Open Questions (RESOLVED)

| Question | Decision |
|----------|----------|
| Max escrow limit for MVP? | $500 USDC ✅ |
| Dispute resolution SLA? | 48 hours max ✅ |
| Auto-refund if owner unavailable? | After 7 days ✅ |
| Multi-language? | English only for MVP ✅ |
| Which USDC? | Native USDC on Base ✅ |

---

## 13. Launch Roadmap

### Completed Milestones
- [x] Smart contract deployed to Base Mainnet
- [x] Contract verified on Basescan
- [x] Bot running with all core features
- [x] Review/rating system with comments
- [x] Wallet registration buttons
- [x] Moderator system
- [x] Evidence submission
- [x] Frontend deposit/release interface

### Next Steps (Post-Launch)
- [ ] Onboard first 10 real users
- [ ] Monitor for bugs in production
- [ ] Gather user feedback
- [ ] Marketing push in crypto freelancer communities
- [ ] Consider milestone payments feature
- [ ] Multi-chain expansion (Arbitrum, Optimism)
- [ ] Mobile-friendly frontend improvements

---

*DealPact is LIVE on Base Mainnet. Ship it!*
