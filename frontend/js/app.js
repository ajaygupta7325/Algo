/**
 * TipJar - Main Application Logic (Production)
 * Handles page navigation, rendering, and user interactions.
 * Includes global error boundary, debounced search, and form submission locking.
 */

// ─── Global Error Boundary ──────────────────────────────────
window.onerror = function (message, source, lineno, colno, error) {
  console.error('[TipJar] Uncaught error:', { message, source, lineno, colno, error });
  // Show user-friendly error only for non-trivial errors
  if (typeof showToast === 'function') {
    showToast('An unexpected error occurred. Please try again.', 'error');
  }
  return true; // Prevent default browser error handling
};

window.addEventListener('unhandledrejection', (event) => {
  console.error('[TipJar] Unhandled promise rejection:', event.reason);
  if (typeof showToast === 'function') {
    const msg = event.reason?.message || 'An async operation failed';
    // Don't show user-rejected errors
    if (event.reason?.code !== 'USER_REJECTED') {
      showToast(msg, 'error');
    }
  }
  event.preventDefault();
});

// ─── Debounce Utility ───────────────────────────────────────
function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ─── Form Submission Lock ───────────────────────────────────
const _formLocks = new Set();
function lockForm(formId) {
  if (_formLocks.has(formId)) return false;
  _formLocks.add(formId);
  return true;
}
function unlockForm(formId) {
  _formLocks.delete(formId);
}

// ─── State ──────────────────────────────────────────────────
let currentPage = 'home';
let currentCreatorAddress = null;
let selectedTipAmount = 2;

// ─── Initialize App ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initHeroParticles();
  initWalletListeners();
  initTipInterface();
  initForms();
  initVerifyForms();
  initRevenueSplitForm();
  renderHomePage();
  renderExplorePage();
  renderLeaderboard();

  // Check for URL hash navigation
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    const [page, param] = hash.split('/');
    navigateTo(page || 'home', param);
  }
});

// ─── Navigation ─────────────────────────────────────────────
function initNavigation() {
  // Page navigation links
  document.querySelectorAll('[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  // Navigation buttons with data-navigate
  document.querySelectorAll('[data-navigate]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.navigate));
  });

  // Hero register button
  document.getElementById('heroRegisterBtn')?.addEventListener('click', () => {
    if (!wallet.connected) {
      wallet.connect().then(connected => {
        if (connected) navigateTo('dashboard');
      });
    } else {
      navigateTo('dashboard');
    }
  });

  // Footer register link
  document.getElementById('footerRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('dashboard');
  });

  // Hamburger menu
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
  });

  // Close mobile menu on link click
  navLinks?.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('open');
    });
  });

  // Navbar scroll effect
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });
}

function navigateTo(page, param) {
  // Pause video when navigating away from pages
  const introVideo = document.getElementById('introVideo');
  if (introVideo && page !== 'home') {
    introVideo.pause();
  }

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Show target page
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) {
    pageEl.classList.add('active');
    currentPage = page;
  }

  // Update nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });

  // Handle page-specific logic
  switch (page) {
    case 'home':
      renderHomePage();
      break;
    case 'explore':
      renderExplorePage();
      break;
    case 'profile':
      if (param) loadCreatorProfile(param);
      break;
    case 'leaderboard':
      renderLeaderboard();
      break;
    case 'dashboard':
      renderDashboard();
      break;
    case 'analytics':
      renderAnalyticsPage();
      break;
    case 'verify':
      renderVerifyPage();
      break;
    case 'widget-demo':
      renderWidgetDemo();
      break;
  }

  // Update URL hash
  window.location.hash = param ? `${page}/${param}` : page;

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Hero Particles ─────────────────────────────────────────
function initHeroParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;

  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.className = 'hero-particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.animationDuration = (4 + Math.random() * 4) + 's';
    container.appendChild(particle);
  }
}

// ─── Wallet Listeners ───────────────────────────────────────
function initWalletListeners() {
  // Connect wallet button
  const connectBtn = document.getElementById('connectWalletBtn');
  connectBtn?.addEventListener('click', async () => {
    if (wallet.connected) {
      wallet.disconnect();
    } else {
      await wallet.connect();
    }
  });

  // Dashboard connect button
  document.getElementById('dashConnectBtn')?.addEventListener('click', async () => {
    const connected = await wallet.connect();
    if (connected) renderDashboard();
  });

  // Listen for wallet state changes
  wallet.onChange((state) => {
    updateWalletUI(state);
    if (currentPage === 'dashboard') renderDashboard();
  });
}

function updateWalletUI(state) {
  const btnText = document.getElementById('walletBtnText');
  const connectBtn = document.getElementById('connectWalletBtn');

  if (state.loading) {
    btnText.textContent = 'Processing...';
    connectBtn.disabled = true;
    return;
  }

  connectBtn.disabled = false;

  if (state.connected) {
    btnText.textContent = `${truncateAddress(state.address)} (${microAlgoToAlgo(state.balance)} A)`;
    connectBtn.classList.remove('btn-outline');
    connectBtn.classList.add('btn-secondary');
  } else {
    btnText.textContent = 'Connect Wallet';
    connectBtn.classList.remove('btn-secondary');
    connectBtn.classList.add('btn-outline');
  }
}

// ─── Home Page ──────────────────────────────────────────────
async function renderHomePage() {
  const stats = await contract.getPlatformStats();

  // Update hero stats with animation
  animateCounter('heroTotalCreators', stats.totalCreators);
  animateCounter('heroTotalTips', stats.totalTipCount);
  document.getElementById('heroTotalVolume').textContent = microAlgoToAlgo(stats.totalTipsProcessed) + ' ALGO';

  // Render featured creators
  const creators = await contract.getTopCreators(4);
  const grid = document.getElementById('featuredCreators');
  grid.innerHTML = creators.map(c => renderCreatorCard(c)).join('');
  attachCreatorCardListeners(grid);
}

function animateCounter(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const duration = 1500;
  const start = parseInt(el.textContent) || 0;
  const increment = (target - start) / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = Math.round(current);
  }, 16);
}

// ─── Explore Page ───────────────────────────────────────────
async function renderExplorePage() {
  const creators = await contract.getCreators();
  const grid = document.getElementById('exploreCreators');
  grid.innerHTML = creators.map(c => renderCreatorCard(c)).join('');
  attachCreatorCardListeners(grid);

  // Debounced search handler (prevents excessive filtering)
  const searchInput = document.getElementById('creatorSearch');
  const handleSearch = debounce(async () => {
    const query = searchInput.value.trim();
    const activeCategory = document.querySelector('.filter-tab.active')?.dataset.category || 'all';

    let results;
    if (query) {
      results = await contract.searchCreators(query);
      if (activeCategory !== 'all') {
        results = results.filter(c => c.category === activeCategory);
      }
    } else {
      results = activeCategory === 'all'
        ? await contract.getCreators()
        : await contract.getCreatorsByCategory(activeCategory);
    }

    grid.innerHTML = results.length
      ? results.map(c => renderCreatorCard(c)).join('')
      : '<div class="empty-state"><div class="empty-icon">🔍</div><h3>No creators found</h3><p>Try a different search term or category.</p></div>';
    attachCreatorCardListeners(grid);
  }, 250);

  // Remove old listeners by cloning the node
  const newSearchInput = searchInput?.cloneNode(true);
  searchInput?.parentNode?.replaceChild(newSearchInput, searchInput);
  newSearchInput?.addEventListener('input', handleSearch);

  // Category filter — use event delegation on parent
  const filterContainer = document.querySelector('.filter-tabs') || document.querySelector('.category-filters');
  if (filterContainer && !filterContainer._tipjarDelegated) {
    filterContainer._tipjarDelegated = true;
    filterContainer.addEventListener('click', async (e) => {
      const tab = e.target.closest('.filter-tab');
      if (!tab) return;

      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const searchEl = document.getElementById('creatorSearch');
      const category = tab.dataset.category;
      const query = searchEl?.value.trim() || '';

      let results;
      if (query) {
        results = await contract.searchCreators(query);
        if (category !== 'all') {
          results = results.filter(c => c.category === category);
        }
      } else {
        results = category === 'all'
          ? await contract.getCreators()
          : await contract.getCreatorsByCategory(category);
      }

      grid.innerHTML = results.length
        ? results.map(c => renderCreatorCard(c)).join('')
        : '<div class="empty-state"><div class="empty-icon">🔍</div><h3>No creators found</h3><p>Try a different category.</p></div>';
      attachCreatorCardListeners(grid);
    });
  }
}

// ─── Creator Card Renderer ──────────────────────────────────
function renderCreatorCard(creator) {
  // SECURITY: Sanitize profileImage to prevent javascript: URI or data: injection
  const safeImage = creator.profileImage && /^https?:\/\//i.test(creator.profileImage)
    ? creator.profileImage : '';

  const avatarContent = safeImage
    ? `<img src="${escapeHtml(safeImage)}" alt="${escapeHtml(creator.name)}">`
    : creator.avatar || getCategoryIcon(creator.category);

  return `
    <div class="creator-card" data-address="${creator.address}">
      <div class="creator-card-header" style="background: linear-gradient(135deg, ${CATEGORIES[creator.category]?.color || '#6c5ce7'}33, var(--primary));">
        <div class="creator-avatar">${avatarContent}</div>
      </div>
      <div class="creator-card-body">
        <div class="creator-card-name">${escapeHtml(creator.name)}</div>
        <div class="creator-card-category">${getCategoryIcon(creator.category)} ${getCategoryLabel(creator.category)}</div>
        <div class="creator-card-bio">${escapeHtml(creator.bio)}</div>
        <div class="creator-card-stats">
          <div class="creator-card-stat">
            <span class="creator-card-stat-value">${microAlgoToAlgo(creator.tipsReceived)}</span>
            <span class="creator-card-stat-label">ALGO Received</span>
          </div>
          <div class="creator-card-stat">
            <span class="creator-card-stat-value">${creator.tipCount}</span>
            <span class="creator-card-stat-label">Tips</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function attachCreatorCardListeners(container) {
  container.querySelectorAll('.creator-card').forEach(card => {
    card.addEventListener('click', () => {
      const address = card.dataset.address;
      navigateTo('profile', address);
    });
  });
}

// ─── Creator Profile Page ───────────────────────────────────
async function loadCreatorProfile(address) {
  currentCreatorAddress = address;
  const creator = await contract.getCreator(address);

  if (!creator) {
    showToast('Creator not found', 'error');
    navigateTo('explore');
    return;
  }

  // Update profile UI
  const avatarEl = document.getElementById('profileAvatar');
  // SECURITY: Only allow https:// image URLs
  const safeProfileImage = creator.profileImage && /^https?:\/\//i.test(creator.profileImage)
    ? creator.profileImage : '';
  if (safeProfileImage) {
    avatarEl.innerHTML = `<img src="${escapeHtml(safeProfileImage)}" alt="${escapeHtml(creator.name)}">`;
  } else {
    avatarEl.textContent = creator.avatar || getCategoryIcon(creator.category);
  }

  document.getElementById('profileName').textContent = creator.name;
  document.getElementById('profileCategory').textContent = `${getCategoryIcon(creator.category)} ${getCategoryLabel(creator.category)}`;
  document.getElementById('profileBio').textContent = creator.bio;
  document.getElementById('profileAddress').textContent = truncateAddress(address);
  document.getElementById('profileTotalTips').textContent = microAlgoToAlgo(creator.tipsReceived) + ' ALGO';
  document.getElementById('profileTipCount').textContent = creator.tipCount;

  // Copy address button
  document.getElementById('copyAddressBtn').onclick = () => {
    navigator.clipboard.writeText(address);
    showToast('Address copied to clipboard!', 'success');
  };

  // Load tip history
  const tips = await contract.getTipHistory(address);
  renderTipHistory('profileTipHistory', tips);

  // Generate embed code
  const embedCode = generateEmbedCode(address, creator.name);
  document.getElementById('embedCodeSnippet').textContent = embedCode;
  document.getElementById('copyEmbedBtn').onclick = () => {
    navigator.clipboard.writeText(embedCode);
    showToast('Embed code copied!', 'success');
  };

  // Load NFT badges for this creator
  const badges = await contract.getBadgesForCreator(address);
  renderBadgeGrid('profileBadges', badges);

  // Reset tip amount
  selectedTipAmount = 2;
  updateTipDisplay();
}

// ─── Tip Interface ──────────────────────────────────────────
function initTipInterface() {
  // Preset amounts
  document.querySelectorAll('.tip-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tip-preset').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedTipAmount = parseFloat(btn.dataset.amount);
      document.getElementById('customTipAmount').value = '';
      updateTipDisplay();
    });
  });

  // Custom amount
  const customInput = document.getElementById('customTipAmount');
  customInput?.addEventListener('input', () => {
    const value = parseFloat(customInput.value);
    if (value > 0) {
      document.querySelectorAll('.tip-preset').forEach(b => b.classList.remove('selected'));
      selectedTipAmount = value;
      updateTipDisplay();
    }
  });

  // Tip message character count
  const tipMsg = document.getElementById('tipMessage');
  tipMsg?.addEventListener('input', () => {
    document.getElementById('tipMsgCount').textContent = tipMsg.value.length;
  });

  // Send tip button
  document.getElementById('sendTipBtn')?.addEventListener('click', handleSendTip);
}

function updateTipDisplay() {
  const fees = contract.calculateFees(selectedTipAmount);
  document.getElementById('tipAmountDisplay').textContent = `${fees.tipAmountAlgo} ALGO`;
  document.getElementById('platformFeeDisplay').textContent = `${fees.platformFeeAlgo} ALGO`;
  document.getElementById('creatorReceivesDisplay').textContent = `${fees.creatorReceivesAlgo} ALGO`;
}

async function handleSendTip() {
  if (!wallet.connected) {
    const connected = await wallet.connect();
    if (!connected) return;
  }

  if (!currentCreatorAddress) {
    showToast('No creator selected', 'error');
    return;
  }

  if (!lockForm('sendTip')) return; // Prevent double-submit

  const message = document.getElementById('tipMessage')?.value || '';
  const btn = document.getElementById('sendTipBtn');

  // Disable button and show loading
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Processing...';

  try {
    const result = await contract.sendTip(currentCreatorAddress, selectedTipAmount, message);

    if (result) {
      // Show success modal
      const modal = document.getElementById('tipSuccessModal');
      document.getElementById('tipSuccessMsg').textContent = `Your tip of ${microAlgoToAlgo(result.amount)} ALGO has been sent!`;
      document.getElementById('tipSuccessDetails').innerHTML = `
        <div class="detail-row">
          <span class="detail-label">Creator</span>
          <span class="detail-value">${escapeHtml(result.creator)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount</span>
          <span class="detail-value">${microAlgoToAlgo(result.amount)} ALGO</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Platform Fee</span>
          <span class="detail-value">${microAlgoToAlgo(result.fee)} ALGO</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Creator Received</span>
          <span class="detail-value">${microAlgoToAlgo(result.creatorReceives)} ALGO</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Transaction</span>
          <span class="detail-value" style="font-size: 0.75rem;">${result.txId}</span>
        </div>
      `;
      modal.classList.add('active');

      // Close modal button
      document.getElementById('closeTipModal').onclick = () => {
        modal.classList.remove('active');
      };

      // Refresh profile
      await loadCreatorProfile(currentCreatorAddress);
    }
  } catch (error) {
    showToast('Transaction failed: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '💎 Send Tip';
    unlockForm('sendTip');
  }
}

// ─── Tip History Renderer ───────────────────────────────────
function renderTipHistory(containerId, tips) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!tips || tips.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding: 2rem;"><div class="empty-icon">📭</div><h3>No tips yet</h3><p>Be the first to send a tip!</p></div>';
    return;
  }

  container.innerHTML = tips.map(tip => `
    <div class="tip-item">
      <div class="tip-item-avatar">💎</div>
      <div class="tip-item-info">
        <div class="tip-item-name">${escapeHtml(tip.from)}</div>
        <div class="tip-item-message">${tip.message ? escapeHtml(tip.message) : 'Sent a tip'}</div>
      </div>
      <div class="tip-item-amount">+${microAlgoToAlgo(tip.amount)} A</div>
      <div class="tip-item-time">${timeAgo(tip.time)}</div>
    </div>
  `).join('');
}

// ─── Leaderboard ────────────────────────────────────────────
async function renderLeaderboard() {
  // Top Creators
  const topCreators = await contract.getTopCreators(8);
  const creatorsContainer = document.getElementById('topCreatorsList');

  creatorsContainer.innerHTML = topCreators.map((creator, i) => {
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;

    return `
      <div class="leaderboard-item" data-address="${creator.address}" style="cursor:pointer;">
        <div class="leaderboard-rank ${rankClass}">${rankIcon}</div>
        <div class="leaderboard-avatar">${creator.avatar || getCategoryIcon(creator.category)}</div>
        <div class="leaderboard-info">
          <div class="leaderboard-name">${escapeHtml(creator.name)}</div>
          <div class="leaderboard-detail">${getCategoryIcon(creator.category)} ${getCategoryLabel(creator.category)} · ${creator.tipCount} tips</div>
        </div>
        <div class="leaderboard-value">${microAlgoToAlgo(creator.tipsReceived)} A</div>
      </div>
    `;
  }).join('');

  // Click to view profile
  creatorsContainer.querySelectorAll('.leaderboard-item').forEach(item => {
    item.addEventListener('click', () => navigateTo('profile', item.dataset.address));
  });

  // Top Supporters
  const topSupporters = await contract.getTopSupporters(8);
  const supportersContainer = document.getElementById('topSupportersList');

  supportersContainer.innerHTML = topSupporters.map((supporter, i) => {
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;

    return `
      <div class="leaderboard-item">
        <div class="leaderboard-rank ${rankClass}">${rankIcon}</div>
        <div class="leaderboard-avatar">${supporter.avatar}</div>
        <div class="leaderboard-info">
          <div class="leaderboard-name">${escapeHtml(supporter.name)}</div>
          <div class="leaderboard-detail">${supporter.tipCount} tips sent · ${supporter.address}</div>
        </div>
        <div class="leaderboard-value">${microAlgoToAlgo(supporter.totalTipped)} A</div>
      </div>
    `;
  }).join('');

  // Live Tip Feed
  const recentTips = await contract.getRecentTips(12);
  const feedContainer = document.getElementById('liveTipFeed');

  feedContainer.innerHTML = recentTips.map(tip => `
    <div class="tip-feed-item">
      <div class="tip-feed-icon">💎</div>
      <div class="tip-feed-content">
        <div class="tip-feed-text">
          <strong>${escapeHtml(tip.from)}</strong> tipped <strong>${escapeHtml(tip.to)}</strong>
          ${tip.message ? ` — "${escapeHtml(tip.message)}"` : ''}
        </div>
        <div class="tip-feed-time">${timeAgo(tip.time)}</div>
      </div>
      <div class="tip-feed-amount">+${microAlgoToAlgo(tip.amount)} A</div>
    </div>
  `).join('');
}

// ─── Dashboard ──────────────────────────────────────────────
async function renderDashboard() {
  const connectSection = document.getElementById('dashboardConnect');
  const registerSection = document.getElementById('dashboardRegister');
  const mainSection = document.getElementById('dashboardMain');

  if (!wallet.connected) {
    connectSection.style.display = 'block';
    registerSection.style.display = 'none';
    mainSection.style.display = 'none';
    return;
  }

  connectSection.style.display = 'none';

  if (!wallet.isRegistered) {
    registerSection.style.display = 'block';
    mainSection.style.display = 'none';
    return;
  }

  registerSection.style.display = 'none';
  mainSection.style.display = 'block';

  // Populate dashboard stats
  const profile = wallet.creatorProfile;
  const creator = await contract.getCreator(wallet.address);

  if (creator) {
    const totalAlgo = microAlgoToAlgo(creator.tipsReceived);
    document.getElementById('dashTotalReceived').textContent = totalAlgo;
    document.getElementById('dashTipCount').textContent = creator.tipCount;

    // Unique supporters
    const tips = await contract.getTipHistory(wallet.address);
    const uniqueSupporters = new Set(tips.map(t => t.fromAddr)).size;
    document.getElementById('dashSupporters').textContent = uniqueSupporters;

    // Average tip
    const avg = creator.tipCount > 0
      ? microAlgoToAlgo(Math.floor(creator.tipsReceived / creator.tipCount))
      : '0.00';
    document.getElementById('dashAvgTip').textContent = avg;

    // Tip history
    renderTipHistory('dashTipHistory', tips);
  }

  // Populate profile form
  document.getElementById('editName').value = profile?.name || '';
  document.getElementById('editBio').value = profile?.bio || '';
  document.getElementById('editCategory').value = profile?.category || 'blogger';
  document.getElementById('editImage').value = profile?.profileImage || '';

  // Share link
  const shareLink = `${CONFIG.BASE_URL}#profile/${wallet.address}`;
  document.getElementById('dashShareLink').value = shareLink;

  document.getElementById('copyShareLink').onclick = () => {
    navigator.clipboard.writeText(shareLink);
    showToast('Link copied!', 'success');
  };

  // Embed code
  const embedCode = generateEmbedCode(wallet.address, profile?.name || 'Creator');
  document.getElementById('dashEmbedCode').value = embedCode;

  document.getElementById('copyDashEmbed').onclick = () => {
    navigator.clipboard.writeText(embedCode);
    showToast('Embed code copied!', 'success');
  };

  // Share buttons
  document.getElementById('shareTwitter').onclick = () => {
    const text = encodeURIComponent(`Support my work on TipJar! Send ALGO tips directly 💎\n${shareLink}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  document.getElementById('shareEmail').onclick = () => {
    const subject = encodeURIComponent(`Support ${profile?.name || 'me'} on TipJar`);
    const body = encodeURIComponent(`Hey! I'm a content creator on TipJar. You can support my work by sending ALGO tips:\n\n${shareLink}\n\nThank you! 💎`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };
}

// ─── Forms ──────────────────────────────────────────────────
function initForms() {
  // Register form (with submission locking)
  document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!lockForm('register')) return; // Prevent double-submit

    const name = document.getElementById('regName').value.trim();
    const bio = document.getElementById('regBio').value.trim();
    const category = document.getElementById('regCategory').value;
    const image = document.getElementById('regImage').value.trim();

    if (!name || !bio || !category) {
      showToast('Please fill in all required fields', 'error');
      unlockForm('register');
      return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Registering...';

    try {
      const success = await contract.registerCreator(name, bio, category, image);
      if (success) {
        renderDashboard();
        renderExplorePage();
      }
    } catch (error) {
      showToast('Registration failed: ' + error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '✨ Register as Creator';
      unlockForm('register');
    }
  });

  // Update profile form (with submission locking)
  document.getElementById('updateProfileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!lockForm('updateProfile')) return;

    const name = document.getElementById('editName').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    const category = document.getElementById('editCategory').value;
    const image = document.getElementById('editImage').value.trim();

    if (!name || !bio) {
      showToast('Name and bio are required', 'error');
      unlockForm('updateProfile');
      return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Updating...';

    try {
      await contract.updateProfile(name, bio, category, image);
      renderDashboard();
    } catch (error) {
      showToast('Update failed: ' + error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Update Profile';
      unlockForm('updateProfile');
    }
  });
}

// ─── Widget Demo ────────────────────────────────────────────
function renderWidgetDemo() {
  updateWidgetPreview();
  updateWidgetEmbedCode();

  document.getElementById('updateWidgetPreview')?.addEventListener('click', () => {
    updateWidgetPreview();
    updateWidgetEmbedCode();
  });

  document.getElementById('copyWidgetCode')?.addEventListener('click', () => {
    const code = document.getElementById('widgetEmbedOutput').value;
    navigator.clipboard.writeText(code);
    showToast('Widget code copied!', 'success');
  });

  // Auto-fill creator address if connected
  if (wallet.connected && wallet.isRegistered) {
    document.getElementById('widgetCreatorAddr').value = wallet.address;
  }
}

function updateWidgetPreview() {
  const theme = document.getElementById('widgetTheme')?.value || 'light';
  const btnText = document.getElementById('widgetBtnText')?.value || '💎 Send a Tip';
  const defaultAmt = document.getElementById('widgetDefaultAmt')?.value || '2';

  const spot = document.getElementById('widgetEmbedSpot');
  spot.innerHTML = `
    <div class="tipjar-widget theme-${escapeHtml(theme)}">
      <div class="tipjar-widget-header">
        <span class="tipjar-widget-logo">💎</span>
        <span>TipJar</span>
      </div>
      <button class="tipjar-widget-btn" data-widget-amt="${escapeHtml(defaultAmt)}">${escapeHtml(btnText)}</button>
      <div class="tipjar-widget-powered">Powered by TipJar on Algorand</div>
    </div>
  `;

  // Attach click handler safely (no inline onclick)
  spot.querySelector('.tipjar-widget-btn')?.addEventListener('click', () => {
    showToast(`Widget tip button clicked! Amount: ${escapeHtml(defaultAmt)} ALGO`, 'info');
  });
}

function updateWidgetEmbedCode() {
  const addr = (document.getElementById('widgetCreatorAddr')?.value || 'YOUR_ALGORAND_ADDRESS').replace(/['"<>]/g, '');
  const theme = (document.getElementById('widgetTheme')?.value || 'light').replace(/['"<>]/g, '');
  const btnText = (document.getElementById('widgetBtnText')?.value || '💎 Send a Tip').replace(/['"<>\\]/g, '');
  const defaultAmt = parseFloat(document.getElementById('widgetDefaultAmt')?.value) || 2;

  const code = `<!-- TipJar Widget -->
<div id="tipjar-widget"></div>
<script src="${CONFIG.BASE_URL}js/tipjar-widget.js"><\/script>
<script>
  TipJarWidget.init({
    container: '#tipjar-widget',
    creatorAddress: '${addr}',
    theme: '${theme}',
    buttonText: '${btnText}',
    defaultAmount: ${defaultAmt}
  });
<\/script>`;

  document.getElementById('widgetEmbedOutput').value = code;
}

// ─── Embed Code Generator ──────────────────────────────────
function generateEmbedCode(address, creatorName) {
  return `<!-- TipJar Widget for ${creatorName} -->
<div id="tipjar-widget"></div>
<script src="${CONFIG.BASE_URL}js/tipjar-widget.js"><\/script>
<script>
  TipJarWidget.init({
    container: '#tipjar-widget',
    creatorAddress: '${address}',
    theme: 'light',
    buttonText: '💎 Tip ${creatorName}',
    defaultAmount: 2
  });
<\/script>`;
}

// ─── Toast Notifications ────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  // Auto-remove
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ─── Utilities ──────────────────────────────────────────────
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ─── Badge Rendering ────────────────────────────────────────
function renderBadgeGrid(containerId, badges) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!badges || badges.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding: 1.5rem;"><div class="empty-icon">🏅</div><h3>No badges yet</h3><p>Badges are earned through generous tipping.</p></div>';
    return;
  }

  container.innerHTML = badges.map(badge => {
    const tierInfo = BADGE_TIERS[badge.tier];
    return `
      <div class="badge-card" style="border-color: ${tierInfo.color};">
        <div class="badge-icon" style="background: ${tierInfo.color}22; color: ${tierInfo.color};">${tierInfo.icon}</div>
        <div class="badge-info">
          <div class="badge-tier" style="color: ${tierInfo.color};">${tierInfo.name} Badge</div>
          <div class="badge-supporter">${escapeHtml(badge.supporter)}</div>
          <div class="badge-detail">${microAlgoToAlgo(badge.totalTipped)} ALGO tipped · ${timeAgo(badge.mintedAt)}</div>
          <div class="badge-asset">ASA ID: ${badge.assetId}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderBadgeHallOfFame(containerId, badges) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!badges || badges.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding: 1.5rem;"><p>No badges minted yet.</p></div>';
    return;
  }

  container.innerHTML = badges.map(badge => {
    const tierInfo = BADGE_TIERS[badge.tier];
    return `
      <div class="badge-hall-item">
        <div class="badge-hall-icon" style="background: ${tierInfo.color}22; color: ${tierInfo.color}; border-color: ${tierInfo.color};">${tierInfo.icon}</div>
        <div class="badge-hall-info">
          <div class="badge-hall-name">${escapeHtml(badge.supporter)}</div>
          <div class="badge-hall-detail">${tierInfo.name} · ${escapeHtml(badge.creator)} · ${microAlgoToAlgo(badge.totalTipped)} ALGO</div>
        </div>
        <div class="badge-hall-time">${timeAgo(badge.mintedAt)}</div>
      </div>
    `;
  }).join('');
}

// ─── Leaderboard Update (badges) ────────────────────────────
const _originalRenderLeaderboard = renderLeaderboard;
renderLeaderboard = async function() {
  await _originalRenderLeaderboard();

  // Also render badge hall of fame
  const badges = await contract.getAllBadges();
  renderBadgeHallOfFame('badgeHallOfFame', badges);
};

// ─── Verify Page ────────────────────────────────────────────
function renderVerifyPage() {
  // Populate creator quick-select dropdown
  const select = document.getElementById('verifyCreatorSelect');
  if (select && select.options.length <= 1) {
    DEMO_CREATORS.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.address;
      opt.textContent = `${c.avatar || getCategoryIcon(c.category)} ${c.name}`;
      select.appendChild(opt);
    });
  }
}

function initVerifyForms() {
  // Verify by Transaction ID
  document.getElementById('verifyTxForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const txId = document.getElementById('verifyTxId').value.trim();
    if (!txId) {
      showToast('Please enter a transaction ID', 'error');
      return;
    }

    const resultDiv = document.getElementById('verifyTxResult');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="verify-loading"><span class="spinner"></span> Verifying on-chain...</div>';

    // Simulate verification delay
    await new Promise(r => setTimeout(r, 1500));

    const result = await contract.verifyTipByTxId(txId);

    if (result.verified) {
      resultDiv.innerHTML = `
        <div class="verify-success">
          <div class="verify-status">✅ Verified On-Chain</div>
          <div class="verify-details">
            <div class="detail-row"><span class="detail-label">Transaction ID</span><span class="detail-value" style="font-size: 0.7rem; word-break: break-all;">${result.txId}</span></div>
            <div class="detail-row"><span class="detail-label">From</span><span class="detail-value">${escapeHtml(result.from)}</span></div>
            <div class="detail-row"><span class="detail-label">To</span><span class="detail-value">${escapeHtml(result.to)}</span></div>
            <div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value">${microAlgoToAlgo(result.amount)} ALGO</span></div>
            <div class="detail-row"><span class="detail-label">Message</span><span class="detail-value">${result.message ? escapeHtml(result.message) : 'N/A'}</span></div>
            <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${new Date(result.timestamp).toLocaleString()}</span></div>
            <div class="detail-row"><span class="detail-label">Network</span><span class="detail-value">${result.network}</span></div>
            <div class="detail-row"><span class="detail-label">Block Round</span><span class="detail-value">#${result.blockRound?.toLocaleString()}</span></div>
          </div>
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="verify-failed">
          <div class="verify-status">❌ Not Verified</div>
          <p>${result.message || 'Transaction not found.'}</p>
        </div>
      `;
    }
  });

  // Verify Creator Record
  document.getElementById('verifyCreatorForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const addr = document.getElementById('verifyCreatorAddr').value.trim() ||
                 document.getElementById('verifyCreatorSelect').value;
    if (!addr) {
      showToast('Please enter or select a creator address', 'error');
      return;
    }

    const resultDiv = document.getElementById('verifyCreatorResult');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="verify-loading"><span class="spinner"></span> Verifying creator record...</div>';

    await new Promise(r => setTimeout(r, 1500));

    const result = await contract.verifyCreatorRecord(addr);

    if (result.verified) {
      resultDiv.innerHTML = `
        <div class="verify-success">
          <div class="verify-status">✅ Creator Record Verified</div>
          <div class="verify-details">
            <div class="detail-row"><span class="detail-label">Creator</span><span class="detail-value">${escapeHtml(result.creator)}</span></div>
            <div class="detail-row"><span class="detail-label">Address</span><span class="detail-value" style="font-size: 0.7rem;">${result.address}</span></div>
            <div class="detail-row"><span class="detail-label">Recorded Total</span><span class="detail-value">${microAlgoToAlgo(result.recordedTotal)} ALGO</span></div>
            <div class="detail-row"><span class="detail-label">Calculated Total</span><span class="detail-value">${microAlgoToAlgo(result.calculatedTotal)} ALGO</span></div>
            <div class="detail-row"><span class="detail-label">Tip Count</span><span class="detail-value">${result.tipCount}</span></div>
            <div class="detail-row"><span class="detail-label">Record Match</span><span class="detail-value">${result.match ? '✅ Match' : '⚠️ Discrepancy'}</span></div>
            <div class="detail-row"><span class="detail-label">Network</span><span class="detail-value">${result.network}</span></div>
            <div class="detail-row"><span class="detail-label">Verified At</span><span class="detail-value">${new Date(result.timestamp).toLocaleString()}</span></div>
          </div>
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="verify-failed">
          <div class="verify-status">❌ Not Found</div>
          <p>${result.message}</p>
        </div>
      `;
    }
  });

  // Quick select creator
  document.getElementById('verifyCreatorSelect')?.addEventListener('change', (e) => {
    if (e.target.value) {
      document.getElementById('verifyCreatorAddr').value = e.target.value;
    }
  });
}

// ─── Revenue Split Form ─────────────────────────────────────
function initRevenueSplitForm() {
  document.getElementById('revenueSplitForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('splitCollabName').value.trim();
    const addr = document.getElementById('splitCollabAddr').value.trim();
    const percent = parseInt(document.getElementById('splitPercent').value) || 0;

    if (!name || !addr) {
      showToast('Please fill in collaborator details', 'error');
      return;
    }

    const success = await contract.setRevenueSplit(addr, name, percent);
    if (success) renderDashboard();
  });

  document.getElementById('removeSplitBtn')?.addEventListener('click', async () => {
    const success = await contract.removeRevenueSplit();
    if (success) renderDashboard();
  });
}

// ─── Dashboard Update (revenue split + badges) ─────────────
const _originalRenderDashboard = renderDashboard;
renderDashboard = async function() {
  await _originalRenderDashboard();

  if (!wallet.connected || !wallet.isRegistered) return;

  // Show current revenue split status
  const split = await contract.getRevenueSplit(wallet.address);
  const statusDiv = document.getElementById('revenueSplitStatus');
  if (statusDiv) {
    if (split) {
      statusDiv.innerHTML = `
        <div class="split-active">
          <div class="split-active-icon">🤝</div>
          <div class="split-active-info">
            <strong>Active Split:</strong> ${split.splitPercent}% to ${escapeHtml(split.collaborator)}
            <div class="split-active-detail">${split.collaboratorAddr}</div>
          </div>
        </div>
      `;
      document.getElementById('splitCollabName').value = split.collaborator;
      document.getElementById('splitCollabAddr').value = split.collaboratorAddr;
      document.getElementById('splitPercent').value = split.splitPercent;
    } else {
      statusDiv.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No revenue split configured. Set one below.</p>';
    }
  }

  // Show earned badges
  const badges = await contract.getBadgesForSupporter(wallet.address);
  renderBadgeGrid('dashBadges', badges);
};

// ─── Analytics Page ─────────────────────────────────────────
async function renderAnalyticsPage() {
  const analytics = await contract.getAnalyticsData();
  const stats = await contract.getPlatformStats();
  const badges = await contract.getAllBadges();
  const splits = await contract.getAllRevenueSplits();

  // Stats
  document.getElementById('analyticsTotalVolume').textContent = microAlgoToAlgo(stats.totalTipsProcessed);
  document.getElementById('analyticsTotalTips').textContent = stats.totalTipCount;
  document.getElementById('analyticsBadgeCount').textContent = badges.length;
  document.getElementById('analyticsActiveSplits').textContent = splits.length;

  // Draw charts
  drawBarChart('chartDailyVolume', analytics.daily, 'volume');
  drawDonutChart('chartCategoryBreakdown', analytics.categoryBreakdown, 'categoryLegend');
  drawBarChart('chartWeeklyTrend', analytics.weekly, 'volume');
  drawDonutChart('chartSupporterDist', analytics.topSupportersPie, 'supporterLegend');

  // Chart toggle buttons
  document.querySelectorAll('.chart-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const chart = btn.dataset.chart;
      const metric = btn.dataset.metric;

      // Update active state
      document.querySelectorAll(`.chart-toggle[data-chart="${chart}"]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (chart === 'volume') {
        drawBarChart('chartDailyVolume', analytics.daily, metric);
      }
    });
  });

  // Render revenue splits list
  const splitsContainer = document.getElementById('analyticsRevenueSplits');
  if (splitsContainer) {
    if (splits.length === 0) {
      splitsContainer.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">No active revenue splits.</p>';
    } else {
      splitsContainer.innerHTML = splits.map(s => `
        <div class="split-list-item">
          <div class="split-list-icon">🤝</div>
          <div class="split-list-info">
            <div class="split-list-name">${escapeHtml(s.creator)}</div>
            <div class="split-list-detail">${s.splitPercent}% → ${escapeHtml(s.collaborator)}</div>
          </div>
          <div class="split-list-value">${s.splitPercent}%</div>
        </div>
      `).join('');
    }
  }
}

// ─── Canvas Chart: Bar/Line Chart ───────────────────────────
function drawBarChart(canvasId, data, metric = 'volume') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = 280 * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = '280px';
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = 280;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Get values
  const values = data.map(d => metric === 'volume' ? d.volume / 1_000_000 : d.tips);
  const labels = data.map(d => d.label);
  const maxVal = Math.max(...values) * 1.15 || 1;
  const barWidth = Math.max(4, (chartW / values.length) - 4);

  // Grid lines
  ctx.strokeStyle = 'rgba(100, 100, 150, 0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + chartH - (i / 4) * chartH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = '#a0a0c0';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    const label = metric === 'volume'
      ? (maxVal * i / 4).toFixed(1) + ' A'
      : Math.round(maxVal * i / 4);
    ctx.fillText(label, padding.left - 8, y + 4);
  }

  // Bars with gradient
  const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
  gradient.addColorStop(0, '#6c5ce7');
  gradient.addColorStop(1, '#a29bfe44');

  values.forEach((val, i) => {
    const x = padding.left + (i / values.length) * chartW + (chartW / values.length - barWidth) / 2;
    const barH = (val / maxVal) * chartH;
    const y = padding.top + chartH - barH;

    ctx.fillStyle = gradient;
    ctx.beginPath();
    // Rounded top corners
    const r = Math.min(barWidth / 2, 4);
    ctx.moveTo(x, y + r);
    ctx.arcTo(x, y, x + barWidth, y, r);
    ctx.arcTo(x + barWidth, y, x + barWidth, y + barH, r);
    ctx.lineTo(x + barWidth, padding.top + chartH);
    ctx.lineTo(x, padding.top + chartH);
    ctx.closePath();
    ctx.fill();

    // X-axis labels (every nth)
    if (i % Math.ceil(values.length / 10) === 0 || values.length <= 10) {
      ctx.fillStyle = '#a0a0c0';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + barWidth / 2, h - padding.bottom + 18);
    }
  });

  // Line overlay
  ctx.strokeStyle = '#6c5ce7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((val, i) => {
    const x = padding.left + (i / values.length) * chartW + (chartW / values.length) / 2;
    const y = padding.top + chartH - (val / maxVal) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Dots
  values.forEach((val, i) => {
    const x = padding.left + (i / values.length) * chartW + (chartW / values.length) / 2;
    const y = padding.top + chartH - (val / maxVal) * chartH;
    ctx.fillStyle = '#6c5ce7';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ─── Canvas Chart: Donut Chart ──────────────────────────────
function drawDonutChart(canvasId, data, legendId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = 280 * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = '280px';
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = 280;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) / 2 - 30;
  const innerRadius = radius * 0.55;

  ctx.clearRect(0, 0, w, h);

  const total = data.reduce((sum, d) => sum + (d.value || d.volume || d.tips || 0), 0);
  let startAngle = -Math.PI / 2;

  data.forEach(d => {
    const value = d.value || d.volume || d.tips || 0;
    const sliceAngle = (value / total) * Math.PI * 2;

    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.arc(cx, cy, innerRadius, startAngle + sliceAngle, startAngle, true);
    ctx.closePath();
    ctx.fill();

    // Percentage label
    const midAngle = startAngle + sliceAngle / 2;
    const labelRadius = (radius + innerRadius) / 2;
    const lx = cx + Math.cos(midAngle) * labelRadius;
    const ly = cy + Math.sin(midAngle) * labelRadius;

    const pct = Math.round((value / total) * 100);
    if (pct >= 5) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pct + '%', lx, ly);
    }

    startAngle += sliceAngle;
  });

  // Center text
  ctx.fillStyle = '#e8e8f0';
  ctx.font = 'bold 18px Space Grotesk, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(microAlgoToAlgo(total), cx, cy - 8);
  ctx.fillStyle = '#a0a0c0';
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText('ALGO', cx, cy + 12);

  // Legend
  const legendEl = document.getElementById(legendId);
  if (legendEl) {
    legendEl.innerHTML = data.map(d => {
      const name = d.name || getCategoryLabel(d.category) || 'Unknown';
      const value = d.value || d.volume || d.tips || 0;
      return `
        <div class="legend-item">
          <span class="legend-dot" style="background: ${d.color};"></span>
          <span class="legend-label">${escapeHtml(name)}</span>
          <span class="legend-value">${microAlgoToAlgo(value)} A</span>
        </div>
      `;
    }).join('');
  }
}
