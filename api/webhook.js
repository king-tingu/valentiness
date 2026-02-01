import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with Service Role Key (secure backend only)
// Ensure you set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req, res) {
  // Phase 4: Pesapal Webhook Handling
  if (req.method === 'POST') {
    try {
      // Vercel automatically parses JSON body if Content-Type is application/json
      const { OrderTrackingId, OrderMerchantReference, status } = req.body;

      console.log(`Received IPN: ${OrderTrackingId}, Status: ${status}`);

      // 1. Verify Payment Status logic would go here
      // For now, we assume if status is COMPLETED, it's valid.
      const paymentVerified = status === 'COMPLETED';

      if (paymentVerified) {
        // 2. Update 'is_premium' in Supabase Database
        // We assume OrderMerchantReference contains the Room ID
        const roomId = OrderMerchantReference;

        if (roomId) {
            const { error } = await supabase
            .from('rooms')
            .update({ is_premium: true })
            .eq('id', roomId);

            if (error) throw error;
            console.log(`Premium activated for room: ${roomId}`);
        }
      }

      // 3. Respond to Pesapal
      return res.status(200).json({ status: 'success' });

    } catch (error) {
      console.error("Webhook Error:", error);
      return res.status(400).json({ error: error.message });
    }
  }

  // Handle non-POST requests
  res.setHeader('Allow', ['POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
