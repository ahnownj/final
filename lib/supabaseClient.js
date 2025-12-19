import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gkdzaknjhriwdmangmcf.supabase.co';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpha25qaHJpd2RtYW5nbWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODMwNjksImV4cCI6MjA4MTQ1OTA2OX0.rSxUHuI_TL3nutRazGuwJjklEmGripzPe0C0bm0hY3g';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Supabase env vars not found; using provided project defaults. Add NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
