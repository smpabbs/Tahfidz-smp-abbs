// master-data.js - MASTER DATA MANAGEMENT DENGAN SUPABASE
// ====================================================

// 🎯 GLOBAL VARIABLES
// ====================================================
let masterSiswaData = [];
let masterKelasData = [];
let masterGuruData = [];

// 🔄 LOAD MASTER DATA FROM SUPABASE
// ====================================================

/**
 * Load semua master data saat aplikasi dimulai
 */
async function loadAllMasterData() {
  try {
    console.log('📦 Loading all master data from Supabase...');
    
    await Promise.all([
      loadMasterKelas(),
      loadMasterGuru(),
      loadMasterSiswa()
    ]);
    
    console.log('✅ All master data loaded successfully');
    
    // Update dropdown di form input
    updateAllDropdowns();
    
  } catch (error) {
    console.error('❌ Error loading master data:', error);
    showNotification('error', 'Gagal memuat master data dari Supabase');
  }
}

/**
 * Load data kelas dari Supabase
 */
async function loadMasterKelas() {
  try {
    const { data, error } = await supabase
      .from('master_kelas')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    masterKelasData = data || [];
    console.log('✅ Master Kelas loaded:', masterKelasData.length);
    
    // Update global dataKelas untuk compatibility
    if (window.dataKelas) {
      window.dataKelas = masterKelasData.map(k => ({
        value: k.kelas_name,
        label: k.label || k.kelas_name
      }));
    }
    
    // Update tabel jika sedang di tab master
    if (document.getElementById('master-kelas')?.classList.contains('active')) {
      displayMasterKelas();
    }
    
    // Update filter dropdown
    updateKelasFilterDropdowns();
    
    return masterKelasData;
    
  } catch (error) {
    console.error('❌ Error loading master kelas:', error);
    showNotification('error', 'Gagal memuat data kelas');
    return [];
  }
}

/**
 * Load data guru dari Supabase
 */
async function loadMasterGuru() {
  try {
    const { data, error } = await supabase
      .from('master_guru')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    masterGuruData = data || [];
    console.log('✅ Master Guru loaded:', masterGuruData.length);
    
    // Update global dataGuru untuk compatibility
    if (window.dataGuru) {
      window.dataGuru = masterGuruData.map(g => ({
        nama: g.nama,
        token: g.token_fonnte
      }));
    }
    
    // Update tabel jika sedang di tab master
    if (document.getElementById('master-guru')?.classList.contains('active')) {
      displayMasterGuru();
    }
    
    return masterGuruData;
    
  } catch (error) {
    console.error('❌ Error loading master guru:', error);
    showNotification('error', 'Gagal memuat data guru');
    return [];
  }
}

/**
 * Load data siswa dari Supabase
 */
async function loadMasterSiswa() {
  try {
    const filterKelas = document.getElementById('filterKelasSiswa')?.value || '';
    
    let query = supabase
      .from('master_siswa')
      .select('*')
      .eq('is_active', true)
      .order('kelas_name', { ascending: true })
      .order('sort_order', { ascending: true });
    
    if (filterKelas) {
      query = query.eq('kelas_name', filterKelas);
    }

    const { data, error } = await query;

    if (error) throw error;

    masterSiswaData = data || [];
    console.log('✅ Master Siswa loaded:', masterSiswaData.length);
    
    // Update global dataSiswa untuk compatibility
    updateGlobalSiswaData();
    
    // Update tabel jika sedang di tab master
    if (document.getElementById('master-siswa')?.classList.contains('active')) {
      displayMasterSiswa();
    }
    
    return masterSiswaData;
    
  } catch (error) {
    console.error('❌ Error loading master siswa:', error);
    showNotification('error', 'Gagal memuat data siswa');
    return [];
  }
}

/**
 * Update global dataSiswa untuk compatibility dengan script.js
 */
function updateGlobalSiswaData() {
  if (!window.dataSiswa) {
    window.dataSiswa = {};
  }
  
  // Reset dataSiswa
  window.dataSiswa = {};
  
  masterSiswaData.forEach(siswa => {
    if (!window.dataSiswa[siswa.kelas_name]) {
      window.dataSiswa[siswa.kelas_name] = [];
    }
    
    window.dataSiswa[siswa.kelas_name].push({
      nama: siswa.nama,
      whatsapp: siswa.whatsapp
    });
  });
}

// 📊 DISPLAY FUNCTIONS
// ====================================================

/**
 * Display tabel siswa
 */
function displayMasterSiswa() {
  const tbody = document.getElementById('masterSiswaTableBody');
  
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (masterSiswaData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="no-data">Belum ada data siswa</td></tr>';
    return;
  }
  
  masterSiswaData.forEach((siswa, index) => {
    const row = document.createElement('tr');
    row.className = index % 2 === 0 ? 'even' : 'odd';
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${siswa.nama}</strong></td>
      <td><span class="kelas-badge">${siswa.kelas_name}</span></td>
      <td>${siswa.whatsapp}</td>
      <td>
        <button class="btn-edit" onclick="openEditSiswaModal('${siswa.id}')" title="Edit siswa">
          ✏️
        </button>
        <button class="btn-delete" onclick="deleteMasterSiswa('${siswa.id}', '${siswa.nama}')" title="Hapus siswa">
          🗑️
        </button>
      </td>
    `;
    
    tbody.appendChild(row);
  });
}

/**
 * Display tabel kelas
 */
function displayMasterKelas() {
  const tbody = document.getElementById('masterKelasTableBody');
  
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (masterKelasData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="no-data">Belum ada data kelas</td></tr>';
    return;
  }
  
  masterKelasData.forEach((kelas, index) => {
    const jumlahSiswa = masterSiswaData.filter(s => s.kelas_name === kelas.kelas_name).length;
    
    const row = document.createElement('tr');
    row.className = index % 2 === 0 ? 'even' : 'odd';
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${kelas.kelas_name}</strong></td>
      <td>
        <span class="stats-badge">${jumlahSiswa} siswa</span>
      </td>
      <td>
        <button class="btn-edit" onclick="openEditKelasModal('${kelas.id}')" title="Edit kelas">
          ✏️
        </button>
        <button class="btn-delete" onclick="deleteMasterKelas('${kelas.id}', '${kelas.kelas_name}', ${jumlahSiswa})" title="Hapus kelas">
          🗑️
        </button>
      </td>
    `;
    
    tbody.appendChild(row);
  });
}

/**
 * Display tabel guru
 */
function displayMasterGuru() {
  const tbody = document.getElementById('masterGuruTableBody');
  
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (masterGuruData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="no-data">Belum ada data guru</td></tr>';
    return;
  }
  
  masterGuruData.forEach((guru, index) => {
    const row = document.createElement('tr');
    row.className = index % 2 === 0 ? 'even' : 'odd';
    
    const tokenDisplay = guru.token_fonnte ? (guru.token_fonnte.substring(0, 10) + '...') : 'No token';
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${guru.nama}</strong></td>
      <td><span class="token-cell" title="${guru.token_fonnte || ''}">${tokenDisplay}</span></td>
      <td>
        <button class="btn-edit" onclick="openEditGuruModal('${guru.id}')" title="Edit guru">
          ✏️
        </button>
        <button class="btn-delete" onclick="deleteMasterGuru('${guru.id}', '${guru.nama}')" title="Hapus guru">
          🗑️
        </button>
      </td>
    `;
    
    tbody.appendChild(row);
  });
}

// 🎨 UI HELPER FUNCTIONS
// ====================================================

/**
 * Show master data tab
 */
function showMasterTab(tabName) {
  // Remove active class from all master tabs
  document.querySelectorAll('.master-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active class from all master tab contents
  document.querySelectorAll('.master-tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // Add active class to selected tab
  const selectedTab = document.querySelector(`.master-tab[onclick*="'${tabName}'"]`);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
  
  // Add active class to selected content
  const selectedContent = document.getElementById(`master-${tabName}`);
  if (selectedContent) {
    selectedContent.classList.add('active');
  }
  
  // Load data for the selected tab
  switch(tabName) {
    case 'siswa':
      loadMasterSiswa();
      break;
    case 'kelas':
      loadMasterKelas();
      break;
    case 'guru':
      loadMasterGuru();
      break;
  }
}

/**
 * Open/Close modal
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'block';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    
    // Reset form
    const form = modal.querySelector('form');
    if (form) form.reset();
  }
}

// Close modal when clicking outside
window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
  }
}

// ➕ MODAL FUNCTIONS - SISWA
// ====================================================

/**
 * Open modal tambah siswa
 */
async function openAddSiswaModal() {
  // Reset form
  const form = document.getElementById('formSiswa');
  if (form) {
    form.reset();
  }
  
  document.getElementById('siswaId').value = '';
  document.getElementById('modalSiswaTitle').textContent = '➕ Tambah Siswa';
  
  // Populate kelas dropdown
  await populateSiswaKelasDropdown();
  
  openModal('modalSiswa');
}

/**
 * Open modal edit siswa
 */
async function openEditSiswaModal(siswaId) {
  const siswa = masterSiswaData.find(s => s.id === siswaId);
  
  if (!siswa) {
    showNotification('error', 'Data siswa tidak ditemukan!');
    return;
  }
  
  // Populate form
  document.getElementById('siswaId').value = siswa.id;
  document.getElementById('siswaName').value = siswa.nama;
  document.getElementById('siswaWhatsapp').value = siswa.whatsapp;
  document.getElementById('modalSiswaTitle').textContent = '✏️ Edit Siswa';
  
  // Populate and set kelas dropdown
  await populateSiswaKelasDropdown();
  document.getElementById('siswaKelas').value = siswa.kelas_name;
  
  openModal('modalSiswa');
}

/**
 * Populate kelas dropdown in siswa modal
 */
async function populateSiswaKelasDropdown() {
  const kelasSelect = document.getElementById('siswaKelas');
  if (!kelasSelect) return;
  
  kelasSelect.innerHTML = '<option value="">-- Pilih Kelas --</option>';
  
  // Ensure kelas data is loaded
  if (masterKelasData.length === 0) {
    await loadMasterKelas();
  }
  
  masterKelasData.forEach(kelas => {
    const option = document.createElement('option');
    option.value = kelas.kelas_name;
    option.textContent = kelas.kelas_name;
    kelasSelect.appendChild(option);
  });
}

/**
 * Save siswa (tambah/edit)
 */
async function saveSiswa(event) {
  event.preventDefault();
  
  const siswaId = document.getElementById('siswaId').value;
  const nama = document.getElementById('siswaName').value.trim();
  const kelasName = document.getElementById('siswaKelas').value;
  const whatsapp = document.getElementById('siswaWhatsapp').value.trim();
  
  if (!nama || !kelasName || !whatsapp) {
    showNotification('error', 'Semua field harus diisi!');
    return;
  }
  
  try {
    showNotification('loading', 'Menyimpan data siswa...', 0);
    
    const siswaData = {
      nama: nama,
      kelas_name: kelasName,
      whatsapp: whatsapp,
      is_active: true,
      updated_at: new Date().toISOString()
    };
    
    if (siswaId) {
      // Update existing siswa
      const { error } = await supabase
        .from('master_siswa')
        .update(siswaData)
        .eq('id', siswaId);
      
      if (error) throw error;
      
      showNotification('success', 'Data siswa berhasil diupdate!');
    } else {
      // Insert new siswa
      const maxOrder = masterSiswaData
        .filter(s => s.kelas_name === kelasName)
        .reduce((max, s) => Math.max(max, s.sort_order || 0), 0);
      
      siswaData.sort_order = maxOrder + 1;
      siswaData.created_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('master_siswa')
        .insert([siswaData]);
      
      if (error) throw error;
      
      showNotification('success', 'Data siswa berhasil ditambahkan!');
    }
    
    // Reload data
    await loadMasterSiswa();
    updateAllDropdowns();
    
    closeModal('modalSiswa');
    
  } catch (error) {
    console.error('Error saving siswa:', error);
    showNotification('error', 'Gagal menyimpan data siswa: ' + error.message);
  }
}

/**
 * Delete siswa
 */
async function deleteMasterSiswa(siswaId, namaSiswa) {
  const confirmation = confirm(
    `Apakah Anda yakin ingin menghapus siswa:\n\n${namaSiswa}\n\nData ini akan dihapus permanen!`
  );
  
  if (!confirmation) return;
  
  try {
    showNotification('loading', 'Menghapus data siswa...', 0);
    
    const { error } = await supabase
      .from('master_siswa')
      .delete()
      .eq('id', siswaId);
    
    if (error) throw error;
    
    showNotification('success', 'Data siswa berhasil dihapus!');
    
    // Reload data
    await loadMasterSiswa();
    updateAllDropdowns();
    
  } catch (error) {
    console.error('Error deleting siswa:', error);
    showNotification('error', 'Gagal menghapus data siswa: ' + error.message);
  }
}

// ➕ MODAL FUNCTIONS - KELAS
// ====================================================

/**
 * Open modal tambah kelas
 */
function openAddKelasModal() {
  const form = document.getElementById('formKelas');
  if (form) {
    form.reset();
  }
  document.getElementById('kelasId').value = '';
  document.getElementById('modalKelasTitle').textContent = '➕ Tambah Kelas';
  openModal('modalKelas');
}

/**
 * Open modal edit kelas
 */
function openEditKelasModal(kelasId) {
  const kelas = masterKelasData.find(k => k.id === kelasId);
  
  if (!kelas) {
    showNotification('error', 'Data kelas tidak ditemukan!');
    return;
  }
  
  document.getElementById('kelasId').value = kelas.id;
  document.getElementById('kelasName').value = kelas.kelas_name;
  document.getElementById('modalKelasTitle').textContent = '✏️ Edit Kelas';
  
  openModal('modalKelas');
}

/**
 * Save kelas (tambah/edit)
 */
async function saveKelas(event) {
  event.preventDefault();
  
  const kelasId = document.getElementById('kelasId').value;
  const kelasName = document.getElementById('kelasName').value.trim().toUpperCase();
  
  if (!kelasName) {
    showNotification('error', 'Nama kelas harus diisi!');
    return;
  }
  
  // Check if kelas name already exists (for new kelas)
  if (!kelasId) {
    const exists = masterKelasData.some(k => k.kelas_name === kelasName);
    if (exists) {
      showNotification('error', 'Nama kelas sudah ada!');
      return;
    }
  }
  
  try {
    showNotification('loading', 'Menyimpan data kelas...', 0);
    
    const kelasData = {
      kelas_name: kelasName,
      label: kelasName,
      updated_at: new Date().toISOString()
    };
    
    if (kelasId) {
      // Update existing kelas
      const { error } = await supabase
        .from('master_kelas')
        .update(kelasData)
        .eq('id', kelasId);
      
      if (error) throw error;
      
      showNotification('success', 'Data kelas berhasil diupdate!');
    } else {
      // Insert new kelas
      const maxOrder = masterKelasData.reduce((max, k) => Math.max(max, k.sort_order || 0), 0);
      
      kelasData.sort_order = maxOrder + 1;
      kelasData.created_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('master_kelas')
        .insert([kelasData]);
      
      if (error) throw error;
      
      showNotification('success', 'Data kelas berhasil ditambahkan!');
    }
    
    // Reload data
    await loadMasterKelas();
    updateAllDropdowns();
    
    closeModal('modalKelas');
    
  } catch (error) {
    console.error('Error saving kelas:', error);
    showNotification('error', 'Gagal menyimpan data kelas: ' + error.message);
  }
}

/**
 * Delete kelas
 */
async function deleteMasterKelas(kelasId, kelasName, jumlahSiswa) {
  if (jumlahSiswa > 0) {
    showNotification('error', `Tidak bisa menghapus kelas ${kelasName} karena masih ada ${jumlahSiswa} siswa!`);
    return;
  }
  
  const confirmation = confirm(
    `Apakah Anda yakin ingin menghapus kelas:\n\n${kelasName}\n\nData ini akan dihapus permanen!`
  );
  
  if (!confirmation) return;
  
  try {
    showNotification('loading', 'Menghapus data kelas...', 0);
    
    const { error } = await supabase
      .from('master_kelas')
      .delete()
      .eq('id', kelasId);
    
    if (error) throw error;
    
    showNotification('success', 'Data kelas berhasil dihapus!');
    
    // Reload data
    await loadMasterKelas();
    updateAllDropdowns();
    
  } catch (error) {
    console.error('Error deleting kelas:', error);
    showNotification('error', 'Gagal menghapus data kelas: ' + error.message);
  }
}

// ➕ MODAL FUNCTIONS - GURU
// ====================================================

/**
 * Open modal tambah guru
 */
function openAddGuruModal() {
  const form = document.getElementById('formGuru');
  if (form) {
    form.reset();
  }
  document.getElementById('guruId').value = '';
  document.getElementById('modalGuruTitle').textContent = '➕ Tambah Guru';
  openModal('modalGuru');
}

/**
 * Open modal edit guru
 */
function openEditGuruModal(guruId) {
  const guru = masterGuruData.find(g => g.id === guruId);
  
  if (!guru) {
    showNotification('error', 'Data guru tidak ditemukan!');
    return;
  }
  
  document.getElementById('guruId').value = guru.id;
  document.getElementById('guruName').value = guru.nama;
  document.getElementById('guruToken').value = guru.token_fonnte;
  document.getElementById('modalGuruTitle').textContent = '✏️ Edit Guru';
  
  openModal('modalGuru');
}

/**
 * Save guru (tambah/edit)
 */
async function saveGuru(event) {
  event.preventDefault();
  
  const guruId = document.getElementById('guruId').value;
  const namaGuru = document.getElementById('guruName').value.trim();
  const tokenFonnte = document.getElementById('guruToken').value.trim();
  
  if (!namaGuru || !tokenFonnte) {
    showNotification('error', 'Semua field harus diisi!');
    return;
  }
  
  // Check if guru name already exists (for new guru)
  if (!guruId) {
    const exists = masterGuruData.some(g => g.nama === namaGuru);
    if (exists) {
      showNotification('error', 'Nama guru sudah ada!');
      return;
    }
  }
  
  try {
    showNotification('loading', 'Menyimpan data guru...', 0);
    
    const guruData = {
      nama: namaGuru,
      token_fonnte: tokenFonnte,
      is_active: true,
      updated_at: new Date().toISOString()
    };
    
    if (guruId) {
      // Update existing guru
      const { error } = await supabase
        .from('master_guru')
        .update(guruData)
        .eq('id', guruId);
      
      if (error) throw error;
      
      showNotification('success', 'Data guru berhasil diupdate!');
    } else {
      // Insert new guru
      const maxOrder = masterGuruData.reduce((max, g) => Math.max(max, g.sort_order || 0), 0);
      
      guruData.sort_order = maxOrder + 1;
      guruData.created_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('master_guru')
        .insert([guruData]);
      
      if (error) throw error;
      
      showNotification('success', 'Data guru berhasil ditambahkan!');
    }
    
    // Reload data
    await loadMasterGuru();
    updateAllDropdowns();
    
    closeModal('modalGuru');
    
  } catch (error) {
    console.error('Error saving guru:', error);
    showNotification('error', 'Gagal menyimpan data guru: ' + error.message);
  }
}

/**
 * Delete guru
 */
async function deleteMasterGuru(guruId, namaGuru) {
  const confirmation = confirm(
    `Apakah Anda yakin ingin menghapus guru:\n\n${namaGuru}\n\nData ini akan dihapus permanen!`
  );
  
  if (!confirmation) return;
  
  try {
    showNotification('loading', 'Menghapus data guru...', 0);
    
    const { error } = await supabase
      .from('master_guru')
      .delete()
      .eq('id', guruId);
    
    if (error) throw error;
    
    showNotification('success', 'Data guru berhasil dihapus!');
    
    // Reload data
    await loadMasterGuru();
    updateAllDropdowns();
    
  } catch (error) {
    console.error('Error deleting guru:', error);
    showNotification('error', 'Gagal menghapus data guru: ' + error.message);
  }
}

// 🔄 UPDATE DROPDOWNS
// ====================================================

/**
 * Update semua dropdown di aplikasi
 */
function updateAllDropdowns() {
  // Update dropdown di form input
  if (typeof initGuruDropdown === 'function') {
    initGuruDropdown();
  }
  if (typeof initKelasDropdown === 'function') {
    initKelasDropdown();
  }
  if (typeof initTargetKelasDropdown === 'function') {
    initTargetKelasDropdown();
  }
  
  // Update filter dropdowns
  updateKelasFilterDropdowns();
}

/**
 * Update filter dropdown kelas
 */
function updateKelasFilterDropdowns() {
  // Filter kelas siswa di master data
  const filterKelasSiswa = document.getElementById('filterKelasSiswa');
  if (filterKelasSiswa) {
    const currentValue = filterKelasSiswa.value;
    filterKelasSiswa.innerHTML = '<option value="">Semua Kelas</option>';
    
    masterKelasData.forEach(kelas => {
      const option = document.createElement('option');
      option.value = kelas.kelas_name;
      option.textContent = kelas.kelas_name;
      if (kelas.kelas_name === currentValue) {
        option.selected = true;
      }
      filterKelasSiswa.appendChild(option);
    });
  }
}

// 🚀 INITIALIZATION
// ====================================================

/**
 * Initialize master data saat tab master dibuka
 */
function initMasterData() {
  console.log('🎯 Initializing Master Data tab...');
  
  // Load all master data
  loadAllMasterData();
  
  // Set active master tab to siswa by default
  showMasterTab('siswa');
}

// 🌐 EXPORT GLOBAL FUNCTIONS
// ====================================================

window.showMasterTab = showMasterTab;
window.openModal = openModal;
window.closeModal = closeModal;
window.loadMasterSiswa = loadMasterSiswa;
window.loadMasterKelas = loadMasterKelas;
window.loadMasterGuru = loadMasterGuru;
window.openAddSiswaModal = openAddSiswaModal;
window.openEditSiswaModal = openEditSiswaModal;
window.openAddKelasModal = openAddKelasModal;
window.openEditKelasModal = openEditKelasModal;
window.openAddGuruModal = openAddGuruModal;
window.openEditGuruModal = openEditGuruModal;
window.saveSiswa = saveSiswa;
window.saveKelas = saveKelas;
window.saveGuru = saveGuru;
window.deleteMasterSiswa = deleteMasterSiswa;
window.deleteMasterKelas = deleteMasterKelas;
window.deleteMasterGuru = deleteMasterGuru;
window.loadAllMasterData = loadAllMasterData;
window.initMasterData = initMasterData;

console.log('✅ Master Data JS Loaded');