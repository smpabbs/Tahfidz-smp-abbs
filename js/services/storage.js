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
   * Simpan data target
   */
  saveTargetData(data) {
    return this.save(AppConfig.STORAGE_KEYS.TAHFIDZ_TARGETS, data);
  },

  /**
   * Muat data target
   */
  loadTargetData() {
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