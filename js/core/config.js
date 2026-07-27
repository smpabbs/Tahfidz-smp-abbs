// ====================================================
// js/core/config.js - KONFIGURASI APLIKASI
// ====================================================

const AppConfig = {
  // Supabase Configuration
  SUPABASE_URL: 'https://xqidhrdnbfknekesevgk.supabase.co',
  SUPABASE_KEY: 'sb_publishable_8zX6X5Xfswk_JcYYXCGLwQ_sdvMKAcL',

  // Fonnte Configuration
  FONNTE_URL: 'https://api.fonnte.com',
  FONNTE_DEFAULT_TOKEN: 'nCkVWGeAvA9zpBRn4ynh',
  FONNTE_TIMEOUT: 15000,

  // Anti-Pause Configuration
  ANTIPAUZE_CHECK_INTERVAL: 60 * 60 * 1000,    // 1 jam
  ANTIPAUZE_WAKEUP_INTERVAL: 5 * 24 * 60 * 60 * 1000, // 5 hari

  // Storage Keys
  STORAGE_KEYS: {
    TAHFIDZ_DATA: 'tahfidz_data',
    TAHFIDZ_TARGETS: 'tahfidz_targets',
    LAST_ACTIVE: 'tahfidz_last_active',
    LAST_UPDATE: 'tahfidz_last_update'
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

console.log('✅ AppConfig loaded');
