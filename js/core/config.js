// ====================================================
// js/core/config.js - KONFIGURASI APLIKASI
// ====================================================

const AppConfig = {
  // Supabase Configuration
  SUPABASE_URL: 'https://pcleezhfxbrqqrtwfvvz.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbGVlemhmeGJycXFydHdmdnZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MTUzNDQsImV4cCI6MjA3OTA5MTM0NH0.xcxshWZZ1Na8KcLQoZml0PuksnpRgtkm4nRv3CVnqnI',

  // Fonnte Configuration
  FONNTE_URL: 'https://api.fonnte.com',
  FONNTE_DEFAULT_TOKEN: 'nCkVWGeAvA9zpBRn4ynh',
  FONNTE_TIMEOUT: 10000,

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