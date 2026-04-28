// ====================================================
// js/ui/tabs.js - TAB NAVIGATION MANAGER
// ====================================================

const TabManager = {
  
  /**
   * Pindah ke tab utama
   * @param {string} tabName - Nama tab ('input' | 'output' | 'target' | 'master')
   */
  show(tabName) {
    console.log(`🔍 Switching to tab: ${tabName}`);

    // Update state
    AppState.currentTab = tabName;

    // Sembunyikan semua tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = 'none';
      content.classList.remove('active');
    });

    // Hapus active dari semua tab button
    document.querySelectorAll('.tab').forEach(button => {
      button.classList.remove('active');
    });

    // Tampilkan tab yang dipilih
    const tabContent = document.getElementById(tabName);
    if (tabContent) {
      tabContent.style.display = 'block';
      tabContent.classList.add('active');
    } else {
      console.error(`❌ Tab content not found: ${tabName}`);
      return;
    }

    // Aktifkan tab button yang sesuai
    const tabButtons = document.querySelectorAll('.tab');
    let buttonActivated = false;
    
    tabButtons.forEach(button => {
      const onclickAttr = button.getAttribute('onclick') || '';
      if (onclickAttr.includes(`'${tabName}'`) || onclickAttr.includes(`"${tabName}"`)) {
        button.classList.add('active');
        buttonActivated = true;
      }
    });

    // Fallback: jika tidak ada button yang match, aktifkan berdasarkan index
    if (!buttonActivated) {
      const tabIndex = { input: 0, output: 1, target: 2, master: 3 };
      const idx = tabIndex[tabName] || 0;
      if (tabButtons[idx]) {
        tabButtons[idx].classList.add('active');
      }
    }

    // Load data sesuai tab
    this.loadTabData(tabName);

    console.log(`✅ Tab activated: ${tabName}`);
  },

  /**
   * Pindah ke sub-tab master
   * @param {string} tabName - Nama sub-tab ('siswa' | 'kelas' | 'guru')
   */
  showMasterTab(tabName) {
    console.log(`🔍 Switching master tab to: ${tabName}`);

    AppState.currentMasterTab = tabName;

    // Hapus active dari semua master tab button
    document.querySelectorAll('.master-tab').forEach(tab => {
      tab.classList.remove('active');
    });

    // Sembunyikan semua master tab content
    document.querySelectorAll('.master-tab-content').forEach(content => {
      content.classList.remove('active');
    });

    // Aktifkan tab button yang sesuai
    const selectedTab = document.querySelector(`.master-tab[onclick*="'${tabName}'"]`);
    if (selectedTab) {
      selectedTab.classList.add('active');
    }

    // Tampilkan content yang sesuai
    const selectedContent = document.getElementById(`master-${tabName}`);
    if (selectedContent) {
      selectedContent.classList.add('active');
    }

    // Load data sesuai sub-tab
    this.loadMasterTabData(tabName);

    console.log(`✅ Master tab activated: ${tabName}`);
  },

  /**
   * Load data saat tab dipilih
   */
  loadTabData(tabName) {
    switch (tabName) {
      case 'output':
        console.log('📊 Loading output data...');
        // Akan dipanggil dari OutputTable.update()
        if (typeof OutputTable !== 'undefined' && OutputTable.update) {
          setTimeout(() => OutputTable.update(), 100);
        }
        break;

      case 'target':
        console.log('🎯 Loading target data...');
        if (typeof TargetManager !== 'undefined' && TargetManager.loadTable) {
          setTimeout(() => TargetManager.loadTable(), 100);
        }
        break;

      case 'master':
        console.log('🗂️ Loading master data...');
        if (typeof MasterData !== 'undefined' && MasterData.loadAll) {
          setTimeout(() => MasterData.loadAll(), 100);
        }
        break;

      default:
        // 'input' - tidak perlu load khusus
        break;
    }
  },

  /**
   * Load data saat master sub-tab dipilih
   */
  loadMasterTabData(tabName) {
    if (typeof MasterData === 'undefined') return;

    switch (tabName) {
      case 'siswa':
        MasterData.refreshSiswa();
        break;
      case 'kelas':
        MasterData.refreshKelas();
        break;
      case 'guru':
        MasterData.refreshGuru();
        break;
    }
  },

  /**
   * Inisialisasi - tampilkan tab default
   */
  init() {
    // Set default tab
    this.show('input');
    console.log('✅ TabManager initialized');
  }
};

console.log('✅ TabManager module loaded');