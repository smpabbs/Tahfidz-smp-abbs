// ====================================================
// js/features/input-form.js - FORM INPUT HANDLER
// Satu form dengan checklist "Aktivitas KBM" pada bagian "Data Setoran":
//   Ziyadah / Murajaah / Tilawah — boleh dicentang lebih dari satu.
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
    this.syncAllAktivitas();
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
   * Metadata elemen per jenis aktivitas (id checkbox, id baris/kolom, id
   * pembungkus field detail).
   */
  _AKTIVITAS_META: {
    ziyadah: { checkboxId: 'aktifZiyadah', paneId: 'ziyadahPane', bodyId: 'ziyadahBody' },
    murojaah: { checkboxId: 'aktifMurojaah', paneId: 'murojaahPane', bodyId: 'murojaahBody' },
    tilawah: { checkboxId: 'aktifTilawah', paneId: 'tilawahPane', bodyId: 'tilawahBody' }
  },

  /**
   * Toggle satu aktivitas (Ziyadah/Murajaah/Tilawah) sesuai checkbox-nya.
   * Beda dari tab lama: TIDAK eksklusif — baris/kolom lain tidak disentuh,
   * jadi lebih dari satu checkbox boleh aktif bersamaan. Baris/kolomnya
   * sendiri SELALU tampil (daftar aktivitas selalu terlihat) — cuma field
   * detailnya (bodyId) yang disembunyikan/ditampilkan.
   *
   * Ziyadah masih punya dropdown Status (Ya/Sakit/Sertifikasi/Lainnya).
   * Murajaah & Tilawah TIDAK punya Status — dicentang berarti otomatis
   * dianggap dilakukan ("ya"), field detailnya langsung tampil begitu
   * dicentang, tanpa langkah pilih status dulu.
   * @param {string} jenis - 'ziyadah' | 'murojaah' | 'tilawah'
   */
  toggleAktivitas(jenis) {
    const meta = this._AKTIVITAS_META[jenis];
    if (!meta) return;

    const prefix = this.jenisPrefix(jenis);
    const checkbox = document.getElementById(meta.checkboxId);
    const pane = document.getElementById(meta.paneId);
    const body = document.getElementById(meta.bodyId);
    const isChecked = !!checkbox?.checked;

    if (pane) pane.classList.toggle('on', isChecked);
    if (body) body.classList.toggle('hidden', !isChecked);

    if (jenis === 'ziyadah') {
      // Pane yang disembunyikan tidak boleh menyisakan field required, karena
      // browser diam-diam menolak submit form kalau ada required field hidden.
      const menghafalSelect = document.getElementById('menghafal' + prefix);
      if (menghafalSelect) menghafalSelect.required = isChecked;

      if (isChecked) {
        this.toggleMenghafalFields(prefix);
      } else {
        const barisInput = document.getElementById('baris' + prefix);
        const alasanInput = document.getElementById('alasan' + prefix);
        if (barisInput) barisInput.required = false;
        if (alasanInput) alasanInput.required = false;
        const sertifikasiFields = document.getElementById('sertifikasiFields' + prefix);
        if (sertifikasiFields) sertifikasiFields.classList.add('hidden');
        const juzInput = document.getElementById('juzSertifikasi' + prefix);
        const capaianInput = document.getElementById('capaianSertifikasi' + prefix);
        if (juzInput) juzInput.required = false;
        if (capaianInput) capaianInput.required = false;
        // Ziyadah diuncek = tidak ada status aktif → tidak ada alasan mengunci
        // Murajaah/Tilawah (beda dari status "Sakit/Sertifikasi/Lainnya").
        this._setMurojaahTilawahLock(false);
      }
    } else {
      // Murajaah/Tilawah: tidak ada Status untuk dibaca — cuma kelola
      // required pada field Halaman sesuai tercentang atau tidak.
      const barisInput = document.getElementById('baris' + prefix);
      if (barisInput) barisInput.required = isChecked;
    }
  },

  /**
   * Sinkronkan tampilan ke-3 pane dengan status checkbox saat ini.
   * Dipanggil saat init() dan setelah resetForm().
   */
  syncAllAktivitas() {
    Object.keys(this._AKTIVITAS_META).forEach(j => this.toggleAktivitas(j));
  },

  /**
   * Kunci/lepas checkbox Murajaah & Tilawah. Dikunci (tidak bisa dicentang)
   * saat Status Ziyadah diisi selain "Ya" (Sakit/Sertifikasi/Lainnya/belum
   * dipilih) — itu berarti siswa tidak masuk sama sekali, jadi tidak mungkin
   * ada aktivitas lain hari itu. Kalau salah satu sudah tercentang saat
   * dikunci, otomatis diuncek (lewat toggleAktivitas) supaya tidak ada data
   * tersembunyi yang tetap ikut tersimpan.
   * @param {boolean} locked
   */
  _setMurojaahTilawahLock(locked) {
    ['murojaah', 'tilawah'].forEach(jenis => {
      const meta = this._AKTIVITAS_META[jenis];
      const checkbox = document.getElementById(meta.checkboxId);
      if (!checkbox) return;
      checkbox.disabled = locked;
      if (locked && checkbox.checked) {
        checkbox.checked = false;
        this.toggleAktivitas(jenis);
      }
    });
  },

  /**
   * Daftar jenis aktivitas yang checkbox-nya sedang tercentang.
   * @returns {string[]}
   */
  getCheckedJenisList() {
    return Object.keys(this._AKTIVITAS_META).filter(j => {
      return !!document.getElementById(this._AKTIVITAS_META[j].checkboxId)?.checked;
    });
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
   * Toggle field menghafal / alasan / sertifikasi / hafalan per tab (prefix
   * '' | M | T). sertifikasiFields/juzSertifikasi/capaianSertifikasi cuma
   * ada di DOM untuk Ziyadah (prefix '') — aman no-op untuk M/T karena
   * getElementById mengembalikan null.
   * @param {string} prefix - '' (Ziyadah) | 'M' (Murajaah) | 'T' (Tilawah)
   */
  toggleMenghafalFields(prefix = '') {
    const value = document.getElementById('menghafal' + prefix)?.value;
    const hafalanFields = document.getElementById('hafalanFields' + prefix);
    const alasanField = document.getElementById('alasanField' + prefix);
    const alasanInput = document.getElementById('alasan' + prefix);
    const barisInput = document.getElementById('baris' + prefix);
    const sertifikasiFields = document.getElementById('sertifikasiFields' + prefix);
    const juzInput = document.getElementById('juzSertifikasi' + prefix);
    const capaianInput = document.getElementById('capaianSertifikasi' + prefix);

    // Reset semua dulu, baru nyalakan yang relevan per value — supaya tidak
    // ada kombinasi "required" nyangkut dari status sebelumnya.
    if (hafalanFields) hafalanFields.classList.add('hidden');
    if (alasanField) alasanField.classList.add('hidden');
    if (alasanInput) alasanInput.required = false;
    if (barisInput) barisInput.required = false;
    if (sertifikasiFields) sertifikasiFields.classList.add('hidden');
    if (juzInput) juzInput.required = false;
    if (capaianInput) capaianInput.required = false;

    if (value === 'ya') {
      if (hafalanFields) hafalanFields.classList.remove('hidden');
      if (barisInput) barisInput.required = true;
    } else if (value === 'lainnya') {
      if (alasanField) alasanField.classList.remove('hidden');
      if (alasanInput) alasanInput.required = true;
    } else if (value === 'sertifikasi') {
      if (sertifikasiFields) sertifikasiFields.classList.remove('hidden');
      if (juzInput) juzInput.required = true;
      if (capaianInput) capaianInput.required = true;
    }

    // Ziyadah TIDAK "ya" (Sakit/Sertifikasi/Lainnya/belum dipilih) berarti
    // siswa tidak masuk sama sekali — Murajaah & Tilawah otomatis dikunci.
    if (prefix === '') {
      this._setMurojaahTilawahLock(value !== 'ya');
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
   * Kumpulkan data dari form untuk SATU jenis aktivitas.
   * @param {string} jenis - 'ziyadah' | 'murojaah' | 'tilawah'
   */
  collectData(jenis) {
    const p = this.jenisPrefix(jenis);

    // Ziyadah punya dropdown status sendiri (Ya/Sakit/Persiapan Sertifikasi/
    // Lainnya). Murajaah & Tilawah tidak punya Status — dicentang berarti
    // otomatis "ya" (tidak ada elemen 'menghafalM'/'menghafalT' di DOM).
    const menghafal = jenis === 'ziyadah' ? (this._val('menghafal' + p) || '') : 'ya';

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
      catatan: this._val('catatan'),
      // Cuma relevan utk Ziyadah status "Persiapan Sertifikasi" — field ini
      // tidak punya varian M/T (tidak ada elemennya utk Murajaah/Tilawah).
      juz: this._val('juzSertifikasi'),
      capaian: this._val('capaianSertifikasi')
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
        const satuan = data.jenis === 'ziyadah' ? 'baris' : 'halaman';
        NotificationService.warning(`Jumlah ${satuan} harus diisi!`);
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

    if (data.menghafal === 'sertifikasi') {
      const juzNum = parseInt(data.juz, 10);
      if (!data.juz || isNaN(juzNum) || juzNum < 1 || juzNum > 30) {
        NotificationService.warning('Isi Juz (1-30) terlebih dahulu!');
        document.getElementById('juzSertifikasi')?.focus();
        return false;
      }
      if (!data.capaian) {
        NotificationService.warning('Pilih Capaian terlebih dahulu!');
        document.getElementById('capaianSertifikasi')?.focus();
        return false;
      }
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

    // Juz & Capaian (khusus Persiapan Sertifikasi) tidak punya kolom
    // tersendiri di tabel — dititipkan sebagai teks terformat di `alasan`
    // (kolom itu memang generik untuk keterangan status non-"ya") supaya
    // tetap tersimpan & kebaca di tabel Hasil Data tanpa migrasi skema.
    let alasanFinal = '';
    if (formData.menghafal === 'lainnya') {
      alasanFinal = formData.alasan;
    } else if (formData.menghafal === 'sertifikasi') {
      alasanFinal = `Persiapan Sertifikasi — Juz ${formData.juz} (${formData.capaian})`;
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
      alasan: alasanFinal,
      surat: formData.menghafal === 'ya' ? suratFinal : '',
      ayat_dari: formData.menghafal === 'ya' ? formData.ayatDari : null,
      ayat_sampai: formData.menghafal === 'ya' ? formData.ayatSampai : null,
      keterangan: formData.menghafal === 'ya' ? formData.keterangan : '',
      catatan: formData.catatan || ''
    };
  },

  /**
   * Kirim SATU pesan WA per submit — isinya menyesuaikan aktivitas yang
   * tersimpan (1 atau 2-3 sekaligus), lewat template global TemplateWaManager.
   * @param {object[]} savedList - formData aktivitas yang berhasil disimpan
   */
  _sendActivityWhatsApp(savedList) {
    const first = savedList[0];
    const message = NotificationService.formatAktivitasMessage(savedList);

    NotificationService.sendWhatsApp(
      first.whatsapp,
      message,
      first.tokenGuru
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
  },

  /**
   * Handle submit form — simpan 1 baris per aktivitas yang dicentang.
   */
  async handleSubmit(e) {
    e.preventDefault();
    console.log('📝 Form submitted');

    const jenisList = this.getCheckedJenisList();
    if (jenisList.length === 0) {
      NotificationService.warning('Pilih minimal satu aktivitas (Ziyadah/Murajaah/Tilawah)!');
      return;
    }

    // Validasi SEMUA aktivitas yang dicentang dulu — kalau satu saja tidak
    // valid, batalkan seluruh submit sebelum menyimpan apa pun.
    const formDataList = [];
    for (const jenis of jenisList) {
      const formData = this.collectData(jenis);
      if (!this.validate(formData)) return; // validate() sudah kasih toast + fokus field
      formDataList.push(formData);
    }

    const submitBtn = e.target.querySelector('.btn-submit');
    const originalText = submitBtn?.innerHTML || '💾 Simpan Data';
    if (submitBtn) {
      submitBtn.innerHTML = '⏳ Menyimpan...';
      submitBtn.disabled = true;
    }

    // Simpan satu-satu berurutan (tidak ada transaksi DB di sisi client).
    // Kalau satu gagal, hentikan sisanya — yang sudah kepalang tersimpan
    // TIDAK di-rollback (menambah kompleksitas/risiko baru, tidak sepadan).
    const saved = [];
    let saveError = null;
    let stoppedAt = -1;
    for (let i = 0; i < formDataList.length; i++) {
      try {
        const record = this.prepareRecord(formDataList[i]);
        const result = await DatabaseService.saveTahfidzRecord(record);
        // .surat dari record (bukan formDataList mentah) — sudah digabung
        // "Awal → Akhir" oleh prepareRecord() kalau lintas surat, sama
        // persis dengan yang tersimpan & dibaca ulang dari database, jadi
        // pesan WA tidak kehilangan info Surat Akhir.
        if (result) saved.push({ ...formDataList[i], surat: record.surat });
      } catch (error) {
        saveError = error;
        stoppedAt = i;
        break;
      }
    }

    if (saved.length === 0) {
      console.error('❌ Submit error:', saveError);
      NotificationService.error('❌ Gagal menyimpan data: ' + (saveError?.message || 'unknown error'));
      if (submitBtn) {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
      return;
    }

    // Notifikasi WA — selalu 1 pesan per submit, isinya menyesuaikan
    // aktivitas yang tersimpan (lihat _sendActivityWhatsApp).
    const whatsapp = saved[0].whatsapp;
    if (whatsapp) {
      NotificationService.info('📱 Mengirim notifikasi WA ke orang tua...', 3000);
      this._sendActivityWhatsApp(saved);
    } else {
      NotificationService.warning('ℹ️ Data tersimpan. Siswa tidak punya nomor WhatsApp.', 5000);
    }

    if (saveError) {
      // Partial save: sebagian aktivitas gagal disimpan setelah sebagian lain berhasil.
      const berhasil = jenisList.slice(0, stoppedAt).map(j => AppConfig.JENIS_LABELS[j] || j);
      const gagal = jenisList.slice(stoppedAt).map(j => AppConfig.JENIS_LABELS[j] || j);
      NotificationService.warning(
        `⚠️ Tersimpan sebagian: ${berhasil.join(', ')} berhasil, ${gagal.join(', ')} GAGAL ` +
        `(${saveError.message}). Uncheck aktivitas yang sudah berhasil, lalu simpan ulang ` +
        `yang gagal saja.`,
        10000
      );
      if (submitBtn) {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
      // Form TIDAK direset & tidak pindah tab, supaya guru bisa lihat & perbaiki.
      return;
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
  },

  /**
   * Reset form ke keadaan awal
   */
  resetForm() {
    const form = document.getElementById('tahfidzForm');
    if (form) {
      form.reset(); // juga mengembalikan checkbox Ziyadah/Murajaah/Tilawah ke default HTML
      document.getElementById('tokenGuru').value = '';
      document.getElementById('whatsapp').value = '';
      this.setDefaultTanggal();
      this.syncAllAktivitas();
    }
  }
};

console.log('✅ InputForm module loaded');