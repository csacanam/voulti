const { ethers } = require('ethers');
const HD = '0x94A390f5913E6512C35bf404B0Ded1D99ff3f2f0';
const INV = 'a93d210f-a342-4609-9654-4b6058f6d16b';
const USDT = '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e';
const p = new ethers.JsonRpcProvider('https://forno.celo.org');
const erc20 = new ethers.Contract(USDT, ['function balanceOf(address) view returns (uint256)'], p);

let last = '', maxCelo = 0n;
(async () => {
  for (let i = 0; i < 150; i++) {
    try {
      const [celo, usdt, st] = await Promise.all([
        p.getBalance(HD), erc20.balanceOf(HD),
        fetch('https://api.voulti.com/deposit/status/' + INV).then(r => r.json()),
      ]);
      if (celo > maxCelo) maxCelo = celo;
      const d = st.data.deposits[0] || {};
      const line = [
        st.data.invoiceStatus, d.status,
        'CELO=' + ethers.formatEther(celo), 'USDT=' + ethers.formatUnits(usdt, 6),
        d.gas_tx_hash ? 'gas✓' : 'gas·', d.approve_tx_hash ? 'apr✓' : 'apr·',
        d.pay_invoice_tx_hash ? 'pay✓' : 'pay·',
        'retries=' + (d.sweep_retries ?? 0),
      ].join(' | ');
      if (line !== last) { console.log(new Date().toISOString().slice(11, 19), line); last = line; }
      if (d.sweep_error) console.log('   ERROR:', d.sweep_error.slice(0, 200));
      if (d.status === 'swept' || d.status === 'failed') {
        console.log('--- TERMINAL ---');
        console.log('CELO maximo inyectado por ensureGas:', ethers.formatEther(maxCelo));
        console.log('CELO restante tras returnLeftoverGas:', ethers.formatEther(celo));
        console.log('pay tx:', d.pay_invoice_tx_hash);
        break;
      }
    } catch (e) { console.log('poll err', e.message); }
    await new Promise(r => setTimeout(r, 10000));
  }
})();
