import { createApiChatHandler } from '../src/server/apiChatHandler.js';

// Node serverless route (for example Vercel's /api/chat). Keep every secret in
// server environment variables. Configure SUPABASE_URL and SUPABASE_ANON_KEY
// to enforce the daily quota against the authenticated Supabase user; without
// those, a per-process IP limiter is used as a best-effort demo safeguard.
const handler = createApiChatHandler(
  process.env.GEMINI_API_KEY ?? '',
  process.env.GEMINI_MODEL ?? 'gemini-3.6-flash',
  {
    supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '',
  },
);

export default handler;
