// ====================================================
// js/services/database.js - SUABASE DATABASE SERVICE
// ====================================================

const DatabaseService = {
  
  // ==========================================
  // TAHFIDZ RECORDS
  // ==========================================

  /**
   * Load semua data tahfidz dari Supabase
   * @returns {Promise<Array>}
   */
  async loadTahfidzRecords() {
    try {
      const db = SupabaseClient.get();
      if (!db) throw new Error('Database client not available');

      const { data, error } = await db
        .from('tahfidz_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data ke format aplikasi
      const records = (data || []).map(item => ({
        id: item.id,
        timestamp: item.created_at,
        guru: item.guru || '',
        tokenGuru: item.token_guru || '',
        nama: item.nama || '',
        kelas: item.kelas || '',
        whatsapp: item.whatsapp || '',
        tanggal: item.tanggal || '',
        jenis: item.jenis || (item.menghafal === 'ya' ? 'ziyadah' : null),
        baris: parseFloat(item.baris) || 0,
        menghafal: item.menghafal || 'ya',
        alasan: item.alasan || '',
        surat: item.surat || '',
        ayatDari: parseFloat(item.ayat_dari) || null,
        ayatSampai: parseFloat(item.ayat_sampai) || null,
        keterangan: item.keterangan || '',
        catatan: item.catatan || ''
      }));

      console.log(`✅ Loaded ${records.length} tahfidz records`);
      return records;

    } catch (error) {
      console.error('❌ Failed to load tahfidz records:', error.message);
      throw error;
    }
  },

  /**
   * Simpan data tahfidz baru
   * @param {object} record - Data yang akan disimpan
   * @returns {Promise<object|null>} - Data yang baru dibuat
   */
  async saveTahfidzRecord(record) {
    try {
      const db = SupabaseClient.get();
      if (!db) throw new Error('Database client not available');

      const { data, error } = await db
        .from('tahfidz_records')
        .insert([record])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Tahfidz record saved:', data.id);
      return data;

    } catch (error) {
      console.error('❌ Failed to save tahfidz record:', error.message);
      throw error;
    }
  },

  /**
   * Update data tahfidz
   * @param {string} id - ID record
   * @param {object} record - Data baru
   * @returns {Promise<boolean>}
   */
  async updateTahfidzRecord(id, record) {
    try {
      const db = SupabaseClient.get();
      if (!db) throw new Error('Database client not available');

      const { error } = await db
        .from('tahfidz_records')
        .update(record)
        .eq('id', id);

      if (error) throw error;

      console.log('✅ Tahfidz record updated:', id);
      return true;

    } catch (error) {
      console.error('❌ Failed to update tahfidz record:', error.message);
      throw error;
    }
  },

  /**
   * Hapus data tahfidz
   * @param {string} id - ID record
   * @returns {Promise<boolean>}
   */
  async deleteTahfidzRecord(id) {
    try {
      const db = SupabaseClient.get();
      if (!db) throw new Error('Database client not available');

      const { error } = await db
        .from('tahfidz_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('✅ Tahfidz record deleted:', id);
      return true;

    } catch (error) {
      console.error('❌ Failed to delete tahfidz record:', error.message);
      throw error;
    }
  },

  // ==========================================
  // MASTER SISWA
  // ==========================================

  /**
   * Load data master siswa
   * @param {string} filterKelas - Filter kelas (optional)
   * @returns {Promise<Array>}
   */
  async loadMasterSiswa(filterKelas = '') {
    try {
      const db = SupabaseClient.get();
      if (!db) throw new Error('Database client not available');

      let query = db
        .from('master_siswa')
        .select('*')
        .eq('is_active', true)
        .order('kelas_name', { ascending: true })
        .order('sort_order', { ascending: true });

      if (filterKelas) {
        query = query.eq('kelas_name', filterKelas);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log(`✅ Loaded ${data?.length || 0} master siswa`);
      return data || [];

    } catch (error) {
      console.error('❌ Failed to load master siswa:', error.message);
      throw error;
    }
  },

  /**
   * Simpan data master siswa
   * @param {object} siswaData
   * @returns {Promise<object|null>}
   */
  async saveMasterSiswa(siswaData) {
    try {
      const db = SupabaseClient.get();
      if (!db) throw new Error('Database client not available');

      const { data, error } = await db
        .from('master_siswa')
        .insert([siswaData])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Master siswa saved:', data.id);
      return data;

    } catch (error) {
      console.error('❌ Failed to save master siswa:', error.message);
      throw error;
    }
  },

  /**
   * Update data master siswa
   * @param {string} id
   * @param {object} siswaData
   * @returns {Promise<boolean>}
   */
  async updateMasterSiswa(id, siswaData) {
    try {
      const db = SupabaseClient.get();
      if (!db) throw new Error('Database client not available');

      const { error } = await db
        .from('master_siswa')
        .update(siswaData)
        .eq('id', id);

      if (error) throw error;

      console.log('✅ Master siswa updated:', id);
      return true;

    } catch (error) {
      console.error('❌ Failed to update master siswa:', error.message);
      throw error;
    }
  },

  /**
   * Hapus data master siswa
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteMasterSiswa(id) {
    try {
      const db = SupabaseClient.get();
      if (!db) throw new Error('Database client not available');

      const { error } = await db
        .from('master_siswa')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('✅ Master siswa deleted:', id);
      return true;

    } catch (error) {
      console.error('❌ Failed to delete master siswa:', error.message);
      throw error;
    }
  },

  // ==========================================
  // MASTER KELAS
  // ==========================================

  /**
   * Load data master kelas
   * @returns {Promise<Array>}
   */
  async loadMasterKelas() {
    try {
      const db = SupabaseClient.get();
      if (!db) throw new Error('Database client not available');

      const { data, error } = await db
        .from('master_kelas')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      console.log(`✅ Loaded ${data?.length || 0} master kelas`);
      return data || [];

    } catch (error) {
      console.error('❌ Failed to load master kelas:', error.message);
      throw error;
    }
  },

  /**
   * Simpan data master kelas
   * @param {object} kelasData
   * @returns {Promise<object|null>}
   */
  async saveMasterKelas(kelasData) {
    try {
      const db = SupabaseClient.get();
      if (!db) throw new Error('Database client not available');

      const { data, error } = await db
        .from('master_kelas')
        .insert([kelasData])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Master kelas saved:', data.id);
      return data;

    } catch (error) {
      console.error('❌ Failed to save master kelas:', error.message);
      throw error;
    }
  },

  /**
   * Update data master kelas
   * @param {string} id
   * @param {object} kelasData
   * @returns {Promise<boolean>}
   */
  async updateMasterKelas(id, kelasData) {
    try {
      const db = SupabaseClient.get();
      if (!db) throw new Error('Database client not available');

      const { error } = await db
        .from('master_kelas')
        .update(kelasData)
        .eq('id', id);

      if (error) throw error;

      console.log('✅ Master kelas updated:', id);
      return true;

    } catch (error) {
      console.error('❌ Failed to update master kelas:', error.message);
      throw error;
    }
  },

  /**
   * Hapus data master kelas
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteMasterKelas(id) {
    try {
      const db = SupabaseClient.get();
      if (!db) throw new Error('Database client not available');

      const { error } = await db
        .from('master_kelas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('✅ Master kelas deleted:', id);
      return true;

    } catch (error) {
      console.error('❌ Failed to delete master kelas:', error.message);
      throw error;
    }
  },

  // ==========================================
  // MASTER GURU
  // ==========================================

  /**
   * Load data master guru
   * @returns {Promise<Array>}
   */
  async loadMasterGuru() {
    try {
      const db = SupabaseClient.get();
      if (!db) throw new Error('Database client not available');

      const { data, error } = await db
        .from('master_guru')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      console.log(`✅ Loaded ${data?.length || 0} master guru`);
      return data || [];

    } catch (error) {
      console.error('❌ Failed to load master guru:', error.message);
      throw error;
    }
  },

  /**
   * Simpan data master guru
   * @param {object} guruData
   * @returns {Promise<object|null>}
   */
  async saveMasterGuru(guruData) {
    try {
      const db = SupabaseClient.get();
      if (!db) throw new Error('Database client not available');

      const { data, error } = await db
        .from('master_guru')
        .insert([guruData])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Master guru saved:', data.id);
      return data;

    } catch (error) {
      console.error('❌ Failed to save master guru:', error.message);
      throw error;
    }
  },

  /**
   * Update data master guru
   * @param {string} id
   * @param {object} guruData
   * @returns {Promise<boolean>}
   */
  async updateMasterGuru(id, guruData) {
    try {
      const db = SupabaseClient.get();
      if (!db) throw new Error('Database client not available');

      const { error } = await db
        .from('master_guru')
        .update(guruData)
        .eq('id', id);

      if (error) throw error;

      console.log('✅ Master guru updated:', id);
      return true;

    } catch (error) {
      console.error('❌ Failed to update master guru:', error.message);
      throw error;
    }
  },

  /**
   * Hapus data master guru
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteMasterGuru(id) {
    try {
      const db = SupabaseClient.get();
      if (!db) throw new Error('Database client not available');

      const { error } = await db
        .from('master_guru')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('✅ Master guru deleted:', id);
      return true;

    } catch (error) {
      console.error('❌ Failed to delete master guru:', error.message);
      throw error;
    }
  },

  // ==========================================
  // APP SETTINGS (tabel app_settings - template WA global)
  // ==========================================

  /**
   * Muat semua setting WA templates dari Supabase
   * @returns {Promise<object>} - { setoran: string, tidak: string, edit: string }
   */
  async loadWASettings() {
    try {
      const db = SupabaseClient.get();
      if (!db) throw new Error('Database client not available');

      const { data, error } = await db
        .from('app_settings')
        .select('key, value')
        .in('key', ['wa_template_setoran', 'wa_template_tidak', 'wa_template_sertifikasi', 'wa_template_lainnya', 'wa_template_edit']);

      if (error) throw error;

      const result = {};
      (data || []).forEach(row => {
        const key = row.key.replace('wa_template_', '');
        result[key] = row.value || '';
      });

      console.log(`✅ Loaded ${Object.keys(result).length} WA settings`);
      return result;
    } catch (error) {
      console.error('❌ Failed to load WA settings:', error.message);
      throw error;
    }
  },

  /**
   * Simpan satu setting ke Supabase (upsert)
   * @param {string} key - key lengkap, mis. 'wa_template_setoran'
   * @param {string} value - isi template
   * @returns {Promise<boolean>}
   */
  async saveWASetting(key, value) {
    try {
      const db = SupabaseClient.get();
      if (!db) throw new Error('Database client not available');

      const { error } = await db
        .from('app_settings')
        .upsert({ key, value }, { onConflict: 'key' });

      if (error) throw error;
      console.log(`✅ WA setting saved: ${key}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save WA setting:', error.message);
      return false;
    }
  },

  // ==========================================
  // BATCH OPERATIONS
  // ==========================================

  /**
   * Load semua data master sekaligus
   * @returns {Promise<{siswa: Array, kelas: Array, guru: Array}>}
   */
  async loadAllMasterData() {
    try {
      const [siswa, kelas, guru] = await Promise.all([
        this.loadMasterSiswa(),
        this.loadMasterKelas(),
        this.loadMasterGuru()
      ]);

      return { siswa, kelas, guru };

    } catch (error) {
      console.error('❌ Failed to load all master data:', error.message);
      throw error;
    }
  }
};

console.log('✅ DatabaseService module loaded');
