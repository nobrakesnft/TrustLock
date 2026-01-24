# TrustLock MVP — Product Requirements Document

> Generated: January 2025
> Status: Ready to Build
> PMF Score: 9.1/10

---

## 1. Executive Summary

TrustLock is a Telegram bot that lets crypto freelancers and digital goods sellers get paid safely through smart contract escrow on Base. The buyer deposits USDC, the seller delivers, and funds release only when both agree — or the platform owner resolves disputes. No website needed, no complex wallet UX, just simple bot commands in Telegram where crypto communities already live.

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

| Feature | TrustLock | Competitors |
|---------|-----------|-------------|
| **Interface** | Telegram bot | Website |
| **Onboarding** | 0 steps, just use bot | Create account, connect wallet, etc. |
| **Chain** | Base (cheap) | ETH mainnet (expensive) |
| **Target** | Freelancers & digital goods | General/B2B |
| **Reputation** | On-chain, portable | Platform-locked or none |

---

## 5. Feature Requirements

### MVP (P0) — Must Have for Launch

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Create Escrow** | `/new @buyer 100 USDC "Logo design"` creates a deal |
| 2 | **Deposit Funds** | Buyer clicks link → deposits USDC to smart contract |
| 3 | **Release Funds** | Buyer confirms → funds go to seller (minus 1.5% fee) |
| 4 | **Cancel/Refund** | Both parties agree → funds return to buyer |
| 5 | **Dispute Flag** | Either party flags dispute → owner notified |
| 6 | **Manual Resolution** | Owner reviews, decides fund release |
| 7 | **Deal Status** | `/status [deal_id]` shows current state |
| 8 | **Reputation Counter** | Track successful deals per wallet (on-chain) |

### Phase 2 (P1) — Add After MVP Works

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Milestone Payments** | Split payment into stages |
| 2 | **Reputation Badges** | Visual trust levels (New/Verified/Trusted) |
| 3 | **Auto-release Timer** | Funds release after X days if buyer silent |
| 4 | **Multiple Arbiters** | Community members can resolve disputes |
| 5 | **Simple Web Dashboard** | View your deals history |

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
│                    TRUSTLOCK BOT                             │
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
- Add "Powered by TrustLock" to deal confirmations

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

### Phase 1: Foundation (Weeks 1-3)
- [ ] Set up development environment
- [ ] Create Telegram bot with BotFather
- [ ] Build basic bot that responds to /start
- [ ] Learn Solidity basics
- [ ] Deploy simple contract on Base testnet
- [ ] Set up Supabase project

### Phase 2: Core Escrow (Weeks 4-7)
- [ ] Write escrow smart contract
- [ ] Test contract on Base Sepolia testnet
- [ ] Connect bot to Supabase
- [ ] Implement /new command
- [ ] Generate deposit links
- [ ] Implement /release command
- [ ] Implement /dispute and /resolve

### Phase 3: Polish & Launch (Weeks 8-10)
- [ ] Add reputation counter
- [ ] Implement /rep command
- [ ] Add fee collection (1.5%)
- [ ] Error handling
- [ ] Test with real USDC (small amounts)
- [ ] Get 5 beta users
- [ ] Soft launch

---

## 12. Open Questions

1. Max escrow limit for MVP? → Recommend $500
2. Dispute resolution SLA? → 48 hours max
3. Auto-refund if owner unavailable? → After 7 days
4. Multi-language? → English only for MVP
5. Which USDC? → Native USDC on Base

---

*This PRD is your blueprint. Reference it whenever you're unsure what to build next.*
