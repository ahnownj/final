// Vercel(webpack) 환경에서 @supabase/supabase-js ESM wrapper가 간헐적으로
// "default export가 없다"는 컴파일 에러를 내는 케이스가 있어,
// require(CJS) 경로로 우회해서 안정적으로 빌드되게 합니다.
// (require는 package.json의 exports.require -> dist/main/index.js를 타므로 wrapper.mjs를 피함)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createClient } = require('@supabase/supabase-js');

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
