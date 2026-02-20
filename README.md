# 💎 TipJar — Content Creator Tip Platform on Algorand

> A decentralized tipping platform built on the **Algorand blockchain** that lets supporters send ALGO tips to their favorite content creators — bloggers, artists, musicians, and photographers.

![Algorand](https://img.shields.io/badge/Blockchain-Algorand-black?logo=algorand)
![TypeScript](https://img.shields.io/badge/Smart%20Contract-TypeScript-blue?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)
![AlgoKit](https://img.shields.io/badge/AlgoKit-v2.6%2B-purple)
![Node](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js)

---

## 🌟 Overview

**TipJar** is a full-stack blockchain application where content creators register profiles and supporters send ALGO cryptocurrency tips as appreciation. The platform features NFT appreciation badges, revenue splitting with collaborators, on-chain tip verification, and rich analytics — all powered by an Algorand smart contract written in TypeScript.

### What's Included

- **Smart Contract** — Written in Algorand TypeScript, compiled to TEAL via Puya-TS
- **7-Page Single-Page App** — Vanilla HTML/CSS/JS frontend (no framework dependencies)
- **Embeddable Widget** — Standalone `<script>` tag for external websites
- **Real Wallet Integration** — Pera Wallet & Defly Wallet via official SDKs
- **Demo Mode** — Fully functional testing with simulated data (no wallet required)

---

## ✨ Features

### Core Platform

| Feature | Description |
|---------|-------------|
| **Creator Registration** | Register with name, bio, category (blogger/artist/musician/photographer), and profile image |
| **ALGO Tipping** | Preset amounts (0.5 – 25 ALGO) or custom input with optional messages |
| **Minimum Tip Enforcement** | Configurable minimum tip amount (default: 0.1 ALGO) |
| **Platform Fee** | Adjustable fee in basis points (default: 1%, max: 10%) |
| **Inner Transaction Payout** | Tips forwarded to creators automatically via inner transactions |
| **Leaderboard** | Rankings for top creators and top supporters |
| **Search & Filter** | Browse creators by category or search by name/bio |
| **Live Tip Feed** | Real-time feed of all tips across the platform |

### Enhanced Features

| Feature | Description |
|---------|-------------|
| 🏅 **NFT Appreciation Badges** | Supporters earn **Bronze** / **Silver** / **Gold** / **Diamond** badges based on total tips sent. Minted as Algorand Standard Assets (ASAs) |
| 💰 **Revenue Split** | Creators configure automatic revenue sharing with collaborators (0–50%). Applied on every tip via inner transactions |
| ✅ **On-Chain Verification** | Verify any creator's tip history and totals directly from the blockchain |
| 📊 **Analytics Dashboard** | Interactive bar charts (daily/weekly tip volume) and donut charts (category breakdown, top supporters) drawn with Canvas API |
| 🧩 **Embeddable Widget** | Self-contained widget for any website with light / dark / gradient themes |

### Wallet Support

| Wallet | Type | Description |
|--------|------|-------------|
| 🎮 **Demo Mode** | Simulated | 100 ALGO test balance, no wallet needed |
| 📱 **Pera Wallet** | Real | TestNet/MainNet via `@perawallet/connect` v1.3.4 |
| 🦅 **Defly Wallet** | Real | TestNet/MainNet via `@blockshake/defly-connect` v1.1.6 |

Real wallets support auto-reconnect, on-chain balance fetching, transaction signing, and confirmation waiting.

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Frontend (SPA)                            │
│  index.html  │  app.js  │  wallet.js  │  contract.js  │  widget │
│         Pera Wallet SDK  │  Defly Wallet SDK  │  AlgoSDK v3     │
└──────────────────┬───────────────────────────────────────────────┘
                   │  ABI Method Calls / Payment Transactions
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                    TipJar Smart Contract                         │
│             smart_contracts/tip_jar/contract.algo.ts             │
│                                                                  │
│  Global State                │  Local State (per creator)        │
│  ────────────                │  ──────────────────────           │
│  totalCreators               │  creatorName, creatorBio          │
│  totalTipsProcessed          │  tipsReceived, tipCount           │
│  totalTipCount               │  isRegistered, category           │
│  minTipAmount                │  profileImageUrl                  │
│  platformFeeBps              │  revSplitAddress                  │
│  adminAddress                │  revSplitPercent                  │
│  totalBadgesMinted           │  revSplitName                     │
│  bronzeThreshold             │                                   │
│  silverThreshold             │                                   │
│  goldThreshold               │                                   │
│  diamondThreshold            │                                   │
└──────────────────────────────────────────────────────────────────┘
                   │  Inner Transactions
                   ▼
┌──────────────────────────────────────────────────────────────────┐
│              Algorand Blockchain (TestNet / MainNet)              │
│         Payment (tip payouts)  │  AssetConfig (NFT badges)       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
my-template/
├── .algokit.toml                    # AlgoKit project configuration
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript configuration (strict, ES2020)
├── README.md                        # This file
│
├── smart_contracts/
│   ├── index.ts                     # Deployment orchestrator (auto-imports all contracts)
│   ├── tip_jar/
│   │   ├── contract.algo.ts         # ★ TipJar smart contract (447 lines)
│   │   └── deploy-config.ts         # Deployment + verification script
│   ├── hello_world/
│   │   ├── contract.algo.ts         # Example HelloWorld contract
│   │   └── deploy-config.ts         # HelloWorld deploy config
│   └── artifacts/                   # Auto-generated after build
│       ├── hello_world/
│       │   ├── HelloWorld.approval.teal
│       │   ├── HelloWorld.clear.teal
│       │   ├── HelloWorld.arc32.json
│       │   ├── HelloWorld.arc56.json
│       │   └── HelloWorldClient.ts
│       └── tip_jar/                 # Generated after `npm run build`
│           └── TipJarClient.ts
│
├── frontend/
│   ├── index.html                   # SPA with 7 pages (894 lines)
│   ├── css/
│   │   ├── styles.css               # Core: variables, layout, typography, animations
│   │   ├── components.css           # Cards, modals, badges, charts, forms, revenue split
│   │   └── responsive.css           # Mobile & tablet breakpoints
│   └── js/
│       ├── config.js                # Network config, demo data (8 creators), helpers
│       ├── wallet.js                # WalletManager class (Demo / Pera / Defly)
│       ├── contract.js              # TipJarContract class (smart contract interface)
│       ├── app.js                   # App logic: navigation, rendering, charts (1300 lines)
│       ├── widget.js                # In-app widget preview page
│       └── tipjar-widget.js         # ★ Standalone embeddable widget
│
└── .vscode/
    ├── tasks.json                   # Build, deploy, LocalNet tasks
    ├── launch.json                  # Debugger configurations
    └── settings.json                # Editor settings
```

---

## 🛠 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Blockchain** | [Algorand](https://algorand.com) | — |
| **Smart Contract** | [Algorand TypeScript](https://github.com/algorandfoundation/puya-ts) | v1.1.0 |
| **Compiler** | [Puya-TS](https://github.com/algorandfoundation/puya-ts) | v1.0.1+ |
| **SDK** | [algosdk](https://github.com/algorand/js-algorand-sdk) | v3.0.0 |
| **Tooling** | [AlgoKit CLI](https://developer.algorand.org/algokit/) | v2.6+ |
| **Utils** | [algokit-utils](https://github.com/algorandfoundation/algokit-utils-ts) | v9.0.0 |
| **Client Generator** | [@algorandfoundation/algokit-client-generator](https://github.com/algorandfoundation/algokit-client-generator-ts) | v6.0.0 |
| **Pera Wallet** | [@perawallet/connect](https://github.com/perawallet/connect) | v1.3.4 |
| **Defly Wallet** | [@blockshake/defly-connect](https://github.com/blockshake-io/defly-connect) | v1.1.6 |
| **Frontend** | Vanilla HTML / CSS / JavaScript | — |
| **Fonts** | Inter, Space Grotesk | Google Fonts |
| **TypeScript** | [typescript](https://www.typescriptlang.org/) | v5.7.3 |
| **Runtime** | Node.js | 22+ |

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 22.0 | [nodejs.org](https://nodejs.org/) |
| npm | ≥ 9.0 | Included with Node.js |
| AlgoKit CLI | ≥ 2.6.0 | [Install Guide](https://github.com/algorandfoundation/algokit-cli#install) |
| Docker | Latest | [docker.com](https://www.docker.com/) (only for LocalNet) |
| Puya Compiler | ≥ 4.4.4 | `pip install puyapy` |

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd my-template

# Install dependencies
npm install

# (Optional) Generate environment file
algokit generate env-file -a target_network localnet
```

### Build the Smart Contract

```bash
npm run build
```

This runs two steps:
1. **`algokit compile ts`** — Compiles `contract.algo.ts` → TEAL approval + clear programs
2. **`algokit generate client`** — Generates typed `TipJarClient.ts` from the ARC-32/ARC-56 spec

### Start LocalNet (Optional)

```bash
algokit localnet start     # Start local Algorand network via Docker
algokit localnet reset     # Reset to clean state
algokit localnet stop      # Stop the network
```

### Deploy

```bash
# Deploy to LocalNet (default)
npm run deploy

# Deploy to a specific network
algokit project deploy localnet
algokit project deploy testnet
```

The deploy script (`deploy-config.ts`):
1. Creates the TipJar application on-chain
2. Funds the contract with 1 ALGO (for inner transactions)
3. Verifies deployment by reading platform stats, badge counts, and thresholds

### Run the Frontend

The frontend is static — **no build step required**:

```bash
# Option 1: Serve with Node
npx serve frontend

# Option 2: Python
cd frontend && python -m http.server 8080

# Option 3: VS Code
# Right-click index.html → "Open with Live Server"

# Option 4: Direct
# Open frontend/index.html in any browser
```

---

## 📜 Smart Contract

**File:** `smart_contracts/tip_jar/contract.algo.ts` (447 lines)

### State Schema

#### Global State (11 keys)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `totalCreators` | `uint64` | `0` | Number of registered creators |
| `totalTipsProcessed` | `uint64` | `0` | Total tips in microALGO |
| `totalTipCount` | `uint64` | `0` | Total tip transactions |
| `minTipAmount` | `uint64` | `100,000` | Minimum tip (0.1 ALGO) |
| `platformFeeBps` | `uint64` | `100` | Platform fee (1%) |
| `adminAddress` | `bytes` | Deployer | Admin account |
| `totalBadgesMinted` | `uint64` | `0` | NFT badges created |
| `bronzeThreshold` | `uint64` | `5,000,000` | 5 ALGO |
| `silverThreshold` | `uint64` | `25,000,000` | 25 ALGO |
| `goldThreshold` | `uint64` | `100,000,000` | 100 ALGO |
| `diamondThreshold` | `uint64` | `500,000,000` | 500 ALGO |

#### Local State (10 keys per creator)

| Key | Type | Description |
|-----|------|-------------|
| `creatorName` | `string` | Display name |
| `creatorBio` | `string` | Bio / description |
| `creatorCategory` | `string` | Content category |
| `profileImageUrl` | `string` | Profile image URL |
| `tipsReceived` | `uint64` | Total tips received (microALGO) |
| `tipCount` | `uint64` | Number of tips received |
| `isRegistered` | `uint64` | 1 if registered, 0 if not |
| `revSplitAddress` | `string` | Collaborator address |
| `revSplitPercent` | `uint64` | Collaborator percentage (0–50) |
| `revSplitName` | `string` | Collaborator name |

### Contract Methods

#### Write Methods

| Method | Access | Description |
|--------|--------|-------------|
| `createApplication()` | Creator | Initialize contract with defaults |
| `registerCreator(name, bio, category, profileImage)` | Any | Register as a content creator |
| `updateProfile(name, bio, category, profileImage)` | Registered | Update profile information |
| `sendTip(creator, message, tipPayment)` | Any | Send ALGO tip (requires grouped payment txn) |
| `setRevenueSplit(addr, name, percent)` | Registered | Configure collaborator split (max 50%) |
| `removeRevenueSplit()` | Registered | Remove revenue split |
| `mintBadge(supporter, tier, creator)` | Admin/Creator | Mint NFT badge (ASA with total=1) |
| `setMinTipAmount(newMin)` | Admin | Update minimum tip |
| `setPlatformFee(newFeeBps)` | Admin | Update fee (max 1000 bps = 10%) |
| `setBadgeThresholds(b, s, g, d)` | Admin | Update all tier thresholds |

#### Read Methods

| Method | Returns |
|--------|---------|
| `getCreatorName(creator)` | Display name |
| `getCreatorBio(creator)` | Bio text |
| `getCreatorCategory(creator)` | Category string |
| `getTipsReceived(creator)` | Total microALGO received |
| `getTipCount(creator)` | Number of tips |
| `getRevenueSplitPercent(creator)` | Split percentage |
| `verifyTipRecord(creator)` | Total tips (on-chain proof) |
| `getBronzeThreshold()` | Bronze threshold |
| `getTotalBadgesMinted()` | Badge count |
| `getPlatformStats()` | Total tips processed |
| `getTotalCreators()` | Creator count |
| `getTotalTipCount()` | Tip transaction count |
| `checkRegistration(account)` | 1 or 0 |
| `getMinTipAmount()` | Min tip (microALGO) |
| `getPlatformFee()` | Fee in basis points |

### NFT Badge Tiers

| Tier | Icon | Threshold | ASA Unit Name |
|------|------|-----------|---------------|
| Bronze | 🥉 | 5 ALGO | `TJBADGE` |
| Silver | 🥈 | 25 ALGO | `TJBADGE` |
| Gold | 🥇 | 100 ALGO | `TJBADGE` |
| Diamond | 💎 | 500 ALGO | `TJBADGE` |

### Tip Flow

```
Supporter sends Payment Txn (ALGO) → Contract
    ├── Platform fee deducted (1%)
    ├── Revenue split applied (if configured)
    │   ├── Creator receives (100% - split%) of after-fee amount
    │   └── Collaborator share held in contract
    └── Creator stats updated (tipsReceived, tipCount)
        └── Global stats updated (totalTipsProcessed, totalTipCount)
```

---

## 🖥 Frontend

A **single-page application** with 7 pages — no frameworks, no build tools, pure HTML/CSS/JS.

### Pages

| # | Page | Route Hash | Description |
|---|------|------------|-------------|
| 1 | **Home** | `#home` | Animated hero, featured creators carousel, live tip feed, platform stats counter |
| 2 | **Explore** | `#explore` | All creators grid with category filter tabs and text search |
| 3 | **Leaderboard** | `#leaderboard` | Top creators by tips received + top supporters by total tipped |
| 4 | **Dashboard** | `#dashboard` | Creator registration form, profile editor, stats cards, tip withdrawal, badge hall of fame |
| 5 | **Analytics** | `#analytics` | Bar charts (daily/weekly volume), donut charts (category & supporter breakdown) |
| 6 | **Verify** | `#verify` | Enter creator address → verify on-chain tip records |
| 7 | **Widget** | `#widget-demo` | Live widget preview with theme selector + embeddable code snippets |

### JavaScript Modules

| File | Lines | Class/Module | Responsibility |
|------|-------|-------------|----------------|
| `config.js` | 283 | `CONFIG`, constants | Network endpoints, 8 demo creators, 12 demo tips, 8 supporters, badge tiers, revenue splits, analytics generator, utility functions |
| `wallet.js` | 568 | `WalletManager` | Demo/Pera/Defly connection, SDK initialization, auto-reconnect, balance fetching, transaction building & signing, tip sending, badge claiming, revenue split management |
| `contract.js` | 366 | `TipJarContract` | Abstraction layer for all smart contract calls — works in demo mode and can be extended for real ABI calls |
| `app.js` | 1300 | Functions | Page rendering, SPA navigation, form handling, tip modal, toast notifications, hero particles (Canvas), chart drawing (bar + donut), badge grid, revenue split forms |
| `widget.js` | 362 | `TipJarWidget` | In-app widget preview with theme/color customization |
| `tipjar-widget.js` | 172 | `TipJarWidget` | Standalone embeddable widget (self-contained styles, data-attribute support, 3 themes) |

### CSS Architecture

| File | Purpose |
|------|---------|
| `styles.css` | CSS variables, reset, layout grid, navbar, hero, footer, animations, toast, typography |
| `components.css` | Creator cards, tip modal, dashboard forms, leaderboard tables, badge cards, chart containers, verify page, analytics, revenue split section |
| `responsive.css` | Breakpoints at 1200px, 992px, 768px, 576px, 480px for tablet & mobile |

---

## 🧩 Embeddable Widget

**File:** `frontend/js/tipjar-widget.js` (172 lines, self-contained)

Add a tip button to **any external website** with a single script tag.

### JavaScript API

```html
<div id="tipjar-widget"></div>
<script src="https://your-domain.com/js/tipjar-widget.js"></script>
<script>
  TipJarWidget.init({
    container: '#tipjar-widget',
    creatorAddress: 'YOUR_ALGORAND_ADDRESS',
    theme: 'dark',              // 'light' | 'dark' | 'gradient'
    buttonText: '💎 Send a Tip',
    defaultAmount: 2,
    showBranding: true,
    primaryColor: '#6c5ce7'
  });
</script>
```

### Data Attributes (Auto-Init)

```html
<div data-tipjar-widget
     data-creator-address="YOUR_ALGORAND_ADDRESS"
     data-theme="gradient"
     data-button-text="💎 Tip Me"
     data-default-amount="5">
</div>
<script src="tipjar-widget.js"></script>
```

### Widget Themes

| Theme | Look |
|-------|------|
| `light` | Clean white card with subtle borders |
| `dark` | Dark card with glowing purple accents |
| `gradient` | Purple-to-blue gradient background |

---

## 🔧 Deployment

### Deploy Configuration (`deploy-config.ts`)

The deploy script handles:

```typescript
// 1. Create application on-chain
const { appClient, result } = await factory.deploy({ ... });

// 2. Fund contract for inner transactions
await algorand.send.payment({ amount: (1).algo(), ... });

// 3. Verify deployment
await appClient.send.getPlatformStats({});
await appClient.send.getTotalBadgesMinted({});
await appClient.send.getBronzeThreshold({});
```

### Environment Setup

```bash
# Generate .env for your target network
algokit generate env-file -a target_network testnet
```

**`.env.testnet`** example:
```env
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_TOKEN=
ALGOD_PORT=
INDEXER_SERVER=https://testnet-idx.algonode.cloud
DEPLOYER_MNEMONIC=your 25-word mnemonic here
```

### After Deployment

Update `CONFIG.APP_ID` in `frontend/js/config.js` with the deployed application ID:

```javascript
const CONFIG = {
  APP_ID: 123456789,  // ← Your deployed App ID
  // ...
};
```

---

## ⚙ Configuration

### Network Settings (`frontend/js/config.js`)

```javascript
const CONFIG = {
  NETWORK: 'testnet',                                // testnet | mainnet | localnet
  ALGOD_SERVER: 'https://testnet-api.algonode.cloud', // Algod endpoint
  ALGOD_PORT: '',
  ALGOD_TOKEN: '',
  INDEXER_SERVER: 'https://testnet-idx.algonode.cloud',
  APP_ID: 0,                                         // Set after deployment
  MIN_TIP_ALGO: 0.1,                                 // Minimum tip amount
  PLATFORM_FEE_BPS: 100,                             // 1% fee
};
```

### Switching Networks

| Network | `ALGOD_SERVER` | `INDEXER_SERVER` |
|---------|---------------|-----------------|
| **TestNet** | `https://testnet-api.algonode.cloud` | `https://testnet-idx.algonode.cloud` |
| **MainNet** | `https://mainnet-api.algonode.cloud` | `https://mainnet-idx.algonode.cloud` |
| **LocalNet** | `http://localhost:4001` | `http://localhost:8980` |

---

## 🎮 Demo Mode

The app includes a fully functional demo mode requiring **no wallet or blockchain**:

| Data | Count | Details |
|------|-------|---------|
| **Creators** | 8 | Across 4 categories: blogger, artist, musician, photographer |
| **Tips** | 12 | With messages, timestamps, and amounts |
| **Supporters** | 8 | With total tipped amounts for leaderboard |
| **NFT Badges** | 8 | Bronze through Gold tiers |
| **Revenue Splits** | 3 | Active collaborator configurations |
| **Analytics** | 30 days | Dynamically generated daily/weekly data |
| **Wallet Balance** | 100 ALGO | Simulated with transaction deductions |

Activate demo mode by clicking **"🎮 Demo Mode"** in the wallet connect dialog.

---

## 🔄 Development Workflow

### NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **Build** | `npm run build` | Compile contracts → TEAL + generate typed client |
| **Deploy** | `npm run deploy` | Deploy with hot-reload (watches `.env`) |
| **Deploy CI** | `npm run deploy:ci` | Deploy without watch mode |
| **Type Check** | `npm run check-types` | TypeScript type verification |

### VS Code Tasks (F1 → Run Task)

| Task | Description |
|------|-------------|
| Build contracts | Compile & generate client |
| Build contracts (+ LocalNet) | Start LocalNet then build |
| Start AlgoKit LocalNet | `algokit localnet start` |
| Stop AlgoKit LocalNet | `algokit localnet stop` |
| Reset AlgoKit LocalNet | `algokit localnet reset` |

### AlgoKit Generators

```bash
# Add a new smart contract
algokit generate smart-contract

# Generate .env file for a network
algokit generate env-file -a target_network testnet
```

### Debugging

- **VS Code**: Press `F5` to start debugging
- **TEAL Debugging**: Use the [AlgoKit AVM Debugger](https://marketplace.visualstudio.com/items?itemName=algorandfoundation.algokit-avm-vscode-debugger) extension
- **Trace Files**: Uncomment `traceAll: true` in `smart_contracts/index.ts` for AVM source maps
