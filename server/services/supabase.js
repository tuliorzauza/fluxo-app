const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('[SUPABASE INIT] URL:', process.env.SUPABASE_URL);
console.log('[SUPABASE INIT] KEY (primeiros 20):', process.env.SUPABASE_SERVICE_KEY?.slice(0, 20));

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = { supabase };
