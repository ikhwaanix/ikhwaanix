import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Plus, ClipboardList, DollarSign, Calendar, User, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { api } from '../utils/api';
import Swal from 'sweetalert2';

export default function InputPembayaran() {
  const { addNotification } = useAppStore();
  const [members, setMembers] = useState([]);
  const [masterPayments, setMasterPayments] = useState([]);
  
  // Dropdown options
  const [years, setYears] = useState([]);
  const [filteredMaster, setFilteredMaster] = useState([]);

  // Modal control
  const [showAddMasterModal, setShowAddMasterModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Primary payment form states
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('MULAZAMAH'); // MULAZAMAH | WAJIB | SHODAQOH
  const [selectedMasterId, setSelectedMasterId] = useState('');
  
  // Mulazamah specific month
  const [selectedMonth, setSelectedMonth] = useState('1'); 
  const [customNominal, setCustomNominal] = useState(0);

  // New Master payment form states
  const [newMaster, setNewMaster] = useState({
    kategori: 'MULAZAMAH',
    nama_pembayaran: '',
    tahun_hijriyyah: '1447',
    nominal_tagihan: '',
    sifat_pembayaran: 'FIXED'
  });

  const monthsHijriyyah = [
    { value: 1, label: 'Muharrom' },
    { value: 2, label: 'Shofar' },
    { value: 3, label: 'Robi\'ul Awwal' },
    { value: 4, label: 'Robi\'ul Akhir' },
    { value: 5, label: 'Jumadil Ula' },
    { value: 6, label: 'Jumadil Akhir' },
    { value: 7, label: 'Rojab' },
    { value: 8, label: 'Sya\'ban' },
    { value: 9, label: 'Syahru Romadlon' },
    { value: 10, label: 'Syawwal' },
    { value: 11, label: 'Dzul Qo\'dah' },
    { value: 12, label: 'Dzul Hijjah' }
  ];

  useEffect(() => {
    loadInitData();
  }, []);

  const loadInitData = async () => {
    try {
      const allMembers = await api.get('/anggota');
      setMembers(allMembers);

      const masters = await api.get('/pembayaran/master');
      setMasterPayments(masters);

      // Extract unique years from masters
      const uniqueYears = [...new Set(masters.map(m => m.tahun_hijriyyah).filter(Boolean))];
      // Default fallback if no years exist
      if (uniqueYears.length === 0) uniqueYears.push('1447');
      setYears(uniqueYears);
      setSelectedYear(uniqueYears[0] || '1447');
    } catch (e) {
      console.error(e);
    }
  };

  // Filter master payments dropdown by selected Year and Category
  useEffect(() => {
    if (!selectedYear || !selectedCategory) return;
    
    const filtered = masterPayments.filter(m => 
      m.tahun_hijriyyah === selectedYear && 
      m.kategori === selectedCategory
    );
    setFilteredMaster(filtered);
    
    if (filtered.length > 0) {
      setSelectedMasterId(filtered[0].id_master_bayar);
      setCustomNominal(filtered[0].nominal_tagihan);
    } else {
      setSelectedMasterId('');
      setCustomNominal(0);
    }
  }, [selectedYear, selectedCategory, masterPayments]);

  // Handle master selection change to update default nominal
  const handleMasterChange = (masterId) => {
    setSelectedMasterId(masterId);
    const target = filteredMaster.find(m => m.id_master_bayar === masterId);
    if (target) {
      setCustomNominal(target.nominal_tagihan);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedMember || !selectedMasterId) {
      setErrorMsg('Pilih Anggota dan Jenis Pembayaran terlebih dahulu!');
      setFormLoading(false);
      return;
    }

    try {
      await api.post('/pembayaran/transaksi', {
        id_anggota: selectedMember,
        id_master_bayar: selectedMasterId,
        bulan_hijriyyah: selectedCategory === 'MULAZAMAH' ? Number(selectedMonth) : null,
        nominal_dibayar: Number(customNominal)
      });

      const mName = members.find(a => a.id_anggota === selectedMember)?.nama_lengkap;
      
      Swal.fire({
        title: 'Pembayaran Berhasil!',
        text: `Tercatat untuk ${mName}.`,
        icon: 'success',
        confirmButtonColor: '#d4af37',
        confirmButtonText: 'Oke'
      });

      // Reset
      setSelectedMember('');
      setSelectedMonth('1');
    } catch (err) {
      Swal.fire({
        title: 'Gagal',
        text: err.message || 'Gagal menyimpan transaksi',
        icon: 'error',
        confirmButtonColor: '#dc3545'
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddMasterSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const { kategori, nama_pembayaran, tahun_hijriyyah, nominal_tagihan } = newMaster;

    if (!tahun_hijriyyah || !nominal_tagihan) {
      setErrorMsg('Harap lengkapi semua kolom wajib!');
      setFormLoading(false);
      return;
    }

    if (kategori !== 'MULAZAMAH' && !nama_pembayaran) {
      setErrorMsg('Nama Pembayaran wajib diisi untuk kategori Wajib/Shodaqoh!');
      setFormLoading(false);
      return;
    }

    try {
      await api.post('/pembayaran/master', {
        kategori,
        nama_pembayaran: kategori === 'MULAZAMAH' ? 'Mulazamah Bulanan' : nama_pembayaran,
        tahun_hijriyyah,
        nominal_tagihan: Number(nominal_tagihan),
        sifat_pembayaran: newMaster.sifat_pembayaran
      });

      setSuccessMsg('Jenis/Tagihan pembayaran baru berhasil ditambahkan!');
      addNotification(`Master tagihan ${kategori} baru berhasil di-generate untuk tahun ${tahun_hijriyyah}.`);

      // Reload
      await loadInitData();
      
      // Reset newMaster form
      setNewMaster({
        kategori: 'MULAZAMAH',
        nama_pembayaran: '',
        tahun_hijriyyah: '1447',
        nominal_tagihan: '',
        sifat_pembayaran: 'FIXED'
      });

      setTimeout(() => setShowAddMasterModal(false), 2000);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menyimpan master');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="input-pembayaran-view">
      <div className="profile-details-header">
        <h3 className="section-title" style={{ marginBottom: 0 }}>
          <ClipboardList size={20} /> Form Pencatatan Uang Keuangan
        </h3>
        <button 
          onClick={() => setShowAddMasterModal(true)} 
          className="btn-gold btn-interactive add-master-btn"
        >
          <Plus size={16} style={{ marginRight: '4px' }} />
          Tambah Data Pembayaran
        </button>
      </div>

      <div className="premium-card payment-form-card" style={{ width: '100%', margin: '24px 0' }}>
        {successMsg && <div className="badge badge-success w-full" style={{ padding: '12px', marginBottom: '16px', borderRadius: '4px' }}>{successMsg}</div>}
        {errorMsg && <div className="badge badge-danger w-full" style={{ padding: '12px', marginBottom: '16px', borderRadius: '4px' }}>{errorMsg}</div>}

        <form onSubmit={handleRecordPayment} className="payment-entry-form">
          
          <div className="form-row-grid">
            {/* 1. Select Year */}
            <div className="form-group">
              <label className="form-label">Tahun Hijriyyah</label>
              <select
                className="form-control"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                disabled={formLoading}
              >
                {years.map(y => <option key={y} value={y}>{y} H</option>)}
              </select>
            </div>

            {/* 2. Select Category */}
            <div className="form-group">
              <label className="form-label">Kategori Pembayaran</label>
              <select
                className="form-control"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={formLoading}
              >
                <option value="MULAZAMAH">MULAZAMAH (Bulanan)</option>
                <option value="WAJIB">WAJIB (Iuran Khusus)</option>
                <option value="SHODAQOH">SHODAQOH (Sumbangan)</option>
              </select>
            </div>
          </div>

          {/* 3. Select Member */}
          <div className="form-group">
            <label className="form-label">Nama Anggota Pembayar</label>
            <select
              className="form-control"
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              disabled={formLoading}
              required
            >
              <option value="">-- Pilih Nama Anggota --</option>
              {members.map(m => (
                <option key={m.id_anggota} value={m.id_anggota}>
                  {m.nama_lengkap} (KTM: {m.no_ktm} | JABATAN: {m.nama_jabatan})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Select Master Bill */}
          {selectedCategory !== 'MULAZAMAH' ? (
            <div className="form-group">
              <label className="form-label">Pilih Item Pembayaran</label>
              {filteredMaster.length === 0 ? (
                <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  Tidak ada master tagihan {selectedCategory} untuk tahun {selectedYear}. Harap buat terlebih dahulu!
                </p>
              ) : (
                <select
                  className="form-control"
                  value={selectedMasterId}
                  onChange={(e) => handleMasterChange(e.target.value)}
                  disabled={formLoading}
                >
                  {filteredMaster.map(m => (
                    <option key={m.id_master_bayar} value={m.id_master_bayar}>
                      {m.sifat_pembayaran === 'SUKARELA' ? '[Sukarela] ' : ''}{m.nama_pembayaran} (Tagihan: Rp {m.nominal_tagihan.toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            /* Mulazamah lists month selection automatically as per PRD */
            <div className="form-row-grid">
              <div className="form-group">
                <label className="form-label">Bulan Hijriyyah</label>
                <select
                  className="form-control"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  disabled={formLoading}
                >
                  {monthsHijriyyah.map(m => (
                    <option key={m.value} value={m.value}>{m.value}. {m.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Item Tagihan (Auto)</label>
                <input
                  type="text"
                  className="form-control"
                  value="Mulazamah Bulanan"
                  disabled
                />
              </div>
            </div>
          )}

          {/* 5. Nominal amount */}
          <div className="form-group">
            <label className="form-label">Nominal Uang yang Disetorkan (Rp)</label>
            <div className="input-with-icon">
              <span className="input-icon" style={{ left: '16px', fontWeight: 600 }}>Rp</span>
              <input
                type="number"
                className="form-control"
                style={{ paddingLeft: '48px' }}
                value={customNominal}
                onChange={(e) => setCustomNominal(e.target.value)}
                disabled={formLoading}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary w-full btn-interactive" 
            style={{ marginTop: '16px' }}
            disabled={formLoading || filteredMaster.length === 0 && selectedCategory !== 'MULAZAMAH'}
          >
            {formLoading ? 'Mencatat...' : 'Catat Uang Pembayaran'}
          </button>

        </form>
      </div>

      {/* =======================================================
          MODAL: ADD NEW MASTER PAYMENT (Tambah Pembayaran)
          ======================================================= */}
      {showAddMasterModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="section-title" style={{ marginBottom: 0 }}>
                <Plus size={20} />
                Tambah Master Tagihan Pembayaran
              </h3>
              <button className="btn-interactive" style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }} onClick={() => setShowAddMasterModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddMasterSubmit}>
              <div className="modal-body">
                {successMsg && <div className="badge badge-success w-full" style={{ padding: '12px', marginBottom: '16px', borderRadius: '4px' }}>{successMsg}</div>}
                {errorMsg && <div className="badge badge-danger w-full" style={{ padding: '12px', marginBottom: '16px', borderRadius: '4px' }}>{errorMsg}</div>}

                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <select
                    className="form-control"
                    value={newMaster.kategori}
                    onChange={(e) => setNewMaster({ ...newMaster, kategori: e.target.value })}
                  >
                    <option value="MULAZAMAH">MULAZAMAH (Bulanan)</option>
                    <option value="WAJIB">WAJIB (Iuran Khusus)</option>
                    <option value="SHODAQOH">SHODAQOH (Sumbangan)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Tahun Hijriyyah</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: 1447"
                    value={newMaster.tahun_hijriyyah}
                    onChange={(e) => setNewMaster({ ...newMaster, tahun_hijriyyah: e.target.value.replace(/\D/g, '') })}
                    required
                  />
                  <small style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    * PENTING: Untuk Mulazamah, sistem akan otomatis men-generate rekapitulasi 12 bulan Hijriyyah di bawah tahun ini.
                  </small>
                </div>

                {newMaster.kategori !== 'MULAZAMAH' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Nama Pembayaran</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Contoh: Iuran Gedung Serbaguna"
                        value={newMaster.nama_pembayaran}
                        onChange={(e) => setNewMaster({ ...newMaster, nama_pembayaran: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Sifat Nominal Tagihan</label>
                      <select
                        className="form-control"
                        value={newMaster.sifat_pembayaran}
                        onChange={(e) => setNewMaster({ ...newMaster, sifat_pembayaran: e.target.value })}
                      >
                        <option value="FIXED">Pasti / Fixed (Harus dibayar lunas sesuai nominal)</option>
                        <option value="SUKARELA">Sukarela / Seikhlasnya (Dibayar berapapun dianggap lunas)</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label className="form-label">Nominal Tagihan Ketentuan (Rp)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Contoh: 50000"
                    value={newMaster.nominal_tagihan}
                    onChange={(e) => setNewMaster({ ...newMaster, nominal_tagihan: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddMasterModal(false)} className="btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={formLoading}>
                  {formLoading ? 'Menyimpan...' : 'Buat Tagihan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .profile-details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .form-row-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 600px) {
          .form-row-grid {
            grid-template-columns: 1fr;
            gap: 6px;
          }
          .profile-details-header {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .add-master-btn {
            width: 100%;
            display: flex;
            justify-content: center;
          }
          .payment-form-card {
            padding: 12px !important;
            margin: 12px 0 !important;
          }
          .payment-entry-form {
            gap: 6px !important;
          }
          .payment-entry-form .form-group {
            margin-bottom: 0 !important;
          }
          .payment-entry-form .form-label {
            margin-bottom: 4px !important;
            font-size: 0.75rem !important;
          }
          .payment-entry-form .form-control {
            padding: 8px 10px !important;
            font-size: 0.8rem !important;
          }
          .payment-entry-form .btn-primary {
            padding: 10px !important;
            margin-top: 8px !important;
          }
        }

        .payment-entry-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
      `}</style>
    </div>
  );
}
