// ====================================================
// js/ui/edit-inline.js - EDIT INLINE DI TABEL OUTPUT
// ====================================================

const EditInline = {
  
  /**
   * Toggle mode edit untuk baris tertentu. Di layar sempit (≤640px) buka
   * modal form vertikal (openMobileEdit) — bukan edit inline tabel desktop,
   * yang di layar HP dulu memaksa tabel 13-kolom tampil sempit & sulit
   * dipakai. Di desktop tetap edit inline tabel seperti biasa.
   * @param {number} index - Index data di filteredData
   */
  toggle(index) {
    if (this._isMobile()) {
      this.openMobileEdit(index);
      return;
    }

    // Jika sedang edit baris yang sama, simpan
    if (AppState.isEditMode && AppState.currentEditingRow === index) {
      this.save(index);
      return;
    }

    // Jika sedang edit baris lain, batalkan dulu
    if (AppState.isEditMode && AppState.currentEditingRow !== null) {
      this.cancel();
    }

    // Masuk mode edit
    this.enter(index);
  },

  /**
   * Layar sempit = pakai modal edit, bukan edit inline tabel. Breakpoint
   * sama persis dengan @media(max-width:640px) di style.css (tempat kartu
   * mobile menggantikan tabel).
   * @returns {boolean}
   */
  _isMobile() {
    return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(max-width:640px)').matches;
  },

  /**
   * Masuk mode edit
   * @param {number} index - Index data
   */
  enter(index) {
    const row = document.querySelector(`tr[data-original-index="${index}"]`);
    const editBtn = row?.querySelector('.btn-edit');

    if (!row || !editBtn) {
      console.error('❌ Row atau edit button tidak ditemukan');
      return;
    }

    // Set state
    AppState.isEditMode = true;
    AppState.currentEditingRow = index;

    // Update UI button
    editBtn.innerHTML = '💾 Simpan';
    editBtn.classList.add('editing');

    // Setup field yang bisa diedit
    this.setupEditableFields(row, index);

    // Tambahkan event listener keyboard
    this._keyHandler = (e) => this._handleKeyboard(e, index);
    document.addEventListener('keydown', this._keyHandler);
  },

  /**
   * Batalkan mode edit
   */
  cancel() {
    AppState.isEditMode = false;
    AppState.currentEditingRow = null;

    // Hapus event listener keyboard
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }

    // Refresh tabel untuk mengembalikan tampilan
    if (typeof OutputTable !== 'undefined' && OutputTable.update) {
      OutputTable.update();
    }
  },

  /**
   * Simpan hasil edit
   * @param {number} index - Index data
   */
  async save(index) {
    const row = document.querySelector(`tr[data-original-index="${index}"]`);
    if (!row) return;

    // Ambil data asli dari tabel (bukan dari AppState)
    const filteredData = this._getFilteredData();
    const originalData = filteredData[index];
    
    if (!originalData) {
      NotificationService.error('Data tidak ditemukan!');
      return;
    }

    // Kumpulkan data edit
    const editData = this.collectEditData(row, originalData);
    if (!editData) return;

    // Validasi
    if (!this.validateEditData(editData, originalData)) return;

    // Disable tombol saat menyimpan
    const editBtn = row.querySelector('.btn-edit');
    const deleteBtn = row.querySelector('.btn-delete');
    if (editBtn) {
      editBtn.innerHTML = '⏳';
      editBtn.disabled = true;
    }
    if (deleteBtn) deleteBtn.disabled = true;

    try {
      // Siapkan data untuk update
      const updatedData = this.prepareUpdateData(originalData, editData);
      const record = this._buildDbRecord(updatedData);

      await DatabaseService.updateTahfidzRecord(originalData.id, record);

      NotificationService.success('Data berhasil diupdate!');
      
      // Reset state
      AppState.isEditMode = false;
      AppState.currentEditingRow = null;

      // Hapus event listener
      if (this._keyHandler) {
        document.removeEventListener('keydown', this._keyHandler);
        this._keyHandler = null;
      }

      // Refresh tabel
      if (typeof OutputTable !== 'undefined' && OutputTable.update) {
        OutputTable.update();
      }

    } catch (error) {
      console.error('❌ Failed to save edit:', error);
      NotificationService.error('Gagal mengupdate data: ' + error.message);

      // Kembalikan tombol
      if (editBtn) {
        editBtn.innerHTML = '💾 Simpan';
        editBtn.disabled = false;
      }
      if (deleteBtn) deleteBtn.disabled = false;
    }
  },

  /**
   * Setup field yang bisa diedit di baris tabel — dicari lewat class
   * semantik yang ditulis createRow (.cell-tanggal, .cell-awal-surat,
   * dst), bukan posisi/index kolom, supaya tidak rapuh saat struktur
   * tabel berubah (kolom Jenis/Total dirender rowspan, jumlah <td>
   * berbeda-beda antar baris tergantung apakah baris itu baris pertama
   * siswa/kelompok jenis).
   */
  setupEditableFields(row, index) {
    const filteredData = this._getFilteredData();
    const originalData = filteredData[index];
    if (!originalData) return;

    const isTidakMenghafal = originalData.menghafal !== 'ya';

    const tanggalCell = row.querySelector('.cell-tanggal');
    const absentCell = row.querySelector('.cell-absent');
    const awalSuratCell = row.querySelector('.cell-awal-surat');
    const awalAyatCell = row.querySelector('.cell-awal-ayat');
    const akhirSuratCell = row.querySelector('.cell-akhir-surat');
    const akhirAyatCell = row.querySelector('.cell-akhir-ayat');
    const nilaiCell = row.querySelector('.cell-nilai');
    const barisCell = row.querySelector('.cell-baris');

    if (tanggalCell) {
      tanggalCell.innerHTML = `<input type="date" value="${originalData.tanggal}" class="edit-input">`;
    }

    if (isTidakMenghafal) {
      if (absentCell) {
        if (originalData.menghafal === 'lainnya') {
          absentCell.innerHTML = `<input type="text" value="${originalData.alasan || ''}" class="edit-input alasan-edit" placeholder="Alasan">`;
        } else {
          const label = AppConfig.MENGHAFAL_LABELS[originalData.menghafal] || 'Tidak Menghafal';
          absentCell.innerHTML = `<span class="not-memorizing">— (${label})</span>`;
        }
      }
      if (nilaiCell) nilaiCell.innerHTML = '<span class="not-memorizing">—</span>';
      if (barisCell) barisCell.innerHTML = '<span>0</span>';
      return;
    }

    // Surat Awal & Akhir — dua dropdown terpisah (digabung "Awal → Akhir"
    // saat beda surat, lihat prepareUpdateData), dari satu field `surat`
    // yang tersimpan sebagai "A → B" kalau lintas surat.
    const suratParts = (originalData.surat || '').split('→').map(s => s.trim()).filter(Boolean);
    const suratAwalVal = suratParts[0] || '';
    const suratAkhirVal = suratParts.length > 1 ? suratParts[1] : suratAwalVal;

    if (awalSuratCell) awalSuratCell.innerHTML = this._buildSuratSelect('surat-edit-awal', suratAwalVal);
    if (akhirSuratCell) akhirSuratCell.innerHTML = this._buildSuratSelect('surat-edit-akhir', suratAkhirVal);
    if (awalAyatCell) awalAyatCell.innerHTML = `<input type="number" value="${originalData.ayatDari ?? ''}" min="0" step="1" class="edit-input ayat-edit-awal">`;
    if (akhirAyatCell) akhirAyatCell.innerHTML = `<input type="number" value="${originalData.ayatSampai ?? ''}" min="0" step="1" class="edit-input ayat-edit-akhir">`;

    if (nilaiCell) nilaiCell.innerHTML = this._buildKeteranganSelect('keterangan-edit', originalData.keterangan);

    if (barisCell) {
      barisCell.innerHTML = `<input type="number" value="${originalData.baris || 0}" min="0" step="0.5" class="edit-input baris-edit">`;
    }
  },

  /**
   * Bangun HTML <select> daftar surat (dipakai bareng oleh dropdown Awal
   * & Akhir supaya opsinya identik, dan oleh edit tabel maupun modal edit
   * mobile).
   * @param {string} className - class tambahan (surat-edit-awal/akhir)
   * @param {string} selectedValue
   * @returns {string}
   */
  _buildSuratSelect(className, selectedValue) {
    let html = `<select class="edit-input edit-select ${className}"><option value="">-- Pilih Surat --</option>`;
    if (selectedValue && !AppState.dataSurat.some(s => s.value === selectedValue)) {
      html += `<option value="${selectedValue}" selected>${selectedValue}</option>`;
    }
    AppState.dataSurat.forEach(surat => {
      const selected = surat.value === selectedValue ? 'selected' : '';
      html += `<option value="${surat.value}" ${selected}>${surat.label}</option>`;
    });
    html += '</select>';
    return html;
  },

  /**
   * Bangun HTML <select> daftar Keterangan Nilai (dipakai bareng oleh edit
   * tabel desktop dan modal edit mobile).
   * @param {string} className
   * @param {string} selectedValue
   * @returns {string}
   */
  _buildKeteranganSelect(className, selectedValue) {
    let html = `<select class="edit-input edit-select ${className}"><option value="">-- Pilih --</option>`;
    AppState.dataKeterangan.forEach(ket => {
      const selected = ket.value === selectedValue ? 'selected' : '';
      html += `<option value="${ket.value}" ${selected}>${ket.label}</option>`;
    });
    html += '</select>';
    return html;
  },

  /**
   * Bentuk payload update Supabase dari data yang sudah disiapkan
   * prepareUpdateData — dipakai bareng oleh save() (desktop) dan
   * saveMobileEdit() (modal).
   * @param {object} updatedData
   * @returns {object}
   */
  _buildDbRecord(updatedData) {
    return {
      guru: updatedData.guru,
      token_guru: updatedData.tokenGuru,
      nama: updatedData.nama,
      kelas: updatedData.kelas,
      whatsapp: updatedData.whatsapp,
      tanggal: updatedData.tanggal,
      jenis: updatedData.jenis,
      baris: updatedData.baris,
      menghafal: updatedData.menghafal,
      alasan: updatedData.alasan,
      surat: updatedData.surat,
      ayat_dari: updatedData.ayatDari,
      ayat_sampai: updatedData.ayatSampai,
      keterangan: updatedData.keterangan,
      catatan: updatedData.catatan
    };
  },

  /**
   * Buka modal edit vertikal (layar sempit) — pengganti edit inline tabel
   * desktop. Field yang bisa diedit dibangun pakai class SAMA PERSIS
   * dengan yang dipakai setupEditableFields (.surat-edit-awal, dst) —
   * jadi collectEditData/validateEditData/prepareUpdateData bisa dipakai
   * ulang tanpa perubahan, cukup dikasih #editModalBody sebagai container.
   * @param {number} index
   */
  openMobileEdit(index) {
    const filteredData = this._getFilteredData();
    const originalData = filteredData[index];
    if (!originalData) {
      NotificationService.error('Data tidak ditemukan!');
      return;
    }

    this._mobileEditIndex = index;
    this._mobileEditData = originalData;

    const jenisLabel = (typeof OutputTable !== 'undefined' && OutputTable.jenisName)
      ? OutputTable.jenisName(originalData) : (originalData.jenis || 'Data');
    const tanggalDisplay = (typeof OutputTable !== 'undefined' && OutputTable.formatTanggal)
      ? OutputTable.formatTanggal(originalData.tanggal) : originalData.tanggal;

    const title = document.getElementById('editModalTitle');
    if (title) title.textContent = `Ubah ${jenisLabel}`;
    const sub = document.getElementById('editModalSub');
    if (sub) sub.textContent = `${originalData.nama} · ${tanggalDisplay}`;

    this._renderMobileEditForm(originalData);

    const saveBtn = document.getElementById('editModalSaveBtn');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Simpan'; }

    Modal.open('editModal');
  },

  /**
   * Isi #editModalBody dengan field form vertikal sesuai status data
   * (absen vs ya) — padanan mobile dari setupEditableFields.
   * @param {object} originalData
   */
  _renderMobileEditForm(originalData) {
    const body = document.getElementById('editModalBody');
    if (!body) return;

    const isTidakMenghafal = originalData.menghafal !== 'ya';
    const tanggalField = `<div class="field"><label>Tanggal</label><input type="date" value="${originalData.tanggal}" class="edit-input"></div>`;

    if (isTidakMenghafal) {
      let html = tanggalField;
      if (originalData.menghafal === 'lainnya') {
        html += `<div class="field"><label>Alasan</label><input type="text" value="${originalData.alasan || ''}" class="edit-input alasan-edit" placeholder="Alasan"></div>`;
      } else {
        const label = AppConfig.MENGHAFAL_LABELS[originalData.menghafal] || 'Tidak Menghafal';
        html += `<div class="field"><label>Status</label><input type="text" value="${label}" disabled></div>`;
      }
      body.innerHTML = html;
      return;
    }

    const suratParts = (originalData.surat || '').split('→').map(s => s.trim()).filter(Boolean);
    const suratAwalVal = suratParts[0] || '';
    const suratAkhirVal = suratParts.length > 1 ? suratParts[1] : suratAwalVal;
    const unitLabel = (originalData.jenis === 'murojaah' || originalData.jenis === 'tilawah') ? 'Halaman' : 'Baris';

    body.innerHTML = `
      ${tanggalField}
      <div class="row2">
        <div class="field"><label>Surat Awal</label>${this._buildSuratSelect('surat-edit-awal', suratAwalVal)}</div>
        <div class="field"><label>Ayat Awal</label><input type="number" value="${originalData.ayatDari ?? ''}" min="0" step="1" class="edit-input ayat-edit-awal"></div>
      </div>
      <div class="row2">
        <div class="field"><label>Surat Akhir</label>${this._buildSuratSelect('surat-edit-akhir', suratAkhirVal)}</div>
        <div class="field"><label>Ayat Akhir</label><input type="number" value="${originalData.ayatSampai ?? ''}" min="0" step="1" class="edit-input ayat-edit-akhir"></div>
      </div>
      <div class="row2">
        <div class="field"><label>Nilai</label>${this._buildKeteranganSelect('keterangan-edit', originalData.keterangan)}</div>
        <div class="field"><label>${unitLabel}</label><input type="number" value="${originalData.baris || 0}" min="0" step="0.5" class="edit-input baris-edit"></div>
      </div>
    `;
  },

  /**
   * Simpan hasil edit dari modal mobile.
   */
  async saveMobileEdit() {
    const index = this._mobileEditIndex;
    const originalData = this._mobileEditData;
    const body = document.getElementById('editModalBody');
    if (!body || !originalData) return;

    const editData = this.collectEditData(body, originalData);
    if (!editData) return;

    if (!this.validateEditData(editData, originalData)) return;

    const saveBtn = document.getElementById('editModalSaveBtn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ Menyimpan...'; }

    try {
      const updatedData = this.prepareUpdateData(originalData, editData);
      const record = this._buildDbRecord(updatedData);

      await DatabaseService.updateTahfidzRecord(originalData.id, record);

      NotificationService.success('Data berhasil diupdate!');
      this._mobileEditIndex = null;
      this._mobileEditData = null;
      Modal.close('editModal');

      if (typeof OutputTable !== 'undefined' && OutputTable.update) {
        OutputTable.update();
      }
    } catch (error) {
      console.error('❌ Failed to save mobile edit:', error);
      NotificationService.error('Gagal mengupdate data: ' + error.message);
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Simpan'; }
    }
  },

  /**
   * Batalkan edit dari modal mobile tanpa menyimpan.
   */
  cancelMobileEdit() {
    Modal.close('editModal');
    this._mobileEditIndex = null;
    this._mobileEditData = null;
  },

  /**
   * Kumpulkan data dari form edit
   */
  collectEditData(row, originalData) {
    const isTidakMenghafal = originalData.menghafal !== 'ya';

    const tanggalInput = row.querySelector('input[type="date"]');
    if (!tanggalInput) {
      NotificationService.error('Input tanggal tidak ditemukan');
      return null;
    }

    if (isTidakMenghafal) {
      const alasanInput = row.querySelector('.alasan-edit');
      const alasan = (originalData.menghafal === 'lainnya' && alasanInput) ? alasanInput.value.trim() : (originalData.alasan || '');
      return {
        tanggal: tanggalInput.value,
        surat: '',
        ayatDari: null,
        ayatSampai: null,
        alasan,
        keterangan: '',
        baris: 0
      };
    }

    const suratAwalSelect = row.querySelector('.surat-edit-awal');
    const suratAkhirSelect = row.querySelector('.surat-edit-akhir');
    const ayatAwalInput = row.querySelector('.ayat-edit-awal');
    const ayatAkhirInput = row.querySelector('.ayat-edit-akhir');
    const keteranganSelect = row.querySelector('.keterangan-edit');
    const barisInput = row.querySelector('.baris-edit');

    const suratAwal = suratAwalSelect ? suratAwalSelect.value : (originalData.surat || '');
    const suratAkhir = suratAkhirSelect ? suratAkhirSelect.value : suratAwal;
    // Gabungkan surat awal & akhir jika lintas surat — sama persis dengan
    // logika di InputForm.handleSubmit supaya format tersimpan konsisten.
    let surat = suratAwal;
    if (suratAkhir && suratAkhir !== suratAwal) {
      surat = suratAwal + ' → ' + suratAkhir;
    }

    const ayatDari = (ayatAwalInput && ayatAwalInput.value !== '') ? parseFloat(ayatAwalInput.value) : null;
    const ayatSampai = (ayatAkhirInput && ayatAkhirInput.value !== '') ? parseFloat(ayatAkhirInput.value) : ayatDari;

    return {
      tanggal: tanggalInput.value,
      surat,
      ayatDari,
      ayatSampai,
      alasan: '',
      keterangan: keteranganSelect ? keteranganSelect.value : (originalData.keterangan || ''),
      baris: barisInput ? (parseFloat(barisInput.value) || 0) : (originalData.baris || 0)
    };
  },

  /**
   * Validasi data edit
   */
  validateEditData(editData, originalData) {
    if (!editData.tanggal) {
      NotificationService.error('Tanggal harus diisi!');
      return false;
    }

    if (originalData.menghafal === 'ya') {
      if (editData.baris <= 0) {
        NotificationService.error('Jumlah baris harus lebih dari 0!');
        return false;
      }
      if (!editData.surat) {
        NotificationService.error('Surat harus dipilih!');
        return false;
      }
    }

    if (originalData.menghafal === 'lainnya' && !editData.alasan) {
      NotificationService.error('Alasan harus diisi!');
      return false;
    }

    return true;
  },

  /**
   * Siapkan data untuk update
   */
  prepareUpdateData(originalData, editData) {
    return {
      ...originalData,
      tanggal: editData.tanggal,
      surat: editData.surat,
      ayatDari: editData.ayatDari,
      ayatSampai: editData.ayatSampai,
      alasan: editData.alasan,
      keterangan: editData.keterangan,
      baris: editData.baris
    };
  },

  /**
   * Handle keyboard shortcut
   */
  _handleKeyboard(e, index) {
    if (e.key === 'Escape') {
      this.cancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.save(index);
    }
  },

  /**
   * Dapatkan filtered data dari OutputTable
   */
  _getFilteredData() {
    // Ini akan diisi oleh OutputTable
    if (typeof OutputTable !== 'undefined' && OutputTable.getFilteredData) {
      return OutputTable.getFilteredData();
    }
    return AppState.tahfidzRecords;
  },

  _keyHandler: null,
  _mobileEditIndex: null,
  _mobileEditData: null
};

console.log('✅ EditInline module loaded');