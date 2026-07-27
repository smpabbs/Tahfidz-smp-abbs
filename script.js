// script.js - APLIKASI TAHFIDZ DENGAN FITUR LENGKAP
// ====================================================

// 🎯 KONFIGURASI & INISIALISASI
// ====================================================

// Inisialisasi Supabase client
const supabase = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

// Data aplikasi
let dataSiswa = {};
let dataGuru = [];
let dataKelas = [];
let dataBulan = [];
let dataKeterangan = [];
let dataSurat = [];
let appData = [];
let lastSyncTime = null;
let isOnline = true;
let editingData = null;
let isEditMode = false;
let currentEditingRow = null;

// Data target siswa
let targetSiswa = {};

// Anti-pause configuration
const ANTIPAUZE_CONFIG = {
  lastActiveKey: 'tahfidz_last_active',
  checkInterval: 1 * 60 * 60 * 1000, // 1 jam
  wakeupInterval: 5 * 24 * 60 * 60 * 1000 // 5 hari
};

// 🎯 TAB NAVIGATION
// ====================================================

function showTab(tab) {
  console.log('🔍 Switching to tab:', tab);
  
  try {
    // Hide all tab contents
    document.querySelectorAll(".tab-content").forEach((c) => {
      c.classList.remove("active");
    });
    
    // Remove active class from all tabs
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.remove("active");
    });
    
    // Show selected tab content
    const tabContent = document.getElementById(tab);
    if (tabContent) {
      tabContent.classList.add("active");
      console.log('✅ Tab content activated:', tab);
    } else {
      console.error('❌ Tab content not found:', tab);
    }
    
    // Activate selected tab button
    const tabButtons = document.querySelectorAll('.tab');
    tabButtons.forEach(button => {
      // Simple check - if button's onclick contains the tab name
      const onclickText = button.getAttribute('onclick') || '';
      if (onclickText.includes(`'${tab}'`) || onclickText.includes(`"${tab}"`)) {
        button.classList.add("active");
        console.log('✅ Tab button activated');
      }
    });
    
    // Load data for specific tabs
    switch(tab) {
      case 'output':
        setTimeout(() => {
          if (typeof loadDataFromSupabase === 'function') {
            loadDataFromSupabase();
          }
        }, 500);
        break;
        
      case 'target':
        setTimeout(() => {
          if (typeof loadTargetSiswa === 'function') {
            loadTargetSiswa();
          }
        }, 500);
        break;
        
      case 'master':
        setTimeout(() => {
          if (typeof initMasterData === 'function') {
            initMasterData();
          } else {
            console.error('❌ initMasterData function not found');
          }
        }, 500);
        break;
    }
    
  } catch (error) {
    console.error('❌ Error in showTab:', error);
    showNotification('error', 'Error switching tab: ' + error.message);
  }
}

// 🎯 FORM HELPER FUNCTIONS
// ====================================================

function updateToken() {
  const guruSelect = document.getElementById("guru");
  if (!guruSelect) return;
  
  const selectedOption = guruSelect.options[guruSelect.selectedIndex];
  if (selectedOption && selectedOption.getAttribute('data-token')) {
    const token = selectedOption.getAttribute('data-token');
    document.getElementById("tokenGuru").value = token;
  } else {
    document.getElementById("tokenGuru").value = FONNTE_CONFIG.DEFAULT_TOKEN;
  }
}

function updateNamaSiswa() {
  const kelas = document.getElementById("kelas").value;
  const siswaSelect = document.getElementById("siswa");
  
  if (!siswaSelect) return;
  
  siswaSelect.innerHTML = '<option value="">-- Pilih Siswa --</option>';
  
  if (kelas && dataSiswa[kelas]) {
    dataSiswa[kelas].forEach((siswa) => {
      const opt = document.createElement("option");
      opt.value = siswa.nama;
      opt.textContent = siswa.nama;
      opt.setAttribute('data-whatsapp', siswa.whatsapp || '');
      siswaSelect.appendChild(opt);
    });
  }
  
  document.getElementById("whatsapp").value = "";
}

function updateWhatsApp() {
  const siswaSelect = document.getElementById("siswa");
  if (!siswaSelect) return;
  
  const selectedOption = siswaSelect.options[siswaSelect.selectedIndex];
  if (selectedOption) {
    const whatsapp = selectedOption.getAttribute('data-whatsapp') || '';
    document.getElementById("whatsapp").value = whatsapp;
  }
}

function toggleMenghafalFields() {
  const val = document.getElementById("menghafal").value;
  const hafalanFields = document.getElementById("hafalanFields");
  const alasanField = document.getElementById("alasanField");
  
  if (!hafalanFields || !alasanField) return;
  
  if (val === "ya") {
    hafalanFields.classList.remove("hidden");
    alasanField.classList.add("hidden");
    if (document.getElementById("baris")) document.getElementById("baris").required = true;
    if (document.getElementById("alasan")) document.getElementById("alasan").required = false;
  } else if (val === "tidak") {
    hafalanFields.classList.add("hidden");
    alasanField.classList.remove("hidden");
    if (document.getElementById("baris")) document.getElementById("baris").required = false;
    if (document.getElementById("alasan")) document.getElementById("alasan").required = true;
  } else {
    hafalanFields.classList.add("hidden");
    alasanField.classList.add("hidden");
    if (document.getElementById("baris")) document.getElementById("baris").required = false;
    if (document.getElementById("alasan")) document.getElementById("alasan").required = false;
  }
}

function setDefaultTanggal() {
  const today = new Date().toISOString().split('T')[0];
  const tanggalInput = document.getElementById('tanggal');
  if (tanggalInput) {
    tanggalInput.value = today;
  }
}

// 🎯 FONNTE WHATSAPP NOTIFICATION
// ====================================================

/**
 * Kirim notifikasi WhatsApp via Fonnte
 */
async function sendWhatsAppNotification(recipient, message, fonnteToken = FONNTE_CONFIG.DEFAULT_TOKEN) {
  try {
    console.log('📱 Mengirim notifikasi WhatsApp...', { 
      recipient, 
      messageLength: message.length 
    });
    
    if (!fonnteToken || !recipient || !message) {
      console.error('❌ Data notifikasi tidak lengkap');
      return false;
    }

    // Validasi dan format nomor WhatsApp
    let phoneNumber = recipient.trim().replace(/\D/g, '');
    
    // Format ke 62xxx (tanpa +)
    if (phoneNumber.startsWith('0')) {
      phoneNumber = '62' + phoneNumber.slice(1);
    } else if (phoneNumber.startsWith('8')) {
      phoneNumber = '62' + phoneNumber;
    }
    
    // Pastikan panjang nomor valid
    if (phoneNumber.length < 10 || phoneNumber.length > 15) {
      console.error('❌ Nomor WhatsApp tidak valid:', phoneNumber);
      return false;
    }

    // Payload sesuai dokumentasi Fonnte
    const payload = new URLSearchParams();
    payload.append('target', phoneNumber);
    payload.append('message', message);
    payload.append('delay', '2');
    payload.append('countryCode', '62');

    const response = await fetch(`${FONNTE_CONFIG.BASE_URL}/send`, {
      method: 'POST',
      headers: {
        'Authorization': fonnteToken,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload
    });

    let result;
    try {
      result = await response.json();
    } catch (e) {
      result = { status: false, raw: await response.text() };
    }
    console.log('📱 Response Fonnte:', result);

    // Lebih toleran: status bisa boolean, number (200), atau string "true"
    if (result.status == true || result.status == 200 || result.success == true || result.message_id) {
      console.log('✅ Notifikasi WhatsApp berhasil dikirim');
      return true;
    } else {
      console.error('❌ Fonnte API error:', result);
      return false;
    }

  } catch (error) {
    console.error('❌ Error sending WhatsApp notification:', error.message);
    // Jangan false alert — network error biasa terjadi
    return false;
  }
}

/**
 * Format pesan untuk data tahfidz baru
 */
function formatTahfidzMessage(formData, isNew = true) {
  let message = `Assalamu'alaikum ayah/bunda ananda ${formData.nama},\n\n`;
  message += `Alhamdulillah, hari ini ananda ${formData.nama} telah menyelesaikan setoran hafalan dengan baik:\n\n`;
  
  message += `📖 Surat       : ${formData.surat || '-'}\n`;
  
  if (formData.ayatDari && formData.ayatSampai) {
    message += `📍 Ayat        : ${formData.ayatDari} - ${formData.ayatSampai}\n`;
  } else if (formData.ayatDari) {
    message += `📍 Ayat        : ${formData.ayatDari}\n`;
  } else {
    message += `📍 Ayat        : -\n`;
  }
  
  message += `📊 Jumlah      : ${formData.baris} baris\n`;
  message += `⭐ Nilai       : ${formData.keterangan || '-'}\n`;
  message += `👨‍🏫 Guru        : ${formData.guru}\n\n`;

  // Pesan motivasi berdasarkan nilai
  const motivasi = getMotivasiMessage(formData.keterangan);
  message += `${motivasi}\n\n`;

  if (formData.catatan) {
    message += `💌 Catatan guru:\n"${formData.catatan}"\n\n`;
  }

  message += `Terus dukung semangat menghafal ananda ${formData.nama} di rumah ya ayah/bunda.\n\n`;
  message += `Wassalamu'alaikum,\n${formData.guru}`;

  return message;
}

/**
 * Format pesan untuk tidak menghafal
 */
function formatTidakMenghafalMessage(formData) {
  let message = `Assalamu'alaikum ayah/bunda ananda ${formData.nama},\n\n`;
  message += `Hari ini ananda ${formData.nama} tidak dapat mengikuti setoran hafalan karena:\n`;
  message += `📝 ${formData.alasan || 'Tidak disebutkan'}\n\n`;
  
  message += `Kami doakan semoga ananda lekas sehat dan bisa kembali menghafal bersama teman-teman.\n\n`;

  if (formData.catatan) {
    message += `💌 Catatan guru:\n"${formData.catatan}"\n\n`;
  }

  message += `Bila perlu konsultasi, silakan hubungi kami.\n\n`;
  message += `Wassalamu'alaikum,\n${formData.guru}`;

  return message;
}

/**
 * Format pesan untuk edit data
 */
function formatEditMessage(oldData, newData) {
  let message = `Assalamu'alaikum ayah/bunda ananda ${newData.nama},\n\n`;
  message += `Ada pembaruan data hafalan ananda ${newData.nama}:\n\n`;
  
  message += `🔄 Perubahan:\n`;
  
  // Tanggal
  if (oldData.tanggal !== newData.tanggal) {
    message += `• Tanggal : ${formatTanggalLengkap(oldData.tanggal)} → ${formatTanggalLengkap(newData.tanggal)}\n`;
  }
  
  // Surat
  if (oldData.surat !== newData.surat) {
    message += `• Surat   : ${oldData.surat || '-'} → ${newData.surat || '-'}\n`;
  }
  
  // Ayat
  const oldAyat = oldData.ayatDari && oldData.ayatSampai ? 
    `${oldData.ayatDari}-${oldData.ayatSampai}` : (oldData.ayatDari || '-');
  const newAyat = newData.ayatDari && newData.ayatSampai ? 
    `${newData.ayatDari}-${newData.ayatSampai}` : (newData.ayatDari || '-');
  
  if (oldAyat !== newAyat) {
    message += `• Ayat    : ${oldAyat} → ${newAyat}\n`;
  }
  
  // Keterangan
  if (oldData.keterangan !== newData.keterangan) {
    message += `• Nilai   : ${oldData.keterangan || '-'} → ${newData.keterangan || '-'}\n`;
  }
  
  // Baris
  if (oldData.baris !== newData.baris) {
    message += `• Jumlah  : ${oldData.baris || 0} → ${newData.baris || 0} baris\n`;
  }

  message += `\n`;

  // Pesan perkembangan
  if (newData.baris > oldData.baris) {
    message += `Alhamdulillah, terjadi peningkatan hafalan!\n\n`;
  } else if (newData.keterangan === 'Mumtaz' && oldData.keterangan !== 'Mumtaz') {
    message += `Selamat! Nilai ananda meningkat menjadi Mumtaz!\n\n`;
  }

  message += `Terima kasih atas perhatiannya.\n\n`;
  message += `Wassalamu'alaikum,\n${newData.guru}`;

  return message;
}

/**
 * Fungsi utama untuk memilih format pesan yang tepat
 */
function formatWhatsAppMessage(formData, isNew = true, isEdit = false, oldData = null) {
  if (isEdit && oldData) {
    return formatEditMessage(oldData, formData);
  } else if (formData.menghafal === 'tidak') {
    return formatTidakMenghafalMessage(formData);
  } else {
    return formatTahfidzMessage(formData, isNew);
  }
}

/**
 * Pesan motivasi berdasarkan keterangan
 */
function getMotivasiMessage(keterangan) {
  const motivasi = {
    'Mumtaz': 'Lancar dan tartil sempurna! Pertahankan ya! 🌟',
    'Jayid Jiddan': 'Hasil yang sangat baik! Terus semangat! 💫',
    'Jayid': 'Bagus! Tingkatkan lagi kualitas bacaannya! 📚'
  };
  return motivasi[keterangan] || 'Terus berlatih untuk hasil yang lebih baik! 🤲';
}

// 🎯 TARGET MANAGEMENT
// ====================================================

/**
 * Load data target dari localStorage + Supabase
 */
async function loadTargetData() {
  try {
    // Coba load dari Supabase dulu
    try {
      const { data, error } = await supabase
        .from('tahfidz_targets')
        .select('*');

      if (!error && data && data.length > 0) {
        // Convert format Supabase → format app
        targetSiswa = {};
        data.forEach(item => {
          if (!targetSiswa[item.kelas]) {
            targetSiswa[item.kelas] = [];
          }
          targetSiswa[item.kelas].push({
            nama: item.nama,
            targetMingguan: item.target_mingguan,
            suratMulai: item.surat_mulai || '',
            ayatMulai: item.ayat_mulai || '',
            suratSelesai: item.surat_selesai || '',
            ayatSelesai: item.ayat_selesai || ''
          });
        });
        console.log('✅ Targets loaded from Supabase');
        return;
      }
    } catch (supaError) {
      console.warn('⚠️ Supabase target load failed, trying localStorage:', supaError.message);
    }

    // Fallback ke localStorage
    const savedTargets = localStorage.getItem('tahfidz_targets');
    if (savedTargets) {
      targetSiswa = JSON.parse(savedTargets);
      console.log('✅ Targets loaded from localStorage');
    } else {
      targetSiswa = {};
      console.log('⚠️ No targets found, using empty object');
    }
  } catch (error) {
    console.error('Error loading targets:', error);
    targetSiswa = {};
  }
}

/**
 * Get target siswa dengan detail
 */
function getStudentTarget(nama, kelas) {
  try {
    const targetData = targetSiswa[kelas]?.find(s => s.nama === nama);
    const targetMingguan = parseFloat(targetData?.targetMingguan) || 15;
    
    return {
      targetMingguan: targetMingguan,
      suratMulai: targetData?.suratMulai || '',
      ayatMulai: targetData?.ayatMulai || '',
      suratSelesai: targetData?.suratSelesai || '',
      ayatSelesai: targetData?.ayatSelesai || ''
    };
  } catch (error) {
    console.error('Error getting student target:', error);
    return {
      targetMingguan: 15,
      suratMulai: '',
      ayatMulai: '',
      suratSelesai: '',
      ayatSelesai: ''
    };
  }
}

/**
 * Hitung progress minggu INI (real-time)
 */
function calculateCurrentWeekProgress(nama, kelas) {
  try {
    // Hitung tanggal Senin dan Sabtu minggu INI
    const today = new Date();
    const currentDay = today.getDay(); // 0=Minggu, 1=Senin, ..., 6=Sabtu
    const monday = new Date(today);
    
    // Hitung hari Senin (jika hari ini Minggu, mundur 6 hari)
    if (currentDay === 0) {
      monday.setDate(today.getDate() - 6);
    } else {
      monday.setDate(today.getDate() - currentDay + 1);
    }
    
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 6); // Minggu sampai Sabtu
    
    // Format ke YYYY-MM-DD
    const mondayStr = monday.toISOString().split('T')[0];
    const saturdayStr = saturday.toISOString().split('T')[0];
    
    // Hitung hari tersisa
    const daysLeft = Math.max(0, 6 - (today.getDay() || 7) + 1);
    
    // Filter data minggu INI
    const thisWeekData = appData.filter(item => 
      item.nama === nama && 
      item.kelas === kelas &&
      item.tanggal >= mondayStr && 
      item.tanggal <= saturdayStr &&
      item.menghafal === 'ya'
    );
    
    const actual = thisWeekData.reduce((sum, item) => sum + (parseFloat(item.baris) || 0), 0);
    const targetData = getStudentTarget(nama, kelas);
    const target = parseFloat(targetData.targetMingguan) || 15;
    
    // Hitung percentage dengan aman
    let percentage = 0;
    if (target > 0) {
      percentage = Math.min(100, Math.round((actual / target) * 100));
    }
    
    return {
      actual: actual,
      target: target,
      percentage: percentage,
      daysLeft: daysLeft,
      weekRange: `${formatTanggal(mondayStr)} - ${formatTanggal(saturdayStr)}`
    };
    
  } catch (error) {
    console.error('Error calculating progress:', error);
    return {
      actual: 0,
      target: 15,
      percentage: 0,
      daysLeft: 6,
      weekRange: 'Minggu ini'
    };
  }
}

/**
 * Dapatkan class CSS berdasarkan progress
 */
function getProgressClass(percentage) {
  const percent = parseFloat(percentage) || 0;
  
  if (percent >= 100) return 'target-achieved';
  if (percent >= 70) return 'target-good';
  if (percent >= 40) return 'target-average';
  return 'target-needs-attention';
}

/**
 * Simpan data target ke localStorage + Supabase
 */
async function saveTargetData() {
  try {
    localStorage.setItem('tahfidz_targets', JSON.stringify(targetSiswa));
    console.log('✅ Targets saved to localStorage');

    // Juga simpan ke Supabase biar gak ilang
    try {
      // Hapus semua target dulu, lalu insert ulang
      const { error: delError } = await supabase
        .from('tahfidz_targets')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000'); // delete all

      // Insert semua target
      const rows = [];
      Object.entries(targetSiswa).forEach(([kelas, siswaList]) => {
        siswaList.forEach(s => {
          rows.push({
            nama: s.nama,
            kelas: kelas,
            target_mingguan: s.targetMingguan || 15,
            surat_mulai: s.suratMulai || '',
            ayat_mulai: s.ayatMulai || '',
            surat_selesai: s.suratSelesai || '',
            ayat_selesai: s.ayatSelesai || ''
          });
        });
      });

      if (rows.length > 0) {
        // Insert in batches of 50
        for (let i = 0; i < rows.length; i += 50) {
          const batch = rows.slice(i, i + 50);
          const { error: insError } = await supabase
            .from('tahfidz_targets')
            .upsert(batch, { onConflict: 'nama,kelas' });

          if (insError) {
            console.error('❌ Supabase target insert error:', insError.message);
          }
        }
        console.log(`✅ ${rows.length} targets saved to Supabase`);
      }
    } catch (supaError) {
      console.warn('⚠️ Supabase target save failed (offline?):', supaError.message);
    }

  } catch (error) {
    console.error('Error saving targets:', error);
    showNotification('error', 'Gagal menyimpan target ke penyimpanan lokal');
  }
}

/**
 * Update target untuk satu siswa
 */
async function updateSingleTarget(nama, kelas) {
  try {
    const targetInput = document.querySelector(`input[data-nama="${nama}"][data-kelas="${kelas}"]`);
    const suratMulaiInput = document.querySelector(`select[data-nama="${nama}"][data-kelas="${kelas}"][data-type="suratMulai"]`);
    const ayatMulaiInput = document.querySelector(`input[data-nama="${nama}"][data-kelas="${kelas}"][data-type="ayatMulai"]`);
    const suratSelesaiInput = document.querySelector(`select[data-nama="${nama}"][data-kelas="${kelas}"][data-type="suratSelesai"]`);
    const ayatSelesaiInput = document.querySelector(`input[data-nama="${nama}"][data-kelas="${kelas}"][data-type="ayatSelesai"]`);
    
    if (!targetInput || !suratMulaiInput || !ayatMulaiInput || !suratSelesaiInput || !ayatSelesaiInput) {
      showNotification('error', 'Input target tidak lengkap!');
      return;
    }

    const newTarget = parseInt(targetInput.value);
    const suratMulai = suratMulaiInput.value;
    const ayatMulai = ayatMulaiInput.value;
    const suratSelesai = suratSelesaiInput.value;
    const ayatSelesai = ayatSelesaiInput.value;

    if (isNaN(newTarget) || newTarget < 5 || newTarget > 50) {
      showNotification('error', 'Target harus antara 5-50 baris!');
      targetInput.focus();
      return;
    }

    // Validasi detail target
    if (suratMulai && !ayatMulai) {
      showNotification('error', 'Ayat mulai harus diisi jika surat mulai dipilih!');
      ayatMulaiInput.focus();
      return;
    }

    if (suratSelesai && !ayatSelesai) {
      showNotification('error', 'Ayat selesai harus diisi jika surat selesai dipilih!');
      ayatSelesaiInput.focus();
      return;
    }

    // Simpan ke targetSiswa
    if (!targetSiswa[kelas]) {
      targetSiswa[kelas] = [];
    }

    const existingIndex = targetSiswa[kelas].findIndex(s => s.nama === nama);
    if (existingIndex !== -1) {
      targetSiswa[kelas][existingIndex] = {
        ...targetSiswa[kelas][existingIndex],
        targetMingguan: newTarget,
        suratMulai: suratMulai,
        ayatMulai: ayatMulai,
        suratSelesai: suratSelesai,
        ayatSelesai: ayatSelesai,
        lastUpdated: new Date().toISOString()
      };
    } else {
      targetSiswa[kelas].push({
        nama: nama,
        targetMingguan: newTarget,
        suratMulai: suratMulai,
        ayatMulai: ayatMulai,
        suratSelesai: suratSelesai,
        ayatSelesai: ayatSelesai,
        lastUpdated: new Date().toISOString()
      });
    }

    // Simpan ke localStorage
    saveTargetData();
    
    // Update progress display
    const progress = calculateCurrentWeekProgress(nama, kelas);
    updateProgressDisplay(nama, kelas, progress);
    
    showNotification('success', `Target ${nama} diperbarui!`);
    
  } catch (error) {
    console.error('Error updating target:', error);
    showNotification('error', 'Gagal memperbarui target!');
  }
}

/**
 * Simpan semua target sekaligus
 */
async function saveAllTargets() {
  try {
    const inputs = document.querySelectorAll('.target-input');
    let updatedCount = 0;

    for (const input of inputs) {
      const nama = input.getAttribute('data-nama');
      const kelas = input.getAttribute('data-kelas');
      const newTarget = parseInt(input.value);
      
      const suratMulaiInput = document.querySelector(`select[data-nama="${nama}"][data-kelas="${kelas}"][data-type="suratMulai"]`);
      const ayatMulaiInput = document.querySelector(`input[data-nama="${nama}"][data-kelas="${kelas}"][data-type="ayatMulai"]`);
      const suratSelesaiInput = document.querySelector(`select[data-nama="${nama}"][data-kelas="${kelas}"][data-type="suratSelesai"]`);
      const ayatSelesaiInput = document.querySelector(`input[data-nama="${nama}"][data-kelas="${kelas}"][data-type="ayatSelesai"]`);

      if (nama && kelas && !isNaN(newTarget) && newTarget >= 5 && newTarget <= 50) {
        if (!targetSiswa[kelas]) {
          targetSiswa[kelas] = [];
        }

        const existingIndex = targetSiswa[kelas].findIndex(s => s.nama === nama);
        if (existingIndex !== -1) {
          targetSiswa[kelas][existingIndex] = {
            ...targetSiswa[kelas][existingIndex],
            targetMingguan: newTarget,
            suratMulai: suratMulaiInput?.value || '',
            ayatMulai: ayatMulaiInput?.value || '',
            suratSelesai: suratSelesaiInput?.value || '',
            ayatSelesai: ayatSelesaiInput?.value || '',
            lastUpdated: new Date().toISOString()
          };
        } else {
          targetSiswa[kelas].push({
            nama: nama,
            targetMingguan: newTarget,
            suratMulai: suratMulaiInput?.value || '',
            ayatMulai: ayatMulaiInput?.value || '',
            suratSelesai: suratSelesaiInput?.value || '',
            ayatSelesai: ayatSelesaiInput?.value || '',
            lastUpdated: new Date().toISOString()
          });
        }
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      saveTargetData();
      showNotification('success', `Berhasil menyimpan ${updatedCount} target siswa!`);
      
      // Reload display untuk update progress
      setTimeout(() => loadTargetSiswa(), 1000);
    } else {
      showNotification('warning', 'Tidak ada target yang perlu disimpan');
    }
    
  } catch (error) {
    console.error('Error saving all targets:', error);
    showNotification('error', 'Gagal menyimpan target!');
  }
}

/**
 * Update tampilan progress
 */
function updateProgressDisplay(nama, kelas, progress) {
  try {
    const row = document.querySelector(`tr:has(input[data-nama="${nama}"][data-kelas="${kelas}"])`);
    if (!row) return;

    const progressBar = row.querySelector('.progress-fill');
    const progressText = row.querySelector('.progress-text');
    const progressDays = row.querySelector('.progress-days');

    // Pastikan percentage valid
    const percentage = isNaN(progress.percentage) ? 0 : Math.max(0, Math.min(100, progress.percentage));
    
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }
    if (progressText) {
      progressText.textContent = `${progress.actual}/${progress.target} baris (${percentage}%)`;
    }
    if (progressDays && progress.daysLeft > 0) {
      progressDays.textContent = `${progress.daysLeft} hari lagi`;
    }

    // Update class untuk warna progress
    row.className = row.className.replace(/target-\w+/g, ''); // Hapus class target lama
    row.classList.add(getProgressClass(percentage));
    
  } catch (error) {
    console.error('Error updating progress display:', error);
  }
}

/**
 * Load daftar siswa untuk dikelola targetnya
 */
function loadTargetSiswa() {
  const kelas = document.getElementById("targetKelas")?.value;
  const tbody = document.getElementById("targetTableBody");
  
  if (!tbody) return;
  
  tbody.innerHTML = "";
  
  if (!kelas || !dataSiswa[kelas]) {
    tbody.innerHTML = `<tr><td colspan="6" class="no-data">Pilih kelas untuk mengelola target</td></tr>`;
    return;
  }

  dataSiswa[kelas].forEach(siswa => {
    const targetData = targetSiswa[kelas]?.find(t => t.nama === siswa.nama);
    const target = getStudentTarget(siswa.nama, kelas);
    const progress = calculateCurrentWeekProgress(siswa.nama, kelas);
    const progressClass = getProgressClass(progress.percentage);
    
    const row = document.createElement('tr');
    if (progressClass) row.className = progressClass;
    
    row.innerHTML = `
      <td><strong>${siswa.nama}</strong></td>
      <td>
        <input type="number" 
               class="target-input" 
               value="${target.targetMingguan}" 
               min="5" max="50" 
               data-nama="${siswa.nama}"
               data-kelas="${kelas}">
        baris/minggu
      </td>
      <td>
        <div class="target-detail-inputs">
          <div class="target-range">
            <select class="target-surat-input" data-nama="${siswa.nama}" data-kelas="${kelas}" data-type="suratMulai">
              <option value="">-- Surat Mulai --</option>
              ${generateSuratOptions(target.suratMulai)}
            </select>
            <input type="number" class="target-ayat-input" data-nama="${siswa.nama}" data-kelas="${kelas}" data-type="ayatMulai" 
                   value="${target.ayatMulai}" placeholder="Ayat" min="1" step="1">
          </div>
          <div class="target-range-separator">→</div>
          <div class="target-range">
            <select class="target-surat-input" data-nama="${siswa.nama}" data-kelas="${kelas}" data-type="suratSelesai">
              <option value="">-- Surat Selesai --</option>
              ${generateSuratOptions(target.suratSelesai)}
            </select>
            <input type="number" class="target-ayat-input" data-nama="${siswa.nama}" data-kelas="${kelas}" data-type="ayatSelesai" 
                   value="${target.ayatSelesai}" placeholder="Ayat" min="1" step="1">
          </div>
        </div>
      </td>
      <td>
        <div class="progress-info">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress.percentage}%"></div>
          </div>
          <div class="progress-text">${progress.actual}/${progress.target} baris (${progress.percentage}%)</div>
          ${progress.daysLeft > 0 ? `<div class="progress-days">${progress.daysLeft} hari lagi</div>` : ''}
        </div>
      </td>
      <td>
        <small>Guru Aktif</small>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn-action btn-save" onclick="updateSingleTarget('${siswa.nama}', '${kelas}')" title="Simpan target">
            💾
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Generate options untuk dropdown surat
 */
function generateSuratOptions(selectedValue) {
  if (!dataSurat || dataSurat.length === 0) {
    return '';
  }
  
  return dataSurat.map(surat => 
    `<option value="${surat.value}" ${surat.value === selectedValue ? 'selected' : ''}>${surat.label}</option>`
  ).join('');
}

/**
 * Fungsi untuk export target ke CSV
 */
function exportTargetToCSV() {
  try {
    if (Object.keys(targetSiswa).length === 0) {
      showNotification('error', 'Tidak ada data target untuk di-export!');
      return;
    }

    const csvData = [];
    const headers = ['No', 'Kelas', 'Nama Siswa', 'Target Mingguan', 'Surat Mulai', 'Ayat Mulai', 'Surat Selesai', 'Ayat Selesai', 'Last Updated'];
    
    csvData.push(headers);
    
    let rowNumber = 1;
    Object.entries(targetSiswa).forEach(([kelas, siswaList]) => {
      siswaList.forEach(siswa => {
        csvData.push([
          rowNumber++,
          kelas,
          siswa.nama,
          siswa.targetMingguan,
          siswa.suratMulai || '',
          siswa.ayatMulai || '',
          siswa.suratSelesai || '',
          siswa.ayatSelesai || '',
          siswa.lastUpdated || ''
        ]);
      });
    });

    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `target-siswa-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('success', 'File target berhasil diunduh!');
    
  } catch (error) {
    console.error('Error exporting targets:', error);
    showNotification('error', 'Gagal mengexport target: ' + error.message);
  }
}

// 🎯 ANTI-PAUSE SYSTEM
// ====================================================

/**
 * System untuk mencegah Supabase pause
 */
function initializeAntiPauseSystem() {
  console.log('🔧 Initializing anti-pause system...');
  updateLastActiveTime();
  
  setInterval(() => {
    checkAndWakeupDatabase();
  }, ANTIPAUZE_CONFIG.checkInterval);
  
  checkAndWakeupDatabase();
}

/**
 * Update waktu terakhir aktivitas
 */
function updateLastActiveTime() {
  localStorage.setItem(ANTIPAUZE_CONFIG.lastActiveKey, new Date().toISOString());
}

/**
 * Cek dan wakeup database jika mendekati 7 hari
 */
async function checkAndWakeupDatabase() {
  try {
    const lastActive = localStorage.getItem(ANTIPAUZE_CONFIG.lastActiveKey);
    
    if (!lastActive) {
      updateLastActiveTime();
      return;
    }
    
    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    const daysInactive = (now - lastActiveDate) / (1000 * 60 * 60 * 24);
    
    console.log(`📊 Database inactive for: ${daysInactive.toFixed(2)} days`);
    
    if (daysInactive > 5) {
      console.log('🔄 Waking up database...');
      await wakeupDatabase();
    }
    
    updateLastActiveTime();
    
  } catch (error) {
    console.error('❌ Anti-pause check failed:', error);
  }
}

/**
 * Wakeup database dengan query ringan
 */
async function wakeupDatabase() {
  try {
    const { data, error } = await supabase
      .from('tahfidz_records')
      .select('id')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    console.log('✅ Database wakeup successful');
    showNotification('success', 'Database connected successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Database wakeup failed:', error);
    return false;
  }
}

// 📦 INISIALISASI APLIKASI
// ====================================================

/**
 * Load semua data saat aplikasi dimulai
 */
async function loadAllData() {
  try {
    console.log('📦 Memuat semua data...');
    
    // Validasi config
    if (!validateSupabaseConfig()) {
      showNotification('error', 'Konfigurasi Supabase belum lengkap!', 10000);
      loadMinimalData();
      return;
    }
    
    // Initialize systems
    initializeAntiPauseSystem();
    await loadTargetData(); // Load target data (now from Supabase + localStorage)
    
    await loadStaticData();
    await loadSuratData();
    
    initAllDropdowns();
    initTahunFilter();
    
    // Test koneksi Supabase
    const connectionOk = await testSupabaseConnection();
    if (connectionOk) {
      await loadDataFromSupabase();
    } else {
      showNotification('warning', 'Koneksi database gagal, menggunakan data lokal');
      loadFromLocalStorage();
    }
    
    setDefaultTanggal();
    
    console.log('✅ Semua data berhasil dimuat');
    
  } catch (error) {
    console.error('❌ Error loading data:', error);
    showNotification('error', 'Error loading data: ' + error.message);
    loadMinimalData();
  }
}

/**
 * Test koneksi Supabase
 */
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('tahfidz_records')
      .select('id')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Supabase connection failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
    return false;
  }
}

/**
 * Load data statis dari JSON lokal
 */
async function loadStaticData() {
  try {
    const response = await fetch('data.json');
    if (!response.ok) throw new Error('File data.json tidak ditemukan');
    
    const jsonData = await response.json();
    dataSiswa = jsonData.dataSiswa || {};
    dataGuru = jsonData.dataGuru || [];
    dataKelas = jsonData.dataKelas || [];
    dataBulan = jsonData.dataBulan || [];
    dataKeterangan = jsonData.dataKeterangan || [];
    
    console.log('✅ data.json loaded successfully');
  } catch (error) {
    console.error('Error loading data.json:', error);
    showNotification('warning', 'File data.json tidak ditemukan, menggunakan data default');
    setDefaultStaticData();
  }
}

/**
 * Load data surat dari JSON
 */
async function loadSuratData() {
  try {
    const suratResponse = await fetch('surat.json');
    if (!suratResponse.ok) throw new Error('File surat.json tidak ditemukan');
    
    const suratData = await suratResponse.json();
    dataSurat = suratData.dataSurat || [];
    
    console.log('✅ surat.json loaded successfully');
  } catch (error) {
    console.error('Error loading surat.json:', error);
    showNotification('warning', 'File surat.json tidak ditemukan, menggunakan data default');
    setDefaultSuratData();
  }
}

/**
 * Set data minimal jika file JSON error
 */
function loadMinimalData() {
  console.log('🔄 Loading minimal data...');
  setDefaultStaticData();
  setDefaultSuratData();
  initAllDropdowns();
  initTahunFilter();
  loadFromLocalStorage();
}

// 🗃️ FUNGSI DATA DEFAULT
// ====================================================

function setDefaultStaticData() {
  dataGuru = [
    {"nama": "Ust. Ahmad", "token": "nCkVWGeAvA9zpBRn4ynh"},
    {"nama": "Ust. Yoki", "token": "nCkVWGeAvA9zpBRn4ynh"}
  ];
  
  dataKelas = [
    {"value": "9A", "label": "9A"},
    {"value": "9B", "label": "9B"}
  ];
  
  dataBulan = [
    {"value": "01", "label": "Januari"},
    {"value": "02", "label": "Februari"},
    {"value": "03", "label": "Maret"}
  ];
  
  dataKeterangan = [
    {"value": "Mumtaz", "label": "Mumtaz"},
    {"value": "Jayid", "label": "Jayid"}
  ];
  
  dataSiswa = {
    "9A": [
      {"nama": "Siswa Contoh 1", "whatsapp": "0859106544812"},
      {"nama": "Siswa Contoh 2", "whatsapp": "0859106544812"}
    ]
  };
}

function setDefaultSuratData() {
  dataSurat = [
    {"value": "1. Al-Fatihah", "label": "1. Al-Fatihah"},
    {"value": "2. Al-Baqarah", "label": "2. Al-Baqarah"},
    {"value": "3. Ali Imran", "label": "3. Ali Imran"}
  ];
}

// 🗄️ SUPABASE DATABASE OPERATIONS
// ====================================================

/**
 * Load semua data dari Supabase
 */
async function loadDataFromSupabase() {
  try {
    console.log('🔄 Loading data dari Supabase...');
    updateSyncStatus('loading', 'Memuat data terbaru...');
    
    const { data, error } = await supabase
      .from('tahfidz_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (data) {
      appData = data.map(item => ({
        id: item.id,
        timestamp: item.created_at,
        guru: item.guru,
        tokenGuru: item.token_guru,
        nama: item.nama,
        kelas: item.kelas,
        whatsapp: item.whatsapp,
        tanggal: item.tanggal,
        baris: parseFloat(item.baris) || 0,
        menghafal: item.menghafal,
        alasan: item.alasan,
        surat: item.surat,
        ayatDari: parseFloat(item.ayat_dari) || null,
        ayatSampai: parseFloat(item.ayat_sampai) || null,
        keterangan: item.keterangan,
        catatan: item.catatan
      }));

      lastSyncTime = new Date();
      isOnline = true;
      updateTable();
      updateSyncStatus('success', `Data terbaru (${appData.length} records)`);
      console.log(`✅ Data loaded from Supabase: ${appData.length} records`);
      
      saveToLocalStorage(appData);
    } else {
      appData = [];
      updateTable();
      updateSyncStatus('warning', 'Tidak ada data di database');
    }
  } catch (error) {
    console.error('❌ Error loading from Supabase:', error);
    isOnline = false;
    updateSyncStatus('error', `Gagal load data: ${error.message}`);
    loadFromLocalStorage();
  }
}

/**
 * Simpan data baru ke Supabase
 */
async function saveDataToSupabase(newData) {
  console.log('💾 Menyimpan data ke Supabase...', newData);
  updateSyncStatus('loading', 'Menyimpan data...');

  try {
    const supabaseData = {
      guru: newData.guru,
      token_guru: newData.tokenGuru,
      nama: newData.nama,
      kelas: newData.kelas,
      whatsapp: newData.whatsapp,
      tanggal: newData.tanggal,
      baris: parseFloat(newData.baris) || 0,
      menghafal: newData.menghafal,
      alasan: newData.alasan,
      surat: newData.surat,
      ayat_dari: parseFloat(newData.ayatDari) || null,
      ayat_sampai: parseFloat(newData.ayatSampai) || null,
      keterangan: newData.keterangan,
      catatan: newData.catatan
    };

    const { data, error } = await supabase
      .from('tahfidz_records')
      .insert([supabaseData])
      .select();

    if (error) {
      throw new Error(`Supabase insert error: ${error.message}`);
    }

    if (data && data.length > 0) {
      const insertedData = data[0];
      appData.unshift({
        id: insertedData.id,
        timestamp: insertedData.created_at,
        ...newData
      });

      updateLastActiveTime();
      updateSyncStatus('success', 'Data berhasil disimpan!');
      setTimeout(() => updateTable(), 1000);
      return true;
    } else {
      throw new Error('No data returned from Supabase');
    }
    
  } catch (error) {
    console.error('❌ Error saving to Supabase:', error);
    updateSyncStatus('error', 'Gagal menyimpan data ke server');
    
    // Fallback ke localStorage
    const dataWithId = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      ...newData
    };
    appData.push(dataWithId);
    saveToLocalStorage(appData);
    
    showNotification('warning', 'Data disimpan secara lokal (offline mode)');
    return false;
  }
}

/**
 * Update data di Supabase
 */
async function updateDataInSupabase(updatedData) {
  console.log('✏️ Mengupdate data di Supabase...', updatedData);
  updateSyncStatus('loading', 'Mengupdate data...');

  try {
    const supabaseData = {
      guru: updatedData.guru,
      token_guru: updatedData.tokenGuru,
      nama: updatedData.nama,
      kelas: updatedData.kelas,
      whatsapp: updatedData.whatsapp,
      tanggal: updatedData.tanggal,
      baris: parseFloat(updatedData.baris) || 0,
      menghafal: updatedData.menghafal,
      alasan: updatedData.alasan,
      surat: updatedData.surat,
      ayat_dari: parseFloat(updatedData.ayatDari) || null,
      ayat_sampai: parseFloat(updatedData.ayatSampai) || null,
      keterangan: updatedData.keterangan,
      catatan: updatedData.catatan
    };

    const { error } = await supabase
      .from('tahfidz_records')
      .update(supabaseData)
      .eq('id', updatedData.id);

    if (error) {
      throw new Error(`Supabase update error: ${error.message}`);
    }

    const index = appData.findIndex(item => item.id === updatedData.id);
    if (index !== -1) {
      appData[index] = updatedData;
    }

    updateLastActiveTime();
    updateSyncStatus('success', 'Data berhasil diupdate!');
    return true;
    
  } catch (error) {
    console.error('❌ Error updating data:', error);
    updateSyncStatus('error', 'Gagal mengupdate data');
    return false;
  }
}

/**
 * Hapus data dari Supabase
 */
async function deleteDataFromSupabase(dataId) {
  console.log('🗑️ Menghapus data dari Supabase...', dataId);
  updateSyncStatus('loading', 'Menghapus data...');

  try {
    const { error } = await supabase
      .from('tahfidz_records')
      .delete()
      .eq('id', dataId);

    if (error) {
      throw new Error(`Supabase delete error: ${error.message}`);
    }

    appData = appData.filter(item => item.id !== dataId);
    updateLastActiveTime();
    updateSyncStatus('success', 'Data berhasil dihapus!');
    return true;
    
  } catch (error) {
    console.error('❌ Error deleting data:', error);
    updateSyncStatus('error', 'Gagal menghapus data');
    return false;
  }
}

function collectFormData() {
  return {
    guru: document.getElementById("guru").value,
    tokenGuru: document.getElementById("tokenGuru").value,
    nama: document.getElementById("siswa").value,
    kelas: document.getElementById("kelas").value,
    whatsapp: document.getElementById("whatsapp").value,
    tanggal: document.getElementById("tanggal").value,
    baris: parseFloat(document.getElementById("baris").value) || 0,
    menghafal: document.getElementById("menghafal").value,
    alasan: document.getElementById("alasan").value,
    surat: document.getElementById("surat").value,
    ayatDari: parseFloat(document.getElementById("ayatDari").value) || null,
    ayatSampai: parseFloat(document.getElementById("ayatSampai").value) || null,
    keterangan: document.getElementById("keterangan").value,
    catatan: document.getElementById("catatan").value
  };
}

function validateFormData(data) {
  if (!data.guru || !data.nama || !data.kelas || !data.tanggal || !data.menghafal) {
    showNotification('error', 'Harap isi semua field yang wajib diisi!');
    return false;
  }

  if (data.menghafal === "ya" && (!data.baris || data.baris <= 0)) {
    showNotification('error', 'Harap isi jumlah baris untuk data menghafal!');
    return false;
  }

  return true;
}

function prepareFormData(data) {
  return { 
    guru: data.guru,
    tokenGuru: data.tokenGuru,
    nama: data.nama,
    kelas: data.kelas,
    whatsapp: data.whatsapp,
    tanggal: data.tanggal,
    baris: data.menghafal === "ya" ? data.baris : 0,
    menghafal: data.menghafal,
    alasan: data.menghafal === "tidak" ? data.alasan : '',
    surat: data.menghafal === "ya" ? data.surat : '',
    ayatDari: data.menghafal === "ya" ? data.ayatDari : null,
    ayatSampai: data.menghafal === "ya" ? data.ayatSampai : null,
    keterangan: data.menghafal === "ya" ? data.keterangan : '',
    catatan: data.catatan
  };
}

function resetForm() {
  const form = document.getElementById("tahfidzForm");
  if (form) {
    form.reset();
    document.getElementById("tokenGuru").value = "";
    document.getElementById("whatsapp").value = "";
    
    const hafalanFields = document.getElementById("hafalanFields");
    const alasanField = document.getElementById("alasanField");
    if (hafalanFields) hafalanFields.classList.add("hidden");
    if (alasanField) alasanField.classList.add("hidden");
  }
}

// 🗑️ FUNGSI DELETE
// ====================================================

async function deleteData(index) {
  if (isEditMode) {
    showNotification('error', 'Harap selesaikan edit data terlebih dahulu!');
    return;
  }
  
  const filteredData = getFilteredData();
  const dataToDelete = filteredData[index];
  
  if (!dataToDelete) {
    showNotification('error', 'Data tidak ditemukan!');
    return;
  }
  
  const confirmMessage = `Apakah Anda yakin ingin menghapus data ini?\n\nSiswa: ${dataToDelete.nama}\nKelas: ${dataToDelete.kelas}\nTanggal: ${formatTanggal(dataToDelete.tanggal)}\nGuru: ${dataToDelete.guru}\n${dataToDelete.menghafal === 'ya' ? `Surat: ${dataToDelete.surat || '-'}\nAyat: ${dataToDelete.ayatDari || ''}${dataToDelete.ayatSampai ? ' - ' + dataToDelete.ayatSampai : ''}` : `Alasan: ${dataToDelete.alasan || '-'}`}\n\nData akan dihapus permanen dari database.`;

  if (!confirm(confirmMessage)) return;

  try {
    console.log('🗑️ Starting delete process...', dataToDelete);
    
    const deleteBtn = document.querySelector(`tr[data-original-index="${index}"] .btn-delete`);
    if (deleteBtn) {
      deleteBtn.innerHTML = '⏳...';
      deleteBtn.disabled = true;
    }

    const success = await deleteDataFromSupabase(dataToDelete.id);
    
    if (success) {
      showNotification('success', 'Data berhasil dihapus!');
      setTimeout(() => updateTable(), 1000);
    } else {
      throw new Error('Gagal menghapus data dari database');
    }
    
  } catch (error) {
    console.error('❌ Error deleting data:', error);
    showNotification('error', 'Gagal menghapus data: ' + error.message);
    
    const deleteBtn = document.querySelector(`tr[data-original-index="${index}"] .btn-delete`);
    if (deleteBtn) {
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.disabled = false;
    }
  }
}

// 💾 LOCALSTORAGE & UTILITIES
// ====================================================

function saveToLocalStorage(data) {
  try {
    localStorage.setItem('tahfidz_data', JSON.stringify(data));
    localStorage.setItem('tahfidz_last_update', new Date().toISOString());
    console.log('✅ Data saved to localStorage');
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem('tahfidz_data');
    if (saved) {
      appData = JSON.parse(saved);
      updateTable();
      updateSyncStatus('warning', 'Menggunakan data lokal (offline mode)');
      console.log('✅ Data loaded from localStorage:', appData.length);
      return true;
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error);
  }
  return false;
}

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// 🔔 NOTIFICATION SYSTEM
// ====================================================

function showNotification(type, message, duration = 5000) {
  removeExistingNotification();
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    loading: '🔄'
  };
  
  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">${icons[type] || '📢'}</div>
      <div class="notification-message">${message}</div>
      <button class="notification-close" onclick="removeExistingNotification()">×</button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  if (duration > 0) {
    setTimeout(() => {
      removeExistingNotification();
    }, duration);
  }
  
  return notification;
}

function removeExistingNotification() {
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.classList.remove('show');
    setTimeout(() => {
      if (existingNotification.parentNode) {
        existingNotification.parentNode.removeChild(existingNotification);
      }
    }, 300);
  }
}

// 🔄 SYNC & STATUS FUNCTIONS
// ====================================================

function updateSyncStatus(type, message) {
  const statusDiv = document.getElementById('syncStatus');
  if (!statusDiv) return;

  const icons = {
    success: '✅',
    error: '❌', 
    warning: '⚠️',
    loading: '🔄'
  };

  const timeStr = lastSyncTime ? ` (${lastSyncTime.toLocaleTimeString()})` : '';
  
  statusDiv.innerHTML = `
    <div class="sync-status ${type}">
      ${icons[type] || '📊'} ${message}${timeStr}
    </div>
  `;
}

function addSyncUI() {
  const tableInfo = document.querySelector('.table-info');
  if (!tableInfo) return;

  if (document.querySelector('.sync-container')) return;

  const syncDiv = document.createElement('div');
  syncDiv.className = 'sync-container';
  syncDiv.innerHTML = `
    <div class="sync-controls">
      <button class="btn-sync" onclick="syncDataFromSupabase()" title="Refresh data dari Supabase">
        🔄 Refresh Data
      </button>
      <button class="btn-sync" onclick="testFonnteManual()" title="Test koneksi Fonnte" style="background: linear-gradient(135deg, #a3be8c, #8fbc8b);">
        📱 Test Fonnte
      </button>
      <div id="syncStatus" class="sync-status">
        📊 Menunggu sync...
      </div>
    </div>
  `;

  tableInfo.appendChild(syncDiv);
}

function syncDataFromSupabase() {
  loadDataFromSupabase();
}

function startAutoSync() {
  setInterval(() => {
    if (document.getElementById('output')?.classList.contains('active')) {
      console.log('🔄 Auto-syncing data dari Supabase...');
      loadDataFromSupabase();
    }
  }, 30000);
}

// 🎛️ UI COMPONENTS & DROPDOWNS
// ====================================================

function initAllDropdowns() {
  initGuruDropdown();
  initKelasDropdown();
  initBulanDropdown();
  initKeteranganDropdown();
  initSuratDropdown();
  initTargetKelasDropdown();
  
  console.log('✅ All dropdowns initialized');
}

function initGuruDropdown() {
  const guruSelect = document.getElementById("guru");
  if (!guruSelect) return;
  
  guruSelect.innerHTML = '<option value="">-- Pilih Guru --</option>';
  
  if (dataGuru && dataGuru.length > 0) {
    dataGuru.forEach((guru) => {
      const opt = document.createElement("option");
      opt.value = guru.nama;
      opt.textContent = guru.nama;
      opt.setAttribute('data-token', guru.token || FONNTE_CONFIG.DEFAULT_TOKEN);
      guruSelect.appendChild(opt);
    });
  }
}

function initKelasDropdown() {
  const kelasSelect = document.getElementById("kelas");
  const filterKelasSelect = document.getElementById("filterKelas");
  
  if (kelasSelect) {
    kelasSelect.innerHTML = '<option value="">-- Pilih Kelas --</option>';
    
    if (dataKelas && dataKelas.length > 0) {
      dataKelas.forEach((kelas) => {
        const opt = document.createElement("option");
        opt.value = kelas.value;
        opt.textContent = kelas.label;
        kelasSelect.appendChild(opt);
      });
    }
  }
  
  if (filterKelasSelect) {
    filterKelasSelect.innerHTML = '<option value="">Semua</option>';
    
    if (dataKelas && dataKelas.length > 0) {
      dataKelas.forEach((kelas) => {
        const opt = document.createElement("option");
        opt.value = kelas.value;
        opt.textContent = kelas.label;
        filterKelasSelect.appendChild(opt);
      });
    }
  }
}

function initTargetKelasDropdown() {
  const targetKelasSelect = document.getElementById("targetKelas");
  if (!targetKelasSelect) return;
  
  targetKelasSelect.innerHTML = '<option value="">-- Pilih Kelas --</option>';
  
  if (dataKelas && dataKelas.length > 0) {
    dataKelas.forEach((kelas) => {
      const opt = document.createElement("option");
      opt.value = kelas.value;
      opt.textContent = kelas.label;
      targetKelasSelect.appendChild(opt);
    });
  }
}

function initBulanDropdown() {
  const filterBulanSelect = document.getElementById("filterBulan");
  if (!filterBulanSelect) return;
  
  filterBulanSelect.innerHTML = '<option value="">Semua Bulan</option>';
  
  if (dataBulan && dataBulan.length > 0) {
    dataBulan.forEach((bulan) => {
      const opt = document.createElement("option");
      opt.value = bulan.value;
      opt.textContent = bulan.label;
      filterBulanSelect.appendChild(opt);
    });
  }
}

function initKeteranganDropdown() {
  const keteranganSelect = document.getElementById("keterangan");
  if (!keteranganSelect) return;
  
  keteranganSelect.innerHTML = '<option value="">-- Pilih --</option>';
  
  if (dataKeterangan && dataKeterangan.length > 0) {
    dataKeterangan.forEach((keterangan) => {
      const opt = document.createElement("option");
      opt.value = keterangan.value;
      opt.textContent = keterangan.label;
      keteranganSelect.appendChild(opt);
    });
  }
}

function initSuratDropdown() {
  const suratSelect = document.getElementById("surat");
  if (!suratSelect) return;
  
  suratSelect.innerHTML = '<option value="">-- Pilih Surat --</option>';
  
  if (dataSurat && dataSurat.length > 0) {
    dataSurat.forEach((surat) => {
      const opt = document.createElement("option");
      opt.value = surat.value;
      opt.textContent = surat.label;
      suratSelect.appendChild(opt);
    });
  }
}

function initTahunFilter() {
  const tahunSelect = document.getElementById("filterTahun");
  if (!tahunSelect) return;
  
  const tahunSekarang = new Date().getFullYear();
  
  tahunSelect.innerHTML = '<option value="">Semua Tahun</option>';
  
  for (let i = -1; i <= 2; i++) {
    const tahun = tahunSekarang + i;
    const opt = document.createElement("option");
    opt.value = tahun.toString();
    opt.textContent = tahun.toString();
    
    if (i === 0) opt.selected = true;
    tahunSelect.appendChild(opt);
  }
}

// 📊 TABLE & DATA DISPLAY
// ====================================================

function updateTable() {
  const tbody = document.querySelector("#outputTable tbody");
  const thead = document.querySelector("#outputTable thead");
  const summary = document.getElementById("tableSummary");
  
  if (!tbody || !thead) return;
  
  tbody.innerHTML = "";
  thead.innerHTML = "";

  const filtered = getFilteredData();

  if (filtered.length === 0) {
    displayEmptyTable(thead, tbody, summary);
    return;
  }

  displayTableWithData(thead, tbody, summary, filtered);
}

function getFilteredData() {
  const filterKelas = document.getElementById("filterKelas")?.value || '';
  const filterBulan = document.getElementById("filterBulan")?.value || '';
  const filterTahun = document.getElementById("filterTahun")?.value || '';

  const filtered = appData.filter((d) => {
    if (!d || !d.nama || !d.kelas) return false;
    if (filterKelas && d.kelas !== filterKelas) return false;
    
    if (filterBulan || filterTahun) {
      if (!d.tanggal) return false;
      const [tahunData, bulanData] = d.tanggal.split('-');
      if (filterBulan && bulanData !== filterBulan) return false;
      if (filterTahun && tahunData !== filterTahun) return false;
    }
    
    return true;
  });

  return filtered;
}

function displayEmptyTable(thead, tbody, summary) {
  thead.innerHTML = `<tr><th colspan="10">Data Capaian Tahfidz</th></tr>`;
  tbody.innerHTML = `<tr><td colspan="10" class="no-data">Belum ada data untuk filter yang dipilih</td></tr>`;
  if (summary) summary.textContent = "Menampilkan 0 data";
}

function displayTableWithData(thead, tbody, summary, filtered) {
  thead.innerHTML = `
    <tr>
      <th>No</th>
      <th>Nama Siswa</th>
      <th>Kelas</th>
      <th>Tanggal</th>
      <th>Surat</th>
      <th>Ayat</th>
      <th>Keterangan</th>
      <th>Baris</th>
      <th>Total</th>
      <th>Aksi</th>
    </tr>
  `;

  const siswaData = groupDataBySiswa(filtered);
  const sortedSiswa = sortSiswaData(siswaData);
  
  buildTableRows(tbody, sortedSiswa);
  updateTableSummary(summary, sortedSiswa, filtered);
}

function groupDataBySiswa(filtered) {
  const siswaData = {};
  filtered.forEach((d, index) => {
    const key = `${d.nama}-${d.kelas}`;
    if (!siswaData[key]) {
      siswaData[key] = {
        nama: d.nama,
        kelas: d.kelas,
        entries: [],
        totalBaris: 0,
        rowspan: 0
      };
    }
    
    siswaData[key].entries.push({ ...d, originalIndex: index });
    siswaData[key].totalBaris += parseFloat(d.baris) || 0;
    siswaData[key].rowspan++;
  });
  return siswaData;
}

function sortSiswaData(siswaData) {
  return Object.values(siswaData).sort((a, b) => {
    if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas);
    return a.nama.localeCompare(b.nama);
  });
}

function buildTableRows(tbody, sortedSiswa) {
  let globalNo = 1;
  sortedSiswa.forEach((siswa) => {
    const sortedEntries = siswa.entries.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    
    // Baris pertama
    const firstEntry = sortedEntries[0];
    const firstRowData = formatRowData(firstEntry, true);
    
    const firstRow = createTableRow(firstEntry, siswa, globalNo, firstRowData, true);
    tbody.appendChild(firstRow);

    // Baris berikutnya
    for (let i = 1; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];
      const rowData = formatRowData(entry, false);
      const nextRow = createTableRow(entry, siswa, globalNo, rowData, false);
      tbody.appendChild(nextRow);
    }
    
    globalNo++;
  });
}

function formatRowData(entry, isFirstRow = false) {
  let ayatDisplay = '-';
  let suratDisplay = '-';
  let keteranganDisplay = '-';
  let barisDisplay = '0';
  let cellClass = '';

  if (entry.menghafal === 'ya') {
    if (entry.ayatDari && entry.ayatSampai) {
      ayatDisplay = `${parseFloat(entry.ayatDari)} – ${parseFloat(entry.ayatSampai)}`;
    } else if (entry.ayatDari) {
      ayatDisplay = parseFloat(entry.ayatDari).toString();
    }
    suratDisplay = entry.surat || '-';
    keteranganDisplay = entry.keterangan || '-';
    barisDisplay = entry.baris ? parseFloat(entry.baris).toString() : '0';
  } else {
    ayatDisplay = entry.alasan || 'Tidak menghafal';
    suratDisplay = 'Tidak Menghafal';
    cellClass = 'not-memorizing';
    barisDisplay = '0';
  }

  return { ayatDisplay, suratDisplay, keteranganDisplay, barisDisplay, cellClass };
}

function createTableRow(entry, siswa, globalNo, rowData, isFirstRow) {
  const row = document.createElement('tr');
  const rowClass = isFirstRow ? 'even' : (entry.originalIndex % 2 === 0 ? 'even' : 'odd');
  row.className = `${rowClass} ${isEditMode && currentEditingRow === entry.originalIndex ? 'editing' : ''}`;
  row.setAttribute('data-original-index', entry.originalIndex);
  
  if (isFirstRow) {
    row.innerHTML = `
      <td rowspan="${siswa.rowspan}">${globalNo}</td>
      <td rowspan="${siswa.rowspan}">${siswa.nama}</td>
      <td rowspan="${siswa.rowspan}">${siswa.kelas}</td>
      <td>${formatTanggal(entry.tanggal)}</td>
      <td class="${rowData.cellClass}">${rowData.suratDisplay}</td>
      <td class="${rowData.cellClass}">${rowData.ayatDisplay}</td>
      <td class="${rowData.cellClass}">${rowData.keteranganDisplay}</td>
      <td>${rowData.barisDisplay}</td>
      <td rowspan="${siswa.rowspan}" class="total-cell">${siswa.totalBaris}</td>
      <td>
        <button class="btn-edit" onclick="toggleEditMode(${entry.originalIndex})" title="Edit data">
          ✏️ Edit
        </button>
        <button class="btn-delete" onclick="deleteData(${entry.originalIndex})" title="Hapus data">
          🗑️
        </button>
      </td>
    `;
  } else {
    row.innerHTML = `
      <td>${formatTanggal(entry.tanggal)}</td>
      <td class="${rowData.cellClass}">${rowData.suratDisplay}</td>
      <td class="${rowData.cellClass}">${rowData.ayatDisplay}</td>
      <td class="${rowData.cellClass}">${rowData.keteranganDisplay}</td>
      <td>${rowData.barisDisplay}</td>
      <td>
        <button class="btn-edit" onclick="toggleEditMode(${entry.originalIndex})" title="Edit data">
          ✏️ Edit
        </button>
        <button class="btn-delete" onclick="deleteData(${entry.originalIndex})" title="Hapus data">
          🗑️
        </button>
      </td>
    `;
  }
  
  return row;
}

function updateTableSummary(summary, sortedSiswa, filtered) {
  if (!summary) return;
  
  const totalSiswa = sortedSiswa.length;
  const totalData = filtered.length;
  const sourceInfo = lastSyncTime ? ` (Data dari Supabase - ${lastSyncTime.toLocaleTimeString()})` : '';
  const onlineStatus = isOnline ? '✅ Online' : '❌ Offline';
  const whatsappStatus = '📱 WhatsApp Notif: Active';
  summary.textContent = `Menampilkan ${totalSiswa} siswa (${totalData} data)${sourceInfo} - ${onlineStatus} - ${whatappStatus}`;
}

// 🛠️ UTILITY FUNCTIONS
// ====================================================

function formatTanggal(tanggalString) {
  if (!tanggalString) return '';
  
  try {
    let cleanDateStr = tanggalString;
    
    if (tanggalString.includes('T')) {
      cleanDateStr = tanggalString.split('T')[0];
    }
    
    const parts = cleanDateStr.split('-');
    if (parts.length === 3) {
      const tahun = parts[0].slice(2);
      const bulan = parts[1];
      const hari = parts[2];
      return `${hari}/${bulan}/${tahun}`;
    }
    
    return tanggalString;
    
  } catch (error) {
    console.error('Error formatting date:', tanggalString, error);
    return tanggalString;
  }
}

function formatTanggalLengkap(tanggalString) {
  if (!tanggalString) return '';
  
  try {
    const [tahun, bulan, hari] = tanggalString.split('-');
    const namaBulan = {
      '01': 'Januari', '02': 'Februari', '03': 'Maret', 
      '04': 'April', '05': 'Mei', '06': 'Juni',
      '07': 'Juli', '08': 'Agustus', '09': 'September', 
      '10': 'Oktober', '11': 'November', '12': 'Desember'
    };
    return `${parseInt(hari)} ${namaBulan[bulan]} ${tahun}`;
  } catch (error) {
    console.error('Error formatting date:', tanggalString, error);
    return tanggalString;
  }
}

// 📤 EXPORT FUNCTIONS
// ====================================================

function exportToCSV() {
  if (isEditMode) {
    showNotification('error', 'Harap selesaikan edit data terlebih dahulu!');
    return;
  }
  
  const filtered = getFilteredData();

  if (filtered.length === 0) {
    showNotification('error', 'Tidak ada data untuk di-export!');
    return;
  }

  const csvContent = generateCSVContent(filtered);
  downloadFile(csvContent, 'capaian-tahfidz', 'csv');
  showNotification('success', 'File CSV berhasil diunduh!');
}

function exportToExcel() {
  if (isEditMode) {
    showNotification('error', 'Harap selesaikan edit data terlebih dahulu!');
    return;
  }
  
  const filtered = getFilteredData();

  if (filtered.length === 0) {
    showNotification('error', 'Tidak ada data untuk di-export!');
    return;
  }

  const htmlContent = generateExcelContent(filtered);
  downloadFile(htmlContent, 'laporan-tahfidz', 'xls');
  showNotification('success', 'File Excel berhasil diunduh!');
}

function generateCSVContent(filtered) {
  const siswaData = groupDataForExport(filtered);
  const sortedSiswa = sortSiswaData(siswaData);

  const headers = ['No', 'Nama Siswa', 'Kelas', 'Tanggal', 'Surat', 'Ayat', 'Keterangan', 'Baris', 'Total'];
  const csvData = [];

  let globalNo = 1;
  sortedSiswa.forEach((siswa) => {
    const sortedEntries = siswa.entries.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    
    sortedEntries.forEach((entry, index) => {
      const isFirstRow = index === 0;
      const rowData = formatExportRowData(entry, siswa, globalNo, isFirstRow);
      csvData.push(rowData);
    });
    
    globalNo++;
  });

  return [headers, ...csvData]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
}

function generateExcelContent(filtered) {
  const siswaData = groupDataForExport(filtered);
  const sortedSiswa = sortSiswaData(siswaData);

  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Laporan Capaian Tahfidz</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #000; padding: 8px; text-align: center; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .total { font-weight: bold; background-color: #e8f4fd; }
        .title { text-align: center; margin-bottom: 20px; }
        .filter-info { margin-bottom: 15px; padding: 10px; background: #f9f9f9; border-radius: 5px; }
        .source-info { font-size: 12px; color: #666; margin-top: 10px; }
        .empty-cell { background-color: #f5f5f5; }
        .not-memorizing { color: #bf616a; font-style: italic; background-color: #fff5f5; }
      </style>
    </head>
    <body>
      <div class="title">
        <h1>Laporan Capaian Tahfidz</h1>
        <p>Dibuat pada: ${new Date().toLocaleDateString('id-ID')}</p>
        <div class="source-info">Sumber data: Supabase - ${lastSyncTime ? lastSyncTime.toLocaleString() : 'Unknown'}</div>
      </div>
  `;

  // Add filter info
  const filterKelas = document.getElementById("filterKelas")?.value || '';
  const filterBulan = document.getElementById("filterBulan")?.value || '';
  const filterTahun = document.getElementById("filterTahun")?.value || '';
  
  if (filterKelas || filterBulan || filterTahun) {
    htmlContent += '<div class="filter-info"><strong>Filter yang digunakan:</strong><br>';
    const filters = [];
    if (filterKelas) filters.push(`Kelas: ${filterKelas}`);
    if (filterBulan) {
      const bulanObj = dataBulan.find(b => b.value === filterBulan);
      if (bulanObj) filters.push(`Bulan: ${bulanObj.label}`);
    }
    if (filterTahun) filters.push(`Tahun: ${filterTahun}`);
    htmlContent += filters.join(' | ') + '</div>';
  }

  htmlContent += '<table><tr><th>No</th><th>Nama Siswa</th><th>Kelas</th><th>Tanggal</th><th>Surat</th><th>Ayat</th><th>Keterangan</th><th>Baris</th><th>Total</th></tr>';

  let globalNo = 1;
  sortedSiswa.forEach((siswa) => {
    const sortedEntries = siswa.entries.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    
    sortedEntries.forEach((entry, index) => {
      const isFirstRow = index === 0;
      const rowData = formatExportRowData(entry, siswa, globalNo, isFirstRow);
      const rowClass = entry.menghafal === 'tidak' ? 'not-memorizing' : '';
      
      htmlContent += `<tr${rowClass ? ` class="${rowClass}"` : ''}>`;
      htmlContent += `<td>${rowData[0]}</td>`;
      htmlContent += `<td>${rowData[1]}</td>`;
      htmlContent += `<td>${rowData[2]}</td>`;
      htmlContent += `<td>${rowData[3]}</td>`;
      htmlContent += `<td>${rowData[4]}</td>`;
      htmlContent += `<td>${rowData[5]}</td>`;
      htmlContent += `<td>${rowData[6]}</td>`;
      htmlContent += `<td>${rowData[7]}</td>`;
      htmlContent += `<td class="${isFirstRow ? 'total' : 'empty-cell'}">${rowData[8]}</td>`;
      htmlContent += '</tr>';
    });
    
    globalNo++;
  });

  htmlContent += '</table></body></html>';
  return htmlContent;
}

function groupDataForExport(filtered) {
  const siswaData = {};
  filtered.forEach((d) => {
    const key = `${d.nama}-${d.kelas}`;
    if (!siswaData[key]) {
      siswaData[key] = {
        nama: d.nama,
        kelas: d.kelas,
        entries: [],
        totalBaris: 0
      };
    }
    
    siswaData[key].entries.push({
      tanggal: d.tanggal,
      surat: d.surat,
      ayatDari: d.ayatDari,
      ayatSampai: d.ayatSampai,
      keterangan: d.keterangan,
      baris: d.baris,
      menghafal: d.menghafal,
      alasan: d.alasan
    });
    
    siswaData[key].totalBaris += d.baris;
  });
  return siswaData;
}

function formatExportRowData(entry, siswa, globalNo, isFirstRow) {
  let ayatDisplay = '-';
  let suratDisplay = '-';
  let keteranganDisplay = '-';
  
  if (entry.menghafal === 'ya') {
    if (entry.ayatDari && entry.ayatSampai) {
      ayatDisplay = `${entry.ayatDari} – ${entry.ayatSampai}`;
    }
    suratDisplay = entry.surat || '-';
    keteranganDisplay = entry.keterangan || '-';
  } else {
    ayatDisplay = entry.alasan || '-';
    suratDisplay = 'Tidak Menghafal';
    keteranganDisplay = '-';
  }
  
  return [
    isFirstRow ? globalNo.toString() : '',
    isFirstRow ? siswa.nama : '',
    isFirstRow ? siswa.kelas : '',
    formatTanggal(entry.tanggal),
    suratDisplay,
    ayatDisplay,
    keteranganDisplay,
    (entry.baris || 0).toString(),
    isFirstRow ? siswa.totalBaris.toString() : ''
  ];
}

function downloadFile(content, baseName, extension) {
  const filterKelas = document.getElementById("filterKelas")?.value || '';
  const filterBulan = document.getElementById("filterBulan")?.value || '';
  const filterTahun = document.getElementById("filterTahun")?.value || '';
  
  let fileName = baseName;
  if (filterKelas) fileName += `-kelas-${filterKelas}`;
  if (filterBulan) fileName += `-bulan-${filterBulan}`;
  if (filterTahun) fileName += `-tahun-${filterTahun}`;
  fileName += `-${new Date().toISOString().split('T')[0]}.${extension}`;
  
  const blob = new Blob([content], { 
    type: extension === 'csv' ? 'text/csv;charset=utf-8;' : 'application/vnd.ms-excel' 
  });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 🚀 INITIALIZATION
// ====================================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Aplikasi Tahfidz - Supabase + Fonnte Version starting...');
  
  // DEBUG: Log semua fungsi penting
  console.log('🔍 Checking critical functions:');
  console.log('- showTab:', typeof showTab);
  console.log('- initAllDropdowns:', typeof initAllDropdowns);
  console.log('- loadAllData:', typeof loadAllData);
  console.log('- validateSupabaseConfig:', typeof validateSupabaseConfig);
  
  // DEBUG: Check DOM elements
  console.log('🔍 Checking DOM elements:');
  console.log('- Guru select:', document.getElementById('guru'));
  console.log('- Kelas select:', document.getElementById('kelas'));
  console.log('- Tabs:', document.querySelectorAll('.tab').length);
  
  // 1. Inisialisasi dropdown saat pertama kali load
  if (typeof initAllDropdowns === 'function') {
    console.log('✅ Initializing dropdowns...');
    initAllDropdowns();
  } else {
    console.error('❌ ERROR: initAllDropdowns function not found!');
    showNotification('error', 'Error: Fungsi inisialisasi tidak ditemukan');
  }
  
  // 2. Set tanggal default
  if (typeof setDefaultTanggal === 'function') {
    setDefaultTanggal();
  }
  
  // 3. Validasi config Supabase
  if (typeof validateSupabaseConfig === 'function') {
    if (!validateSupabaseConfig()) {
      showNotification('error', 'Konfigurasi Supabase belum lengkap. Edit file config.js', 10000);
    } else {
      console.log('✅ Supabase configuration validated');
    }
  }
  
  // 4. Load semua data
  if (typeof loadAllData === 'function') {
    console.log('✅ Loading all data...');
    loadAllData();
  } else {
    console.error('❌ ERROR: loadAllData function not found!');
    showNotification('error', 'Error: Fungsi load data tidak ditemukan');
  }
  
  // 5. Setup form submit handler
  const form = document.getElementById("tahfidzForm");
  if (form) {
    console.log('✅ Form found, attaching submit handler');
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log('📝 Form submitted');
      
      const formData = collectFormData();
      
      if (!validateFormData(formData)) return;

      const newData = prepareFormData(formData);

      const submitBtn = e.target.querySelector('.btn-submit');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '⏳ Menyimpan...';
      submitBtn.disabled = true;

      try {
        const success = await saveDataToSupabase(newData);
        
        if (success) {
          // Kirim notifikasi WhatsApp
          const fonnteToken = newData.tokenGuru || FONNTE_CONFIG.DEFAULT_TOKEN;
          if (fonnteToken && newData.whatsapp) {
            showNotification('info', 'Mengirim laporan ke orang tua...', 3000);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const message = formatWhatsAppMessage(newData, true, false, null);
            const notificationSent = await sendWhatsAppNotification(newData.whatsapp, message, fonnteToken);
            
            if (notificationSent) {
              showNotification('success', 'Data berhasil disimpan & laporan terkirim ke orang tua! 📱');
            } else {
              await new Promise(resolve => setTimeout(resolve, 2000));
              const retrySent = await sendWhatsAppNotification(newData.whatsapp, message, fonnteToken);
              
              if (retrySent) {
                showNotification('success', 'Data berhasil disimpan & laporan terkirim ke orang tua! 📱');
              } else {
                showNotification('warning', 'Data disimpan tapi gagal kirim laporan.');
              }
            }
          } else {
            showNotification('success', 'Data berhasil disimpan! (tanpa notifikasi)');
          }
          
          resetForm();
          setTimeout(() => showTab('output'), 2000);
        } else {
          showNotification('error', 'Gagal menyimpan data. Silakan coba lagi.');
        }
      } catch (error) {
        console.error('Error saving data:', error);
        showNotification('error', 'Error menyimpan data. Silakan coba lagi.');
      } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
  } else {
    console.error('❌ Form not found!');
  }
  
  // 6. Setup UI components after delay
  setTimeout(() => {
    console.log('✅ Setting up UI components...');
    if (typeof addSyncUI === 'function') {
      addSyncUI();
    }
    if (typeof startAutoSync === 'function') {
      startAutoSync();
    }
  }, 1000);
  
  console.log('✅ DOM initialization complete');
  
  // 7. Emergency fallback - check dropdowns after 3 seconds
  setTimeout(() => {
    const guruSelect = document.getElementById('guru');
    if (guruSelect && guruSelect.options.length <= 1) {
      console.warn('⚠️ Dropdown masih kosong, coba reinitialize...');
      
      // Coba load data.json langsung
      fetch('data.json')
        .then(response => response.json())
        .then(jsonData => {
          console.log('✅ Loaded data.json directly');
          dataSiswa = jsonData.dataSiswa || {};
          dataGuru = jsonData.dataGuru || [];
          dataKelas = jsonData.dataKelas || [];
          dataBulan = jsonData.dataBulan || [];
          dataKeterangan = jsonData.dataKeterangan || [];
          
          initAllDropdowns();
          showNotification('success', 'Data berhasil dimuat dari file lokal');
        })
        .catch(error => {
          console.error('Error loading data.json:', error);
          // Use default data
          setDefaultStaticData();
          initAllDropdowns();
        });
    }
  }, 3000);
});
// 🌐 GLOBAL FUNCTIONS
// ====================================================

window.showTab = showTab;
window.updateToken = updateToken;
window.updateNamaSiswa = updateNamaSiswa;
window.updateWhatsApp = updateWhatsApp;
window.toggleMenghafalFields = toggleMenghafalFields;
window.deleteData = deleteData;
window.exportToCSV = exportToCSV;
window.exportToExcel = exportToExcel;
window.exportTargetToCSV = exportTargetToCSV;
window.syncDataFromSupabase = syncDataFromSupabase;
window.removeExistingNotification = removeExistingNotification;
window.loadTargetSiswa = loadTargetSiswa;
window.saveAllTargets = saveAllTargets;
window.updateSingleTarget = updateSingleTarget;
window.sendManualWeeklyReport = sendManualWeeklyReport;
window.sendClassWeeklyReport = sendClassWeeklyReport;
window.sendStudentWeeklyReport = sendStudentWeeklyReport;

// Test Fonnte manual
async function testFonnteManual() {
  showNotification('info', 'Testing koneksi Fonnte...', 3000);
  
  try {
    const response = await fetch(`${FONNTE_CONFIG.BASE_URL}/validate`, {
      method: 'POST',
      headers: {
        'Authorization': FONNTE_CONFIG.DEFAULT_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'target=62859106544812'
    });

    const result = await response.json();
    
    if (result.status === true || result.valid === true) {
      showNotification('success', '✅ Koneksi Fonnte berhasil!');
    } else {
      showNotification('error', '❌ Koneksi Fonnte gagal. Periksa token dan koneksi.');
    }
  } catch (error) {
    showNotification('error', '❌ Koneksi Fonnte gagal: ' + error.message);
  }
}
window.testFonnteManual = testFonnteManual;

// Placeholder functions untuk weekly report
async function sendManualWeeklyReport() {
  showNotification('info', 'Fitur rekapan manual akan segera tersedia!');
}

async function sendClassWeeklyReport(kelas) {
  showNotification('info', `Fitur rekapan kelas ${kelas} akan segera tersedia!`);
}

async function sendStudentWeeklyReport(nama, kelas) {
  showNotification('info', `Fitur rekapan untuk ${nama} akan segera tersedia!`);
}

// ✏️ EDIT INLINE FUNCTIONALITY YANG HILANG
// ====================================================

function toggleEditMode(index) {
  const row = document.querySelector(`tr[data-original-index="${index}"]`);
  const editBtn = row?.querySelector('.btn-edit');
  
  if (!row || !editBtn) return;
  
  if (isEditMode && currentEditingRow === index) {
    saveInlineEdit(index);
  } else {
    if (isEditMode && currentEditingRow !== null) {
      cancelEditMode(currentEditingRow);
    }
    enterEditMode(index);
  }
}

function enterEditMode(index) {
  const row = document.querySelector(`tr[data-original-index="${index}"]`);
  const editBtn = row?.querySelector('.btn-edit');
  
  if (!row || !editBtn) return;
  
  isEditMode = true;
  currentEditingRow = index;
  editBtn.innerHTML = '💾 Simpan';
  editBtn.classList.add('editing');
  
  setupEditableFields(row, index);
  document.addEventListener('keydown', handleEditKeydown);
}

function setupEditableFields(row, index) {
  const editableFields = row.querySelectorAll('.editable');
  const originalData = getFilteredData()[index];
  
  if (!originalData) return;
  
  editableFields.forEach(field => {
    const fieldType = field.classList[1];
    field.innerHTML = createEditInput(fieldType, originalData);
  });
}

function createEditInput(fieldType, originalData) {
  switch (fieldType) {
    case 'tanggal':
      return `<input type="date" value="${originalData.tanggal}" class="edit-input">`;
    
    case 'surat':
      return createSuratSelect(originalData.surat);
    
    case 'keterangan':
      return createKeteranganSelect(originalData.keterangan);
    
    case 'ayat':
      return createAyatInput(originalData);
    
    case 'baris':
      return `<input type="number" value="${originalData.baris || 0}" min="0" step="0.5" class="edit-input">`;
    
    default:
      return '';
  }
}

function createSuratSelect(selectedSurat) {
  let selectHTML = `<select class="edit-input edit-select"><option value="">-- Pilih Surat --</option>`;
  
  if (dataSurat && dataSurat.length > 0) {
    dataSurat.forEach(surat => {
      const selected = surat.value === selectedSurat ? 'selected' : '';
      selectHTML += `<option value="${surat.value}" ${selected}>${surat.label}</option>`;
    });
  }
  
  selectHTML += `</select>`;
  return selectHTML;
}

function createKeteranganSelect(selectedKeterangan) {
  let selectHTML = `<select class="edit-input edit-select"><option value="">-- Pilih Keterangan --</option>`;
  
  if (dataKeterangan && dataKeterangan.length > 0) {
    dataKeterangan.forEach(ket => {
      const selected = ket.value === selectedKeterangan ? 'selected' : '';
      selectHTML += `<option value="${ket.value}" ${selected}>${ket.label}</option>`;
    });
  }
  
  selectHTML += `</select>`;
  return selectHTML;
}

function createAyatInput(originalData) {
  let inputValue = '';
  
  if (originalData.menghafal === 'ya') {
    if (originalData.ayatDari && originalData.ayatSampai) {
      inputValue = `${originalData.ayatDari} – ${originalData.ayatSampai}`;
    } else if (originalData.ayatDari) {
      inputValue = originalData.ayatDari.toString();
    }
  } else {
    inputValue = originalData.alasan || '';
  }
  
  return `<input type="text" value="${inputValue}" class="edit-input" placeholder="Ayat atau alasan">`;
}

function cancelEditMode(index) {
  const row = document.querySelector(`tr[data-original-index="${index}"]`);
  const editBtn = row?.querySelector('.btn-edit');
  
  if (!row || !editBtn) return;
  
  isEditMode = false;
  currentEditingRow = null;
  editBtn.innerHTML = '✏️ Edit';
  editBtn.classList.remove('editing');
  
  updateTable();
  document.removeEventListener('keydown', handleEditKeydown);
}

async function saveInlineEdit(index) {
  const row = document.querySelector(`tr[data-original-index="${index}"]`);
  const originalData = getFilteredData()[index];
  
  if (!row || !originalData) return;
  
  const editData = collectEditData(row);
  if (!editData) return;

  const updatedData = prepareUpdatedData(originalData, editData);
  
  if (!validateEditData(updatedData)) return;

  const editBtn = row.querySelector('.btn-edit');
  const originalText = editBtn.innerHTML;
  editBtn.innerHTML = '⏳...';
  editBtn.disabled = true;
  
  try {
    const success = await updateDataInSupabase(updatedData);
    
    if (success) {
      const fonnteToken = originalData.tokenGuru || FONNTE_CONFIG.DEFAULT_TOKEN;
      if (fonnteToken && originalData.whatsapp) {
        showNotification('info', 'Mengirim pembaruan laporan...', 3000);
        
        const message = formatWhatsAppMessage(updatedData, false, true, originalData);
        const notificationSent = await sendWhatsAppNotification(originalData.whatsapp, message, fonnteToken);
        
        if (notificationSent) {
          showNotification('success', 'Data berhasil diupdate & pembaruan terkirim! 📱');
        } else {
          showNotification('warning', 'Data diupdate tapi gagal kirim pembaruan.');
        }
      } else {
        showNotification('success', 'Data berhasil diupdate!');
      }
      
      isEditMode = false;
      currentEditingRow = null;
      updateTable();
    } else {
      showNotification('error', 'Gagal mengupdate data. Silakan coba lagi.');
      editBtn.innerHTML = originalText;
      editBtn.disabled = false;
    }
  } catch (error) {
    console.error('Error updating data:', error);
    showNotification('error', 'Error mengupdate data. Silakan coba lagi.');
    editBtn.innerHTML = originalText;
    editBtn.disabled = false;
  }
}

function collectEditData(row) {
  const tanggalInput = row.querySelector('.tanggal input');
  const suratSelect = row.querySelector('.surat select');
  const ayatInput = row.querySelector('.ayat input');
  const keteranganSelect = row.querySelector('.keterangan select');
  const barisInput = row.querySelector('.baris input');
  
  if (!tanggalInput || !suratSelect || !ayatInput || !keteranganSelect || !barisInput) {
    showNotification('error', 'Form edit tidak lengkap!');
    return null;
  }
  
  let newAyatDari = null;
  let newAyatSampai = null;
  const ayatValue = ayatInput.value;
  
  if (ayatValue.includes('–') || ayatValue.includes('-')) {
    const separator = ayatValue.includes('–') ? '–' : '-';
    const ayatParts = ayatValue.split(separator);
    if (ayatParts.length === 2) {
      newAyatDari = parseFloat(ayatParts[0].trim()) || null;
      newAyatSampai = parseFloat(ayatParts[1].trim()) || null;
    }
  } else if (ayatValue.trim()) {
    newAyatDari = parseFloat(ayatValue.trim()) || null;
    newAyatSampai = parseFloat(ayatValue.trim()) || null;
  }
  
  return {
    newTanggal: tanggalInput.value,
    newSurat: suratSelect.value,
    newAyatDari: newAyatDari,
    newAyatSampai: newAyatSampai,
    newKeterangan: keteranganSelect.value,
    newBaris: parseFloat(barisInput.value) || 0
  };
}

function prepareUpdatedData(originalData, editData) {
  return {
    ...originalData,
    tanggal: editData.newTanggal,
    surat: originalData.menghafal === 'ya' ? editData.newSurat : '',
    ayatDari: originalData.menghafal === 'ya' ? editData.newAyatDari : null,
    ayatSampai: originalData.menghafal === 'ya' ? editData.newAyatSampai : null,
    alasan: originalData.menghafal === 'tidak' ? editData.newAyatDari?.toString() || '' : '',
    keterangan: originalData.menghafal === 'ya' ? editData.newKeterangan : '',
    baris: editData.newBaris
  };
}

function validateEditData(updatedData) {
  if (!updatedData.tanggal) {
    showNotification('error', 'Tanggal harus diisi!');
    return false;
  }
  
  if (updatedData.menghafal === 'ya' && updatedData.baris <= 0) {
    showNotification('error', 'Jumlah baris harus lebih dari 0 untuk data menghafal!');
    return false;
  }
  
  return true;
}

function handleEditKeydown(e) {
  if (e.key === 'Escape') {
    if (currentEditingRow !== null) {
      cancelEditMode(currentEditingRow);
    }
  } else if (e.key === 'Enter' && e.ctrlKey) {
    if (currentEditingRow !== null) {
      saveInlineEdit(currentEditingRow);
    }
  }
}

// 🎯 SMART TOKEN SELECTION SYSTEM YANG HILANG
// ====================================================

/**
 * Dapatkan token guru yang paling banyak menginput untuk siswa tertentu
 */
function getSmartTokenForStudent(nama, kelas) {
  try {
    // Filter data 30 hari terakhir untuk siswa ini
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const studentData = appData.filter(item => 
      item.nama === nama && 
      item.kelas === kelas &&
      new Date(item.tanggal) >= thirtyDaysAgo
    );

    if (studentData.length === 0) {
      // Jika tidak ada data, cari dari semua data
      const allStudentData = appData.filter(item => 
        item.nama === nama && item.kelas === kelas
      );
      
      if (allStudentData.length === 0) {
        return FONNTE_CONFIG.DEFAULT_TOKEN;
      }
      
      return countGuruFrequency(allStudentData);
    }

    return countGuruFrequency(studentData);
    
  } catch (error) {
    console.error('Error getting smart token:', error);
    return FONNTE_CONFIG.DEFAULT_TOKEN;
  }
}

/**
 * Hitung frekuensi guru dan return token yang paling banyak
 */
function countGuruFrequency(studentData) {
  const guruCount = {};
  
  studentData.forEach(item => {
    if (item.guru && item.tokenGuru) {
      if (!guruCount[item.guru]) {
        guruCount[item.guru] = {
          count: 0,
          token: item.tokenGuru
        };
      }
      guruCount[item.guru].count++;
    }
  });

  // Cari guru dengan input terbanyak
  let mostFrequentGuru = null;
  let maxCount = 0;

  Object.entries(guruCount).forEach(([guru, data]) => {
    if (data.count > maxCount) {
      maxCount = data.count;
      mostFrequentGuru = guru;
    }
  });

  if (mostFrequentGuru && guruCount[mostFrequentGuru]) {
    return guruCount[mostFrequentGuru].token;
  }

  return FONNTE_CONFIG.DEFAULT_TOKEN;
}

// 📊 WEEKLY REPORT SYSTEM YANG HILANG
// ====================================================

/**
 * Hitung data mingguan
 */
async function calculateWeeklyData() {
  // Hitung tanggal Senin dan Sabtu minggu ini
  const today = new Date();
  const currentDay = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - currentDay + (currentDay === 0 ? -6 : 1));
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  
  const mondayStr = monday.toISOString().split('T')[0];
  const saturdayStr = saturday.toISOString().split('T')[0];
  
  // Filter data minggu ini
  const thisWeekData = appData.filter(item => 
    item.tanggal >= mondayStr && 
    item.tanggal <= saturdayStr &&
    item.menghafal === 'ya'
  );
  
  // Kelompokkan per siswa
  const weeklyData = {};
  
  thisWeekData.forEach(item => {
    const key = `${item.nama}|${item.kelas}`;
    if (!weeklyData[key]) {
      weeklyData[key] = {
        totalBaris: 0,
        sesiCount: 0,
        guru: item.guru,
        nilai: []
      };
    }
    
    weeklyData[key].totalBaris += item.baris || 0;
    weeklyData[key].sesiCount++;
    if (item.keterangan) {
      weeklyData[key].nilai.push(item.keterangan);
    }
  });
  
  return weeklyData;
}

/**
 * Generate pesan rekapan mingguan
 */
function generateWeeklyMessage(nama, kelas, weeklyData) {
  const target = getStudentTarget(nama, kelas);
  const kondisi = getStudentCondition(nama, kelas);
  const actual = weeklyData.totalBaris;
  const percentage = Math.round((actual / target.targetMingguan) * 100);
  
  let message = `Assalamu'alaikum ayah/bunda ananda ${nama}...\n\n`;
  message += `Semoga ayah/bunda dan ananda ${nama} selalu dalam lindungan Allah dan penuh berkah.\n\n`;
  
  message += `📊 *LAPORAN PERJUANGAN HAFALAN MINGGU INI*\n\n`;
  
  message += `Alhamdulillah, perjuangan ananda ${nama} minggu ini:\n`;
  message += `📈 Berhasil menyelesaikan : ${actual} baris (${percentage}% dari target)\n\n`;
  
  message += `🎯 *TANTANGAN MINGGU DEPAN*\n`;
  message += `Mari kita lanjutkan perjalanan menghafal:\n`;
  
  // Format detail target
  if (target.suratMulai && target.ayatMulai) {
    message += `📍 ${target.suratMulai} ayat ${target.ayatMulai}`;
    if (target.suratSelesai && target.ayatSelesai) {
      message += ` sampai ${target.suratSelesai} ayat ${target.ayatSelesai}`;
    }
    message += `\n📝 Target : ${target.targetMingguan} baris`;
  } else {
    message += `📝 Target : ${target.targetMingguan} baris`;
  }
  
  message += `\n\n`;
  
  message += getWeeklyFeedback(actual, target.targetMingguan, percentage, kondisi, nama);
  message += `\n\n`;
  message += `Setiap ayat yang dihafal adalah investasi akhirat yang tak ternilai.\n`;
  message += `Terus dampingi dan motivasi ananda ${nama} ya ayah/bunda...\n`;
  message += `Bersama kita wujudkan generasi penghafal Quran! 💫\n\n`;
  message += `Jazakumullah khairan atas kerjasamanya...\n\n`;
  message += `Wassalamu'alaikum warahmatullahi wabarakatuh`;

  return message;
}

/**
 * Dapatkan feedback berdasarkan progress
 */
function getWeeklyFeedback(actual, target, percentage, kondisi, nama) {
  let feedback = '';
  
  if (percentage >= 100) {
    feedback = `🎉 *SELAMAT! TARGET TERLAKSANA!*\n\n`;
    feedback += `Masya Allah, tabarakallah! Ananda ${nama} sungguh luar biasa! \n`;
    feedback += `Tak henti-hentinya kami bersyukur melihat semangat dan konsistensi ananda.\n`;
    feedback += `Ini adalah bukti kesungguhan dan ketekunan yang patut dibanggakan! 💖\n`;
    feedback += `Mari pertahankan energi positif ini untuk tantangan minggu depan!`;
  }
  else if (percentage >= 80) {
    feedback = `💫 *HAMPIR SEMPURNA!*\n\n`;
    feedback += `Subhanallah, hampir sampai di garis finish! \n`;
    feedback += `Ananda ${nama} menunjukkan komitmen yang sangat menginspirasi.\n`;
    feedback += `Tinggal satu langkah lagi menuju target, yakin bisa menyelesaikannya! 🔥\n`;
    feedback += `Semangatnya jangan kendor ya, ayah/bunda...`;
  }
  else if (percentage >= 60) {
    feedback = `🌟 *PROGRESS MEMBAHAGIAKAN!*\n\n`;
    feedback += `Alhamdulillah, ananda ${nama} menunjukkan perkembangan yang konsisten.\n`;
    feedback += `Setiap baris yang berhasil dihafal adalah kemenangan kecil menuju kemenangan besar.\n`;
    feedback += `Terus temani ananda, beri apresiasi untuk setiap usaha yang sudah dilakukan! ✨\n`;
    feedback += `Perjalanan masih panjang, tapi insya Allah penuh berkah...`;
  }
  else if (percentage >= 40) {
    feedback = `📚 *MASIH BERJUANG!*\n\n`;
    feedback += `Ananda ${nama} sudah berusaha dengan baik, dan itu yang terpenting.\n`;
    feedback += `Setiap anak punya ritme belajarnya masing-masing, yang penting konsisten berusaha.\n`;
    feedback += `Mari kita evaluasi bersama, mungkin butuh penyesuaian strategi atau waktu belajar.\n`;
    feedback += `Yang pasti, jangan pernah menyerah! Setiap ayat adalah pahala yang tak terputus...`;
  }
  else {
    feedback = `🤲 *MARI BERSAMA BANGKIT!*\n\n`;
    feedback += `Pekan ini mungkin berat untuk ananda ${nama}, tapi itu tidak apa-apa.\n`;
    feedback += `Yang penting niat dan semangatnya tetap menyala.\n`;
    feedback += `Bisa jadi ini adalah ujian kesabaran dan ketekunan untuk kita semua.\n`;
    feedback += `Mari duduk bersama, cari tahu kendalanya, dan bangkit lebih kuat!\n`;
    feedback += `Percayalah, tidak ada usaha yang sia-sia di jalan Allah...`;
  }
  
  return feedback;
}

/**
 * Dapatkan kondisi siswa
 */
function getStudentCondition(nama, kelas) {
  // Ini bisa dikembangkan dengan data kondisi dari database
  return "normal";
}

/**
 * Generate pesan progress individual
 */
function generateProgressMessage(nama, kelas, progress) {
  let message = `*📊 Progress Tahfidz - ${nama}*\n\n`;
  message += `Assalamu'alaikum ayah/bunda,\n\n`;
  message += `Berikut progress hafalan ananda ${nama} minggu ini:\n\n`;
  message += `📅 Periode    : ${progress.weekRange}\n`;
  message += `🎯 Target     : ${progress.target} baris\n`;
  message += `📈 Pencapaian : ${progress.actual} baris\n`;
  message += `📊 Persentase : ${progress.percentage}%\n`;
  
  if (progress.daysLeft > 0) {
    message += `⏳ Sisa Waktu : ${progress.daysLeft} hari\n`;
  }
  
  message += `\nTerus dukung semangat menghafal ananda ya!\n\n`;
  message += `Wassalamu'alaikum`;

  return message;
}

// 📤 MANUAL WEEKLY REPORT WITH RANDOM DELAY YANG HILANG
// ====================================================

/**
 * Kirim rekapan mingguan manual dengan delay acak
 */
async function sendManualWeeklyReport() {
  if (isEditMode) {
    showNotification('error', 'Harap selesaikan edit data terlebih dahulu!');
    return;
  }
  
  const confirmation = confirm(
    `📊 KIRIM REKAPAN MINGGUAN MANUAL\n\n` +
    `Sistem akan mengirim rekapan ke semua siswa dengan:\n` +
    `• Delay acak 1-5 menit antara pengiriman\n` +
    `• Token guru yang paling banyak menginput\n` +
    `• Progress minggu ini saja\n\n` +
    `Lanjutkan?`
  );
  
  if (!confirmation) return;

  try {
    showNotification('info', 'Mempersiapkan rekapan mingguan...', 5000);
    
    const weeklyData = await calculateWeeklyData();
    
    if (Object.keys(weeklyData).length === 0) {
      showNotification('warning', 'Tidak ada data untuk minggu ini');
      return;
    }
    
    // Tampilkan dialog konfirmasi detail
    const detailConfirmation = confirm(
      `📋 DETAIL PENGIRIMAN:\n\n` +
      `Total siswa: ${Object.keys(weeklyData).length}\n` +
      `Estimasi waktu: ${Math.ceil(Object.keys(weeklyData).length * 3 / 60)} menit\n` +
      `Delay: 1-5 menit acak per siswa\n\n` +
      `Mulai pengiriman?`
    );
    
    if (!detailConfirmation) return;

    await startStaggeredSending(weeklyData);
    
  } catch (error) {
    console.error('Error sending manual weekly report:', error);
    showNotification('error', 'Gagal mengirim rekapan mingguan');
  }
}

/**
 * Kirim rekapan untuk kelas tertentu saja
 */
async function sendClassWeeklyReport(kelas) {
  if (!kelas) {
    showNotification('error', 'Pilih kelas terlebih dahulu!');
    return;
  }
  
  const confirmation = confirm(
    `📊 KIRIM REKAPAN KELAS ${kelas}\n\n` +
    `Kirim rekapan mingguan ke semua siswa kelas ${kelas}?\n` +
    `• Delay acak 1-5 menit\n` +
    `• Token guru masing-masing siswa\n\n` +
    `Lanjutkan?`
  );
  
  if (!confirmation) return;

  try {
    showNotification('info', `Mempersiapkan rekapan kelas ${kelas}...`, 5000);
    
    const weeklyData = await calculateWeeklyData();
    
    // Filter hanya kelas yang dipilih
    const classWeeklyData = {};
    Object.entries(weeklyData).forEach(([siswaKey, data]) => {
      const [nama, siswaKelas] = siswaKey.split('|');
      if (siswaKelas === kelas) {
        classWeeklyData[siswaKey] = data;
      }
    });
    
    if (Object.keys(classWeeklyData).length === 0) {
      showNotification('warning', `Tidak ada data untuk kelas ${kelas} minggu ini`);
      return;
    }
    
    await startStaggeredSending(classWeeklyData);
    
  } catch (error) {
    console.error('Error sending class weekly report:', error);
    showNotification('error', `Gagal mengirim rekapan kelas ${kelas}`);
  }
}

/**
 * Kirim rekapan untuk satu siswa saja
 */
async function sendStudentWeeklyReport(nama, kelas) {
  try {
    const weeklyData = await calculateWeeklyData();
    const siswaKey = `${nama}|${kelas}`;
    const data = weeklyData[siswaKey];
    
    if (!data) {
      showNotification('warning', `Tidak ada data mingguan untuk ${nama}`);
      return;
    }

    const smartToken = getSmartTokenForStudent(nama, kelas);
    const message = generateWeeklyMessage(nama, kelas, data);
    const whatsapp = dataSiswa[kelas]?.find(s => s.nama === nama)?.whatsapp;
    
    if (!whatsapp) {
      showNotification('error', `Nomor WhatsApp ${nama} tidak ditemukan`);
      return;
    }

    showNotification('info', `Mengirim rekapan ke ${nama}...`, 3000);
    
    const sent = await sendWhatsAppNotification(whatsapp, message, smartToken);
    
    if (sent) {
      showNotification('success', `Rekapan terkirim ke ${nama}`);
    } else {
      showNotification('error', `Gagal mengirim ke ${nama}`);
    }
    
  } catch (error) {
    console.error('Error sending student report:', error);
    showNotification('error', `Error mengirim rekapan ke ${nama}`);
  }
}

/**
 * Mulai pengiriman dengan delay acak
 */
async function startStaggeredSending(weeklyData) {
  const progressNotification = showNotification('loading', 
    `Memulai pengiriman ke ${Object.keys(weeklyData).length} siswa...`, 0);
  
  let successCount = 0;
  let failedCount = 0;
  let currentIndex = 0;
  const totalCount = Object.keys(weeklyData).length;

  for (const [siswaKey, data] of Object.entries(weeklyData)) {
    currentIndex++;
    const [nama, kelas] = siswaKey.split('|');
    
    try {
      // Update progress notification
      if (progressNotification) {
        const messageElement = progressNotification.querySelector('.notification-message');
        if (messageElement) {
          messageElement.textContent = 
            `Mengirim ${currentIndex}/${totalCount}: ${nama} (${kelas})`;
        }
      }

      // Dapatkan token guru yang tepat
      const smartToken = getSmartTokenForStudent(nama, kelas);
      const message = generateWeeklyMessage(nama, kelas, data);
      const whatsapp = dataSiswa[kelas]?.find(s => s.nama === nama)?.whatsapp;
      
      if (whatsapp && message) {
        const sent = await sendWhatsAppNotification(whatsapp, message, smartToken);
        
        if (sent) {
          successCount++;
          console.log(`✅ Sent to ${nama} with token ${smartToken.substring(0, 10)}...`);
        } else {
          failedCount++;
          console.error(`❌ Failed to send to ${nama}`);
        }
      } else {
        failedCount++;
        console.error(`❌ Missing WhatsApp or message for ${nama}`);
      }
      
      // Generate random delay between 1-5 minutes (60,000 - 300,000 ms)
      if (currentIndex < totalCount) {
        const randomDelay = Math.floor(Math.random() * 240000) + 60000; // 1-5 menit
        const delayMinutes = Math.ceil(randomDelay / 60000);
        
        if (progressNotification) {
          const messageElement = progressNotification.querySelector('.notification-message');
          if (messageElement) {
            messageElement.textContent = 
              `Menunggu ${delayMinutes} menit... (${currentIndex}/${totalCount} selesai)`;
          }
        }
        
        console.log(`⏳ Waiting ${delayMinutes} minutes before next send...`);
        await new Promise(resolve => setTimeout(resolve, randomDelay));
      }
      
    } catch (error) {
      failedCount++;
      console.error(`❌ Error sending to ${nama}:`, error);
    }
  }
  
  // Remove progress notification
  if (progressNotification) {
    document.body.removeChild(progressNotification);
  }
  
  // Show final result
  const resultMessage = `Pengiriman selesai! ✅ ${successCount} berhasil, ❌ ${failedCount} gagal`;
  showNotification('success', resultMessage, 10000);
  
  // Log detailed result
  console.log(`📊 Weekly Report Result: ${successCount} success, ${failedCount} failed`);
}

// 🌐 UPDATE WINDOW OBJECT DENGAN FUNGSI BARU
// ====================================================

window.toggleEditMode = toggleEditMode;
window.getSmartTokenForStudent = getSmartTokenForStudent;
window.calculateWeeklyData = calculateWeeklyData;
window.generateWeeklyMessage = generateWeeklyMessage;
window.getWeeklyFeedback = getWeeklyFeedback;
window.getStudentCondition = getStudentCondition;
window.generateProgressMessage = generateProgressMessage;
window.startStaggeredSending = startStaggeredSending;

console.log('✅ Script.js fully loaded with all functions!');