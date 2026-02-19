const algosdk = require('algosdk');
const kmd = new algosdk.Kmd('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'http://localhost', 4002);
(async () => {
  const wallets = await kmd.listWallets();
  const defaultWallet = wallets.wallets.find(w => w.name === 'unencrypted-default-wallet');
  if (!defaultWallet) { console.log('No default wallet found'); return; }
  const handle = await kmd.initWalletHandle(defaultWallet.id, '');
  const keys = await kmd.listKeys(handle.wallet_handle_token);
  const addr = keys.addresses[0];
  const keyResp = await kmd.exportKey(handle.wallet_handle_token, '', addr);
  const mn = algosdk.secretKeyToMnemonic(keyResp.private_key);
  console.log('ADDRESS:', addr);
  console.log('MNEMONIC:', mn);
})().catch(e => console.error(e));
