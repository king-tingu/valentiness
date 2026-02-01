// api/pay.js
// This function handles the "Initiate Payment" request from the frontend.
// It talks to Pesapal to get a payment link.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { roomId, name, email } = req.body;
  
  // Use Sandbox URL for testing, Live URL for production
  // Sandbox: https://cybqa.pesapal.com/pesapalv3
  // Live:    https://pay.pesapal.com/v3
  const BASE_URL = 'https://pay.pesapal.com/v3'; 
  
  const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
  const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;
  
  // URL to redirect user back to after payment
  // Note: Vercel URLs are https, which is required
  const CALLBACK_URL = `https://${req.headers.host}/api/webhook`; 
  
  // URL for the IPN (Instant Payment Notification)
  // This must be a publicly accessible URL
  const IPN_ID = process.env.PESAPAL_IPN_ID; // You need to register an IPN URL once and get this ID.

  try {
    // 1. Get Access Token
    const authRes = await fetch(`${BASE_URL}/api/Auth/RequestToken`, {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json', 
          'Accept': 'application/json' 
      },
      body: JSON.stringify({
        consumer_key: CONSUMER_KEY,
        consumer_secret: CONSUMER_SECRET
      })
    });
    
    const authData = await authRes.json();
    if (!authData.token) throw new Error("Failed to authenticate with Pesapal");
    const token = authData.token;

    // 2. Register IPN (If you don't have a static one, you can register dynamically, 
    // but usually you do this once manually or check if exists. 
    // For simplicity, we assume you have an IPN_ID in env, or we use a basic flow.)
    // Note: V3 requires a registered IPN URL ID for the order.

    // 3. Submit Order Request
    const orderData = {
      "id": roomId, // Using Room ID as the tracking ID
      "currency": "KES",
      "amount": 10.00, // 10 Bob
      "description": "BloomTogether Premium Upgrade",
      "callback_url": `https://${req.headers.host}/?room=${roomId}&status=paid`, // User returns here
      "notification_id": IPN_ID, // Required for V3
      "billing_address": {
        "email_address": email || "customer@bloomtogether.com",
        "phone_number": "",
        "country_code": "KE",
        "first_name": name || "Guest",
        "middle_name": "",
        "last_name": ""
      }
    };

    const orderRes = await fetch(`${BASE_URL}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderData)
    });

    const orderJson = await orderRes.json();
    
    if (orderJson.redirect_url) {
       return res.status(200).json({ redirect_url: orderJson.redirect_url });
    } else {
       console.error("Pesapal Order Error:", orderJson);
       throw new Error(orderJson.error ? orderJson.error.message : "Failed to create order");
    }

  } catch (error) {
    console.error("Payment API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
