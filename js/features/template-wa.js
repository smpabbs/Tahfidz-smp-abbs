// ====================================================
// js/features/template-wa.js - TEMPLATE PESAN WHATSAPP
// Pengaturan template pesan WA GLOBAL (dikelola 1 guru,
// dipakai semua guru). Simpan di Supabase app_settings
// + fallback localStorage.
//
// 5 template datar (bukan lagi navigasi 2 level jenis×status) —
// notifikasi submit selalu 1 pesan per input, isinya menyesuaikan
// aktivitas yang dicentang guru:
//   - 'setoran' (label "Ya — Aktivitas Tercatat"): dipakai kapan pun
//     minimal 1 aktivitas (Ziyadah/Murajaah/Tilawah) dicentang & berhasil
//     disimpan dengan status "ya". Variabel {aktivitas} adalah blok
//     OTOMATIS (bukan diketik admin) — cuma memuat aktivitas yang benar2
//     dicentang, lihat TemplateWaManager.buildAktivitasBlock().
//   - 'tidak'/'sertifikasi'/'lainnya': dipakai saat Ziyadah (satu2nya
//     jenis yang punya Status) diisi bukan "ya" — menurut alur form,
//     ini cuma terjadi saat siswa tidak masuk sama sekali, jadi Murajaah/
//     Tilawah tidak mungkin ikut tercentang bersamaan (dikonfirmasi user).
//   - 'edit': pesan pembaruan data. DISIAPKAN tapi belum dihubungkan ke
//     tombol Ubah manapun — EditInline.save() saat ini tidak mengirim WA
//     sama sekali (dead sebelum ini juga, cuma sekarang templatenya rapi).
//
// Key penyimpanan (storage key di app_settings.key = `wa_template_<key>`)
// SENGAJA dipertahankan sama dengan sebelum penyederhanaan ini
// (setoran/tidak/sertifikasi/lainnya/edit) supaya template yang sudah
// dikustomisasi guru lewat UI lama tidak hilang. Key lama khusus
// Murajaah/Tilawah (murojaah/tilawah/tidak_murojaah/dst — 8 key) sudah
// mati sejak Murajaah/Tilawah tidak lagi punya Status sendiri; baris
// datanya mungkin masih ada di app_settings tapi tidak lagi dibaca UI ini.
// ====================================================

const TemplateWaManager = {

  // Daftar template — flat, id = key penyimpanan sekaligus.
  TEMPLATES: [
    { id: 'setoran',     label: 'Ya — Aktivitas Tercatat', desc: 'gabungan Ziyadah/Murajaah/Tilawah yang dicentang', ico: '<path d="M8 12.5l2.5 2.5L16 9.5"/><circle cx="12" cy="12" r="9"/>' },
    { id: 'tidak',       label: 'Sakit',                   desc: 'Ziyadah diisi Sakit (siswa tidak masuk)',          ico: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>' },
    { id: 'sertifikasi', label: 'Persiapan Sertifikasi',   desc: 'Ziyadah diisi Persiapan Sertifikasi',              ico: '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>' },
    { id: 'lainnya',     label: 'Lainnya',                 desc: 'Ziyadah diisi Lainnya (alasan bebas)',             ico: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>' },
    { id: 'edit',        label: 'Pembaruan Data',          desc: 'saat data diedit (belum dikirim otomatis)',        ico: '<path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 4v5h-5"/>' }
  ],

  // Variabel yang tersedia per template (dipakai utk chip "sisipkan variabel").
  // {alasan} tetap disediakan (nilai tetap) utk 'tidak'/'sertifikasi' walau
  // default barunya tidak memakainya lagi — supaya template versi LAMA yang
  // mungkin sudah dikustomisasi guru (masih pakai {alasan}) tetap tampil
  // benar, bukan {alasan} mentah tak terganti.
  VARS: {
    setoran:     ['nama', 'kelas', 'guru', 'tanggal', 'aktivitas'],
    tidak:       ['nama', 'kelas', 'guru', 'tanggal', 'alasan'],
    sertifikasi: ['nama', 'kelas', 'guru', 'tanggal', 'alasan', 'juz', 'capaian'],
    lainnya:     ['nama', 'kelas', 'guru', 'tanggal', 'alasan'],
    edit:        ['nama', 'kelas', 'guru', 'jenis', 'perubahan']
  },

  // Template BAWAAN (default) per key penyimpanan
  DEFAULTS: {
    setoran: `Assalamu'alaikum ayah/bunda ananda {nama},

Alhamdulillah, hari ini ananda {nama} (kelas {kelas}) telah menyelesaikan aktivitas KBM berikut:

{aktivitas}
Terus dukung semangat ananda {nama} untuk istiqamah ya.

Wassalamu'alaikum,
{guru}`,

    tidak: `Assalamu'alaikum ayah/bunda ananda {nama},

Hari ini ananda {nama} (kelas {kelas}) tidak dapat mengikuti setoran karena:

📝 Sakit

Kami doakan semoga ananda lekas sehat dan bisa kembali menghafal.

Wassalamu'alaikum,
{guru}`,

    sertifikasi: `Assalamu'alaikum ayah/bunda ananda {nama},

Hari ini ananda {nama} kelas {kelas} sedang mempersiapkan sertifikasi juz {juz} dengan capaian {capaian}.

Semoga ananda dimudahkan dan lancar dalam proses sertifikasinya.

Wassalamu'alaikum,
{guru}`,

    lainnya: `Assalamu'alaikum ayah/bunda ananda {nama},

Hari ini ananda {nama} (kelas {kelas}) tidak mengikuti setoran dengan keterangan:

📝 {alasan}

Wassalamu'alaikum,
{guru}`,

    edit: `Assalamu'alaikum ayah/bunda ananda {nama},

Ada pembaruan data *{jenis}* ananda {nama} (kelas {kelas}):

{perubahan}
Terima kasih atas perhatiannya.

Wassalamu'alaikum,
{guru}`
  },

  // Data contoh untuk preview & test kirim — bentuknya SAMA dengan data
  // asli (ayatDari/ayatSampai/keterangan/jenis/menghafal), bukan bentuk
  // pre-format terpisah, supaya buildMessage() tidak butuh cabang khusus
  // preview vs data sungguhan.
  SAMPLE_AKTIVITAS: [
    { jenis: 'ziyadah', nama: 'Ahmad Ramadhan', kelas: '7A', guru: 'Ust. Abdurrahman', tanggal: '10/08/2026', menghafal: 'ya', surat: '67. Al-Mulk', ayatDari: 1, ayatSampai: 10, keterangan: 'Mumtaz', baris: 15 },
    { jenis: 'murojaah', nama: 'Ahmad Ramadhan', kelas: '7A', guru: 'Ust. Abdurrahman', tanggal: '10/08/2026', menghafal: 'ya', surat: '78. An-Naba', ayatDari: 1, ayatSampai: 20, keterangan: 'Jayid Jiddan', baris: 20 }
  ],
  SAMPLE: {
    nama: 'Ahmad Ramadhan', kelas: '7A', guru: 'Ust. Abdurrahman', tanggal: '10/08/2026',
    alasan: 'Sakit (demam)', jenis: 'Ziyadah', juz: '5', capaian: '1/2 B'
  },
  SAMPLE_EDIT_OLD: { tanggal: '08/08/2026', surat: "An-Naba'", ayatDari: 1, ayatSampai: 8, keterangan: 'Jayid', baris: 10, jenis: 'ziyadah' },
  SAMPLE_EDIT_NEW: { nama: 'Ahmad Ramadhan', kelas: '7A', guru: 'Ust. Abdurrahman', tanggal: '10/08/2026', surat: 'Al-Mulk', ayatDari: 1, ayatSampai: 10, keterangan: 'Mumtaz', baris: 15, jenis: 'ziyadah' },

  templateAktif: 'setoran',

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
   * Ambil template aktif untuk satu key (user punya > default)
   * @param {string} key - key penyimpanan, mis. 'setoran' | 'edit'
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
   * Format rentang ayat ("1 - 10" atau "1")
   */
  formatAyat(data) {
    if (data.ayatDari !== null && data.ayatDari !== undefined && data.ayatDari !== '' &&
        data.ayatSampai !== null && data.ayatSampai !== undefined && data.ayatSampai !== '') {
      return `${data.ayatDari} - ${data.ayatSampai}`;
    }
    if (data.ayatDari !== null && data.ayatDari !== undefined && data.ayatDari !== '') return String(data.ayatDari);
    return '-';
  },

  /**
   * Satuan tampilan per jenis — Ziyadah "baris", Murajaah/Tilawah "halaman".
   * @param {string} jenis
   * @returns {string}
   */
  unitFor(jenis) {
    return (jenis === 'murojaah' || jenis === 'tilawah') ? 'halaman' : 'baris';
  },

  /**
   * Buang nomor urut surat ("72. Al-Jinn" → "Al-Jinn") — cuma untuk
   * ditampilkan di pesan WA (mengganggu dibaca orang tua), penyimpanan
   * di database & tabel Hasil Data tetap apa adanya (dengan nomor).
   * @param {string} nama
   * @returns {string}
   */
  stripSuratNumber(nama) {
    return String(nama || '').replace(/^\d+\.\s*/, '');
  },

  /**
   * Baris "Surat"+"Ayat" satu aktivitas. `d.surat` tersimpan sebagai
   * "Awal → Akhir" saat lintas surat (sama persis konvensi tabel desktop
   * — lihat createRow di output-table.js). Kalau lintas surat, tampilkan
   * "Dari X ayat Y sampai Z ayat W" dalam satu baris; kalau surat sama,
   * pakai format Surat/Ayat terpisah seperti biasa. Nomor urut surat
   * dibuang di sini (stripSuratNumber) supaya tidak mengganggu di WA.
   * @param {object} d - data aktivitas (surat/ayatDari/ayatSampai)
   * @returns {string}
   */
  formatSuratLines(d) {
    const parts = (d.surat || '').split('→').map(s => this.stripSuratNumber(s.trim())).filter(Boolean);
    const suratAwal = parts[0] || '-';
    const suratAkhir = parts.length > 1 ? parts[1] : null;

    if (suratAkhir) {
      const ayatAwal = (d.ayatDari !== null && d.ayatDari !== undefined && d.ayatDari !== '') ? d.ayatDari : '-';
      const ayatAkhir = (d.ayatSampai !== null && d.ayatSampai !== undefined && d.ayatSampai !== '') ? d.ayatSampai : '-';
      return `📖 Surat  : Dari ${suratAwal} ayat ${ayatAwal} sampai ${suratAkhir} ayat ${ayatAkhir}\n`;
    }
    return `📖 Surat  : ${suratAwal}\n📍 Ayat   : ${this.formatAyat(d)}\n`;
  },

  /**
   * Bangun blok {aktivitas} — satu bagian per aktivitas yang dicentang &
   * berstatus "ya", urut Ziyadah→Murajaah→Tilawah, dipisah baris kosong.
   * Aktivitas yang tidak dicentang (tidak ada di dataList) otomatis tidak
   * muncul sama sekali.
   * @param {object[]} dataList - array data aktivitas (bentuk formData)
   * @returns {string}
   */
  buildAktivitasBlock(dataList) {
    const list = Array.isArray(dataList) ? dataList : [dataList];
    return AppConfig.POSITIVE_JENIS
      .map(jenis => list.find(d => (d.jenis || 'ziyadah') === jenis && d.menghafal === 'ya'))
      .filter(Boolean)
      .map(d => {
        const label = (AppConfig.JENIS_LABELS[d.jenis] || d.jenis).toUpperCase();
        return `*${label}*\n${this.formatSuratLines(d)}⭐ Nilai   : ${d.keterangan || '-'}\n📊 Jumlah : ${d.baris || 0} ${this.unitFor(d.jenis)}\n`;
      })
      .join('\n');
  },

  /**
   * Bangun blok {perubahan} untuk template edit — cuma baris field yang
   * benar-benar berubah yang muncul.
   * @param {object} oldData
   * @param {object} newData
   * @returns {string}
   */
  buildPerubahanBlock(oldData, newData) {
    const lines = [];
    if ((oldData.tanggal || '') !== (newData.tanggal || '')) {
      lines.push(`• Tanggal : ${oldData.tanggal || '-'} → ${newData.tanggal || '-'}`);
    }
    if ((oldData.surat || '') !== (newData.surat || '')) {
      lines.push(`• Surat   : ${oldData.surat || '-'} → ${newData.surat || '-'}`);
    }
    const ayatLama = this.formatAyat(oldData);
    const ayatBaru = this.formatAyat(newData);
    if (ayatLama !== ayatBaru) {
      lines.push(`• Ayat    : ${ayatLama} → ${ayatBaru}`);
    }
    if ((oldData.keterangan || '') !== (newData.keterangan || '')) {
      lines.push(`• Nilai   : ${oldData.keterangan || '-'} → ${newData.keterangan || '-'}`);
    }
    if ((oldData.baris || 0) !== (newData.baris || 0)) {
      lines.push(`• Jumlah  : ${oldData.baris || 0} → ${newData.baris || 0} ${this.unitFor(newData.jenis)}`);
    }
    return lines.length ? lines.join('\n') + '\n' : '(tidak ada perubahan)\n';
  },

  /**
   * Format pesan final dari data setoran (dipakai notification.js)
   * @param {string} key - key penyimpanan: 'setoran'|'tidak'|'sertifikasi'|'lainnya'|'edit'
   * @param {object|object[]} data - data aktivitas (array utk 'setoran'), atau data baru (utk 'edit')
   * @param {object} [oldData] - data lama, khusus key 'edit'
   * @returns {string}
   */
  buildMessage(key, data, oldData) {
    const template = this.getTemplate(key);
    let vars;

    if (key === 'edit') {
      const jenisLabel = AppConfig.JENIS_LABELS[data.jenis] || data.jenis || AppConfig.JENIS_LABELS.ziyadah;
      vars = {
        nama: data.nama || '', kelas: data.kelas || '', guru: data.guru || '',
        jenis: jenisLabel,
        perubahan: this.buildPerubahanBlock(oldData || {}, data)
      };
    } else if (key === 'lainnya') {
      const first = Array.isArray(data) ? data[0] : data;
      vars = {
        nama: first.nama || '', kelas: first.kelas || '', guru: first.guru || '',
        tanggal: first.tanggal || '', alasan: first.alasan || 'Tidak disebutkan'
      };
    } else if (key === 'tidak') {
      const first = Array.isArray(data) ? data[0] : data;
      // alasan bernilai tetap (bukan diketik guru) — cuma disediakan supaya
      // template versi lama yang masih pakai {alasan} tetap tampil benar.
      vars = {
        nama: first.nama || '', kelas: first.kelas || '', guru: first.guru || '', tanggal: first.tanggal || '',
        alasan: 'Sakit'
      };
    } else if (key === 'sertifikasi') {
      const first = Array.isArray(data) ? data[0] : data;
      vars = {
        nama: first.nama || '', kelas: first.kelas || '', guru: first.guru || '', tanggal: first.tanggal || '',
        alasan: 'Persiapan sertifikasi tahfidz',
        juz: first.juz || '-', capaian: first.capaian || '-'
      };
    } else { // 'setoran'
      const list = Array.isArray(data) ? data : [data];
      const first = list[0] || {};
      vars = {
        nama: first.nama || '', kelas: first.kelas || '', guru: first.guru || '', tanggal: first.tanggal || '',
        aktivitas: this.buildAktivitasBlock(list)
      };
    }

    return this.renderTemplate(template, vars);
  },

  /**
   * Simpan template (Supabase + localStorage)
   */
  async simpan() {
    const key = this.templateAktif;
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
   * Kembalikan template aktif ke bawaan
   */
  async resetDefault() {
    const key = this.templateAktif;
    const label = this.currentLabel();
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
    const message = this.buildSampleMessage(this.templateAktif);
    const token = AppConfig.FONNTE_DEFAULT_TOKEN;

    NotificationService.info('📤 Mengirim test ke ' + no + ' ...', 5000);
    const sent = await NotificationService.sendWhatsApp(no, message, token);
    if (sent) {
      NotificationService.success('✅ Test terkirim ke ' + no + ' (cek WhatsApp)');
    } else {
      NotificationService.error('❌ Test GAGAL dikirim. Cek token Fonnte / koneksi.');
    }
  },

  /**
   * Bangun pesan pakai data contoh (SAMPLE) untuk key yang diberikan —
   * dipakai bareng oleh preview() & kirimTest().
   * @param {string} key
   * @returns {string}
   */
  buildSampleMessage(key) {
    if (key === 'edit') {
      return this.buildMessage('edit', { ...this.SAMPLE_EDIT_NEW }, { ...this.SAMPLE_EDIT_OLD });
    }
    if (key === 'setoran') {
      return this.buildMessage('setoran', this.SAMPLE_AKTIVITAS.map(d => ({ ...d })));
    }
    return this.buildMessage(key, { ...this.SAMPLE });
  },

  // ==========================================
  // RENDER UI
  // ==========================================

  /**
   * Render semua (daftar template, breadcrumb, chips, editor, preview)
   */
  renderAll() {
    this.renderTemplates();
    this.renderBreadcrumb();
    this.renderChips();
    const editor = document.getElementById('tplEditor');
    if (editor) editor.value = this.getTemplate(this.templateAktif);
    this.preview();
  },

  renderTemplates() {
    const container = document.getElementById('tplJenis');
    if (!container) return;
    container.innerHTML = '';
    this.TEMPLATES.forEach(t => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tpl-jenis-btn' + (t.id === this.templateAktif ? ' active' : '');
      btn.innerHTML = `<span class="tpl-j-ico"><svg viewBox="0 0 24 24">${t.ico}</svg></span>${t.label}<span class="tpl-j-sub">${t.desc}</span>`;
      btn.onclick = () => this.pilihTemplate(t.id);
      container.appendChild(btn);
    });
  },

  currentLabel() {
    return this.TEMPLATES.find(t => t.id === this.templateAktif)?.label || this.templateAktif;
  },

  renderBreadcrumb() {
    const el = document.getElementById('tplBreadcrumb');
    if (!el) return;
    el.innerHTML = `Mengedit template: <b>${this.currentLabel()}</b>`;
  },

  renderChips() {
    const container = document.getElementById('tplChips');
    if (!container) return;
    container.innerHTML = '';
    (this.VARS[this.templateAktif] || []).forEach(v => {
      const chip = document.createElement('span');
      chip.className = 'tpl-chip';
      chip.textContent = '{' + v + '}';
      chip.title = 'Klik untuk menyisipkan';
      chip.onclick = () => this.sisipkan('{' + v + '}');
      container.appendChild(chip);
    });
  },

  /**
   * Pindah template aktif
   */
  pilihTemplate(id) {
    this.templateAktif = id;
    this.renderTemplates();
    this.renderBreadcrumb();
    this.renderChips();
    const editor = document.getElementById('tplEditor');
    if (editor) editor.value = this.getTemplate(this.templateAktif);
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
      ? this.buildSampleMessage(this.templateAktif)
      : '(template kosong — sistem akan memakai pesan bawaan)';
    if (timeEl) {
      const now = new Date();
      timeEl.textContent = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    }
  }
};

console.log('✅ TemplateWaManager module loaded');
