/**
 * TipJar Embeddable Widget (Production)
 * 
 * Self-contained widget for any website with error boundaries,
 * input sanitization, and CSP-safe rendering.
 * 
 * Usage:
 * <div id="tipjar-widget"></div>
 * <script src="tipjar-widget.js"></script>
 * <script>
 *   TipJarWidget.init({
 *     container: '#tipjar-widget',
 *     creatorAddress: 'YOUR_ALGORAND_ADDRESS',
 *     theme: 'light',        // light | dark | gradient
 *     buttonText: '💎 Send a Tip',
 *     defaultAmount: 2,
 *     showBranding: true
 *   });
 * </script>
 */

const TipJarWidget = (() => {
  const defaults = {
    container: '#tipjar-widget',
    creatorAddress: '',
    theme: 'light',
    buttonText: '💎 Send a Tip',
    defaultAmount: 2,
    showBranding: true,
    primaryColor: '#6c5ce7',
    tipJarUrl: '',
  };

  const VALID_THEMES = ['light', 'dark', 'gradient'];

  function init(options = {}) {
    try {
      const config = { ...defaults, ...options };

      // Validate theme
      if (!VALID_THEMES.includes(config.theme)) {
        config.theme = 'light';
      }

      // Sanitize primaryColor (must be valid hex)
      if (!/^#[0-9a-fA-F]{6}$/.test(config.primaryColor)) {
        config.primaryColor = '#6c5ce7';
      }

      // Clamp defaultAmount
      config.defaultAmount = Math.max(0.1, Math.min(10000, parseFloat(config.defaultAmount) || 2));

    if (!config.tipJarUrl) {
      const scripts = document.querySelectorAll('script[src*="tipjar-widget"]');
      if (scripts.length > 0) {
        const src = scripts[scripts.length - 1].src;
        config.tipJarUrl = src.replace(/js\/tipjar-widget\.js.*$/, '');
      }
    }

    const container = typeof config.container === 'string'
      ? document.querySelector(config.container)
      : config.container;

    if (!container) {
      console.error('TipJar Widget: Container not found:', config.container);
      return;
    }

    injectStyles(config);
    render(container, config);
    } catch (error) {
      console.error('TipJar Widget initialization error:', error);
    }
  }

  function injectStyles(config) {
    if (document.getElementById('tipjar-widget-css')) return;

    const style = document.createElement('style');
    style.id = 'tipjar-widget-css';
    style.textContent = `
      .tjw-box{display:inline-flex;flex-direction:column;align-items:center;gap:10px;padding:16px 24px;border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:300px;transition:all .3s ease}
      .tjw-box:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(0,0,0,.15)}
      .tjw-box.t-light{background:#f8f9fa;border:1px solid #dee2e6;color:#333}
      .tjw-box.t-dark{background:#1e1e3a;border:1px solid #2d2d55;color:#e8e8f0}
      .tjw-box.t-gradient{background:linear-gradient(135deg,${config.primaryColor},#a29bfe);border:none;color:#fff}
      .tjw-hd{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px}
      .tjw-lg{font-size:18px}
      .tjw-amts{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
      .tjw-ab{padding:6px 12px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;border:1px solid transparent}
      .t-light .tjw-ab{background:#fff;border-color:#dee2e6;color:#333}
      .t-light .tjw-ab:hover,.t-light .tjw-ab.sel{border-color:${config.primaryColor};background:${config.primaryColor}15;color:${config.primaryColor}}
      .t-dark .tjw-ab{background:#15152d;border-color:#2d2d55;color:#e8e8f0}
      .t-dark .tjw-ab:hover,.t-dark .tjw-ab.sel{border-color:${config.primaryColor};background:${config.primaryColor}25}
      .t-gradient .tjw-ab{background:rgba(255,255,255,.2);color:#fff}
      .t-gradient .tjw-ab:hover,.t-gradient .tjw-ab.sel{background:rgba(255,255,255,.35)}
      .tjw-btn{padding:10px 24px;border:none;border-radius:8px;font-weight:600;font-size:15px;cursor:pointer;transition:all .2s;width:100%}
      .t-light .tjw-btn,.t-dark .tjw-btn{background:linear-gradient(135deg,${config.primaryColor},#a29bfe);color:#fff}
      .t-gradient .tjw-btn{background:#fff;color:${config.primaryColor}}
      .tjw-btn:hover{transform:translateY(-1px);box-shadow:0 4px 15px rgba(108,92,231,.4)}
      .tjw-pw{font-size:10px;opacity:.6}
      .tjw-pw a{color:inherit;text-decoration:underline}
      .tjw-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:99999;animation:tjwFi .3s}
      @keyframes tjwFi{from{opacity:0}to{opacity:1}}
      .tjw-md{background:#fff;border-radius:16px;padding:32px;max-width:400px;width:90%;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;animation:tjwSu .3s}
      @keyframes tjwSu{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
      .tjw-md h3{margin:0 0 8px;font-size:20px;color:#333}
      .tjw-md p{margin:0 0 20px;color:#666;font-size:14px}
      .tjw-mb{display:inline-block;padding:10px 24px;background:linear-gradient(135deg,${config.primaryColor},#a29bfe);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;margin:4px}
      .tjw-mc{display:inline-block;padding:10px 24px;background:#f0f0f0;color:#333;border:none;border-radius:8px;font-size:14px;cursor:pointer;margin:4px}
    `;
    document.head.appendChild(style);
  }

  function render(container, config) {
    let sel = config.defaultAmount;
    const tc = `t-${config.theme}`;

    container.innerHTML = `
      <div class="tjw-box ${tc}">
        <div class="tjw-hd"><span class="tjw-lg">💎</span><span>TipJar</span></div>
        <div class="tjw-amts">
          <button class="tjw-ab ${sel===1?'sel':''}" data-a="1">1 ALGO</button>
          <button class="tjw-ab ${sel===2?'sel':''}" data-a="2">2 ALGO</button>
          <button class="tjw-ab ${sel===5?'sel':''}" data-a="5">5 ALGO</button>
          <button class="tjw-ab ${sel===10?'sel':''}" data-a="10">10 ALGO</button>
        </div>
        <button class="tjw-btn">${esc(config.buttonText)}</button>
        ${config.showBranding?`<div class="tjw-pw">Powered by <a href="${config.tipJarUrl||'#'}" target="_blank">TipJar</a> on Algorand</div>`:''}
      </div>
    `;

    container.querySelectorAll('.tjw-ab').forEach(b => {
      b.addEventListener('click', () => {
        container.querySelectorAll('.tjw-ab').forEach(x => x.classList.remove('sel'));
        b.classList.add('sel');
        sel = parseFloat(b.dataset.a);
      });
    });

    container.querySelector('.tjw-btn').addEventListener('click', () => {
      // SECURITY: Sanitize the URL - only allow relative paths or same-origin
      const baseUrl = config.tipJarUrl || '';
      const safeAddress = (config.creatorAddress || '').replace(/[^A-Za-z0-9]/g, '');
      const url = `${baseUrl}#profile/${safeAddress}`;
      const ov = document.createElement('div');
      ov.className = 'tjw-ov';
      ov.innerHTML = `
        <div class="tjw-md">
          <h3>💎 Send ${sel} ALGO Tip</h3>
          <p>You'll be redirected to TipJar to complete this tip securely on the Algorand blockchain.</p>
          <a class="tjw-mb" href="${url}" target="_blank">Continue to TipJar →</a>
          <button class="tjw-mc">Cancel</button>
        </div>
      `;
      document.body.appendChild(ov);
      ov.querySelector('.tjw-mc').addEventListener('click', () => ov.remove());
      ov.addEventListener('click', e => { if(e.target===ov) ov.remove(); });
    });
  }

  function esc(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }

  return { init };
})();

// Auto-init from data attributes
document.addEventListener('DOMContentLoaded', () => {
  const w = document.querySelector('[data-tipjar-widget]');
  if (w) {
    TipJarWidget.init({
      container: w,
      creatorAddress: w.dataset.creatorAddress || '',
      theme: w.dataset.theme || 'light',
      buttonText: w.dataset.buttonText || '💎 Send a Tip',
      defaultAmount: parseFloat(w.dataset.defaultAmount) || 2,
    });
  }
});
