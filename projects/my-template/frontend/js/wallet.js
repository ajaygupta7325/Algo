/**
 * TipJar - Wallet Management (Production)
 * Handles wallet connection with real Algorand wallet support (Pera + Defly)
 * Includes error classification, retry logic, network validation, and loading states
 */

// ─── Error Classification ───────────────────────────────────
class TipJarError extends Error {
  /**
   * @param {string} message
   * @param {'USER_REJECTED'|'NETWORK'|'INSUFFICIENT_FUNDS'|'INVALID_INPUT'|'CONTRACT'|'TIMEOUT'|'UNKNOWN'} code
   * @param {Error} [cause]
   */
  constructor(message, code = 'UNKNOWN', cause = null) {
    super(message);
    this.name = 'TipJarError';
    this.code = code;
    this.cause = cause;
    this.timestamp = Date.now();
  }

  /** Whether this error is retryable */
  get retryable() {
    return ['NETWORK', 'TIMEOUT'].includes(this.code);
  }
}

/**
 * Classify a raw error into a TipJarError
 * @param {Error} error
 * @returns {TipJarError}
 */
function classifyError(error) {
  const msg = (error?.message || '').toLowerCase();

  if (msg.includes('cancelled') || msg.includes('rejected') || msg.includes('user denied') ||
      error?.data?.type === 'CONNECT_MODAL_CLOSED') {
    return new TipJarError('Transaction cancelled by user', 'USER_REJECTED', error);
  }
  if (msg.includes('insufficient') || msg.includes('below min') || msg.includes('overspend')) {
    return new TipJarError('Insufficient funds for this transaction', 'INSUFFICIENT_FUNDS', error);
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout') || msg.includes('econnrefused')) {
    return new TipJarError('Network error - please check your connection', 'NETWORK', error);
  }
  if (msg.includes('assert') || msg.includes('logic eval')) {
    return new TipJarError('Smart contract rejected the transaction: ' + error.message, 'CONTRACT', error);
  }
  return new TipJarError(error.message || 'An unexpected error occurred', 'UNKNOWN', error);
}

// ─── Retry Helper ───────────────────────────────────────────
/**
 * Retry an async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} [maxRetries=3]
 * @param {number} [baseDelay=1000]
 * @returns {Promise<*>}
 */
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const classified = classifyError(error);
      // Don't retry user rejections or input errors
      if (!classified.retryable) throw classified;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw classifyError(lastError);
}

class WalletManager {
  constructor() {
    this.connected = false;
    this.address = null;
    this.balance = 0;
    this.mode = null; // 'demo' | 'pera' | 'defly'
    this.listeners = [];
    this.loading = false; // Global loading state

    // Demo wallet state
    this.demoAddress = 'DEMOWALLET' + 'A'.repeat(48);
    this.demoBalance = 100_000_000; // 100 ALGO in microALGO
    this.isRegistered = false;
    this.creatorProfile = null;

    // Wallet SDK instances
    this.peraWallet = null;
    this.deflyWallet = null;

    // Algod client for balance queries
    this.algodClient = null;

    // Balance refresh interval handle
    this._balanceRefreshTimer = null;

    // SDKs are loaded synchronously via script tags (self-contained bundles)
    this._sdksReady = this._initSDKs();
    this._initBalanceRefresh();

    // Auto-reconnect saved session (demo mode or restore creator state)
    this._restoreSession();
  }

  // ─── Session Persistence ────────────────────────────────────
  static SESSION_KEY = 'tipjar_wallet_session';

  /**
   * Save wallet session to localStorage
   */
  _saveSession() {
    try {
      const session = {
        mode: this.mode,
        address: this.address,
        balance: this.balance,
        isRegistered: this.isRegistered,
        creatorProfile: this.creatorProfile,
        savedAt: Date.now(),
      };
      localStorage.setItem(WalletManager.SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn('[TipJar] Could not save wallet session:', e.message);
    }
  }

  /**
   * Clear saved wallet session
   */
  _clearSession() {
    try {
      localStorage.removeItem(WalletManager.SESSION_KEY);
    } catch (e) { /* ignore */ }
  }

  /**
   * Restore wallet session on page load
   */
  _restoreSession() {
    try {
      const raw = localStorage.getItem(WalletManager.SESSION_KEY);
      if (!raw) return;
      const session = JSON.parse(raw);
      if (!session || !session.mode || !session.address) return;

      if (session.mode === 'demo') {
        // Auto-reconnect demo mode
        this.connected = true;
        this.address = session.address;
        this.balance = session.balance || this.demoBalance;
        this.mode = 'demo';
        this._restoreCreatorState(session);
        console.log('[TipJar] Demo session restored ✅');
        // Delay notify so DOM is ready
        setTimeout(() => this._notify(), 0);
      } else {
        // For Pera/Defly, SDK reconnect handles connection.
        // We just need to restore creator registration state after SDK reconnects.
        this._pendingCreatorState = session;
      }
    } catch (e) {
      console.warn('[TipJar] Could not restore wallet session:', e.message);
    }
  }

  /**
   * Restore creator registration state from a session or from DEMO_CREATORS
   */
  _restoreCreatorState(session) {
    // First try session data
    if (session && session.isRegistered && session.creatorProfile) {
      this.isRegistered = true;
      this.creatorProfile = session.creatorProfile;
      return;
    }
    // Fallback: check if address exists in persisted DEMO_CREATORS
    if (this.address) {
      const existing = DEMO_CREATORS.find(c => c.address === this.address);
      if (existing) {
        this.isRegistered = true;
        this.creatorProfile = {
          name: existing.name,
          bio: existing.bio,
          category: existing.category,
          profileImage: existing.profileImage || '',
          tipsReceived: existing.tipsReceived,
          tipCount: existing.tipCount,
          address: existing.address,
        };
      }
    }
  }

  /**
   * Initialize wallet SDKs and Algod client.
   * Pera & Defly SDK bundles are loaded via <script> tags in index.html
   * and set window.PeraWalletConnect / window.DeflyWalletConnect globals.
   */
  async _initSDKs() {
    // Initialize Algod client for querying balances and sending txns
    try {
      if (typeof algosdk !== 'undefined') {
        this.algodClient = new algosdk.Algodv2(
          CONFIG.ALGOD_TOKEN || '',
          CONFIG.ALGOD_SERVER,
          CONFIG.ALGOD_PORT || ''
        );
      }
    } catch (e) {
      console.warn('AlgoSDK not available for Algod client:', e);
    }

    // ── Initialize Pera Wallet (loaded from pera-connect.bundle.js) ──
    if (typeof PeraWalletConnect !== 'undefined') {
      try {
        this.peraWallet = new PeraWalletConnect({
          chainId: CONFIG.NETWORK === 'mainnet' ? 416001 : 416002,
        });
        console.log('[TipJar] Pera Wallet SDK initialized ✅');

        // Auto-reconnect if previously connected
        this.peraWallet.reconnectSession().then((accounts) => {
          if (accounts.length > 0 && !this.connected) {
            this.address = accounts[0];
            this.connected = true;
            this.mode = 'pera';
            this._restoreCreatorState(this._pendingCreatorState || null);
            this._pendingCreatorState = null;
            this._fetchBalance().then(() => this._notify());
          }
        }).catch(() => { /* No previous session */ });

        this.peraWallet.connector?.on('disconnect', () => {
          if (this.mode === 'pera') this.disconnect();
        });
      } catch (e) {
        console.warn('[TipJar] Pera Wallet initialization error:', e);
      }
    } else {
      console.warn('[TipJar] PeraWalletConnect not found — check that pera-connect.bundle.js loaded');
    }

    // ── Initialize Defly Wallet (loaded from defly-connect.bundle.js) ──
    if (typeof DeflyWalletConnect !== 'undefined') {
      try {
        this.deflyWallet = new DeflyWalletConnect({
          chainId: CONFIG.NETWORK === 'mainnet' ? 416001 : 416002,
        });
        console.log('[TipJar] Defly Wallet SDK initialized ✅');

        this.deflyWallet.reconnectSession().then((accounts) => {
          if (accounts.length > 0 && !this.connected) {
            this.address = accounts[0];
            this.connected = true;
            this.mode = 'defly';
            this._restoreCreatorState(this._pendingCreatorState || null);
            this._pendingCreatorState = null;
            this._fetchBalance().then(() => this._notify());
          }
        }).catch(() => { /* No previous session */ });

        this.deflyWallet.connector?.on('disconnect', () => {
          if (this.mode === 'defly') this.disconnect();
        });
      } catch (e) {
        console.warn('[TipJar] Defly Wallet initialization error:', e);
      }
    } else {
      console.warn('[TipJar] DeflyWalletConnect not found — check that defly-connect.bundle.js loaded');
    }
  }

  /**
   * Subscribe to wallet state changes
   */
  onChange(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove a listener
   */
  offChange(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  /**
   * Set loading state and notify listeners
   */
  _setLoading(loading) {
    this.loading = loading;
    this._notify();
  }

  /**
   * Auto-refresh balance on window focus and periodic timer
   */
  _initBalanceRefresh() {
    // Refresh balance when user returns to tab
    window.addEventListener('focus', () => {
      if (this.connected && this.mode !== 'demo') {
        this._fetchBalance().then(() => this._notify());
      }
    });

    // Periodic refresh every 30 seconds for real wallets
    this._balanceRefreshTimer = setInterval(() => {
      if (this.connected && this.mode !== 'demo' && document.visibilityState === 'visible') {
        this._fetchBalance().then(() => this._notify());
      }
    }, 30_000);
  }

  /**
   * Validate connected wallet network matches CONFIG
   * @returns {Promise<{match: boolean, expected: string, actual: string}>}
   */
  async validateNetwork() {
    if (!this.algodClient) return { match: true, expected: CONFIG.NETWORK, actual: 'unknown' };

    try {
      const params = await this.algodClient.getTransactionParams().do();
      const genesisId = params.genesisID || '';
      let detectedNetwork = 'unknown';

      if (genesisId.includes('testnet')) detectedNetwork = 'testnet';
      else if (genesisId.includes('mainnet')) detectedNetwork = 'mainnet';
      else if (genesisId.includes('devnet') || genesisId.includes('sandnet')) detectedNetwork = 'localnet';

      return {
        match: detectedNetwork === CONFIG.NETWORK || detectedNetwork === 'unknown',
        expected: CONFIG.NETWORK,
        actual: detectedNetwork,
      };
    } catch {
      return { match: true, expected: CONFIG.NETWORK, actual: 'unreachable' };
    }
  }

  /**
   * Notify all listeners of state changes
   */
  _notify() {
    this.listeners.forEach(cb => cb({
      connected: this.connected,
      address: this.address,
      balance: this.balance,
      mode: this.mode,
      isRegistered: this.isRegistered,
      creatorProfile: this.creatorProfile,
      loading: this.loading,
    }));
  }

  /**
   * Connect wallet - shows options modal
   */
  async connect() {
    return new Promise((resolve) => {
      // Create wallet selection modal
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active';
      overlay.innerHTML = `
        <div class="modal">
          <div class="modal-icon">🔗</div>
          <h2 class="modal-title">Connect Wallet</h2>
          <p class="modal-desc">Choose how to connect to TipJar</p>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <button class="btn btn-primary btn-lg btn-full" id="walletOptDemo">
              🎮 Demo Mode
            </button>
            <button class="btn btn-secondary btn-lg btn-full" id="walletOptPera">
              📱 Pera Wallet
            </button>
            <button class="btn btn-secondary btn-lg btn-full" id="walletOptDefly">
              🦅 Defly Wallet
            </button>
            <button class="btn btn-outline btn-full" id="walletOptCancel" style="margin-top: 0.5rem;">
              Cancel
            </button>
          </div>
          <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 1rem;">
            Demo mode uses simulated balances. For real transactions, use Pera or Defly on Algorand TestNet.
          </p>
        </div>
      `;

      document.body.appendChild(overlay);

      // Demo mode
      overlay.querySelector('#walletOptDemo').addEventListener('click', () => {
        overlay.remove();
        this._connectDemo();
        resolve(true);
      });

      // Pera Wallet
      overlay.querySelector('#walletOptPera').addEventListener('click', () => {
        overlay.remove();
        this._connectPera().then(resolve);
      });

      // Defly Wallet
      overlay.querySelector('#walletOptDefly').addEventListener('click', () => {
        overlay.remove();
        this._connectDefly().then(resolve);
      });

      // Cancel
      overlay.querySelector('#walletOptCancel').addEventListener('click', () => {
        overlay.remove();
        resolve(false);
      });

      // Click outside
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(false);
        }
      });
    });
  }

  /**
   * Connect in demo mode (simulated)
   */
  _connectDemo() {
    this.connected = true;
    this.address = this.demoAddress;
    this.balance = this.demoBalance;
    this.mode = 'demo';
    this.isRegistered = false;
    this.creatorProfile = null;

    // Restore creator state if previously registered with this address
    this._restoreCreatorState(null);

    this._saveSession();
    showToast('Connected in Demo Mode! 🎮 Balance: 100 ALGO', 'success');
    this._notify();
  }

  /**
   * Connect via Pera Wallet (real wallet)
   */
  async _connectPera() {
    // Ensure SDKs have finished loading
    await this._sdksReady;

    if (!this.peraWallet) {
      showToast('Pera Wallet SDK not loaded. Make sure pera-connect.bundle.js is present and refresh the page.', 'error');
      return false;
    }

    try {
      const accounts = await this.peraWallet.connect();
      if (accounts && accounts.length > 0) {
        this.connected = true;
        this.address = accounts[0];
        this.mode = 'pera';
        this.isRegistered = false;
        this.creatorProfile = null;

        // Restore creator state if previously registered
        this._restoreCreatorState(this._pendingCreatorState || null);
        this._pendingCreatorState = null;

        // Fetch real balance from Algorand network
        await this._fetchBalance();

        this._saveSession();
        showToast(`Pera Wallet connected! 📱 Address: ${truncateAddress(this.address)}`, 'success');
        this._notify();

        // Listen for disconnect
        this.peraWallet.connector?.on('disconnect', () => {
          this.disconnect();
        });

        return true;
      }
      return false;
    } catch (error) {
      if (error?.data?.type !== 'CONNECT_MODAL_CLOSED') {
        showToast('Pera Wallet connection failed: ' + (error.message || 'Unknown error'), 'error');
        console.error('Pera connect error:', error);
      }
      return false;
    }
  }

  /**
   * Connect via Defly Wallet (real wallet)
   */
  async _connectDefly() {
    // Ensure SDKs have finished loading
    await this._sdksReady;

    if (!this.deflyWallet) {
      showToast('Defly Wallet SDK not loaded. Make sure defly-connect.bundle.js is present and refresh the page.', 'error');
      return false;
    }

    try {
      const accounts = await this.deflyWallet.connect();
      if (accounts && accounts.length > 0) {
        this.connected = true;
        this.address = accounts[0];
        this.mode = 'defly';
        this.isRegistered = false;
        this.creatorProfile = null;

        // Restore creator state if previously registered
        this._restoreCreatorState(this._pendingCreatorState || null);
        this._pendingCreatorState = null;

        await this._fetchBalance();

        this._saveSession();
        showToast(`Defly Wallet connected! 🦅 Address: ${truncateAddress(this.address)}`, 'success');
        this._notify();

        this.deflyWallet.connector?.on('disconnect', () => {
          this.disconnect();
        });

        return true;
      }
      return false;
    } catch (error) {
      if (error?.data?.type !== 'CONNECT_MODAL_CLOSED') {
        showToast('Defly Wallet connection failed: ' + (error.message || 'Unknown error'), 'error');
        console.error('Defly connect error:', error);
      }
      return false;
    }
  }

  /**
   * Fetch wallet balance from Algorand network
   */
  async _fetchBalance() {
    if (!this.algodClient || !this.address || this.mode === 'demo') return;

    try {
      const accountInfo = await this.algodClient.accountInformation(this.address).do();
      this.balance = Number(accountInfo.amount || accountInfo['amount'] || 0);
    } catch (error) {
      console.warn('Could not fetch balance:', error);
      this.balance = 0;
    }
  }

  /**
   * Refresh balance from network (for real wallets)
   */
  async refreshBalance() {
    if (this.mode === 'demo') return;
    await this._fetchBalance();
    this._notify();
  }

  /**
   * Disconnect wallet
   */
  disconnect() {
    // Disconnect the active wallet SDK
    try {
      if (this.mode === 'pera' && this.peraWallet) {
        this.peraWallet.disconnect();
      } else if (this.mode === 'defly' && this.deflyWallet) {
        this.deflyWallet.disconnect();
      }
    } catch (e) {
      console.warn('Wallet SDK disconnect error:', e);
    }

    this.connected = false;
    this.address = null;
    this.balance = 0;
    this.mode = null;
    this.isRegistered = false;
    this.creatorProfile = null;

    this._clearSession();
    showToast('Wallet disconnected', 'info');
    this._notify();
  }

  /**
   * Register as a creator (demo mode)
   */
  async registerCreator(name, bio, category, profileImage, receiverAddress) {
    if (!this.connected) {
      showToast('Please connect your wallet first', 'error');
      return false;
    }

    // Validate receiver address
    if (!receiverAddress || receiverAddress.trim().length !== 58) {
      showToast('A valid 58-character Algorand receiver address is required', 'error');
      return false;
    }

    // Input validation with length limits matching smart contract
    if (!name || name.trim().length === 0) {
      showToast('Creator name is required', 'error');
      return false;
    }
    if (name.trim().length > 50) {
      showToast('Creator name must be 50 characters or less', 'error');
      return false;
    }
    if (!bio || bio.trim().length === 0) {
      showToast('Bio is required', 'error');
      return false;
    }
    if (bio.trim().length > 200) {
      showToast('Bio must be 200 characters or less', 'error');
      return false;
    }
    if (!category) {
      showToast('Category is required', 'error');
      return false;
    }
    if (profileImage && profileImage.length > 200) {
      showToast('Profile image URL must be 200 characters or less', 'error');
      return false;
    }

    // Prevent double-registration
    if (this.isRegistered) {
      showToast('You are already registered as a creator', 'error');
      return false;
    }

    this._setLoading(true);

    // Simulate blockchain transaction delay
    await this._simulateDelay(1500);

    this.isRegistered = true;
    this.creatorProfile = {
      name: name.trim(),
      bio: bio.trim(),
      category,
      profileImage: profileImage || '',
      tipsReceived: 0,
      tipCount: 0,
      address: receiverAddress.trim(),
    };

    // Add to demo creators list
    DEMO_CREATORS.push({
      address: receiverAddress.trim(),
      name: name.trim(),
      bio: bio.trim(),
      category,
      profileImage: profileImage || '',
      tipsReceived: 0,
      tipCount: 0,
      avatar: getCategoryIcon(category),
    });

    // Persist changes
    saveDemoData();
    this._saveSession();

    this._setLoading(false);
    showToast(`Registered as creator: ${name.trim()} ✨`, 'success');
    this._notify();
    return true;
  }

  /**
   * Update creator profile (demo mode)
   */
  async updateProfile(name, bio, category, profileImage, receiverAddress) {
    if (!this.isRegistered) {
      showToast('You are not registered as a creator', 'error');
      return false;
    }

    // Input length validation matching smart contract
    if (!name || name.trim().length === 0 || name.trim().length > 50) {
      showToast('Name must be 1-50 characters', 'error');
      return false;
    }
    if (!bio || bio.trim().length === 0 || bio.trim().length > 200) {
      showToast('Bio must be 1-200 characters', 'error');
      return false;
    }
    if (profileImage && profileImage.length > 200) {
      showToast('Profile image URL must be 200 characters or less', 'error');
      return false;
    }
    if (!receiverAddress || receiverAddress.trim().length !== 58) {
      showToast('A valid 58-character Algorand receiver address is required', 'error');
      return false;
    }

    this._setLoading(true);
    await this._simulateDelay(1000);

    const oldAddress = this.creatorProfile?.address;
    this.creatorProfile = { ...this.creatorProfile, name, bio, category, profileImage, address: receiverAddress.trim() };

    // Update in demo creators list
    const idx = DEMO_CREATORS.findIndex(c => c.address === oldAddress || c.address === this.address);
    if (idx >= 0) {
      DEMO_CREATORS[idx] = { ...DEMO_CREATORS[idx], name, bio, category, profileImage, address: receiverAddress.trim() };
    }

    // Persist changes
    saveDemoData();
    this._saveSession();

    this._setLoading(false);
    showToast('Profile updated successfully! ✅', 'success');
    this._notify();
    return true;
  }

  /**
   * Send a tip
   * Uses real Algorand transactions for Pera/Defly, simulated for demo
   */
  async sendTip(creatorAddress, amountAlgo, message) {
    if (!this.connected) {
      showToast('Please connect your wallet first', 'error');
      return null;
    }

    // SECURITY: Validate creator address format
    if (!creatorAddress || creatorAddress.length < 10) {
      showToast('Invalid creator address', 'error');
      return null;
    }

    const amountMicro = algoToMicroAlgo(amountAlgo);

    if (amountMicro < algoToMicroAlgo(CONFIG.MIN_TIP_ALGO)) {
      showToast(`Minimum tip is ${CONFIG.MIN_TIP_ALGO} ALGO`, 'error');
      return null;
    }

    if (amountMicro > this.balance) {
      showToast('Insufficient balance', 'error');
      return null;
    }

    // SECURITY: Prevent self-tipping
    if (creatorAddress === this.address) {
      showToast('You cannot tip yourself', 'error');
      return null;
    }

    // Calculate fee
    const platformFee = Math.floor(amountMicro * CONFIG.PLATFORM_FEE_BPS / 10000);
    const creatorReceives = amountMicro - platformFee;

    let txId = null;
    this._setLoading(true);

    // ── Real Transaction (Pera / Defly) ──
    // Sends payment directly to creator with structured note.
    // Production upgrade: create atomic group (payment + app call to sendTip ABI method)
    if (this.mode !== 'demo' && this.algodClient) {
      try {
        // Validate network before transacting
        const networkCheck = await this.validateNetwork();
        if (!networkCheck.match) {
          this._setLoading(false);
          showToast(`Network mismatch: expected ${networkCheck.expected}, connected to ${networkCheck.actual}`, 'error');
          return null;
        }

        txId = await withRetry(async () => {
          const suggestedParams = await this.algodClient.getTransactionParams().do();
          const note = new TextEncoder().encode(
            JSON.stringify({ app: 'TipJar', v: 2, msg: (message || '').slice(0, 200), ts: Date.now() })
          );

          const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            from: this.address,
            to: creatorAddress,
            amount: creatorReceives,
            note: note,
            suggestedParams,
          });

          // Sign with the active wallet
          const singleTxnGroups = [{ txn, signers: [this.address] }];
          let signedTxns;

          if (this.mode === 'pera' && this.peraWallet) {
            signedTxns = await this.peraWallet.signTransaction([singleTxnGroups]);
          } else if (this.mode === 'defly' && this.deflyWallet) {
            signedTxns = await this.deflyWallet.signTransaction([singleTxnGroups]);
          }

          if (!signedTxns || signedTxns.length === 0) {
            throw new TipJarError('Transaction was cancelled', 'USER_REJECTED');
          }

          // Submit transaction
          const { txId: submittedTxId } = await this.algodClient.sendRawTransaction(signedTxns).do();

          // Wait for confirmation (4 rounds)
          await algosdk.waitForConfirmation(this.algodClient, submittedTxId, 4);

          return submittedTxId;
        }, 2); // max 2 retries for network errors only

        // Refresh balance after transaction
        await this._fetchBalance();

        showToast(`Tip sent on-chain! TX: ${truncateAddress(txId)}`, 'success');
      } catch (error) {
        this._setLoading(false);
        const classified = error instanceof TipJarError ? error : classifyError(error);
        if (classified.code === 'USER_REJECTED') {
          showToast('Transaction was cancelled by user', 'info');
        } else {
          showToast(classified.message, 'error');
          console.error('Send tip error:', classified.code, error);
        }
        return null;
      }
    } else {
      // ── Demo Mode (simulated) ──
      await this._simulateDelay(2000);
      this.balance -= amountMicro;
      txId = 'DEMO_TX_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10).toUpperCase();
    }

    // Update creator stats (for UI)
    const creator = DEMO_CREATORS.find(c => c.address === creatorAddress);
    if (creator) {
      creator.tipsReceived += amountMicro;
      creator.tipCount += 1;
    }

    // Update supporter stats
    const senderName = this.creatorProfile?.name || truncateAddress(this.address);
    const existingSupporter = DEMO_SUPPORTERS.find(s => s.address === truncateAddress(this.address) || s.name === senderName);
    if (existingSupporter) {
      existingSupporter.totalTipped += amountMicro;
      existingSupporter.tipCount += 1;
    } else {
      DEMO_SUPPORTERS.push({
        name: senderName,
        address: truncateAddress(this.address),
        totalTipped: amountMicro,
        tipCount: 1,
        avatar: '⭐',
      });
    }

    // Add to tip history
    const tipRecord = {
      from: senderName,
      fromAddr: this.address,
      to: creator?.name || truncateAddress(creatorAddress),
      toAddr: creatorAddress,
      amount: amountMicro,
      message: message || '',
      time: Date.now(),
    };
    DEMO_TIPS.unshift(tipRecord);

    // Persist changes
    saveDemoData();
    this._saveSession();

    this._setLoading(false);
    this._notify();

    return {
      txId,
      amount: amountMicro,
      fee: platformFee,
      creatorReceives,
      creator: creator?.name || truncateAddress(creatorAddress),
    };
  }

  /**
   * Get wallet balance formatted
   */
  getBalanceAlgo() {
    return microAlgoToAlgo(this.balance);
  }

  /**
   * Claim/mint an NFT badge (demo mode)
   */
  async claimBadge(creatorAddress, tier) {
    if (!this.connected) {
      showToast('Please connect your wallet first', 'error');
      return null;
    }

    await this._simulateDelay(2000);

    const creator = DEMO_CREATORS.find(c => c.address === creatorAddress);
    const tierInfo = BADGE_TIERS[tier];

    if (!tierInfo) {
      showToast('Invalid badge tier', 'error');
      return null;
    }

    const badge = {
      supporter: this.creatorProfile?.name || truncateAddress(this.address),
      supporterAddr: this.address,
      creator: creator?.name || truncateAddress(creatorAddress),
      creatorAddr: creatorAddress,
      tier: tier,
      totalTipped: tierInfo.threshold,
      mintedAt: Date.now(),
      assetId: 2000 + DEMO_BADGES.length,
    };

    DEMO_BADGES.push(badge);
    saveDemoData();
    showToast(`${tierInfo.icon} ${tierInfo.name} Badge minted as NFT!`, 'success');
    return badge;
  }

  /**
   * Set revenue split for creator (demo mode)
   */
  async setRevenueSplit(collaboratorAddr, collaboratorName, splitPercent) {
    if (!this.isRegistered) {
      showToast('You must be a registered creator', 'error');
      return false;
    }

    if (!collaboratorAddr || collaboratorAddr.trim().length < 10) {
      showToast('Invalid collaborator address', 'error');
      return false;
    }

    if (!collaboratorName || collaboratorName.trim().length === 0) {
      showToast('Collaborator name is required', 'error');
      return false;
    }

    if (splitPercent < 1 || splitPercent > 50) {
      showToast('Split must be between 1% and 50%', 'error');
      return false;
    }

    // Prevent setting self as collaborator
    if (collaboratorAddr === this.address) {
      showToast('Cannot set yourself as collaborator', 'error');
      return false;
    }

    await this._simulateDelay(1500);

    // Update or add revenue split
    const existingIdx = DEMO_REVENUE_SPLITS.findIndex(s => s.creatorAddr === this.address);
    const splitData = {
      creator: this.creatorProfile.name,
      creatorAddr: this.address,
      collaborator: collaboratorName,
      collaboratorAddr: collaboratorAddr,
      splitPercent: splitPercent,
    };

    if (existingIdx >= 0) {
      DEMO_REVENUE_SPLITS[existingIdx] = splitData;
    } else {
      DEMO_REVENUE_SPLITS.push(splitData);
    }

    saveDemoData();
    showToast(`Revenue split set: ${splitPercent}% to ${collaboratorName} ✅`, 'success');
    this._notify();
    return true;
  }

  /**
   * Remove revenue split (demo mode)
   */
  async removeRevenueSplit() {
    if (!this.isRegistered) {
      showToast('You must be a registered creator', 'error');
      return false;
    }

    await this._simulateDelay(1000);

    const idx = DEMO_REVENUE_SPLITS.findIndex(s => s.creatorAddr === this.address);
    if (idx >= 0) {
      DEMO_REVENUE_SPLITS.splice(idx, 1);
    }

    saveDemoData();
    showToast('Revenue split removed', 'success');
    this._notify();
    return true;
  }

  /**
   * Simulate network delay
   */
  _simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources (call on app shutdown)
   */
  destroy() {
    if (this._balanceRefreshTimer) {
      clearInterval(this._balanceRefreshTimer);
      this._balanceRefreshTimer = null;
    }
    this.listeners = [];
  }
}

// ─── Global Wallet Instance ─────────────────────────────────
const wallet = new WalletManager();
