// config.js - KONFIGURASI SUPABASE & FONNTE
const SUPABASE_CONFIG = {
  URL: 'https://djybwvdjipxftxmtqjbt.supabase.co',
  KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeWJ3dmRqaXB4ZnR4bXRxamJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODI5NzgsImV4cCI6MjA5NDY1ODk3OH0.vKFaGeIHieNQuXvepaA-GuUqlJ7QjIPmwB7ZKo3Kx8U'
};

// Konfigurasi Fonnte
const FONNTE_CONFIG = {
  BASE_URL: 'https://api.fonnte.com',
  TIMEOUT: 10000, // 10 detik
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