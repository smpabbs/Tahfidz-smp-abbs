// ====================================================
// js/features/input-form.js - FORM INPUT HANDLER
// Satu form dengan 3 tab pada bagian "Data Setoran":
//   Ziyadah / Murajaah / Tilawah
// Guru, Siswa, dan Catatan dipakai bersama.
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

    this.setDefaultTanggal();
    this.showSetoranTab('ziyadah');
  },

  /**
   * Set tanggal hari ini
   */
  setDefaultTanggal() {
    const input = document.getElementById('tanggal');
    if (input) input.value = new Date().toISOString().split('T')[0];
  },

  /**
   * Prefix id field berdasarkan jenis tab.
   * @param {string} jenis - 'ziyadah' | 'murojaah' | 'tilawah'
   * @returns {string} '' | 'M' | 'T'
   */
  jenisPrefix(jenis) {
    if (jenis === 'murojaah') return 'M';
    if (jenis === 'tilawah') return 'T';
    return '';
  },

  /**
   * Ganti tab bagian "Data Setoran" (Ziyadah/Murajaah/Tilawah)
   * @param {string} jenis
   */
  showSetoranTab(jenis) {
    const valid = ['ziyadah', 'murojaah', 'tilawah'];
    if (!valid.includes(jenis)) jenis = 'ziyadah';

    const form = document.getElementById('tahfidzForm');
    if (form) form.setAttribute('data-jenis', jenis);

    // Aktifkan tombol sub-tab
    document.querySelectorAll('.master-tab[data-setoran]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-setoran') === jenis);
    });

    // Tampilkan pane yang sesuai + kelola required per pane.
    // Pane yang disembunyikan (display:none) tidak boleh menyisakan field
    // required, karena browser diam-diam menolak submit form kalau ada
    // required field yang hidden — dulu ini cuma diurus untuk pane Ziyadah,
    // jadi submit dari tab manapun selalu diblokir oleh 2 pane lain.
    const panePrefix = { ziyadah: '', murojaah: 'M', tilawah: 'T' };
    const paneId = { ziyadah: 'ziyadahPane', murojaah: 'murojaahPane', tilawah: 'tilawahPane' };
    Object.keys(panePrefix).forEach(j => {
      const el = document.getElementById(paneId[j]);
      const isActive = j === jenis;
      if (el) el.classList.toggle('hidden', !isActive);

      const prefix = panePrefix[j];
      const menghafalSelect = document.getElementById('menghafal' + prefix);
      if (menghafalSelect) menghafalSelect.required = isActive;

      if (isActive) {
        this.toggleMenghafalFields(prefix);
      } else {
        const barisInput = document.getElementById('baris' + prefix);
        const alasanInput = document.getElementById('alasan' + prefix);
        if (barisInput) barisInput.required = false;
        if (alasanInput) alasanInput.required = false;
      }
    });

    // Judul kartu
    const title = document.getElementById('setoranTitle');
    if (title) {
      title.textContent = jenis === 'murojaah' ? 'Data Murajaah'
        : jenis === 'tilawah' ? 'Data Tilawah'
        : 'Data Setoran';
    }
  },

  // ==========================================
  // FORM EVENTS (dipanggil dari HTML)
  // ==========================================

  /**
   * Update token guru saat guru dipilih (Guru dipakai bersama)
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
   * Update dropdown siswa saat kelas dipilih (Kelas dipakai bersama)
   */
  updateNamaSiswa() {
    const kelas = document.getElementById('kelas')?.value;
    if (kelas) DropdownManager.updateSiswaDropdown(kelas);

    const waInput = document.getElementById('whatsapp');
    if (waInput) waInput.value = '';
  },

  /**
   * Update WhatsApp saat siswa dipilih (Siswa dipakai bersama)
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
   * Toggle field menghafal / alasan / hafalan per tab (prefix '' | M | T)
   * @param {string} prefix - '' (Ziyadah) | 'M' (Murajaah) | 'T' (Tilawah)
   */
  toggleMenghafalFields(prefix = '') {
    const value = document.getElementById('menghafal' + prefix)?.value;
    const hafalanFields = document.getElementById('hafalanFields' + prefix);
    const alasanField = document.getElementById('alasanField' + prefix);
    const alasanInput = document.getElementById('alasan' + prefix);
    const barisInput = document.getElementById('baris' + prefix);

    if (value === 'ya') {
      if (hafalanFields) hafalanFields.classList.remove('hidden');
      if (alasanField) alasanField.classList.add('hidden');
      if (alasanInput) alasanInput.required = false;
      if (barisInput) barisInput.required = true;
    } else if (value === 'lainnya') {
      if (hafalanFields) hafalanFields.classList.add('hidden');
      if (alasanField) alasanField.classList.remove('hidden');
      if (alasanInput) alasanInput.required = true;
      if (barisInput) barisInput.required = false;
    } else {
      if (hafalanFields) hafalanFields.classList.add('hidden');
      if (alasanField) alasanField.classList.add('hidden');
      if (alasanInput) alasanInput.required = false;
      if (barisInput) barisInput.required = false;
    }
  },

  /**
   * Set field value dengan mengabaikan missing (rujuk ke value)
   */
  _val(id) {
    return document.getElementById(id)?.value || '';
  },

  // ==========================================
  // FORM SUBMISSION
  // ==========================================

  /**
   * Kumpulkan data dari form sesuai tab aktif
   */
  collectData() {
    const form = document.getElementById('tahfidzForm');
    const jenis = form?.dataset.jenis || 'ziyadah';
    const p = this.jenisPrefix(jenis);

    // Setiap tab punya dropdown status sendiri (Ya/Sakit/Persiapan Sertifikasi/Lainnya)
    const menghafal = this._val('menghafal' + p) || '';

    return {
      guru: this._val('guru'),
      tokenGuru: this._val('tokenGuru'),
      nama: this._val('siswa'),
      kelas: this._val('kelas'),
      whatsapp: this._val('whatsapp'),
      tanggal: this._val('tanggal'),
      jenis: jenis,
      baris: parseFloat(this._val('baris' + p)) || 0,
      menghafal: menghafal,
      alasan: this._val('alasan' + p),
      surat: this._val('surat' + p),
      ayatDari: parseFloat(this._val('ayatDari' + p)) || null,
      ayatSampai: parseFloat(this._val('ayatSampai' + p)) || null,
      keterangan: this._val('keterangan' + p),
      suratAkhir: this._val('suratAkhir' + p),
      catatan: this._val('catatan')
    };
  },

  /**
   * Validasi data form
   */
  validate(data) {
    const p = this.jenisPrefix(data.jenis);

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
      NotificationService.warning('Pilih status aktivitas!');
      document.getElementById('menghafal' + p)?.focus();
      return false;
    }

    // Wajib surat & baris hanya jika aktivitas benar dilakukan (status = ya)
    const isPositif = data.menghafal === 'ya';
    if (isPositif) {
      if (!data.baris || data.baris <= 0) {
        NotificationService.warning('Jumlah baris harus diisi!');
        document.getElementById('baris' + p)?.focus();
        return false;
      }
      if (!data.surat) {
        NotificationService.warning('Pilih surat!');
        document.getElementById('surat' + p)?.focus();
        return false;
      }
    }

    if (data.menghafal === 'lainnya' && !data.alasan) {
      NotificationService.warning('Alasan harus diisi!');
      document.getElementById('alasan' + p)?.focus();
      return false;
    }

    return true;
  },

  /**
   * Siapkan data untuk disimpan ke database
   */
  prepareRecord(formData) {
    // Gabungkan surat awal & akhir jika lintas surat
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
      jenis: formData.jenis || 'ziyadah',
      baris: formData.menghafal === 'ya' ? formData.baris : 0,
      menghafal: formData.menghafal,
      alasan: formData.menghafal === 'lainnya' ? formData.alasan : '',
      surat: formData.menghafal === 'ya' ? suratFinal : '',
      ayat_dari: formData.menghafal === 'ya' ? formData.ayatDari : null,
      ayat_sampai: formData.menghafal === 'ya' ? formData.ayatSampai : null,
      keterangan: formData.menghafal === 'ya' ? formData.keterangan : '',
      catatan: formData.catatan || ''
    };
  },

  /**
   * Handle submit form
   */
  async handleSubmit(e) {
    e.preventDefault();
    console.log('📝 Form submitted');

    const form = e.target;
    const formData = this.collectData();

    if (!this.validate(formData)) return;
    const record = this.prepareRecord(formData);

    const submitBtn = e.target.querySelector('.btn-submit');
    const originalText = submitBtn?.innerHTML || '💾 Simpan Data';
    if (submitBtn) {
      submitBtn.innerHTML = '⏳ Menyimpan...';
      submitBtn.disabled = true;
    }

    try {
      const result = await DatabaseService.saveTahfidzRecord(record);

      if (result) {
        if (formData.whatsapp) {
          NotificationService.info('📱 Mengirim notifikasi WA ke orang tua...', 3000);

          let message;
          switch (formData.menghafal) {
            case 'sakit':
              message = NotificationService.formatSakitMessage(formData);
              break;
            case 'sertifikasi':
              message = NotificationService.formatSertifikasiMessage(formData);
              break;
            case 'lainnya':
              message = NotificationService.formatLainnyaMessage(formData);
              break;
            default:
              if (formData.jenis === 'murojaah') {
                message = NotificationService.formatMurojaahMessage(formData);
              } else if (formData.jenis === 'tilawah') {
                message = NotificationService.formatTilawahMessage(formData);
              } else {
                message = NotificationService.formatTahfidzMessage(formData);
              }
          }

          NotificationService.sendWhatsApp(
            formData.whatsapp,
            message,
            formData.tokenGuru
          ).then(sent => {
            if (sent) {
              NotificationService.success('📱 Notifikasi WA berhasil dikirim!', 4000);
            } else {
              NotificationService.warning(
                '⚠️ Data tersimpan, tapi notifikasi WA gagal. ' +
                'Cek token Fonnte guru di Master Data > Guru.',
                8000
              );
            }
          });
        } else {
          NotificationService.warning(
            'ℹ️ Data tersimpan. Siswa tidak punya nomor WhatsApp.',
            5000
          );
        }

        NotificationService.success('✅ Data berhasil disimpan!');
        this.resetForm();

        if (submitBtn) {
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
        }

        setTimeout(() => {
          TabManager.show('output');
        }, 1500);
      }

    } catch (error) {
      console.error('❌ Submit error:', error);
      NotificationService.error('❌ Gagal menyimpan data: ' + error.message);

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
      this.showSetoranTab('ziyadah');
    }
  }
};

console.log('✅ InputForm module loaded');