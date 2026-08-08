require('dotenv/config');
const { ethers } = require('ethers');
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ID = '2ade9a4a-aeae-48dc-8901-7e292861fea8';
const HD = '0xF5fdB8e9A01c12C49C601B7DB33B370Ae844593b';
const USDT = '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e';
const p = new ethers.JsonRpcProvider('https://forno.celo.org');
const t = new ethers.Contract(USDT, ['function balanceOf(address) view returns (uint256)'], p);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let last = '';
(async () => {
  for (let i = 0; i < 150; i++) {
    const [{ data: inv }, dep, usdt] = await Promise.all([
      s.from('invoices').select('status,confirmation_url_response,confirmation_url_retries,refunded_at').eq('id', ID).single(),
      s.from('deposit_addresses').select('status,refund_tx_hash,sweep_retries').eq('invoice_id', ID).single().then(r => r.data || {}),
      t.balanceOf(HD),
    ]);
    const line = `${inv.status} | dep=${dep.status} | USDT=${ethers.formatUnits(usdt,6)} | webhook_entregado=${inv.confirmation_url_response} | refund=${dep.refund_tx_hash ? 'si' : 'no'}`;
    if (line !== last) { console.log(new Date().toISOString().slice(11,19), line); last = line; }

    if (inv.status === 'Refunded' && inv.confirmation_url_response === false) {
      console.log('   → invoice paso a Refunded y la entrega se REABRIO. Disparando worker...');
      await fetch('https://api.voulti.com/notifications/process-url-confirmations', { method: 'POST' });
      await sleep(7000);
      const { data: f } = await s.from('invoices').select('status,confirmation_url_response,confirmation_url_retries,refunded_at').eq('id', ID).single();
      console.log('--- RESULTADO FINAL ---');
      console.log(JSON.stringify(f, null, 2));
      console.log(f.confirmation_url_response ? '>>> WEBHOOK DE REFUNDED ENTREGADO' : '>>> NO SE ENTREGO');
      break;
    }
    if (dep.status === 'failed') { console.log('   deposito en failed:', dep.sweep_retries, 'reintentos'); }
    await sleep(8000);
  }
})();
