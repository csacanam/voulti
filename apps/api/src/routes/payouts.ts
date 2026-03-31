import { FastifyInstance } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export async function payoutsRoutes(app: FastifyInstance) {

  // Record a direct withdrawal (frontend calls this after tx confirms)
  app.post('/', { preHandler: requireAuth }, async (req: AuthenticatedRequest, res) => {
    try {
      const { commerce_id, to_address, amount, token } = req.body as {
        commerce_id: string;
        to_address: string;
        amount: number;
        token: string;
      };

      if (!commerce_id || !to_address || !amount || !token) {
        return res.status(400).send({ error: 'Missing required fields' });
      }

      const { error } = await supabase.from('payouts').insert({
        commerce_id,
        to_address,
        to_name: to_address.slice(0, 6) + '...' + to_address.slice(-4),
        to_amount: amount,
        to_currency: token,
        status: 'Claimed',
        claimed_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Insert payout error:', error);
        return res.status(500).send({ error: 'Failed to record withdrawal' });
      }

      return res.send({ success: true });
    } catch (error: any) {
      return res.status(500).send({ error: error.message || 'Failed to record withdrawal' });
    }
  });

  // Get payouts for a commerce (withdrawal history)
  app.get('/', async (req, res) => {
    try {
      const { commerce_id } = req.query as { commerce_id?: string };

      if (!commerce_id) {
        return res.status(400).send({ error: 'commerce_id is required' });
      }

      const { data: payouts, error } = await supabase
        .from('payouts')
        .select('id, commerce_id, to_address, to_name, to_amount, to_currency, status, created_at, claimed_at')
        .eq('commerce_id', commerce_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Payouts query error:', error);
        return res.status(500).send({ error: 'Failed to fetch payouts' });
      }

      return res.send({ success: true, data: payouts || [] });
    } catch (error: any) {
      console.error('Get payouts error:', error);
      return res.status(500).send({ error: error.message || 'Failed to get payouts' });
    }
  });
}
