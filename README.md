# BloomTogether - Vercel Deployment

## Project Structure
- `public/`: Contains the frontend (`index.html`, `app.js`). Vercel serves this automatically.
- `api/`: Contains the backend (`webhook.js`). Vercel runs this as a serverless function.

## How to Deploy

1. **Push to GitHub**:
   Push this entire folder to a GitHub repository.

2. **Import to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard).
   - Click **Add New** > **Project**.
   - Import your GitHub repository.
   - **Framework Preset**: select "Other" (or leave as default, Vercel detects it).

3. **Environment Variables**:
   In the Vercel Project Settings, add these variables:
   - `SUPABASE_URL`: Your Supabase Project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (NOT the Anon key). 
     *Find this in Supabase Dashboard > Project Settings > API.*

4. **Deploy**:
   Click **Deploy**.

## Webhook URL
Your new Pesapal Webhook URL will be:
`https://<your-project-name>.vercel.app/api/webhook`

Use this URL in your Pesapal dashboard IPN settings.

## Frontend Config
Don't forget to update `public/app.js` with your **Supabase Anon Key** and **URL** for the client-side realtime features to work.