// ====================================================
// js/services/storage.js - LOCAL STORAGE SERVICE
// ====================================================

const StorageService = {
  
  /**
   * Simpan data ke localStorage
   * @param {string} key - Kunci penyimpanan
   * @param {any} data - Data yang akan disimpan
   * @returns {boolean} - true jika berhasil
   */
  save(key, data) {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
      console.log(`💾 Data saved to localStorage: ${key}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to save to localStorage (${key}):`, error.message);
      return false;
    }
  },

  /**
   * Muat data dari localStorage
   * @param {string} key - Kunci penyimpanan
   * @param {any} defaultValue - Nilai default jika tidak ditemukan
   * @returns {any} - Data yang dimuat atau defaultValue
   */
  load(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      if (data === null) {
        console.log(`ℹ️ No data found in localStorage: ${key}`);
        return defaultValue;
      }
      
      const parsed = JSON.parse(data);
      console.log(`📂 Data loaded from localStorage: ${key}`);
      return parsed;
    } catch (error) {
      console.error(`❌ Failed to load from localStorage (${key}):`, error.message);
      return defaultValue;
    }
  },

  /**
   * Hapus data dari localStorage
   * @param {string} key - Kunci yang akan dihapus
   * @returns {boolean} - true jika berhasil
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      console.log(`🗑️ Data removed from localStorage: ${key}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to remove from localStorage (${key}):`, error.message);
      return false;
    }
  },

  /**
   * Cek apakah key ada di localStorage
   * @param {string} key - Kunci yang dicek
   * @returns {boolean}
   */
  exists(key) {
    return localStorage.getItem(key) !== null;
  },

  /**
   * Hapus semua data aplikasi dari localStorage
   */
  clearAll() {
    try {
      Object.values(AppConfig.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('🗑️ All app data cleared from localStorage');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear localStorage:', error.message);
      return false;
    }
  },

  // ==========================================
  // CONVENIENCE METHODS
  // ==========================================

  /**
   * Simpan data tahfidz
   */
  saveTahfidzData(data) {
    return this.save(AppConfig.STORAGE_KEYS.TAHFIDZ_DATA, data);
  },

  /**
   * Muat data tahfidz
   */
  loadTahfidzData() {
    return this.load(AppConfig.STORAGE_KEYS.TAHFIDZ_DATA, []);
  },

  /**
   * Simpan data target (localStorage + Supabase)
   */
  async saveTargetData(data) {
    this.save(AppConfig.STORAGE_KEYS.TAHFIDZ_TARGETS, data);
    // Juga simpan ke Supabase biar gak ilang
    try {
      const db = SupabaseClient.get();
      if (!db) return;
      const rows = [];
      Object.entries(data).forEach(([kelas, siswaList]) => {
        siswaList.forEach(s => {
          rows.push({
            nama: s.nama, kelas,
            target_mingguan: s.targetMingguan || 15,
            surat_mulai: s.suratMulai || '',
            ayat_mulai: s.ayatMulai || '',
            surat_selesai: s.suratSelesai || '',
            ayat_selesai: s.ayatSelesai || ''
          });
        });
      });
      if (rows.length > 0) {
        // Hapus existing + insert ulang
        await db.from('tahfidz_targets').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        for (let i = 0; i < rows.length; i += 50) {
          await db.from('tahfidz_targets').upsert(rows.slice(i, i + 50), { onConflict: 'nama,kelas' });
        }
        console.log(`✅ ${rows.length} targets saved to Supabase`);
      }
    } catch (e) { console.warn('⚠️ Supabase target save failed:', e.message); }
  },

  /**
   * Muat data target (dari Supabase dulu, fallback localStorage)
   */
  async loadTargetData() {
    // Coba dari Supabase dulu
    try {
      const db = SupabaseClient.get();
      if (db) {
        const { data, error } = await db.from('tahfidz_targets').select('*');
        if (!error && data && data.length > 0) {
          const result = {};
          data.forEach(item => {
            if (!result[item.kelas]) result[item.kelas] = [];
            result[item.kelas].push({
              nama: item.nama,
              targetMingguan: item.target_mingguan,
              suratMulai: item.surat_mulai || '',
              ayatMulai: item.ayat_mulai || '',
              suratSelesai: item.surat_selesai || '',
              ayatSelesai: item.ayat_selesai || ''
            });
          });
          // Sync ke localStorage juga
          this.save(AppConfig.STORAGE_KEYS.TAHFIDZ_TARGETS, result);
          console.log('✅ Targets loaded from Supabase');
          return result;
        }
      }
    } catch (e) { console.warn('⚠️ Supabase target load failed:', e.message); }
    // Fallback localStorage
    return this.load(AppConfig.STORAGE_KEYS.TAHFIDZ_TARGETS, {});
  },

  /**
   * Update waktu aktivitas terakhir (anti-pause)
   */
  updateLastActive() {
    return this.save(AppConfig.STORAGE_KEYS.LAST_ACTIVE, new Date().toISOString());
  },

  /**
   * Dapatkan waktu aktivitas terakhir
   */
  getLastActive() {
    return this.load(AppConfig.STORAGE_KEYS.LAST_ACTIVE, null);
  },

  /**
   * Cek berapa hari sejak aktivitas terakhir
   * @returns {number} - Jumlah hari
   */
  getDaysSinceLastActive() {
    const lastActive = this.getLastActive();
    if (!lastActive) return 0;
    
    const lastDate = new Date(lastActive);
    const now = new Date();
    return (now - lastDate) / (1000 * 60 * 60 * 24);
  }
};

console.log('✅ StorageService module loaded');