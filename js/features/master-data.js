// ====================================================
// js/features/master-data.js - MASTER DATA MANAGEMENT
// ====================================================

const MasterData = {
  
  /**
   * Load semua data master
   */
  async loadAll() {
    try {
      const { siswa, kelas, guru } = await DatabaseService.loadAllMasterData();
      AppState.masterSiswa = siswa;
      AppState.masterKelas = kelas;
      AppState.masterGuru = guru;
      
      // Sync ke dataSiswa
      AppState.syncMasterToDataSiswa();
      
      // Update semua dropdown
      DropdownManager.updateAll();
      
      // Tampilkan data di tabel yang aktif
      this.refreshCurrentTab();
      
      console.log('✅ All master data loaded');
    } catch (error) {
      console.error('❌ Failed to load master data:', error);
    }
  },

  /**
   * Refresh tab master yang sedang aktif
   */
  refreshCurrentTab() {
    switch (AppState.currentMasterTab) {
      case 'siswa': this.refreshSiswa(); break;
      case 'kelas': this.refreshKelas(); break;
      case 'guru': this.refreshGuru(); break;
    }
  },

  // ==========================================
  // REFRESH DATA
  // ==========================================

  async refreshSiswa() {
    try {
      const filterKelas = document.getElementById('filterKelasSiswa')?.value || '';
      AppState.masterSiswa = await DatabaseService.loadMasterSiswa(filterKelas);
      AppState.syncMasterToDataSiswa();
      this.displaySiswa();
    } catch (error) {
      console.error('❌ Failed to refresh siswa:', error);
    }
  },

  async refreshKelas() {
    try {
      AppState.masterKelas = await DatabaseService.loadMasterKelas();
      DropdownManager.updateAll();
      this.displayKelas();
    } catch (error) {
      console.error('❌ Failed to refresh kelas:', error);
    }
  },

  async refreshGuru() {
    try {
      AppState.masterGuru = await DatabaseService.loadMasterGuru();
      DropdownManager.initGuruDropdown();
      this.displayGuru();
    } catch (error) {
      console.error('❌ Failed to refresh guru:', error);
    }
  },

  // ==========================================
  // DISPLAY
  // ==========================================

  displaySiswa() {
    const tbody = document.getElementById('masterSiswaTableBody');
    if (!tbody) return;

    if (AppState.masterSiswa.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="no-data">Belum ada data siswa</td></tr>';
      return;
    }

    tbody.innerHTML = AppState.masterSiswa.map((s, i) => `
      <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
        <td>${i + 1}</td>
        <td><strong>${s.nama}</strong></td>
        <td><span class="kelas-badge">${s.kelas_name}</span></td>
        <td>${s.whatsapp || '-'}</td>
        <td>
          <button class="btn-edit" onclick="MasterData.openEditSiswa('${s.id}')">✏️</button>
          <button class="btn-delete" onclick="MasterData.deleteSiswa('${s.id}', '${s.nama}')">🗑️</button>
        </td>
      </tr>
    `).join('');
  },

  displayKelas() {
    const tbody = document.getElementById('masterKelasTableBody');
    if (!tbody) return;

    if (AppState.masterKelas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="no-data">Belum ada data kelas</td></tr>';
      return;
    }

    // Hitung siswa per kelas
    const countMap = {};
    AppState.masterSiswa.forEach(s => {
      countMap[s.kelas_name] = (countMap[s.kelas_name] || 0) + 1;
    });

    tbody.innerHTML = AppState.masterKelas.map((k, i) => `
      <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
        <td>${i + 1}</td>
        <td><strong>${k.kelas_name}</strong></td>
        <td>${countMap[k.kelas_name] || 0} siswa</td>
        <td>
          <button class="btn-edit" onclick="MasterData.openEditKelas('${k.id}')">✏️</button>
          <button class="btn-delete" onclick="MasterData.deleteKelas('${k.id}', '${k.kelas_name}', ${countMap[k.kelas_name] || 0})">🗑️</button>
        </td>
      </tr>
    `).join('');
  },

  displayGuru() {
    const tbody = document.getElementById('masterGuruTableBody');
    if (!tbody) return;

    if (AppState.masterGuru.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="no-data">Belum ada data guru</td></tr>';
      return;
    }

    tbody.innerHTML = AppState.masterGuru.map((g, i) => `
      <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
        <td>${i + 1}</td>
        <td><strong>${g.nama}</strong></td>
        <td class="token-cell">${(g.token_fonnte || '').substring(0, 15)}...</td>
        <td>
          <button class="btn-edit" onclick="MasterData.openEditGuru('${g.id}')">✏️</button>
          <button class="btn-delete" onclick="MasterData.deleteGuru('${g.id}', '${g.nama}')">🗑️</button>
        </td>
      </tr>
    `).join('');
  },

  // ==========================================
  // MODAL OPEN
  // ==========================================

  openAddSiswa() {
    document.getElementById('siswaId').value = '';
    Modal.setTitle('modalSiswa', '➕ Tambah Siswa');
    DropdownManager.updateModalKelasDropdown();
    Modal.open('modalSiswa');
  },

openEditSiswa(id) {
    // Cari siswa dengan perbandingan loose (string/number)
    const s = AppState.masterSiswa.find(x => String(x.id) === String(id));
    if (!s) {
      console.error('❌ Siswa tidak ditemukan:', id);
      return NotificationService.error('Data siswa tidak ditemukan!');
    }
    
    console.log('✏️ Edit siswa:', s.nama, 'ID:', s.id);
    
    // Reset form dulu
    document.getElementById('formSiswa').reset();
    
    // Isi data
    document.getElementById('siswaId').value = s.id;
    document.getElementById('siswaName').value = s.nama;
    document.getElementById('siswaWhatsapp').value = s.whatsapp || '';
    
    // Update judul modal
    Modal.setTitle('modalSiswa', '✏️ Edit Siswa');
    
    // Update dropdown kelas
    DropdownManager.updateModalKelasDropdown();
    
    // Set nilai kelas setelah dropdown terisi (pakai setTimeout)
    setTimeout(() => {
      const kelasSelect = document.getElementById('siswaKelas');
      if (kelasSelect) {
        kelasSelect.value = s.kelas_name;
        console.log('✅ Kelas diset:', s.kelas_name);
      }
    }, 200);
    
    // Buka modal
    Modal.open('modalSiswa');
  },

  openAddKelas() {
    document.getElementById('kelasId').value = '';
    Modal.setTitle('modalKelas', '➕ Tambah Kelas');
    Modal.open('modalKelas');
  },

openEditKelas(id) {
    // Cari kelas dengan perbandingan loose
    const k = AppState.masterKelas.find(x => String(x.id) === String(id));
    if (!k) {
      console.error('❌ Kelas tidak ditemukan:', id);
      return NotificationService.error('Data kelas tidak ditemukan!');
    }
    
    console.log('✏️ Edit kelas:', k.kelas_name, 'ID:', k.id);
    
    // Reset form
    document.getElementById('formKelas').reset();
    
    // Isi data
    document.getElementById('kelasId').value = k.id;
    document.getElementById('kelasName').value = k.kelas_name;
    
    // Update judul
    Modal.setTitle('modalKelas', '✏️ Edit Kelas');
    
    // Buka modal
    Modal.open('modalKelas');
  },

  openAddGuru() {
    document.getElementById('guruId').value = '';
    Modal.setTitle('modalGuru', '➕ Tambah Guru');
    Modal.open('modalGuru');
  },

openEditGuru(id) {
    // Cari guru dengan perbandingan loose
    const g = AppState.masterGuru.find(x => String(x.id) === String(id));
    if (!g) {
      console.error('❌ Guru tidak ditemukan:', id);
      return NotificationService.error('Data guru tidak ditemukan!');
    }
    
    console.log('✏️ Edit guru:', g.nama, 'ID:', g.id);
    
    // Reset form
    document.getElementById('formGuru').reset();
    
    // Isi data
    document.getElementById('guruId').value = g.id;
    document.getElementById('guruName').value = g.nama;
    document.getElementById('guruToken').value = g.token_fonnte || '';
    
    // Update judul
    Modal.setTitle('modalGuru', '✏️ Edit Guru');
    
    // Buka modal
    Modal.open('modalGuru');
  },

  // ==========================================
  // SAVE
  // ==========================================

async saveSiswa(event) {
    event.preventDefault();
    
    const id = document.getElementById('siswaId').value;
    const nama = document.getElementById('siswaName').value.trim();
    const kelas = document.getElementById('siswaKelas').value;
    const wa = document.getElementById('siswaWhatsapp').value.trim();

    // Validasi
    if (!nama) {
      NotificationService.warning('Nama siswa harus diisi!');
      document.getElementById('siswaName').focus();
      return;
    }
    
    if (!kelas) {
      NotificationService.warning('Kelas harus dipilih!');
      document.getElementById('siswaKelas').focus();
      return;
    }
    
    if (!wa) {
      NotificationService.warning('Nomor WhatsApp harus diisi!');
      document.getElementById('siswaWhatsapp').focus();
      return;
    }

    // Validasi format WhatsApp (angka saja)
    if (!/^\d+$/.test(wa.replace(/\D/g, ''))) {
      NotificationService.warning('Nomor WhatsApp hanya boleh berisi angka!');
      document.getElementById('siswaWhatsapp').focus();
      return;
    }

    // Cek duplikat nama untuk siswa baru
    if (!id || id === '') {
      const duplicate = AppState.masterSiswa.some(s => 
        s.nama.toLowerCase() === nama.toLowerCase() && 
        s.kelas_name === kelas
      );
      if (duplicate) {
        NotificationService.warning(`Siswa "${nama}" sudah ada di kelas ${kelas}!`);
        return;
      }
    }

    // Disable tombol saat proses
    const submitBtn = document.querySelector('#modalSiswa .btn-submit');
    const originalText = submitBtn?.innerHTML || '💾 Simpan';
    if (submitBtn) {
      submitBtn.innerHTML = '⏳ Menyimpan...';
      submitBtn.disabled = true;
    }

    try {
      const data = { 
        nama, 
        kelas_name: kelas, 
        whatsapp: wa, 
        is_active: true, 
        updated_at: new Date().toISOString() 
      };
      
      if (id && id !== '') {
        // EDIT SISWA
        console.log('✏️ Updating siswa:', id, data);
        await DatabaseService.updateMasterSiswa(id, data);
        NotificationService.success('✅ Data siswa berhasil diupdate!');
      } else {
        // TAMBAH SISWA BARU
        console.log('➕ Adding new siswa:', data);
        data.created_at = new Date().toISOString();
        data.sort_order = AppState.masterSiswa.filter(s => s.kelas_name === kelas).length + 1;
        await DatabaseService.saveMasterSiswa(data);
        NotificationService.success('✅ Data siswa berhasil ditambahkan!');
      }

      // Tutup modal
      Modal.close('modalSiswa');
      
      // Refresh data
      await this.refreshSiswa();
      
      // Update dropdown
      DropdownManager.updateAll();

    } catch (error) {
      console.error('❌ Error saving siswa:', error);
      
      // Tampilkan pesan error yang lebih informatif
      let errorMsg = 'Gagal menyimpan data siswa';
      if (error.message) {
        if (error.message.includes('duplicate')) {
          errorMsg = 'Nama siswa sudah ada di kelas tersebut!';
        } else if (error.message.includes('network')) {
          errorMsg = 'Gagal terhubung ke server. Periksa koneksi internet.';
        } else {
          errorMsg = error.message;
        }
      }
      
      NotificationService.error('❌ ' + errorMsg);
      
      // Kembalikan tombol
      if (submitBtn) {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    }
  },

async saveKelas(event) {
    event.preventDefault();
    
    const id = document.getElementById('kelasId').value;
    const nama = document.getElementById('kelasName').value.trim().toUpperCase();

    // Validasi
    if (!nama) {
      NotificationService.warning('Nama kelas harus diisi!');
      document.getElementById('kelasName').focus();
      return;
    }

    // Validasi format (hanya huruf dan angka)
    if (!/^[A-Z0-9\s\-]+$/.test(nama)) {
      NotificationService.warning('Nama kelas hanya boleh berisi huruf, angka, spasi, dan strip!');
      document.getElementById('kelasName').focus();
      return;
    }

    // Cek duplikat untuk kelas baru
    if (!id || id === '') {
      const duplicate = AppState.masterKelas.some(k => 
        k.kelas_name.toUpperCase() === nama
      );
      if (duplicate) {
        NotificationService.warning(`Kelas "${nama}" sudah ada!`);
        return;
      }
    }

    // Disable tombol saat proses
    const submitBtn = document.querySelector('#modalKelas .btn-submit');
    const originalText = submitBtn?.innerHTML || '💾 Simpan';
    if (submitBtn) {
      submitBtn.innerHTML = '⏳ Menyimpan...';
      submitBtn.disabled = true;
    }

    try {
      const data = { 
        kelas_name: nama, 
        label: nama, 
        updated_at: new Date().toISOString() 
      };
      
      if (id && id !== '') {
        // EDIT KELAS
        console.log('✏️ Updating kelas:', id, data);
        await DatabaseService.updateMasterKelas(id, data);
        NotificationService.success('✅ Data kelas berhasil diupdate!');
      } else {
        // TAMBAH KELAS BARU
        console.log('➕ Adding new kelas:', data);
        data.created_at = new Date().toISOString();
        data.sort_order = AppState.masterKelas.length + 1;
        await DatabaseService.saveMasterKelas(data);
        NotificationService.success('✅ Data kelas berhasil ditambahkan!');
      }

      // Tutup modal
      Modal.close('modalKelas');
      
      // Refresh data
      await this.refreshKelas();
      
      // Update dropdown
      DropdownManager.updateAll();

    } catch (error) {
      console.error('❌ Error saving kelas:', error);
      
      let errorMsg = 'Gagal menyimpan data kelas';
      if (error.message) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          errorMsg = 'Nama kelas sudah ada!';
        } else if (error.message.includes('network')) {
          errorMsg = 'Gagal terhubung ke server. Periksa koneksi internet.';
        } else {
          errorMsg = error.message;
        }
      }
      
      NotificationService.error('❌ ' + errorMsg);
      
      // Kembalikan tombol
      if (submitBtn) {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    }
  },

async saveGuru(event) {
    event.preventDefault();
    
    const id = document.getElementById('guruId').value;
    const nama = document.getElementById('guruName').value.trim();
    const token = document.getElementById('guruToken').value.trim();

    // Validasi
    if (!nama) {
      NotificationService.warning('Nama guru harus diisi!');
      document.getElementById('guruName').focus();
      return;
    }
    
    if (!token) {
      NotificationService.warning('Token Fonnte harus diisi!');
      document.getElementById('guruToken').focus();
      return;
    }

    // Validasi panjang token (Fonnte token biasanya cukup panjang)
    if (token.length < 10) {
      NotificationService.warning('Token Fonnte tampaknya tidak valid (terlalu pendek)!');
      document.getElementById('guruToken').focus();
      return;
    }

    // Cek duplikat untuk guru baru
    if (!id || id === '') {
      const duplicate = AppState.masterGuru.some(g => 
        g.nama.toLowerCase() === nama.toLowerCase()
      );
      if (duplicate) {
        NotificationService.warning(`Guru "${nama}" sudah ada!`);
        return;
      }
    }

    // Disable tombol saat proses
    const submitBtn = document.querySelector('#modalGuru .btn-submit');
    const originalText = submitBtn?.innerHTML || '💾 Simpan';
    if (submitBtn) {
      submitBtn.innerHTML = '⏳ Menyimpan...';
      submitBtn.disabled = true;
    }

    try {
      const data = { 
        nama, 
        token_fonnte: token, 
        is_active: true, 
        updated_at: new Date().toISOString() 
      };
      
      if (id && id !== '') {
        // EDIT GURU
        console.log('✏️ Updating guru:', id, data);
        await DatabaseService.updateMasterGuru(id, data);
        NotificationService.success('✅ Data guru berhasil diupdate!');
      } else {
        // TAMBAH GURU BARU
        console.log('➕ Adding new guru:', data);
        data.created_at = new Date().toISOString();
        data.sort_order = AppState.masterGuru.length + 1;
        await DatabaseService.saveMasterGuru(data);
        NotificationService.success('✅ Data guru berhasil ditambahkan!');
      }

      // Tutup modal
      Modal.close('modalGuru');
      
      // Refresh data
      await this.refreshGuru();
      
      // Update dropdown guru di form input
      DropdownManager.initGuruDropdown();

    } catch (error) {
      console.error('❌ Error saving guru:', error);
      
      let errorMsg = 'Gagal menyimpan data guru';
      if (error.message) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          errorMsg = 'Nama guru sudah ada!';
        } else if (error.message.includes('network')) {
          errorMsg = 'Gagal terhubung ke server. Periksa koneksi internet.';
        } else {
          errorMsg = error.message;
        }
      }
      
      NotificationService.error('❌ ' + errorMsg);
      
      // Kembalikan tombol
      if (submitBtn) {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    }
  },

  // ==========================================
  // DELETE
  // ==========================================

  async deleteSiswa(id, nama) {
    if (!confirm(`Hapus siswa "${nama}"?\nData akan dihapus permanen!`)) return;
    try {
      await DatabaseService.deleteMasterSiswa(id);
      NotificationService.success('Siswa dihapus!');
      await this.refreshSiswa();
      DropdownManager.updateAll();
    } catch (error) {
      NotificationService.error('Gagal menghapus: ' + error.message);
    }
  },

  async deleteKelas(id, nama, count) {
    if (count > 0) return NotificationService.error(`Kelas ${nama} masih memiliki ${count} siswa!`);
    if (!confirm(`Hapus kelas "${nama}"?\nData akan dihapus permanen!`)) return;
    try {
      await DatabaseService.deleteMasterKelas(id);
      NotificationService.success('Kelas dihapus!');
      await this.refreshKelas();
    } catch (error) {
      NotificationService.error('Gagal menghapus: ' + error.message);
    }
  },

  async deleteGuru(id, nama) {
    if (!confirm(`Hapus guru "${nama}"?\nData akan dihapus permanen!`)) return;
    try {
      await DatabaseService.deleteMasterGuru(id);
      NotificationService.success('Guru dihapus!');
      await this.refreshGuru();
    } catch (error) {
      NotificationService.error('Gagal menghapus: ' + error.message);
    }
  }
};

console.log('✅ MasterData module loaded');