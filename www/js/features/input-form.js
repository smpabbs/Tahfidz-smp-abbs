// ====================================================
// js/features/input-form.js - FORM INPUT HANDLER
// ====================================================

const InputForm = {
  
  /**
   * Inisialisasi form
   */
  init() {
    const form = document.getElementById('tahfidzForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
      console.log('✅ Input form handler attached');
    } else {
      console.error('❌ Form #tahfidzForm not found');
    }

    // Set tanggal default
    this.setDefaultTanggal();
  },

  /**
   * Set tanggal hari ini
   */
  setDefaultTanggal() {
    const input = document.getElementById('tanggal');
    if (input) {
      input.value = new Date().toISOString().split('T')[0];
    }
  },

  // ==========================================
  // FORM EVENTS (dipanggil dari HTML onclick)
  // ==========================================

  /**
   * Update token guru saat guru dipilih
   */
  updateToken() {
    const select = document.getElementById('guru');
    const tokenInput = document.getElementById('tokenGuru');
    if (!select || !tokenInput) return;

    const selectedOption = select.options[select.selectedIndex];
    const token = selectedOption?.getAttribute('data-token') || AppConfig.FONNTE_DEFAULT_TOKEN;
    tokenInput.value = token;
  },

  /**
   * Update dropdown siswa saat kelas dipilih
   */
  updateNamaSiswa() {
    const kelas = document.getElementById('kelas')?.value;
    if (kelas) {
      DropdownManager.updateSiswaDropdown(kelas);
    }
    // Reset WhatsApp
    const waInput = document.getElementById('whatsapp');
    if (waInput) waInput.value = '';
  },

  /**
   * Update WhatsApp saat siswa dipilih
   */
  updateWhatsApp() {
    const select = document.getElementById('siswa');
    const waInput = document.getElementById('whatsapp');
    if (!select || !waInput) return;

    const selectedOption = select.options[select.selectedIndex];
    const wa = selectedOption?.getAttribute('data-whatsapp') || '';
    waInput.value = wa;
  },

  /**
   * Toggle field menghafal
   */
  toggleMenghafalFields() {
    const value = document.getElementById('menghafal')?.value;
    const hafalanFields = document.getElementById('hafalanFields');
    const alasanField = document.getElementById('alasanField');
    const barisInput = document.getElementById('baris');
    const alasanInput = document.getElementById('alasan');

    if (!hafalanFields || !alasanField) return;

    if (value === 'ya') {
      hafalanFields.classList.remove('hidden');
      alasanField.classList.add('hidden');
      if (barisInput) barisInput.required = true;
      if (alasanInput) alasanInput.required = false;
    } else if (value === 'tidak') {
      hafalanFields.classList.add('hidden');
      alasanField.classList.remove('hidden');
      if (barisInput) barisInput.required = false;
      if (alasanInput) alasanInput.required = true;
    } else {
      hafalanFields.classList.add('hidden');
      alasanField.classList.add('hidden');
      if (barisInput) barisInput.required = false;
      if (alasanInput) alasanInput.required = false;
    }
  },

  // ==========================================
  // FORM SUBMISSION
  // ==========================================

  /**
   * Kumpulkan data dari form
   * @returns {object}
   */
  collectData() {
    return {
      guru: document.getElementById('guru')?.value || '',
      tokenGuru: document.getElementById('tokenGuru')?.value || '',
      nama: document.getElementById('siswa')?.value || '',
      kelas: document.getElementById('kelas')?.value || '',
      whatsapp: document.getElementById('whatsapp')?.value || '',
      tanggal: document.getElementById('tanggal')?.value || '',
      baris: parseFloat(document.getElementById('baris')?.value) || 0,
      menghafal: document.getElementById('menghafal')?.value || '',
      alasan: document.getElementById('alasan')?.value || '',
      surat: document.getElementById('surat')?.value || '',
      ayatDari: parseFloat(document.getElementById('ayatDari')?.value) || null,
      ayatSampai: parseFloat(document.getElementById('ayatSampai')?.value) || null,
      keterangan: document.getElementById('keterangan')?.value || '',
      suratAkhir: document.getElementById('suratAkhir')?.value || '',
      catatan: document.getElementById('catatan')?.value || ''
    };
  },

  /**
   * Validasi data form
   * @param {object} data
   * @returns {boolean}
   */
  validate(data) {
    // Wajib diisi
    if (!data.guru) {
      NotificationService.warning('Pilih guru terlebih dahulu!');
      document.getElementById('guru')?.focus();
      return false;
    }

    if (!data.kelas) {
      NotificationService.warning('Pilih kelas terlebih dahulu!');
      document.getElementById('kelas')?.focus();
      return false;
    }

    if (!data.nama) {
      NotificationService.warning('Pilih siswa terlebih dahulu!');
      document.getElementById('siswa')?.focus();
      return false;
    }

    if (!data.tanggal) {
      NotificationService.warning('Tanggal harus diisi!');
      document.getElementById('tanggal')?.focus();
      return false;
    }

    if (!data.menghafal) {
      NotificationService.warning('Pilih status Ziyadah!');
      document.getElementById('menghafal')?.focus();
      return false;
    }

    // Validasi spesifik
    if (data.menghafal === 'ya') {
      if (!data.baris || data.baris <= 0) {
        NotificationService.warning('Jumlah baris harus diisi!');
        document.getElementById('baris')?.focus();
        return false;
      }
      if (!data.surat) {
        NotificationService.warning('Pilih surat!');
        document.getElementById('surat')?.focus();
        return false;
      }
    }

    if (data.menghafal === 'tidak' && !data.alasan) {
      NotificationService.warning('Alasan harus diisi!');
      document.getElementById('alasan')?.focus();
      return false;
    }

    return true;
  },

  /**
   * Prepare data untuk disimpan ke database
   * @param {object} formData
   * @returns {object}
   */
  prepareRecord(formData) {
    // Gabungkan surat awal & akhir jika lintas surat: "An-Naba' → Abasa"
    let suratFinal = formData.surat || '';
    if (formData.menghafal === 'ya' && formData.suratAkhir && formData.suratAkhir !== formData.surat) {
      suratFinal = formData.surat + ' → ' + formData.suratAkhir;
    }
    return {
      guru: formData.guru,
      token_guru: formData.tokenGuru,
      nama: formData.nama,
      kelas: formData.kelas,
      whatsapp: formData.whatsapp,
      tanggal: formData.tanggal,
      baris: formData.menghafal === 'ya' ? formData.baris : 0,
      menghafal: formData.menghafal,
      alasan: formData.menghafal === 'tidak' ? formData.alasan : '',
      surat: formData.menghafal === 'ya' ? suratFinal : '',
      ayat_dari: formData.menghafal === 'ya' ? formData.ayatDari : null,
      ayat_sampai: formData.menghafal === 'ya' ? formData.ayatSampai : null,
      keterangan: formData.menghafal === 'ya' ? formData.keterangan : '',
      catatan: formData.catatan || ''
    };
  },

  /**
   * Handle submit form
   * @param {Event} e
   */
  async handleSubmit(e) {
    e.preventDefault();
    console.log('📝 Form submitted');

    // Kumpulkan data
    const formData = this.collectData();

    // Validasi
    if (!this.validate(formData)) return;

    // Prepare record
    const record = this.prepareRecord(formData);

    // Disable button
    const submitBtn = e.target.querySelector('.btn-submit');
    const originalText = submitBtn?.innerHTML || '💾 Simpan Data';
    if (submitBtn) {
      submitBtn.innerHTML = '⏳ Menyimpan...';
      submitBtn.disabled = true;
    }

    try {
      // Simpan ke Supabase
      const result = await DatabaseService.saveTahfidzRecord(record);

      if (result) {
        // Kirim notifikasi WhatsApp
        if (formData.whatsapp) {
          NotificationService.info('📱 Mengirim notifikasi WA ke orang tua...', 3000);
          
          const message = formData.menghafal === 'tidak'
            ? NotificationService.formatTidakMenghafalMessage(formData)
            : NotificationService.formatTahfidzMessage(formData);

          // Kirim async — beri feedback hasilnya ke user
          NotificationService.sendWhatsApp(
            formData.whatsapp, 
            message, 
            formData.tokenGuru
          ).then(sent => {
            if (sent) {
              console.log('✅ WhatsApp notification sent');
              NotificationService.success('📱 Notifikasi WA berhasil dikirim!', 4000);
            } else {
              console.warn('⚠️ Gagal kirim WA — token mungkin tidak valid');
              NotificationService.warning(
                '⚠️ Data tersimpan, tapi notifikasi WA gagal. ' +
                'Cek token Fonnte guru di Master Data > Guru.',
                8000
              );
            }
          });
        } else {
          // Siswa tidak punya nomor WA
          NotificationService.warning(
            'ℹ️ Data tersimpan. Siswa tidak punya nomor WhatsApp.',
            5000
          );
        }

        NotificationService.success('✅ Data berhasil disimpan!');
        this.resetForm();

        // Pindah ke tab output setelah 1.5 detik
        setTimeout(() => {
          TabManager.show('output');
        }, 1500);
      }

    } catch (error) {
      console.error('❌ Submit error:', error);
      NotificationService.error('❌ Gagal menyimpan data: ' + error.message);

      // Kembalikan button
      if (submitBtn) {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    }
  },

  /**
   * Reset form ke keadaan awal
   */
  resetForm() {
    const form = document.getElementById('tahfidzForm');
    if (form) {
      form.reset();
      document.getElementById('tokenGuru').value = '';
      document.getElementById('whatsapp').value = '';
      document.getElementById('hafalanFields')?.classList.add('hidden');
      document.getElementById('alasanField')?.classList.add('hidden');
      this.setDefaultTanggal();
    }
  }
};

console.log('✅ InputForm module loaded');