import { FastifyInstance } from 'fastify';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export async function payoutsRoutes(app: FastifyInstance) {

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
