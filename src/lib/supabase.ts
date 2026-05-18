import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anonKey);

export function createServerClient() {
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? anonKey;
  return createClient(url, serviceKey);
}
