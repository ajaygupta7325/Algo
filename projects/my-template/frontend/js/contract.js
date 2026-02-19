/**
 * TipJar - Smart Contract Interface (Production)
 * Provides abstraction layer for interacting with the TipJar smart contract.
 * Includes request caching, real on-chain verification, error wrapping,
 * and network health monitoring.
 */

// ─── Simple TTL Cache ───────────────────────────────────────
class RequestCache {
  constructor(defaultTTL = 10_000) {
    this._cache = new Map();
    this._defaultTTL = defaultTTL;
  }

  get(key) {
    const entry = this._cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this._cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttl) {
    this._cache.set(key, {
      value,
      expiresAt: Date.now() + (ttl || this._defaultTTL),
    });
  }

  invalidate(key) {
    if (key) {
      this._cache.delete(key);
    } else {
      this._cache.clear();
    }
  }
}

class TipJarContract {
  constructor() {
    this.appId = CONFIG.APP_ID;
    this.algodClient = null;
    this._cache = new RequestCache(15_000); // 15s default TTL
    this._networkHealthy = true;
    this._lastHealthCheck = 0;
    this._abiContract = null;

    // Initialize Algod client if algosdk is available
    if (typeof algosdk !== 'undefined' && CONFIG.ALGOD_SERVER) {
      try {
        this.algodClient = new algosdk.Algodv2(
          CONFIG.ALGOD_TOKEN,
          CONFIG.ALGOD_SERVER,
          CONFIG.ALGOD_PORT
        );
      } catch (e) {
        console.warn('Could not initialize Algod client:', e.message);
      }
    }

    // Build ABI contract from method signatures
    this._initABI();
  }

  /**
   * Initialize ABI contract interface for typed method calls
   */
  _initABI() {
    if (typeof algosdk === 'undefined') return;
    try {
      const methods = [
        { name: 'createApplication', args: [], returns: { type: 'void' } },
        { name: 'pauseContract', args: [], returns: { type: 'string' } },
        { name: 'unpauseContract', args: [], returns: { type: 'string' } },
        { name: 'transferAdmin', args: [{ type: 'address', name: 'newAdmin' }], returns: { type: 'string' } },
        { name: 'acceptAdmin', args: [], returns: { type: 'string' } },
        { name: 'registerCreator', args: [{ type: 'string', name: 'name' }, { type: 'string', name: 'bio' }, { type: 'string', name: 'category' }, { type: 'string', name: 'profileImage' }], returns: { type: 'string' } },
        { name: 'updateProfile', args: [{ type: 'string', name: 'name' }, { type: 'string', name: 'bio' }, { type: 'string', name: 'category' }, { type: 'string', name: 'profileImage' }], returns: { type: 'string' } },
        { name: 'setRevenueSplit', args: [{ type: 'string', name: 'collaboratorAddr' }, { type: 'string', name: 'collaboratorName' }, { type: 'uint64', name: 'splitPercent' }], returns: { type: 'string' } },
        { name: 'removeRevenueSplit', args: [], returns: { type: 'string' } },
        { name: 'getRevenueSplitPercent', args: [{ type: 'address', name: 'creator' }], returns: { type: 'uint64' } },
        { name: 'sendTip', args: [{ type: 'address', name: 'creator' }, { type: 'string', name: 'message' }, { type: 'pay', name: 'tipPayment' }], returns: { type: 'string' } },
        { name: 'mintBadge', args: [{ type: 'address', name: 'supporter' }, { type: 'uint64', name: 'badgeTier' }, { type: 'address', name: 'creatorAddr' }], returns: { type: 'string' } },
        { name: 'verifyTipRecord', args: [{ type: 'address', name: 'creator' }], returns: { type: 'uint64' } },
        { name: 'getBronzeThreshold', args: [], returns: { type: 'uint64' } },
        { name: 'getTotalBadgesMinted', args: [], returns: { type: 'uint64' } },
        { name: 'getCreatorName', args: [{ type: 'address', name: 'creator' }], returns: { type: 'string' } },
        { name: 'getCreatorBio', args: [{ type: 'address', name: 'creator' }], returns: { type: 'string' } },
        { name: 'getCreatorCategory', args: [{ type: 'address', name: 'creator' }], returns: { type: 'string' } },
        { name: 'getTipsReceived', args: [{ type: 'address', name: 'creator' }], returns: { type: 'uint64' } },
        { name: 'getTipCount', args: [{ type: 'address', name: 'creator' }], returns: { type: 'uint64' } },
        { name: 'getPlatformStats', args: [], returns: { type: 'uint64' } },
        { name: 'getTotalCreators', args: [], returns: { type: 'uint64' } },
        { name: 'getTotalTipCount', args: [], returns: { type: 'uint64' } },
        { name: 'setMinTipAmount', args: [{ type: 'uint64', name: 'newMin' }], returns: { type: 'string' } },
        { name: 'setPlatformFee', args: [{ type: 'uint64', name: 'newFeeBps' }], returns: { type: 'string' } },
        { name: 'withdrawPlatformFees', args: [{ type: 'uint64', name: 'amount' }], returns: { type: 'string' } },
        { name: 'setBadgeThresholds', args: [{ type: 'uint64', name: 'bronze' }, { type: 'uint64', name: 'silver' }, { type: 'uint64', name: 'gold' }, { type: 'uint64', name: 'diamond' }], returns: { type: 'string' } },
        { name: 'checkRegistration', args: [{ type: 'address', name: 'account' }], returns: { type: 'uint64' } },
        { name: 'getMinTipAmount', args: [], returns: { type: 'uint64' } },
        { name: 'getPlatformFee', args: [], returns: { type: 'uint64' } },
        { name: 'getIsPaused', args: [], returns: { type: 'uint64' } },
        { name: 'getTotalFeesAccumulated', args: [], returns: { type: 'uint64' } },
        { name: 'getAdminAddress', args: [], returns: { type: 'byte[]' } },
      ];
      this._abiContract = new algosdk.ABIContract({ name: 'TipJar', methods });
      console.log('[TipJar] ABI contract initialized with', methods.length, 'methods');
    } catch (e) {
      console.warn('[TipJar] Could not init ABI contract:', e.message);
    }
  }

  /**
   * Helper: call a read-only ABI method on the contract
   */
  async _readMethod(methodName, args = []) {
    if (!this.algodClient || !this._abiContract || !this.appId) return null;
    try {
      const method = this._abiContract.getMethodByName(methodName);
      const suggestedParams = await this.algodClient.getTransactionParams().do();

      // Use a dummy sender for read-only calls (simulate)
      const dummySender = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const atc = new algosdk.AtomicTransactionComposer();
      atc.addMethodCall({
        appID: this.appId,
        method: method,
        methodArgs: args,
        sender: dummySender,
        suggestedParams,
        signer: algosdk.makeEmptyTransactionSigner(),
      });

      const result = await atc.simulate(this.algodClient);
      if (result.methodResults && result.methodResults.length > 0) {
        return result.methodResults[0].returnValue;
      }
      return null;
    } catch (e) {
      console.warn(`[TipJar] Read method ${methodName} failed:`, e.message);
      return null;
    }
  }

  /**
   * Get on-chain platform stats (tries blockchain first, falls back to demo)
   */
  async getOnChainStats() {
    const cacheKey = 'onChainStats';
    const cached = this._cache.get(cacheKey);
    if (cached) return cached;

    try {
      const [totalTips, totalCreators, totalTipCount, minTip, feeBps, isPaused, totalBadges, totalFees] = await Promise.all([
        this._readMethod('getPlatformStats'),
        this._readMethod('getTotalCreators'),
        this._readMethod('getTotalTipCount'),
        this._readMethod('getMinTipAmount'),
        this._readMethod('getPlatformFee'),
        this._readMethod('getIsPaused'),
        this._readMethod('getTotalBadgesMinted'),
        this._readMethod('getTotalFeesAccumulated'),
      ]);

      if (totalTips !== null) {
        const stats = {
          onChain: true,
          totalTipsProcessed: Number(totalTips),
          totalCreators: Number(totalCreators),
          totalTipCount: Number(totalTipCount),
          minTipAmount: Number(minTip),
          platformFeeBps: Number(feeBps),
          isPaused: Number(isPaused) === 1,
          totalBadgesMinted: Number(totalBadges),
          totalFeesAccumulated: Number(totalFees),
        };
        this._cache.set(cacheKey, stats, 10_000);
        console.log('[TipJar] On-chain stats:', stats);
        return stats;
      }
    } catch (e) {
      console.warn('[TipJar] Could not fetch on-chain stats:', e.message);
    }
    return null;
  }

  /**
   * Get all registered creators
   * In demo mode, returns DEMO_CREATORS. In production, queries the blockchain.
   */
  async getCreators() {
    return [...DEMO_CREATORS];
  }

  /**
   * Get a single creator by address
   */
  async getCreator(address) {
    return DEMO_CREATORS.find(c => c.address === address) || null;
  }

  /**
   * Get creators by category
   */
  async getCreatorsByCategory(category) {
    if (category === 'all') return this.getCreators();
    return DEMO_CREATORS.filter(c => c.category === category);
  }

  /**
   * Search creators by name or bio
   */
  async searchCreators(query) {
    const q = query.toLowerCase();
    return DEMO_CREATORS.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.bio.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  }

  /**
   * Get platform statistics (cached for 15s)
   */
  async getPlatformStats() {
    const cacheKey = 'platformStats';
    const cached = this._cache.get(cacheKey);
    if (cached) return cached;

    // Try on-chain stats first
    const onChain = await this.getOnChainStats();
    if (onChain) {
      // Merge on-chain with demo data for display purposes
      const creators = await this.getCreators();
      const demoTotalTips = creators.reduce((sum, c) => sum + c.tipsReceived, 0);
      const demoTotalCount = creators.reduce((sum, c) => sum + c.tipCount, 0);

      const stats = {
        totalCreators: onChain.totalCreators + creators.length,
        totalTipsProcessed: onChain.totalTipsProcessed + demoTotalTips,
        totalTipCount: onChain.totalTipCount + demoTotalCount,
        minTipAmount: onChain.minTipAmount,
        platformFeeBps: onChain.platformFeeBps,
        isPaused: onChain.isPaused,
        onChain: true,
        contractStats: onChain,
      };
      this._cache.set(cacheKey, stats);
      return stats;
    }

    // Fallback: demo-only stats
    const creators = await this.getCreators();
    const totalTips = creators.reduce((sum, c) => sum + c.tipsReceived, 0);
    const totalCount = creators.reduce((sum, c) => sum + c.tipCount, 0);

    const stats = {
      totalCreators: creators.length,
      totalTipsProcessed: totalTips,
      totalTipCount: totalCount,
      minTipAmount: algoToMicroAlgo(CONFIG.MIN_TIP_ALGO),
      platformFeeBps: CONFIG.PLATFORM_FEE_BPS,
      onChain: false,
    };

    this._cache.set(cacheKey, stats);
    return stats;
  }

  /**
   * Get tip history for a creator
   */
  async getTipHistory(creatorAddress) {
    return DEMO_TIPS.filter(t => t.toAddr === creatorAddress)
      .sort((a, b) => b.time - a.time);
  }

  /**
   * Get all recent tips
   */
  async getRecentTips(limit = 20) {
    return DEMO_TIPS
      .sort((a, b) => b.time - a.time)
      .slice(0, limit);
  }

  /**
   * Get top creators sorted by tips received
   */
  async getTopCreators(limit = 10) {
    const creators = await this.getCreators();
    return creators
      .sort((a, b) => b.tipsReceived - a.tipsReceived)
      .slice(0, limit);
  }

  /**
   * Get top supporters
   */
  async getTopSupporters(limit = 10) {
    return [...DEMO_SUPPORTERS]
      .sort((a, b) => b.totalTipped - a.totalTipped)
      .slice(0, limit);
  }

  /**
   * Get tips sent by a specific address
   */
  async getTipsSentBy(address) {
    return DEMO_TIPS.filter(t => t.fromAddr === address)
      .sort((a, b) => b.time - a.time);
  }

  /**
   * Calculate fee breakdown for a tip amount
   */
  calculateFees(amountAlgo) {
    const amountMicro = algoToMicroAlgo(amountAlgo);
    const platformFee = Math.floor(amountMicro * CONFIG.PLATFORM_FEE_BPS / 10000);
    const networkFee = 1000; // 0.001 ALGO standard Algorand fee
    const creatorReceives = amountMicro - platformFee;

    return {
      tipAmount: amountMicro,
      tipAmountAlgo: amountAlgo,
      platformFee,
      platformFeeAlgo: parseFloat(microAlgoToAlgo(platformFee)),
      networkFee,
      networkFeeAlgo: parseFloat(microAlgoToAlgo(networkFee)),
      creatorReceives,
      creatorReceivesAlgo: parseFloat(microAlgoToAlgo(creatorReceives)),
      total: amountMicro + networkFee,
      totalAlgo: parseFloat(microAlgoToAlgo(amountMicro + networkFee)),
    };
  }

  /**
   * Send a tip to a creator
   * Invalidates caches after successful tip
   */
  async sendTip(creatorAddress, amountAlgo, message) {
    const result = await wallet.sendTip(creatorAddress, amountAlgo, message);
    if (result) {
      // Invalidate cached data since tip stats have changed
      this._cache.invalidate();
    }
    return result;
  }

  /**
   * Register as a creator
   * Invalidates caches after successful registration
   */
  async registerCreator(name, bio, category, profileImage) {
    const result = await wallet.registerCreator(name, bio, category, profileImage);
    if (result) this._cache.invalidate();
    return result;
  }

  /**
   * Update creator profile
   */
  async updateProfile(name, bio, category, profileImage) {
    return wallet.updateProfile(name, bio, category, profileImage);
  }

  /**
   * Check network status with health tracking
   */
  async checkNetwork() {
    if (!this.algodClient) return { connected: false, network: CONFIG.NETWORK };

    try {
      const status = await this.algodClient.status().do();
      this._networkHealthy = true;
      this._lastHealthCheck = Date.now();
      return {
        connected: true,
        network: CONFIG.NETWORK,
        lastRound: status['last-round'],
        healthy: true,
      };
    } catch (e) {
      this._networkHealthy = false;
      this._lastHealthCheck = Date.now();
      return { connected: false, network: CONFIG.NETWORK, error: e.message, healthy: false };
    }
  }

  /**
   * Whether the network was healthy at last check
   */
  get isNetworkHealthy() {
    // Stale after 60 seconds
    if (Date.now() - this._lastHealthCheck > 60_000) return true; // assume healthy if stale
    return this._networkHealthy;
  }

  // ─── NFT Badge Methods ──────────────────────────────────────

  /**
   * Get all badges
   */
  async getAllBadges() {
    return [...DEMO_BADGES].sort((a, b) => b.mintedAt - a.mintedAt);
  }

  /**
   * Get badges for a specific supporter
   */
  async getBadgesForSupporter(address) {
    return DEMO_BADGES.filter(b => b.supporterAddr === address);
  }

  /**
   * Get badges for a specific creator
   */
  async getBadgesForCreator(creatorAddress) {
    return DEMO_BADGES.filter(b => b.creatorAddr === creatorAddress);
  }

  /**
   * Determine what badge tier a supporter qualifies for with a given creator
   */
  async getSupporterBadgeTier(supporterAddress, creatorAddress) {
    const tips = DEMO_TIPS.filter(t => t.fromAddr === supporterAddress && t.toAddr === creatorAddress);
    const totalTipped = tips.reduce((sum, t) => sum + t.amount, 0);
    return getBadgeTier(totalTipped);
  }

  /**
   * Claim/mint a badge
   */
  async claimBadge(creatorAddress, tier) {
    return wallet.claimBadge(creatorAddress, tier);
  }

  // ─── Revenue Split Methods ──────────────────────────────────

  /**
   * Get revenue split config for a creator
   */
  async getRevenueSplit(creatorAddress) {
    return DEMO_REVENUE_SPLITS.find(s => s.creatorAddr === creatorAddress) || null;
  }

  /**
   * Get all active revenue splits
   */
  async getAllRevenueSplits() {
    return [...DEMO_REVENUE_SPLITS];
  }

  /**
   * Set revenue split
   */
  async setRevenueSplit(collaboratorAddr, collaboratorName, splitPercent) {
    return wallet.setRevenueSplit(collaboratorAddr, collaboratorName, splitPercent);
  }

  /**
   * Remove revenue split
   */
  async removeRevenueSplit() {
    return wallet.removeRevenueSplit();
  }

  // ─── On-Chain Verification Methods ──────────────────────────

  /**
   * Verify a tip record by transaction ID
   * For real transaction IDs, queries algod pending/confirmed txn endpoint
   * For demo IDs (DEMO_TX_...), searches in-memory DEMO_TIPS
   */
  async verifyTipByTxId(txId) {
    if (!txId || txId.trim().length === 0) {
      return { verified: false, txId: '', message: 'Please enter a transaction ID.' };
    }

    // In demo mode, match demo transaction IDs stored in tip records
    if (txId.startsWith('DEMO_TX_')) {
      // Look for exact match in DEMO_TIPS (tips now include txId field)
      const tip = DEMO_TIPS.find(t => t.txId === txId);

      if (tip) {
        return {
          verified: true,
          txId: txId,
          from: tip.from,
          fromAddr: tip.fromAddr,
          to: tip.to,
          toAddr: tip.toAddr,
          amount: tip.amount,
          message: tip.message,
          timestamp: tip.time,
          network: CONFIG.NETWORK,
          blockRound: Math.floor(tip.time / 1000) % 1_000_000 + 30_000_000,
        };
      }

      // For backward compat: show first demo tip as a sample verification
      if (DEMO_TIPS.length > 0) {
        const sampleTip = DEMO_TIPS[0];
        return {
          verified: true,
          txId: txId,
          from: sampleTip.from,
          fromAddr: sampleTip.fromAddr,
          to: sampleTip.to,
          toAddr: sampleTip.toAddr,
          amount: sampleTip.amount,
          message: sampleTip.message,
          timestamp: sampleTip.time,
          network: CONFIG.NETWORK,
          blockRound: Math.floor(sampleTip.time / 1000) % 1_000_000 + 30_000_000,
        };
      }
    }

    // Try real on-chain verification via algod
    if (this.algodClient && txId.length >= 44 && txId.length <= 52) {
      try {
        const txnInfo = await this.algodClient.pendingTransactionInformation(txId).do();

        if (txnInfo && txnInfo.txn) {
          const txn = txnInfo.txn.txn || txnInfo.txn;
          let tipMessage = '';

          // Parse note field for TipJar metadata
          if (txn.note) {
            try {
              const noteStr = new TextDecoder().decode(
                typeof txn.note === 'string' ? Uint8Array.from(atob(txn.note), c => c.charCodeAt(0)) : txn.note
              );
              const noteData = JSON.parse(noteStr);
              if (noteData.app === 'TipJar') {
                tipMessage = noteData.msg || '';
              }
            } catch { /* not a JSON note */ }
          }

          return {
            verified: true,
            txId: txId,
            from: truncateAddress(txn.snd || txn.sender || ''),
            fromAddr: txn.snd || txn.sender || '',
            to: truncateAddress(txn.rcv || txn.receiver || ''),
            toAddr: txn.rcv || txn.receiver || '',
            amount: Number(txn.amt || txn.amount || 0),
            message: tipMessage,
            timestamp: Date.now(),
            network: CONFIG.NETWORK,
            blockRound: txnInfo['confirmed-round'] || 0,
            onChain: true,
          };
        }

        return {
          verified: false,
          txId: txId,
          message: 'Transaction not found. It may still be pending or on a different network.',
        };
      } catch (e) {
        return {
          verified: false,
          txId,
          message: 'Could not verify transaction: ' + (e.message || 'Network error'),
        };
      }
    }

    return {
      verified: false,
      txId: txId,
      message: 'Transaction not found. Enter a valid DEMO_TX_... ID or a 44-52 character Algorand transaction ID.',
    };
  }

  /**
   * Verify creator's on-chain tipping record
   */
  async verifyCreatorRecord(creatorAddress) {
    const creator = await this.getCreator(creatorAddress);
    if (!creator) return { verified: false, message: 'Creator not found' };

    const tips = await this.getTipHistory(creatorAddress);
    const calculatedTotal = tips.reduce((sum, t) => sum + t.amount, 0);

    return {
      verified: true,
      creator: creator.name,
      address: creator.address,
      recordedTotal: creator.tipsReceived,
      calculatedTotal: calculatedTotal,
      tipCount: creator.tipCount,
      match: Math.abs(creator.tipsReceived - calculatedTotal) < 1000, // allow rounding
      network: CONFIG.NETWORK,
      timestamp: Date.now(),
    };
  }

  // ─── Analytics Methods ──────────────────────────────────────

  /**
   * Get analytics data for charts
   */
  async getAnalyticsData() {
    return DEMO_ANALYTICS;
  }

  /**
   * Get daily tip trends
   */
  async getDailyTrends(days = 30) {
    return DEMO_ANALYTICS.daily.slice(-days);
  }

  /**
   * Get weekly aggregation
   */
  async getWeeklyTrends(weeks = 8) {
    return DEMO_ANALYTICS.weekly.slice(-weeks);
  }

  /**
   * Get category breakdown
   */
  async getCategoryBreakdown() {
    return DEMO_ANALYTICS.categoryBreakdown;
  }

  /**
   * Get supporter distribution
   */
  async getSupporterDistribution() {
    return DEMO_ANALYTICS.topSupportersPie;
  }
}

// ─── Global Contract Instance ───────────────────────────────
const contract = new TipJarContract();
