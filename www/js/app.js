// ====================================================
// js/app.js - APPLICATION ENTRY POINT
// ====================================================

const App = {
  
  /**
   * Inisialisasi aplikasi
   */
  async init() {
    console.log('🚀 Starting Tahfidz App...');
    console.log('═══════════════════════════════════════');

    try {
      // 1. Init Supabase
      console.log('📡 Step 1: Initializing Supabase...');
      if (!SupabaseClient.init()) {
        NotificationService.error('Gagal koneksi ke database!', 10000);
        console.error('❌ Supabase initialization failed');
        return;
      }

      // 2. Init UI Components
      console.log('🎨 Step 2: Initializing UI...');
      Modal.init();

      // 3. Load static data (JSON files)
      console.log('📂 Step 3: Loading static data...');
      await this.loadStaticData();

      // 4. Init dropdowns
      console.log('🔽 Step 4: Initializing dropdowns...');
      DropdownManager.initAll();

      // 5. Load data dari Supabase
      console.log('💾 Step 5: Loading data from Supabase...');
      await this.loadSupabaseData();

      // 6. Init features
            console.log('⚙️  Step 6: Initializing features...');
            InputForm.init();
            OutputTable.init();
            TargetManager.init();
            await TemplateWaManager.init();

            // 7. Init anti-pause system
            console.log('⏰ Step 7: Starting anti-pause system...');
            this.initAntiPause();

      // 8. Set default tab
      console.log('📑 Step 8: Setting default tab...');
      TabManager.show('input');

      // 9. Set default tanggal
      InputForm.setDefaultTanggal();

      console.log('═══════════════════════════════════════');
      console.log('✅ App initialized successfully!');
      console.log(`   - Master Siswa : ${AppState.totalMasterSiswa}`);
      console.log(`   - Master Kelas : ${AppState.totalMasterKelas}`);
      console.log(`   - Master Guru  : ${AppState.totalMasterGuru}`);
      console.log(`   - Tahfidz Data : ${AppState.totalRecords} records`);
      console.log('═══════════════════════════════════════');

    } catch (error) {
      console.error('❌ App initialization failed:', error);
      NotificationService.error('Gagal menginisialisasi aplikasi: ' + error.message, 10000);
    }
  },

  /**
   * Load data statis dari file JSON
   */
  async loadStaticData() {
    // Load surat.json
    try {
      const response = await fetch('data/surat.json');
      if (response.ok) {
        const data = await response.json();
        AppState.dataSurat = data.dataSurat || [];
        console.log('✅ surat.json loaded:', AppState.dataSurat.length, 'surat');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load surat.json, using default');
      AppState.dataSurat = [
        { value: "1. Al-Fatihah", label: "1. Al-Fatihah" },
        { value: "2. Al-Baqarah", label: "2. Al-Baqarah" },
        { value: "3. Ali Imran", label: "3. Ali Imran" }
      ];
    }

    // Load default.json
    try {
      const response = await fetch('data/default.json');
      if (response.ok) {
        const data = await response.json();
        AppState.dataGuru = data.dataGuru || [];
        AppState.dataKelas = data.dataKelas || [];
        AppState.dataBulan = data.dataBulan || [];
        AppState.dataKeterangan = data.dataKeterangan || [];
        AppState.dataSiswa = data.dataSiswa || {};
        console.log('✅ default.json loaded');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load default.json, using hardcoded default');
      this.setHardcodedDefaults();
    }
  },

  /**
   * Set default hardcoded jika JSON gagal
   */
  setHardcodedDefaults() {
    AppState.dataGuru = [
      { nama: "Ust. Ahmad", token: "nCkVWGeAvA9zpBRn4ynh" }
    ];
    AppState.dataKelas = [
      { value: "9A", label: "9A" }, { value: "9B", label: "9B" }
    ];
    AppState.dataBulan = [
      { value: "01", label: "Januari" }, { value: "02", label: "Februari" },
      { value: "03", label: "Maret" }, { value: "04", label: "April" },
      { value: "05", label: "Mei" }, { value: "06", label: "Juni" },
      { value: "07", label: "Juli" }, { value: "08", label: "Agustus" },
      { value: "09", label: "September" }, { value: "10", label: "Oktober" },
      { value: "11", label: "November" }, { value: "12", label: "Desember" }
    ];
    AppState.dataKeterangan = [
      { value: "Mumtaz", label: "Mumtaz" },
      { value: "Jayid Jiddan", label: "Jayid Jiddan" },
      { value: "Jayid", label: "Jayid" }
    ];
    AppState.dataSiswa = {};
  },

  /**
   * Load data dari Supabase
   */
  async loadSupabaseData() {
    try {
      // Test koneksi
      const connected = await SupabaseClient.testConnection();
      
      if (connected) {
        // Load master data
        const { siswa, kelas, guru } = await DatabaseService.loadAllMasterData();
        AppState.masterSiswa = siswa;
        AppState.masterKelas = kelas;
        AppState.masterGuru = guru;
        AppState.syncMasterToDataSiswa();
        DropdownManager.updateAll();

        // Load tahfidz records
        AppState.tahfidzRecords = await DatabaseService.loadTahfidzRecords();
        
        AppState.isOnline = true;
        AppState.setSyncStatus('success', 'Data loaded from Supabase');
        console.log('✅ All Supabase data loaded');
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load from Supabase, trying localStorage');
      AppState.isOnline = false;
      
      // Fallback ke localStorage
      const localData = StorageService.loadTahfidzData();
      if (localData.length > 0) {
        AppState.tahfidzRecords = localData;
        AppState.setSyncStatus('warning', 'Using local data (offline)');
      }
    }
  },

  /**
   * Init anti-pause system
   */
  initAntiPause() {
    // Update last active
    StorageService.updateLastActive();

    // Check setiap interval
    setInterval(() => {
      const daysInactive = StorageService.getDaysSinceLastActive();
      console.log(`📊 Days since last active: ${daysInactive.toFixed(2)}`);
      
      if (daysInactive > 5) {
        console.log('🔄 Waking up database...');
        SupabaseClient.wakeup();
      }
      
      StorageService.updateLastActive();
    }, AppConfig.ANTIPAUZE_CHECK_INTERVAL);
  }
};

// ==========================================
// START APPLICATION WHEN DOM READY
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM Ready');
  App.init();
});

// ==========================================
// EXPORT GLOBAL REFERENCES (backward compatibility)
// ==========================================

// Fungsi-fungsi yang dipanggil dari HTML onclick
window.TabManager = TabManager;
window.InputForm = InputForm;
window.OutputTable = OutputTable;
window.TargetManager = TargetManager;
window.MasterData = MasterData;
window.ImportManager = ImportManager;
window.EditInline = EditInline;
window.Modal = Modal;
window.DropdownManager = DropdownManager;
window.NotificationService = NotificationService;

// Untuk backward compatibility dengan kode lama
window.showTab = (tab) => TabManager.show(tab);
window.showMasterTab = (tab) => TabManager.showMasterTab(tab);
window.updateToken = () => InputForm.updateToken();
window.updateNamaSiswa = () => InputForm.updateNamaSiswa();
window.updateWhatsApp = () => InputForm.updateWhatsApp();
window.toggleMenghafalFields = () => InputForm.toggleMenghafalFields();
window.updateTable = () => OutputTable.update();
window.exportToCSV = () => OutputTable.exportCSV();
window.exportToExcel = () => OutputTable.exportExcel();
window.deleteData = (i) => OutputTable.deleteRecord(i);
window.toggleEditMode = (i) => EditInline.toggle(i);
window.loadTargetSiswa = () => TargetManager.loadTable();
window.saveAllTargets = () => TargetManager.saveAll();
window.exportTargetToCSV = () => TargetManager.exportCSV();
window.updateSingleTarget = (n, k) => TargetManager.updateSingle(n, k);
window.openAddSiswaModal = () => MasterData.openAddSiswa();
window.openEditSiswaModal = (id) => MasterData.openEditSiswa(id);
window.openAddKelasModal = () => MasterData.openAddKelas();
window.openEditKelasModal = (id) => MasterData.openEditKelas(id);
window.openAddGuruModal = () => MasterData.openAddGuru();
window.openEditGuruModal = (id) => MasterData.openEditGuru(id);
window.saveSiswa = (e) => MasterData.saveSiswa(e);
window.saveKelas = (e) => MasterData.saveKelas(e);
window.saveGuru = (e) => MasterData.saveGuru(e);
window.deleteMasterSiswa = (id, n) => MasterData.deleteSiswa(id, n);
window.deleteMasterKelas = (id, n, c) => MasterData.deleteKelas(id, n, c);
window.deleteMasterGuru = (id, n) => MasterData.deleteGuru(id, n);
window.loadMasterSiswa = () => MasterData.refreshSiswa();
window.loadMasterKelas = () => MasterData.refreshKelas();
window.loadMasterGuru = () => MasterData.refreshGuru();
window.loadAllMasterData = () => MasterData.loadAll();
window.openImportModal = (t) => ImportManager.openModal(t);
window.executeImport = () => ImportManager.executeImport();
window.downloadTemplate = () => ImportManager.downloadTemplate();
window.clearFile = () => ImportManager.clearFile();
window.handleFileSelect = (e) => ImportManager.handleFileSelect(e);
window.openModal = (id) => Modal.open(id);
window.closeModal = (id) => Modal.close(id);
window.showNotification = (t, m, d) => NotificationService.show(t, m, d);
window.syncDataFromSupabase = () => OutputTable.update();

console.log('✅ App module loaded');