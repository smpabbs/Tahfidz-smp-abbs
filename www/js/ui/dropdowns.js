// ====================================================
// js/ui/dropdowns.js - DROPDOWN MANAGER
// ====================================================

const DropdownManager = {
  
  /**
   * Inisialisasi semua dropdown
   */
  initAll() {
    this.initGuruDropdown();
    this.initKelasDropdowns();
    this.initSuratDropdown();
    this.initKeteranganDropdown();
    this.initBulanDropdown();
    this.initTahunDropdown();
    console.log('✅ All dropdowns initialized');
  },

  /**
   * Update semua dropdown (setelah data master berubah)
   */
  updateAll() {
    this.initGuruDropdown();
    this.initKelasDropdowns();
    this.updateFilterKelasDropdown();
    this.updateTargetKelasDropdown();
    this.updateMasterFilterDropdown();
    console.log('✅ All dropdowns updated');
  },

  // ==========================================
  // GURU DROPDOWN
  // ==========================================

  /**
   * Inisialisasi dropdown guru di form input
   */
  initGuruDropdown() {
    const select = document.getElementById('guru');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">-- Pilih Guru --</option>';

    const guruData = AppState.masterGuru.length > 0 
      ? AppState.masterGuru 
      : AppState.dataGuru;

    guruData.forEach(guru => {
      const opt = document.createElement('option');
      opt.value = guru.nama;
      opt.textContent = guru.nama;
      opt.setAttribute('data-token', guru.token_fonnte || guru.token || '');
      select.appendChild(opt);
    });

    // Kembalikan value sebelumnya
    if (currentValue) {
      select.value = currentValue;
    }
  },

  // ==========================================
  // KELAS DROPDOWNS
  // ==========================================

  /**
   * Inisialisasi semua dropdown kelas
   */
  initKelasDropdowns() {
    this.updateKelasInputDropdown();
    this.updateFilterKelasDropdown();
    this.updateTargetKelasDropdown();
    this.updateMasterFilterDropdown();
    this.updateModalKelasDropdown();
  },

  /**
   * Update dropdown kelas di form input
   */
  updateKelasInputDropdown() {
    const select = document.getElementById('kelas');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>';

    const kelasData = AppState.masterKelas.length > 0 
      ? AppState.masterKelas 
      : AppState.dataKelas;

    kelasData.forEach(kelas => {
      const opt = document.createElement('option');
      opt.value = kelas.kelas_name || kelas.value;
      opt.textContent = kelas.kelas_name || kelas.label;
      select.appendChild(opt);
    });

    if (currentValue) {
      select.value = currentValue;
    }
  },

  /**
   * Update dropdown filter kelas di tab Output
   */
  updateFilterKelasDropdown() {
    const select = document.getElementById('filterKelas');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">Semua Kelas</option>';

    AppState.masterKelas.forEach(kelas => {
      const opt = document.createElement('option');
      opt.value = kelas.kelas_name;
      opt.textContent = kelas.kelas_name;
      select.appendChild(opt);
    });

    if (currentValue) {
      select.value = currentValue;
    }
  },

  /**
   * Update dropdown target kelas
   */
  updateTargetKelasDropdown() {
    const select = document.getElementById('targetKelas');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>';

    AppState.masterKelas.forEach(kelas => {
      const opt = document.createElement('option');
      opt.value = kelas.kelas_name;
      opt.textContent = kelas.kelas_name;
      select.appendChild(opt);
    });

    if (currentValue) {
      select.value = currentValue;
    }
  },

  /**
   * Update dropdown filter di tab master
   */
  updateMasterFilterDropdown() {
    const select = document.getElementById('filterKelasSiswa');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">Semua Kelas</option>';

    AppState.masterKelas.forEach(kelas => {
      const opt = document.createElement('option');
      opt.value = kelas.kelas_name;
      opt.textContent = kelas.kelas_name;
      select.appendChild(opt);
    });

    if (currentValue) {
      select.value = currentValue;
    }
  },

  /**
   * Update dropdown kelas di modal siswa
   */
  updateModalKelasDropdown() {
    const select = document.getElementById('siswaKelas');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>';

    AppState.masterKelas.forEach(kelas => {
      const opt = document.createElement('option');
      opt.value = kelas.kelas_name;
      opt.textContent = kelas.kelas_name;
      select.appendChild(opt);
    });

    if (currentValue) {
      select.value = currentValue;
    }
  },

  // ==========================================
  // SURAT DROPDOWN
  // ==========================================

  /**
   * Inisialisasi dropdown surat
   */
  initSuratDropdown() {
    const select = document.getElementById('surat');
    if (!select) return;

    select.innerHTML = '<option value="">-- Pilih Surat --</option>';

    if (AppState.dataSurat.length > 0) {
      AppState.dataSurat.forEach(surat => {
        const opt = document.createElement('option');
        opt.value = surat.value;
        opt.textContent = surat.label;
        select.appendChild(opt);
      });
    }

    // Dropdown Surat Akhir (opsional — lintas surat)
    const selectAkhir = document.getElementById('suratAkhir');
    if (selectAkhir) {
      selectAkhir.innerHTML = '<option value="">-- Sama dengan Surat di atas --</option>';
      if (AppState.dataSurat.length > 0) {
        AppState.dataSurat.forEach(surat => {
          const opt = document.createElement('option');
          opt.value = surat.value;
          opt.textContent = surat.label;
          selectAkhir.appendChild(opt);
        });
      }
    }
  },

  /**
   * Generate option surat (untuk target detail)
   * @param {string} selectedValue - Value yang selected
   * @returns {string} - HTML string
   */
  generateSuratOptions(selectedValue = '') {
    if (!AppState.dataSurat || AppState.dataSurat.length === 0) {
      return '<option value="">-- Data surat belum dimuat --</option>';
    }

    return AppState.dataSurat.map(surat => 
      `<option value="${surat.value}" ${surat.value === selectedValue ? 'selected' : ''}>${surat.label}</option>`
    ).join('');
  },

  // ==========================================
  // KETERANGAN DROPDOWN
  // ==========================================

  /**
   * Inisialisasi dropdown keterangan
   */
  initKeteranganDropdown() {
    const select = document.getElementById('keterangan');
    if (!select) return;

    select.innerHTML = '<option value="">-- Pilih Keterangan --</option>';

    AppState.dataKeterangan.forEach(ket => {
      const opt = document.createElement('option');
      opt.value = ket.value;
      opt.textContent = ket.label;
      select.appendChild(opt);
    });
  },

  // ==========================================
  // BULAN DROPDOWN
  // ==========================================

  /**
   * Inisialisasi dropdown bulan
   */
  initBulanDropdown() {
    const select = document.getElementById('filterBulan');
    if (!select) return;

    select.innerHTML = '<option value="">Semua Bulan</option>';

    AppState.dataBulan.forEach(bulan => {
      const opt = document.createElement('option');
      opt.value = bulan.value;
      opt.textContent = bulan.label;
      select.appendChild(opt);
    });
  },

  // ==========================================
  // TAHUN DROPDOWN
  // ==========================================

  /**
   * Inisialisasi dropdown tahun
   */
  initTahunDropdown() {
    const select = document.getElementById('filterTahun');
    if (!select) return;

    const tahunSekarang = new Date().getFullYear();
    select.innerHTML = '<option value="">Semua Tahun</option>';

    for (let i = -1; i <= 2; i++) {
      const tahun = tahunSekarang + i;
      const opt = document.createElement('option');
      opt.value = tahun.toString();
      opt.textContent = tahun.toString();
      if (i === 0) opt.selected = true;
      select.appendChild(opt);
    }
  },

  // ==========================================
  // SISWA DROPDOWN (DINAMIS)
  // ==========================================

  /**
   * Update dropdown siswa berdasarkan kelas yang dipilih
   * @param {string} kelas - Nama kelas
   */
  updateSiswaDropdown(kelas) {
    const select = document.getElementById('siswa');
    if (!select) return;

    select.innerHTML = '<option value="">-- Pilih Siswa --</option>';

    if (!kelas) return;

    // Cari data siswa untuk kelas tersebut
    const siswaList = AppState.dataSiswa[kelas] || [];
    
    // Jika dataSiswa kosong, coba dari masterSiswa
    if (siswaList.length === 0 && AppState.masterSiswa.length > 0) {
      AppState.masterSiswa
        .filter(s => s.kelas_name === kelas)
        .forEach(siswa => {
          const opt = document.createElement('option');
          opt.value = siswa.nama;
          opt.textContent = siswa.nama;
          opt.setAttribute('data-whatsapp', siswa.whatsapp || '');
          select.appendChild(opt);
        });
    } else {
      siswaList.forEach(siswa => {
        const opt = document.createElement('option');
        opt.value = siswa.nama;
        opt.textContent = siswa.nama;
        opt.setAttribute('data-whatsapp', siswa.whatsapp || '');
        select.appendChild(opt);
      });
    }
  }
};

console.log('✅ DropdownManager module loaded');