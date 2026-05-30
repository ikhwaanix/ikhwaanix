import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ClipboardList, Filter, Check, X, RefreshCw } from 'lucide-react';
import { api } from '../utils/api';
import Swal from 'sweetalert2';

export default function RekapPembayaran() {
  const { settings, currentUser } = useAppStore();
  const [activeTab, setActiveTab] = useState('mulazamah'); // mulazamah | wajib | shodaqoh
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [loading, setLoading] = useState(true);

  // Rekap dataset states
  const [rekapData, setRekapData] = useState(null);

  const monthsList = [
    'Muharrom', 'Shofar', 'Robi\'ul Awwal', 'Robi\'ul Akhir', 'Jumadil Ula', 'Jumadil Akhir', 
    'Rojab', 'Sya\'ban', 'Romadlon', 'Syawwal', 'Dzul Qo\'dah', 'Dzul Hijjah'
  ];

  useEffect(() => {
    loadInitData();
  }, []);

  const loadInitData = async () => {
    try {
      const masters = await api.get('/pembayaran/master');
      const uniqueYears = [...new Set(masters.map(m => m.tahun_hijriyyah).filter(Boolean))];
      if (uniqueYears.length === 0) uniqueYears.push('1447');
      setYears(uniqueYears);
      setSelectedYear(uniqueYears[0] || '1447');
    } catch (e) {
      console.error(e);
    }
  };

  // Reload rekap data when selected year changes
  useEffect(() => {
    if (selectedYear) {
      loadRekap();
    }
  }, [selectedYear]);

  const loadRekap = async () => {
    setLoading(true);
    try {
      const data = await api.get('/pembayaran/rekap', { tahun_hijriyyah: selectedYear });
      if (currentUser?.role === 'PJKelompok') {
        const filteredData = {
          ...data,
          mulazamah: data.mulazamah.filter(m => m.kelompok === currentUser.kelompok),
          wajib: data.wajib.filter(m => m.kelompok === currentUser.kelompok),
          shodaqoh: data.shodaqoh.filter(m => m.kelompok === currentUser.kelompok),
        };
        setRekapData(filteredData);
      } else {
        setRekapData(data);
      }
    } catch (e) {
      console.error('Gagal memuat rekapitulasi pembayaran:', e);
    } finally {
      setLoading(false);
    }
  };

  const isAdminOrBendahara = currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Bendahara');

  const handleEditMulazamah = async (id_anggota, bulan, currentLunas) => {
    if (!isAdminOrBendahara) return;
    
    const master = rekapData.mulazamah_master;
    if (!master) {
      Swal.fire('Error', 'Master Mulazamah belum ada untuk tahun ini', 'error');
      return;
    }

    const confirm = await Swal.fire({
      title: currentLunas ? 'Batalkan Pembayaran?' : 'Bayar LUNAS?',
      text: `Ubah status bulan ke-${bulan} menjadi ${currentLunas ? 'BELUM LUNAS' : 'LUNAS'}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Ubah',
      cancelButtonText: 'Batal'
    });

    if (confirm.isConfirmed) {
      try {
        await api.put('/pembayaran/rekap-edit', {
          id_anggota,
          id_master_bayar: master.id_master_bayar,
          bulan_hijriyyah: bulan,
          nominal_baru: currentLunas ? 0 : master.nominal_tagihan,
          is_mulazamah: true
        });
        
        Swal.fire({ icon: 'success', title: 'Berhasil', timer: 1500, showConfirmButton: false });
        loadRekap();
      } catch (e) {
        Swal.fire('Gagal', e.message || 'Gagal mengubah data', 'error');
      }
    }
  };

  const handleEditWajibShodaqoh = async (id_anggota, id_master_bayar, nama_pembayaran, currentNominal) => {
    if (!isAdminOrBendahara) return;

    const { value: nominal_baru } = await Swal.fire({
      title: 'Edit Total Sudah Setor',
      text: `Tagihan: ${nama_pembayaran}`,
      input: 'number',
      inputValue: currentNominal,
      inputLabel: 'Masukkan Nominal Setoran (Rp) tanpa titik',
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal'
    });

    if (nominal_baru !== undefined && nominal_baru !== null) {
      try {
        await api.put('/pembayaran/rekap-edit', {
          id_anggota,
          id_master_bayar,
          bulan_hijriyyah: null,
          nominal_baru: Number(nominal_baru),
          is_mulazamah: false
        });
        
        Swal.fire({ icon: 'success', title: 'Berhasil', timer: 1500, showConfirmButton: false });
        loadRekap();
      } catch (e) {
        Swal.fire('Gagal', e.message || 'Gagal mengubah data', 'error');
      }
    }
  };

  return (
    <div className="rekap-view">
      <div className="profile-details-header">
        <h3 className="section-title">
          <ClipboardList size={20} /> Rekapitulasi Pembayaran Keuangan Keanggotaan
        </h3>
        
        {/* Year Filter */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tahun Hijriyyah:</span>
          <select
            className="form-control"
            style={{ width: '120px', padding: '8px 12px' }}
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            disabled={loading}
          >
            {years.map(y => <option key={y} value={y}>{y} H</option>)}
          </select>
          <button 
            onClick={loadRekap} 
            className="btn-secondary btn-interactive" 
            style={{ padding: '8px 12px' }}
            title="Refresh Rekap Data"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container" style={{ marginTop: '24px' }}>
        <button
          onClick={() => setActiveTab('mulazamah')}
          className={`tab-btn ${activeTab === 'mulazamah' ? 'active' : ''}`}
        >
          <span className="mobile-text">1. Mulazamah</span>
          <span className="desktop-text">1. Tab Mulazamah (Bulanan)</span>
        </button>
        <button
          onClick={() => setActiveTab('wajib')}
          className={`tab-btn ${activeTab === 'wajib' ? 'active' : ''}`}
        >
          <span className="mobile-text">2. Wajib</span>
          <span className="desktop-text">2. Tab Pembayaran Wajib</span>
        </button>
        <button
          onClick={() => setActiveTab('shodaqoh')}
          className={`tab-btn ${activeTab === 'shodaqoh' ? 'active' : ''}`}
        >
          <span className="mobile-text">3. Shodaqoh</span>
          <span className="desktop-text">3. Tab Pembayaran Shodaqoh</span>
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>Mengkalkulasi rekapitulasi data...</p>
        </div>
      ) : !rekapData ? (
        <div className="premium-card empty-state">
          <p>Tidak ada data rekapitulasi pembayaran untuk tahun {selectedYear} H.</p>
        </div>
      ) : (
        <>
          {/* =======================================================
              TAB 1: MULAZAMAH (12 BULAN HIJRIYYAH)
              ======================================================= */}
          {activeTab === 'mulazamah' && (
            <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
              <table className="premium-table force-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Anggota</th>
                    {monthsList.map((m, idx) => (
                      <th key={idx} style={{ textAlign: 'center', fontSize: '0.75rem', height: '120px', verticalAlign: 'middle' }}>
                        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', margin: '0 auto' }}>
                          {m}
                        </div>
                      </th>
                    ))}
                    <th>Total Harus</th>
                    <th>Sudah Bayar</th>
                    <th>Tunggakan</th>
                  </tr>
                </thead>
                <tbody>
                  {rekapData.mulazamah.map((row, idx) => (
                    <tr key={row.id_anggota}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{row.nama_lengkap}</td>
                      {row.bulanan.map((m, bIdx) => (
                        <td 
                          key={bIdx} 
                          style={{ textAlign: 'center', cursor: isAdminOrBendahara ? 'pointer' : 'default' }}
                          onClick={() => handleEditMulazamah(row.id_anggota, m.bulan, m.lunas)}
                          title={isAdminOrBendahara ? "Klik untuk mengubah status" : ""}
                        >
                          {m.lunas ? (
                            <Check size={16} style={{ color: 'var(--color-success)', margin: '0 auto' }} />
                          ) : m.belum_jatuh_tempo ? (
                            <span style={{ color: '#adb5bd', fontSize: '0.65rem', fontStyle: 'italic' }}>—</span>
                          ) : (
                            <X size={16} style={{ color: 'var(--color-danger)', margin: '0 auto' }} />
                          )}
                        </td>
                      ))}
                      <td style={{ fontWeight: 500 }}>Rp {row.total_harus.toLocaleString('id-ID')}</td>
                      <td style={{ fontWeight: 500, color: 'var(--color-success)' }}>Rp {row.total_sudah.toLocaleString('id-ID')}</td>
                      <td style={{ fontWeight: 600, color: row.tunggakan > 0 ? 'var(--color-danger)' : 'inherit' }}>
                        Rp {row.tunggakan.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* =======================================================
              TAB 2: PEMBAYARAN WAJIB (Dinamis Kolom)
              ======================================================= */}
          {activeTab === 'wajib' && (
            <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
              <table className="premium-table force-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Anggota</th>
                    {rekapData.wajib.masters.map(m => (
                      <th key={m.id_master_bayar} style={{ fontSize: '0.75rem' }}>{m.nama_pembayaran}</th>
                    ))}
                    <th>Total Harus</th>
                    <th>Sudah Bayar</th>
                    <th>Tunggakan Belum</th>
                  </tr>
                </thead>
                <tbody>
                  {rekapData.wajib.rekap.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center' }}>Tidak ada anggota terdaftar.</td>
                    </tr>
                  ) : (
                    rekapData.wajib.rekap.map((row, idx) => (
                      <tr key={row.id_anggota}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{row.nama_lengkap}</td>
                        
                        {/* Dynamic cell columns for Wajib items */}
                        {row.detail.map(item => (
                          <td 
                            key={item.id_master_bayar} 
                            style={{ fontSize: '0.85rem', cursor: isAdminOrBendahara ? 'pointer' : 'default' }}
                            onClick={() => handleEditWajibShodaqoh(row.id_anggota, item.id_master_bayar, item.nama_pembayaran, item.sudah_dibayar)}
                            title={isAdminOrBendahara ? "Klik untuk mengedit total setor" : ""}
                          >
                            <span style={{ fontWeight: 500 }}>Rp {item.sudah_dibayar.toLocaleString('id-ID')}</span>
                            <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                              Ketentuan: Rp {item.nominal_tagihan.toLocaleString('id-ID')}
                            </span>
                          </td>
                        ))}

                        <td style={{ fontWeight: 500 }}>Rp {row.total_harus.toLocaleString('id-ID')}</td>
                        <td style={{ fontWeight: 500, color: 'var(--color-success)' }}>Rp {row.total_sudah.toLocaleString('id-ID')}</td>
                        <td style={{ fontWeight: 600, color: row.tunggakan > 0 ? 'var(--color-danger)' : 'inherit' }}>
                          Rp {row.tunggakan.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* =======================================================
              TAB 3: PEMBAYARAN SHODAQOH (Dinamis Kolom)
              ======================================================= */}
          {activeTab === 'shodaqoh' && (
            <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
              <table className="premium-table force-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Anggota</th>
                    {rekapData.shodaqoh.masters.map(m => (
                      <th key={m.id_master_bayar} style={{ fontSize: '0.75rem' }}>{m.nama_pembayaran}</th>
                    ))}
                    <th>Total Harus</th>
                    <th>Sudah Bayar</th>
                    <th>Kekurangan Belum</th>
                  </tr>
                </thead>
                <tbody>
                  {rekapData.shodaqoh.rekap.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center' }}>Tidak ada anggota terdaftar.</td>
                    </tr>
                  ) : (
                    rekapData.shodaqoh.rekap.map((row, idx) => (
                      <tr key={row.id_anggota}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{row.nama_lengkap}</td>
                        
                        {/* Dynamic cell columns for Shodaqoh items */}
                        {row.detail.map(item => (
                          <td 
                            key={item.id_master_bayar} 
                            style={{ fontSize: '0.85rem', cursor: isAdminOrBendahara ? 'pointer' : 'default' }}
                            onClick={() => handleEditWajibShodaqoh(row.id_anggota, item.id_master_bayar, item.nama_pembayaran, item.sudah_dibayar)}
                            title={isAdminOrBendahara ? "Klik untuk mengedit total setor" : ""}
                          >
                            <span style={{ fontWeight: 500 }}>Rp {item.sudah_dibayar.toLocaleString('id-ID')}</span>
                            <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                              Ketentuan: Rp {item.nominal_tagihan.toLocaleString('id-ID')}
                            </span>
                          </td>
                        ))}

                        <td style={{ fontWeight: 500 }}>Rp {row.total_harus.toLocaleString('id-ID')}</td>
                        <td style={{ fontWeight: 500, color: 'var(--color-success)' }}>Rp {row.total_sudah.toLocaleString('id-ID')}</td>
                        <td style={{ fontWeight: 600, color: row.tunggakan > 0 ? 'var(--color-danger)' : 'inherit' }}>
                          Rp {row.tunggakan.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

        </>
      )}

      <style>{`
        .profile-details-header select.form-control {
          padding: 4px 8px !important;
          font-size: 0.75rem !important;
          height: auto !important;
        }
        .profile-details-header button {
          padding: 6px 10px !important;
          font-size: 0.7rem !important;
        }

        .spin-anim {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .mobile-cards-container {
          display: none;
        }

        .premium-table th {
          vertical-align: middle !important;
          text-align: center !important;
        }

        .premium-table td {
          white-space: nowrap !important;
        }

        .premium-table th,
        .premium-table td {
          padding: 6px 10px !important;
          font-size: 0.85rem !important;
        }

        .mobile-text { display: none; }
        .desktop-text { display: inline; }
        
        @media (max-width: 768px) {
          .table-responsive {
            border: 1px solid var(--border-color) !important;
            background-color: var(--bg-secondary) !important;
          }
          .premium-table.force-table { display: table !important; }
          .premium-table.force-table thead { display: table-header-group !important; }
          .premium-table.force-table tbody { display: table-row-group !important; }
          .premium-table.force-table tr { display: table-row !important; }
          .premium-table.force-table th,
          .premium-table.force-table td { display: table-cell !important; border-bottom: 1px solid var(--border-color) !important; padding: 6px 10px !important; }
          .premium-table.force-table td::before { display: none !important; }
        }

        @media (max-width: 600px) {
          .desktop-text { display: none; }
          .mobile-text { display: inline; }
          
          .tabs-container {
            display: flex;
            width: 100%;
            justify-content: space-between;
          }
          .tab-btn {
            flex: 1;
            padding: 10px 4px !important;
            font-size: 0.75rem !important;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
