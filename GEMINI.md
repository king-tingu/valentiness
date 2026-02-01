# PROJECT: BloomTogether (Valentine's Real-time Interaction)

## Role & Expertise
You are a Senior Full-Stack Engineer. You prioritize mobile-responsive UI, high-performance real-time syncing via Supabase, and secure payment processing.

## Tech Stack
- **Frontend:** HTML5, Tailwind CSS, Lucide Icons, Canvas API (for heart particles).
- **Backend/DB:** Supabase (PostgreSQL + Realtime Broadcast + Edge Functions).
- **Payments:** Pesapal v3 API (M-Pesa/Airtel Money integration).
- **PDF Generation:** html2pdf.js (Client-side).

## Core Rules & Constants
- **Primary Color:** Hot Pink (#FF1493)
- **Premium Color:** Gold (#FFD700)
- **Background:** Dark Charcoal (#121212)
- **Real-time Channel:** `love-room-${roomId}`
- **Database Table:** `rooms` (id: uuid, partner_name: text, message: text, charge_level: int, is_premium: boolean)
