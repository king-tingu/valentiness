import { createClient } from '@supabase/supabase-js';

// 1. SECURE SETUP: Read keys from Environment Variables
// Go to Vercel Dashboard > Settings > Environment Variables to set these.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Pesapal Keys (Access them like this)
const PESAPAL_KEY = process.env.PESAPAL_CONSUMER_KEY;
const PESAPAL_SECRET = process.env.PESAPAL_CONSUMER_SECRET;

export default async function handler(req, res) {
  // Phase 4: Pesapal Webhook Handling
  if (req.method === 'POST') {
    try {
      const { OrderTrackingId, OrderMerchantReference, status } = req.body;
      console.log(`Received IPN: ${OrderTrackingId}, Status: ${status}`);

      // TODO: For Production, use PESAPAL_KEY and PESAPAL_SECRET here to:
      // 1. Authenticate with Pesapal API to get a Bearer Token.
      // 2. Call /api/Transactions/GetTransactionStatus to verify the payment is actually 'COMPLETED'.
      // For now, we trust the IPN status for the prototype.
      
      const paymentVerified = status === 'COMPLETED';

      if (paymentVerified && OrderMerchantReference) {
        // Update Database Securely
        const { error } = await supabase
          .from('rooms')
          .update({ is_premium: true })
          .eq('id', OrderMerchantReference);

        if (error) throw error;
        console.log(`Premium activated for room: ${OrderMerchantReference}`);
      }

      return res.status(200).json({ status: 'success' });

    } catch (error) {
      console.error("Webhook Error:", error);
      return res.status(400).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
