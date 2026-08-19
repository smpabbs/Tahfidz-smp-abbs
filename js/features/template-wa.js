// ====================================================
// js/features/template-wa.js - TEMPLATE PESAN WHATSAPP
// Pengaturan template pesan WA GLOBAL (dikelola 1 guru,
// dipakai semua guru). Simpan di Supabase app_settings
// + fallback localStorage.
//
// Navigasi 2 level supaya tidak semua 13 template kelihatan
// sekaligus: Level 1 = jenis aktivitas (Ziyadah/Murajaah/
// Tilawah/Pembaruan Data), Level 2 = status (Ya/Sakit/
// Persiapan Sertifikasi/Lainnya) — cuma muncul utk 3 jenis
// aktivitas, karena Pembaruan Data cuma 1 template.
// ====================================================

const TemplateWaManager = {

  // LEVEL 1 — jenis aktivitas
  JENIS: [
    { id: 'ziyadah',  label: 'Ziyadah',        desc: 'setoran hafalan baru', ico: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>' },
    { id: 'murojaah', label: 'Murajaah',       desc: 'mengulang hafalan',    ico: '<path d="M8 3 2 21h4l2-6h6"/><path d="M13 9h7l-4 8h-7"/>' },
    { id: 'tilawah',  label: 'Tilawah',        desc: 'tilawah / membaca',    ico: '<path d="M2 6h5l3-2h10v13H10l-3 2H2Z"/>' },
    { id: 'edit',     label: 'Pembaruan Data', desc: 'edit setoran (semua jenis)', ico: '<path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 4v5h-5"/>' }
  ],

  // LEVEL 2 — status (utk jenis ziyadah/murojaah/tilawah saja)
  STATUS: [
    { id: 'ya',          label: 'Ya',                    ico: '<path d="M8 12.5l2.5 2.5L16 9.5"/><circle cx="12" cy="12" r="9"/>' },
    { id: 'sakit',       label: 'Sakit',                 ico: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>' },
    { id: 'sertifikasi', label: 'Persiapan Sertifikasi', ico: '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>' },
    { id: 'lainnya',     label: 'Lainnya',               ico: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>' }
  ],

  // Pemetaan (jenis, status) -> key penyimpanan (app_settings / wa_template_<key>).
  // Ziyadah dipertahankan pakai key lama (setoran/tidak/sertifikasi/lainnya) supaya
  // template yang sudah dikustomisasi guru sebelum Murajaah/Tilawah ada tidak hilang.
  KEY_MAP: {
    ziyadah:  { ya: 'setoran',  sakit: 'tidak',          sertifikasi: 'sertifikasi',          lainnya: 'lainnya' },
    murojaah: { ya: 'murojaah', sakit: 'tidak_murojaah', sertifikasi: 'sertifikasi_murojaah', lainnya: 'lainnya_murojaah' },
    tilawah:  { ya: 'tilawah',  sakit: 'tidak_tilawah',  sertifikasi: 'sertifikasi_tilawah',  lainnya: 'lainnya_tilawah' }
  },

  /**
   * Resolve key penyimpanan dari (jenis, status)
   */
  keyFor(jenis, status) {
    return (this.KEY_MAP[jenis] && this.KEY_MAP[jenis][status]) || this.KEY_MAP.ziyadah[status] || 'setoran';
  },

  // Variabel yang tersedia, dikelompokkan per status (bentuknya sama utk ketiga jenis)
  VARS_BY_STATUS: {
    ya:          ['nama','kelas','surat','ayat','baris','nilai','guru','tanggal'],
    sakit:       ['nama','kelas','alasan','guru','tanggal'],
    sertifikasi: ['nama','kelas','guru','tanggal'],
    lainnya:     ['nama','kelas','alasan','guru','tanggal'],
    edit:        ['nama','kelas','guru','tanggal','surat_lama','surat_baru','nilai_lama','nilai_baru','baris_lama','baris_baru']
  },

  // Template BAWAAN (default) per key penyimpanan — 3 jenis x 4 status + edit = 13
  DEFAULTS: {
    setoran: `Assalamu'alaikum ayah/bunda ananda {nama},

Alhamdulillah, hari ini ananda {nama} telah menyelesaikan setoran hafalan:

📖 Surat    : {surat}
📍 Ayat     : {ayat}
📊 Jumlah   : {baris} baris
⭐ Nilai    : {nilai}
👨‍🏫 Guru     : {guru}

Terus dukung semangat menghafal ananda {nama} di rumah ya.

Wassalamu'alaikum,
{guru}`,

    murojaah: `Assalamu'alaikum ayah/bunda ananda {nama},

Alhamdulillah, hari ini ananda {nama} telah menyelesaikan murajaah hafalan:

📖 Surat    : {surat}
📍 Ayat     : {ayat}
📊 Jumlah   : {baris} baris
⭐ Nilai    : {nilai}
👨‍🏫 Guru     : {guru}

Terus istiqamah murajaah ananda {nama} di rumah ya.

Wassalamu'alaikum,
{guru}`,

    tilawah: `Assalamu'alaikum ayah/bunda ananda {nama},

Alhamdulillah, hari ini ananda {nama} telah melaksanakan tilawah:

📖 Surat    : {surat}
📍 Ayat     : {ayat}
📊 Jumlah   : {baris} baris
⭐ Nilai    : {nilai}
👨‍🏫 Guru     : {guru}

Terus istiqamah tilawah ananda {nama} di rumah ya.

Wassalamu'alaikum,
{guru}`,

    tidak: `Assalamu'alaikum ayah/bunda ananda {nama},

Hari ini ananda {nama} tidak dapat mengikuti setoran hafalan karena:

📝 {alasan}

Kami doakan semoga ananda lekas sehat dan bisa kembali menghafal.

Wassalamu'alaikum,
{guru}`,

    tidak_murojaah: `Assalamu'alaikum ayah/bunda ananda {nama},

Hari ini ananda {nama} tidak dapat mengikuti murajaah karena:

📝 {alasan}

Kami doakan semoga ananda lekas sehat.

Wassalamu'alaikum,
{guru}`,

    tidak_tilawah: `Assalamu'alaikum ayah/bunda ananda {nama},

Hari ini ananda {nama} tidak dapat mengikuti tilawah karena:

📝 {alasan}

Kami doakan semoga ananda lekas sehat.

Wassalamu'alaikum,
{guru}`,

    sertifikasi: `Assalamu'alaikum ayah/bunda ananda {nama},

Hari ini ananda {nama} tidak mengikuti setoran hafalan karena sedang mempersiapkan sertifikasi tahfidz.

Semoga ananda dimudahkan dan lancar dalam proses sertifikasinya.

Wassalamu'alaikum,
{guru}`,

    sertifikasi_murojaah: `Assalamu'alaikum ayah/bunda ananda {nama},

Hari ini ananda {nama} tidak mengikuti murajaah karena sedang mempersiapkan sertifikasi tahfidz.

Semoga ananda dimudahkan dan lancar dalam proses sertifikasinya.

Wassalamu'alaikum,
{guru}`,

    sertifikasi_tilawah: `Assalamu'alaikum ayah/bunda ananda {nama},

Hari ini ananda {nama} tidak mengikuti tilawah karena sedang mempersiapkan sertifikasi tahfidz.

Semoga ananda dimudahkan dan lancar dalam proses sertifikasinya.

Wassalamu'alaikum,
{guru}`,

    lainnya: `Assalamu'alaikum ayah/bunda ananda {nama},

Hari ini ananda {nama} tidak mengikuti setoran hafalan dengan keterangan:

📝 {alasan}

Wassalamu'alaikum,
{guru}`,

    lainnya_murojaah: `Assalamu'alaikum ayah/bunda ananda {nama},

Hari ini ananda {nama} tidak mengikuti murajaah dengan keterangan:

📝 {alasan}

Wassalamu'alaikum,
{guru}`,

    lainnya_tilawah: `Assalamu'alaikum ayah/bunda ananda {nama},

Hari ini ananda {nama} tidak mengikuti tilawah dengan keterangan:

📝 {alasan}

Wassalamu'alaikum,
{guru}`,

    edit: `Assalamu'alaikum ayah/bunda ananda {nama},

Ada pembaruan data hafalan ananda {nama}:

• Tanggal : {tanggal_lama} → {tanggal_baru}
• Surat   : {surat_lama} → {surat_baru}
• Nilai   : {nilai_lama} → {nilai_baru}
• Jumlah  : {baris_lama} → {baris_baru} baris

Terima kasih atas perhatiannya.

Wassalamu'alaikum,
{guru}`
  },

  // Data contoh untuk preview & test kirim
  SAMPLE: {
    nama:'Ahmad Ramadhan', kelas:'7A', surat:'Al-Mulk', ayat:'1 - 10', baris:'15',
    nilai:'Mumtaz', guru:'Ust. Abdurrahman', tanggal:'10/08/2026',
    alasan:'Sakit (demam)',
    tanggal_lama:'08/08/2026', tanggal_baru:'10/08/2026',
    surat_lama:"An-Naba'", surat_baru:'Al-Mulk',
    nilai_lama:'Jayyid', nilai_baru:'Mumtaz',
    baris_lama:'10', baris_baru:'15'
  },

  jenisAktif: 'ziyadah',
  statusAktif: 'ya',

  /**
   * Inisialisasi: muat template dari Supabase (fallback localStorage)
   */
  async init() {
    const tpl = await StorageService.loadWATemplates();
    AppState.waTemplates = tpl;
    console.log('✅ TemplateWaManager initialized');
  },

  /**
   * Muat ulang template (dipanggil saat tab dibuka)
   */
  async load() {
    const tpl = await StorageService.loadWATemplates();
    AppState.waTemplates = tpl;
    this.renderAll();
  },

  /**
   * Key penyimpanan & status (bentuk vars) untuk kombinasi jenis+status yang aktif
   */
  currentKey() {
    return this.jenisAktif === 'edit' ? 'edit' : this.keyFor(this.jenisAktif, this.statusAktif);
  },
  currentStatus() {
    return this.jenisAktif === 'edit' ? 'edit' : this.statusAktif;
  },

  /**
   * Ambil template aktif untuk satu key (user punya > default)
   * @param {string} key - key penyimpanan, mis. 'setoran' | 'tidak_murojaah' | 'edit'
   * @returns {string}
   */
  getTemplate(key) {
    const user = AppState.waTemplates && AppState.waTemplates[key];
    return (user && user.trim()) ? user : (this.DEFAULTS[key] || '');
  },

  /**
   * Render template: ganti {variabel} dengan nilai data
   * @param {string} template - teks template
   * @param {object} vars - objek variabel
   * @returns {string}
   */
  renderTemplate(template, vars) {
    if (!template) return '';
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return (vars && vars[key] !== undefined && vars[key] !== null) ? String(vars[key]) : match;
    });
  },

  /**
   * Format pesan final dari data setoran (dipakai notification.js)
   * @param {string} key - key penyimpanan, mis. 'setoran' | 'tidak_murojaah' | 'edit'
   * @param {string} status - 'ya' | 'sakit' | 'sertifikasi' | 'lainnya' | 'edit' (menentukan bentuk variabel)
   * @param {object} data - data form/setoran
   * @param {object} oldData - data lama (khusus status 'edit')
   * @returns {string}
   */
  buildMessage(key, status, data, oldData) {
    const template = this.getTemplate(key);
    let vars;

    if (status === 'edit' && oldData && data) {
      vars = {
        nama: data.nama, kelas: data.kelas || '', guru: data.guru || '',
        tanggal: data.tanggal || '', tanggal_lama: oldData.tanggal || '-',
        tanggal_baru: data.tanggal || '-',
        surat_lama: oldData.surat || '-', surat_baru: data.surat || '-',
        nilai_lama: oldData.keterangan || '-', nilai_baru: data.keterangan || '-',
        baris_lama: oldData.baris || 0, baris_baru: data.baris || 0
      };
    } else if (status === 'sakit' || status === 'lainnya') {
      vars = {
        nama: data.nama || '', kelas: data.kelas || '', guru: data.guru || '',
        tanggal: data.tanggal || '', alasan: data.alasan || 'Tidak disebutkan'
      };
    } else if (status === 'sertifikasi') {
      vars = {
        nama: data.nama || '', kelas: data.kelas || '', guru: data.guru || '',
        tanggal: data.tanggal || ''
      };
    } else { // 'ya'
      vars = {
        nama: data.nama || '', kelas: data.kelas || '', guru: data.guru || '',
        tanggal: data.tanggal || '', surat: data.surat || '-',
        ayat: this.formatAyat(data), baris: data.baris || 0,
        nilai: data.keterangan || '-'
      };
    }

    return this.renderTemplate(template, vars);
  },

  /**
   * Format rentang ayat ("1 - 10" atau "1")
   */
  formatAyat(data) {
    if (data.ayatDari && data.ayatSampai) return `${data.ayatDari} - ${data.ayatSampai}`;
    if (data.ayatDari) return String(data.ayatDari);
    return '-';
  },

  /**
   * Simpan template (Supabase + localStorage)
   */
  async simpan() {
    const key = this.currentKey();
    const teks = document.getElementById('tplEditor')?.value || '';
    if (!AppState.waTemplates) AppState.waTemplates = {};
    AppState.waTemplates[key] = teks;

    const okLocal = StorageService.saveWATemplates(AppState.waTemplates);
    let okCloud = false;
    try {
      okCloud = await DatabaseService.saveWASetting(`wa_template_${key}`, teks);
    } catch (e) {
      console.warn('⚠️ Supabase save template failed:', e.message);
    }

    if (okCloud) {
      NotificationService.success('✅ Template tersimpan (global — berlaku untuk semua guru)');
    } else if (okLocal) {
      NotificationService.warning('⚠️ Tersimpan lokal (offline). Template akan tersinkron saat online.');
    } else {
      NotificationService.error('❌ Gagal menyimpan template');
    }
    this.preview();
  },

  /**
   * Kembalikan template jenis+status aktif ke bawaan
   */
  async resetDefault() {
    const key = this.currentKey();
    const label = this.breadcrumbLabel();
    const ok = await ConfirmDialog.show(`Template "${label}" akan dikembalikan ke pesan bawaan.`, { title: 'Kembalikan ke Bawaan?', confirmText: 'Ya, Kembalikan' });
    if (!ok) return;

    if (AppState.waTemplates) AppState.waTemplates[key] = '';
    StorageService.saveWATemplates(AppState.waTemplates || {});
    try {
      await DatabaseService.saveWASetting(`wa_template_${key}`, '');
    } catch (e) {
      console.warn('⚠️ Supabase reset template failed:', e.message);
    }

    document.getElementById('tplEditor').value = this.getTemplate(key);
    this.preview();
    NotificationService.success('↩️ Template dikembalikan ke bawaan');
  },

  /**
   * Kirim test ke nomor tertentu (cek token + proxy Fonnte)
   */
  async kirimTest() {
    const no = document.getElementById('tplTestNomor')?.value?.trim();
    if (!no) {
      NotificationService.warning('⚠️ Isi nomor WhatsApp test dulu');
      return;
    }
    const message = this.buildMessage(this.currentKey(), this.currentStatus(), { ...this.SAMPLE });
    const token = AppConfig.FONNTE_DEFAULT_TOKEN;

    NotificationService.info('📤 Mengirim test ke ' + no + ' ...', 5000);
    const sent = await NotificationService.sendWhatsApp(no, message, token);
    if (sent) {
      NotificationService.success('✅ Test terkirim ke ' + no + ' (cek WhatsApp)');
    } else {
      NotificationService.error('❌ Test GAGAL dikirim. Cek token Fonnte / koneksi.');
    }
  },

  // ==========================================
  // RENDER UI
  // ==========================================

  /**
   * Render semua (level 1, level 2, breadcrumb, chips, editor, preview)
   */
  renderAll() {
    this.renderLevel1();
    this.renderLevel2();
    this.renderBreadcrumb();
    this.renderChips();
    const editor = document.getElementById('tplEditor');
    if (editor) editor.value = this.getTemplate(this.currentKey());
    this.preview();
  },

  renderLevel1() {
    const container = document.getElementById('tplJenis');
    if (!container) return;
    container.innerHTML = '';
    this.JENIS.forEach(j => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tpl-jenis-btn' + (j.id === this.jenisAktif ? ' active' : '');
      btn.innerHTML = `<span class="tpl-j-ico"><svg viewBox="0 0 24 24">${j.ico}</svg></span>${j.label}<span class="tpl-j-sub">${j.desc}</span>`;
      btn.onclick = () => this.pilihJenis(j.id);
      container.appendChild(btn);
    });
  },

  renderLevel2() {
    const wrap = document.getElementById('tplLevel2Wrap');
    const container = document.getElementById('tplLevel2');
    if (!wrap || !container) return;

    if (this.jenisAktif === 'edit') {
      wrap.style.display = 'none';
      return;
    }
    wrap.style.display = '';
    container.innerHTML = '';
    this.STATUS.forEach(s => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tpl-level2-btn' + (s.id === this.statusAktif ? ' active' : '');
      btn.innerHTML = `<svg viewBox="0 0 24 24">${s.ico}</svg>${s.label}`;
      btn.onclick = () => this.pilihStatus(s.id);
      container.appendChild(btn);
    });
  },

  breadcrumbLabel() {
    const jLabel = this.JENIS.find(j => j.id === this.jenisAktif)?.label || this.jenisAktif;
    if (this.jenisAktif === 'edit') return jLabel;
    const sLabel = this.STATUS.find(s => s.id === this.statusAktif)?.label || this.statusAktif;
    return `${jLabel} → ${sLabel}`;
  },

  renderBreadcrumb() {
    const el = document.getElementById('tplBreadcrumb');
    if (!el) return;
    const jLabel = this.JENIS.find(j => j.id === this.jenisAktif)?.label || this.jenisAktif;
    if (this.jenisAktif === 'edit') {
      el.innerHTML = `Mengedit template: <b>${jLabel}</b>`;
      return;
    }
    const sLabel = this.STATUS.find(s => s.id === this.statusAktif)?.label || this.statusAktif;
    el.innerHTML = `Mengedit template: <b>${jLabel}</b> → <b>${sLabel}</b>`;
  },

  renderChips() {
    const container = document.getElementById('tplChips');
    if (!container) return;
    container.innerHTML = '';
    (this.VARS_BY_STATUS[this.currentStatus()] || []).forEach(v => {
      const chip = document.createElement('span');
      chip.className = 'tpl-chip';
      chip.textContent = '{' + v + '}';
      chip.title = 'Klik untuk menyisipkan';
      chip.onclick = () => this.sisipkan('{' + v + '}');
      container.appendChild(chip);
    });
  },

  /**
   * Pindah jenis aktivitas aktif (Level 1)
   */
  pilihJenis(jenis) {
    this.jenisAktif = jenis;
    if (jenis !== 'edit') this.statusAktif = 'ya';
    this.renderLevel1();
    this.renderLevel2();
    this.renderBreadcrumb();
    this.renderChips();
    const editor = document.getElementById('tplEditor');
    if (editor) editor.value = this.getTemplate(this.currentKey());
    this.preview();
  },

  /**
   * Pindah status aktif (Level 2)
   */
  pilihStatus(status) {
    this.statusAktif = status;
    this.renderLevel2();
    this.renderBreadcrumb();
    this.renderChips();
    const editor = document.getElementById('tplEditor');
    if (editor) editor.value = this.getTemplate(this.currentKey());
    this.preview();
  },

  /**
   * Sisipkan variabel di posisi kursor
   */
  sisipkan(teks) {
    const ta = document.getElementById('tplEditor');
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const baru = ta.value.slice(0, start) + teks + ta.value.slice(end);
    ta.value = baru;
    ta.selectionStart = ta.selectionEnd = start + teks.length;
    ta.focus();
    this.preview();
  },

  /**
   * Preview live di bubble WA
   */
  preview() {
    const editor = document.getElementById('tplEditor');
    const bubble = document.getElementById('tplPreview');
    const timeEl = document.getElementById('tplTime');
    if (!bubble) return;
    const teks = editor ? editor.value : '';
    bubble.textContent = teks.trim()
      ? this.buildMessage(this.currentKey(), this.currentStatus(), { ...this.SAMPLE })
      : '(template kosong — sistem akan memakai pesan bawaan)';
    if (timeEl) {
      const now = new Date();
      timeEl.textContent = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    }
  }
};

console.log('✅ TemplateWaManager module loaded');
