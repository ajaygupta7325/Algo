/**
 * TipJar - Wallet SDK Loader
 * Robustly loads Pera Wallet & Defly Wallet SDKs from multiple CDN sources.
 * Sets window.PeraWalletConnect and window.DeflyWalletConnect globals.
 * Exposes window.__walletSDKsReady (Promise) for wallet.js to await.
 */
(function () {
  'use strict';

  // ── Protocol Warning ──────────────────────────────────────
  if (window.location.protocol === 'file:') {
    console.error(
      '[TipJar SDK Loader] ⚠️ Running from file:// protocol.\n' +
      'Wallet SDKs CANNOT be loaded from CDN when opening HTML files directly.\n' +
      'Please use a local HTTP server instead:\n' +
      '  • VS Code: Install "Live Server" extension → right-click index.html → "Open with Live Server"\n' +
      '  • Terminal: npx serve frontend/\n' +
      '  • Python:  python -m http.server 8000 --directory frontend/'
    );
  }

  // ── CDN Sources (tried in order) ──────────────────────────
  var PERA_SOURCES = [
    'https://esm.sh/@perawallet/connect@1.5.0?bundle-deps',
    'https://esm.sh/@perawallet/connect@1.5.0',
    'https://cdn.jsdelivr.net/npm/@perawallet/connect@1.5.0/+esm',
  ];

  var DEFLY_SOURCES = [
    'https://esm.sh/@blockshake/defly-connect@1.2.1?bundle-deps',
    'https://esm.sh/@blockshake/defly-connect@1.2.1',
    'https://cdn.jsdelivr.net/npm/@blockshake/defly-connect@1.2.1/+esm',
  ];

  // ── Timeout helper ────────────────────────────────────────
  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error('Timeout after ' + ms + 'ms')); }, ms);
      }),
    ]);
  }

  // ── Try importing from multiple CDN URLs ──────────────────
  function tryImport(sources, exportName) {
    var index = 0;

    function attempt() {
      if (index >= sources.length) {
        return Promise.resolve(null);
      }
      var url = sources[index++];
      console.log('[TipJar SDK Loader] Trying ' + exportName + ' from: ' + url);

      return withTimeout(import(url), 15000)
        .then(function (mod) {
          // Check named export
          if (mod && mod[exportName]) {
            console.log('[TipJar SDK Loader] ✅ ' + exportName + ' loaded from: ' + url);
            return mod[exportName];
          }
          // Check default export
          if (mod && mod.default && mod.default[exportName]) {
            console.log('[TipJar SDK Loader] ✅ ' + exportName + ' loaded (default) from: ' + url);
            return mod.default[exportName];
          }
          console.warn('[TipJar SDK Loader] Module loaded but ' + exportName + ' not found in exports. Keys:', Object.keys(mod || {}));
          return attempt(); // try next source
        })
        .catch(function (err) {
          console.warn('[TipJar SDK Loader] ❌ Failed from ' + url + ':', err.message || err);
          return attempt(); // try next source
        });
    }

    return attempt();
  }

  // ── Start loading both SDKs in parallel ───────────────────
  var peraReady = tryImport(PERA_SOURCES, 'PeraWalletConnect').then(function (cls) {
    if (cls) {
      window.PeraWalletConnect = cls;
      console.log('[TipJar SDK Loader] ✅ Pera Wallet SDK ready');
    } else {
      console.error('[TipJar SDK Loader] ❌ Pera Wallet SDK could not be loaded from any source');
    }
    return cls;
  });

  var deflyReady = tryImport(DEFLY_SOURCES, 'DeflyWalletConnect').then(function (cls) {
    if (cls) {
      window.DeflyWalletConnect = cls;
      console.log('[TipJar SDK Loader] ✅ Defly Wallet SDK ready');
    } else {
      console.error('[TipJar SDK Loader] ❌ Defly Wallet SDK could not be loaded from any source');
    }
    return cls;
  });

  // ── Combined ready promise ────────────────────────────────
  window.__walletSDKsReady = Promise.all([peraReady, deflyReady]).then(function (results) {
    var summary = {
      pera: !!results[0],
      defly: !!results[1],
    };
    console.log('[TipJar SDK Loader] Loading complete:', summary);

    // Dispatch event for any listeners
    window.dispatchEvent(new CustomEvent('wallet-sdks-loaded', { detail: summary }));

    return summary;
  });
})();
