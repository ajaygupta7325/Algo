/**
 * TipJar - Embeddable Widget
 * Standalone widget that can be embedded on any website
 * Usage: <script src="tipjar-widget.js"></script>
 *        TipJarWidget.init({ container: '#tip-widget', creatorAddress: '...', theme: 'light' })
 */

const TipJarWidget = (() => {
  // Default configuration
  const defaults = {
    container: '#tipjar-widget',
    creatorAddress: '',
    theme: 'light', // light | dark | gradient
    buttonText: '💎 Send a Tip',
    defaultAmount: 2,
    showBranding: true,
    primaryColor: '#6c5ce7',
    tipJarUrl: '', // Will be auto-detected
  };

  /**
   * Initialize the widget
   */
  function init(options = {}) {
    const config = { ...defaults, ...options };

    // Auto-detect TipJar URL
    if (!config.tipJarUrl) {
      const scripts = document.querySelectorAll('script[src*="tipjar-widget"]');
      if (scripts.length > 0) {
        const src = scripts[scripts.length - 1].src;
        config.tipJarUrl = src.replace(/js\/tipjar-widget\.js.*$/, '');
      } else {
        config.tipJarUrl = window.location.origin + window.location.pathname;
      }
    }

    // Find container
    const container = typeof config.container === 'string'
      ? document.querySelector(config.container)
      : config.container;

    if (!container) {
      console.error('TipJar Widget: Container not found:', config.container);
      return;
    }

    // Inject styles
    injectStyles(config);

    // Render widget
    render(container, config);
  }

  /**
   * Inject widget CSS
   */
  function injectStyles(config) {
    if (document.getElementById('tipjar-widget-styles')) return;

    const style = document.createElement('style');
    style.id = 'tipjar-widget-styles';
    style.textContent = `
      .tjw-container {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 16px 24px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 300px;
        transition: all 0.3s ease;
      }

      .tjw-container:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      }

      /* Light theme */
      .tjw-light {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        color: #333;
      }

      /* Dark theme */
      .tjw-dark {
        background: #1e1e3a;
        border: 1px solid #2d2d55;
        color: #e8e8f0;
      }

      /* Gradient theme */
      .tjw-gradient {
        background: linear-gradient(135deg, ${config.primaryColor}, #a29bfe);
        border: none;
        color: white;
      }

      .tjw-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 14px;
      }

      .tjw-logo { font-size: 18px; }

      .tjw-amounts {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: center;
      }

      .tjw-amount-btn {
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid transparent;
      }

      .tjw-light .tjw-amount-btn {
        background: white;
        border-color: #dee2e6;
        color: #333;
      }
      .tjw-light .tjw-amount-btn:hover,
      .tjw-light .tjw-amount-btn.tjw-selected {
        border-color: ${config.primaryColor};
        background: ${config.primaryColor}15;
        color: ${config.primaryColor};
      }

      .tjw-dark .tjw-amount-btn {
        background: #15152d;
        border-color: #2d2d55;
        color: #e8e8f0;
      }
      .tjw-dark .tjw-amount-btn:hover,
      .tjw-dark .tjw-amount-btn.tjw-selected {
        border-color: ${config.primaryColor};
        background: ${config.primaryColor}25;
      }

      .tjw-gradient .tjw-amount-btn {
        background: rgba(255,255,255,0.2);
        color: white;
      }
      .tjw-gradient .tjw-amount-btn:hover,
      .tjw-gradient .tjw-amount-btn.tjw-selected {
        background: rgba(255,255,255,0.35);
      }

      .tjw-tip-btn {
        padding: 10px 24px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 15px;
        cursor: pointer;
        transition: all 0.2s ease;
        width: 100%;
      }

      .tjw-light .tjw-tip-btn,
      .tjw-dark .tjw-tip-btn {
        background: linear-gradient(135deg, ${config.primaryColor}, #a29bfe);
        color: white;
      }

      .tjw-gradient .tjw-tip-btn {
        background: white;
        color: ${config.primaryColor};
      }

      .tjw-tip-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(108, 92, 231, 0.4);
      }

      .tjw-powered {
        font-size: 10px;
        opacity: 0.6;
      }

      .tjw-powered a {
        color: inherit;
        text-decoration: underline;
      }

      /* Modal */
      .tjw-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        animation: tjw-fadeIn 0.3s ease;
      }

      @keyframes tjw-fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .tjw-modal {
        background: white;
        border-radius: 16px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: tjw-slideUp 0.3s ease;
      }

      @keyframes tjw-slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .tjw-modal h3 {
        margin: 0 0 8px;
        font-size: 20px;
      }

      .tjw-modal p {
        margin: 0 0 20px;
        color: #666;
        font-size: 14px;
      }

      .tjw-modal-btn {
        display: inline-block;
        padding: 10px 24px;
        background: linear-gradient(135deg, ${config.primaryColor}, #a29bfe);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        margin: 4px;
      }

      .tjw-modal-close {
        display: inline-block;
        padding: 10px 24px;
        background: #f0f0f0;
        color: #333;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        margin: 4px;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Render the widget
   */
  function render(container, config) {
    const themeClass = `tjw-${config.theme}`;
    let selectedAmount = config.defaultAmount;

    container.innerHTML = `
      <div class="tjw-container ${themeClass}">
        <div class="tjw-header">
          <span class="tjw-logo">💎</span>
          <span>TipJar</span>
        </div>
        <div class="tjw-amounts">
          <button class="tjw-amount-btn ${selectedAmount === 1 ? 'tjw-selected' : ''}" data-amt="1">1 ALGO</button>
          <button class="tjw-amount-btn ${selectedAmount === 2 ? 'tjw-selected' : ''}" data-amt="2">2 ALGO</button>
          <button class="tjw-amount-btn ${selectedAmount === 5 ? 'tjw-selected' : ''}" data-amt="5">5 ALGO</button>
          <button class="tjw-amount-btn ${selectedAmount === 10 ? 'tjw-selected' : ''}" data-amt="10">10 ALGO</button>
        </div>
        <button class="tjw-tip-btn">${escapeHtmlWidget(config.buttonText)}</button>
        ${config.showBranding ? `<div class="tjw-powered">Powered by <a href="${config.tipJarUrl}" target="_blank">TipJar</a> on Algorand</div>` : ''}
      </div>
    `;

    // Amount button handlers
    container.querySelectorAll('.tjw-amount-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.tjw-amount-btn').forEach(b => b.classList.remove('tjw-selected'));
        btn.classList.add('tjw-selected');
        selectedAmount = parseFloat(btn.dataset.amt);
      });
    });

    // Tip button handler
    container.querySelector('.tjw-tip-btn').addEventListener('click', () => {
      showTipModal(config, selectedAmount);
    });
  }

  /**
   * Show tip modal
   */
  function showTipModal(config, amount) {
    const tipUrl = `${config.tipJarUrl}#profile/${config.creatorAddress}`;

    const overlay = document.createElement('div');
    overlay.className = 'tjw-modal-overlay';
    overlay.innerHTML = `
      <div class="tjw-modal">
        <h3>💎 Send ${amount} ALGO Tip</h3>
        <p>You'll be redirected to TipJar to complete this tip securely on the Algorand blockchain.</p>
        <a class="tjw-modal-btn" href="${tipUrl}" target="_blank">Continue to TipJar →</a>
        <button class="tjw-modal-close">Cancel</button>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.tjw-modal-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  /**
   * Escape HTML for widget
   */
  function escapeHtmlWidget(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Public API
  return { init };
})();

// Auto-initialize if data attributes are present
document.addEventListener('DOMContentLoaded', () => {
  const autoWidget = document.querySelector('[data-tipjar-widget]');
  if (autoWidget) {
    TipJarWidget.init({
      container: autoWidget,
      creatorAddress: autoWidget.dataset.creatorAddress || '',
      theme: autoWidget.dataset.theme || 'light',
      buttonText: autoWidget.dataset.buttonText || '💎 Send a Tip',
      defaultAmount: parseFloat(autoWidget.dataset.defaultAmount) || 2,
    });
  }
});
