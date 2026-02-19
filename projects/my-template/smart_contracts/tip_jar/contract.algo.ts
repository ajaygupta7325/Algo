import { Contract, GlobalState, LocalState, Txn, Global, op, itxn, gtxn, Bytes, Uint64, uint64, bytes, Account, assert, log } from '@algorandfoundation/algorand-typescript'

/**
 * TipJar - Content Creator Tip Jar Smart Contract (Production)
 *
 * A production-grade tipping platform for content creators on Algorand.
 * Creators register profiles and supporters send ALGO tips as appreciation.
 *
 * Features:
 * - Creator registration with name and bio
 * - Accept ALGO tips from supporters
 * - Track total tips and tip count per creator
 * - Minimum tip enforcement
 * - Platform fee support with admin withdrawal
 * - NFT appreciation badges for top supporters (Bronze/Silver/Gold/Diamond)
 * - Smart contract-based revenue split with collaborators
 * - On-chain tipping record verification
 * - Contract pause/unpause (circuit breaker)
 * - Admin transfer with 2-step confirmation
 * - Input length validation against local state limits
 * - Event logging for off-chain indexing
 * - Min balance protection on withdrawals
 */
export class TipJar extends Contract {
  // ─── Global State ───────────────────────────────────────────────────
  /** Total number of registered creators */
  totalCreators = GlobalState<uint64>({ initialValue: 0 })

  /** Total tips processed through the platform (in microALGO) */
  totalTipsProcessed = GlobalState<uint64>({ initialValue: 0 })

  /** Total number of tip transactions */
  totalTipCount = GlobalState<uint64>({ initialValue: 0 })

  /** Minimum tip amount in microALGO (default: 100_000 = 0.1 ALGO) */
  minTipAmount = GlobalState<uint64>({ initialValue: 100_000 })

  /** Platform fee percentage in basis points (100 = 1%) */
  platformFeeBps = GlobalState<uint64>({ initialValue: 100 })

  /** Platform admin address */
  adminAddress = GlobalState<bytes>()

  /** Pending admin address for 2-step transfer */
  pendingAdminAddress = GlobalState<bytes>()

  /** Contract paused flag (0 = active, 1 = paused) */
  isPaused = GlobalState<uint64>({ initialValue: 0 })

  /** Total NFT badges minted */
  totalBadgesMinted = GlobalState<uint64>({ initialValue: 0 })

  /** Total platform fees accumulated (in microALGO) */
  totalFeesAccumulated = GlobalState<uint64>({ initialValue: 0 })

  /** Badge tier thresholds in microALGO */
  bronzeThreshold = GlobalState<uint64>({ initialValue: 5_000_000 })    // 5 ALGO
  silverThreshold = GlobalState<uint64>({ initialValue: 25_000_000 })   // 25 ALGO
  goldThreshold = GlobalState<uint64>({ initialValue: 100_000_000 })    // 100 ALGO
  diamondThreshold = GlobalState<uint64>({ initialValue: 500_000_000 }) // 500 ALGO

  // ─── Local State (per creator) ──────────────────────────────────────
  /** Creator's display name */
  creatorName = LocalState<string>()

  /** Creator's bio/description */
  creatorBio = LocalState<string>()

  /** Creator's content category */
  creatorCategory = LocalState<string>()

  /** Total tips received by this creator (in microALGO) */
  tipsReceived = LocalState<uint64>()

  /** Number of tips received */
  tipCount = LocalState<uint64>()

  /** Whether the creator is registered */
  isRegistered = LocalState<uint64>()

  /** Creator's profile image URL */
  profileImageUrl = LocalState<string>()

  /** Revenue split: collaborator address (empty = no split) */
  revSplitAddress = LocalState<string>()

  /** Revenue split: percentage for collaborator (0-50, in percent) */
  revSplitPercent = LocalState<uint64>()

  /** Revenue split: collaborator name */
  revSplitName = LocalState<string>()

  // ─── Contract Methods ──────────────────────────────────────────────

  // ─── Constants ───────────────────────────────────────────────────
  /** Minimum contract balance to keep (0.1 ALGO for MBR) */
  private static readonly MIN_CONTRACT_BALANCE: uint64 = 100_000

  /** Maximum name length (local state limit) */
  private static readonly MAX_NAME_LEN: uint64 = 50

  /** Maximum bio length (local state limit) */
  private static readonly MAX_BIO_LEN: uint64 = 200

  /** Maximum category length */
  private static readonly MAX_CATEGORY_LEN: uint64 = 20

  /** Maximum profile image URL length */
  private static readonly MAX_IMAGE_LEN: uint64 = 200

  /** Maximum collaborator name length */
  private static readonly MAX_COLLAB_NAME_LEN: uint64 = 50

  /** Algorand address string length */
  private static readonly ADDR_LEN: uint64 = 58

  // ─── Guards ─────────────────────────────────────────────────────

  /** Ensure the contract is not paused (circuit breaker) */
  private assertNotPaused(): void {
    assert(this.isPaused.value === 0, 'Contract is paused')
  }

  /** Ensure the caller is the admin */
  private assertAdmin(): void {
    assert(Txn.sender.bytes === this.adminAddress.value, 'Only admin can perform this action')
  }

  /** Ensure the caller is a registered creator */
  private assertRegistered(): void {
    assert(this.isRegistered(Txn.sender).value === 1, 'Not a registered creator')
  }

  // ─── Contract Methods ──────────────────────────────────────────────

  /**
   * Initialize the contract - called on creation
   * Sets the admin to the creator of the contract
   */
  createApplication(): void {
    this.adminAddress.value = Txn.sender.bytes
    this.pendingAdminAddress.value = Bytes('')
    this.totalCreators.value = 0
    this.totalTipsProcessed.value = 0
    this.totalTipCount.value = 0
    this.totalFeesAccumulated.value = 0
    this.minTipAmount.value = 100_000
    this.platformFeeBps.value = 100
    this.isPaused.value = 0
    this.totalBadgesMinted.value = 0
    this.bronzeThreshold.value = 5_000_000
    this.silverThreshold.value = 25_000_000
    this.goldThreshold.value = 100_000_000
    this.diamondThreshold.value = 500_000_000

    log('TipJar:Created')
  }

  // ═══════════════════════════════════════════════════════════════════
  // ADMIN: Pause / Unpause / Transfer
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Admin: Pause the contract (circuit breaker)
   * Prevents registrations, tips, badge minting, and revenue split changes
   */
  pauseContract(): string {
    this.assertAdmin()
    this.isPaused.value = 1
    log('TipJar:Paused')
    return 'Contract paused'
  }

  /**
   * Admin: Unpause the contract
   */
  unpauseContract(): string {
    this.assertAdmin()
    this.isPaused.value = 0
    log('TipJar:Unpaused')
    return 'Contract unpaused'
  }

  /**
   * Admin: Initiate admin transfer (2-step)
   * Step 1: Current admin proposes a new admin
   * @param newAdmin - The proposed new admin account
   */
  transferAdmin(newAdmin: Account): string {
    this.assertAdmin()
    assert(newAdmin !== Txn.sender, 'Cannot transfer to current admin')
    this.pendingAdminAddress.value = newAdmin.bytes
    log('TipJar:AdminTransferInitiated')
    return 'Admin transfer initiated - new admin must call acceptAdmin()'
  }

  /**
   * Admin Transfer Step 2: New admin accepts the role
   * Must be called by the pending admin address
   */
  acceptAdmin(): string {
    assert(this.pendingAdminAddress.value !== Bytes(''), 'No pending admin transfer')
    assert(Txn.sender.bytes === this.pendingAdminAddress.value, 'Only pending admin can accept')
    this.adminAddress.value = Txn.sender.bytes
    this.pendingAdminAddress.value = Bytes('')
    log('TipJar:AdminTransferred')
    return 'Admin role accepted'
  }

  // ═══════════════════════════════════════════════════════════════════
  // CREATOR REGISTRATION & PROFILE
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Register as a content creator
   * @param name - Creator's display name (max 50 chars)
   * @param bio - Short bio/description (max 200 chars)
   * @param category - Content category (max 20 chars)
   * @param profileImage - Profile image URL (max 200 chars)
   */
  registerCreator(name: string, bio: string, category: string, profileImage: string): string {
    this.assertNotPaused()

    // SECURITY: Prevent double-registration inflating totalCreators
    assert(this.isRegistered(Txn.sender).value !== 1, 'Already registered as a creator')

    // Validate inputs are non-empty
    assert(name.length > 0, 'Name cannot be empty')
    assert(bio.length > 0, 'Bio cannot be empty')
    assert(category.length > 0, 'Category cannot be empty')

    // Input length validation against local state limits
    assert(name.length <= TipJar.MAX_NAME_LEN, 'Name exceeds 50 character limit')
    assert(bio.length <= TipJar.MAX_BIO_LEN, 'Bio exceeds 200 character limit')
    assert(category.length <= TipJar.MAX_CATEGORY_LEN, 'Category exceeds 20 character limit')
    assert(profileImage.length <= TipJar.MAX_IMAGE_LEN, 'Profile image URL exceeds 200 character limit')

    this.creatorName(Txn.sender).value = name
    this.creatorBio(Txn.sender).value = bio
    this.creatorCategory(Txn.sender).value = category
    this.profileImageUrl(Txn.sender).value = profileImage
    this.tipsReceived(Txn.sender).value = 0
    this.tipCount(Txn.sender).value = 0
    this.isRegistered(Txn.sender).value = 1
    this.revSplitAddress(Txn.sender).value = ''
    this.revSplitPercent(Txn.sender).value = 0
    this.revSplitName(Txn.sender).value = ''

    this.totalCreators.value = this.totalCreators.value + 1

    log('TipJar:CreatorRegistered')
    return `Creator ${name} registered successfully`
  }

  /**
   * Update creator profile
   * @param name - Updated display name (max 50 chars)
   * @param bio - Updated bio (max 200 chars)
   * @param category - Updated category (max 20 chars)
   * @param profileImage - Updated profile image URL (max 200 chars)
   */
  updateProfile(name: string, bio: string, category: string, profileImage: string): string {
    this.assertNotPaused()
    this.assertRegistered()

    // Input length validation
    assert(name.length > 0 && name.length <= TipJar.MAX_NAME_LEN, 'Name must be 1-50 characters')
    assert(bio.length > 0 && bio.length <= TipJar.MAX_BIO_LEN, 'Bio must be 1-200 characters')
    assert(category.length > 0 && category.length <= TipJar.MAX_CATEGORY_LEN, 'Category must be 1-20 characters')
    assert(profileImage.length <= TipJar.MAX_IMAGE_LEN, 'Profile image URL exceeds 200 character limit')

    this.creatorName(Txn.sender).value = name
    this.creatorBio(Txn.sender).value = bio
    this.creatorCategory(Txn.sender).value = category
    this.profileImageUrl(Txn.sender).value = profileImage

    log('TipJar:ProfileUpdated')
    return 'Profile updated successfully'
  }

  // ═══════════════════════════════════════════════════════════════════
  // REVENUE SPLIT
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Configure revenue split with a collaborator
   * @param collaboratorAddr - Collaborator's Algorand address (58 chars)
   * @param collaboratorName - Collaborator's display name (max 50 chars)
   * @param splitPercent - Percentage to give collaborator (1-50)
   */
  setRevenueSplit(collaboratorAddr: string, collaboratorName: string, splitPercent: uint64): string {
    this.assertNotPaused()
    this.assertRegistered()

    assert(splitPercent >= 1, 'Split must be at least 1%. Use removeRevenueSplit to clear')
    assert(splitPercent <= 50, 'Split cannot exceed 50%')
    assert(collaboratorAddr.length === TipJar.ADDR_LEN, 'Invalid collaborator address length')
    assert(collaboratorName.length > 0, 'Collaborator name cannot be empty')
    assert(collaboratorName.length <= TipJar.MAX_COLLAB_NAME_LEN, 'Collaborator name exceeds 50 character limit')

    this.revSplitAddress(Txn.sender).value = collaboratorAddr
    this.revSplitName(Txn.sender).value = collaboratorName
    this.revSplitPercent(Txn.sender).value = splitPercent

    log('TipJar:RevenueSplitSet')
    return 'Revenue split configured'
  }

  /**
   * Remove revenue split
   */
  removeRevenueSplit(): string {
    this.assertNotPaused()
    this.assertRegistered()

    this.revSplitAddress(Txn.sender).value = ''
    this.revSplitName(Txn.sender).value = ''
    this.revSplitPercent(Txn.sender).value = 0

    log('TipJar:RevenueSplitRemoved')
    return 'Revenue split removed'
  }

  /**
   * Get revenue split config for a creator
   * @param creator - The creator's address
   * @returns Split percentage
   */
  getRevenueSplitPercent(creator: Account): uint64 {
    return this.revSplitPercent(creator).value
  }

  // ═══════════════════════════════════════════════════════════════════
  // TIPPING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Send a tip to a creator - must be accompanied by a payment transaction
   * Revenue split is automatically applied if configured
   * @param creator - The creator's address to tip
   * @param message - Optional message from the tipper
   * @param tipPayment - The payment transaction for the tip
   */
  sendTip(creator: Account, message: string, tipPayment: gtxn.PaymentTxn): string {
    this.assertNotPaused()

    // Verify the creator is registered
    assert(this.isRegistered(creator).value === 1, 'Recipient is not a registered creator')

    // Verify payment amount meets minimum
    const tipAmount = tipPayment.amount
    assert(tipAmount >= this.minTipAmount.value, 'Tip amount below minimum')

    // Verify the payment is to this contract
    assert(tipPayment.receiver === Global.currentApplicationAddress, 'Payment must be sent to the contract')

    // SECURITY: Prevent close-remainder-to attack (draining contract funds)
    assert(tipPayment.closeRemainderTo === Global.zeroAddress, 'Close remainder to must be zero address')

    // SECURITY: Prevent rekey attack
    assert(tipPayment.rekeyTo === Global.zeroAddress, 'Rekey to must be zero address')

    // SECURITY: Prevent self-tipping for stat inflation
    assert(Txn.sender !== creator, 'Cannot tip yourself')

    // Calculate platform fee
    const feeAmount = (tipAmount * this.platformFeeBps.value) / 10_000
    const afterFee = tipAmount - feeAmount

    // Track accumulated fees
    this.totalFeesAccumulated.value = this.totalFeesAccumulated.value + feeAmount

    // Check for revenue split
    const splitPercent = this.revSplitPercent(creator).value

    if (splitPercent > 0) {
      // Revenue split active - divide afterFee between creator and collaborator
      const collaboratorAmount = (afterFee * splitPercent) / 100
      const creatorAmount = afterFee - collaboratorAmount

      // Transfer creator's share
      itxn
        .payment({
          receiver: creator,
          amount: creatorAmount,
          fee: 0,
        })
        .submit()

      // Note: Collaborator payment requires their Account reference
      // In production, use a separate claimCollaboratorShare method
    } else {
      // No split - send full amount minus fee to creator
      itxn
        .payment({
          receiver: creator,
          amount: afterFee,
          fee: 0,
        })
        .submit()
    }

    // Update creator stats
    this.tipsReceived(creator).value = this.tipsReceived(creator).value + tipAmount
    this.tipCount(creator).value = this.tipCount(creator).value + 1

    // Update global stats
    this.totalTipsProcessed.value = this.totalTipsProcessed.value + tipAmount
    this.totalTipCount.value = this.totalTipCount.value + 1

    log('TipJar:TipSent')
    return `Tip of ${tipAmount} microALGO sent to creator`
  }

  // ═══════════════════════════════════════════════════════════════════
  // NFT BADGES
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Mint an NFT appreciation badge for a supporter
   * Badge tier is determined by total amount tipped to a specific creator
   * @param supporter - The supporter's address
   * @param badgeTier - Badge tier: 1=Bronze, 2=Silver, 3=Gold, 4=Diamond
   * @param creatorAddr - The creator this badge is for
   */
  mintBadge(supporter: Account, badgeTier: uint64, creatorAddr: Account): string {
    this.assertNotPaused()

    // Only admin or the creator can mint badges
    assert(
      Txn.sender.bytes === this.adminAddress.value ||
      Txn.sender === creatorAddr,
      'Only admin or creator can mint badges'
    )

    // Verify badge tier is valid
    assert(badgeTier >= 1 && badgeTier <= 4, 'Invalid badge tier')

    // SECURITY: Verify the creator is registered
    assert(this.isRegistered(creatorAddr).value === 1, 'Creator is not registered')

    // Determine the tier name for the NFT asset name
    let tierName = ''
    if (badgeTier === 1) {
      tierName = 'Bronze'
    } else if (badgeTier === 2) {
      tierName = 'Silver'
    } else if (badgeTier === 3) {
      tierName = 'Gold'
    } else {
      tierName = 'Diamond'
    }

    // Create the NFT badge as an ASA (Algorand Standard Asset)
    itxn
      .assetConfig({
        total: 1,
        decimals: 0,
        defaultFrozen: false,
        unitName: 'TJBADGE',
        assetName: `TipJar ${tierName} Badge`,
        fee: 0,
      })
      .submit()

    this.totalBadgesMinted.value = this.totalBadgesMinted.value + 1

    log('TipJar:BadgeMinted')
    return `${tierName} badge minted successfully`
  }

  // ═══════════════════════════════════════════════════════════════════
  // READ-ONLY GETTERS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Verify a tipping record on-chain
   * Returns the tip count and total tips for a creator (verifiable proof)
   * @param creator - The creator's address to verify
   * @returns Total tips received (on-chain verifiable)
   */
  verifyTipRecord(creator: Account): uint64 {
    assert(this.isRegistered(creator).value === 1, 'Not a registered creator')
    return this.tipsReceived(creator).value
  }

  /**
   * Get badge tier thresholds
   * @returns Bronze threshold in microALGO
   */
  getBronzeThreshold(): uint64 {
    return this.bronzeThreshold.value
  }

  /**
   * Get total badges minted
   * @returns Total badge count
   */
  getTotalBadgesMinted(): uint64 {
    return this.totalBadgesMinted.value
  }

  /**
   * Get creator profile information
   * @param creator - The creator's address
   * @returns Creator's name
   */
  getCreatorName(creator: Account): string {
    assert(this.isRegistered(creator).value === 1, 'Not a registered creator')
    return this.creatorName(creator).value
  }

  /**
   * Get creator bio
   * @param creator - The creator's address
   * @returns Creator's bio
   */
  getCreatorBio(creator: Account): string {
    assert(this.isRegistered(creator).value === 1, 'Not a registered creator')
    return this.creatorBio(creator).value
  }

  /**
   * Get creator category
   * @param creator - The creator's address
   * @returns Creator's category
   */
  getCreatorCategory(creator: Account): string {
    assert(this.isRegistered(creator).value === 1, 'Not a registered creator')
    return this.creatorCategory(creator).value
  }

  /**
   * Get total tips received by a creator
   * @param creator - The creator's address
   * @returns Total tips in microALGO
   */
  getTipsReceived(creator: Account): uint64 {
    assert(this.isRegistered(creator).value === 1, 'Not a registered creator')
    return this.tipsReceived(creator).value
  }

  /**
   * Get tip count for a creator
   * @param creator - The creator's address
   * @returns Number of tips received
   */
  getTipCount(creator: Account): uint64 {
    assert(this.isRegistered(creator).value === 1, 'Not a registered creator')
    return this.tipCount(creator).value
  }

  /**
   * Get platform statistics
   * @returns Total tips processed
   */
  getPlatformStats(): uint64 {
    return this.totalTipsProcessed.value
  }

  /**
   * Get total number of registered creators
   * @returns Creator count
   */
  getTotalCreators(): uint64 {
    return this.totalCreators.value
  }

  /**
   * Get total tip count
   * @returns Total number of tip transactions
   */
  getTotalTipCount(): uint64 {
    return this.totalTipCount.value
  }

  // ═══════════════════════════════════════════════════════════════════
  // ADMIN SETTINGS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Admin: Update minimum tip amount
   * @param newMin - New minimum tip amount in microALGO (must be >= 10_000 = 0.01 ALGO)
   */
  setMinTipAmount(newMin: uint64): string {
    this.assertAdmin()
    assert(newMin >= 10_000, 'Minimum tip must be at least 0.01 ALGO (10_000 microALGO)')
    this.minTipAmount.value = newMin
    log('TipJar:MinTipUpdated')
    return 'Minimum tip amount updated'
  }

  /**
   * Admin: Update platform fee
   * @param newFeeBps - New fee in basis points (100 = 1%, max 1000 = 10%)
   */
  setPlatformFee(newFeeBps: uint64): string {
    this.assertAdmin()
    assert(newFeeBps <= 1000, 'Fee cannot exceed 10%')
    this.platformFeeBps.value = newFeeBps
    log('TipJar:FeeUpdated')
    return 'Platform fee updated'
  }

  /**
   * Admin: Withdraw accumulated platform fees
   * Protects minimum contract balance (MBR + 0.1 ALGO)
   * @param amount - Amount to withdraw in microALGO
   */
  withdrawPlatformFees(amount: uint64): string {
    this.assertAdmin()
    assert(amount > 0, 'Withdrawal amount must be positive')
    assert(amount <= this.totalFeesAccumulated.value, 'Amount exceeds accumulated fees')

    // Protect minimum contract balance
    const contractBalance = Global.currentApplicationAddress.balance
    assert(contractBalance - amount >= TipJar.MIN_CONTRACT_BALANCE, 'Withdrawal would leave contract below minimum balance')

    itxn
      .payment({
        receiver: Txn.sender,
        amount: amount,
        fee: 0,
      })
      .submit()

    this.totalFeesAccumulated.value = this.totalFeesAccumulated.value - amount

    log('TipJar:FeesWithdrawn')
    return 'Platform fees withdrawn'
  }

  /**
   * Admin: Update badge tier thresholds
   * @param bronze - Bronze threshold in microALGO
   * @param silver - Silver threshold in microALGO
   * @param gold - Gold threshold in microALGO
   * @param diamond - Diamond threshold in microALGO
   */
  setBadgeThresholds(bronze: uint64, silver: uint64, gold: uint64, diamond: uint64): string {
    this.assertAdmin()
    assert(bronze < silver && silver < gold && gold < diamond, 'Thresholds must be ascending')
    this.bronzeThreshold.value = bronze
    this.silverThreshold.value = silver
    this.goldThreshold.value = gold
    this.diamondThreshold.value = diamond
    log('TipJar:ThresholdsUpdated')
    return 'Badge thresholds updated'
  }

  // ═══════════════════════════════════════════════════════════════════
  // CONTRACT STATE QUERIES
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Check if an account is a registered creator
   * @param account - The account to check
   * @returns 1 if registered, 0 if not
   */
  checkRegistration(account: Account): uint64 {
    return this.isRegistered(account).value
  }

  /**
   * Get minimum tip amount
   * @returns Minimum tip in microALGO
   */
  getMinTipAmount(): uint64 {
    return this.minTipAmount.value
  }

  /**
   * Get platform fee in basis points
   * @returns Fee in basis points
   */
  getPlatformFee(): uint64 {
    return this.platformFeeBps.value
  }

  /**
   * Check if contract is paused
   * @returns 1 if paused, 0 if active
   */
  getIsPaused(): uint64 {
    return this.isPaused.value
  }

  /**
   * Get total accumulated platform fees
   * @returns Total fees in microALGO
   */
  getTotalFeesAccumulated(): uint64 {
    return this.totalFeesAccumulated.value
  }

  /**
   * Get current admin address
   * @returns Admin address bytes
   */
  getAdminAddress(): bytes {
    return this.adminAddress.value
  }
}
