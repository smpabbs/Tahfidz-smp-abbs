// ====================================================
// js/core/config.js - KONFIGURASI APLIKASI
// ====================================================

const AppConfig = {
  // Supabase Configuration
  SUPABASE_URL: 'https://djybwvdjipxftxmtqjbt.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeWJ3dmRqaXB4ZnR4bXRxamJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODI5NzgsImV4cCI6MjA5NDY1ODk3OH0.vKFaGeIHieNQuXvepaA-GuUqlJ7QjIPmwB7ZKo3Kx8U',

  // Fonnte Configuration
  FONNTE_URL: 'https://api.fonnte.com',
  FONNTE_DEFAULT_TOKEN: 'nCkVWGeAvA9zpBRn4ynh',
  FONNTE_PROXY_URL: 'https://tahfidzsmpabbs.vercel.app/api/fonnte-proxy',
  FONNTE_TIMEOUT: 10000,

  // Anti-Pause Configuration
  ANTIPAUZE_CHECK_INTERVAL: 60 * 60 * 1000,    // 1 jam
  ANTIPAUZE_WAKEUP_INTERVAL: 5 * 24 * 60 * 60 * 1000, // 5 hari

  // Storage Keys
  STORAGE_KEYS: {
    TAHFIDZ_DATA: 'tahfidz_data',
    TAHFIDZ_TARGETS: 'tahfidz_targets',
    WA_TEMPLATES: 'tahfidz_wa_templates',
    LAST_ACTIVE: 'tahfidz_last_active',
    LAST_UPDATE: 'tahfidz_last_update'
  },

  // Label tampilan untuk tiap alasan tidak ziyadah (selain 'ya')
  MENGHAFAL_LABELS: {
    sakit: 'Sakit',
    sertifikasi: 'Persiapan Sertifikasi',
    lainnya: 'Lainnya'
  },

  // Default Values
  DEFAULT_TARGET_BARIS: 15,
  MIN_TARGET_BARIS: 5,
  MAX_TARGET_BARIS: 50,

  // Auto Sync Interval (ms)
  AUTO_SYNC_INTERVAL: 30000
};

// Freeze config agar tidak bisa diubah
Object.freeze(AppConfig);
Object.freeze(AppConfig.STORAGE_KEYS);
Object.freeze(AppConfig.MENGHAFAL_LABELS);

console.log('✅ AppConfig loaded');