// config.js - KONFIGURASI SUPABASE & FONNTE
const SUPABASE_CONFIG = {
  URL: 'https://xqidhrdnbfknekesevgk.supabase.co',
  KEY: 'sb_publishable_8zX6X5Xfswk_JcYYXCGLwQ_sdvMKAcL'
};

// Konfigurasi Fonnte
const FONNTE_CONFIG = {
  BASE_URL: 'https://api.fonnte.com',
  TIMEOUT: 15000, // 15 detik
  DEFAULT_TOKEN: 'nCkVWGeAvA9zpBRn4ynh' // Token Fonnte untuk semua guru
};

console.log('✅ Supabase & Fonnte Config Loaded');

// Validasi config
function validateSupabaseConfig() {
  if (!SUPABASE_CONFIG.URL) {
    console.error('❌ Supabase URL belum dikonfigurasi');
    return false;
  }
  if (!SUPABASE_CONFIG.KEY) {
    console.error('❌ Supabase API Key belum dikonfigurasi');
    return false;
  }
  console.log('✅ Supabase configuration validated');
  return true;
}
