// ====================================================
// js/features/template-wa.js - TEMPLATE PESAN WHATSAPP
// Pengaturan template pesan WA GLOBAL (dikelola 1 guru,
// dipakai semua guru). Simpan di Supabase app_settings
// + fallback localStorage.
// ====================================================

const TemplateWaManager = {

  // Jenis pesan yang bisa dikustom
  JENIS: [
    { id: 'setoran',     label: 'Setoran Hafalan',        ico: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>', desc: 'hafalan baru masuk' },
    { id: 'tidak',       label: 'Sakit',                  ico: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>', desc: 'ananda sakit / tidak ziyadah' },
    { id: 'sertifikasi', label: 'Persiapan Sertifikasi',  ico: '<svg viewBox="0 0 24 24"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>', desc: 'sedang persiapan sertifikasi' },
    { id: 'lainnya',     label: 'Lainnya',                ico: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>', desc: 'alasan lain (bebas)' },
    { id: 'edit',        label: 'Pembaruan Data',         ico: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 4v5h-5"/></svg>', desc: 'edit setoran' }
  ],

  // Variabel yang tersedia per jenis pesan
  VARS: {
    setoran:     ['nama','kelas','surat','ayat','baris','nilai','guru','tanggal'],
    tidak:       ['nama','kelas','alasan','guru','tanggal'],
    sertifikasi: ['nama','kelas','guru','tanggal'],
    lainnya:     ['nama','kelas','alasan','guru','tanggal'],
    edit:        ['nama','kelas','guru','tanggal','surat_lama','surat_baru','nilai_lama','nilai_baru','baris_lama','baris_baru']
  },

  // Template BAWAAN (default) - sama dengan yang dulu hardcoded di notification.js
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

    tidak: `Assalamu'alaikum ayah/bunda ananda {nama},

Hari ini ananda {nama} tidak dapat mengikuti setoran hafalan karena:

📝 {alasan}

Kami doakan semoga ananda lekas sehat dan bisa kembali menghafal.

Wassalamu'alaikum,
{guru}`,

    sertifikasi: `Assalamu'alaikum ayah/bunda ananda {nama},

Hari ini ananda {nama} tidak mengikuti setoran hafalan karena sedang mempersiapkan sertifikasi tahfidz.

Semoga ananda dimudahkan dan lancar dalam proses sertifikasinya.

Wassalamu'alaikum,
{guru}`,

    lainnya: `Assalamu'alaikum ayah/bunda ananda {nama},

Hari ini ananda {nama} tidak mengikuti setoran hafalan dengan keterangan:

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

  jenisAktif: 'setoran',

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
   * Ambil template aktif untuk satu jenis (user punya > default)
   * @param {string} jenis - 'setoran' | 'tidak' | 'edit'
   * @returns {string}
   */
  getTemplate(jenis) {
    const user = AppState.waTemplates && AppState.waTemplates[jenis];
    return (user && user.trim()) ? user : (this.DEFAULTS[jenis] || '');
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
   * @param {string} jenis - 'setoran' | 'tidak' | 'edit'
   * @param {object} data - data form/setoran
   * @param {object} oldData - data lama (khusus jenis 'edit')
   * @returns {string}
   */
  buildMessage(jenis, data, oldData) {
    const template = this.getTemplate(jenis);
    let vars;

    if (jenis === 'edit' && oldData && data) {
      vars = {
        nama: data.nama, kelas: data.kelas || '', guru: data.guru || '',
        tanggal: data.tanggal || '', tanggal_lama: oldData.tanggal || '-',
        tanggal_baru: data.tanggal || '-',
        surat_lama: oldData.surat || '-', surat_baru: data.surat || '-',
        nilai_lama: oldData.keterangan || '-', nilai_baru: data.keterangan || '-',
        baris_lama: oldData.baris || 0, baris_baru: data.baris || 0
      };
    } else if (jenis === 'tidak' || jenis === 'lainnya') {
      vars = {
        nama: data.nama || '', kelas: data.kelas || '', guru: data.guru || '',
        tanggal: data.tanggal || '', alasan: data.alasan || 'Tidak disebutkan'
      };
    } else if (jenis === 'sertifikasi') {
      vars = {
        nama: data.nama || '', kelas: data.kelas || '', guru: data.guru || '',
        tanggal: data.tanggal || ''
      };
    } else { // setoran
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
    const jenis = this.jenisAktif;
    const teks = document.getElementById('tplEditor')?.value || '';
    if (!AppState.waTemplates) AppState.waTemplates = {};
    AppState.waTemplates[jenis] = teks;

    const okLocal = StorageService.saveWATemplates(AppState.waTemplates);
    let okCloud = false;
    try {
      okCloud = await DatabaseService.saveWASetting(`wa_template_${jenis}`, teks);
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
   * Kembalikan template jenis aktif ke bawaan
   */
  async resetDefault() {
    const jenis = this.jenisAktif;
    const label = this.JENIS.find(j => j.id === jenis)?.label || jenis;
    if (!confirm(`Kembalikan template "${label}" ke pesan bawaan?`)) return;

    if (AppState.waTemplates) AppState.waTemplates[jenis] = '';
    StorageService.saveWATemplates(AppState.waTemplates || {});
    try {
      await DatabaseService.saveWASetting(`wa_template_${jenis}`, '');
    } catch (e) {
      console.warn('⚠️ Supabase reset template failed:', e.message);
    }

    document.getElementById('tplEditor').value = this.getTemplate(jenis);
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
    const jenis = this.jenisAktif;
    const message = this.buildMessage(jenis, { ...this.SAMPLE });
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
   * Render semua (jenis buttons, chips, editor, preview)
   */
  renderAll() {
    this.renderJenisButtons();
    this.renderChips();
    const editor = document.getElementById('tplEditor');
    if (editor) editor.value = this.getTemplate(this.jenisAktif);
    this.preview();
  },

  renderJenisButtons() {
    const container = document.getElementById('tplJenis');
    if (!container) return;
    container.innerHTML = '';
    this.JENIS.forEach(j => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tpl-jenis-btn' + (j.id === this.jenisAktif ? ' active' : '');
      btn.dataset.jenis = j.id;
      btn.innerHTML = `<span class="tpl-j-ico">${j.ico}</span>${j.label}<span class="tpl-j-sub">${j.desc}</span>`;
      btn.onclick = () => this.pilihJenis(j.id);
      container.appendChild(btn);
    });
  },

  renderChips() {
    const container = document.getElementById('tplChips');
    if (!container) return;
    container.innerHTML = '';
    (this.VARS[this.jenisAktif] || []).forEach(v => {
      const chip = document.createElement('span');
      chip.className = 'tpl-chip';
      chip.textContent = '{' + v + '}';
      chip.title = 'Klik untuk menyisipkan';
      chip.onclick = () => this.sisipkan('{' + v + '}');
      container.appendChild(chip);
    });
  },

  /**
   * Pindah jenis pesan aktif
   */
  pilihJenis(jenis) {
    this.jenisAktif = jenis;
    this.renderJenisButtons();
    this.renderChips();
    const editor = document.getElementById('tplEditor');
    if (editor) editor.value = this.getTemplate(jenis);
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
      ? this.buildMessage(this.jenisAktif, { ...this.SAMPLE })
      : '(template kosong — sistem akan memakai pesan bawaan)';
    if (timeEl) {
      const now = new Date();
      timeEl.textContent = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    }
  }
};

console.log('✅ TemplateWaManager module loaded');