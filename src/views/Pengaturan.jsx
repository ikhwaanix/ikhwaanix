import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Settings, Upload, Calendar } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Pengaturan() {
  const { 
    currentUser, 
    settings, 
    loadSettings, 
    updateSettings, 
    addNotification
  } = useAppStore();

  const [loading, setLoading] = useState(false);

  // Settings KOP Form State
  const [kopForm, setKopForm] = useState({
    nama_organisasi: '',
    nama_pendek_organisasi: '',
    alamat_organisasi: '',
    hari_diresmikan_masehi: '',
    tanggal_diresmikan_masehi: '',
    hari_diresmikan_hijriyyah: '',
    tanggal_diresmikan_hijriyyah: '',
    nomor_ketua: '',
    nomor_rekening_1: '',
    nomor_rekening_2: '',
    logo_url: '',
    kop_surat_url: '',
    stempel_url: '',
    maintenance_mode: false
  });

  // Mulazamah Aktif Form State
  const [mulazamahForm, setMulazamahForm] = useState({
    bulan_aktif_mulazamah: 7,
    tahun_aktif_mulazamah: '1447'
  });

  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    const data = await loadSettings();
    if (data) {
      setKopForm({
        nama_organisasi: data.nama_organisasi || '',
        nama_pendek_organisasi: data.nama_pendek_organisasi || '',
        alamat_organisasi: data.alamat_organisasi || '',
        hari_diresmikan_masehi: data.hari_diresmikan_masehi || '',
        tanggal_diresmikan_masehi: data.tanggal_diresmikan_masehi || '',
        hari_diresmikan_hijriyyah: data.hari_diresmikan_hijriyyah || '',
        tanggal_diresmikan_hijriyyah: data.tanggal_diresmikan_hijriyyah || '',
        nomor_ketua: data.nomor_ketua || '',
        nomor_rekening_1: data.nomor_rekening_1 || '',
        nomor_rekening_2: data.nomor_rekening_2 || '',
        logo_url: data.logo_url || '',
        kop_surat_url: data.kop_surat_url || '',
        stempel_url: data.stempel_url || '',
        maintenance_mode: data.maintenance_mode || false
      });
      setMulazamahForm({
        bulan_aktif_mulazamah: data.bulan_aktif_mulazamah || 7,
        tahun_aktif_mulazamah: data.tahun_aktif_mulazamah || '1447'
      });
    }
  };

  const handleKopSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateSettings(kopForm);
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Master data KOP organisasi berhasil diperbarui!',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire('Gagal!', err.message || 'Gagal memperbarui pengaturan KOP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setKopForm(prev => ({ ...prev, [field]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleMaintenanceToggle = async (val) => {
    setKopForm(prev => ({ ...prev, maintenance_mode: val }));
    try {
      await updateSettings({ ...kopForm, maintenance_mode: val });
      Swal.fire({
        icon: 'info',
        title: 'Mode Maintenance',
        text: `Mode Maintenance sistem di-ubah menjadi: ${val ? 'AKTIF' : 'NON-AKTIF'}.`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error(err);
    }
  };

  const hijriMonths = [
    'Muharrom', 'Shofar', 'Robi\'ul Awwal', 'Robi\'ul Akhir',
    'Jumadal Ula', 'Jumadal Akhir', 'Rojab', 'Sya\'ban',
    'Romadhon', 'Syawwal', 'Dzulqo\'dah', 'Dzulhijjah'
  ];

  const handleMulazamahSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateSettings({
        bulan_aktif_mulazamah: Number(mulazamahForm.bulan_aktif_mulazamah),
        tahun_aktif_mulazamah: mulazamahForm.tahun_aktif_mulazamah
      });

      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `Bulan aktif Mulazamah diatur ke ${hijriMonths[mulazamahForm.bulan_aktif_mulazamah - 1]} ${mulazamahForm.tahun_aktif_mulazamah} H`,
        timer: 2500,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire('Gagal!', err.message || 'Gagal memperbarui pengaturan periode Mulazamah', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="premium-card empty-state">
        <p>Anda tidak memiliki akses untuk membuka halaman pengaturan.</p>
      </div>
    );
  }

  return (
    <div className="pengaturan-view">
      <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Settings size={20} /> Master Pengaturan Organisasi & Sistem
      </h3>

      <div className="pengaturan-section">
        {/* Main system switches */}
        <div className="premium-card" style={{ marginBottom: '24px' }}>
          <h4 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '16px' }}>
            Mode Pemeliharaan & Status
          </h4>
          <div className="maintenance-toggle-row">
            <div>
              <strong style={{ display: 'block', fontSize: '0.9rem' }}>Aktifkan Mode Maintenance</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Mengunci akses seluruh anggota kecuali role Admin demi pemeliharaan database terpusat.
              </span>
            </div>
            <button
              type="button"
              className={`maintenance-toggle-btn btn-interactive ${kopForm.maintenance_mode ? 'active' : ''}`}
              onClick={() => handleMaintenanceToggle(!kopForm.maintenance_mode)}
            >
              {kopForm.maintenance_mode ? '🔒 AKTIF' : '🔓 NON-AKTIF'}
            </button>
          </div>
        </div>

        {/* Periode Aktif Mulazamah */}
        <div className="premium-card" style={{ marginBottom: '24px' }}>
          <h4 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={18} /> Periode Aktif Tagihan Mulazamah
          </h4>
          <p className="periode-description" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
            Atur bulan dan tahun Hijriyyah yang saat ini aktif. Tunggakan hanya akan dihitung dari <strong>Bulan 1</strong> sampai bulan yang Anda tetapkan di sini.
            Bulan setelahnya otomatis berstatus "Belum Jatuh Tempo" dan tidak dihitung sebagai tunggakan.
          </p>
          <form onSubmit={handleMulazamahSubmit}>
            <div className="form-row-grid">
              <div className="form-group">
                <label className="form-label">Bulan Aktif Hijriyyah</label>
                <select
                  className="form-control"
                  value={mulazamahForm.bulan_aktif_mulazamah}
                  onChange={(e) => setMulazamahForm({ ...mulazamahForm, bulan_aktif_mulazamah: e.target.value })}
                >
                  {hijriMonths.map((name, idx) => (
                    <option key={idx} value={idx + 1}>{idx + 1}. {name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tahun Hijriyyah Aktif</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: 1447"
                  value={mulazamahForm.tahun_aktif_mulazamah}
                  onChange={(e) => setMulazamahForm({ ...mulazamahForm, tahun_aktif_mulazamah: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="periode-aktif-actions">
              <button type="submit" className="btn-primary btn-interactive periode-btn" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan Periode Aktif'}
              </button>
              <span className="periode-aktif-label">
                Aktif: {hijriMonths[(mulazamahForm.bulan_aktif_mulazamah || 1) - 1]} {mulazamahForm.tahun_aktif_mulazamah} H
              </span>
            </div>
          </form>
        </div>

        {/* KOP organization settings */}
        <div className="premium-card">
          <h4 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '20px' }}>
            Pengaturan Identitas KOP & Rekening Resmi
          </h4>

          <form onSubmit={handleKopSubmit}>
            {/* UPLOAD AREA FOR LOGO & KOP SURAT BANNER */}
            <div className="visual-assets-section" style={{ borderBottom: '1px dashed var(--border-color)', paddingBottom: '24px', marginBottom: '24px' }}>
              <h5 className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '16px', color: 'var(--accent-primary)' }}>
                Aset Gambar Resmi (Lambang, KOP Surat & Stempel)
              </h5>
              <div className="upload-cards-grid">
                
                {/* LOGO UPLOAD CARD */}
                <div className="upload-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-primary)', textAlign: 'center' }}>
                  <span className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '12px' }}>
                    Lambang Organisasi (Logo 1:1)
                  </span>
                  <div className="logo-preview-circle" style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    {kopForm.logo_url ? (
                      <img src={kopForm.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bulat</span>
                    )}
                  </div>
                  <label className="btn-secondary btn-interactive" style={{ padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Upload size={12} /> Pilih Logo
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleFileChange(e, 'logo_url')} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                  {kopForm.logo_url && (
                    <button 
                      type="button" 
                      onClick={() => setKopForm(prev => ({ ...prev, logo_url: '' }))} 
                      className="btn-interactive" 
                      style={{ marginTop: '8px', border: 'none', background: 'none', color: 'var(--color-danger)', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Hapus Lambang
                    </button>
                  )}
                </div>

                {/* KOP SURAT UPLOAD CARD */}
                <div className="upload-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-primary)', textAlign: 'center' }}>
                  <span className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '12px' }}>
                    KOP Surat Resmi (Banner)
                  </span>
                  <div className="banner-preview-box" style={{ width: '100%', height: '80px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    {kopForm.kop_surat_url ? (
                      <img src={kopForm.kop_surat_url} alt="KOP" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rasio Spanduk</span>
                    )}
                  </div>
                  <label className="btn-secondary btn-interactive" style={{ padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Upload size={12} /> Pilih KOP Surat
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleFileChange(e, 'kop_surat_url')} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                  {kopForm.kop_surat_url && (
                    <button 
                      type="button" 
                      onClick={() => setKopForm(prev => ({ ...prev, kop_surat_url: '' }))} 
                      className="btn-interactive" 
                      style={{ marginTop: '8px', border: 'none', background: 'none', color: 'var(--color-danger)', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Hapus KOP Surat
                    </button>
                  )}
                </div>

                {/* STEMPEL UPLOAD CARD */}
                <div className="upload-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-primary)', textAlign: 'center' }}>
                  <span className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '12px' }}>
                    Stempel Organisasi
                  </span>
                  <div className="logo-preview-circle" style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    {kopForm.stempel_url ? (
                      <img src={kopForm.stempel_url} alt="Stempel" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bulat</span>
                    )}
                  </div>
                  <label className="btn-secondary btn-interactive" style={{ padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Upload size={12} /> Pilih Stempel
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleFileChange(e, 'stempel_url')} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                  {kopForm.stempel_url && (
                    <button 
                      type="button" 
                      onClick={() => setKopForm(prev => ({ ...prev, stempel_url: '' }))} 
                      className="btn-interactive" 
                      style={{ marginTop: '8px', border: 'none', background: 'none', color: 'var(--color-danger)', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Hapus Stempel
                    </button>
                  )}
                </div>

              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nama Lembaga Organisasi</label>
              <input
                type="text"
                className="form-control"
                value={kopForm.nama_organisasi}
                onChange={(e) => setKopForm({ ...kopForm, nama_organisasi: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nama Pendek Organisasi (Untuk Sidebar/Menu Kecil)</label>
              <input
                type="text"
                className="form-control"
                value={kopForm.nama_pendek_organisasi}
                onChange={(e) => setKopForm({ ...kopForm, nama_pendek_organisasi: e.target.value })}
                placeholder="Contoh: IKHWAN 9"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Alamat Lengkap Kantor Organisasi</label>
              <input
                type="text"
                className="form-control"
                value={kopForm.alamat_organisasi}
                onChange={(e) => setKopForm({ ...kopForm, alamat_organisasi: e.target.value })}
                required
              />
            </div>

            <div className="form-row-grid">
              <div className="form-group">
                <label className="form-label">Hari Diresmikan Masehi</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Sabtu"
                  value={kopForm.hari_diresmikan_masehi}
                  onChange={(e) => setKopForm({ ...kopForm, hari_diresmikan_masehi: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal Diresmikan Masehi</label>
                <input
                  type="date"
                  className="form-control"
                  value={kopForm.tanggal_diresmikan_masehi}
                  onChange={(e) => setKopForm({ ...kopForm, tanggal_diresmikan_masehi: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row-grid">
              <div className="form-group">
                <label className="form-label">Hari Diresmikan Hijriyyah</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Sabtu"
                  value={kopForm.hari_diresmikan_hijriyyah}
                  onChange={(e) => setKopForm({ ...kopForm, hari_diresmikan_hijriyyah: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal/Tahun Diresmikan Hijriyyah</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="1431-10-02"
                  value={kopForm.tanggal_diresmikan_hijriyyah}
                  onChange={(e) => setKopForm({ ...kopForm, tanggal_diresmikan_hijriyyah: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nomor Kontak Pengurus Utama (Tlp Ketua)</label>
              <input
                type="text"
                className="form-control"
                value={kopForm.nomor_ketua}
                onChange={(e) => setKopForm({ ...kopForm, nomor_ketua: e.target.value })}
              />
            </div>

            <div className="form-row-grid">
              <div className="form-group">
                <label className="form-label">Keterangan Rekening 1 (Struk/PDF)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Bank Syariah Indonesia (BSI) - 71122..."
                  value={kopForm.nomor_rekening_1}
                  onChange={(e) => setKopForm({ ...kopForm, nomor_rekening_1: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Keterangan Rekening 2 (Struk/PDF)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Bank Mandiri - 14200..."
                  value={kopForm.nomor_rekening_2}
                  onChange={(e) => setKopForm({ ...kopForm, nomor_rekening_2: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="btn-gold btn-interactive kop-submit-btn" style={{ marginTop: '12px' }} disabled={loading}>
              {loading ? 'Menyimpan...' : 'Perbarui KOP & Data Pengaturan'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .maintenance-toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .maintenance-toggle-btn {
          padding: 10px 24px;
          font-weight: 700;
          font-size: 0.85rem;
          border: 2px solid var(--color-success);
          border-radius: var(--radius-sm);
          background-color: rgba(40, 167, 69, 0.1);
          color: var(--color-success);
          cursor: pointer;
          transition: var(--transition-fast);
          white-space: nowrap;
        }

        .maintenance-toggle-btn.active {
          border-color: var(--color-danger);
          background-color: rgba(220, 53, 69, 0.15);
          color: var(--color-danger);
        }

        .maintenance-toggle-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px var(--shadow-color);
        }

        .upload-cards-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr 1fr;
          gap: 20px;
        }

        .upload-box {
          border: 2px dashed var(--border-color);
          transition: var(--transition-normal);
        }

        .upload-box:hover {
          border-color: var(--accent-secondary);
        }

        @media (max-width: 768px) {
          .upload-cards-grid {
            grid-template-columns: 1fr;
          }
        }

        .periode-aktif-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
        }

        .periode-aktif-label {
          font-size: 0.8rem;
          color: var(--accent-primary);
          font-weight: 600;
          white-space: nowrap;
        }

        @media (max-width: 600px) {
          .maintenance-toggle-row {
            flex-direction: column;
            align-items: stretch;
          }
          .maintenance-toggle-btn {
            width: 100%;
            text-align: center;
          }
          .periode-description {
            text-align: justify !important;
          }
          .periode-aktif-actions {
            gap: 8px;
          }
          .periode-btn {
            font-size: 0.75rem !important;
            padding: 8px 12px !important;
            white-space: nowrap;
          }
          .periode-aktif-label {
            font-size: 0.7rem !important;
          }
          .kop-submit-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
