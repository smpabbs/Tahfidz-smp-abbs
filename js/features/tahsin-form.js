// ====================================================
// js/features/tahsin-form.js - FORM "SESI TAHSIN TEORI"
// ====================================================
// Tab baru di samping "Input Data". Guru menandai kelompoknya
// (murid bimbingan) yang TIDAK setoran pada tanggal tertentu karena
// Tahsin Teori. Datanya masuk tabel `tahfidz_pengecualian` —
// bukan `tahfidz_records` (bukan setoran, dan TANPA notif WA).
// Konsep input setoran per-siswa TIDAK dipakai di sini: satu klik
// menandai satu kelompok utuh (berdasarkan patokan guru pengampu).

const TahsinForm = {

  patokan: {},        // { kelas: { normNamaSiswa: namaGuru } }
  kelompokByKelas: {},// { kelas: [ {guru, siswa:[nama,...]} ] }
  pengecualian: [],   // daftar yang sudah ada (untuk status "sudah tandai")

  /**
   * Normalisasi nama guru (sama persis dengan lapor/index.html) agar
   * cocok dengan kunci patokan guru pengampu dari Excel.
   */
  normNameKey(s) {
    return (s || '')
      .trim()
      .replace(/[\u2018\u2019'"\u201C\u201D`]/g, '')
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/\s+/g, ' ');
  },

  /**
   * Muat patokan guru pengampu dari app_settings.
   * Bentuk di DB: { "9E": { "Ahmad Fauzan": "Ustadz Andi", ... } }
   */
  async loadPatokan() {
    try {
      const raw = await DatabaseService.loadAppSetting('patokan_guru_pengampu');
      const norm = {};
      Object.entries(raw || {}).forEach(([kelas, map]) => {
        norm[kelas] = {};
        Object.entries(map || {}).forEach(([nama, mapValue]) => {
          norm[kelas][this.normNameKey(nama)] = mapValue;
        });
      });
      this.patokan = norm;
      console.log('? TahsinForm patokan loaded');
    } catch (err) {
      console.warn('? TahsinForm patokan gagal dimuat:', err.message);
      this.patokan = {};
    }
  },

  /**
   * Bangun kelompok per kelas dari master_siswa + patokan.
   * Siswa tanpa patokan dikumpulkan ke "Tanpa Kelompok" agar tidak
   * hilang diam-diam dari daftar.
   */
  buildKelompok() {
    this.kelompokByKelas = {};
    const byKelas = {};
    AppState.masterSiswa.forEach(s => {
      if (!s.kelas_name) return;
      if (!byKelas[s.kelas_name]) byKelas[s.kelas_name] = [];
      byKelas[s.kelas_name].push(s.nama);
    });

    Object.entries(byKelas).forEach(([kelas, namaList]) => {
      const guruMap = this.patokan[kelas] || {};
      const grup = {};
      namaList.forEach(nama => {
        const guru = guruMap[this.normNameKey(nama)];
        const key = guru || 'Tanpa Kelompok';
        if (!grup[key]) grup[key] = [];
        grup[key].push(nama);
      });
      // Urutkan guru (Tanpa Kelompok di akhir)
      const sorted = Object.entries(grup).sort((a, b) => {
        if (a[0] === 'Tanpa Kelompok') return 1;
        if (b[0] === 'Tanpa Kelompok') return -1;
        return a[0].localeCompare(b[0], 'id');
      });
      this.kelompokByKelas[kelas] = sorted.map(([guru, siswa]) => ({
        guru, siswa: siswa.sort((a, b) => a.localeCompare(b, 'id'))
      }));
    });
  },

  /**
   * Refill dropdown kelas dari masterKelas.
   */
  refreshKelas() {
    const sel = document.getElementById('tahsinKelas');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">-- Pilih Kelas --</option>';
    AppState.masterKelas.forEach(k => {
      const o = document.createElement('option');
      o.value = k.kelas_name;
      o.textContent = k.kelas_name;
      sel.appendChild(o);
    });
    if (cur) sel.value = cur;
  },

  /**
   * Isi tanggal default = hari ini.
   */
  setDefaultTanggal() {
    const inp = document.getElementById('tahsinTanggal');
    if (inp && !inp.value) inp.value = new Date().toISOString().split('T')[0];
  },

  /**
   * Render daftar kelompok utk kelas terpilih. Semua kelompok tampil
   * sebagai CHECKLIST (boleh lebih dari satu). Default: kelompok dengan
   * guru yang sama dengan pilihan guru di tab Input ("kelompok Anda").
   */
  renderKelompok(kelas) {
    const host = document.getElementById('tahsinKelompok');
    const chips = document.getElementById('tahsinAnggota');
    if (!host) return;

    const grupList = (this.kelompokByKelas[kelas] || []).length > 0
      ? this.kelompokByKelas[kelas]
      : [];

    if (!kelas || grupList.length === 0) {
      host.innerHTML = '<div class="tahsin-empty">Pilih kelas terlebih dahulu untuk melihat kelompok.</div>';
      if (chips) chips.style.display = 'none';
      return;
    }

    // Guru yang dipilih saat ini di tab Input (jadikan "kelompok Anda")
    const guruInput = document.getElementById('guru')?.value || '';

    host.innerHTML = '';
    grupList.forEach((grp, idx) => {
      const already = this.sudahDitandai(kelas, grp.guru);
      const isYou = this.normNameKey(grp.guru) === this.normNameKey(guruInput);

      const wrap = document.createElement('label');
      wrap.className = 'tahsin-grp' + (isYou ? ' on' : '');
      wrap.style.cursor = 'pointer';
      wrap.innerHTML = `
        <input type="checkbox" name="tahsinKelompok" value="${idx}" ${isYou ? 'checked' : ''}>
        <span class="tg-body">
          <span class="tg-nama">${this.esc(grp.guru)}</span>
          <span class="tg-sub">${grp.siswa.length} siswa${already ? ' · sudah ditandai' : ''}</span>
        </span>
        ${already ? '<span class="tg-badge">✓ tandai</span>' : ''}
      `;
      host.appendChild(wrap);
    });

    host.onchange = (e) => {
      if (!e.target.matches('input[name="tahsinKelompok"]')) return;
      e.target.closest('.tahsin-grp').classList.toggle('on', e.target.checked);
      this.showAnggota(grupList);
    };

    this.showAnggota(grupList);
  },

  /**
   * Apakah pengecualian untuk (kelas,guru) sudah ada?
   */
  sudahDitandai(kelas, guru) {
    return this.pengecualian.some(p =>
      p.kelas === kelas &&
      p.guru === guru &&
      p.alasan === 'Tahsin Teori'
    );
  },

  /**
   * Ikhtisar kelompok yang dicentang — dipakai utk label simpan & chips.
   */
  selectedGroups(grupList) {
    return [...document.querySelectorAll('input[name="tahsinKelompok"]:checked')]
      .map(cb => grupList[parseInt(cb.value)])
      .filter(Boolean);
  },

  /**
   * Tampilkan chip anggota utk semua kelompok yang dicentang.
   */
  showAnggota(grupList) {
    const chips = document.getElementById('tahsinAnggota');
    if (!chips) return;
    const sel = this.selectedGroups(grupList);
    if (sel.length === 0) { chips.style.display = 'none'; return; }
    const total = sel.reduce((a, g) => a + g.siswa.length, 0);
    chips.style.display = 'flex';
    chips.innerHTML = sel.map(g => `
      <span class="tchip" style="width:100%;background:transparent;border:0;padding:0 0 2px;font-weight:800;color:var(--accent-deep)">${this.esc(g.guru)} — ${g.siswa.length} siswa</span>
      ${g.siswa.map(n => `<span class="tchip">${this.esc(n)}</span>`).join('')}
    `).join('');
    chips.dataset.total = total;
  },

  /**
   * Isi tanggal dari → sampai saat toggle rentang aktif.
   */
  toggleRange() {
    const box = document.getElementById('tahsinRange');
    if (!box) return;
    const on = document.getElementById('tahsinRangeOn')?.checked;
    box.style.display = on ? 'flex' : 'none';
    // default dari = tanggal utama
    const t = document.getElementById('tahsinTanggal')?.value;
    if (on && t) {
      const d = document.getElementById('tahsinDari');
      const s = document.getElementById('tahsinSampai');
      if (d && !d.value) d.value = t;
      if (s && !s.value) s.value = t;
    }
  },

  /**
   * Ambil daftar tanggal efektif (rentang atau tanggal tunggal).
   */
  renderTanggal() {
    const t = document.getElementById('tahsinTanggal')?.value;
    if (!t) return [];
    if (document.getElementById('tahsinRangeOn')?.checked) {
      const dari = document.getElementById('tahsinDari')?.value;
      const sampai = document.getElementById('tahsinSampai')?.value;
      if (!dari || !sampai) return [t];
      if (dari > sampai) return [t];
      const out = [];
      const cur = new Date(dari);
      const end = new Date(sampai);
      while (cur <= end) {
        out.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }
      return out;
    }
    return [t];
  },

  /**
   * Simpan pengecualian tahsin (satu baris per tanggal per kelompok).
   * Sekali klik menyimpan SEMUA kelompok yang dicentang.
   */
  async save() {
    const kelas = document.getElementById('tahsinKelas')?.value;
    const tanggal = document.getElementById('tahsinTanggal')?.value;
    const guru = document.getElementById('guru')?.value;

    if (!kelas) { NotificationService.warning('Pilih kelas terlebih dahulu!'); return; }
    if (!tanggal) { NotificationService.warning('Tanggal harus diisi!'); return; }

    const grupList = this.kelompokByKelas[kelas] || [];
    const sel = this.selectedGroups(grupList);
    if (sel.length === 0) { NotificationService.warning('Centang minimal satu kelompok guru pengampu!'); return; }

    const tanggalList = this.renderTanggal();

    try {
      let saved = 0;
      for (const grp of sel) {
        const guruPenanggung = grp.guru === 'Tanpa Kelompok' ? guru : grp.guru;
        for (const tgl of tanggalList) {
          await DatabaseService.savePengecualian({
            kelas,
            tanggal: tgl,
            alasan: 'Tahsin Teori',
            guru: guruPenanggung || '',
            dibuat_oleh: guru || ''
          });
          saved++;
        }
      }
      this.pengecualian = await DatabaseService.loadPengecualian();
      const totalSiswa = sel.reduce((a, g) => a + g.siswa.length, 0);
      const guruList = sel.map(g => this.singkat(g.guru)).join(', ');
      NotificationService.success(
        `✓ ${totalSiswa} siswa (${guruList}) dikecualikan ${tanggalList.length} hari — tanpa notif WA`,
        6000
      );
      this.renderKelompok(kelas);
    } catch (err) {
      NotificationService.error('? Gagal menyimpan: ' + (err.message || 'unknown error'));
    }
  },

  /**
   * Nama pendek utk pesan: Ustadzah → Ustzh, Ustadz → Ust.
   */
  singkat(g) {
    return String(g || '').replace('Ustadzah ', 'Ustzh. ').replace('Ustadz ', 'Ust. ');
  },

  /**
   * Siapkan elemen saat tab dibuka / data selesai dimuat.
   */
  async refresh() {
    if (Object.keys(this.patokan).length === 0) {
      await this.loadPatokan();
      this.buildKelompok();
      this.refreshKelas();
    }
    if (this.pengecualian.length === 0) {
      try { this.pengecualian = await DatabaseService.loadPengecualian(); }
      catch (e) { this.pengecualian = []; }
    }
    this.setDefaultTanggal();
    const kelas = document.getElementById('tahsinKelas')?.value;
    if (kelas) this.renderKelompok(kelas);
    this.toggleRange();
  },

  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }
};

// ==========================================
// EXPORT GLOBALS (untuk onclick HTML)
// ==========================================
window.TahsinForm = TahsinForm;
window.tahsinKelasChange = () => {
  const k = document.getElementById('tahsinKelas')?.value;
  if (k) TahsinForm.renderKelompok(k);
};
window.toggleTahsinRange = () => TahsinForm.toggleRange();
window.saveTahsin = () => TahsinForm.save();

console.log('? TahsinForm module loaded');