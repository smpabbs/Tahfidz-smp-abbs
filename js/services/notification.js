// ====================================================
// js/services/notification.js - NOTIFICATION SERVICE
// ====================================================

const NotificationService = {
  
  _activeNotification: null,
  _notificationTimer: null,

  // ==========================================
  // UI NOTIFICATIONS
  // ==========================================

  /**
   * Tampilkan notifikasi UI
   * @param {string} type - 'success' | 'error' | 'warning' | 'info' | 'loading'
   * @param {string} message - Pesan notifikasi
   * @param {number} duration - Durasi dalam ms (0 = tidak auto-hilang)
   * @returns {HTMLElement} - Element notifikasi
   */
  show(type, message, duration = 5000) {
    // Hapus notifikasi yang sedang aktif
    this.hide();

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      loading: '🔄'
    };

    // Buat element notifikasi
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">${icons[type] || '📢'}</div>
        <div class="notification-message">${message}</div>
        <button class="notification-close" onclick="NotificationService.hide()">×</button>
      </div>
    `;

    // Tambahkan ke body
    document.body.appendChild(notification);

    // Tampilkan dengan animasi
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    // Simpan referensi
    this._activeNotification = notification;

    // Auto-hide setelah durasi
    if (duration > 0) {
      this._notificationTimer = setTimeout(() => {
        this.hide();
      }, duration);
    }

    return notification;
  },

  /**
   * Sembunyikan notifikasi yang sedang aktif
   */
  hide() {
    if (this._notificationTimer) {
      clearTimeout(this._notificationTimer);
      this._notificationTimer = null;
    }

    if (this._activeNotification) {
      this._activeNotification.classList.remove('show');
      
      setTimeout(() => {
        if (this._activeNotification && this._activeNotification.parentNode) {
          this._activeNotification.parentNode.removeChild(this._activeNotification);
        }
        this._activeNotification = null;
      }, 300);
    }
  },

  /**
   * Shortcut untuk notifikasi sukses
   */
  success(message, duration = 3000) {
    return this.show('success', message, duration);
  },

  /**
   * Shortcut untuk notifikasi error
   */
  error(message, duration = 5000) {
    return this.show('error', message, duration);
  },

  /**
   * Shortcut untuk notifikasi warning
   */
  warning(message, duration = 4000) {
    return this.show('warning', message, duration);
  },

  /**
   * Shortcut untuk notifikasi info
   */
  info(message, duration = 3000) {
    return this.show('info', message, duration);
  },

  /**
   * Shortcut untuk notifikasi loading (tidak auto-hilang)
   */
  loading(message) {
    return this.show('loading', message, 0);
  },

  // ==========================================
  // WHATSAPP NOTIFICATIONS
  // ==========================================

  /**
   * Kirim pesan WhatsApp via Fonnte API
   * @param {string} recipient - Nomor WhatsApp penerima
   * @param {string} message - Pesan yang akan dikirim
   * @param {string} token - Token Fonnte (optional, pakai default)
   * @returns {Promise<boolean>} - true jika berhasil
   */
  async sendWhatsApp(recipient, message, token = null) {
    try {
      const fonnteToken = token || AppConfig.FONNTE_DEFAULT_TOKEN;

      if (!fonnteToken || !recipient || !message) {
        console.error('❌ WhatsApp: Data tidak lengkap');
        return false;
      }

      // Format nomor telepon
      let phone = recipient.trim().replace(/\D/g, '');
      
      if (phone.startsWith('0')) {
        phone = '62' + phone.slice(1);
      } else if (phone.startsWith('8')) {
        phone = '62' + phone;
      }

      // Validasi panjang nomor
      if (phone.length < 10 || phone.length > 15) {
        console.error('❌ WhatsApp: Nomor tidak valid:', phone);
        return false;
      }

      // Kirim request ke Fonnte
      const payload = new URLSearchParams();
      payload.append('target', phone);
      payload.append('message', message);
      payload.append('countryCode', '62');

      const response = await fetch(`${AppConfig.FONNTE_URL}/send`, {
        method: 'POST',
        headers: {
          'Authorization': fonnteToken,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: payload
      });

      const result = await response.json();
      
      if (result.status == true || result.status == 200 || result.success == true || result.message_id) {
        console.log('✅ WhatsApp sent to:', phone);
        return true;
      } else {
        console.error('❌ WhatsApp API error:', result);
        return false;
      }

    } catch (error) {
      console.error('❌ WhatsApp send failed:', error.message);
      return false;
    }
  },

  /**
   * Format pesan untuk data menghafal baru
   * @param {object} data - Data tahfidz
   * @returns {string} - Pesan terformat
   */
  formatTahfidzMessage(data) {
    let msg = `Assalamu'alaikum ayah/bunda ananda ${data.nama},\n\n`;
    msg += `Alhamdulillah, hari ini ananda ${data.nama} telah menyelesaikan setoran hafalan:\n\n`;
    msg += `📖 Surat    : ${data.surat || '-'}\n`;
    
    if (data.ayatDari && data.ayatSampai) {
      msg += `📍 Ayat     : ${data.ayatDari} - ${data.ayatSampai}\n`;
    } else if (data.ayatDari) {
      msg += `📍 Ayat     : ${data.ayatDari}\n`;
    }
    
    msg += `📊 Jumlah   : ${data.baris} baris\n`;
    msg += `⭐ Nilai    : ${data.keterangan || '-'}\n`;
    msg += `👨‍🏫 Guru     : ${data.guru}\n\n`;
    msg += `Terus dukung semangat menghafal ananda ${data.nama} di rumah ya.\n\n`;
    msg += `Wassalamu'alaikum,\n${data.guru}`;

    return msg;
  },

  /**
   * Format pesan untuk data tidak menghafal
   * @param {object} data - Data tahfidz
   * @returns {string} - Pesan terformat
   */
  formatTidakMenghafalMessage(data) {
    let msg = `Assalamu'alaikum ayah/bunda ananda ${data.nama},\n\n`;
    msg += `Hari ini ananda ${data.nama} tidak dapat mengikuti setoran hafalan karena:\n`;
    msg += `📝 ${data.alasan || 'Tidak disebutkan'}\n\n`;
    msg += `Kami doakan semoga ananda lekas sehat dan bisa kembali menghafal.\n\n`;
    msg += `Wassalamu'alaikum,\n${data.guru}`;

    return msg;
  },

  /**
   * Format pesan untuk edit data
   * @param {object} oldData - Data lama
   * @param {object} newData - Data baru
   * @returns {string} - Pesan terformat
   */
  formatEditMessage(oldData, newData) {
    let msg = `Assalamu'alaikum ayah/bunda ananda ${newData.nama},\n\n`;
    msg += `Ada pembaruan data hafalan ananda ${newData.nama}:\n\n`;
    
    if (oldData.tanggal !== newData.tanggal) {
      msg += `• Tanggal : ${oldData.tanggal} → ${newData.tanggal}\n`;
    }
    if (oldData.surat !== newData.surat) {
      msg += `• Surat   : ${oldData.surat || '-'} → ${newData.surat || '-'}\n`;
    }
    if (oldData.keterangan !== newData.keterangan) {
      msg += `• Nilai   : ${oldData.keterangan || '-'} → ${newData.keterangan || '-'}\n`;
    }
    if (oldData.baris !== newData.baris) {
      msg += `• Jumlah  : ${oldData.baris || 0} → ${newData.baris || 0} baris\n`;
    }
    
    msg += `\nTerima kasih atas perhatiannya.\n\n`;
    msg += `Wassalamu'alaikum,\n${newData.guru}`;

    return msg;
  }
};

console.log('✅ NotificationService module loaded');