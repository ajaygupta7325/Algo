/**
 * TipJar Configuration (Production)
 * Network settings, demo data, and helpers for the Content Creator Tip Platform.
 * CONFIG is validated and frozen to prevent runtime tampering.
 */

// ─── Network Configuration ─────────────────────────────────
const CONFIG = Object.freeze({
  // Algorand Network (switch between testnet/mainnet/localnet)
  NETWORK: 'testnet',

  // Algod client settings
  ALGOD_SERVER: 'https://testnet-api.algonode.cloud',
  ALGOD_PORT: '',
  ALGOD_TOKEN: '',

  // Indexer settings
  INDEXER_SERVER: 'https://testnet-idx.algonode.cloud',
  INDEXER_PORT: '',
  INDEXER_TOKEN: '',

  // Smart contract App ID (set after deployment)
  APP_ID: 0,

  // Platform settings
  MIN_TIP_ALGO: 0.1,
  PLATFORM_FEE_BPS: 100, // 1%
  MAX_TIP_ALGO: 10_000,  // Safety cap: 10,000 ALGO max per tip
  MAX_MESSAGE_LEN: 200,  // Max tip message length
  MAX_NAME_LEN: 50,      // Max creator name length
  MAX_BIO_LEN: 200,      // Max bio length

  // Rate limiting (frontend-only, advisory)
  MAX_TIPS_PER_MINUTE: 5,

  // Frontend URL (for sharing)
  BASE_URL: window.location.origin + window.location.pathname,
});

// ─── Config Validation ──────────────────────────────────────
(function validateConfig() {
  const validNetworks = ['testnet', 'mainnet', 'localnet'];
  if (!validNetworks.includes(CONFIG.NETWORK)) {
    console.error(`[TipJar Config] Invalid NETWORK: "${CONFIG.NETWORK}". Must be one of: ${validNetworks.join(', ')}`);
  }
  if (!CONFIG.ALGOD_SERVER || !CONFIG.ALGOD_SERVER.startsWith('http')) {
    console.error('[TipJar Config] ALGOD_SERVER must be a valid HTTP(S) URL');
  }
  if (CONFIG.MIN_TIP_ALGO <= 0) {
    console.error('[TipJar Config] MIN_TIP_ALGO must be positive');
  }
  if (CONFIG.PLATFORM_FEE_BPS < 0 || CONFIG.PLATFORM_FEE_BPS > 1000) {
    console.error('[TipJar Config] PLATFORM_FEE_BPS must be 0-1000 (0-10%)');
  }
})();

// ─── Demo Creators (for showcasing before blockchain deployment) ─────
const DEMO_CREATORS = [
  {
    address: 'DEMO1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    name: 'Alex Rivera',
    bio: 'Full-stack developer and tech blogger. Writing about Web3, DeFi, and blockchain architecture. 500+ articles published.',
    category: 'blogger',
    profileImage: '',
    tipsReceived: 45_500_000, // 45.5 ALGO in microALGO
    tipCount: 32,
    avatar: '📝',
  },
  {
    address: 'DEMO2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    name: 'Maya Chen',
    bio: 'Digital artist specializing in NFT art and generative designs. Building the future of digital creativity on Algorand.',
    category: 'artist',
    profileImage: '',
    tipsReceived: 128_300_000, // 128.3 ALGO
    tipCount: 87,
    avatar: '🎨',
  },
  {
    address: 'DEMO3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    name: 'Jordan Bass',
    bio: 'Independent musician producing electronic and lo-fi beats. All my music is creative commons — tip if you enjoy it!',
    category: 'musician',
    profileImage: '',
    tipsReceived: 67_800_000, // 67.8 ALGO
    tipCount: 54,
    avatar: '🎵',
  },
  {
    address: 'DEMO4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    name: 'Sarah Kim',
    bio: 'Street & travel photographer documenting urban life across Asia. Prints and wallpapers available. Your support keeps me on the road!',
    category: 'photographer',
    profileImage: '',
    tipsReceived: 92_100_000, // 92.1 ALGO
    tipCount: 63,
    avatar: '📸',
  },
  {
    address: 'DEMO5AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    name: 'Dev Patel',
    bio: 'Open-source contributor and coding tutorial creator. Making blockchain dev accessible to everyone.',
    category: 'blogger',
    profileImage: '',
    tipsReceived: 34_200_000, // 34.2 ALGO
    tipCount: 28,
    avatar: '💻',
  },
  {
    address: 'DEMO6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    name: 'Luna Martinez',
    bio: 'Watercolor and oil painter bringing nature to canvas. Each tip helps fund art supplies for my next collection.',
    category: 'artist',
    profileImage: '',
    tipsReceived: 156_700_000, // 156.7 ALGO
    tipCount: 95,
    avatar: '🖌️',
  },
  {
    address: 'DEMO7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    name: 'Marcus Cole',
    bio: 'Jazz pianist and composer. Streaming live sessions every Friday. Tips help me keep making music.',
    category: 'musician',
    profileImage: '',
    tipsReceived: 78_400_000, // 78.4 ALGO
    tipCount: 41,
    avatar: '🎹',
  },
  {
    address: 'DEMO8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    name: 'Emily Zhang',
    bio: 'Macro and wildlife photographer. Capturing the tiny wonders of nature. Featured in National Geographic Student Edition.',
    category: 'photographer',
    profileImage: '',
    tipsReceived: 110_600_000, // 110.6 ALGO
    tipCount: 72,
    avatar: '🦋',
  },
];

// ─── Demo Tip History ───────────────────────────────────────
const DEMO_TIPS = [
  { from: 'Anon_Supporter', fromAddr: 'ANON1...AAAA', to: 'Maya Chen', toAddr: DEMO_CREATORS[1].address, amount: 5_000_000, message: 'Love your latest collection! 🎨', time: Date.now() - 120_000 },
  { from: 'CryptoFan42', fromAddr: 'FAN42...BBBB', to: 'Jordan Bass', toAddr: DEMO_CREATORS[2].address, amount: 2_000_000, message: 'Your lo-fi beats got me through finals!', time: Date.now() - 360_000 },
  { from: 'Web3Builder', fromAddr: 'WEB3B...CCCC', to: 'Alex Rivera', toAddr: DEMO_CREATORS[0].address, amount: 10_000_000, message: 'That DeFi article was incredibly helpful', time: Date.now() - 900_000 },
  { from: 'ArtLover', fromAddr: 'ARTLV...DDDD', to: 'Luna Martinez', toAddr: DEMO_CREATORS[5].address, amount: 25_000_000, message: 'Stunning sunset series! 🌅', time: Date.now() - 1_800_000 },
  { from: 'PhotoEnthusiast', fromAddr: 'PHOTO...EEEE', to: 'Sarah Kim', toAddr: DEMO_CREATORS[3].address, amount: 3_000_000, message: 'Your Tokyo series is breathtaking', time: Date.now() - 3_600_000 },
  { from: 'MusicAddict', fromAddr: 'MUSIC...FFFF', to: 'Marcus Cole', toAddr: DEMO_CREATORS[6].address, amount: 5_000_000, message: 'Friday sessions are the highlight of my week 🎹', time: Date.now() - 7_200_000 },
  { from: 'StudentDev', fromAddr: 'STUDT...GGGG', to: 'Dev Patel', toAddr: DEMO_CREATORS[4].address, amount: 1_000_000, message: 'Your tutorial helped me land my first job!', time: Date.now() - 14_400_000 },
  { from: 'NatureFan', fromAddr: 'NATRE...HHHH', to: 'Emily Zhang', toAddr: DEMO_CREATORS[7].address, amount: 8_000_000, message: 'The butterfly macro shots are incredible 🦋', time: Date.now() - 28_800_000 },
  { from: 'AnonymousTipper', fromAddr: 'ANON2...IIII', to: 'Maya Chen', toAddr: DEMO_CREATORS[1].address, amount: 15_000_000, message: '', time: Date.now() - 43_200_000 },
  { from: 'BlockchainBob', fromAddr: 'BLOCK...JJJJ', to: 'Alex Rivera', toAddr: DEMO_CREATORS[0].address, amount: 4_000_000, message: 'Great technical deep dive on consensus', time: Date.now() - 86_400_000 },
  { from: 'CodeNewbie', fromAddr: 'CODEN...KKKK', to: 'Dev Patel', toAddr: DEMO_CREATORS[4].address, amount: 2_000_000, message: 'Finally understood smart contracts thanks to you!', time: Date.now() - 100_000_000 },
  { from: 'JazzFan99', fromAddr: 'JAZZF...LLLL', to: 'Marcus Cole', toAddr: DEMO_CREATORS[6].address, amount: 7_500_000, message: 'Your improvisation skills are amazing', time: Date.now() - 150_000_000 },
];

// ─── Demo Supporters (for leaderboard) ──────────────────────
const DEMO_SUPPORTERS = [
  { name: 'ArtLover', address: 'ARTLV...DDDD', totalTipped: 89_000_000, tipCount: 34, avatar: '💜' },
  { name: 'CryptoFan42', address: 'FAN42...BBBB', totalTipped: 67_500_000, tipCount: 28, avatar: '🚀' },
  { name: 'BlockchainBob', address: 'BLOCK...JJJJ', totalTipped: 54_000_000, tipCount: 22, avatar: '⛓️' },
  { name: 'Web3Builder', address: 'WEB3B...CCCC', totalTipped: 45_000_000, tipCount: 18, avatar: '🏗️' },
  { name: 'MusicAddict', address: 'MUSIC...FFFF', totalTipped: 38_500_000, tipCount: 15, avatar: '🎶' },
  { name: 'NatureFan', address: 'NATRE...HHHH', totalTipped: 32_000_000, tipCount: 12, avatar: '🌿' },
  { name: 'PhotoEnthusiast', address: 'PHOTO...EEEE', totalTipped: 28_000_000, tipCount: 11, avatar: '📷' },
  { name: 'StudentDev', address: 'STUDT...GGGG', totalTipped: 15_000_000, tipCount: 8, avatar: '🎓' },
];

// ─── Category Info ──────────────────────────────────────────
const CATEGORIES = Object.freeze({
  blogger: Object.freeze({ icon: '📝', label: 'Blogger', color: '#74b9ff' }),
  artist: Object.freeze({ icon: '🎨', label: 'Artist', color: '#fd79a8' }),
  musician: Object.freeze({ icon: '🎵', label: 'Musician', color: '#fdcb6e' }),
  photographer: Object.freeze({ icon: '📸', label: 'Photographer', color: '#00b894' }),
});

// ─── NFT Badge Tiers ────────────────────────────────────────
const BADGE_TIERS = Object.freeze({
  bronze:  Object.freeze({ level: 1, name: 'Bronze',  icon: '🥉', threshold: 5_000_000,   color: '#cd7f32', label: 'Tipped 5+ ALGO' }),
  silver:  Object.freeze({ level: 2, name: 'Silver',  icon: '🥈', threshold: 25_000_000,  color: '#c0c0c0', label: 'Tipped 25+ ALGO' }),
  gold:    Object.freeze({ level: 3, name: 'Gold',    icon: '🥇', threshold: 100_000_000, color: '#ffd700', label: 'Tipped 100+ ALGO' }),
  diamond: Object.freeze({ level: 4, name: 'Diamond', icon: '💎', threshold: 500_000_000, color: '#b9f2ff', label: 'Tipped 500+ ALGO' }),
});

/**
 * Get the badge tier for a given total tipped amount
 */
function getBadgeTier(totalTippedMicro) {
  if (totalTippedMicro >= BADGE_TIERS.diamond.threshold) return BADGE_TIERS.diamond;
  if (totalTippedMicro >= BADGE_TIERS.gold.threshold) return BADGE_TIERS.gold;
  if (totalTippedMicro >= BADGE_TIERS.silver.threshold) return BADGE_TIERS.silver;
  if (totalTippedMicro >= BADGE_TIERS.bronze.threshold) return BADGE_TIERS.bronze;
  return null;
}

// ─── Demo Badge Data ────────────────────────────────────────
const DEMO_BADGES = [
  { supporter: 'ArtLover', supporterAddr: 'ARTLV...DDDD', creator: 'Luna Martinez', creatorAddr: DEMO_CREATORS[5].address, tier: 'gold', totalTipped: 89_000_000, mintedAt: Date.now() - 86_400_000, assetId: 1001 },
  { supporter: 'CryptoFan42', supporterAddr: 'FAN42...BBBB', creator: 'Maya Chen', creatorAddr: DEMO_CREATORS[1].address, tier: 'silver', totalTipped: 67_500_000, mintedAt: Date.now() - 172_800_000, assetId: 1002 },
  { supporter: 'BlockchainBob', supporterAddr: 'BLOCK...JJJJ', creator: 'Alex Rivera', creatorAddr: DEMO_CREATORS[0].address, tier: 'silver', totalTipped: 54_000_000, mintedAt: Date.now() - 259_200_000, assetId: 1003 },
  { supporter: 'Web3Builder', supporterAddr: 'WEB3B...CCCC', creator: 'Alex Rivera', creatorAddr: DEMO_CREATORS[0].address, tier: 'silver', totalTipped: 45_000_000, mintedAt: Date.now() - 345_600_000, assetId: 1004 },
  { supporter: 'MusicAddict', supporterAddr: 'MUSIC...FFFF', creator: 'Jordan Bass', creatorAddr: DEMO_CREATORS[2].address, tier: 'silver', totalTipped: 38_500_000, mintedAt: Date.now() - 432_000_000, assetId: 1005 },
  { supporter: 'NatureFan', supporterAddr: 'NATRE...HHHH', creator: 'Emily Zhang', creatorAddr: DEMO_CREATORS[7].address, tier: 'silver', totalTipped: 32_000_000, mintedAt: Date.now() - 518_400_000, assetId: 1006 },
  { supporter: 'PhotoEnthusiast', supporterAddr: 'PHOTO...EEEE', creator: 'Sarah Kim', creatorAddr: DEMO_CREATORS[3].address, tier: 'bronze', totalTipped: 28_000_000, mintedAt: Date.now() - 604_800_000, assetId: 1007 },
  { supporter: 'StudentDev', supporterAddr: 'STUDT...GGGG', creator: 'Dev Patel', creatorAddr: DEMO_CREATORS[4].address, tier: 'bronze', totalTipped: 15_000_000, mintedAt: Date.now() - 691_200_000, assetId: 1008 },
];

// ─── Demo Revenue Splits ────────────────────────────────────
const DEMO_REVENUE_SPLITS = [
  { creator: 'Maya Chen', creatorAddr: DEMO_CREATORS[1].address, collaborator: 'Design Studio Co.', collaboratorAddr: 'COLLAB1...AAAA', splitPercent: 20 },
  { creator: 'Jordan Bass', creatorAddr: DEMO_CREATORS[2].address, collaborator: 'BeatMaker Pro', collaboratorAddr: 'COLLAB2...BBBB', splitPercent: 15 },
  { creator: 'Marcus Cole', creatorAddr: DEMO_CREATORS[6].address, collaborator: 'Jazz Ensemble Fund', collaboratorAddr: 'COLLAB3...CCCC', splitPercent: 30 },
];

// ─── Demo Analytics Time-Series Data ────────────────────────
function generateAnalyticsData() {
  const now = Date.now();
  const day = 86_400_000;
  const data = { daily: [], weekly: [], categoryBreakdown: [], topSupportersPie: [] };

  // Daily tip volume (last 30 days)
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * day);
    const label = `${date.getMonth() + 1}/${date.getDate()}`;
    const tips = Math.floor(Math.random() * 15) + 2;
    const volume = (Math.random() * 40 + 5) * 1_000_000;
    data.daily.push({ label, tips, volume: Math.floor(volume), date: date.getTime() });
  }

  // Weekly aggregation (last 8 weeks)
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now - (i * 7 + 6) * day);
    const label = `W${8 - i}`;
    const tips = Math.floor(Math.random() * 60) + 15;
    const volume = (Math.random() * 200 + 30) * 1_000_000;
    data.weekly.push({ label, tips, volume: Math.floor(volume) });
  }

  // Category breakdown
  data.categoryBreakdown = [
    { category: 'artist', tips: 182, volume: 284_900_000, color: '#fd79a8' },
    { category: 'musician', tips: 95, volume: 146_200_000, color: '#fdcb6e' },
    { category: 'photographer', tips: 135, volume: 202_700_000, color: '#00b894' },
    { category: 'blogger', tips: 60, volume: 79_700_000, color: '#74b9ff' },
  ];

  // Top supporters pie segments
  data.topSupportersPie = DEMO_SUPPORTERS.slice(0, 6).map((s, i) => ({
    name: s.name,
    value: s.totalTipped,
    color: ['#6c5ce7', '#fd79a8', '#00b894', '#fdcb6e', '#74b9ff', '#e17055'][i],
  }));

  return data;
}

const DEMO_ANALYTICS = generateAnalyticsData();

// ─── Helper Functions ───────────────────────────────────────

/**
 * Convert microALGO to ALGO
 */
function microAlgoToAlgo(microAlgo) {
  return (microAlgo / 1_000_000).toFixed(2);
}

/**
 * Convert ALGO to microALGO
 */
function algoToMicroAlgo(algo) {
  return Math.floor(algo * 1_000_000);
}

/**
 * Format time relative to now
 */
function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Truncate Algorand address for display
 */
function truncateAddress(address) {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get category icon
 */
function getCategoryIcon(category) {
  return CATEGORIES[category]?.icon || '✨';
}

/**
 * Get category label
 */
function getCategoryLabel(category) {
  return CATEGORIES[category]?.label || category;
}
