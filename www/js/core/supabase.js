// ====================================================
// js/core/supabase.js - SUABASE CLIENT MANAGER
// ====================================================

const SupabaseClient = {
  client: null,
  initialized: false,

  /**
   * Inisialisasi Supabase client
   * @returns {boolean} - true jika berhasil
   */
  init() {
    // Cek apakah library Supabase dari CDN sudah dimuat
    if (typeof window.supabase === 'undefined') {
      console.error('❌ Supabase library tidak ditemukan! Pastikan CDN sudah ditambahkan di index.html');
      return false;
    }

    if (this.initialized && this.client) {
      console.log('ℹ️ Supabase client already initialized');
      return true;
    }

    try {
      this.client = window.supabase.createClient(
        AppConfig.SUPABASE_URL,
        AppConfig.SUPABASE_KEY
      );
      this.initialized = true;
      
      // Set ke window untuk backward compatibility
      window.supabaseClient = this.client;
      
      console.log('✅ Supabase client initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Supabase client:', error);
      return false;
    }
  },

  /**
   * Dapatkan Supabase client instance
   * @returns {object|null} - Supabase client atau null
   */
  get() {
    if (!this.initialized || !this.client) {
      this.init();
    }
    return this.client;
  },

  /**
   * Test koneksi ke Supabase
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      const db = this.get();
      if (!db) return false;

      const { data, error } = await db
        .from('tahfidz_records')
        .select('id')
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Supabase connection test failed:', error.message);
        return false;
      }

      console.log('✅ Supabase connection OK');
      return true;
    } catch (error) {
      console.error('❌ Supabase connection error:', error.message);
      return false;
    }
  },

  /**
   * Wakeup database (untuk mencegah pause Supabase free tier)
   * @returns {Promise<boolean>}
   */
  async wakeup() {
    try {
      const db = this.get();
      if (!db) return false;

      const { data, error } = await db
        .from('tahfidz_records')
        .select('id')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      console.log('✅ Database wakeup successful');
      return true;
    } catch (error) {
      console.error('❌ Database wakeup failed:', error.message);
      return false;
    }
  }
};

// Auto-init saat file dimuat
SupabaseClient.init();

console.log('✅ SupabaseClient module loaded');