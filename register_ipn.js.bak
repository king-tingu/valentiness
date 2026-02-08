const readline = require('readline');
const https = require('https');
const url = require('url');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(query) {
  return new Promise(function(resolve) {
    rl.question(query, resolve);
  });
}

function request(method, requestUrl, headers, body) {
  return new Promise(function(resolve, reject) {
    const parsedUrl = url.parse(requestUrl);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method: method,
      headers: headers
    };

    const req = https.request(options, function(res) {
      let data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log("\n--- Pesapal IPN Registration Tool (Safe Mode) ---\n");

  const env = await ask("1. Environment ('live' or 'sandbox'): ");
  const key = await ask("2. Consumer Key: ");
  const secret = await ask("3. Consumer Secret: ");
  const appUrlRaw = await ask("4. Your Vercel App URL (e.g. https://my-app.vercel.app): ");

  // Sanitize URL
  let cleanUrl = appUrlRaw.trim();
  if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
  const webhookUrl = cleanUrl + "/api/webhook";

  const baseUrl = (env.trim() === 'live') 
    ? 'https://pay.pesapal.com/v3' 
    : 'https://cybqa.pesapal.com/pesapalv3';

  console.log(`\nConnecting to ${baseUrl}...`);

  try {
    // 1. Auth
    const authData = await request('POST', baseUrl + '/api/Auth/RequestToken', {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }, {
      consumer_key: key.trim(),
      consumer_secret: secret.trim()
    });

    if (!authData.token) {
      throw new Error("Auth Failed: " + JSON.stringify(authData));
    }
    console.log("Token received.");

    // 2. Register IPN
    console.log(`Registering IPN for: ${webhookUrl}`);
    const ipnData = await request('POST', baseUrl + '/api/Notifications/GetNotificationId', {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Bearer ' + authData.token
    }, {
      url: webhookUrl,
      ipn_notification_type: 'POST'
    });

    if (ipnData.ipn_id) {
      console.log("\n✅ SUCCESS! YOUR IPN ID IS:");
      console.log("------------------------------------------------");
      console.log(ipnData.ipn_id);
      console.log("------------------------------------------------");
      console.log("Add this as PESAPAL_IPN_ID in Vercel.");
    } else {
      console.log("❌ Failed:", ipnData);
    }

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    rl.close();
  }
}

run();