// ====================================================
// js/core/state.js - APPLICATION STATE MANAGEMENT
// ====================================================

const AppState = {
  // ==========================================
  // DATA MASTER (dari Supabase)
  // ==========================================
  masterSiswa: [],
  masterKelas: [],
  masterGuru: [],

  // ==========================================
  // DATA FORM (dari file JSON lokal)
  // ==========================================
  dataSiswa: {},        // { "9A": [{nama, whatsapp}, ...] }
  dataGuru: [],         // [{nama, token}, ...]
  dataKelas: [],        // [{value, label}, ...]
  dataBulan: [],        // [{value, label}, ...]
  dataKeterangan: [],   // [{value, label}, ...]
  dataSurat: [],        // [{value, label}, ...]

  // ==========================================
  // DATA TAHFIDZ
  // ==========================================
  tahfidzRecords: [],   // Array of tahfidz records

  // ==========================================
  // DATA TARGET
  // ==========================================
  targetSiswa: {},       // { "kelas": [{nama, targetMingguan, ...}] }

  // ==========================================
  // UI STATE
  // ==========================================
  currentTab: 'input',
  currentMasterTab: 'siswa',
  isEditMode: false,
  currentEditingRow: null,
  
  // ==========================================
  // CONNECTION STATE
  // ==========================================
  isOnline: true,
  lastSyncTime: null,
  syncStatus: 'idle',     // 'idle' | 'loading' | 'success' | 'error' | 'warning'
  syncMessage: 'Menunggu sync...',

  // ==========================================
  // METHODS
  // ==========================================

  /**
   * Reset semua data ke default
   */
  reset() {
    this.masterSiswa = [];
    this.masterKelas = [];
    this.masterGuru = [];
    this.tahfidzRecords = [];
    this.targetSiswa = {};
    this.isEditMode = false;
    this.currentEditingRow = null;
    this.lastSyncTime = null;
    this.syncStatus = 'idle';
  },

  /**
   * Set sync status
   */
  setSyncStatus(status, message) {
    this.syncStatus = status;
    this.syncMessage = message;
    if (status === 'success') {
      this.lastSyncTime = new Date();
    }
  },

  /**
   * Update data master siswa dari Supabase ke dataSiswa (untuk form input)
   */
  syncMasterToDataSiswa() {
    this.dataSiswa = {};
    
    this.masterSiswa.forEach(siswa => {
      if (!this.dataSiswa[siswa.kelas_name]) {
        this.dataSiswa[siswa.kelas_name] = [];
      }
      
      this.dataSiswa[siswa.kelas_name].push({
        nama: siswa.nama,
        whatsapp: siswa.whatsapp || ''
      });
    });

    console.log('✅ dataSiswa synced from masterSiswa');
  },

  /**
   * Dapatkan jumlah record tahfidz
   */
  get totalRecords() {
    return this.tahfidzRecords.length;
  },

  /**
   * Dapatkan jumlah siswa master
   */
  get totalMasterSiswa() {
    return this.masterSiswa.length;
  },

  /**
   * Dapatkan jumlah guru master
   */
  get totalMasterGuru() {
    return this.masterGuru.length;
  },

  /**
   * Dapatkan jumlah kelas master
   */
  get totalMasterKelas() {
    return this.masterKelas.length;
  }
};

// Freeze agar tidak bisa di-reassign
Object.defineProperty(window, 'AppState', {
  value: AppState,
  writable: false,
  configurable: false
});

console.log('✅ AppState module loaded');