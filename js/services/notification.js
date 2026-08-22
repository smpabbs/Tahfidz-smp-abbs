// ====================================================
// js/services/notification.js - NOTIFICATION SERVICE
// ====================================================

const NotificationService = {
  
  _toastTimer: null,

  // ==========================================
  // TOAST NOTIFICATIONS
  // ==========================================

  /**
   * Tampilkan toast notification di pojok kanan
   * @param {string} type - 'success' | 'error' | 'warning' | 'info' | 'loading'
   * @param {string} message - Pesan notifikasi
   * @param {number} duration - Durasi dalam ms (0 = tidak auto-hilang)
   * @returns {HTMLElement} - Element toast
   */
  show(type, message, duration = 5000) {
    const icons = {
      success: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>',
      error: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>',
      warning: '<svg viewBox="0 0 24 24"><path d="M12 3l10 18H2Z"/><path d="M12 10v4M12 17h.01"/></svg>',
      info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>',
      loading: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 4v5h-5"/></svg>'
    };

    // Cari atau buat container
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      container.id = 'toastContainer';
      document.body.appendChild(container);
    }

    // Buat element toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span>${message}</span>
    `;
    toast.style.cursor = 'pointer';
    toast.addEventListener('click', () => toast.remove());

    // Tambahkan ke container
    container.appendChild(toast);

    // Simpan referensi (hanya untuk 1 notifikasi loading aktif)
    if (type === 'loading') {
      this._toastTimer = toast;
    }

    // Auto-hide
    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, duration);
    }

    return toast;
  },

  /**
   * Hapus toast loading yang aktif
   */
  hide() {
    if (this._toastTimer && this._toastTimer.parentNode) {
      this._toastTimer.remove();
      this._toastTimer = null;
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
        console.error('❌ WhatsApp: Data tidak lengkap', { 
          hasToken: !!fonnteToken, 
          hasRecipient: !!recipient, 
          hasMessage: !!message 
        });
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

      // AbortController untuk timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), AppConfig.FONNTE_TIMEOUT || 15000);

      // Hitung ketersediaan proxy SEBELUM try, supaya tetap terlihat di catch fallback
      const isNative = typeof window.Capacitor !== 'undefined' && !!window.Capacitor.isNativePlatform;
      const localDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol.includes('file');

      let proxyUrl = '/api/fonnte-proxy';
      // APK (Capacitor) tidak bisa akses path relatif — pakai URL absolut proxy di Vercel
      if (isNative || window.location.protocol.includes('file')) {
        proxyUrl = AppConfig.FONNTE_PROXY_URL;
      }
      const isProxyAvailable = !localDev || isNative;

      try {
        // Coba via proxy dulu (atasi CORS), fallback ke direct
        let response;

        if (isProxyAvailable) {
          // Kirim via proxy server (Vercel serverless)
          response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              target: phone,
              message: message,
              countryCode: '62',
              token: fonnteToken
            }),
            signal: controller.signal
          });
        } else {
          // Langsung ke Fonnte (local development)
          response = await fetch(`${AppConfig.FONNTE_URL}/send`, {
            method: 'POST',
            headers: {
              'Authorization': fonnteToken,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: payload,
            signal: controller.signal
          });
        }

        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.error('❌ WhatsApp API error HTTP:', response.status);
          return false;
        }
        
        const result = await response.json();
        
        if (result.status == true || result.status == 200 || result.success == true || result.message_id) {
          console.log('✅ WhatsApp sent to:', phone);
          return true;
        } else {
          console.error('❌ WhatsApp API error:', result, 'HTTP:', response.status);
          return false;
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('❌ WhatsApp: Request timeout (15 detik)');
        } else if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
          console.error('❌ WhatsApp: CORS error — browser memblokir request ke Fonnte.');
          // Coba langsung fallback kalau proxy gagal
          if (isProxyAvailable) {
            console.log('🔄 Retry langsung ke Fonnte API...');
            try {
              const retryResp = await fetch(`${AppConfig.FONNTE_URL}/send`, {
                method: 'POST',
                headers: {
                  'Authorization': fonnteToken,
                  'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: payload
              });
              const retryResult = await retryResp.json();
              if (retryResult.status == true || retryResult.success == true || retryResult.message_id) {
                console.log('✅ WhatsApp sent via direct fallback');
                return true;
              }
            } catch (e) {
              console.error('❌ WhatsApp: Direct fallback juga gagal:', e.message);
            }
          }
        } else {
          console.error('❌ WhatsApp: Network error:', fetchError.message);
        }
        return false;
      }

    } catch (error) {
      console.error('❌ WhatsApp send failed:', error.message);
      return false;
    }
  },

  /**
   * Format SATU pesan WA per submit form — dipakai untuk 1 aktivitas
   * maupun 2-3 aktivitas sekaligus (Ziyadah/Murajaah/Tilawah), selalu
   * lewat TemplateWaManager (bisa diedit admin di tab Template WA).
   * Ziyadah satu-satunya jenis berstatus non-"ya" (Sakit/Sertifikasi/
   * Lainnya) — kalau itu terjadi, dianggap siswa tidak masuk sama sekali
   * (dikonfirmasi: Murajaah/Tilawah tidak mungkin ikut tercentang saat
   * itu), jadi template "tidak"/"sertifikasi"/"lainnya" dipakai sendirian
   * tanpa perlu menggabung aktivitas lain.
   * @param {object[]} dataList - array formData aktivitas yang berhasil disimpan
   * @returns {string} - Pesan terformat
   */
  formatAktivitasMessage(dataList) {
    const ziyadah = dataList.find(d => (d.jenis || 'ziyadah') === 'ziyadah');

    if (ziyadah && ziyadah.menghafal !== 'ya') {
      const key = ziyadah.menghafal === 'sakit' ? 'tidak'
        : ziyadah.menghafal === 'sertifikasi' ? 'sertifikasi'
        : 'lainnya';
      return TemplateWaManager.buildMessage(key, ziyadah);
    }

    return TemplateWaManager.buildMessage('setoran', dataList);
  },

  /**
   * Format pesan untuk edit data. DISIAPKAN tapi belum dipanggil dari
   * alur Ubah manapun — EditInline.save() saat ini tidak mengirim WA.
   * @param {object} oldData - Data lama
   * @param {object} newData - Data baru
   * @returns {string} - Pesan terformat
   */
  formatEditMessage(oldData, newData) {
    return TemplateWaManager.buildMessage('edit', newData, oldData);
  }
};

console.log('✅ NotificationService module loaded');