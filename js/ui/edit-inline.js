// ====================================================
// js/ui/edit-inline.js - EDIT INLINE DI TABEL OUTPUT
// ====================================================

const EditInline = {
  
  /**
   * Toggle mode edit untuk baris tertentu
   * @param {number} index - Index data di filteredData
   */
  toggle(index) {
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

      // Update ke Supabase
      const record = {
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
   * Setup field yang bisa diedit di baris tabel
   */
  setupEditableFields(row, index) {
    const filteredData = this._getFilteredData();
    const originalData = filteredData[index];
    if (!originalData) return;

    const cells = row.querySelectorAll('td');
    const isTidakMenghafal = originalData.menghafal !== 'ya';

    // Tentukan posisi cell berdasarkan jenis baris
    let tanggalCell, suratCell, ayatCell, keteranganCell, barisCell;

    if (cells.length === 6) {
      // Subsequent row
      tanggalCell = cells[0];
      suratCell = cells[1];
      ayatCell = cells[2];
      keteranganCell = cells[3];
      barisCell = cells[4];
    } else if (cells.length === 10) {
      // First row
      tanggalCell = cells[3];
      suratCell = cells[4];
      ayatCell = cells[5];
      keteranganCell = cells[6];
      barisCell = cells[7];
    }

    // Edit Tanggal
    if (tanggalCell) {
      tanggalCell.innerHTML = `<input type="date" value="${originalData.tanggal}" class="edit-input">`;
    }

    // Edit Surat
    if (suratCell) {
      if (isTidakMenghafal) {
        const label = AppConfig.MENGHAFAL_LABELS[originalData.menghafal] || 'Tidak Menghafal';
        suratCell.innerHTML = `<span class="not-memorizing">— (${label})</span>`;
      } else {
        let selectHTML = '<select class="edit-input edit-select surat-edit"><option value="">-- Pilih Surat --</option>';
        // Jika surat tersimpan berupa gabungan lintas surat ("A → B"), tampilkan sebagai opsi agar tidak hilang saat edit
        if (originalData.surat && originalData.surat.indexOf('→') !== -1) {
          selectHTML += `<option value="${originalData.surat}" selected>${originalData.surat}</option>`;
        }
        AppState.dataSurat.forEach(surat => {
          const selected = surat.value === originalData.surat ? 'selected' : '';
          selectHTML += `<option value="${surat.value}" ${selected}>${surat.label}</option>`;
        });
        selectHTML += '</select>';
        suratCell.innerHTML = selectHTML;
      }
    }

    // Edit Ayat / Alasan
    if (ayatCell) {
      if (isTidakMenghafal) {
        if (originalData.menghafal === 'lainnya') {
          ayatCell.innerHTML = `<input type="text" value="${originalData.alasan || ''}" class="edit-input alasan-edit" placeholder="Alasan">`;
        } else {
          const label = AppConfig.MENGHAFAL_LABELS[originalData.menghafal] || '—';
          ayatCell.innerHTML = `<span class="not-memorizing">${label}</span>`;
        }
      } else {
        let value = '';
        if (originalData.ayatDari && originalData.ayatSampai) {
          value = `${originalData.ayatDari} – ${originalData.ayatSampai}`;
        } else if (originalData.ayatDari) {
          value = originalData.ayatDari.toString();
        }
        ayatCell.innerHTML = `<input type="text" value="${value}" class="edit-input ayat-edit" placeholder="Contoh: 1 – 5">`;
      }
    }

    // Edit Keterangan
    if (keteranganCell) {
      if (isTidakMenghafal) {
        keteranganCell.innerHTML = '<span class="not-memorizing">—</span>';
      } else {
        let selectHTML = '<select class="edit-input edit-select keterangan-edit"><option value="">-- Pilih --</option>';
        AppState.dataKeterangan.forEach(ket => {
          const selected = ket.value === originalData.keterangan ? 'selected' : '';
          selectHTML += `<option value="${ket.value}" ${selected}>${ket.label}</option>`;
        });
        selectHTML += '</select>';
        keteranganCell.innerHTML = selectHTML;
      }
    }

    // Edit Baris
    if (barisCell) {
      if (isTidakMenghafal) {
        barisCell.innerHTML = '<span>0</span>';
      } else {
        barisCell.innerHTML = `<input type="number" value="${originalData.baris || 0}" min="0" step="0.5" class="edit-input baris-edit">`;
      }
    }
  },

  /**
   * Kumpulkan data dari form edit
   */
  collectEditData(row, originalData) {
    const isTidakMenghafal = originalData.menghafal !== 'ya';

    const tanggalInput = row.querySelector('input[type="date"]');
    const suratSelect = row.querySelector('.surat-edit');
    const ayatInput = row.querySelector('.ayat-edit');
    const alasanInput = row.querySelector('.alasan-edit');
    const keteranganSelect = row.querySelector('.keterangan-edit');
    const barisInput = row.querySelector('.baris-edit');

    if (!tanggalInput) {
      NotificationService.error('Input tanggal tidak ditemukan');
      return null;
    }

    let surat = originalData.surat || '';
    let ayatDari = originalData.ayatDari;
    let ayatSampai = originalData.ayatSampai;
    let alasan = originalData.alasan || '';
    let keterangan = originalData.keterangan || '';
    let baris = originalData.baris || 0;

    if (isTidakMenghafal) {
      alasan = (originalData.menghafal === 'lainnya' && alasanInput) ? alasanInput.value.trim() : '';
      surat = '';
      ayatDari = null;
      ayatSampai = null;
      keterangan = '';
      baris = 0;
    } else {
      surat = suratSelect ? suratSelect.value : surat;
      
      if (ayatInput) {
        const val = ayatInput.value.trim();
        if (val.includes('–') || val.includes('-')) {
          const sep = val.includes('–') ? '–' : '-';
          const parts = val.split(sep);
          ayatDari = parseFloat(parts[0].trim()) || null;
          ayatSampai = parts[1] ? parseFloat(parts[1].trim()) || null : ayatDari;
        } else if (val) {
          ayatDari = parseFloat(val) || null;
          ayatSampai = ayatDari;
        } else {
          ayatDari = null;
          ayatSampai = null;
        }
      }

      keterangan = keteranganSelect ? keteranganSelect.value : keterangan;
      baris = barisInput ? parseFloat(barisInput.value) || 0 : baris;
      alasan = '';
    }

    return {
      tanggal: tanggalInput.value,
      surat,
      ayatDari,
      ayatSampai,
      alasan,
      keterangan,
      baris
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

  _keyHandler: null
};

console.log('✅ EditInline module loaded');