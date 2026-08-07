const { ethers } = require('ethers');
const HD = '0x835794Eea177Cb0928A40F32626c092d4dbE97f9';
const INV = '8ad13745-9fde-436b-a5b8-0afc5ebaa617';
const USDT = '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e';
const p = new ethers.JsonRpcProvider('https://forno.celo.org');
const t = new ethers.Contract(USDT, ['function balanceOf(address) view returns (uint256)'], p);
let last = '';
(async () => {
  for (let i = 0; i < 200; i++) {
    try {
      const [celo, usdt, st, inv] = await Promise.all([
        p.getBalance(HD), t.balanceOf(HD),
        fetch('https://api.voulti.com/deposit/status/' + INV).then(r => r.json()),
        fetch('https://api.voulti.com/invoices/' + INV).then(r => r.json()),
      ]);
      const d = st.data.deposits[0] || {};
      const line = [inv.status, d.status, 'USDT=' + ethers.formatUnits(usdt, 6),
        'CELO=' + ethers.formatEther(celo), d.refund_tx_hash ? 'refund✓' : 'refund·',
        'retries=' + (d.sweep_retries ?? 0)].join(' | ');
      if (line !== last) {
        console.log(new Date().toISOString().slice(11, 19), line);
        if (d.sweep_error) console.log('   nota:', d.sweep_error.slice(0, 200));
        last = line;
      }
      if (d.status === 'refunded' || d.status === 'failed') {
        console.log('--- TERMINAL ---');
        console.log('invoice   :', inv.status, '| refunded_at:', inv.refunded_at);
        console.log('refund_tx :', d.refund_tx_hash);
        console.log('USDT en HD:', ethers.formatUnits(usdt, 6), '| CELO en HD:', ethers.formatEther(celo));
        break;
      }
    } catch (e) { console.log('poll err', e.message); }
    await new Promise(r => setTimeout(r, 8000));
  }
})();
