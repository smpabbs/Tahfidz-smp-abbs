// ====================================================
// js/features/target.js - TARGET MANAGEMENT
// ====================================================

const TargetManager = {
  
  /**
   * Inisialisasi
   */
  async init() {
    this.loadFromStorage();
    console.log('✅ TargetManager initialized');
  },

  /**
   * Load target dari Supabase + localStorage
   */
  async loadFromStorage() {
    AppState.targetSiswa = await StorageService.loadTargetData();
  },

  /**
   * Simpan target ke Supabase + localStorage
   */
  async saveToStorage() {
    await StorageService.saveTargetData(AppState.targetSiswa);
  },

  /**
   * Load tabel target
   */
  loadTable() {
    const kelas = document.getElementById('targetKelas')?.value;
    const tbody = document.getElementById('targetTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!kelas) {
      tbody.innerHTML = '<tr><td colspan="6" class="no-data">Pilih kelas untuk mengelola target</td></tr>';
      return;
    }

    // Ambil data siswa untuk kelas tersebut
    const siswaList = AppState.dataSiswa[kelas] || [];
    
    if (siswaList.length === 0) {
      // Coba dari masterSiswa
      const masterSiswa = AppState.masterSiswa.filter(s => s.kelas_name === kelas);
      masterSiswa.forEach(s => this.addTargetRow(tbody, s.nama, kelas));
    } else {
      siswaList.forEach(s => this.addTargetRow(tbody, s.nama, kelas));
    }
  },

  /**
   * Tambah baris target
   */
  addTargetRow(tbody, nama, kelas) {
    const target = this.getTarget(nama, kelas);
    const progress = this.calculateProgress(nama, kelas);
    const progressClass = this.getProgressClass(progress.percentage);

    const row = document.createElement('tr');
    row.className = progressClass;

    row.innerHTML = `
      <td><strong>${nama}</strong></td>
      <td>
        <input type="number" class="target-input" value="${target.targetMingguan}" 
               min="5" max="50" data-nama="${nama}" data-kelas="${kelas}">
        <small>baris/minggu</small>
      </td>
      <td>
        <div class="target-detail-inputs">
          <select class="target-surat-input" data-nama="${nama}" data-kelas="${kelas}" data-type="suratMulai">
            <option value="">-- Surat Mulai --</option>
            ${DropdownManager.generateSuratOptions(target.suratMulai)}
          </select>
          <input type="number" class="target-ayat-input" data-nama="${nama}" data-kelas="${kelas}" 
                 data-type="ayatMulai" value="${target.ayatMulai}" placeholder="Ayat" min="1">
          <span>→</span>
          <select class="target-surat-input" data-nama="${nama}" data-kelas="${kelas}" data-type="suratSelesai">
            <option value="">-- Surat Selesai --</option>
            ${DropdownManager.generateSuratOptions(target.suratSelesai)}
          </select>
          <input type="number" class="target-ayat-input" data-nama="${nama}" data-kelas="${kelas}" 
                 data-type="ayatSelesai" value="${target.ayatSelesai}" placeholder="Ayat" min="1">
        </div>
      </td>
      <td>
        <div class="progress-info">
          <div class="progress-bar">
            <div class="progress-fill" style="width:${progress.percentage}%"></div>
          </div>
          <div class="progress-text">${progress.actual}/${progress.target} baris (${progress.percentage}%)</div>
        </div>
      </td>
      <td><small>-</small></td>
      <td>
        <button class="btn-save" onclick="TargetManager.updateSingle('${nama}', '${kelas}')" title="Simpan">💾</button>
      </td>
    `;

    tbody.appendChild(row);
  },

  /**
   * Dapatkan target siswa
   */
  getTarget(nama, kelas) {
    const kelasTargets = AppState.targetSiswa[kelas] || [];
    const found = kelasTargets.find(t => t.nama === nama);
    return {
      targetMingguan: found?.targetMingguan || AppConfig.DEFAULT_TARGET_BARIS,
      suratMulai: found?.suratMulai || '',
      ayatMulai: found?.ayatMulai || '',
      suratSelesai: found?.suratSelesai || '',
      ayatSelesai: found?.ayatSelesai || ''
    };
  },

  /**
   * Hitung progress minggu ini
   */
  calculateProgress(nama, kelas) {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    const weekData = AppState.tahfidzRecords.filter(d =>
      d.nama === nama &&
      d.kelas === kelas &&
      d.tanggal >= monday.toISOString().split('T')[0] &&
      d.tanggal <= saturday.toISOString().split('T')[0] &&
      d.menghafal === 'ya'
    );

    const actual = weekData.reduce((sum, d) => sum + (parseFloat(d.baris) || 0), 0);
    const target = this.getTarget(nama, kelas).targetMingguan;
    const percentage = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;

    return { actual, target, percentage };
  },

  /**
   * Dapatkan class CSS untuk progress
   */
  getProgressClass(percentage) {
    if (percentage >= 100) return 'target-achieved';
    if (percentage >= 70) return 'target-good';
    if (percentage >= 40) return 'target-average';
    return 'target-needs-attention';
  },

  /**
   * Update target single siswa
   */
  async updateSingle(nama, kelas) {
    const input = document.querySelector(`.target-input[data-nama="${nama}"][data-kelas="${kelas}"]`);
    if (!input) return;

    const newTarget = parseInt(input.value);
    if (isNaN(newTarget) || newTarget < AppConfig.MIN_TARGET_BARIS || newTarget > AppConfig.MAX_TARGET_BARIS) {
      NotificationService.warning(`Target harus antara ${AppConfig.MIN_TARGET_BARIS}-${AppConfig.MAX_TARGET_BARIS} baris!`);
      input.focus();
      return;
    }

    // Kumpulkan detail target
    const suratMulai = document.querySelector(`[data-nama="${nama}"][data-kelas="${kelas}"][data-type="suratMulai"]`)?.value || '';
    const ayatMulai = document.querySelector(`[data-nama="${nama}"][data-kelas="${kelas}"][data-type="ayatMulai"]`)?.value || '';
    const suratSelesai = document.querySelector(`[data-nama="${nama}"][data-kelas="${kelas}"][data-type="suratSelesai"]`)?.value || '';
    const ayatSelesai = document.querySelector(`[data-nama="${nama}"][data-kelas="${kelas}"][data-type="ayatSelesai"]`)?.value || '';

    // Simpan ke state
    if (!AppState.targetSiswa[kelas]) {
      AppState.targetSiswa[kelas] = [];
    }

    const idx = AppState.targetSiswa[kelas].findIndex(t => t.nama === nama);
    const entry = {
      nama,
      targetMingguan: newTarget,
      suratMulai,
      ayatMulai,
      suratSelesai,
      ayatSelesai,
      lastUpdated: new Date().toISOString()
    };

    if (idx >= 0) {
      AppState.targetSiswa[kelas][idx] = entry;
    } else {
      AppState.targetSiswa[kelas].push(entry);
    }

    await this.saveToStorage();
    this.loadTable();
    NotificationService.success(`Target ${nama} diperbarui!`);
  },

  /**
   * Simpan semua target
   */
  async saveAll() {
    const inputs = document.querySelectorAll('.target-input');
    let count = 0;

    inputs.forEach(input => {
      const nama = input.dataset.nama;
      const kelas = input.dataset.kelas;
      const newTarget = parseInt(input.value);

      if (nama && kelas && !isNaN(newTarget) && newTarget >= 5 && newTarget <= 50) {
        if (!AppState.targetSiswa[kelas]) AppState.targetSiswa[kelas] = [];
        
        const idx = AppState.targetSiswa[kelas].findIndex(t => t.nama === nama);
        const entry = {
          nama,
          targetMingguan: newTarget,
          suratMulai: document.querySelector(`[data-nama="${nama}"][data-kelas="${kelas}"][data-type="suratMulai"]`)?.value || '',
          ayatMulai: document.querySelector(`[data-nama="${nama}"][data-kelas="${kelas}"][data-type="ayatMulai"]`)?.value || '',
          suratSelesai: document.querySelector(`[data-nama="${nama}"][data-kelas="${kelas}"][data-type="suratSelesai"]`)?.value || '',
          ayatSelesai: document.querySelector(`[data-nama="${nama}"][data-kelas="${kelas}"][data-type="ayatSelesai"]`)?.value || '',
          lastUpdated: new Date().toISOString()
        };

        if (idx >= 0) AppState.targetSiswa[kelas][idx] = entry;
        else AppState.targetSiswa[kelas].push(entry);
        count++;
      }
    });

    if (count > 0) {
      await this.saveToStorage();
      NotificationService.success(`${count} target berhasil disimpan!`);
    } else {
      NotificationService.warning('Tidak ada target yang diubah');
    }
  },

  /**
   * Export target ke CSV
   */
  exportCSV() {
    if (Object.keys(AppState.targetSiswa).length === 0) {
      NotificationService.warning('Tidak ada data target!');
      return;
    }

    const rows = [['No', 'Kelas', 'Nama', 'Target', 'Surat Mulai', 'Ayat Mulai', 'Surat Selesai', 'Ayat Selesai']];
    let no = 1;

    Object.entries(AppState.targetSiswa).forEach(([kelas, list]) => {
      list.forEach(t => {
        rows.push([no++, kelas, t.nama, t.targetMingguan, t.suratMulai, t.ayatMulai, t.suratSelesai, t.ayatSelesai]);
      });
    });

    const csv = rows.map(r => r.map(f => `"${f}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `target-siswa-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    NotificationService.success('Target berhasil di-export!');
  },

  /**
   * Placeholder untuk rekap
   */
/**
   * Kirim rekap mingguan ke 1 kelas
   */
/**
   * Kirim rekap mingguan ke 1 kelas
   */
  async sendClassReport() {
    const kelas = document.getElementById('targetKelas')?.value;
    
    // Validasi: kelas harus dipilih
    if (!kelas) {
      NotificationService.warning('⚠️ Pilih kelas terlebih dahulu!');
      return;
    }

    // Ambil data siswa untuk kelas tersebut
    const siswaList = this.getSiswaListForKelas(kelas);
    
    if (siswaList.length === 0) {
      NotificationService.warning(`⚠️ Tidak ada siswa di kelas ${kelas}!`);
      return;
    }

    // Hitung data mingguan untuk semua siswa
    const weeklyData = this.calculateWeeklyDataForKelas(kelas, siswaList);
    
    if (Object.keys(weeklyData).length === 0) {
      NotificationService.warning(`⚠️ Tidak ada data hafalan minggu ini untuk kelas ${kelas}!`);
      return;
    }

    // Dapatkan token untuk setiap siswa (guru yang paling sering input)
    const tokenMap = this.getSmartTokenMap(kelas);

    // Tampilkan dialog konfirmasi
    const totalSiswa = Object.keys(weeklyData).length;
    const estimasiWaktu = Math.ceil(totalSiswa * 2 / 60); // rata-rata 2 menit per siswa
    
    const confirmMessage = 
      `📧 KIRIM REKAPAN MINGGUAN\n\n` +
      `Kelas       : ${kelas}\n` +
      `Total Siswa : ${totalSiswa} orang\n` +
      `Estimasi    : ${estimasiWaktu} menit\n` +
      `Delay       : 1-3 menit acak/siswa\n\n` +
      `Token yang digunakan:\n` +
      `• Otomatis (guru yang paling sering input)\n\n` +
      `⚠️ Perhatian:\n` +
      `• Pastikan token Fonnte masih aktif\n` +
      `• Nomor WhatsApp siswa harus valid\n` +
      `• Proses tidak bisa dibatalkan\n\n` +
      `Lanjutkan pengiriman?`;

    if (!confirm(confirmMessage)) {
      console.log('❌ Pengiriman dibatalkan oleh user');
      return;
    }

    // Mulai pengiriman
    await this.startSendingReports(kelas, weeklyData, tokenMap);
  },

 /**
   * Dapatkan daftar siswa untuk kelas tertentu
   */
  getSiswaListForKelas(kelas) {
    // Coba dari dataSiswa dulu
    if (AppState.dataSiswa[kelas] && AppState.dataSiswa[kelas].length > 0) {
      return AppState.dataSiswa[kelas];
    }
    
    // Fallback ke masterSiswa
    return AppState.masterSiswa
      .filter(s => s.kelas_name === kelas)
      .map(s => ({
        nama: s.nama,
        whatsapp: s.whatsapp || ''
      }));
  },

  /**
   * Hitung data mingguan untuk semua siswa dalam 1 kelas
   */
  calculateWeeklyDataForKelas(kelas, siswaList) {
    // Hitung rentang minggu ini
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    
    const startDate = monday.toISOString().split('T')[0];
    const endDate = saturday.toISOString().split('T')[0];

    const weeklyData = {};

    siswaList.forEach(siswa => {
      // Filter data minggu ini
      const dataMingguIni = AppState.tahfidzRecords.filter(d =>
        d.nama === siswa.nama &&
        d.kelas === kelas &&
        d.tanggal >= startDate &&
        d.tanggal <= endDate &&
        d.menghafal === 'ya'
      );

      if (dataMingguIni.length === 0) {
        // Skip siswa yang tidak ada data
        return;
      }

      const totalBaris = dataMingguIni.reduce((sum, d) => sum + (parseFloat(d.baris) || 0), 0);
      const target = this.getTarget(siswa.nama, kelas);
      const percentage = target.targetMingguan > 0 
        ? Math.round((totalBaris / target.targetMingguan) * 100) 
        : 0;

      weeklyData[siswa.nama] = {
        nama: siswa.nama,
        whatsapp: siswa.whatsapp,
        totalBaris,
        target: target.targetMingguan,
        percentage,
        sesiCount: dataMingguIni.length,
        entries: dataMingguIni
      };
    });

    return weeklyData;
  },

  /**
   * Dapatkan token guru yang paling sering input untuk setiap siswa
   */
  getSmartTokenMap(kelas) {
    const tokenMap = {};
    
    // Ambil semua siswa di kelas ini
    const siswaList = this.getSiswaListForKelas(kelas);
    
    siswaList.forEach(siswa => {
      // Ambil data 30 hari terakhir
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentData = AppState.tahfidzRecords.filter(d =>
        d.nama === siswa.nama &&
        d.kelas === kelas &&
        new Date(d.tanggal) >= thirtyDaysAgo
      );

      if (recentData.length === 0) {
        // Pakai token default
        tokenMap[siswa.nama] = AppConfig.FONNTE_DEFAULT_TOKEN;
        return;
      }

      // Hitung frekuensi guru
      const guruCount = {};
      recentData.forEach(d => {
        if (d.guru && d.tokenGuru) {
          if (!guruCount[d.guru]) {
            guruCount[d.guru] = { count: 0, token: d.tokenGuru };
          }
          guruCount[d.guru].count++;
        }
      });

      // Cari guru dengan input terbanyak
      let maxCount = 0;
      let bestToken = AppConfig.FONNTE_DEFAULT_TOKEN;
      
      Object.values(guruCount).forEach(g => {
        if (g.count > maxCount) {
          maxCount = g.count;
          bestToken = g.token;
        }
      });

      tokenMap[siswa.nama] = bestToken;
    });

    return tokenMap;
  },

  /**
   * Format pesan rekap mingguan
   */
  formatWeeklyMessage(data) {
    const namaBulan = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    const tglMulai = `${monday.getDate()} ${namaBulan[monday.getMonth()]} ${monday.getFullYear()}`;
    const tglSelesai = `${saturday.getDate()} ${namaBulan[saturday.getMonth()]} ${saturday.getFullYear()}`;

    let message = `Assalamu'alaikum ayah/bunda ananda ${data.nama}...\n\n`;
    message += `Semoga ayah/bunda dan ananda ${data.nama} selalu dalam lindungan Allah.\n\n`;
    
    message += `📊 *LAPORAN HAFALAN MINGGU INI*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    message += `📅 Periode    : ${tglMulai} - ${tglSelesai}\n`;
    message += `📝 Target     : ${data.target} baris/minggu\n`;
    message += `📈 Pencapaian : ${data.totalBaris} baris (${data.percentage}%)\n`;
    
    // Status
    if (data.percentage >= 100) {
      message += `✅ Status     : TARGET TERCAPAI! 🎉\n`;
    } else if (data.percentage >= 70) {
      message += `💫 Status     : Hampir Tercapai\n`;
    } else if (data.percentage >= 40) {
      message += `📚 Status     : Masih Berjuang\n`;
    } else {
      message += `🔴 Status     : Perlu Perhatian Khusus\n`;
    }
    
    message += `🔄 Sesi       : ${data.sesiCount} kali menghafal\n\n`;
    
    // Motivasi
    if (data.percentage >= 100) {
      message += `Masya Allah! Ananda ${data.nama} berhasil mencapai target minggu ini. Pertahankan semangatnya ya! 🌟\n\n`;
    } else if (data.percentage >= 70) {
      message += `Alhamdulillah, ananda ${data.nama} sudah hampir mencapai target. Tetap semangat, tinggal sedikit lagi! 💪\n\n`;
    } else {
      message += `Mari terus dampingi ananda ${data.nama} dalam menghafal Al-Quran. Setiap ayat adalah investasi akhirat. 🤲\n\n`;
    }
    
    message += `Terima kasih atas kerjasamanya.\n`;
    message += `Wassalamu'alaikum warahmatullahi wabarakatuh.`;

    return message;
  },

  /**
   * Mulai pengiriman bertahap
   */
  async startSendingReports(kelas, weeklyData, tokenMap) {
    const siswaNames = Object.keys(weeklyData);
    const total = siswaNames.length;
    let success = 0;
    let failed = 0;

    // Tampilkan notifikasi loading
    const notif = NotificationService.loading(`📧 Mempersiapkan pengiriman ke ${total} siswa...`);

    console.log(`🚀 Starting weekly report for kelas ${kelas}`);
    console.log(`   Total siswa: ${total}`);

    for (let i = 0; i < siswaNames.length; i++) {
      const nama = siswaNames[i];
      const data = weeklyData[nama];
      const currentNo = i + 1;

      try {
        // Update notifikasi progress
        const messageEl = document.querySelector('.notification-loading .notification-message');
        if (messageEl) {
          messageEl.innerHTML = `
            📧 Mengirim rekap...<br>
            <small>${currentNo}/${total}: ${nama}</small><br>
            <small>✅ ${success} | ❌ ${failed}</small>
          `;
        }

        // Format pesan
        const message = this.formatWeeklyMessage(data);
        const token = tokenMap[nama] || AppConfig.FONNTE_DEFAULT_TOKEN;
        const whatsapp = data.whatsapp;

        // Validasi nomor WhatsApp
        if (!whatsapp || whatsapp.trim() === '') {
          console.warn(`⚠️ ${nama}: No WhatsApp, skipped`);
          failed++;
          continue;
        }

        // Kirim WhatsApp
        console.log(`📱 Sending to ${nama} (${currentNo}/${total})...`);
        const sent = await NotificationService.sendWhatsApp(whatsapp, message, token);

        if (sent) {
          success++;
          console.log(`✅ Sent to ${nama}`);
        } else {
          failed++;
          console.error(`❌ Failed to send to ${nama}`);
        }

      } catch (error) {
        console.error(`❌ Error sending to ${nama}:`, error);
        failed++;
      }

      // Delay acak 1-3 menit (kecuali untuk siswa terakhir)
      if (currentNo < total) {
        const delay = Math.floor(Math.random() * 120000) + 60000; // 60.000 - 180.000 ms
        const delayMenit = Math.ceil(delay / 60000);
        
        console.log(`⏳ Waiting ${delayMenit} menit sebelum kirim berikutnya...`);
        
        // Update notifikasi
        const messageEl = document.querySelector('.notification-loading .notification-message');
        if (messageEl) {
          messageEl.innerHTML = `
            📧 Mengirim rekap...<br>
            <small>${currentNo}/${total} terkirim</small><br>
            <small>⏳ Menunggu ${delayMenit} menit...</small><br>
            <small>✅ ${success} | ❌ ${failed}</small>
          `;
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Sembunyikan notifikasi loading
    NotificationService.hide();

    // Tampilkan hasil akhir
    const resultMsg = 
      `📊 PENGIRIMAN SELESAI\n\n` +
      `Kelas  : ${kelas}\n` +
      `✅ Berhasil : ${success} siswa\n` +
      `❌ Gagal    : ${failed} siswa\n\n` +
      `Total : ${total} siswa`;

    NotificationService.show(
      failed > 0 ? 'warning' : 'success',
      resultMsg,
      10000
    );

    console.log(`📊 Final result: ✅${success} ❌${failed} (total: ${total})`);
  },
  /**
   * Fitur Rekap Semua dihapus - tampilkan notifikasi
   */
  sendAllReports() {
    NotificationService.warning(
      '⚠️ Fitur "Rekap Semua" telah dinonaktifkan.\n\n' +
      'Gunakan fitur "Rekap Kelas" untuk mengirim rekap per kelas.\n' +
      'Hal ini untuk menghindari spam dan memastikan pengiriman lebih terkelola.',
      8000
    );
  },
};

console.log('✅ TargetManager module loaded');